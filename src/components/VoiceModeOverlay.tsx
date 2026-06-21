import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Volume2, VolumeX, Radio, Sparkles, HelpCircle } from 'lucide-react';
import { Message } from '../types';

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isTyping: boolean;
  lastMessage: Message | undefined;
  onSendMessage: (content: string) => void;
  isCyberpunk?: boolean;
  isGlass?: boolean;
  isBrutalist?: boolean;
}

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoiceModeOverlay: React.FC<VoiceModeOverlayProps> = ({
  isOpen,
  onClose,
  isTyping,
  lastMessage,
  onSendMessage,
  isCyberpunk = false,
  isGlass = false,
  isBrutalist = false,
}) => {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [isHandsFree, setIsHandsFree] = useState<boolean>(false);
  const [useNativeVoice, setUseNativeVoice] = useState<boolean>(() => {
    return localStorage.getItem('yorn_voice_use_native') !== 'false';
  });
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiSpeechText, setAiSpeechText] = useState<string>('');
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hfToken, setHfToken] = useState<string>('');
  
  // Media capture and playback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isWebSpeakingRef = useRef<boolean>(false);
  
  // Web Speech API refs
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  
  // Real-time Canvas Animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // Track last message ID to speak new replies only once
  const spokenMessageIdRef = useRef<string | null>(null);
  // Auto-listening timer
  const autoListenTimerRef = useRef<number | null>(null);

  // Set up Web Speech API recognition
  const setupSpeechRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("SpeechRecognition is NOT supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'ru-RU'; // default to Russian, which satisfies user requirement

      rec.onstart = () => {
        setVoiceStatus('listening');
        setErrorMessage(null);
        latestTranscriptRef.current = '';
        setUserTranscript('');
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment;
          } else {
            interimTranscript += transcriptSegment;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setUserTranscript(currentText);
          latestTranscriptRef.current = currentText;
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setMicAllowed(false);
          setErrorMessage("Доступ к микрофону заблокирован вашим браузером.");
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setErrorMessage(`Ошибка распознавания: ${event.error}`);
        }
        setVoiceStatus('idle');
      };

      rec.onend = () => {
        setVoiceStatus('idle');
        const finalPhrase = latestTranscriptRef.current.trim();
        if (finalPhrase) {
          console.log("[Web Speech] Sending text:", finalPhrase);
          onSendMessage(finalPhrase);
          latestTranscriptRef.current = '';
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.error("Failed to initialize SpeechRecognition:", e);
    }
  };

  // Request mic permission and setup
  useEffect(() => {
    if (isOpen) {
      // Fetch dynamic HF configuration token
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.hfToken) {
            setHfToken(data.hfToken);
          }
        })
        .catch(err => {
          console.warn("Failed loading dynamic hf config:", err);
        });

      // Initialize audio context
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      setupMic();
    } else {
      cleanupAudio();
    }
    return () => {
      cleanupAudio();
    };
  }, [isOpen]);

  // Reactive message monitoring: speak the AI response when typing is done
  useEffect(() => {
    if (!isOpen) return;

    if (!isTyping && lastMessage && lastMessage.role === 'assistant') {
      if (spokenMessageIdRef.current !== lastMessage.id) {
        spokenMessageIdRef.current = lastMessage.id;
        setAiSpeechText(lastMessage.content);
        speakResponse(lastMessage.content);
      }
    } else if (isTyping) {
      setVoiceStatus('processing');
      // Stop speaking if new message started
      stopSpeaking();
    }
  }, [isTyping, lastMessage, isOpen]);

  const setupMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicAllowed(true);
      setErrorMessage(null);
      
      // Set up analyser for visualization
      const audioCtx = audioCtxRef.current;
      if (audioCtx) {
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
      }
      
      // Start real-time drawing loop
      startWaveform();
    } catch (err: any) {
      console.error("Mic access failed:", err);
      setMicAllowed(false);
      setErrorMessage("Микрофон недоступен. Пожалуйста, разрешите доступ к нему в настройках вашего браузера.");
    }
  };

  const cleanupAudio = () => {
    stopSpeaking();
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  };

  // Start sound capture
  const startRecording = async () => {
    stopSpeaking();
    
    // Play light ping sound before listening click
    playBeep(220, 0.1); 

    // Directly use standard MediaRecorder to server-side or direct client HF
    if (!streamRef.current) {
      await setupMic();
    }
    if (!streamRef.current) return;

    audioChunksRef.current = [];
    const options = { mimeType: 'audio/webm' };
    let mediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      // Fallback
      mediaRecorder = new MediaRecorder(streamRef.current);
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioBlob.size > 1000) {
        processVoiceBlob(audioBlob);
      } else {
        setVoiceStatus('idle');
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(250);
    setVoiceStatus('listening');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      playBeep(330, 0.08); // Confirm recording stopped
    }
  };

  const toggleVoiceListen = () => {
    if (voiceStatus === 'listening') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Process and transcribe recorded voice
  const processVoiceBlob = async (blob: Blob) => {
    setVoiceStatus('processing');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        let sstResultText = '';

        if (hfToken) {
          try {
            console.log("[Client HF STT] Sending audio directly to Hugging Face Inference API (whisper-large-v3-turbo)...");
            const hfRes = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo', {
              headers: {
                Authorization: `Bearer ${hfToken}`,
                'Content-Type': blob.type || 'audio/webm'
              },
              method: 'POST',
              body: blob
            });
            if (hfRes.ok) {
              const hfResult = await hfRes.json();
              sstResultText = hfResult.text || '';
            } else {
              console.warn("[Client HF STT] whisper-large-v3-turbo returned status code", hfRes.status);
            }
          } catch (err) {
            console.warn("[Client HF STT] whisper-large-v3-turbo failed, trying whisper-large-v3...", err);
          }

          if (!sstResultText) {
            try {
              const hfRes = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
                headers: {
                  Authorization: `Bearer ${hfToken}`,
                  'Content-Type': blob.type || 'audio/webm'
                },
                method: 'POST',
                body: blob
              });
              if (hfRes.ok) {
                const hfResult = await hfRes.json();
                sstResultText = hfResult.text || '';
              }
            } catch (err) {
              console.warn("[Client HF STT] whisper-large-v3 failed.", err);
            }
          }
        }

        // Server-side fallback if direct client request didn't yield text or token is missing
        if (!sstResultText) {
          console.log("[STT] Falling back to server transcribing endpoint...");
          const base64Data = (reader.result as string).split(',')[1];
          const response = await fetch('/api/transcribe-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType: 'audio/webm'
            })
          });

          const data = await response.json();
          if (response.ok && data.text) {
            sstResultText = data.text;
          } else {
            throw new Error(data.error || "Не удалось расшифровать речь на сервере.");
          }
        }

        if (sstResultText && sstResultText.trim()) {
          setUserTranscript(sstResultText);
          onSendMessage(sstResultText);
        } else {
          setVoiceStatus('idle');
          setErrorMessage("Не удалось распознать речь. Попробуйте повторить.");
          setTimeout(() => setErrorMessage(null), 4000);
        }
      };
    } catch (e: any) {
      console.error(e);
      setVoiceStatus('idle');
      setErrorMessage("Ошибка обработки голоса.");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Convert AI reply to Speech
  const speakResponse = async (text: string) => {
    try {
      setVoiceStatus('speaking');

      if (useNativeVoice) {
        console.log("[TTS] Using high-quality browser-native speech synthesis...");
        await playNativeSpeech(text);
        return;
      }

      let base64Audio = '';

      if (hfToken) {
        try {
          const isEnglish = /[a-zA-Z]{4,}/.test(text.slice(0, 60));
          const modelSelected = isEnglish ? 'facebook/mms-tts-eng' : 'facebook/mms-tts-rus';
          console.log(`[Client HF TTS] Calling Hugging Face TTS client-side: ${modelSelected}`);

          const hfRes = await fetch(`https://api-inference.huggingface.co/models/${modelSelected}`, {
            headers: {
              Authorization: `Bearer ${hfToken}`,
              'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ inputs: text })
          });

          if (hfRes.ok) {
            const arrayBuffer = await hfRes.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8.length; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            base64Audio = btoa(binary);
          } else {
            console.warn("[Client HF TTS] returned status code", hfRes.status);
          }
        } catch (err) {
          console.warn("[Client HF TTS] Failed direct call, falling back to server...", err);
        }
      }

      // If client-side failed or was not available, try server fallback
      if (!base64Audio) {
        console.log("[TTS] Falling back to server TTS endpoint...");
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (response.ok) {
          const data = await response.json();
          base64Audio = data.audioData;
        } else {
          throw new Error('Server TTS failed');
        }
      }

      if (base64Audio) {
        await playRawPCM(base64Audio);
      } else {
        throw new Error('No audio data produced');
      }
    } catch (err: any) {
      console.warn("HuggingFace TTS encountered an error. Falling back to native browser speech synthesis.", err.message || err);
      await playNativeSpeech(text);
    }
  };

  const playRawPCM = (base64Data: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        stopSpeaking();

        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioCtx = audioCtxRef.current;
        const binary = atob(base64Data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        // Try decoding as a standard media file first (uncompressed WAV, MP3, etc.)
        audioCtx.decodeAudioData(
          bytes.buffer.slice(0), 
          (decodedBuffer) => {
            const source = audioCtx.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(audioCtx.destination);

            if (analyserRef.current) {
              source.connect(analyserRef.current);
            }

            activeSourceRef.current = source;
            source.onended = () => {
              activeSourceRef.current = null;
              handleSpeechFinished();
              resolve();
            };

            source.start();
          },
          (err) => {
            console.warn("Standard decodeAudioData failed, falling back to raw PCM parser:", err);
            try {
              // Fallback to Raw PCM Parser
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }

              const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
              audioBuffer.getChannelData(0).set(float32Array);

              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioCtx.destination);

              if (analyserRef.current) {
                source.connect(analyserRef.current);
              }

              activeSourceRef.current = source;
              source.onended = () => {
                activeSourceRef.current = null;
                handleSpeechFinished();
                resolve();
              };

              source.start();
            } catch (fallbackErr) {
              console.error("PCM Fallback Playback Error:", fallbackErr);
              handleSpeechFinished();
              resolve();
            }
          }
        );
      } catch (err) {
        console.error("Audio Playback Error:", err);
        handleSpeechFinished();
        resolve();
      }
    });
  };

  const playNativeSpeech = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        stopSpeaking();
        window.speechSynthesis.cancel();
        
        // Strip out some markdown formatting symbols
        const cleanText = text
          .replace(/[*_`#\-]/g, '')
          .replace(/\[.*\]\(.*\)/g, '')
          .slice(0, 1000); // safety length limit
          
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Auto language matcher (simple heuristic)
        const isEnglish = /[a-zA-Z]{4,}/.test(text.slice(0, 60));
        utterance.lang = isEnglish ? 'en-US' : 'ru-RU';
        
        const voices = window.speechSynthesis.getVoices();
        // Prefer premium, natural, google, microsoft, or siri voices for a gorgeous human tone
        let priorityVoice = voices.find(v => 
          v.lang.startsWith(isEnglish ? 'en' : 'ru') && 
          (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Premium') || v.name.includes('Natural') || v.name.includes('Siri') || v.name.includes('Milena') || v.name.includes('Irina') || v.name.includes('Yuri'))
        );
        if (!priorityVoice) {
          priorityVoice = voices.find(v => v.lang.startsWith(isEnglish ? 'en' : 'ru'));
        }
        if (priorityVoice) {
          utterance.voice = priorityVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          isWebSpeakingRef.current = false;
          handleSpeechFinished();
          resolve();
        };

        utterance.onerror = () => {
          isWebSpeakingRef.current = false;
          handleSpeechFinished();
          resolve();
        };

        isWebSpeakingRef.current = true;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error(err);
        handleSpeechFinished();
        resolve();
      }
    });
  };

  const stopSpeaking = () => {
    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
      activeSourceRef.current = null;
    }
    if (isWebSpeakingRef.current) {
      window.speechSynthesis.cancel();
      isWebSpeakingRef.current = false;
    }
  };

  const handleSpeechFinished = () => {
    setVoiceStatus('idle');
    // If hands-free is enabled, transition straight back to listening for seamless voice loop!
    if (isHandsFree) {
      autoListenTimerRef.current = window.setTimeout(() => {
        startRecording();
      }, 1000);
    }
  };

  // Waveform visualization drawer
  const startWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    let height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      // Clear canvas with deep space theme
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const isListening = voiceStatus === 'listening';
      const isSpeaking = voiceStatus === 'speaking';
      const isProcessing = voiceStatus === 'processing';

      if (isListening && analyserRef.current && dataArrayRef.current) {
        // Draw physical audio frequency lines based on genuine real-time MIC input!
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        const len = dataArrayRef.current.length;
        const sliceWidth = canvas.offsetWidth / 32;
        ctx.lineWidth = 1.5;
        
        for (let i = 0; i < 32; i++) {
          const rawVal = dataArrayRef.current[Math.floor(i * (len / 64))];
          const val = rawVal / 255.0; // scale 0-1
          const barHeight = Math.max(3, val * (canvas.offsetHeight - 20));
          const x = i * sliceWidth + (sliceWidth / 2);
          const y1 = (canvas.offsetHeight - barHeight) / 2;
          
          ctx.strokeStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y1 + barHeight);
          ctx.stroke();
        }
      } else if (isSpeaking) {
        // Oscillating clean monochrome elegant mathematical sine wave
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#FFFFFF';
        
        const time = Date.now() * 0.006;
        for (let x = 0; x < canvas.offsetWidth; x++) {
          const y = (canvas.offsetHeight / 2) + Math.sin(x * 0.03 + time) * 15 * Math.sin(x * 0.005 + time * 0.5);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else if (isProcessing) {
        // Minimalist graphite floating thinking line
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#404040';
        
        const time = Date.now() * 0.004;
        const middleY = canvas.offsetHeight / 2;
        ctx.moveTo(0, middleY);
        for (let x = 0; x < canvas.offsetWidth; x++) {
          const waveHeight = Math.sin(x * 0.01 + time) * 6;
          ctx.lineTo(x, middleY + waveHeight);
        }
        ctx.stroke();
      } else {
        // Gentle breathing passive straight line
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#262626';
        
        const middleY = canvas.offsetHeight / 2;
        ctx.moveTo(0, middleY);
        ctx.lineTo(canvas.offsetWidth, middleY);
        ctx.stroke();
      }
    };

    draw();
  };

  // Helper sound effects generator
  const playBeep = (freq: number, duration: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-2xl flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-[#262626] bg-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] uppercase font-semibold text-[#A3A3A3] tracking-widest font-sans">YORN AI Voice Mode</span>
            </div>
            <button 
              onClick={() => { cleanupAudio(); onClose(); }}
              className="p-1.5 text-[#A3A3A3] hover:text-[#FFFFFF] hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
              title="Закрыть голосовой чат"
            >
              <X size={16} />
            </button>
          </div>

          {/* Interactive Spectrum Canvas */}
          <div className="p-6 flex-1 flex flex-col">
            <div className="relative w-full h-36 bg-[#0A0A0A] rounded-lg border border-[#262626] overflow-hidden mb-6 flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full"
              />
              
              {/* Overlay states label */}
              <div className="absolute top-2 left-3 z-10 text-[10px] font-mono tracking-wider uppercase text-[#666]">
                SPECTRUM ENGINE v1.6
              </div>
            </div>

            {/* Conversation text boxes */}
            <div className="space-y-4 mb-6 flex-1 overflow-y-auto max-h-[140px] pr-2 scrollbar-thin">
              {userTranscript && (
                <div className="text-left">
                  <span className="text-[10px] font-mono text-[#666] uppercase block mb-1">Вы сказали</span>
                  <div className="bg-[#141414] text-[#FFFFFF] text-sm py-2 px-3 rounded-lg border border-[#262626] inline-block max-w-full">
                    {userTranscript}
                  </div>
                </div>
              )}

              {aiSpeechText && (
                <div className="text-left">
                  <span className="text-[10px] font-mono text-[#666] uppercase block mb-1">YorN AI</span>
                  <div className="bg-[#141414]/40 text-[#A3A3A3] text-sm py-2 px-3 rounded-lg border border-[#262626]/40 inline-block max-w-full">
                    {aiSpeechText}
                  </div>
                </div>
              )}
            </div>

            {/* Status Information */}
            <div className="text-center py-2 mb-6">
              <span className="text-base font-semibold text-[#FFFFFF] tracking-tight transition-all duration-300">
                {voiceStatus === 'idle' && "Готов к разговору"}
                {voiceStatus === 'listening' && "Слушаю вас..."}
                {voiceStatus === 'processing' && "Анализирую вашу речь..."}
                {voiceStatus === 'speaking' && "Говорю..."}
              </span>
              <p className="text-xs text-[#666] mt-1">
                {voiceStatus === 'idle' && "Нажмите круглую кнопку для начала записи"}
                {voiceStatus === 'listening' && "Говорите в микрофон, затем нажмите стоп"}
                {voiceStatus === 'processing' && "Модель YorN генерирует ответ"}
                {voiceStatus === 'speaking' && "Слушайте озвучиваемый голосом ответ"}
              </p>
            </div>

            {/* Interactive Pulse & Controller button */}
            <div className="flex flex-col items-center justify-center gap-6">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVoiceListen}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  voiceStatus === 'listening' 
                    ? 'bg-red-500/10 border border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                    : voiceStatus === 'processing'
                    ? 'bg-purple-500/10 border border-purple-500/40 text-[#A3A3A3] animate-pulse'
                    : 'bg-[#141414] hover:bg-[#262626] border border-[#262626] text-white shadow-lg cursor-pointer'
                }`}
              >
                {voiceStatus === 'listening' ? (
                  <MicOff size={32} className="animate-pulse" />
                ) : (
                  <Mic size={32} className={voiceStatus === 'speaking' ? "animate-bounce" : ""} />
                )}
              </motion.button>

              {/* Advanced controls */}
              <div className="flex flex-col gap-3 w-full border-t border-[#262626] pt-4 mt-2">
                <div className="flex items-center gap-3 justify-center flex-wrap">
                  <button 
                    onClick={() => {
                      setIsHandsFree(!isHandsFree);
                      playBeep(isHandsFree ? 200 : 400, 0.1);
                    }}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                      isHandsFree 
                        ? 'bg-[#141414] text-emerald-400 border-emerald-500/20' 
                        : 'text-[#666] hover:text-[#A3A3A3] bg-transparent border-transparent'
                    }`}
                    title="Автоматический переход в режим записи после завершения ответа"
                  >
                    <Radio size={13} className={isHandsFree ? "animate-pulse" : ""} />
                    <span>{isHandsFree ? "Свободные руки: ВКЛ" : "Свободные руки: ВЫКЛ"}</span>
                  </button>

                  <button 
                    onClick={() => {
                      const modeValue = !useNativeVoice;
                      setUseNativeVoice(modeValue);
                      localStorage.setItem('yorn_voice_use_native', String(modeValue));
                      playBeep(modeValue ? 500 : 300, 0.1);
                    }}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                      useNativeVoice 
                        ? 'bg-[#141414] text-purple-400 border-purple-500/20' 
                        : 'text-[#666] hover:text-[#A3A3A3] bg-transparent border-transparent'
                    }`}
                    title="Полноценный естественный голос вместо металлического голоса робота"
                  >
                    <Sparkles size={13} className={useNativeVoice ? "animate-pulse" : ""} />
                    <span>{useNativeVoice ? "Естественный голос: ВКЛ" : "Естественный голос: ВЫКЛ"}</span>
                  </button>
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={() => {
                      stopSpeaking();
                      setVoiceStatus('idle');
                    }}
                    disabled={voiceStatus !== 'speaking'}
                    className={`text-xs py-1.5 px-3 rounded-lg border transition-all ${
                      voiceStatus === 'speaking'
                        ? 'bg-[#141414] text-[#FFFFFF] border-[#262626] hover:bg-[#262626] cursor-pointer'
                        : 'text-[#333] border-transparent cursor-not-allowed'
                    }`}
                  >
                    Остановить голос
                  </button>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-2 bg-red-950/20 border border-red-900/50 rounded-lg text-left"
              >
                <div className="flex gap-2">
                  <span className="text-red-400 text-xs leading-relaxed">{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
