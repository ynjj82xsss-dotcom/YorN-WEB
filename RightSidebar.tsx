import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText } from 'lucide-react';

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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
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

          {/* Modal Container: Classic Dark aesthetic, max 8px border-radius, no colorful gradients, no glow */}
          <motion.div
            id="legal-modal-content-container"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl h-[80vh] max-h-[700px] bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div id="legal-modal-header" className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#0A0A0A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#141414] rounded-md border border-[#262626]">
                  {activeTab === 'privacy' ? (
                    <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
                  ) : (
                    <FileText className="w-4 h-4 text-white" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <h2 id="legal-modal-title" className="text-sm font-semibold tracking-tight text-white uppercase">
                    {activeTab === 'privacy' ? 'Политика конфиденциальности' : 'Пользовательское соглашение'}
                  </h2>
                  <p id="legal-modal-subtitle" className="text-[10px] text-[#A3A3A3] font-mono tracking-wider mt-0.5">ВЕРСИЯ ОТ 17.06.2026</p>
                </div>
              </div>

              <button
                id="legal-modal-close-btn"
                onClick={onClose}
                className="p-1.5 bg-transparent hover:bg-[#141414] text-[#A3A3A3] hover:text-white rounded-md transition-colors cursor-pointer border border-[#262626]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Tabs Selector */}
            <div id="legal-modal-tabs" className="px-6 py-3 bg-[#141414] border-b border-[#262626] flex gap-2">
              <button
                id="tab-btn-privacy"
                onClick={() => setActiveTab('privacy')}
                className={`py-1.5 px-3 rounded-md text-[11px] font-medium tracking-tight flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-[#0A0A0A] text-white border border-[#262626]'
                    : 'text-[#A3A3A3] hover:text-white border border-transparent bg-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                Конфиденциальность
              </button>
              <button
                id="tab-btn-terms"
                onClick={() => setActiveTab('terms')}
                className={`py-1.5 px-3 rounded-md text-[11px] font-medium tracking-tight flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-[#0A0A0A] text-white border border-[#262626]'
                    : 'text-[#A3A3A3] hover:text-white border border-transparent bg-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                Условия использования
              </button>
            </div>

            {/* Content Body */}
            <div 
              id="legal-modal-scrollable-body" 
              className="flex-1 overflow-y-auto p-6 space-y-6 text-[#A3A3A3] text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-[#262626] scrollbar-track-transparent bg-[#0A0A0A]"
            >
              {activeTab === 'privacy' ? (
                /* Privacy Policy Document */
                <div id="doc-privacy" className="space-y-6">
                  {/* Philosophy Callout */}
                  <div className="p-4 bg-[#141414] border border-[#262626] rounded-md flex gap-3">
                    <Shield className="w-4 h-4 text-white shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-[#A3A3A3]">
                      Ваша конфиденциальность является безусловным приоритетом. Мы следуем философии жесткой минимизации сбора пользовательских данных и обеспечения максимального уровня их защиты в соответствии с отраслевыми стандартами безопасности.
                    </p>
                  </div>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      1. Сбор и обработка информации
                    </h3>
                    <p>
                      Для предоставления функциональных возможностей платформы мы обрабатываем исключительно следующие категории данных:
                    </p>
                    <ul className="list-disc list-inside pl-1 space-y-1 text-[#A3A3A3]/80">
                      <li>
                        <strong className="text-white font-medium">Данные авторизации:</strong> Уникальный идентификатор (UID), адрес электронной почты, отображаемое имя и аватар профиля, получаемые через защищенный протокол OAuth от выбранного вами провайдера (Google или GitHub).
                      </li>
                      <li>
                        <strong className="text-white font-medium">История взаимодействия:</strong> Содержимое переписки и параметры сессий сохраняются исключительно в целях предоставления доступа к диалогам на различных устройствах и обеспечения непрерывности контекста.
                      </li>
                      <li>
                        <strong className="text-white font-medium">Пользовательские настройки:</strong> Выбранная тема оформления, инструкции системного промпта, параметры модели (температура, top-p) и настройки триггеров ИБ хранятся в защищенном локальном хранилище вашего браузера (localStorage) и не передаются внешним сервисам без явной необходимости.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      2. Технологии хранения данных
                    </h3>
                    <p>
                      Все данные хранятся и обрабатываются с использованием сертифицированных и защищенных инфраструктурных решений:
                    </p>
                    <ul className="list-disc list-inside pl-1 space-y-1 text-[#A3A3A3]/80">
                      <li>Хранение истории диалогов и учетных записей осуществляется в защищенной NoSQL базе данных <strong className="text-white font-medium">Google Firebase/Firestore</strong>.</li>
                      <li>Контроль доступа к данным строго разграничен правилами безопасности <strong className="text-white font-medium">Firebase Security Rules</strong> на уровне сессии каждого авторизованного пользователя.</li>
                      <li>Все сетевые соединения зашифрованы по протоколам <strong className="text-white font-medium">HTTPS / TLS 1.3</strong>, исключая возможность перехвата трафика третьими сторонами.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      3. Передача третьим сторонам
                    </h3>
                    <p>
                      Платформа не осуществляет продажу, аренду или коммерческое распространение пользовательских данных третьим лицам. Запросы пользователей передаются нейросетевым моделям посредством коммерческого интерфейса API (включая Gemini API) исключительно для генерации ответов ассистента. Обработка данных внешними провайдерами API осуществляется в соответствии с условиями использования корпоративных инструментов для разработчиков, гарантирующих неиспользование ваших запросов для обучения глобальных моделей.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      4. Политика удаления и архивного хранения
                    </h3>
                    <p>
                      Вы имеете полное право контролировать свои данные:
                    </p>
                    <p>
                      При удалении или скрытии чат-сессий на стороне клиентского интерфейса они мгновенно перестают отображаться в вашей истории переписки. Обратите внимание, что для обеспечения соответствия действующим требованиям безопасности, комплаенса и аудита ИБ, все сессии переписки дублируются в защищенный внутренний системный архив в Google Firestore. Доступ к нему строго ограничен сетевыми политиками безопасности и предоставляется исключительно в случаях проведения официального аудита инцидентов ИБ.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      5. Обратная связь и контакты
                    </h3>
                    <p>
                      По любым вопросам, касающимся обработки персональных данных, соблюдения политики конфиденциальности или отправки запроса на полное удаление вашего профиля с серверов платформы, вы можете обратиться по электронной почте поддержки.
                    </p>
                  </section>
                </div>
              ) : (
                /* Terms of Use Document */
                <div id="doc-terms" className="space-y-6">
                  {/* Philosophy Callout */}
                  <div className="p-4 bg-[#141414] border border-[#262626] rounded-md flex gap-3">
                    <FileText className="w-4 h-4 text-white shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-[#A3A3A3]">
                      Используя решение YorN AI, вы безоговорочно соглашаетесь с настоящими условиями обслуживания. Пожалуйста, внимательно ознакомьтесь с правилами до начала использования платформы.
                    </p>
                  </div>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      1. Предмет соглашения
                    </h3>
                    <p>
                      Платформа предоставляет доступ к возможностям современных нейросетевых моделей для автоматизации творческих, когнитивных, образовательных и профессиональных процессов. Услуги и сервисы предоставляются по принципу "как есть" (as is) без каких-либо явных или подразумеваемых гарантий со стороны разработчиков.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      2. Ответственность и ограничения генеративных ответов
                    </h3>
                    <p>
                      Учитывая вероятностную природу работы современных больших языковых моделей (LLM), пользователь соглашается со следующими положениями:
                    </p>
                    <ul className="list-disc list-inside pl-1 space-y-1 text-[#A3A3A3]/80">
                      <li>Сгенерированные ответы могут содержать неточную, неполную или вымышленную информацию ("галлюцинации").</li>
                      <li>Никакие рекомендации, аналитика или программный код, полученные от ассистента, не могут рассматриваться как профессиональная финансовая, медицинская или юридическая консультация.</li>
                      <li>Пользователь самостоятельно анализирует, верифицирует и принимает на себя всю полноту ответственности за последствия практического использования результатов работы ИИ.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      3. Правила допустимого использования (Acceptable Use)
                    </h3>
                    <p>
                      При использовании платформы категорически запрещается:
                    </p>
                    <ul className="list-disc list-inside pl-1 space-y-1 text-[#A3A3A3]/80">
                      <li>Генерация запрещенных законодательством РФ или международным правом материалов.</li>
                      <li>Разработка вредоносного программного обеспечения, эксплоитов, а также генерация фишингового контента.</li>
                      <li>Осуществление деструктивных действий в отношении веб-сервисов, попытки обхода системных ограничений безопасности или эксплуатации уязвимостей.</li>
                      <li>Использование платформы для пропаганды ненависти, насилия, дискриминации, клеветы или преследования отдельных граждан и групп лиц.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      4. Ограничение ответственности
                    </h3>
                    <p>
                      Разработчики не несут ответственности за любые прямые, косвенные, случайные или штрафные убытки, включая потерю данных, упущенную выгоду или ущерб репутации, вызванные использованием либо невозможностью использования платформы, сбоями в каналах связи или перебоями в энергоснабжении серверов.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      5. Прекращение доступа
                    </h3>
                    <p>
                      Платформа сохраняет за собой право в одностороннем порядке в любой момент приостановить или заблокировать учетную запись пользователя при выявлении признаков вредоносной активности, повторных нарушений правил безопасности или совершения действий, угрожающих работоспособности всей инфраструктуры платформы.
                    </p>
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div id="legal-modal-footer" className="p-6 bg-[#141414] border-t border-[#262626] flex items-center justify-between">
              <span id="legal-modal-version-stamp" className="text-[9px] text-[#A3A3A3] font-mono tracking-wider">
                APP_ID: 0e089e14-b838-45d1-92b0-8e2e0f7059e0
              </span>
              <button
                id="legal-modal-confirm-btn"
                onClick={onClose}
                className="py-1.5 px-4 bg-white text-black hover:bg-neutral-200 transition-colors text-[11px] font-semibold tracking-tight rounded-md cursor-pointer border border-transparent shadow-sm"
              >
                ПОНЯТНО
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
