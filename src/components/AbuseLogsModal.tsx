import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ShieldAlert, Calendar, User, Search, RefreshCw, Key, 
  MessageSquare, AlertOctagon, Sliders, Lock, HelpCircle, 
  Plus, Check, Trash2, Eye, ShieldCheck 
} from 'lucide-react';
import { fetchAbuseLogs } from '../lib/firebaseService';

interface AbuseLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AbuseLogsModal({ isOpen, onClose }: AbuseLogsModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Policy configuration state
  const [securityPolicy, setSecurityPolicy] = useState<string>(() => {
    return localStorage.getItem('yorn_security_policy') || 'logging';
  });

  // Custom blacklisted terms state
  const [customTriggers, setCustomTriggers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yorn_custom_security_triggers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newTriggerInput, setNewTriggerInput] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchAbuseLogs();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Не удалось загрузить аудит-логи безопасности. Убедитесь, что у вас есть права администратора.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const handleUpdatePolicy = (policy: string) => {
    setSecurityPolicy(policy);
    localStorage.setItem('yorn_security_policy', policy);
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTriggerInput.trim().toLowerCase();
    if (trimmed && !customTriggers.includes(trimmed)) {
      const updated = [...customTriggers, trimmed];
      setCustomTriggers(updated);
      localStorage.setItem('yorn_custom_security_triggers', JSON.stringify(updated));
      setNewTriggerInput('');
    }
  };

  const handleRemoveTrigger = (trigger: string) => {
    const updated = customTriggers.filter(t => t !== trigger);
    setCustomTriggers(updated);
    localStorage.setItem('yorn_custom_security_triggers', JSON.stringify(updated));
  };

  // Advanced Category counters for metrics
  const stats = {
    drugs: logs.filter(log => {
      const text = (log.messageContent || '').toLowerCase();
      return text.includes('наркоти') || text.includes('порошок') || text.includes('веществ') || text.includes('героин') || text.includes('кокаин') || text.includes('амфетамин') || text.includes('спайс');
    }).length,
    weapons: logs.filter(log => {
      const text = (log.messageContent || '').toLowerCase();
      return text.includes('бомба') || text.includes('взрыв') || text.includes('тротил') || text.includes('оружие') || text.includes('устройств');
    }).length,
    cyber: logs.filter(log => {
      const text = (log.messageContent || '').toLowerCase();
      return text.includes('взлом') || text.includes('ddos') || text.includes('ддос') || text.includes('кибер') || text.includes('sql') || text.includes('exploit') || text.includes('бэкдор');
    }).length,
    suicide: logs.filter(log => {
      const text = (log.messageContent || '').toLowerCase();
      return text.includes('суицид') || text.includes('самоубийств') || text.includes('умереть') || text.includes('порезы');
    }).length,
  };

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const content = log.messageContent?.toLowerCase() || '';
    const email = log.user?.email?.toLowerCase() || '';
    const name = log.user?.displayName?.toLowerCase() || '';
    const keywords = log.matchedKeywords?.join(' ')?.toLowerCase() || '';
    return content.includes(q) || email.includes(q) || name.includes(q) || keywords.includes(q);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="abuse-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          {/* Backdrop click closer */}
          <motion.div
            id="abuse-modal-backdrop-anim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            id="abuse-modal-content-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative z-10 w-full max-w-4xl h-[90vh] max-h-[820px] bg-[#0A0A0A] border border-red-900/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div id="abuse-modal-header" className="p-5 border-b border-[#1C1C1C] bg-[#0E0E0E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-950/20 rounded-lg border border-red-900/40 animate-pulse">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 id="abuse-modal-title" className="text-sm md:text-base font-semibold text-[#E0E0E0] flex items-center gap-2">
                    Журнал аудита & Управление ИБ
                    <span className="px-2 py-0.5 bg-red-950 text-red-400 text-[9px] font-mono rounded font-bold border border-red-900/40">
                      Администратор
                    </span>
                  </h2>
                  <p id="abuse-modal-subtitle" className="text-xs text-neutral-500 font-mono">Выгрузка из Cloud Firestore и Supabase</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`py-1.5 px-3 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    showSettings 
                      ? 'bg-red-950/30 text-red-400 border-red-900/50' 
                      : 'bg-[#141414] hover:bg-[#202020] text-[#AAA] hover:text-white border-[#2A2A2A]'
                  }`}
                  title="Настройки ИБ и черный список триггеров"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Политика и триггеры</span>
                </button>
                <button
                  onClick={loadLogs}
                  disabled={loading}
                  className="p-1.5 bg-[#141414] hover:bg-[#202020] text-[#AAA] hover:text-white rounded-lg border border-[#2A2A2A] transition-colors cursor-pointer"
                  title="Обновить журнал"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
                </button>
                <button
                  id="abuse-modal-close-btn"
                  onClick={onClose}
                  className="p-1.5 hover:bg-[#1C1C1C] text-[#888] hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#2A2A2A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slide Down Security Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#0E0E0E] border-b border-[#222] overflow-hidden"
                >
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#E0E0E0]">
                    {/* Security Policy Selector */}
                    <div className="bg-[#070707] p-4 rounded-xl border border-[#1A1A1A] flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                        <Lock className="w-4 h-4 text-red-400" />
                        <span>Режим реагирования ИБ на нарушения</span>
                      </div>
                      <p className="text-neutral-500 leading-normal text-[11px]">
                        Выберите политику блокировки при совпадении ключевых слов в запросах пользователей.
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleUpdatePolicy('logging')}
                          className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            securityPolicy === 'logging'
                              ? 'bg-neutral-900 border-neutral-700 text-neutral-200 shadow'
                              : 'bg-black border-[#181818] text-neutral-500 hover:text-neutral-300 hover:border-[#222]'
                          }`}
                        >
                          <span className="font-bold text-[11px] uppercase tracking-wider">Логирование</span>
                          <span className="text-[9px] text-neutral-500 font-mono">Только пассивный аудит</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePolicy('blocking')}
                          className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            securityPolicy === 'blocking'
                              ? 'bg-red-950/25 border-red-900/60 text-red-400 shadow-md shadow-red-950/10'
                              : 'bg-black border-[#181818] text-neutral-500 hover:text-neutral-350 hover:border-[#222]'
                          }`}
                        >
                          <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Блокировка
                          </span>
                          <span className="text-[9px] text-neutral-500 font-mono">Мгновенный Drop-запрос</span>
                        </button>
                      </div>

                      <div className="text-[10px] text-amber-500/80 bg-amber-950/10 border border-amber-900/20 px-2.5 py-1.5 rounded-md mt-1">
                        {securityPolicy === 'blocking' 
                          ? '🛡️ Активен строгий брандмауэр. Любой опасный запрос вернет отказ в обработке на стороне шлюза.'
                          : 'ℹ️ Логи только записываются в фоновом режиме. Нейросеть сформирует ответ без задержки.'}
                      </div>
                    </div>

                    {/* Custom blacklist keyword additions */}
                    <div className="bg-[#070707] p-4 rounded-xl border border-[#1A1A1A] flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                        <Plus className="w-4 h-4 text-rose-400" />
                        <span>Дополнительный черный список (Blacklist)</span>
                      </div>
                      <p className="text-neutral-500 leading-normal text-[11px]">
                        Добавьте свои триггер-слова. Система моментально применит их вместе с базовым списком ИБ.
                      </p>

                      <form onSubmit={handleAddTrigger} className="flex gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="Пример: вейп, взрыв, кража, crypto..."
                          value={newTriggerInput}
                          onChange={(e) => setNewTriggerInput(e.target.value)}
                          className="flex-1 bg-black border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-[#E0E0E0] placeholder-neutral-600 focus:outline-none focus:border-red-900/50"
                        />
                        <button
                          type="submit"
                          className="bg-red-900/20 hover:bg-red-900/35 border border-red-800/40 text-red-400 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <Plus className="w-3 h-3" /> Добавить
                        </button>
                      </form>

                      {/* Display Custom triggers */}
                      <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto mt-1 p-2 bg-black/60 rounded-lg border border-[#1C1C1C]">
                        {customTriggers.length === 0 ? (
                          <span className="text-neutral-600 text-[10px] font-mono italic">Нет пользовательских триггеров. Добавьте выше.</span>
                        ) : (
                          customTriggers.map((t) => (
                            <div 
                              key={t}
                              className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-red-950/20 text-red-400 text-[10px] font-mono rounded border border-red-900/30 select-none"
                            >
                              <span>{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTrigger(t)}
                                className="text-red-500 hover:text-white p-0.5 rounded hover:bg-red-900/30 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Stats and Search bar */}
            <div className="p-5 bg-[#0F0F0F] border-b border-[#1C1C1C] flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shrink-0">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-neutral-600 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Поиск по email, содержанию, ключевым словам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#050505] border border-[#222] rounded-xl text-xs text-[#E0E0E0] placeholder-neutral-600 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/30 transition-all font-mono"
                />
              </div>
              
              <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 shrink-0">
                <div className="flex flex-col">
                  <span className="text-[9px] text-neutral-600 uppercase">Всего инцидентов</span>
                  <span className="text-[#E0E0E0] font-bold text-sm text-right md:text-left">{logs.length}</span>
                </div>
                <div className="w-[1px] h-6 bg-[#222]" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-neutral-600 uppercase">Политика реагирования</span>
                  <span className={`font-bold text-xs capitalize ${securityPolicy === 'blocking' ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`}>
                    {securityPolicy === 'blocking' ? '🚫 STRICT BLOCK' : '👁️ SILENT AUDIT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bento statistics of different category triggers */}
            <div className="px-5 py-3.5 bg-[#080808] border-b border-[#1A1A1A] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-[#0C0C0C] border border-[#161616] rounded-xl p-2.5 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">🧪 Наркоиндустрия</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-red-400 font-mono">{stats.drugs}</span>
                  <span className="text-[9px] text-neutral-700">вещества</span>
                </div>
              </div>
              <div className="bg-[#0C0C0C] border border-[#161616] rounded-xl p-2.5 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">💣 Оружие & Тэра</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-rose-450 font-mono text-rose-400">{stats.weapons}</span>
                  <span className="text-[9px] text-neutral-700">угрозы</span>
                </div>
              </div>
              <div className="bg-[#0C0C0C] border border-[#161616] rounded-xl p-2.5 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">💻 Кибератаки</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-cyan-400 font-mono">{stats.cyber}</span>
                  <span className="text-[9px] text-neutral-700">взломы</span>
                </div>
              </div>
              <div className="bg-[#0C0C0C] border border-[#161616] rounded-xl p-2.5 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">❤️ Селфхарм</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-purple-400 font-mono">{stats.suicide}</span>
                  <span className="text-[9px] text-neutral-700">суицид</span>
                </div>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMsg && (
              <div className="m-5 p-3.5 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex gap-2 shrink-0">
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* List Body */}
            <div 
              id="abuse-modal-scrollable-body" 
              className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed scrollbar-thin scrollbar-thumb-red-950/40 scrollbar-track-transparent"
            >
              {loading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-neutral-600 font-mono gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-red-500/40" />
                  <span>Чтение зарезервированного архива Firestore и Supabase...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-600 font-mono text-center gap-1">
                  <ShieldAlert className="w-8 h-8 text-neutral-800 mb-2" />
                  <span className="font-semibold text-neutral-500">Записи не найдены</span>
                  <span className="text-[10px] text-neutral-700">Активные триггеры безопасности в отфильтрованном выводе отсутствуют.</span>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 bg-[#0F0F0F] hover:bg-[#141414] border border-[#1C1C1C] hover:border-red-900/25 rounded-xl flex flex-col gap-3 transition-colors group"
                  >
                    {/* Log Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1C1C1C]/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-red-950/30 text-red-400 font-mono text-[9px] font-bold rounded border border-red-900/20">
                          {log.matchedKeywords?.join(', ') || 'Triggered'}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono block">
                          ID: {log.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[10px]">
                        <Calendar className="w-3 h-3 text-neutral-600" />
                        <span>{new Date(log.timestamp).toLocaleString('ru-RU')}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col gap-1 text-[#D4D4D4] font-mono break-all line-clamp-4 hover:line-clamp-none transition-all">
                      <div className="text-[11px] text-neutral-400 font-sans font-semibold flex items-center gap-1.5 mb-1 text-red-400/85">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        Запрос пользователя:
                      </div>
                      <p className="p-2.5 bg-black/40 rounded-lg border border-[#161616] text-[#CCC] whitespace-pre-wrap font-sans text-xs select-text">
                        {log.messageContent}
                      </p>
                    </div>

                    {/* User Profile info */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-[#0c0c0c] px-3 py-2 rounded-lg border border-[#161616]/40 font-mono text-[10px] text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        <span className="text-neutral-400 font-semibold">{log.user?.displayName || 'anonymous'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-600">Email:</span>
                        <span className="text-neutral-400 font-bold">{log.user?.email || 'no-email'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Key className="w-3 h-3 text-neutral-600 shrink-0" />
                        <span className="text-neutral-600">UID:</span>
                        <span className="text-neutral-500 truncate max-w-[80px]" title={log.user?.uid}>{log.user?.uid}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div id="abuse-modal-footer" className="p-5 bg-[#0E0E0E] border-t border-[#1C1C1C] flex items-center justify-between shrink-0">
              <span id="abuse-modal-version-stamp" className="text-[10px] text-neutral-700 font-mono">
                SEC_AUDIT_VER: 2.15 • FILTER_SHIELD • RF-152
              </span>
              <button
                id="abuse-modal-confirm-btn"
                onClick={onClose}
                className="py-1.5 px-5 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Закрыть ведомость
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
