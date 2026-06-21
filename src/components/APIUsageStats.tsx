import React from 'react';
import { BarChart3, Database, MessageSquare, Flame } from 'lucide-react';
import { ChatSession } from '../types';

interface APIUsageStatsProps {
  sessions: ChatSession[];
  subscriptionTier: 'free' | 'pro' | 'unique';
  onOpenSubscription: () => void;
}

export default function APIUsageStats({ sessions, subscriptionTier, onOpenSubscription }: APIUsageStatsProps) {
  // Estimate tokens helper
  const estimateTokens = (text: string): number => {
    if (!text) return 0;
    // Russian characters are ~2.2 per token, English are ~4 per token
    const cyrillicMatch = text.match(/[\u0400-\u04FF]/g);
    const cyrillicCount = cyrillicMatch ? cyrillicMatch.length : 0;
    const nonCyrillicCount = text.length - cyrillicCount;
    
    const cyrillicTokens = Math.ceil(cyrillicCount / 2.2);
    const latinTokens = Math.ceil(nonCyrillicCount / 4.0);
    
    return cyrillicTokens + latinTokens;
  };

  // Monthly statistics logic
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Month name formatting in Russian
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const currentMonthName = `${monthNames[currentMonth]} ${currentYear}`;

  let messagesCount = 0;
  let tokensCount = 0;
  let userMessages = 0;
  let aiMessages = 0;

  sessions.forEach((session) => {
    // Check session messages
    const msgs = session.messages || [];
    msgs.forEach((msg) => {
      if (msg.timestamp) {
        const msgDate = new Date(msg.timestamp);
        if (msgDate.getFullYear() === currentYear && msgDate.getMonth() === currentMonth) {
          messagesCount++;
          if (msg.role === 'user') {
            userMessages++;
          } else {
            aiMessages++;
          }
          tokensCount += estimateTokens(msg.content);
        }
      }
    });
  });

  // Limits setup (FREE base: 50,000 / 500, PRO: x5, UNIQUE: x15)
  const baseTokenLimit = 50000;
  const baseMessageLimit = 500;

  const multiplier = subscriptionTier === 'pro' ? 5 : subscriptionTier === 'unique' ? 15 : 1;
  const tokenLimit = baseTokenLimit * multiplier;
  const messageLimit = baseMessageLimit * multiplier;

  const tokenPercentage = Math.min((tokensCount / tokenLimit) * 100, 100);
  const messagePercentage = Math.min((messagesCount / messageLimit) * 100, 100);

  return (
    <div className="space-y-4" id="api-usage-stats-container">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold block">
          Статистика API за {monthNames[currentMonth].toLowerCase()}
        </label>
        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
          Тариф: {subscriptionTier.toUpperCase()}
        </span>
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-lg p-3.5 space-y-4 shadow-sm">
        {/* Active subscription tier info bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]/40">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded text-[9px] font-mono font-bold px-1.5 ${
              subscriptionTier === 'unique' 
                ? 'bg-neutral-100 text-[#000000]' 
                : subscriptionTier === 'pro'
                  ? 'bg-neutral-200/50 text-[#FFFFFF]'
                  : 'bg-[#262626] text-[#A3A3A3]'
            }`}>
              {subscriptionTier.toUpperCase()}
            </div>
            <span className="text-[10px] text-[#A3A3A3]">
              {subscriptionTier === 'free' ? 'Базовый лимит' : subscriptionTier === 'pro' ? 'Повышенные лимиты х5' : 'Повышенные лимиты х15'}
            </span>
          </div>
          <button 
            type="button"
            onClick={onOpenSubscription}
            className="text-[9px] font-mono font-semibold text-[#FFFFFF] underline hover:text-[#A3A3A3] transition-colors"
          >
            Сменить тариф
          </button>
        </div>

        {/* Token Quota Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#A3A3A3] flex items-center gap-1.5 font-medium">
              <Database size={13} className="text-neutral-500" strokeWidth={1.5} />
              Токены ИИ
            </span>
            <span className="font-mono text-[#FFFFFF]">
              {tokensCount.toLocaleString('ru-RU')} <span className="text-neutral-600">/ {tokenLimit.toLocaleString('ru-RU')}</span>
            </span>
          </div>
          <div className="w-full bg-[#0A0A0A] h-[5px] rounded-full overflow-hidden border border-[#262626]/40">
            <div 
              className="bg-[#FFFFFF] h-full rounded-full transition-all duration-500" 
              style={{ width: `${tokenPercentage}%` }} 
            />
          </div>
        </div>

        {/* Messages Quota Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#A3A3A3] flex items-center gap-1.5 font-medium">
              <MessageSquare size={13} className="text-neutral-500" strokeWidth={1.5} />
              Запросы / Сообщения
            </span>
            <span className="font-mono text-[#FFFFFF]">
              {messagesCount} <span className="text-neutral-600">/ {messageLimit}</span>
            </span>
          </div>
          <div className="w-full bg-[#0A0A0A] h-[5px] rounded-full overflow-hidden border border-[#262626]/40">
            <div 
              className="bg-[#FFFFFF] h-full rounded-full transition-all duration-500" 
              style={{ width: `${messagePercentage}%` }} 
            />
          </div>
        </div>

        {/* Detailed Breakdown Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262626]/40 text-[10px] font-mono">
          <div className="bg-[#0A0A0A]/60 px-2.5 py-1.5 rounded border border-[#262626]/30">
            <span className="text-neutral-500 uppercase block tracking-wider text-[8px] mb-0.5">Исходящие (ИИ)</span>
            <span className="text-[#FFFFFF] font-semibold">{aiMessages} сообщений</span>
          </div>
          <div className="bg-[#0A0A0A]/60 px-2.5 py-1.5 rounded border border-[#262626]/30">
            <span className="text-neutral-500 uppercase block tracking-wider text-[8px] mb-0.5">Входящие (Вы)</span>
            <span className="text-[#FFFFFF] font-semibold">{userMessages} сообщений</span>
          </div>
        </div>

        {/* Note */}
        <p className="text-[9px] text-neutral-500 leading-normal">
          Лимиты сбрасываются 1-го числа каждого месяца. После окончания лимитов скорость генерации может быть временно снижена.
        </p>
      </div>
    </div>
  );
}
