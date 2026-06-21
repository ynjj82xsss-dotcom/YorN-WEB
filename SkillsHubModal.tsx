import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  Trash2, 
  CheckCheck, 
  Megaphone, 
  Send, 
  Volume2, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  CornerDownRight, 
  Radio, 
  CheckCircle2 
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  readNotificationIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onPublishBroadcast: (notification: Omit<AppNotification, 'id'>) => Promise<void>;
  isMobileDevice?: boolean;
  currentUserEmail?: string | null;
}

export default function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  readNotificationIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotifications,
  onPublishBroadcast,
  isMobileDevice = false,
  currentUserEmail = null
}: NotificationsPanelProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'system' | 'success'>('info');
  const [author, setAuthor] = useState('YorN Command');

  const unreadCount = notifications.filter(n => !readNotificationIds.includes(n.id)).length;

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg("Заполните заголовок и содержание!");
      return;
    }

    setBroadcasting(true);
    setErrorMsg(null);

    try {
      await onPublishBroadcast({
        title: title.trim(),
        content: content.trim(),
        type: notifType,
        author: author.trim() || 'YorN Command',
        timestamp: new Date().toISOString()
      });

      setSuccessMsg(true);
      setTitle('');
      setContent('');
      
      setTimeout(() => {
        setSuccessMsg(false);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ошибка запуска рассылки');
    } finally {
      setBroadcasting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />;
      case 'warning':
        return <ShieldAlert size={15} className="text-amber-400 shrink-0" />;
      case 'system':
        return <Radio size={15} className="text-purple-400 shrink-0 animate-pulse" />;
      default:
        return <Megaphone size={15} className="text-blue-400 shrink-0" />;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'success':
        return 'from-emerald-500/10 to-transparent border-emerald-500/10 hover:border-emerald-500/20';
      case 'warning':
        return 'from-amber-500/10 to-transparent border-amber-500/10 hover:border-amber-500/20';
      case 'system':
        return 'from-purple-500/10 to-transparent border-purple-500/10 hover:border-purple-500/20';
      default:
        return 'from-blue-500/10 to-transparent border-blue-500/10 hover:border-blue-500/20';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Только что';
      if (diffMins < 60) return `${diffMins} мин. назад`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ч. назад`;
      
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar container */}
      <div 
        className={`fixed top-0 right-0 h-full w-[310px] shrink-0 z-50 flex flex-col items-stretch
                   bg-[#030303] border-l border-[#141414] shadow-[[-10px_0_30px_rgba(0,0,0,0.85)]]
                   transition-transform duration-300 ease-in-out md:w-[340px]
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#111] pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell size={16} className="text-white/80" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white font-semibold text-[8px] px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-[#030303]">
                  {unreadCount}
                </span>
              )}
            </div>
            <h2 className="text-[12px] font-semibold text-white uppercase tracking-wider">Уведомления</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555] hover:text-[#AAA] hover:bg-[#111] cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick actions bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-3 px-4 bg-[#070707] border-b border-[#111]">
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 text-[9px] font-semibold text-[#888] hover:text-white uppercase tracking-widest cursor-pointer transition-colors"
            >
              <CheckCheck size={11} className="text-purple-500" />
              <span>Прочитать все</span>
            </button>
            <button
              onClick={onClearNotifications}
              className="flex items-center gap-1.5 text-[9px] font-semibold text-[#555] hover:text-red-400 uppercase tracking-widest cursor-pointer transition-colors"
            >
              <Trash2 size={11} />
              <span>Очистить</span>
            </button>
          </div>
        )}

        {/* Notifications and broadcast Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          
          {/* Admin panel reveal button for lunymisha@gmail.com */}
          {currentUserEmail === 'lunymisha@gmail.com' && (
            <>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setShowAdmin(!showAdmin)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-300
                             ${showAdmin 
                               ? 'bg-purple-950/10 border-purple-500/20 text-purple-300' 
                               : 'bg-[#080808]/80 border-[#121212] text-[#666] hover:text-[#AAA] hover:border-[#1A1A1A]'}`}
                >
                  <div className="flex items-center gap-2">
                    <Radio size={13} className={showAdmin ? "animate-pulse text-purple-400" : "text-[#555]"} />
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em]">Запустить рассылку</span>
                  </div>
                  <span className="text-[9px] text-[#444]">{showAdmin ? 'Скрыть ▵' : 'Открыть ▹'}</span>
                </button>
              </div>

              {/* Admin Panel Form */}
              <AnimatePresence>
                {showAdmin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form 
                      onSubmit={handleSendBroadcast}
                      className="p-3.5 rounded-xl bg-[#080808] border border-[#141414] space-y-3"
                    >
                      <p className="text-[9px] uppercase tracking-wider text-[#444] font-bold">Рассылка сообщений</p>
                      
                      {/* Title field */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-medium text-[#666] uppercase">Заголовок</label>
                        <input 
                          type="text" 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Серверное обновление..."
                          className="w-full bg-[#050505] border border-[#161616] rounded-lg p-2 text-xs text-[#DDD] focus:outline-none focus:border-purple-500/40"
                        />
                      </div>

                      {/* Content field */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-medium text-[#666] uppercase">Текст уведомления</label>
                        <textarea 
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Новая модель запущена и готова к работе..."
                          rows={2}
                          className="w-full bg-[#050505] border border-[#161616] rounded-lg p-2 text-xs text-[#DDD] focus:outline-none focus:border-purple-500/40 resize-none"
                        />
                      </div>

                      {/* Split parameters (Type and Author) */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-medium text-[#666] uppercase text-[8px]">Тип/Категория</label>
                          <select
                            value={notifType}
                            onChange={(e: any) => setNotifType(e.target.value)}
                            className="w-full bg-[#050505] border border-[#161616] rounded-lg p-1.5 text-[10px] text-[#999] focus:outline-none"
                          >
                            <option value="info">Инфо</option>
                            <option value="success">Событие</option>
                            <option value="warning">Внимание</option>
                            <option value="system">Система</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-medium text-[#666] uppercase text-[8px]">Отправитель</label>
                          <input 
                            type="text" 
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="w-full bg-[#050505] border border-[#161616] rounded-lg p-1.5 text-[10px] text-[#999] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Submit, Success and Error statuses */}
                      {successMsg && (
                        <div className="text-[10px] text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 flex items-center gap-1.5">
                          <CheckCircle2 size={12} />
                          <span>Уведомление успешно разослано!</span>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="text-[10px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                          {errorMsg}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={broadcasting}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-white text-black hover:bg-neutral-200 transition-colors rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        <Send size={11} fill="currentColor" />
                        <span>{broadcasting ? 'Отправка...' : 'Отправить Рассылку'}</span>
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Separation line */}
              {showAdmin && <div className="h-[1px] bg-[#111]" />}
            </>
          )}

          {/* Notifications feed */}
          <div className="space-y-3">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#444] font-bold">Лента оповещений</p>
            
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell size={24} className="mx-auto text-[#1B1B1B] mb-2.5" />
                <p className="text-[11px] text-[#444] font-medium uppercase tracking-wider">Уведомлений нет</p>
                <p className="text-[9px] text-[#333] mt-1 pr-1 pl-1">Вы увидите новые системные уведомления и рассылки, как только они будут отправлены.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => {
                  const isRead = readNotificationIds.includes(notif.id);
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => onMarkAsRead(notif.id)}
                      className={`p-3.5 rounded-xl bg-[#080808]/50 border cursor-pointer select-none transition-all duration-300 relative overflow-hidden flex flex-col gap-2 bg-gradient-to-br
                                 ${isRead 
                                   ? 'border-[#111] text-white/50 opacity-60 hover:opacity-90 hover:border-[#1D1D1D]' 
                                   : `border-[#1C1C1E] text-white hover:border-[#333] shadow-[0_4px_15px_rgba(0,0,0,0.1)] ${getGradient(notif.type)}`}`}
                    >
                      {/* Top title area */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getIcon(notif.type)}
                          <span className={`text-[11px] font-semibold tracking-wide ${isRead ? 'text-[#888]' : 'text-white'}`}>
                            {notif.title}
                          </span>
                        </div>
                        
                        {/* Pulse dot for unread */}
                        {!isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0 mt-1" />
                        )}
                      </div>

                      {/* Content of notification */}
                      <p className="text-[10px] leading-relaxed text-[#888] font-light">
                        {notif.content}
                      </p>

                      {/* Author + time */}
                      <div className="flex items-center justify-between text-[8px] text-[#444] uppercase tracking-wider pt-0.5 border-t border-[#111]/30">
                        <div className="flex items-center gap-1">
                          <CornerDownRight size={8} />
                          <span className="font-semibold text-[#666]">{notif.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={8} />
                          <span>{formatTime(notif.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
