import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Menu, Settings2, ArrowUp, Mic, MicOff, Paperclip, FileText, X } from 'lucide-react';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import { Message } from '../types';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatAreaProps {
  onOpenLeftMenu: () => void;
  isLeftOpen: boolean;
  messages: Message[];
  isTyping: boolean;
  typingLabel?: string;
  onSendMessage: (content: string, rawAttachments?: { name: string; content: string; size: string }[]) => void;
  onRegenerate: () => void;
  mode: 'speed' | 'tech' | 'plan';
  onModeChange: (mode: 'speed' | 'tech' | 'plan') => void;
  showTts: boolean;
  showRegenerate: boolean;
  loadingAnimation: string;
}

export default function ChatArea({ 
  onOpenLeftMenu, 
  isLeftOpen, 
  messages, 
  isTyping, 
  typingLabel,
  onSendMessage, 
  onRegenerate, 
  mode, 
  onModeChange,
  showTts,
  showRegenerate,
  loadingAnimation
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; content: string; size: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ru-RU';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.onerror = (event: any) => {
         console.error('Speech recognition error:', event.error);
         if (event.error === 'not-allowed') {
           setMicError("Доступ запрещен. Откройте приложение в новой вкладке (кнопка в правом верхнем углу) и разрешите микрофон.");
           setTimeout(() => setMicError(null), 8000);
         }
         setIsRecording(false);
      };
      
      recognition.onend = () => {
         setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Ваш браузер не поддерживает распознавание голоса.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() || attachments.length > 0) {
        onSendMessage(inputValue, attachments);
        setInputValue('');
        setAttachments([]);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const handleSend = () => {
    if (inputValue.trim() || attachments.length > 0) {
      onSendMessage(inputValue, attachments);
      setInputValue('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`Файл "${file.name}" слишком большой. Пожалуйста, выбирайте файлы размером меньше 2MB.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachments(prev => {
          if (prev.some(p => p.name === file.name)) return prev; // Avoid duplicates
          return [...prev, {
            name: file.name,
            content: text || '[Пустой файл]',
            size: (file.size / 1024).toFixed(1) + ' KB'
          }];
        });
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div 
      className="flex-1 flex flex-col h-full relative z-10 w-full min-w-0 bg-transparent"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-md border border-dashed border-purple-500/20 m-4 rounded-2xl z-[200] flex flex-col items-center justify-center gap-4 text-center select-none pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-purple-950/20 border border-purple-500/20 flex items-center justify-center animate-[pulse_1.5s_ease-in-out_infinite]">
            <Paperclip size={24} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Перетащите файлы сюда</h3>
            <p className="text-xs text-[#555]">Мы распознаем и прочитаем любые текстовые файлы до 2MB</p>
          </div>
        </div>
      )}

      {/* Hidden native file input connector */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />
      
      {/* Top Header */}
      <div className="border-b border-[#1A1A1A] bg-[#050505]/45 backdrop-blur-md sticky top-0 z-20 w-full">
        <div className="w-full flex items-center justify-between p-3 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenLeftMenu} 
              className={`p-2 text-[#666] hover:text-[#AAA] hover:bg-[#121212]/50 rounded-lg transition-all cursor-pointer ${
                isLeftOpen ? 'lg:hidden' : 'block'
              }`}
              title="Открыть меню"
            >
               <Menu size={18} />
            </button>
            
            {!isLeftOpen && (
              <div className="flex items-center gap-2.5 select-none animate-[fadeIn_0.2s_ease-out]">
                <div className="w-7 h-7 rounded-lg bg-transparent flex items-center justify-center border border-[#222] shadow-[0_0_15px_rgba(255,255,255,0.01)] relative overflow-hidden bg-[#080808]">
                  <div className="absolute inset-0 bg-white/5 rounded-lg blur-sm" />
                  <svg viewBox="0 0 100 100" className="w-4 h-4 relative z-10" fill="none" stroke="#E0E0E0" strokeWidth="6" strokeLinejoin="miter">
                    <path d="M15 20 L40 55 V85 M65 20 L40 55" />
                    <path d="M55 85 V20 L85 85 V20" />
                  </svg>
                </div>
                <span className="font-medium text-[11px] text-[#A0A0A0] uppercase tracking-wider">YorN AI</span>
              </div>
            )}
          </div>
          <span className="text-xs font-light tracking-wide text-[#666]">Neural Session: <span className="text-[#AAA]">Alpha</span></span>
          <div className="w-9" /> {/* Spacer for symmetry */}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scrollbar-hide flex flex-col">
        {messages.length === 0 && !isTyping ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center gap-4 opacity-40">
                <div className="w-12 h-12 rounded-full border border-[#222] bg-[#111] flex items-center justify-center">
                   <div className="w-2 h-2 bg-[#555] rounded-full" />
                </div>
                <span className="text-[#666] font-light tracking-wide text-sm">Ожидаю ввода...</span>
             </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto flex flex-col">
            {(() => {
              const lastAssistantMsgId = [...messages]
                .reverse()
                .find(m => m.role === 'assistant')?.id;
              
              return messages.map((msg, idx) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  isLastAssistant={msg.id === lastAssistantMsgId}
                  onRegenerate={onRegenerate}
                  showTts={showTts}
                  showRegenerate={showRegenerate}
                />
              ));
            })()}
            {isTyping && loadingAnimation === 'circle' && (
              <div className="flex justify-center items-center py-10">
                <div className="relative w-36 h-36 flex items-center justify-center select-none">
                  {/* Outer orbit */}
                  <motion.div
                    className="absolute w-32 h-32 border border-white/5 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_#ac5dfa]" />
                  </motion.div>
                  {/* Inner orbit */}
                  <motion.div
                    className="absolute w-24 h-24 border border-dashed border-purple-500/20 rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Glow aura */}
                  <motion.div
                    className="absolute w-12 h-12 rounded-full bg-purple-500/10 blur-xl"
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Center core */}
                  <motion.div
                    className="w-16 h-16 rounded-full bg-[#111] border border-white/10 flex items-center justify-center animate-pulse"
                  >
                    <svg className="w-5 h-5 text-neutral-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </motion.div>
                  <div className="absolute top-[110%] text-center w-40">
                    <span className="text-[9px] tracking-[0.2em] text-neutral-500 uppercase font-mono animate-pulse">
                      {typingLabel || 'Анализ нейросети'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {isTyping && loadingAnimation !== 'circle' && <TypingIndicator text={typingLabel} animationStyle={loadingAnimation} />}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-8 pb-6 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent">
        <div className="max-w-3xl mx-auto relative group">
           <div className="absolute -inset-0.5 bg-[#121212]/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
           <div className={`relative rounded-2xl transition-all shadow-2xl flex flex-col ${
             isTyping && loadingAnimation === 'border' 
               ? 'p-[1.5px]' 
               : 'border border-[#1A1A1A] focus-within:border-[#333] bg-[#0A0A0A] p-4'
           }`}>
             {isTyping && loadingAnimation === 'border' && (
               <motion.div
                 style={{
                   position: 'absolute',
                   inset: 0,
                   borderRadius: '1rem',
                   background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6, #ec4899, #a855f7)',
                   backgroundSize: '200% 200%',
                   zIndex: 0,
                 }}
                 animate={{
                   backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                 }}
                 transition={{
                   duration: 3,
                   repeat: Infinity,
                   ease: 'linear'
                 }}
               />
             )}
             <div className={`relative flex flex-col w-full h-full z-10 ${
               isTyping && loadingAnimation === 'border' ? 'bg-[#0A0A0A] p-4 rounded-[15px]' : ''
             }`}>
             
             {/* Render parsed attachment list above the input text field */}
             {attachments.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-3 animate-[fadeIn_0.2s_ease-out]">
                 {attachments.map((att, idx) => (
                   <div key={idx} className="flex items-center gap-2 bg-[#141414] border border-[#222] text-[#AAA] py-1 px-2.5 rounded-lg text-xs font-mono">
                     <FileText size={13} className="text-purple-400" />
                     <span className="truncate max-w-[150px]">{att.name}</span>
                     <span className="text-[#555] text-[10px]">{att.size}</span>
                     <button 
                       onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                       className="text-[#666] hover:text-red-400 ml-1 cursor-pointer transition-colors"
                       title="Удалить файл"
                     >
                       <X size={12} />
                     </button>
                   </div>
                 ))}
               </div>
             )}

             <textarea
               ref={textareaRef}
               value={inputValue}
               onChange={handleInput}
               onKeyDown={handleKeyDown}
               placeholder="Спросите YorN или перетащите его сюда файлы..."
               className="w-full bg-transparent border-none outline-none text-sm text-[#AAA] placeholder-[#444] resize-none leading-relaxed min-h-[48px] max-h-[150px] scrollbar-hide"
               rows={1}
             />
             {micError && (
               <motion.div 
                 initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                 className="text-xs text-red-400 mt-2 p-2 bg-red-950/30 rounded-lg border border-red-900/50"
               >
                 {micError}
               </motion.div>
             )}
             <div className="flex items-center justify-between pt-2 border-t border-[#151515] mt-2 relative">
               <div className="flex items-center gap-3">
                 <div className="relative">
                   <button 
                     onClick={() => setShowModeSelect(!showModeSelect)}
                     className={`p-1 transition-colors ${showModeSelect ? 'text-white' : 'text-[#444] hover:text-[#777]'}`}
                     title="Режим (Speed/Tech/Plan)"
                   >
                     <Settings2 size={16} />
                   </button>
                   
                   {showModeSelect && (
                     <>
                       <div className="fixed inset-0 z-[100]" onClick={() => setShowModeSelect(false)} />
                       <motion.div 
                         initial={{ opacity: 0, y: 5 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="absolute bottom-full left-0 mb-4 p-1.5 bg-[#111] border border-[#222] rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col gap-1 z-[101] min-w-[120px]"
                       >
                         <button 
                           onClick={() => { onModeChange('speed'); setShowModeSelect(false); }}
                           className={`text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${mode === 'speed' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#1A1A1A] hover:text-[#DDD]'}`}
                         >
                           <span>Speed</span>
                           {mode === 'speed' ? <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                         </button>
                         <button 
                           onClick={() => { onModeChange('tech'); setShowModeSelect(false); }}
                           className={`text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${mode === 'tech' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#1A1A1A] hover:text-[#DDD]'}`}
                         >
                           <span>Tech</span>
                           {mode === 'tech' ? <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                          </button>
                          <button 
                            onClick={() => { onModeChange('plan'); setShowModeSelect(false); }}
                            className={`text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${mode === 'plan' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#1A1A1A] hover:text-[#DDD]'}`}
                          >
                            <span>Plan (Agent)</span>
                            {mode === 'plan' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                         </button>
                       </motion.div>
                     </>
                   )}
                 </div>
                 
                 {/* Attachment Clip Button */}
                 <button 
                   onClick={triggerFileSelect}
                   title="Загрузить файлы (текст/код до 2MB)"
                   className="p-1 text-[#444] hover:text-[#777] transition-colors cursor-pointer"
                 >
                   <Paperclip size={16} />
                 </button>

                 <button 
                   onClick={toggleRecording}
                   title={isRecording ? "Остановить запись" : "Голосовой ввод"}
                   className={`p-1 transition-colors ${isRecording ? 'text-red-500 animate-[pulse_1.5s_ease-in-out_infinite]' : 'text-[#444] hover:text-[#777]'}`}
                 >
                   {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                 </button>
               </div>
               
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={handleSend}
                 disabled={!inputValue.trim() && attachments.length === 0}
                 className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border
                            ${(inputValue.trim() || attachments.length > 0) ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-[#111] text-white/40 border-[#222] hover:bg-white/5'}`}
               >
                 <ArrowUp size={16} strokeWidth={2} />
               </motion.button>
              </div>
             </div>
           </div>
           <div className="text-center mt-4 text-[10px] text-[#444] font-medium tracking-wide">
             YorN AI может допускать ошибки. Проверяйте информацию.
           </div>
        </div>
      </div>
    </div>
  );
}
