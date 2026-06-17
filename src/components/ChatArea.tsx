import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Menu, Settings2, ArrowUp, Mic, MicOff, Paperclip, FileText, X, SlidersHorizontal, Square, Bell, Sparkles, Terminal, Code, HelpCircle, Globe, Lightbulb, MessageSquare, Languages, Bot, Cpu, Compass, Search } from 'lucide-react';
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
  mode: 'mini' | 'base' | 'max' | 'auto' | 'image';
  onModeChange: (mode: 'mini' | 'base' | 'max' | 'auto' | 'image') => void;
  showTts: boolean;
  showRegenerate: boolean;
  loadingAnimation: string;
  isMobileDevice?: boolean;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  customSkills?: Skill[];
  systemSkills?: Skill[];
  onOpenSkillsHub?: () => void;
  chatStyle?: 'default' | 'cyberpunk' | 'glass' | 'brutalist';
  onSaveEditedImage?: (editedImageUrl: string, prompt: string) => void;
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
  onOpenSkillsHub,
  chatStyle = 'default',
  onSaveEditedImage
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

  // Handle different chat panel styles
  const isCyberpunk = chatStyle === 'cyberpunk';
  const isGlass = chatStyle === 'glass';
  const isBrutalist = chatStyle === 'brutalist';

  let borderGlowContainerClass = "absolute -inset-0.5 bg-gradient-to-r from-neutral-800/15 to-neutral-700/15 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none";
  let inputContainerBorderClass = `relative rounded-2xl transition-all shadow-xl flex flex-col ${
    isTyping && loadingAnimation === 'border' 
      ? 'p-[1.5px]' 
      : 'border border-[#1E1E22] focus-within:border-neutral-700/80 focus-within:bg-[#0D0D10] bg-[#0A0A0C] p-4'
  }`;
  let inputInnerContainerClass = `relative flex flex-col w-full h-full z-10 ${
    isTyping && loadingAnimation === 'border' ? 'bg-[#0a0a0c] p-4 rounded-[15px]' : ''
  }`;
  let textareaStylesClass = "w-full bg-transparent border-none outline-none text-base md:text-sm text-neutral-200 placeholder-neutral-500 resize-none leading-relaxed min-h-[48px] max-h-[150px] scrollbar-hide font-sans";
  let actionsBorderClass = "flex items-center justify-between pt-2 border-t border-[#161619] mt-2 relative";
  let attachmentBadgeClass = "flex items-center gap-2 bg-[#141416] border border-[#222] text-neutral-300 py-1 px-2.5 rounded-lg text-xs font-sans";
  let dropdownPortalClass = "absolute bottom-full left-0 mb-4 p-1.5 bg-[#0F0F12] border border-[#1E1E22] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col gap-1 z-[101] min-w-[170px]";
  let dropdownItemClass = (isActive: boolean) => {
    return `text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${
      isActive 
        ? 'bg-[#202025] text-white' 
        : 'text-neutral-400 hover:bg-[#151518] hover:text-neutral-200'
    }`;
  };

  if (isCyberpunk) {
    borderGlowContainerClass = "absolute -inset-1.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/15 to-pink-500/10 rounded-2xl blur-md opacity-35 group-hover:opacity-75 transition-opacity duration-1000 pointer-events-none";
    inputContainerBorderClass = `relative rounded-2xl transition-all shadow-[0_0_30px_rgba(168,85,247,0.03)] flex flex-col ${
      isTyping && loadingAnimation === 'border' 
        ? 'p-[1.5px]' 
        : 'border border-[#20153B] focus-within:border-purple-500/50 focus-within:bg-[#0C081A] bg-[#07040E] p-4'
    }`;
    inputInnerContainerClass = `relative flex flex-col w-full h-full z-10 ${
      isTyping && loadingAnimation === 'border' ? 'bg-[#0c081a] p-4 rounded-[15px]' : ''
    }`;
    textareaStylesClass = "w-full bg-transparent border-none outline-none text-base md:text-sm text-purple-100 placeholder-purple-900/40 resize-none leading-relaxed min-h-[48px] max-h-[150px] scrollbar-hide font-sans";
    actionsBorderClass = "flex items-center justify-between pt-2 border-t border-purple-950/20 mt-2 relative";
    attachmentBadgeClass = "flex items-center gap-2 bg-[#0E0B19] border border-purple-950/30 text-purple-300 py-1 px-2.5 rounded-lg text-xs font-sans";
    dropdownPortalClass = "absolute bottom-full left-0 mb-4 p-1.5 bg-[#0C081A] border border-purple-950/50 rounded-xl shadow-[0_10px_35px_rgba(168,85,247,0.1)] flex flex-col gap-1 z-[101] min-w-[170px]";
    dropdownItemClass = (isActive: boolean) => {
      return `text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${
        isActive 
          ? 'bg-purple-950/35 text-purple-200 border-l-2 border-purple-500/60 pl-2' 
          : 'text-purple-400/80 hover:bg-purple-950/15 hover:text-purple-200'
      }`;
    };
  } else if (isGlass) {
    borderGlowContainerClass = "absolute -inset-0.5 bg-white/5 rounded-2xl blur opacity-0 group-hover:opacity-40 transition duration-1000 pointer-events-none";
    inputContainerBorderClass = `relative rounded-2xl transition-all shadow-[0_12px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col backdrop-blur-xl ${
      isTyping && loadingAnimation === 'border' 
        ? 'p-[1.5px]' 
        : 'border border-white/[0.08] focus-within:border-white/[0.18] focus-within:bg-white/[0.035] bg-white/[0.015] p-4'
    }`;
    inputInnerContainerClass = `relative flex flex-col w-full h-full z-10 ${
      isTyping && loadingAnimation === 'border' ? 'bg-white/[0.025] p-4 rounded-[15px]' : ''
    }`;
    textareaStylesClass = "w-full bg-transparent border-none outline-none text-base md:text-sm text-neutral-100 placeholder-neutral-500 resize-none leading-relaxed min-h-[48px] max-h-[150px] scrollbar-hide font-sans";
    actionsBorderClass = "flex items-center justify-between pt-2 border-t border-white/[0.05] mt-2 relative";
    attachmentBadgeClass = "flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] text-white/80 py-1 px-2.5 rounded-lg text-xs font-sans";
    dropdownPortalClass = "absolute bottom-full left-0 mb-4 p-1.5 bg-[#0F0F12]/90 border border-white/[0.08] backdrop-blur-xl rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col gap-1 z-[101] min-w-[170px]";
    dropdownItemClass = (isActive: boolean) => {
      return `text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${
        isActive 
          ? 'bg-white/10 text-white' 
          : 'text-white/50 hover:bg-white/5 hover:text-white'
      }`;
    };
  } else if (isBrutalist) {
    borderGlowContainerClass = "absolute -inset-0.5 bg-neutral-900 rounded-none opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none";
    inputContainerBorderClass = `relative rounded-none transition-all shadow-[4px_4px_0_0_rgba(10,10,10,1)] hover:shadow-[6px_6px_0_0_rgba(20,20,20,1)] flex flex-col duration-300 ${
      isTyping && loadingAnimation === 'border' 
        ? 'p-[1.5px]' 
        : 'border border-neutral-850 focus-within:border-neutral-200 bg-black p-4'
    }`;
    inputInnerContainerClass = `relative flex flex-col w-full h-full z-10 ${
      isTyping && loadingAnimation === 'border' ? 'bg-black p-4 rounded-none' : ''
    }`;
    textareaStylesClass = "w-full bg-transparent border-none outline-none text-base md:text-sm text-[#F0F0F0] placeholder-neutral-700 resize-none leading-relaxed min-h-[48px] max-h-[150px] scrollbar-hide font-mono";
    actionsBorderClass = "flex items-center justify-between pt-2 border-t border-neutral-900 mt-2 relative";
    attachmentBadgeClass = "flex items-center gap-2 bg-black border border-neutral-800 text-neutral-300 py-1 px-3 rounded-none text-xs font-mono";
    dropdownPortalClass = "absolute bottom-full left-0 mb-4 p-1.5 bg-black border-2 border-neutral-100 rounded-none shadow-[4px_4px_0_0_rgba(255,255,255,1)] flex flex-col gap-1 z-[101] min-w-[170px]";
    dropdownItemClass = (isActive: boolean) => {
      return `text-left px-2.5 py-2 rounded-none transition-colors flex flex-col gap-0.5 ${
        isActive 
          ? 'bg-neutral-100 text-black font-mono font-bold' 
          : 'text-neutral-400 hover:bg-neutral-900 hover:text-white font-mono'
      }`;
    };
  }

  const actionButtonClass = (isActive: boolean) => {
    if (isCyberpunk) {
      return isActive 
        ? "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-medium rounded-full border transition-all bg-purple-900/20 border-purple-500/40 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
        : "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-medium rounded-full border transition-all bg-purple-950/5 border-purple-950/30 text-purple-500 hover:text-purple-300 hover:border-purple-800/40";
    }
    if (isGlass) {
      return isActive
        ? "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-medium rounded-full border transition-all bg-white/10 border-white/20 text-white"
        : "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-medium rounded-full border transition-all bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white/80 hover:border-white/15";
    }
    if (isBrutalist) {
      return isActive
        ? "flex items-center gap-1.5 px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider bg-neutral-100 text-black border border-neutral-100 font-bold rounded-none transition-all"
        : "flex items-center gap-1.5 px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider bg-black border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500 rounded-none transition-all";
    }
    return isActive
      ? "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-medium rounded-full border transition-all bg-neutral-800 border-neutral-700 text-white"
      : "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-medium rounded-full border transition-all bg-neutral-900/40 border-[#1E1E22] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700";
  };

  let accessoryButtonClass = "";
  if (isCyberpunk) {
    accessoryButtonClass = "p-1 text-purple-400 hover:text-purple-200 transition-colors cursor-pointer";
  } else if (isGlass) {
    accessoryButtonClass = "p-1 text-white/40 hover:text-white/80 transition-colors cursor-pointer";
  } else if (isBrutalist) {
    accessoryButtonClass = "p-1 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer rounded-none";
  } else {
    accessoryButtonClass = "p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer";
  }

  const micRecordingClass = `p-1 transition-colors ${
    isRecording 
      ? 'text-red-500 animate-[pulse_1.5s_ease-in-out_infinite]' 
      : (isCyberpunk ? 'text-purple-400 hover:text-purple-200 cursor-pointer' : isGlass ? 'text-white/40 hover:text-white/80 cursor-pointer' : isBrutalist ? 'text-neutral-500 hover:text-neutral-200 cursor-pointer rounded-none' : 'text-neutral-400 hover:text-white cursor-pointer')
  }`;

  const hasInput = !!(inputValue.trim() || attachments.length > 0);
  let sendButtonClass = "";
  if (isCyberpunk) {
    sendButtonClass = `w-8 h-8 rounded-full flex items-center justify-center transition-all ${
      hasInput 
        ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)] cursor-pointer' 
        : 'bg-[#0D091B] border border-purple-950/30 text-purple-950/55 cursor-not-allowed'
    }`;
  } else if (isGlass) {
    sendButtonClass = `w-8 h-8 rounded-full flex items-center justify-center transition-all ${
      hasInput 
        ? 'bg-white text-black hover:bg-neutral-100 shadow-[0_8px_20px_rgba(255,255,255,0.1)] cursor-pointer' 
        : 'bg-white/[0.02] border border-white/[0.05] text-white/15 cursor-not-allowed'
    }`;
  } else if (isBrutalist) {
    sendButtonClass = `w-8 h-8 rounded-none flex items-center justify-center transition-all ${
      hasInput 
        ? 'bg-neutral-100 text-black hover:bg-white border border-transparent font-mono text-xs font-bold cursor-pointer' 
        : 'bg-black border border-neutral-900 text-neutral-850 cursor-not-allowed shadow-none'
    }`;
  } else {
    sendButtonClass = `w-8 h-8 rounded-full flex items-center justify-center transition-all ${
      hasInput 
        ? 'bg-white text-black hover:scale-105 cursor-pointer' 
        : 'bg-neutral-900 border border-neutral-800/40 text-neutral-600 cursor-not-allowed'
    }`;
  }

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
      if (file.size > 50 * 1024 * 1024) {
        alert(`Файл "${file.name}" слишком большой. Пожалуйста, выбирайте файлы размером меньше 50MB.`);
        return;
      }
      
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        setAttachments(prev => {
          if (prev.some(p => p.name === file.name)) return prev; // Avoid duplicates
          return [...prev, {
            name: file.name,
            content: fileContent || '[Пустой файл]',
            size: file.size > 1024 * 1024 
              ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
              : (file.size / 1024).toFixed(1) + ' KB',
            isImg: isImage
          }];
        });
      };
      
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
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
          <span className="text-xs font-light tracking-wide text-[#666]">Neural Session: <span className="text-[#AAA]">BETA 1.5</span></span>
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
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-full border border-[#222] bg-gradient-to-t from-[#111] to-[#1a1a1a] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.02)] relative">
               <div className="w-3 h-3 bg-white/40 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
               <motion.div 
                 className="absolute inset-0 rounded-full border border-white/5"
                 animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                 transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
               />
            </div>
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-[#aaa] mb-2 text-center">Привет! Чем я могу помочь?</h2>
            <p className="text-[#666] font-light text-[13px] sm:text-sm text-center max-w-md mb-10">
               Я здесь, чтобы ответить на ваши вопросы, помочь с кодом, текстами или просто пообщаться.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
               {[
                 { icon: <Code size={18} className="text-[#888] group-hover:text-white transition-colors" />, title: "Написать код", desc: "Скрипты, функции, верстка", trigger: "code" },
                 { icon: <MessageSquare size={18} className="text-[#888] group-hover:text-white transition-colors" />, title: "Составить текст", desc: "Эссе, письма, переводы", trigger: "text" },
                 { icon: <Lightbulb size={18} className="text-[#888] group-hover:text-white transition-colors" />, title: "Поиск идей", desc: "Брейншторм, концепции, планы", trigger: "idea" },
                 { icon: <Search size={18} className="text-[#888] group-hover:text-white transition-colors" />, title: "Поиск информации", desc: "Справка, поиск по сети", trigger: "search" },
               ].map((prompt, idx) => (
                 <button
                   key={idx}
                   onClick={() => {
                     setInputValue(`/${prompt.trigger} `);
                     if (textareaRef.current) {
                       textareaRef.current.focus();
                       textareaRef.current.style.height = 'auto';
                       textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
                     }
                   }}
                   className="group p-4 rounded-xl border border-[#222] bg-[#111]/50 hover:bg-[#1a1a1a] hover:border-[#333] transition-all flex flex-col items-start text-left cursor-pointer"
                 >
                   <div className="mb-3 p-2 rounded-lg bg-[#222]/50 group-hover:bg-[#333]/50 text-[#888] group-hover:text-white transition-colors">
                     {prompt.icon}
                   </div>
                   <h3 className="text-[#E5E5E5] font-medium text-[13px] mb-1">{prompt.title}</h3>
                   <p className="text-[#555] text-[11px] sm:text-xs font-light group-hover:text-[#777] transition-colors">{prompt.desc}</p>
                 </button>
               ))}
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
                  onSaveEditedImage={onSaveEditedImage}
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
           <div className={borderGlowContainerClass}></div>
           <div className={inputContainerBorderClass}>
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
             <div className={inputInnerContainerClass}>
             
             {/* Render parsed attachment list above the input text field */}
             {attachments.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-3 animate-[fadeIn_0.2s_ease-out]">
                 {attachments.map((att, idx) => (
                   <div key={idx} className={attachmentBadgeClass}>
                     <FileText size={13} className={isCyberpunk ? "text-purple-300" : isGlass ? "text-white/60" : isBrutalist ? "text-neutral-400" : "text-purple-400"} />
                     <span className="truncate max-w-[150px]">{att.name}</span>
                     <span className={isCyberpunk ? "text-purple-600/60 text-[10px]" : isGlass ? "text-white/30 text-[10px]" : "text-neutral-500 text-[10px]"}>{att.size}</span>
                     <button 
                       onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                       className={`ml-1 cursor-pointer transition-colors ${isCyberpunk ? 'text-purple-500 hover:text-red-400' : isGlass ? 'text-white/30 hover:text-red-400' : 'text-neutral-500 hover:text-red-400'}`}
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
               className={textareaStylesClass}
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
             <div className={actionsBorderClass}>
               <div className="flex items-center gap-3">
                 <div className="relative">
                   <button 
                     onClick={() => setShowModeSelect(!showModeSelect)}
                     className={actionButtonClass(showModeSelect)}
                     title="Выбор ИИ Модели"> <Settings2 size={11} className={showModeSelect ? "text-purple-400" : "text-[#555]"} /> <span className="sm:inline hidden">{mode === "mini" ? "YorN mini" : mode === "base" ? "YorN base" : mode === "max" ? "Yorn MAX" : mode === "image" ? "YorN image" : "auto"}</span><span className="sm:hidden inline">{mode === "mini" ? "mini" : mode === "base" ? "base" : mode === "max" ? "max" : mode === "image" ? "image" : "auto"}</span> </button>
                   
                   {showModeSelect && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowModeSelect(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={dropdownPortalClass}
                        >
                          <button 
                            onClick={() => { onModeChange('auto'); setShowModeSelect(false); }}
                            className={dropdownItemClass(mode === 'auto')}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>auto</span>
                              {mode === 'auto' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Оптимальный автовыбор</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('mini'); setShowModeSelect(false); }}
                            className={dropdownItemClass(mode === 'mini')}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>YorN mini</span>
                              {mode === 'mini' ? <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Легкая и быстрая (8B)</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('base'); setShowModeSelect(false); }}
                            className={dropdownItemClass(mode === 'base')}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>YorN base</span>
                              {mode === 'base' ? <div className="w-1.5 h-1.5 rounded-full bg-purple-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Универсальная (32B Coder)</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('max'); setShowModeSelect(false); }}
                            className={dropdownItemClass(mode === 'max')}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>Yorn MAX</span>
                              {mode === 'max' ? <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Максимальный разум (72B)</span>
                          </button>

                          <button 
                            onClick={() => { onModeChange('image'); setShowModeSelect(false); }}
                            className={dropdownItemClass(mode === 'image')}
                          >
                            <div className="flex items-center justify-between w-full text-xs font-semibold">
                              <span>YorN image</span>
                              {mode === 'image' ? <div className="w-1.5 h-1.5 rounded-full bg-pink-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent" />}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono">Генерация фото ( BETA )</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </div>
                 
                  {/* Attachment Clip Button */}
                 <button 
                   onClick={triggerFileSelect}
                   title="Загрузить файлы (текст/код до 2MB)"
                   className={accessoryButtonClass}
                 >
                   <Paperclip size={16} />
                 </button>

                 <button 
                   onClick={toggleRecording}
                   title={isRecording ? "Остановить запись" : "Голосовой ввод"}
                   className={micRecordingClass}
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
                   className={sendButtonClass}
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
