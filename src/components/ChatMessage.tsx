import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Message } from '../types';
import { Copy, Check, Volume2, VolumeX, RotateCw, FileText } from 'lucide-react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const normLang = (language || 'code').toLowerCase();

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-[#222] bg-[#050505] font-mono text-[11px] md:text-sm select-text w-full">
      {/* Code block header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0D0D0D] border-b border-[#1A1A1A] text-[#666] select-none">
        <span className="text-[10px] uppercase font-semibold tracking-wider font-sans text-neutral-400">{normLang}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-[#CCC] transition-colors rounded p-1 hover:bg-[#151515] cursor-pointer"
          title="Скопировать"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-sans">Скопировано</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[10px] font-sans">Копировать</span>
            </>
          )}
        </button>
      </div>
      {/* Code block body */}
      <div className="text-[#CCC] leading-relaxed font-mono scrollbar-thin">
        <SyntaxHighlighter
          language={normLang}
          style={vscDarkPlus}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: 'transparent',
            padding: '1.25rem',
            fontSize: '12px',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: {
              background: 'transparent',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const renderers = {
  p({ children }: any) {
    return <p className="text-sm leading-relaxed text-[#A0A0A0] mb-4 last:mb-0 break-words">{children}</p>;
  },
  strong({ children }: any) {
    return <strong className="font-semibold text-[#E0E0E0]">{children}</strong>;
  },
  em({ children }: any) {
    return <em className="italic text-gray-400">{children}</em>;
  },
  h1({ children }: any) {
    return <h1 className="text-base font-semibold text-[#E0E0E0] mt-5 mb-2 first:mt-0">{children}</h1>;
  },
  h2({ children }: any) {
    return <h2 className="text-sm font-semibold text-[#E0E0E0] mt-4 mb-2 first:mt-0">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-xs font-semibold text-[#E0E0E0] mt-3 mb-2 first:mt-0">{children}</h3>;
  },
  ul({ children }: any) {
    return <ul className="list-disc list-inside mb-4 pl-2 space-y-1 text-[#A0A0A0]">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal list-inside mb-4 pl-2 space-y-1 text-[#A0A0A0]">{children}</ol>;
  },
  li({ children }: any) {
    return <li className="text-sm text-[#A0A0A0] leading-relaxed">{children}</li>;
  },
  blockquote({ children }: any) {
    return <blockquote className="border-l-2 border-[#333] pl-4 italic my-3 text-[#777]">{children}</blockquote>;
  },
  a({ href, children }: any) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white underline">{children}</a>;
  },
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !className;
    const codeString = String(children).replace(/\n$/, '');
    
    if (!isInline && match) {
      return <CodeBlock language={match[1]} value={codeString} />;
    } else if (!isInline) {
      return <CodeBlock language="code" value={codeString} />;
    }
    
    return (
      <code className="bg-[#181818] border border-[#222] px-1.5 py-0.5 rounded text-xs text-neutral-300 font-mono" {...props}>
        {children}
      </code>
    );
  }
};

interface ChatMessageProps {
  message: Message;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  showTts?: boolean;
  showRegenerate?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isLastAssistant = false, 
  onRegenerate,
  showTts = true,
  showRegenerate = true
}) => {
  const isUser = message.role === 'user';
  
  const [displayedContent, setDisplayedContent] = useState(message.isAnimated ? '' : message.content);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  useEffect(() => {
    if (message.isAnimated) {
      let index = 0;
      const animateScramble = localStorage.getItem('yorn_loading_animation') === 'scramble';
      const scrambleChars = '0123456789%@#$&*?+-/\\АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЫЭЮЯабвгдежзийклмнопрстуфхцчшщыэюя';
      
      const interval = setInterval(() => {
        if (animateScramble) {
          if (index < message.content.length) {
            const stable = message.content.substring(0, index);
            const scrambleLength = Math.min(4, message.content.length - index);
            let scrambledSuff = '';
            for (let i = 0; i < scrambleLength; i++) {
              const originalChar = message.content[index + i];
              if (originalChar === ' ' || originalChar === '\n' || originalChar === '\t') {
                scrambledSuff += originalChar;
              } else {
                scrambledSuff += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
              }
            }
            setDisplayedContent(stable + scrambledSuff);
          } else {
            setDisplayedContent(message.content);
            clearInterval(interval);
          }
        } else {
          setDisplayedContent(message.content.substring(0, index));
          if (index >= message.content.length) {
            clearInterval(interval);
          }
        }
        index++;
      }, 15);
      
      return () => clearInterval(interval);
    } else {
      setDisplayedContent(message.content);
    }
  }, [message.content, message.isAnimated]);

  // Stop reading if component unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        window.speechSynthesis.cancel(); // Отменяем текущее воспроизведение
        
        // Очищаем текст от Markdown разметки и блоков кода
        const cleanText = message.content
          .replace(/```[\s\S]*?```/g, '') // удаляем блоки кода
          .replace(/`([^`]+)`/g, '$1') // удаляем встроенный код
          .replace(/[*_#\-]/g, ''); // удаляем простую разметку

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ru-RU';
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert("Ваш браузер не поддерживает озвучивание текста.");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8`}
    >
      <div 
        className={`max-w-[85%] md:max-w-[80%] flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
      >
        <div 
          className={
            isUser 
              ? 'bg-[#121212] border border-[#222] px-6 py-4 rounded-[2rem] rounded-tr-none shadow-sm' 
              : 'pt-1 w-full'
          }
        >
          {isUser ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-[#E0E0E0] leading-relaxed break-words whitespace-pre-wrap">
                {displayedContent}
              </p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-[#1C1C1C]">
                  {message.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-[#080808] border border-[#222] text-[#888] py-0.5 px-2 rounded-md text-[10px] font-mono select-none">
                      <FileText size={11} className="text-purple-400" />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <span className="text-[#444] text-[9px]">{att.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-[#888] markdown-body w-full">
              <Markdown components={renderers}>{displayedContent}</Markdown>
              {message.isAnimated && displayedContent.length < message.content.length && (
                <span className="inline-block w-1.5 h-3.5 ml-1 align-baseline bg-[#555] animate-pulse rounded-sm" />
              )}
            </div>
          )}

          {!isUser && (
            <div className="flex items-center gap-4 mt-3 pt-2 select-none">
              {/* Кнопка TTS */}
              {showTts && (
                <button
                  onClick={handleSpeech}
                  className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer p-1 rounded hover:bg-[#121212] ${
                    isSpeaking ? 'text-purple-400' : 'text-[#555] hover:text-[#AAA]'
                  }`}
                  title={isSpeaking ? "Остановить озвучку" : "Озвучить ответ"}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX size={13} className="animate-pulse" />
                      <span className="text-[10px] tracking-wide">Стоп</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} />
                      <span className="text-[10px] tracking-wide font-light">Слушать</span>
                    </>
                  )}
                </button>
              )}

              {/* Кнопка копирования */}
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#AAA] transition-colors cursor-pointer p-1 rounded hover:bg-[#121212]"
                title="Скопировать ответ"
              >
                {messageCopied ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-500 tracking-wide font-light">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span className="text-[10px] tracking-wide font-light">Копировать</span>
                  </>
                )}
              </button>

              {/* Кнопка регенерации */}
              {showRegenerate && isLastAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#AAA] transition-colors cursor-pointer p-1 rounded hover:bg-[#121212]"
                  title="Сгенерировать заново"
                >
                  <RotateCw size={13} className="text-[#555] active:rotate-180 transition-transform duration-300" />
                  <span className="text-[10px] tracking-wide font-light">Заново</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ChatMessage;

export function ScramblingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(text);
  
  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const scrambled = text.split('').map((char, idx) => {
        if (char === ' ' || char === '\n' || char === '\r') return char;
        if (idx > frame / 1.5) {
          const scrambleSymbols = '0123456789%@#$&*?+-/\\АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩ';
          return scrambleSymbols[Math.floor(Math.random() * scrambleSymbols.length)];
        }
        return char;
      }).join('');
      setDisplayed(scrambled);
      if (frame >= text.length * 2.5) {
        frame = 0;
      }
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  return <span className="font-mono">{displayed}</span>;
}

export function TypingIndicator({ text, animationStyle }: { text?: string; animationStyle?: string }) {
  const isScramble = animationStyle === 'scramble';
  const showDots = !animationStyle || animationStyle === 'default';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 items-center mb-8"
    >
      <span className="text-[11px] italic text-neutral-400 tracking-wider font-light bg-[#111] px-2.5 py-1 rounded-full border border-[#222]/40 shadow-sm">
        {isScramble ? <ScramblingText text={text || 'YorN ИИ расшифровывает...'} /> : (text || 'типирует')}
      </span>
      {showDots && (
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
              className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-purple-500' : 'bg-[#555]'}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
