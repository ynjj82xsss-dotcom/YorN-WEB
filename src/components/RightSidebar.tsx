import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SlidersHorizontal, Info, X, User, Cpu, Smartphone, Laptop, CheckCircle2 } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  theme: string;
  setTheme: (t: string) => void;
  systemPrompt: string;
  setSystemPrompt: (p: string) => void;
  showTts: boolean;
  setShowTts: (val: boolean) => void;
  showRegenerate: boolean;
  setShowRegenerate: (val: boolean) => void;
  loadingAnimation: string;
  setLoadingAnimation: (val: string) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  topP: number;
  setTopP: (val: number) => void;
  isMobileDevice?: boolean;
}

export default function RightSidebar({ 
  isOpen, 
  onClose, 
  user, 
  theme, 
  setTheme, 
  systemPrompt, 
  setSystemPrompt,
  showTts,
  setShowTts,
  showRegenerate,
  setShowRegenerate,
  loadingAnimation,
  setLoadingAnimation,
  temperature,
  setTemperature,
  topP,
  setTopP,
  isMobileDevice = false
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
         <div 
           className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
           onClick={onClose}
         />
      )}

      {/* Sidebar container */}
      <div 
         className={`fixed top-0 right-0 h-full w-[280px] shrink-0 z-50 flex flex-col items-stretch
                    bg-[#080808]/95 border-l border-[#1A1A1A] 
                    transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] flex flex-col h-full">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-4">
               <button 
                  onClick={() => setActiveTab('profile')}
                  className={`text-sm font-medium tracking-wide transition-colors ${activeTab === 'profile' ? 'text-[#E0E0E0]' : 'text-[#555] hover:text-[#888]'}`}
               >
                 Профиль
               </button>
               <button 
                  onClick={() => setActiveTab('settings')}
                  className={`text-sm font-medium tracking-wide transition-colors ${activeTab === 'settings' ? 'text-[#E0E0E0]' : 'text-[#555] hover:text-[#888]'}`}
               >
                 Настройки
               </button>
            </div>
            <button onClick={onClose} className="text-[#888] hover:text-[#CCC]">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-4 h-full scrollbar-thin">
            {activeTab === 'profile' ? (
              <>
                {/* Profile Card */}
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 rounded-2xl flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#151515] border border-[#222] overflow-hidden mb-3 flex flex-shrink-0 items-center justify-center">
                    {user?.photoURL ? (
                       <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                       <User size={24} className="text-[#555]" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#E0E0E0] mb-1">{user?.displayName || 'Незарегистрированный'}</p>
                    <p className="text-xs text-[#555]">{user?.email || '—'}</p>
                  </div>
                  
                  <div className="h-[1px] w-full bg-[#1A1A1A] my-4"></div>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] text-[#444] uppercase tracking-wider">Status</span>
                    <span className="text-[10px] text-[#A0A0A0] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#555]"></span> {user ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* AI Model Setting */}
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold">Система генерации</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#121212] border border-[#222] shadow-inner cursor-pointer hover:border-[#333] transition-colors">
                      <span className="text-xs text-[#AAA]">YorN (Автоподбор)</span>
                      <Info size={14} className="text-[#444]" />
                    </div>
                  </div>
                </div>

                {/* Device Optimization Mode */}
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold">Оптимизация девайса</p>
                  <div className="p-3.5 rounded-xl bg-[#090909] border border-[#161616] space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#141414] border border-[#222] text-[#AAA]">
                        {isMobileDevice ? <Smartphone size={15} /> : <Laptop size={15} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#DDD]">
                          {isMobileDevice ? 'Мобильный (iOS/Android)' : 'Десктоп (ПК/Ноутбук)'}
                        </p>
                        <p className="text-[9px] text-[#555] uppercase tracking-wider">Определено автоматически</p>
                      </div>
                    </div>

                    <div className="h-[1px] bg-[#161616]" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#888]">
                        <CheckCircle2 size={11} className="text-purple-500 shrink-0" />
                        <span>{isMobileDevice ? 'Снижен радиус Blur для GPU' : 'Максимальный рендер Blur'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#888]">
                        <CheckCircle2 size={11} className="text-purple-500 shrink-0" />
                        <span>{isMobileDevice ? 'Подавлен авто-фокус клавиатуры' : 'Горячие клавиши (Enter)'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#888]">
                        <CheckCircle2 size={11} className="text-purple-500 shrink-0" />
                        <span>{isMobileDevice ? 'Активен тактильный отклик' : 'Полноэкранный FPS режим'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parameters */}
                <div className="space-y-6 pt-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold">Точная настройка</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-[11px] text-[#666]">Свобода (Температура)</label>
                        <span className="text-[11px] text-[#AAA]">{temperature.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.01" 
                        value={temperature} 
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-[3px] bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#E0E0E0] hover:accent-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-[11px] text-[#666]">Top-P Sampling</label>
                        <span className="text-[11px] text-[#AAA]">{topP.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={topP} 
                        onChange={(e) => setTopP(parseFloat(e.target.value))}
                        className="w-full h-[3px] bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#E0E0E0] hover:accent-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-6">
                  {/* Theme Settings */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold block mb-4">Внешний вид</label>
                    <select 
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full bg-[#121212] border border-[#222] text-[#E0E0E0] text-sm rounded-lg p-2.5 outline-none focus:border-[#444] transition-colors mb-5"
                    >
                      <option value="dark">Тёмная (По умолчанию)</option>
                      <option value="cosmic">Космическая</option>
                      <option value="light">Светлая</option>
                    </select>
                  </div>

                  {/* Loading Animation Settings */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold block mb-4">Ожидание ответа ИИ</label>
                    <select 
                      value={loadingAnimation}
                      onChange={(e) => setLoadingAnimation(e.target.value)}
                      className="w-full bg-[#121212] border border-[#222] text-[#E0E0E0] text-sm rounded-lg p-2.5 outline-none focus:border-[#444] transition-colors"
                    >
                      <option value="default">1) Как сейчас (Точки)</option>
                      <option value="border">2) Анимированная обводка</option>
                      <option value="circle">3) Круг на экране (Радар)</option>
                      <option value="scramble">4) Перебор букв (Матрица)</option>
                    </select>
                  </div>

                  {/* Fast Action Settings */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold block mb-3">Функции ответов</label>
                    <div className="space-y-3.5 bg-[#0D0D0D] border border-[#1A1A1A] p-4 rounded-xl">
                      <label className="flex items-center justify-between cursor-pointer group select-none">
                        <span className="text-xs text-[#888] group-hover:text-[#CCC] transition-colors">Озвучивание (Слушать)</span>
                        <div className="relative w-8 h-4">
                          <input 
                            type="checkbox"
                            checked={showTts}
                            onChange={(e) => setShowTts(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-[#151515] border border-[#222] rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#555] peer-checked:after:bg-[#FFF] after:rounded-full after:h-[10px] after:w-[10px] after:transition-all peer-checked:bg-purple-950/30 peer-checked:border-purple-800/40" />
                        </div>
                      </label>

                      <label className="flex items-center justify-between cursor-pointer group select-none">
                        <span className="text-xs text-[#888] group-hover:text-[#CCC] transition-colors">Регенерация (Заново)</span>
                        <div className="relative w-8 h-4">
                          <input 
                            type="checkbox"
                            checked={showRegenerate}
                            onChange={(e) => setShowRegenerate(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-[#151515] border border-[#222] rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#555] peer-checked:after:bg-[#FFF] after:rounded-full after:h-[10px] after:w-[10px] after:transition-all peer-checked:bg-purple-950/30 peer-checked:border-purple-800/40" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold block mb-4">Базовый промпт</label>
                    <textarea 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Вы - продвинутый ИИ..."
                      className="w-full h-32 bg-[#121212] border border-[#222] text-[#E0E0E0] text-xs leading-relaxed rounded-lg p-3 outline-none focus:border-[#444] transition-colors resize-none scrollbar-thin"
                    />
                    <p className="text-[10px] text-[#555] mt-2">
                      Инструкции, определяющие характер и правила поведения ассистента до начала общения.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
        </div>
      </div>
    </>
  );
}
