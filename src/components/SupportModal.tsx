import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, CreditCard, ChevronRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [amount, setAmount] = useState<string>('300');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');

  const presets = ['100', '300', '500', '1000', '2500'];

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Пожалуйста, введите корректную сумму больше нуля.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setPaymentUrl('');

    try {
      const response = await fetch('/api/yookassa/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: numAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера (${response.status})`);
      }

      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        // Automatically attempt to redirect
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('ЮKassa не вернула URL-адрес для оплаты.');
      }
    } catch (err: any) {
      console.error('[CreatePayment Error]', err);
      setErrorMsg(err.message || 'Не удалось создать платеж. Попробуйте еще раз позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          id="support-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        >
          {/* Backdrop click closer */}
          <div
            id="support-modal-backdrop-clicker"
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            id="support-modal-content-container"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-2xl flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div id="support-modal-header" className="p-5 border-b border-[#262626] bg-[#141414] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1 px-1.5 rounded bg-[#262626] text-[#FFFFFF] flex items-center justify-center">
                  <Heart className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 id="support-modal-title" className="text-sm font-semibold text-[#FFFFFF] tracking-wide">
                    Поддержать проект
                  </h2>
                  <p id="support-modal-subtitle" className="text-[10px] text-[#A3A3A3] font-mono uppercase tracking-wider mt-0.5">Развитие YorN AI</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="text-[#A3A3A3] hover:text-[#FFFFFF] transition-colors p-1"
                id="support-modal-close-btn"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Content / Form */}
            <div className="p-6 overflow-y-auto space-y-6">
              {!paymentUrl ? (
                <form onSubmit={handleCreatePayment} className="space-y-6">
                  <p className="text-xs text-[#A3A3A3] leading-relaxed">
                    Ваша добровольная поддержка помогает нам развивать функционал <strong className="text-[#FFFFFF] font-medium">YorN AI</strong>, поддерживать стабильность серверов синтеза речи и обеспечивать быстрый отклик ИИ-моделей.
                  </p>

                  {/* Preset Buttons */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold block">
                      Выберите сумму поддержки
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {presets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setAmount(val);
                            setErrorMsg('');
                          }}
                          className={`py-2 px-1 text-xs font-mono font-medium rounded transition-all border text-center ${
                            amount === val
                              ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                              : 'bg-[#141414] text-[#A3A3A3] border-[#262626] hover:border-[#444] hover:text-[#FFFFFF]'
                          }`}
                        >
                          {val} ₽
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold block">
                      Или укажите свою сумму (в рублях)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        className="w-full bg-[#141414] border border-[#262626] text-[#FFFFFF] text-sm rounded p-2.5 outline-none focus:border-[#FFFFFF] transition-colors font-mono"
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="Сумма поддержки"
                      />
                      <span className="absolute right-3.5 top-3 text-xs text-[#A3A3A3] font-mono">₽</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2 p-3 bg-red-950/10 border border-red-900/20 rounded text-red-400 text-xs leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#FFFFFF] hover:bg-[#E0E0E0] text-[#0A0A0A] font-medium rounded text-sm transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Создание платежа...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                        <span>Оплатить через ЮKassa</span>
                        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Success Redirect fallback in case user browser blocks automatic redirection inside of iframe viewports */
                <div className="space-y-5 text-center py-4">
                  <div className="mx-auto w-12 h-12 rounded bg-[#FFFFFF]/10 text-[#FFFFFF] flex items-center justify-center mb-1">
                    <Sparkles className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#FFFFFF]">Ссылка на оплату сформирована</h3>
                    <p className="text-xs text-[#A3A3A3] leading-relaxed mt-2 px-1">
                      Если автоматическое перенаправление на защищенную страницу ЮKassa не произошло, нажмите на кнопку ниже для завершения оплаты.
                    </p>
                  </div>

                  <div className="pt-2">
                    <a
                      href={paymentUrl}
                      target="_top"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#FFFFFF] hover:bg-[#E0E0E0] text-[#0A0A0A] font-medium rounded text-sm transition-all shadow-md w-full"
                    >
                      <span>Перейти к оплате ({amount} ₽)</span>
                      <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      setPaymentUrl('');
                    }}
                    className="text-xs text-[#A3A3A3] hover:text-[#FFFFFF] transition-colors mt-2"
                  >
                    Вернуться назад
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[#141414] border-t border-[#262626] text-center text-[10px] text-[#A3A3A3] font-mono uppercase tracking-wider">
              Безопасный платеж через ПАО СБЕРБАНК
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
