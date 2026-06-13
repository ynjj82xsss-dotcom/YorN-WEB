import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Plus, Trash2, Command, FileText, Check, AlertCircle, HelpCircle, Loader2, Cloud, Globe, Lock, Languages, Bot, Cpu, Compass, Code, SlidersHorizontal, Terminal, MessageSquare, Lightbulb, Search, Coins, GitBranch, Link } from 'lucide-react';
import { Skill, IntegrationConfig } from '../types';

const getSkillIcon = (trigger: string, className = "w-4 h-4 text-neutral-400") => {
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

const getIntegrationIcon = (id: string, className = "w-5 h-5 text-neutral-400") => {
  if (id === 'search') return <Search className={className} />;
  if (id === 'weather') return <Cloud className={className} />;
  if (id === 'crypto') return <Coins className={className} />;
  if (id === 'github') return <GitBranch className={className} />;
  return <Link className={className} />;
};

interface SkillsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  customSkills: Skill[];
  systemSkills: Skill[];
  onSaveSkill: (skill: Skill) => Promise<void>;
  onDeleteSkill: (skillId: string) => Promise<void>;
  integrations?: IntegrationConfig[];
  onUpdateIntegrations?: (integrations: IntegrationConfig[]) => void;
}

export default function SkillsHubModal({
  isOpen,
  onClose,
  userId,
  customSkills,
  systemSkills,
  onSaveSkill,
  onDeleteSkill,
  integrations = [],
  onUpdateIntegrations
}: SkillsHubModalProps) {
  const [activeTab, setActiveTab] = useState<'hub' | 'create' | 'integrations'>('hub');
  
  // Custom skill form state
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  // Auto-training ideas
  const [trainingIdea, setTrainingIdea] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cleanTrigger = (val: string) => {
    return val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
  };

  const handleAutoTrain = async () => {
    if (!trainingIdea.trim()) {
      setTrainingError('Пожалуйста, введите вашу идею для обучения.');
      return;
    }
    
    setIsTraining(true);
    setTrainingError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/train-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: trainingIdea })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка во время генерации навыка.');
      }
      
      setName(data.name || '');
      setTrigger(cleanTrigger(data.trigger || ''));
      setDescription(data.description || '');
      setInstructions(data.instructions || '');
      setSuccessMessage('ИИ успешно сформировал параметры и инструкции для вашего нового навыка!');
      
      // Auto pulse success haptic
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 30, 20]);
      }
    } catch (err: any) {
      console.error(err);
      setTrainingError(err.message || 'Техническая заминка. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainingError(null);
    setSuccessMessage(null);

    const validatedTrigger = cleanTrigger(trigger);
    
    if (!name.trim()) return setTrainingError('Укажите имя навыка');
    if (!validatedTrigger || validatedTrigger.length < 3) return setTrainingError('Триггер команды должен содержать минимум 3 латинских символа');
    if (!description.trim()) return setTrainingError('Опишите кратко функционал навыка');
    if (!instructions.trim()) return setTrainingError('Введите подробные инструкции');

    // Prevent trigger collision with systems or existing customs
    const allExistingTriggers = [
      ...systemSkills.map(s => s.trigger),
      ...customSkills.map(s => s.trigger)
    ];

    const isExisting = customSkills.some(s => s.trigger === validatedTrigger);
    if (!isExisting && allExistingTriggers.includes(validatedTrigger)) {
      return setTrainingError(`Команда /${validatedTrigger} уже занята другим навыком.`);
    }

    const newSkill: Skill = {
      id: isExisting ? customSkills.find(s => s.trigger === validatedTrigger)!.id : 'sk_' + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      trigger: validatedTrigger,
      description: description.trim(),
      instructions: instructions.trim(),
      createdAt: new Date().toISOString(),
      isPublic
    };

    try {
      await onSaveSkill(newSkill);
      setSuccessMessage(`Навык "${newSkill.name}" успешно сохранен и готов к работе через /${newSkill.trigger}!`);
      
      // Reset form
      setName('');
      setTrigger('');
      setDescription('');
      setInstructions('');
      setTrainingIdea('');
      setIsPublic(true);
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
      
      // Toggle back to list after short delay
      setTimeout(() => {
        setActiveTab('hub');
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setTrainingError('Не удалось записать навык в хранилище.');
    }
  };

  const handleDelete = async (id: string, skillName: string) => {
    if (confirm(`Вы уверены, что хотите полностью удалить навык "${skillName}"?`)) {
      await onDeleteSkill(id);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Dark Backdrop with blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-gradient-to-b from-neutral-900/75 to-neutral-950/85 border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden z-[301] backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <Command size={14} className="text-neutral-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white tracking-wide">YorN Skills Hub</h2>
                <p className="text-[10px] font-mono text-neutral-500">Инструменты контекстного программирования</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg border border-white/[0.06] text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="px-5 pt-3 border-b border-white/[0.06] flex gap-4 bg-white/[0.005]">
            <button 
              onClick={() => { setActiveTab('hub'); setTrainingError(null); setSuccessMessage(null); }}
              className={`pb-3 text-xs font-semibold relative transition-colors ${
                activeTab === 'hub' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span>Все навыки ({systemSkills.length + customSkills.length})</span>
              {activeTab === 'hub' && (
                <motion.div layoutId="skillsActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200" />
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('create'); setTrainingError(null); setSuccessMessage(null); }}
              className={`pb-3 text-xs font-semibold relative transition-colors flex items-center gap-1.5 ${
                activeTab === 'create' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Plus size={12} className={activeTab === 'create' ? 'text-white' : ''} />
              <span>Создать и обучить</span>
              {activeTab === 'create' && (
                <motion.div layoutId="skillsActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200" />
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('integrations'); setTrainingError(null); setSuccessMessage(null); }}
              className={`pb-3 text-xs font-semibold relative transition-colors flex items-center gap-1.5 ${
                activeTab === 'integrations' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Globe size={11} className={activeTab === 'integrations' ? 'text-white' : ''} />
              <span>Интеграции API</span>
              {activeTab === 'integrations' && (
                <motion.div layoutId="skillsActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200" />
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide text-neutral-300">
            
            {/* Feedback Banners */}
            {trainingError && (
              <div className="p-3.5 bg-red-950/20 border border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{trainingError}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
                <Check size={15} className="mt-0.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {activeTab === 'hub' ? (
              <div className="space-y-5">
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  Скиллы позволяют мгновенно настроить YorN AI под конкретную задачу с помощью триггеров. 
                  Введите косую черту <code className="px-1.5 py-0.5 bg-white/[0.04] text-neutral-200 font-mono rounded border border-white/[0.06]">/</code> во время общения для вызова подсказок.
                </p>

                {/* My Skills section */}
                {(() => {
                  const mySkills = customSkills.filter(s => s.userId === userId || userId === 'guest-local-user');
                  return mySkills.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 flex items-center gap-1.5">
                        <Lock size={10} className="text-neutral-500" />
                        <span>Мои личные навыки ({mySkills.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mySkills.map(skill => (
                          <div key={skill.id} className="p-3.5 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all rounded-xl flex flex-col justify-between group relative overflow-hidden">
                            {skill.isPublic && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded font-mono text-[8px] text-neutral-400 select-none">
                                <Globe size={8} /> CLOUD
                              </div>
                            )}
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-neutral-950/65 flex items-center justify-center shrink-0 border border-white/[0.06] shadow-inner p-1.5">
                                    {getSkillIcon(skill.trigger)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-semibold text-white block truncate" title={skill.name}>{skill.name}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                  <span className="px-2 py-0.5 text-[9px] bg-white/[0.04] text-neutral-300 border border-white/[0.08] font-mono rounded-md">
                                    /{skill.trigger}
                                  </span>
                                  <button 
                                    onClick={() => handleDelete(skill.id, skill.name)}
                                    className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title="Удалить навык"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{skill.description}</p>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                              <span className="text-[9px] font-mono text-neutral-500">Создан: {new Date(skill.createdAt).toLocaleDateString('ru-RU')}</span>
                              <div className="group/inst relative">
                                <span className="text-[9px] font-mono text-neutral-400 hover:text-neutral-200 cursor-help flex items-center gap-0.5 transition-colors">
                                  <FileText size={9} /> Инструкции ИИ
                                </span>
                                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#0d0d11] border border-white/[0.08] text-[10px] text-neutral-400 rounded-lg opacity-0 invisible group-hover/inst:opacity-100 group-hover/inst:visible transition-all duration-200 z-50 shadow-2xl leading-relaxed max-h-40 overflow-y-auto backdrop-blur-xl">
                                  <span className="font-semibold text-white block mb-1">Промпт навыки:</span>
                                  {skill.instructions}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Cloud Hub section */}
                {(() => {
                  const cloudSkills = customSkills.filter(s => s.userId !== userId && userId !== 'guest-local-user' && s.isPublic);
                  return cloudSkills.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 flex items-center gap-1.5 select-none">
                        <Cloud size={11} className="text-neutral-500" />
                        <span>Cloud Hub • Навыки сообщества ({cloudSkills.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cloudSkills.map(skill => (
                          <div key={skill.id} className="p-3.5 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all rounded-xl flex flex-col justify-between relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-neutral-950/65 flex items-center justify-center shrink-0 border border-white/[0.06] shadow-inner p-1.5">
                                    {getSkillIcon(skill.trigger)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-semibold text-white block truncate" title={skill.name}>{skill.name}</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 text-[9px] bg-white/[0.04] text-neutral-300 border border-white/[0.08] font-mono rounded-md shadow-sm shrink-0 ml-2">
                                  /{skill.trigger}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{skill.description}</p>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                              <span className="text-[9px] font-mono text-neutral-400 max-w-[130px] truncate" title={skill.authorEmail}>
                                Автор: {skill.authorEmail ? (skill.authorEmail.includes('@') ? skill.authorEmail.split('@')[0] : skill.authorEmail) : 'Разработчик'}
                              </span>
                              <div className="group/inst relative">
                                <span className="text-[9px] font-mono text-neutral-400 hover:text-neutral-200 cursor-help flex items-center gap-0.5 transition-colors">
                                  <FileText size={9} /> Промпт
                                </span>
                                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#0d0d11] border border-white/[0.08] text-[10px] text-neutral-400 rounded-lg opacity-0 invisible group-hover/inst:opacity-100 group-hover/inst:visible transition-all duration-200 z-50 shadow-2xl leading-relaxed max-h-40 overflow-y-auto backdrop-blur-xl">
                                  <span className="font-semibold text-white block mb-1">Системные инструкции ИИ:</span>
                                  {skill.instructions}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Predefined Systems Skills */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-[10px] font-mono tracking-widest uppercase text-neutral-500">Встроенные системные навыки</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {systemSkills.map(skill => (
                      <div key={skill.id} className="p-3.5 bg-white/[0.015] border border-white/[0.05] hover:border-white/[0.1] transition-all rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-[#050505]/65 flex items-center justify-center shrink-0 border border-white/[0.04] shadow-inner p-1.5">
                                {getSkillIcon(skill.trigger)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-semibold text-neutral-300 block truncate" title={skill.name}>{skill.name}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] bg-white/[0.03] text-neutral-400 border border-white/[0.06] font-mono rounded-md shrink-0 ml-2">
                              /{skill.trigger}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{skill.description}</p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex justify-end">
                          <div className="group/inst relative">
                            <span className="text-[9px] font-mono text-neutral-500 hover:text-neutral-300 cursor-help flex items-center gap-0.5 transition-colors">
                              <FileText size={9} /> Системный промпт
                            </span>
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#0d0d11] border border-white/[0.08] text-[10px] text-neutral-400 rounded-lg opacity-0 invisible group-hover/inst:opacity-100 group-hover/inst:visible transition-all duration-200 z-50 shadow-2xl leading-relaxed max-h-40 overflow-y-auto backdrop-blur-xl">
                              <span className="font-semibold text-neutral-300 block mb-1">Инструкция ИИ:</span>
                              {skill.instructions}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Auto-training Sub-section */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl relative overflow-hidden space-y-3">
                  <div className="absolute right-3 top-3 opacity-5">
                    <Sparkles className="text-neutral-400" size={50} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <Sparkles size={11} className="text-neutral-400" />
                    </div>
                    <span className="text-xs font-bold text-white">✨ Умное автообучение (AI Training)</span>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Просто опишите задачу простыми словами. Нейросеть сама проанализирует концепт, придумает профессиональное наименование, запоминающийся триггер и составит сверхэффективный системный промпт.
                  </p>

                  <div className="flex flex-col gap-2">
                    <textarea 
                      value={trainingIdea}
                      onChange={(e) => setTrainingIdea(e.target.value)}
                      placeholder="Пример: Обучи его писать вежливые деловые письма клиентам с глубоким анализом проблемы и предложением уступок..."
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white/[0.18] text-xs p-3 rounded-xl outline-none placeholder-neutral-600 text-neutral-300 resize-none min-h-[50px] transition-all focus:bg-white/[0.04]"
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={handleAutoTrain}
                        disabled={isTraining || !trainingIdea.trim()}
                        className="px-3.5 py-1.5 rounded-lg text-[10px] font-mono font-medium tracking-wide bg-white/[0.08] hover:bg-white/[0.12] disabled:bg-white/[0.02] disabled:text-neutral-600 text-neutral-200 border border-white/[0.08] flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isTraining ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Анализ ИИ...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={11} />
                            <span>Автонастройка параметров</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Custom Form */}
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="h-[1px] bg-white/[0.06]" />
                  <h3 className="text-[10px] font-mono tracking-widest uppercase text-neutral-500">Параметры и правила</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-mono text-neutral-500 uppercase">Название навыка</label>
                      <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например: Сленг-Транслятор"
                        className="bg-white/[0.02] border border-white/[0.08] focus:border-white/[0.18] p-3 text-xs rounded-xl outline-none text-neutral-200 transition-all placeholder-neutral-600 focus:bg-white/[0.04]"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono text-neutral-500 uppercase">Команда / триггер</label>
                        <span className="text-[9px] text-neutral-600 font-mono">Только латиница и _</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">/</span>
                        <input 
                          type="text"
                          value={trigger}
                          onChange={(e) => setTrigger(cleanTrigger(e.target.value))}
                          placeholder="slang"
                          className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white/[0.18] pl-6 p-3 text-xs rounded-xl outline-none font-mono text-neutral-200 transition-all placeholder-neutral-600 focus:bg-white/[0.04]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-mono text-neutral-500 uppercase">Короткое описание</label>
                    <input 
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Магически переводит исходное сообщение на современный сленг..."
                      className="bg-white/[0.02] border border-white/[0.08] focus:border-white/[0.18] p-3 text-xs rounded-xl outline-none text-neutral-200 transition-all placeholder-neutral-600 focus:bg-white/[0.04]"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-neutral-500 uppercase">Системные инструкции ИИ</label>
                      <div className="group/help relative cursor-default">
                        <HelpCircle size={12} className="text-neutral-600 hover:text-neutral-400" />
                        <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-[#0d0d11] border border-white/[0.08] text-[9px] text-neutral-400 rounded-md opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all duration-150 shadow-xl leading-relaxed backdrop-blur-md">
                          Укажите нейросети подробную роль: правила, ограничения, структуру ее реплик, тон и лексикон.
                        </div>
                      </div>
                    </div>
                    <textarea 
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Ты — продвинутый ИИ-переводчик на сленг..."
                      className="bg-white/[0.02] border border-white/[0.08] focus:border-white/[0.18] p-3 text-xs rounded-xl outline-none text-neutral-200 font-mono resize-none h-28 leading-relaxed focus:bg-white/[0.04] transition-all"
                      required
                    />
                  </div>

                  {userId !== 'guest-local-user' && (
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <input 
                        type="checkbox"
                        id="isPublic"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="w-4 h-4 rounded border-white/[0.1] text-white bg-neutral-900 focus:ring-neutral-500 cursor-pointer"
                      />
                      <label htmlFor="isPublic" className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 cursor-pointer select-none flex items-center gap-1.5">
                        <Globe size={13} className="text-neutral-400" />
                        <span>Опубликовать в Cloud Hub (навык увидят все участники)</span>
                      </label>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/[0.06] flex justify-end gap-3.5">
                    <button 
                      type="button" 
                      onClick={() => { setActiveTab('hub'); setTrainingError(null); setSuccessMessage(null); }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-200 hover:bg-[#121212]/50 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-neutral-200 hover:bg-white text-black font-semibold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Сохранить навык</span>
                    </button>
                  </div>

                </form>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-4">
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  Поддерживайте актуальность ваших задач с помощью живых интеграций API. Вы можете включить автоматическую обработку выбранных сервисов по умолчанию в фоновом режиме или вызывать их прямо через slash-команды вида <code className="px-1.5 py-0.5 bg-white/[0.04] text-neutral-200 font-mono rounded border border-white/[0.06]">/weather город</code>, <code className="px-1.5 py-0.5 bg-white/[0.04] text-neutral-200 font-mono rounded border border-white/[0.06]">/crypto coin</code> и др. в любом запросе!
                </p>

                <div className="space-y-3">
                  {integrations.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-4 bg-white/[0.02] border rounded-xl transition-all duration-200 ${
                        item.isEnabled 
                          ? 'border-white/10 bg-white/[0.03]' 
                          : 'border-white/[0.04] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center border shrink-0 ${
                            item.isEnabled 
                              ? 'bg-white/[0.04] border-white/15' 
                              : 'bg-neutral-950/40 border-white/[0.05]'
                          }`}>
                            {getIntegrationIcon(item.id, item.isEnabled ? "w-4 h-4 text-white" : "w-4 h-4 text-neutral-500")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white tracking-wide">{item.name}</span>
                              <span className="px-1.5 py-0.5 font-mono text-[9px] bg-white/[0.04] text-neutral-400 border border-white/[0.06] rounded-md">
                                /{item.id}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                        </div>

                        {/* Custom Toggle Switch */}
                        <div className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateIntegrations) {
                                const copy = integrations.map(i => i.id === item.id ? { ...i, isEnabled: !i.isEnabled } : i);
                                onUpdateIntegrations(copy);
                              }
                            }}
                            className={`relative w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus:outline-none ${
                              item.isEnabled ? 'bg-neutral-200' : 'bg-white/[0.08]'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              item.isEnabled ? 'translate-x-4 bg-black' : 'translate-x-0 bg-neutral-500'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Config Input parameters structure */}
                      {item.isEnabled && (
                        <div className="mt-3.5 pt-3 border-t border-white/[0.05] flex flex-col gap-1.5">
                          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">{item.label}</span>
                          <input
                            type="text"
                            value={item.value}
                            placeholder={item.placeholder}
                            onChange={(e) => {
                              if (onUpdateIntegrations) {
                                const copy = integrations.map(i => i.id === item.id ? { ...i, value: e.target.value } : i);
                                onUpdateIntegrations(copy);
                              }
                            }}
                            className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-white/[0.18] px-3 py-2 text-xs rounded-lg outline-none font-sans text-neutral-200 transition-all placeholder-neutral-600 focus:bg-white/[0.04]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer banner */}
          <div className="p-4 bg-white/[0.01] border-t border-white/[0.05] text-center">
            <span className="text-[9px] font-mono text-neutral-600">© YorN Neural Workspace Skill Suite · 2026</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
