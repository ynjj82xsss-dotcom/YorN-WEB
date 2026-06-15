import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, Scale, Eye, Activity, Database, Key } from 'lucide-react';

interface LegalModalsProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export default function LegalModals({ isOpen, onClose, initialTab = 'privacy' }: LegalModalsProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="legal-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          {/* Backdrop click closer */}
          <motion.div
            id="legal-modal-backdrop-anim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            id="legal-modal-content-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative z-10 w-full max-w-2xl h-[85vh] max-h-[750px] bg-[#0D0D0D]/95 backdrop-blur-2xl border border-[#222] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div id="legal-modal-header" className="p-5 border-b border-[#222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1A1A1A] rounded-lg border border-[#333]">
                  {activeTab === 'privacy' ? (
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Scale className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div>
                  <h2 id="legal-modal-title" className="text-base font-semibold text-[#E0E0E0]">
                    {activeTab === 'privacy' ? 'Политика конфиденциальности' : 'Пользовательское соглашение'}
                  </h2>
                  <p id="legal-modal-subtitle" className="text-xs text-[#555] font-mono">YorN AI • Версия от 15.06.2026</p>
                </div>
              </div>

              <button
                id="legal-modal-close-btn"
                onClick={onClose}
                className="p-1.5 hover:bg-[#1A1A1A] text-[#888] hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div id="legal-modal-tabs" className="px-5 py-3 bg-[#111] border-b border-[#222] flex gap-2">
              <button
                id="tab-btn-privacy"
                onClick={() => setActiveTab('privacy')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-[#1A1A1A] text-white border border-[#333] shadow-inner'
                    : 'text-[#666] hover:text-[#999] hover:bg-[#1A1A1A]/30 border border-transparent'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Политика конфиденциальности
              </button>
              <button
                id="tab-btn-terms"
                onClick={() => setActiveTab('terms')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-[#1A1A1A] text-white border border-[#333] shadow-inner'
                    : 'text-[#666] hover:text-[#999] hover:bg-[#1A1A1A]/30 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Пользовательское соглашение
              </button>
            </div>

            {/* Content Body */}
            <div 
              id="legal-modal-scrollable-body" 
              className="flex-1 overflow-y-auto p-6 space-y-6 text-[#A0A0A0] text-xs leading-relaxed scrollbar-thin scrollbar-thumb-[#222] scrollbar-track-transparent"
            >
              {activeTab === 'privacy' ? (
                /* Privacy Policy Document */
                <div id="doc-privacy" className="space-y-6">
                  <div className="p-4 bg-purple-950/10 border border-purple-900/20 rounded-xl flex gap-3">
                    <Activity className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-[#8B5CF6]">
                      Ваша конфиденциальность является главным приоритетом YorN AI. Мы следуем философии минимизации сбора пользовательских данных и обеспечения максимального уровня их защиты.
                    </p>
                  </div>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      1. Какую информацию мы обрабатываем?
                    </h3>
                    <p>
                      Для предоставления услуг и персонализации взаимодействия мы работаем исключительно со следующими категориями данных:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-[#888]">
                      <li><strong className="text-[#A0A0A0]">Данные учетной записи:</strong> Уникальный идентификатор пользователя (UID), адрес электронной почты, имя и фото профиля, получаемые от выбранного провайдера авторизации (Google или GitHub).</li>
                      <li><strong className="text-[#A0A0A0]">История диалогов:</strong> Сообщения, создаваемые в чат-сессиях, хранятся исключительно для возможности продолжения переписки и кросс-девайсной синхронизации.</li>
                      <li><strong className="text-[#A0A0A0]">Индивидуальные настройки:</strong> Системный промпт (инструкции ИИ), цветовая тема, стили оформления, параметр Temperature/Top-P и состояние включенных функций сохраняются локально на вашем клиенте.</li>
                      <li><strong className="text-[#A0A0A0]">Пользовательские навыки и интеграции:</strong> Специфические настройки дополнительных функций и параметров сохраняются в вашем профиле.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      2. Технологии хранения и безопасность
                    </h3>
                    <p>
                      Мы используем передовое и надежное облачное хранилище для гарантии сохранности данных:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-[#888]">
                      <li>Безопасность контролируется правилами <strong className="text-[#A0A0A0]">Firebase Security Rules</strong> на уровне сессии и пользователя. Сторонние лица не могут получить доступ к вашим чат-сессиям.</li>
                      <li>История чатов хранится в облачной базе данных Нового поколения <strong className="text-[#A0A0A0]">Google Firestore</strong>.</li>
                      <li>Вся сетевая активность между вашим клиентом и серверами зашифрована по протоколам <strong className="text-[#A0A0A0]">HTTPS / SSL/TLS</strong>.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      3. Передача данных третьим сторонам
                    </h3>
                    <p>
                      YorN AI не продает, не сдает в аренду и не предоставляет данные маркетинговым или рекламным агентствам. Ваши запросы передаются нейросетевой модели компании Google (Gemini API) исключительно для формирования ответов ассистента, в соответствии с правилами безопасного использования коммерческих API-интерфейсов Google.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      4. Управление данными и хранение
                    </h3>
                    <p>
                      Вы имеете контроль над отображением своей информации на клиенте:
                    </p>
                    <p>
                      Вы можете в любой момент скрыть или удалить конкретную чат-сессию через панель управления в боковом меню. При этом сессия перестает отображаться в вашем профиле. Тем не менее, для соблюдения требований законодательства (включая необходимость предоставления информации по официальным запросам государственных органов в случае выявления запрещенных материалов), все переписки и связанные данные сохраняются на серверах базы данных Google Cloud Firestore в защищенном архивном архиве без возможности публичного или пользовательского просмотра.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      5. Изменения политики конфиденциальности
                    </h3>
                    <p>
                      Администрация YorN AI оставляет за собой право вносить изменения в текущую политику. Мы рекомендуем периодически просматривать данную вкладку для информирования об актуальных методах работы с приватной информацией.
                    </p>
                  </section>
                </div>
              ) : (
                /* Terms of Use Document */
                <div id="doc-terms" className="space-y-6">
                  <div className="p-4 bg-indigo-950/10 border border-indigo-900/20 rounded-xl flex gap-3">
                    <Scale className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[#818CF8]">
                      Используя приложение YorN AI, вы соглашаетесь с условиями обслуживания, изложенными ниже. Пожалуйста, внимательно ознакомьтесь с правилами до начала работы.
                    </p>
                  </div>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      1. Общие положения и услуги
                    </h3>
                    <p>
                      YorN AI — это инструмент, предоставляющий доступ к возможностям искусственного интеллекта для помощи в решении творческих, образовательных, рабочих и повседневных задач. Сервис предоставляется в формате "как есть" (as is) со всем доступным функционалом.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      2. Ограничения при генерации контента
                    </h3>
                    <p>
                      Ответы формируются генеративной ИИ-моделью. Обратите внимание на следующие ключевые особенности:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-[#888]">
                      <li>ИИ может порождать неточную, устаревшую или вымышленную информацию ("галлюцинации").</li>
                      <li>Решения ИИ не могут рассматриваться как профессиональные медицинские диагнозы, финансовые рекомендации или юридические консультации.</li>
                      <li>Пользователь самостоятельно несет ответственность за практическое применение сгенерированных рекомендаций и программного кода.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      3. Правила допустимого использования
                    </h3>
                    <p>
                      Пользователи обязуются не использовать YorN AI для:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-[#888]">
                      <li>Генерации материалов, нарушающих действующее законодательство Российской Федерации или международное право.</li>
                      <li>Создания вредоносного ПО, вирусов или проведения кибератак.</li>
                      <li>Нарушения работы серверов, обхода авторизационных лимитов и злоупотребления API-ключами.</li>
                      <li>Намеренной дискредитации, оскорбления, разжигания ненависти или ущемления прав других граждан.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      4. Ответственность сторон и API
                    </h3>
                    <p>
                      Мы не несем ответственности за ущерб, убытки или упущенную выгоду, возникшие в результате временной недоступности сервиса или из-за ошибок в когнитивной цепочке рассуждений ИИ. Использование персональных API-ключей для интеграций находится в полной зоне ответственности и внимания конечного пользователя.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      5. Расторжение соглашения
                    </h3>
                    <p>
                      В случае обнаружения злоупотребления ресурсами, попыток дестабилизации инфраструктуры или систематического нарушения правил генерации контента, доступ пользователя к сервису может быть ограничен в одностороннем порядке.
                    </p>
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div id="legal-modal-footer" className="p-5 bg-[#0A0A0A] border-t border-[#222] flex items-center justify-between">
              <span id="legal-modal-version-stamp" className="text-[10px] text-[#555] font-mono">
                APP_ID: 0e089e14-b838-45d1-92b0-8e2e0f7059e0
              </span>
              <button
                id="legal-modal-confirm-btn"
                onClick={onClose}
                className="py-1.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
