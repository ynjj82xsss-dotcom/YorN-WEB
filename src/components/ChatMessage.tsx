import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Message } from '../types';
import { Copy, Check, Volume2, VolumeX, RotateCw, FileText, Heart, Phone, Shield, Sparkles, Wind, CheckCircle, ExternalLink, RefreshCw, Compass, AlertTriangle, ShieldAlert, Activity, Flame, HelpCircle } from 'lucide-react';
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

interface SuicideSupportCardProps {
  content: string;
}

export function SuicideSupportCard({ content }: SuicideSupportCardProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'breathing' | 'grounding' | 'comfort'>('contacts');
  
  // Breathing state
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingStep, setBreathingStep] = useState<'вдох' | 'задержка' | 'выдох' | 'задержка-выдох'>('вдох');
  const [breathingSeconds, setBreathingSeconds] = useState(4);

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);

  // Support messages rotation
  const comfortQuotes = [
    "То, что вы чувствуете сейчас — временно, даже если кажется абсолютным. Позвольте себе просто пережить этот день. Ваша жизнь заслуживает продолжения.",
    "Вы не обязаны справляться со всем в одиночку. Просить о помощи — это проявление огромной силы и смелости, а не слабости.",
    "Ваша ценность не измеряется вашими трудностями, ошибками или нынешним состоянием. Вы важны просто потому, что вы есть на этой Земле.",
    "Завтра может принести новые решения. Пожалуйста, побудьте сегодня с нами. Дайте себе шанс увидеть, как всё изменится.",
    "Каждый человек проходит через тёмные периоды, но ночь всегда уступает место рассвету. Позвольте другим побыть вашим проводником в этой темноте."
  ];
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Breathing loop effect
  useEffect(() => {
    let interval: any = null;
    if (breathingActive) {
      interval = setInterval(() => {
        setBreathingSeconds((prev) => {
          if (prev <= 1) {
            setBreathingStep((current) => {
              if (current === 'вдох') return 'задержка';
              if (current === 'задержка') return 'выдох';
              if (current === 'выдох') return 'задержка-выдох';
              return 'вдох';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathingSeconds(4);
      setBreathingStep('вдох');
    }
    return () => clearInterval(interval);
  }, [breathingActive]);

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % comfortQuotes.length);
  };

  const groundingSteps = [
    { title: "👀 5 вещей, которые вы видите вокруг себя", desc: "Посмотрите вокруг и найдите взглядом 5 предметов. Обратите внимание на их форму, цвет и детали. Например: лампа, чашка, трещина на стене..." },
    { title: "🖐️ 4 вещи, которые вы можете потрогать", desc: "Ощутите физический контакт с 4 объектами. Например: мягкая ткань одежды, твердая поверхность стола, прохлада воздуха, текстура дерева..." },
    { title: "👂 3 вещи, которые вы слышите", desc: "Прислушайтесь к звукам. Найдите 3 источника шума. Например: гул холодильника, шум ветра за окном, ваше собственное дыхание..." },
    { title: "👃 2 вещи, которые вы можете почувствовать носом", desc: "Попробуйте уловить 2 запаха. Например: запах чая, стирального порошка, книг или просто свежести..." },
    { title: "👅 1 вещь, которую вы можете попробовать на вкус", desc: "Ощутите вкус во рту или вспомните приятный вкус. Например: капля чистой воды, кусочек мятной конфеты или просто глоток чая." }
  ];

  return (
    <div className="w-full bg-gradient-to-b from-[#141013] to-[#0D090E] border-2 border-rose-900/30 rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 shadow-xl shadow-rose-950/5 relative my-4 overflow-hidden select-text text-[#E5E5E5] font-sans">
      {/* Decorative Warm Accent Light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-12 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-5 border-b border-rose-950/40 pb-4 relative z-10">
        <div className="p-2 sm:p-3 bg-gradient-to-tr from-rose-500/20 to-amber-500/15 rounded-xl sm:rounded-2xl border border-rose-500/30 shrink-0">
          <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-450 animate-pulse text-rose-450" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Пожалуйста, останьтесь. Ваша жизнь невероятно ценна.
          </h2>
          <p className="text-[11px] sm:text-xs text-rose-300/80 leading-relaxed mt-1">
            Мы чувствуем, через какую тяжелую боль и темноту вы сейчас проходите. Но в этом мире вы не одни. Пожалуйста, позвольте нам позаботиться о вашей безопасности и сделать этот шаг вместе с вами.
          </p>
        </div>
      </div>

      {/* Quick Info & Action Selector Tabs */}
      <div className="flex flex-nowrap md:flex-wrap gap-1.5 mb-5 bg-[#080508]/80 p-1.5 rounded-xl border border-rose-950/20 relative z-10 overflow-x-auto scrollbar-hide scroll-smooth">
        <button
          onClick={() => { setActiveTab('contacts'); setBreathingActive(false); }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'contacts' 
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Контакты помощи</span>
        </button>
        <button
          onClick={() => { setActiveTab('breathing'); }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'breathing' 
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>Дыхательный гид</span>
        </button>
        <button
          onClick={() => { setActiveTab('grounding'); setBreathingActive(false); }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'grounding' 
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Техника заземления</span>
        </button>
        <button
          onClick={() => { setActiveTab('comfort'); setBreathingActive(false); }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'comfort' 
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Слова поддержки</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="relative z-10 min-h-[220px]">
        {/* PANEL 1: Urgent Hotline Contacts */}
        {activeTab === 'contacts' && (
          <div className="space-y-3.5 animate-fadeIn">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Эти бесплатные, полностью анонимные и круглосуточные линии психологической поддержки созданы, чтобы помочь в самые трудные минуты. Профессиональные психологи выслушают без осуждения.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {/* Phone 1 */}
              <div className="bg-black/40 border border-rose-900/20 hover:border-rose-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-rose-450">Федеральный номер</span>
                    <span className="px-1.5 py-0.5 bg-rose-950/40 text-rose-300 text-[9px] rounded-md font-mono border border-rose-900/30">РФ • Бесплатно</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1.5">Единый телефон доверия</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Для детей, подростков и их родителей. Помощь во всех регионах России.</p>
                </div>
                <a 
                  href="tel:88002000122" 
                  className="mt-1.5 py-2 px-3 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 hover:border-rose-700/50 rounded-xl text-center text-xs font-bold text-rose-200 hover:text-rose-100 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>8 (800) 2000-122</span>
                </a>
              </div>

              {/* Phone 2 */}
              <div className="bg-black/40 border border-rose-905/20 border-rose-900/20 hover:border-rose-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-amber-400">Для Москвы</span>
                    <span className="px-1.5 py-0.5 bg-amber-950/30 text-amber-300 text-[9px] rounded-md font-mono border border-amber-900/30">С мобильного</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1.5">Служба психологической помощи</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Городской канал психологического спасения и немедленного реагирования.</p>
                </div>
                <a 
                  href="tel:051" 
                  className="mt-1.5 py-2 px-3 bg-amber-950/20 hover:bg-amber-900/35 border border-amber-900/45 hover:border-amber-700/50 rounded-xl text-center text-xs font-bold text-amber-200 hover:text-amber-100 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>051 (с мобильного 8-495-051)</span>
                </a>
              </div>

              {/* Phone 3 */}
              <div className="bg-black/40 border border-rose-905/20 border-rose-900/20 hover:border-rose-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-rose-450">МЧС России</span>
                    <span className="px-1.5 py-0.5 bg-rose-950/40 text-rose-300 text-[9px] rounded-md font-mono border border-rose-900/30">24 часа</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1.5">Психологическая помощь МЧС</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Горячая линия спасения в кризисных психических ситуациях по всей РФ.</p>
                </div>
                <a 
                  href="tel:+74959895050" 
                  className="mt-1.5 py-2 px-3 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 hover:border-rose-700/50 rounded-xl text-center text-xs font-bold text-rose-200 hover:text-rose-100 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>+7 (495) 989-50-50</span>
                </a>
              </div>

              {/* Chat Support */}
              <div className="bg-black/40 border border-rose-905/20 border-rose-900/20 hover:border-rose-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-cyan-400">Онлайн Чат</span>
                    <span className="px-1.5 py-0.5 bg-cyan-950/30 text-cyan-300 text-[9px] rounded-md font-mono border border-cyan-900/30">Для молодежи</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1.5">Твоя территория</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Психологическая помощь онлайн в чате для подростков и молодых людей.</p>
                </div>
                <a 
                  href="https://www.tvoyaterritoriya.ru" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mt-1.5 py-2 px-3 bg-cyan-950/25 hover:bg-cyan-900/35 border border-cyan-900/45 hover:border-cyan-700/50 rounded-xl text-center text-xs font-bold text-cyan-200 hover:text-cyan-100 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Перейти на сайт чата</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: Square Breathing Interactive Exercise */}
        {activeTab === 'breathing' && (
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between pb-2.5 animate-fadeIn">
            <div className="flex-1 space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                Успокаивающее дыхание «Квадрат»
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Когда паника, страх или отчаяние зашкаливают, ваше дыхание становится частым и поверхностным, посылая сигнал тревоги в мозг. 
                Медленное дыхание по квадрату (4 секунды на каждый такт) искусственно задействует парасимпатическую нервную систему, снижая пульс и помогая вернуть контроль над мыслями.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {!breathingActive ? (
                  <button
                    onClick={() => setBreathingActive(true)}
                    className="py-2 px-4 bg-rose-850 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Wind className="w-4 h-4" /> Начать дыхательное упражнение
                  </button>
                ) : (
                  <button
                    onClick={() => setBreathingActive(false)}
                    className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    Остановить
                  </button>
                )}
              </div>
            </div>

            {/* Simulated interactive breathing dot */}
            <div className="w-[180px] h-[180px] bg-black/60 rounded-full border border-rose-900/20 p-4 flex flex-col items-center justify-center text-center relative shrink-0">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  animate={{
                    scale: !breathingActive 
                      ? 1 
                      : breathingStep === 'вдох'
                        ? [1, 2]
                        : breathingStep === 'выдох'
                          ? [2, 1]
                          : breathingStep === 'задержка'
                            ? 2
                            : 1,
                    opacity: !breathingActive ? 0.05 : [0.08, 0.25, 0.08]
                  }}
                  transition={{ 
                    duration: 4, 
                    ease: "easeInOut",
                    repeat: breathingActive ? Infinity : 0
                  }}
                  className="w-20 h-20 rounded-full bg-rose-500"
                />
              </div>

              {breathingActive ? (
                <div className="relative z-10 space-y-1">
                  <span className="text-[11px] text-rose-400 font-mono tracking-widest uppercase font-bold animate-pulse block">
                    {breathingStep === 'вдох' && '🌬️ Вдох'}
                    {breathingStep === 'задержка' && '⏸️ Пауза'}
                    {breathingStep === 'выдох' && '💨 Выдох'}
                    {breathingStep === 'задержка-выдох' && '⏸️ Пауза'}
                  </span>
                  <span className="text-3xl font-extrabold text-white block leading-none font-mono">
                    {breathingSeconds}
                  </span>
                  <span className="text-[9px] text-neutral-500 font-medium block uppercase tracking-wider">секунды</span>
                </div>
              ) : (
                <div className="relative z-10">
                  <Wind className="w-8 h-8 text-neutral-705 text-neutral-700 mx-auto mb-1" />
                  <span className="text-[10px] text-neutral-500 font-mono">Гид готов к пуску</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL 3: Grounding 5-4-3-2-1 technique */}
        {activeTab === 'grounding' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-rose-950/20 pb-2">
              <div>
                <h4 className="text-sm font-semibold text-white">Психологическое заземление «5-4-3-2-1»</h4>
                <p className="text-[10px] text-neutral-500">Техника возвращения себя в настоящий момент при приступах паники или тяжелых мыслей</p>
              </div>
              <span className="text-xs font-mono text-rose-400 font-bold">{groundingStep + 1} / 5</span>
            </div>

            <div className="bg-black/35 border border-rose-900/10 p-4 rounded-2xl flex flex-col gap-3 min-h-[110px]">
              <span className="text-xs font-bold text-rose-300 tracking-wide font-sans">
                {groundingSteps[groundingStep].title}
              </span>
              <p className="text-xs text-neutral-400 leading-relaxed font-light font-sans">
                {groundingSteps[groundingStep].desc}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                disabled={groundingStep === 0}
                onClick={() => setGroundingStep((prev) => Math.max(0, prev - 1))}
                className="py-1 px-3 rounded-lg border border-[#222] bg-[#111] hover:bg-[#1C1C1C] text-xs text-[#AAA] disabled:opacity-40 select-none cursor-pointer"
              >
                Назад
              </button>
              
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setGroundingStep(idx)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                      idx === groundingStep ? 'bg-rose-500' : 'bg-neutral-850 bg-neutral-800 hover:bg-neutral-600'
                    }`}
                  />
                ))}
              </div>

              {groundingStep < 4 ? (
                <button
                  onClick={() => setGroundingStep((prev) => Math.min(4, prev + 1))}
                  className="py-1 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/40 text-xs text-rose-200 cursor-pointer"
                >
                  Далее
                </button>
              ) : (
                <button
                  onClick={() => setGroundingStep(0)}
                  className="py-1 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/40 text-xs text-emerald-300 font-bold cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" /> Завершить заземление
                </button>
              )}
            </div>
          </div>
        )}

        {/* PANEL 4: Words of Comfort Quotes carousel */}
        {activeTab === 'comfort' && (
          <div className="space-y-4 animate-fadeIn flex flex-col justify-between min-h-[180px]">
            <p className="text-xs text-neutral-400 italic">
              Иногда нам просто нужно слово тепла, которое поможет продержаться еще немного. Пожалуйста, вчитайтесь в эти строки:
            </p>

            <div className="bg-[#0D090E]/80 border border-rose-900/20 p-5 rounded-2xl relative">
              <span className="absolute top-2 left-3 text-rose-500/20 text-5xl font-serif leading-none select-none">“</span>
              <p className="text-xs md:text-sm text-neutral-250 text-neutral-200 italic leading-relaxed text-center py-2 px-4 relative z-10 font-sans">
                {comfortQuotes[quoteIndex]}
              </p>
              <span className="absolute bottom-2 right-3 text-rose-500/20 text-5xl font-serif leading-none select-none">”</span>
            </div>

            <div className="flex justify-between items-center text-[10px] md:text-[11px] text-neutral-500 gap-4">
              <span>Мы рядом с вами. Вся команда ассистента искренне переживает за вас.</span>
              <button
                onClick={nextQuote}
                className="py-1.5 px-3 bg-rose-950/20 hover:bg-rose-900/20 rounded-lg border border-rose-900/30 text-rose-300 cursor-pointer flex items-center gap-1 font-semibold text-[10px] shrink-0"
              >
                <RefreshCw className="w-3 h-3" /> Еще слово поддержки
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-5 pt-3.5 border-t border-rose-900/10 flex flex-col sm:flex-row items-center justify-between text-[10px] text-neutral-550 text-neutral-500 font-mono gap-2 relative z-10">
        <span className="flex items-center gap-1.5 text-rose-400">
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          Все обращения на горячие линии анонимны, конфиденциальны и бесплатны.
        </span>
        <span>Код спасения жизни • RF-152_HEALTH</span>
      </div>
    </div>
  );
}

interface DrugSupportCardProps {
  content: string;
}

export function DrugSupportCard({ content }: DrugSupportCardProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'steps' | 'overdose' | 'motivation'>('contacts');
  const [motivationIndex, setMotivationIndex] = useState(0);

  const motivationQuotes = [
    "Зависимость — это болезнь, а не приговор или признак дурного характера. Каждый день трезвости — это шаг к свободе и победе над ней.",
    "Вы заслуживаете того, чтобы жить полноценной жизнью без химического контроля. Самый сложный шаг — попросить о помощи, и вы способны его сделать.",
    "Ваше прошлое не определяет ваше завтра. Любой человек может начать сначала и восстановить свое тело, разум и отношения.",
    "Ваша семья, друзья или просто неравнодушные врачи готовы протянуть руку помощи. Разрешите им помочь вам пройти этот путь.",
    "Трезвость возвращает контроль над вашим временем, вашими деньгами и вашей душой. Пожалуйста, сделайте первый выбор в пользу жизни."
  ];

  const recoverySteps = [
    { title: "🌱 1. Признание проблемы и перерыв", desc: "Сделайте глубокий вдох. Осознание того, что вещества контролируют вашу жизнь, — это уже половина победы. Постарайтесь убрать из окружения любые триггеры и контакты." },
    { title: "🏥 2. Детоксикация и медицинская помощь", desc: "Синдром отмены (ломка) может быть физически опасным. Крайне важно обратиться к врачу-наркологу, который безопасно выведет токсины из организма." },
    { title: "🧠 3. Психотерапия и реабилитационные центры", desc: "Употребление — это следствие внутренней душевной боли. Индивидуальная терапия и специализированные центры помогают найти корень проблемы и научиться жить без допинга." },
    { title: "👥 4. Группы поддержки (Анонимные Наркоманы)", desc: "Вы не одни. Миллионы выздоравливающих зависимых делятся опытом на бесплатных встречах. Найдите группу 'Анонимные Наркоманы' (АН) в вашем городе или онлайн." }
  ];

  const overdoseActions = [
    { bold: "НЕМЕДЛЕННО вызовите скорую помощь по номеру 112 или 103.", text: "Четко назовите адрес, пол и примерный возраст. Не бойтесь сообщать о симптомах - врачи обязаны спасать жизнь." },
    { bold: "Уложите человека на бок (восстановительное положение).", text: "Это предотвратит западание языка и аспирацию рвотными массами." },
    { bold: "Следите за дыханием и пульсом.", text: "Если дыхание остановилось, до приезда скорой делайте искусственное дыхание и непрямой массаж сердца." },
    { bold: "Оставайтесь рядом.", text: "Не давайте человеку засыпать, поддерживайте с ним разговор, умойте лицо прохладной водой." }
  ];

  return (
    <div className="w-full bg-gradient-to-b from-[#0E1512] to-[#0A0F0D] border-2 border-emerald-900/30 rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 shadow-xl shadow-emerald-950/5 relative my-4 overflow-hidden select-text text-[#E5E5E5] font-sans">
      {/* Decorative Warm Accent Light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-12 w-36 h-36 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-5 border-b border-emerald-950/40 pb-4 relative z-10">
        <div className="p-2 sm:p-3 bg-gradient-to-tr from-emerald-500/20 to-teal-500/15 rounded-xl sm:rounded-2xl border border-emerald-500/30 shrink-0">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Вы сильнее зависимости. Мы поможем вам вернуть свободу.
          </h2>
          <p className="text-[11px] sm:text-xs text-emerald-300/80 leading-relaxed mt-1">
            Зависимость уводит человека в тяжелый тупик, разрушая здоровье, разум и связи с близкими. Но выход и полное исцеление абсолютно реальны. Пожалуйста, сделайте выбор в пользу своего здоровья сегодня.
          </p>
        </div>
      </div>

      {/* Action Selector Tabs */}
      <div className="flex flex-nowrap md:flex-wrap gap-1.5 mb-5 bg-[#050806]/80 p-1.5 rounded-xl border border-emerald-950/20 relative z-10 overflow-x-auto scrollbar-hide scroll-smooth">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'contacts' 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Горячие линии</span>
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'steps' 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>С чего начать?</span>
        </button>
        <button
          onClick={() => setActiveTab('overdose')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'overdose' 
              ? 'bg-red-950/25 text-red-350 border border-red-900/35 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-450" />
          <span>При передозировке</span>
        </button>
        <button
          onClick={() => setActiveTab('motivation')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'motivation' 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Слова поддержки</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="relative z-10 min-h-[190px]">
        {/* PANEL 1: Hotlines */}
        {activeTab === 'contacts' && (
          <div className="space-y-3.5 animate-fadeIn">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Здесь вы можете получить бесплатную консультацию врачей-наркологов и кризисных психологов совершенно анонимно. Никто не сообщит на работу или учебу.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-black/40 border border-emerald-900/20 hover:border-emerald-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-emerald-400">Минздрав РФ</span>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1">Горячая линия по наркологии</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Бесплатная база контактов государственных наркологических диспансеров и психотерапевтов.</p>
                </div>
                <a 
                  href="tel:88002000200" 
                  className="mt-1 py-1.5 px-3 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 rounded-xl text-center text-xs font-bold text-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>8 (800) 200-0-200</span>
                </a>
              </div>

              <div className="bg-black/40 border border-emerald-900/20 hover:border-emerald-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-teal-400">Реабилитационный союз</span>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1">Национальный Антинаркотический Союз</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Линия бесплатной помощи по подбору проверенных реабилитационных центров в СНГ.</p>
                </div>
                <a 
                  href="tel:88007005050" 
                  className="mt-1 py-1.5 px-3 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 rounded-xl text-center text-xs font-bold text-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>8 (800) 700-50-50</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: recovery Steps */}
        {activeTab === 'steps' && (
          <div className="space-y-3 animate-fadeIn">
            <h4 className="text-sm font-semibold text-white">4 шага к возвращению контроля над жизнью</h4>
            <div className="space-y-2.5">
              {recoverySteps.map((s, idx) => (
                <div key={idx} className="bg-black/40 border border-emerald-900/10 p-3 rounded-xl">
                  <span className="text-xs font-bold text-emerald-300 block">{s.title}</span>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 3: Overdose Emergency */}
        {activeTab === 'overdose' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="p-3 bg-red-955/15 bg-red-950/20 border border-red-905 border-red-900/40 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-550 text-red-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-sm font-bold text-red-200">Экстренная реанимационная инструкция</h4>
                <p className="text-[11px] text-red-300/80 leading-normal mt-0.5">В случае передозировки дорога каждая секунда. Сделайте следующие действия немедленно:</p>
              </div>
            </div>

            <div className="space-y-2">
              {overdoseActions.map((act, i) => (
                <div key={i} className="flex gap-2 text-xs font-sans text-neutral-300">
                  <span className="w-5 h-5 bg-red-950/30 border border-red-900/30 text-red-400 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0">{i + 1}</span>
                  <p className="leading-relaxed"><strong className="text-red-350 text-red-350">{act.bold}</strong> {act.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 4: Words of Comfort */}
        {activeTab === 'motivation' && (
          <div className="space-y-4 animate-fadeIn flex flex-col justify-between min-h-[170px]">
            <p className="text-xs text-neutral-400 italic">
              Выздоровление возможно для всех. Сделайте глубокий вдох и вчитайтесь в эти строки:
            </p>

            <div className="bg-[#0A0D0B]/80 border border-emerald-900/20 p-5 rounded-2xl relative">
              <span className="absolute top-2 left-3 text-emerald-500/20 text-5xl font-serif leading-none select-none">“</span>
              <p className="text-xs md:text-sm text-neutral-200 italic leading-relaxed text-center py-1 px-4 relative z-10">
                {motivationQuotes[motivationIndex]}
              </p>
              <span className="absolute bottom-2 right-3 text-emerald-500/20 text-5xl font-serif leading-none select-none">”</span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-neutral-550 text-neutral-500 gap-4 mt-1">
              <span>Мы искренне верим в ваше исцеление и новую свободную жизнь.</span>
              <button
                onClick={() => setMotivationIndex((prev) => (prev + 1) % motivationQuotes.length)}
                className="py-1 px-2 px-3 bg-emerald-950/20 hover:bg-emerald-900/20 rounded-lg border border-emerald-900/30 text-emerald-300 cursor-pointer flex items-center gap-1 font-semibold text-[10px] shrink-0"
              >
                <RefreshCw className="w-3 h-3" /> Другое слово
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-5 pt-3.5 border-t border-emerald-900/10 flex flex-col sm:flex-row items-center justify-between text-[10px] text-neutral-500 font-mono gap-2 relative z-10">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Все звонки на горячие линии анонимны, конфиденциальны и бесплатны по всей территории РФ.
        </span>
        <span>Код спасения жизни • RF-152_HEALTH</span>
      </div>
    </div>
  );
}

interface TerrorismSupportCardProps {
  content: string;
}

export function TerrorismSupportCard({ content }: TerrorismSupportCardProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'coercion' | 'law' | 'reporting'>('contacts');

  const coercionSteps = [
    { title: "⏸️ 1. Возьмите паузу", desc: "Вербовщики используют психологическое давление, панику, страх или шантаж, чтобы заставить действовать быстро. Не соглашайтесь ни на что мгновенно, сошлитесь на занятость и повесьте трубку." },
    { title: "🚫 2. Заблокируйте контакты", desc: "Прекратите любую коммуникацию. Внесите аккаунты, номера телефонов и группы в черный список. Не вступайте в споры и дискуссии." },
    { title: "📢 3. Расскажите близким и властям", desc: "Вербовщики запугивают тем, что 'уже поздно' или 'вас накажут'. Это ложь. Защита гарантируется всем, кто добровольно сообщает об угрозах вербовки." },
    { title: "🛡️ 4. Будьте бдительны", desc: "Никогда не берите от незнакомцев подозрительные коробки/пакеты, не соглашайтесь за деньги оставить вещь в каком-то месте или сделать фото инфраструктуры." }
  ];

  return (
    <div className="w-full bg-gradient-to-b from-[#180F0F] to-[#110B0B] border-2 border-red-900/30 rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 shadow-xl shadow-red-950/5 relative my-4 overflow-hidden select-text text-[#E5E5E5] font-sans">
      {/* Decorative Warm Accent Light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-12 w-36 h-36 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-5 border-b border-red-950/40 pb-4 relative z-10">
        <div className="p-2 sm:p-3 bg-gradient-to-tr from-red-500/20 to-rose-500/15 rounded-xl sm:rounded-2xl border border-red-500/30 shrink-0">
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Безопасность жизни. Противодействие давлению и насилию.
          </h2>
          <p className="text-[11px] sm:text-xs text-red-300/80 leading-relaxed mt-1">
            Человеческая жизнь бесценна. Если вы столкнулись с давлением, вымогательством, шантажом, попытками вербовки в экстремистские группы или террористические сети, пожалуйста, остановитесь. Есть законы и службы, готовые вас защитить.
          </p>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="flex flex-nowrap sm:flex-wrap gap-1.5 mb-5 bg-[#0A0505]/80 p-1.5 rounded-xl border border-red-950/20 relative z-10 overflow-x-auto scrollbar-hide scroll-smooth">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'contacts' 
              ? 'bg-red-500/15 text-red-300 border border-red-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Контакты спасения</span>
        </button>
        <button
          onClick={() => setActiveTab('coercion')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'coercion' 
              ? 'bg-red-500/15 text-red-300 border border-red-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Если вас вербуют</span>
        </button>
        <button
          onClick={() => setActiveTab('law')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'law' 
              ? 'bg-red-500/15 text-red-300 border border-red-500/20 shadow-xs' 
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Освобождение от ответственности</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="relative z-10 min-h-[190px]">
        {/* PANEL 1: Hotlines */}
        {activeTab === 'contacts' && (
          <div className="space-y-3.5 animate-fadeIn">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Немедленно сообщите об угрозах вербовки, шантаже или подозрительных предметах по бесплатным антитеррористическим линиям доверия РФ.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-black/40 border border-red-900/20 hover:border-red-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-red-450">ФСБ России</span>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1">Телефон доверия ФСБ</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Для сообщений о готовящихся или совершенных терактах, вербовке и экстремизме.</p>
                </div>
                <a 
                  href="tel:88002242222" 
                  className="mt-1 py-1.5 px-3 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 rounded-xl text-center text-xs font-bold text-red-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>8 (800) 224-22-22</span>
                </a>
              </div>

              <div className="bg-black/40 border border-red-900/20 hover:border-red-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-amber-500">Экстренная служба</span>
                  <h4 className="text-sm font-bold text-[#F5F5F5] mt-1">Единый спасательный канал</h4>
                  <p className="text-[11px] text-neutral-400 leading-normal mt-0.5">Быстрое реагирование полиции, МЧС и медиков в экстренных критических ситуациях.</p>
                </div>
                <a 
                  href="tel:112" 
                  className="mt-1 py-1.5 px-3 bg-amber-950/20 hover:bg-amber-900/35 border border-amber-900/45 rounded-xl text-center text-xs font-bold text-amber-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>112 (или 102 с мобильного)</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: Coercion */}
        {activeTab === 'coercion' && (
          <div className="space-y-3 animate-fadeIn">
            <h4 className="text-sm font-semibold text-white">4 шага защиты от давления вербовщиков</h4>
            <div className="space-y-2.5">
              {coercionSteps.map((s, idx) => (
                <div key={idx} className="bg-black/40 border border-red-900/10 p-3 rounded-xl">
                  <span className="text-xs font-bold text-red-300 block">{s.title}</span>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 3: Legal release from liability */}
        {activeTab === 'law' && (
          <div className="space-y-3 animate-fadeIn">
            <h4 className="text-sm font-semibold text-white">Законодательство РФ. Ваша главная страховка:</h4>
            
            <div className="bg-black/40 border border-red-900/20 p-4 rounded-xl flex flex-col gap-3">
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                Уголовный кодекс содержит специальное примечание к статьям по обвинениям во вредительстве, диверсиях или экстремизме (например, ст. 205 УК РФ):
              </p>
              
              <div className="border-l-4 border-red-500 bg-red-950/10 p-3 rounded-r-lg">
                <p className="text-xs text-red-200 italic leading-relaxed">
                  «Лицо, участвовавшее в подготовке акта терроризма, освобождается от уголовной ответственности, если оно своевременным предупреждением органов власти или иным способом способствовало предотвращению осуществления террористического акта...»
                </p>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Это означает: даже если вы сделали глупость, согласились взять деньги или перевести что-то, но остановились и сообщили об этом ДО совершения взрыва/поджога/нападения — вас <strong>полностью освободят от уголовной ответственности</strong>. Закон защитит вас.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-5 pt-3.5 border-t border-red-900/10 flex flex-col sm:flex-row items-center justify-between text-[10px] text-neutral-550 text-neutral-500 font-mono gap-2 relative z-10">
        <span className="flex items-center gap-1.5 text-red-400">
          <Shield className="w-3.5 h-3.5 text-red-500" />
          Все сообщения о давлении или вербовке гарантируют конфиденциальность и безопасность заявителя.
        </span>
        <span>Код спасения жизни • RF-152_HEALTH</span>
      </div>
    </div>
  );
}

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

  const isSupportMsg = message.isSuicideSupport || message.isDrugSupport || message.isTerrorismSupport;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 sm:mb-8`}
    >
      <div 
        className={`${
          isSupportMsg 
            ? 'max-w-full' 
            : 'max-w-[88%] sm:max-w-[85%] md:max-w-[80%]'
        } flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
      >
        <div 
          className={
            isUser 
              ? 'bg-[#121212] border border-[#222] px-4 py-3 sm:px-6 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] rounded-tr-none shadow-sm' 
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
          ) : message.isSuicideSupport ? (
            <div className="w-full">
              <SuicideSupportCard content={message.content} />
            </div>
          ) : message.isDrugSupport ? (
            <div className="w-full">
              <DrugSupportCard content={message.content} />
            </div>
          ) : message.isTerrorismSupport ? (
            <div className="w-full">
              <TerrorismSupportCard content={message.content} />
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-[#888] markdown-body w-full">
              <Markdown components={renderers}>{displayedContent}</Markdown>
              {message.isAnimated && displayedContent.length < message.content.length && (
                <span className="inline-block w-1.5 h-3.5 ml-1 align-baseline bg-[#555] animate-pulse rounded-sm" />
              )}
            </div>
          )}

          {!isUser && !message.isSuicideSupport && !message.isDrugSupport && !message.isTerrorismSupport && (
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
