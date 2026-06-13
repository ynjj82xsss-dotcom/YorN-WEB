import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Menu, Settings2, ArrowUp, Mic, MicOff, Paperclip, FileText, X, SlidersHorizontal, Square, Bell, Sparkles, Terminal, Code, HelpCircle, Globe, Lightbulb, MessageSquare, Languages, Bot, Cpu, Compass } from 'lucide-react';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import { Message, Skill } from '../types';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const getSkillIcon = (trigger: string, className = "w-4.5 h-4.5 text-neutral-400") => {
  const t = trigger.toLowerCase();
  
  if (t === 'translate' || t.includes('lang')) {
    return <Languages className={className} />;
  }
  if (t === 'summarize' || t.includes('sum') || t.includes('note')) {
    return <FileText className={className} />;
  }
  if (t === 'code' || t.includes('dev') || t.includes('program')) {
    return <Code className={className} />;
  }
  if (t === 'explain' || t.includes('help') || t.includes('why')) {
    return <HelpCircle className={className} />;
  }
  if (t === 'skill' || t.includes('tool') || t.includes('option')) {
    return <SlidersHorizontal className={className} />;
  }
  if (t.includes('chat') || t.includes('talk') || t.includes('speak')) {
    return <MessageSquare className={className} />;
  }
  if (t.includes('funny') || t.includes('joke') || t.includes('creative') || t.includes('humor') || t.includes('roast')) {
    return <Sparkles className={className} />;
  }
  if (t.includes('idea') || t.includes('brain') || t.includes('prompt')) {
    return <Lightbulb className={className} />;
  }
  
  // Choose nice default icons for other custom inputs
  const charCodeSum = t.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const index = charCodeSum % 4;
  if (index === 0) return <Terminal className={className} />;
  if (index === 1) return <Cpu className={className} />;
  if (index === 2) return <Bot className={className} />;
  return <Compass className={className} />;
};

interface ChatAreaProps {
  onOpenLeftMenu: () => void;
  isLeftOpen: boolean;
  onOpenRightMenu: () => void;
  messages: Message[];
  isTyping: boolean;
  typingLabel?: string;
  onSendMessage: (content: string, rawAttachments?: { name: string; content: string; size: string }[]) => void;
  onRegenerate: () => void;
  onStopGeneration?: () => void;
  mode: 'mini' | 'base' | 'max' | 'auto';
  onModeChange: (mode: 'mini' | 'base' | 'max' | 'auto') => void;
  showTts: boolean;
  showRegenerate: boolean;
  loadingAnimation: string;
  isMobileDevice?: boolean;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  customSkills?: Skill[];
  systemSkills?: Skill[];
  onOpenSkillsHub?: () => void;
}

export default function ChatArea({ 
  onOpenLeftMenu, 
  isLeftOpen, 
  onOpenRightMenu,
  messages, 
  isTyping, 
  typingLabel,
  onSendMessage, 
  onRegenerate, 
  onStopGeneration,
  mode, 
  onModeChange,
  showTts,
  showRegenerate,
  loadingAnimation,
  isMobileDevice = false,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  customSkills = [],
  systemSkills = [],
  onOpenSkillsHub
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; content: string; size: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Skills Hub and Slash Commands Autocomplete states
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge system default skills and user custom skills
  const allAvailableSkills: Skill[] = [
    ...systemSkills,
    ...customSkills,
    {
      id: 'skill-hub-trigger',
      name: '⚙️ Создать или Обучить Навык',
      trigger: 'skill',
      description: 'Открыть Центр Навыков, чтобы добавить свой навык или обучить его с помощью AI.',
      instructions: '',
      createdAt: '',
      isSystem: true
    }
  ];

  // Filter skills based on user input (e.g. typing "/tr" matches "/translate")
  const filteredSkills = allAvailableSkills.filter(s => 
    s.trigger.toLowerCase().includes(skillsSearch) ||
    s.name.toLowerCase().includes(skillsSearch) ||
    s.description.toLowerCase().includes(skillsSearch)
  );

  // Monitor text entry to toggle the autocompletion matching dropdown
  useEffect(() => {
    if (inputValue.startsWith('/')) {
      const match = inputValue.match(/^\/([a-zA-Z0-9_]*)$/);
      if (match) {
        setShowSkillsDropdown(true);
        setSkillsSearch(match[1].toLowerCase());
      } else {
        setShowSkillsDropdown(false);
      }
    } else {
      setShowSkillsDropdown(false);
    }
  }, [inputValue]);

  const selectSkill = (skill: Skill) => {
    if (skill.trigger === 'skill') {
      if (onOpenSkillsHub) onOpenSkillsHub();
      setInputValue('');
    } else {
      setInputValue(`/${skill.trigger} `);
    }
    setShowSkillsDropdown(false);
    setSelectedIndex(0);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Recalculate height
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      }
    }, 50);
  };

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
    if (showSkillsDropdown && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredSkills.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredSkills.length) % filteredSkills.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSkill(filteredSkills[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSkillsDropdown(false);
        return;
      }
    }

    // On mobile devices, let the digital keyboard behave naturally (create newline) 
    // instead of submitting a half-typed message instantly.
    if (isMobileDevice) {
      return;
    }
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
      <div className="border-b border-[#1A1A1A] bg-[#050505]/45 backdrop-blur-md sticky top-0 z-20 w-full pt-[env(safe-area-inset-top,0px)]">
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
          <div className="flex items-center gap-1">
            <button 
              onClick={onOpenNotifications}
              className="p-2 text-[#666] hover:text-[#AAA] hover:bg-[#121212]/50 rounded-lg transition-all cursor-pointer flex items-center justify-center relative"
              title="Уведомления и рассылка"
            >
              <Bell size={15} className={unreadNotificationsCount > 0 ? "text-purple-400 animate-pulse" : ""} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              )}
            </button>
            
            <button 
              onClick={onOpenRightMenu}
              className="p-2 text-[#666] hover:text-[#AAA] hover:bg-[#121212]/50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
              title="Профиль и настройки"
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>
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
      <div className="p-4 md:p-8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-6 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent">
        <div className="max-w-3xl mx-auto relative group">
          {/* Skills Dropdown Autocomplete Overlay */}
          {showSkillsDropdown && filteredSkills.length > 0 && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 right-0 z-[100] max-h-[300px] overflow-y-auto bg-[#080808]/95 border border-purple-500/20 rounded-xl shadow-[0_-15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md divide-y divide-neutral-900 scrollbar-hide">
              <div className="p-2.5 px-4 text-[9px] text-neutral-400 font-mono tracking-wider flex items-center justify-between pointer-events-auto bg-[#040404]/95 border-b border-[#121212] select-none text-neutral-500">
                <div className="flex items-center gap-2">
                  <span className="px-1 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono text-[8px] font-bold">↑↓</span>
                  <span>Навигация</span>
                  <span className="px-1 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono text-[8px] font-bold ml-1">Enter</span>
                  <span>Выбор</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSkillsHub) onOpenSkillsHub();
                    setShowSkillsDropdown(false);
                  }}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium hover:underline cursor-pointer flex items-center gap-1 text-[9px]"
                >
                  <SlidersHorizontal size={10} />
                  <span>Открыть Центр Навыков (/skill)</span>
                </button>
              </div>
              {filteredSkills.map((skill, index) => (
                <div
                  key={skill.id}
                  onClick={() => selectSkill(skill)}
                  className={`p-2.5 px-4 flex items-center justify-between gap-3 cursor-pointer transition-all border-l-2 ${
                    index === selectedIndex 
                      ? 'bg-purple-500/10 text-white border-purple-500' 
                      : 'text-neutral-400 border-transparent hover:bg-neutral-900/60 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      index === selectedIndex 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                        : 'bg-neutral-950 text-neutral-500 border border-neutral-800/40'
                    }`}>
                      {getSkillIcon(skill.trigger)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-200">{skill.name}</span>
                        {skill.isSystem ? (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-neutral-900 text-neutral-500 font-mono font-semibold tracking-wider">SYSTEM</span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-purple-950/40 text-purple-400 border border-purple-500/15 font-mono font-semibold tracking-wider">CUSTOM</span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5 truncate leading-relaxed">
                        {skill.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold tracking-tight shrink-0 transition-all border ${
                    index === selectedIndex
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800/65'
                  }`}>
                    /{skill.trigger}
                  </div>
                </div>
              ))}
            </div>
          )}
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
               className="w-full bg-transparent border-none outline-none text-base md:text-sm text-[#AAA] placeholder-[#444] resize-none leading-relaxed min-h-[48px] max-h-[150px] scrollbar-hide"
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
                     className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-medium rounded-full border transition-all ${showModeSelect ? 'bg-[#222]/80 border-neutral-700 text-white' : 'bg-[#121212]/50 border-[#222] text-[#888] hover:text-[#CCC] hover:border-[#333]'}`}
                     title="Выбор ИИ Модели"> <Settings2 size={11} className={showModeSelect ? "text-purple-400" : "text-[#555]"} /> <span>{mode === "mini" ? "YorN mini" : mode === "base" ? "YorN base" : mode === "max" ? "Yorn MAX" : "auto"}</span> </button>
                   
                   {showModeSelect && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowModeSelect(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full left-0 mb-4 p-1.5 bg-[#111] border border-[#222] rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col gap-1 z-[101] min-w-[170px]"
                        >
                          <button 
                            onClick={() => { onModeChange('auto'); setShowModeSelect(false); }}
                            className={`text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${mode === 'auto' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#151515] hover:text-[#DDD]'}`}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>auto</span>
                              {mode === 'auto' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Оптимальный автовыбор</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('mini'); setShowModeSelect(false); }}
                            className={`text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${mode === 'mini' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#151515] hover:text-[#DDD]'}`}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>YorN mini</span>
                              {mode === 'mini' ? <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Легкая и быстрая (8B)</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('base'); setShowModeSelect(false); }}
                            className={`text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${mode === 'base' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#151515] hover:text-[#DDD]'}`}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>YorN base</span>
                              {mode === 'base' ? <div className="w-1.5 h-1.5 rounded-full bg-purple-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Универсальная (32B Coder)</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('max'); setShowModeSelect(false); }}
                            className={`text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${mode === 'max' ? 'bg-[#222] text-white' : 'text-[#888] hover:bg-[#151515] hover:text-[#DDD]'}`}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>Yorn MAX</span>
                              {mode === 'max' ? <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Максимальный разум (72B)</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </div>
                 
                 {/* Skills Hub Button */}
                  <button 
                    onClick={onOpenSkillsHub}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-medium rounded-full border bg-[#121212]/50 border-[#222] text-[#888] hover:text-purple-400 hover:border-purple-500/30 transition-all cursor-pointer"
                    title="Центр Навыков ИИ"
                  >
                    <SlidersHorizontal size={11} className="text-purple-500/70" />
                    <span>Центр Навыков</span>
                  </button>

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
               
               {isTyping ? (
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={onStopGeneration}
                   title="Остановить генерацию"
                   className="w-8 h-8 rounded-full flex items-center justify-center transition-colors border bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 cursor-pointer"
                 >
                   <Square size={11} fill="currentColor" strokeWidth={0} />
                 </motion.button>
               ) : (
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={handleSend}
                   disabled={!inputValue.trim() && attachments.length === 0}
                   title="Отправить сообщение"
                   className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border
                              ${(inputValue.trim() || attachments.length > 0) ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-[#111] text-white/40 border-[#222] hover:bg-white/5'}`}
                 >
                   <ArrowUp size={16} strokeWidth={2} />
                 </motion.button>
               )}
              </div>
             </div>
           </div>
           <div className="text-center mt-4 text-[10px] text-[#444] font-medium tracking-wide">
             YorN AI может допускать ошибки. Проверяйте информацию. • <a href="https://t.me/myauradev" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-[#58C4DC] font-semibold transition-colors inline-flex items-center gap-0.5">myauradev <span className="text-[8px] bg-white/5 text-[#58C4DC] px-1 rounded-sm font-mono tracking-wider font-bold">TG</span></a>
           </div>
        </div>
      </div>
    </div>
  );
}
