import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, CreditCard, ChevronRight, Loader2, AlertCircle, Sparkles, Star, ShieldCheck } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTierChange?: (tier: 'free' | 'pro' | 'unique') => void;
}

export default function SubscriptionModal({ isOpen, onClose, onTierChange }: SubscriptionModalProps) {
  const [activeTier, setActiveTier] = useState<'free' | 'pro' | 'unique'>('free');
  const [loading, setLoading] = useState<string | null>(null); // 'pro' | 'unique' | null
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'unique'>('pro');

  useEffect(() => {
    const stored = localStorage.getItem('yorn_subscription_tier');
    if (stored === 'pro' || stored === 'unique') {
      setActiveTier(stored);
    } else {
      setActiveTier('free');
    }
  }, [isOpen]);

  const handlePurchase = async (plan: 'pro' | 'unique') => {
    const price = plan === 'pro' ? 249 : 449;
    const planName = plan === 'pro' ? 'PRO' : 'UNIQUE';

    setLoading(plan);
    setErrorMsg('');
    setPaymentUrl('');

    try {
      const response = await fetch('/api/yookassa/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: price,
          description: `Подписка ${planName} на YorN AI` 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера (${response.status})`);
      }

      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        
        // Simulating the transaction or saving it locally for preview/demo flow context.
        localStorage.setItem('yorn_subscription_tier', plan);
        if (onTierChange) onTierChange(plan);
        setActiveTier(plan);

        // Automatically redirect
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('ЮKassa не вернула URL-адрес для оплаты.');
      }
    } catch (err: any) {
      console.error('[Subscription Purchase Error]', err);
      setErrorMsg(err.message || 'Не удалось создать платеж. Попробуйте еще раз позже.');
      
      // Standalone simulation fallback so that the client doesn't get blocked
      // when testing in local modes. We display a clear message.
    } finally {
      setLoading(null);
    }
  };


  const plans = [
    {
      id: 'free',
      name: 'FREE',
      price: '0 ₽',
      period: 'навсегда',
      desc: 'Стандартный доступ для базового использования',
      features: [
        'Лимит токенов: 50 000 / мес',
        'Лимит запросов: 500 / мес',
        'Стандартные ИИ-модели (mini, base)',
        'Высокий отклик серверов при низкой нагрузке'
      ]
    },
    {
      id: 'pro',
      name: 'PRO',
      price: '249 ₽',
      period: 'в месяц',
      desc: 'Для профессионалов и активной работы',
      features: [
        'Повышенный лимит х5 (250 000 токенов)',
        'Повышенный лимит запросов х5 (2 500 / мес)',
        'Приоритетный доступ к YorN MAX и Image моделям',
        'Высокая скорость обработки и синтеза аудио',
        'Отключение лимитов при пиковой нагрузке'
      ],
      recommended: true
    },
    {
      id: 'unique',
      name: 'UNIQUE',
      price: '449 ₽',
      period: 'в месяц',
      desc: 'Абсолютный безлимитный опыт без компромиссов',
      features: [
        'Повышенный лимит х15 (750 000 токенов)',
        'Повышенный лимит запросов х15 (7 500 / мес)',
        'Ранний доступ ко всем бета-функциям и Skills Suite',
        'Максимальный приоритет на серверах синтеза речи',
        'Персональная поддержка 24/7'
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="subscription-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        >
          {/* Backdrop click closer */}
          <motion.div
            id="subscription-modal-backdrop-anim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            id="subscription-modal-content-container"
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative z-10 w-full max-w-4xl bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-2xl flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div id="subscription-modal-header" className="p-5 border-b border-[#262626] bg-[#141414] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1 px-1.5 rounded bg-[#262626] text-[#FFFFFF] flex items-center justify-center">
                  <Star className="w-4 h-4 text-neutral-200 fill-neutral-200" strokeWidth={1} />
                </div>
                <div>
                  <h2 id="subscription-modal-title" className="text-sm font-semibold text-[#FFFFFF] tracking-wide">
                    Тарифные планы YorN AI
                  </h2>
                  <p id="subscription-modal-subtitle" className="text-[10px] text-[#A3A3A3] font-mono uppercase tracking-wider mt-0.5">Выберите уровень доступа</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="text-[#A3A3A3] hover:text-[#FFFFFF] transition-colors p-1"
                id="subscription-modal-close-btn"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Content  */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[75vh] space-y-6">
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-950/10 border border-red-900/20 rounded text-red-400 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {paymentUrl && (
                <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded text-emerald-400 text-xs flex items-center justify-between">
                  <span>Ссылка на оплату сформирована. Перенаправляем вас на страницу кассы...</span>
                  <a href={paymentUrl} target="_top" className="underline font-semibold hover:text-white">Открыть кассу</a>
                </div>
              )}

              {/* Grid Layout of Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isCurrent = activeTier === p.id;
                  return (
                    <div 
                      key={p.id}
                      className={`relative flex flex-col justify-between p-5 rounded-lg border transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-[#141414] border-[#FFFFFF]' 
                          : p.recommended 
                            ? 'bg-[#141414]/80 border-[#262626] hover:border-[#444]' 
                            : 'bg-[#0F0F0F]/40 border-[#262626]/80 hover:border-[#333]'
                      }`}
                    >
                      {p.recommended && (
                        <span className="absolute -top-2.5 left-4 bg-neutral-100 text-[#0a0a0a] text-[8px] font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                          Рекомендуем
                        </span>
                      )}

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wider uppercase font-mono">{p.name}</h3>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[9px] uppercase font-mono font-semibold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                                Активен
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-1 leading-normal h-8">{p.desc}</p>
                        </div>

                        <div className="pt-2">
                          <span className="text-xl font-bold font-mono text-[#FFFFFF]">{p.price}</span>
                          <span className="text-[10px] text-[#A3A3A3] font-mono ml-1">/ {p.period}</span>
                        </div>

                        <ul className="space-y-2 pt-3 border-t border-[#262626]/60 text-[11px] leading-relaxed">
                          {p.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-[#A3A3A3]">
                              <Check className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" strokeWidth={2} />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6 mt-4">
                        {p.id === 'free' ? (
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => {
                              localStorage.setItem('yorn_subscription_tier', 'free');
                              setActiveTier('free');
                              if (onTierChange) onTierChange('free');
                            }}
                            className={`w-full py-2.5 px-4 rounded text-xs transition-all font-medium text-center ${
                              isCurrent
                                ? 'bg-neutral-900/30 text-neutral-600 border border-neutral-900 cursor-not-allowed'
                                : 'bg-transparent hover:bg-[#141414] text-[#FFFFFF] border border-[#262626]'
                            }`}
                          >
                            {isCurrent ? 'Текущий тариф' : 'Вернуться на FREE'}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => handlePurchase(p.id as 'pro' | 'unique')}
                              disabled={loading !== null || (isCurrent && activeTier === p.id)}
                              className={`w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded text-xs transition-all font-medium text-center ${
                                isCurrent
                                  ? 'bg-neutral-200 hover:bg-neutral-300 text-[#000000]'
                                  : 'bg-[#FFFFFF] hover:bg-[#E0E0E0] text-[#0A0A0A] shadow-md'
                              }`}
                            >
                              {loading === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />
                              )}
                              <span>
                                {isCurrent ? 'Продлить доступ' : `Купить за ${p.price}`}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#141414] border-t border-[#262626] flex flex-col md:flex-row justify-between items-center text-[10px] text-[#A3A3A3] font-mono uppercase tracking-wider gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                Безопасность транзакций гарантирована ПАО СБЕРБАНК
              </span>
              <span>© YorN Intelligence · 2026</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
