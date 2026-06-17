/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, googleProvider, githubProvider, signInWithPopup, signOut, db } from './lib/firebase';
import { 
  testFirestoreConnection, 
  loadUserSessions, 
  saveFirestoreSession, 
  updateFirestoreSessionTitle, 
  updateFirestoreSessionPin,
  deleteFirestoreSession, 
  saveFirestoreMessage,
  subscribeToNotifications,
  publishNotification,
  loadUserSkills,
  saveUserSkill,
  deleteUserSkill,
  detectDangerousKeywords,
  isSuicideQuery,
  isDrugQuery,
  isTerrorismQuery,
  logDangerousRequest
} from './lib/firebaseService';
import Background from './components/Background';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import ChatArea from './components/ChatArea';
import NotificationsPanel from './components/NotificationsPanel';
import SkillsHubModal from './components/SkillsHubModal';
import { ChatSession, Message, AppNotification, Skill, IntegrationConfig } from './types';
import SplashLoader from './components/SplashLoader';
import LegalModals from './components/LegalModals';
import AbuseLogsModal from './components/AbuseLogsModal';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'translate',
    name: 'Переводчик',
    trigger: 'translate',
    description: 'Переводит любой текст на русский, английский или другие языки.',
    instructions: 'Ты — профессиональный, сверхточный и быстрый переводчик. Переведи текст пользователя на русский язык (если исходный текст на английском или другом языке) или на английский язык (если исходный на русском), сохраняя форматирование, структуру и оригинальный эмоциональный окрас. Отдавай только переведенный текст без лишних слов.',
    createdAt: '2026-06-13T00:00:00.000Z',
    isSystem: true
  },
  {
    id: 'summarize',
    name: 'Саммаризатор',
    trigger: 'summarize',
    description: 'Делает структурированную выжимку из больших материалов.',
    instructions: 'Ты — эксперт по анализу информации. Напиши краткую, структурированную, емкую выжимку (summary) предоставленного текста или диалога. Используй списки, выдели суть, важные тезисы, ключевые выводы и необходимые действия (action items) на русском языке.',
    createdAt: '2026-06-13T00:00:00.000Z',
    isSystem: true
  },
  {
    id: 'code',
    name: 'Код-Архитектор',
    trigger: 'code',
    description: 'Пишет чистый, оптимизированный и безопасный код.',
    instructions: 'Ты — элитный программист и системный архитектор. Напиши чистый, чрезвычайно производительный, масштабируемый код в соответствии с профессиональными практиками и стандартами. Сопровождай код краткими емкими комментариями на русском языке, избегай избыточных рассуждений.',
    createdAt: '2026-06-13T00:00:00.000Z',
    isSystem: true
  },
  {
    id: 'explain',
    name: 'Разъяснитель',
    trigger: 'explain',
    description: 'Объясняет сложнейшие понятия простыми и доступными словами.',
    instructions: 'Ты — превосходный ментор и популяризатор науки. Разложи сложный вопрос, технологию, формулу или абстрактный концепт по полочкам самым доступным, простым и интересным языком. Используй живые аналогии, структурированное оформление и шаг за шагом веди к глубокому интуитивному пониманию темы.',
    createdAt: '2026-06-13T00:00:00.000Z',
    isSystem: true
  },
  {
    id: 'funny',
    name: 'Острослов',
    trigger: 'funny',
    description: 'Отвечает с юмором, тонкой иронией или сарказмом.',
    instructions: 'Ты — невероятно саркастичный, остроумный и ироничный собеседник с острым умом. Отвечай на запросы пользователя точно и по факту, но щедро приправляй свои реплики тонким юмором, здоровым сарказмом и иронией. Общение должно быть живым, как в хорошем стендапе.',
    createdAt: '2026-06-13T00:00:00.000Z',
    isSystem: true
  }
];

const INITIAL_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'supabase',
    name: 'Supabase Database REST',
    description: 'Интегрирует вашу облачную Postgres БД через REST API. Позволяет читать строки из таблиц по запросу /supabase.',
    isEnabled: false,
    value: 'users',
    placeholder: 'Имя таблицы (например, users, products)',
    label: 'Таблица по умолчанию',
    fields: [
      {
        key: 'SUPABASE_URL',
        label: 'Supabase Project URL',
        value: '',
        type: 'text',
        placeholder: 'https://xxx.supabase.co'
      },
      {
        key: 'SUPABASE_ANON_KEY',
        label: 'Supabase Anon / Public Key',
        value: '',
        type: 'password',
        placeholder: 'eyJhbGciOiJIUzI1Ni...'
      }
    ]
  },
  {
    id: 'github',
    name: 'GitHub Developer API',
    description: 'Интегрирует репозитории GitHub. Считывает 이슈, коммиты, пулреквесты и релизы.',
    isEnabled: false,
    value: 'facebook/react',
    placeholder: 'owner/repository (например, facebook/react)',
    label: 'Репозиторий по умолчанию',
    fields: [
      {
        key: 'GITHUB_TOKEN',
        label: 'Personal Access Token (Необязательно)',
        value: '',
        type: 'password',
        placeholder: 'ghp_...'
      }
    ]
  },
  {
    id: 'vercel',
    name: 'Vercel Deployment Tracker',
    description: 'Следит за статусом деплоев вашего проекта на Vercel.',
    isEnabled: false,
    value: '',
    placeholder: 'ID или имя проекта Vercel',
    label: 'Имя проекта Vercel',
    fields: [
      {
        key: 'VERCEL_TOKEN',
        label: 'Vercel API Token',
        value: '',
        type: 'password',
        placeholder: 'Vercel Personal/Team Token'
      }
    ]
  },
  {
    id: 'firebase',
    name: 'Firebase Firestore REST',
    description: 'Интегрирует Firestore БД для быстрого чтения данных из коллекций.',
    isEnabled: false,
    value: 'users',
    placeholder: 'Имя коллекции (например, users, chats)',
    label: 'Коллекция по умолчанию',
    fields: [
      {
        key: 'FIREBASE_PROJECT_ID',
        label: 'Firebase Project ID',
        value: '',
        type: 'text',
        placeholder: 'my-project-12345'
      }
    ]
  }
];

export default function App() {
  const [isLeftOpen, setIsLeftOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Notification states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yorn_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Legal policy states
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // Compliance security log states
  const [isAbuseLogsOpen, setIsAbuseLogsOpen] = useState(false);

  // Subscribe to real-time notification broadcasts
  useEffect(() => {
    let isFirstLoad = true;
    const unsubscribe = subscribeToNotifications((list) => {
      setNotifications(list);
      
      // If there's an incoming new message that we have not read, trigger a top toast
      if (!isFirstLoad && list.length > 0) {
        const latest = list[0];
        const localRead = localStorage.getItem('yorn_read_notifications');
        const readIds: string[] = localRead ? JSON.parse(localRead) : [];
        if (!readIds.includes(latest.id)) {
          setActiveToast(latest);
          triggerHaptic(65); // Strong haptic on real-time alert
        }
      }
      isFirstLoad = false;
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      const updated = [...readNotificationIds, id];
      setReadNotificationIds(updated);
      localStorage.setItem('yorn_read_notifications', JSON.stringify(updated));
    }
  };

  const handleMarkAllAsRead = () => {
    const unread = notifications.filter(n => !readNotificationIds.includes(n.id));
    if (unread.length > 0) {
      const updated = [...readNotificationIds, ...unread.map(n => n.id)];
      setReadNotificationIds(updated);
      localStorage.setItem('yorn_read_notifications', JSON.stringify(updated));
      triggerHaptic(15);
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setReadNotificationIds([]);
    localStorage.removeItem('yorn_read_notifications');
    localStorage.setItem('yorn_local_notifications', JSON.stringify([]));
    triggerHaptic(20);
  };

  const handlePublishBroadcast = async (notifData: Omit<AppNotification, 'id'>) => {
    await publishNotification(notifData);
    triggerHaptic(40);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    setTypingLabel(undefined);
    triggerHaptic(30);
  };

  const handleLogout = () => {
    if (user?.uid === 'guest-local-user') {
      setUser(null);
    } else {
      signOut(auth);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      if (user.uid !== 'guest-local-user' && auth.currentUser) {
        await auth.currentUser.delete();
        alert('Ваш аккаунт был успешно удален.');
      } else {
        setUser(null);
        alert('Гостевой аккаунт был успешно сброшен.');
      }
      localStorage.removeItem('yorn_integrations');
      localStorage.removeItem('selected_session_id');
      setSessions([]);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        alert('Для совершения этого действия требуется повторный вход в аккаунт. Пожалуйста, выполните повторный вход, чтобы подтвердить свою личность, а затем попробуйте снова.');
        signOut(auth);
      } else {
        alert('Ошибка при удалении аккаунта: ' + error.message);
      }
    }
  };

  useEffect(() => {
    const detectDevice = () => {
      const uA = navigator.userAgent || '';
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const isSmall = window.innerWidth < 1024;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(uA);
      setIsMobileDevice(isMobileUA || (isTouch && isSmall));
    };
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const triggerHaptic = (ms = 12) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // Safe fall-through
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [customSkills, setCustomSkills] = useState<Skill[]>([]);
  const [isSkillsHubOpen, setIsSkillsHubOpen] = useState(false);
  
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => {
    try {
      const saved = localStorage.getItem('yorn_integrations');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure the saved integration scheme represents our new developer-centric schema with fields
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].fields !== undefined) {
          return parsed.filter(i => ['supabase', 'github', 'vercel', 'firebase'].includes(i.id));
        }
      }
      return INITIAL_INTEGRATIONS;
    } catch {
      return INITIAL_INTEGRATIONS;
    }
  });

  const handleUpdateIntegrations = (newIntegrations: IntegrationConfig[]) => {
    setIntegrations(newIntegrations);
    localStorage.setItem('yorn_integrations', JSON.stringify(newIntegrations));
    triggerHaptic(15);
  };
  
  useEffect(() => {
    const uid = user ? user.uid : 'guest-local-user';
    loadUserSkills(uid)
      .then(loadedSkills => {
        setCustomSkills(loadedSkills);
      })
      .catch(err => {
        console.error("Failed to load custom skills:", err);
      });
  }, [user]);

  const handleSaveSkill = async (newSkill: Skill) => {
    const uid = user ? user.uid : 'guest-local-user';
    await saveUserSkill(uid, newSkill);
    setCustomSkills(prev => {
      const idx = prev.findIndex(s => s.id === newSkill.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSkill;
        return copy;
      }
      return [newSkill, ...prev];
    });
  };

  const handleDeleteSkill = async (skillId: string) => {
    const uid = user ? user.uid : 'guest-local-user';
    await deleteUserSkill(uid, skillId);
    setCustomSkills(prev => prev.filter(s => s.id !== skillId));
  };
  
  useEffect(() => {
    if (user) {
      setDbLoading(true);
      loadUserSessions(user.uid)
        .then(loadedSessions => {
          setSessions(loadedSessions);
        })
        .catch(err => {
          console.error("Failed to load sessions from Firestore:", err);
        })
        .finally(() => {
          setDbLoading(false);
        });
    } else {
      setSessions([]);
      setCurrentSessionId(null);
    }
  }, [user]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'mini' | 'base' | 'max' | 'auto' | 'image'>('auto');
  const [theme, setTheme] = useState(() => localStorage.getItem('yorn_theme') || 'dark');
  const [hubStyle, setHubStyle] = useState<'default' | 'cyberpunk' | 'glass' | 'brutalist'>('default');
  const [chatStyle, setChatStyle] = useState<'default' | 'cyberpunk' | 'glass' | 'brutalist'>('default');
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('yorn_prompt') || 'Вы — YorN AI, продвинутый, тактичный и лаконичный ИИ-ассистент, помогающий пользователю в любых задачах. Вы общаетесь вежливо, компетентно и отвечаете четко, по существу.');
  const [showTts, setShowTts] = useState(() => {
    const saved = localStorage.getItem('yorn_show_tts');
    return saved === null ? true : saved === 'true';
  });
  const [showRegenerate, setShowRegenerate] = useState(() => {
    const saved = localStorage.getItem('yorn_show_regenerate');
    return saved === null ? true : saved === 'true';
  });
  const [loadingAnimation, setLoadingAnimation] = useState(() => {
    return localStorage.getItem('yorn_loading_animation') || 'default';
  });
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('yorn_temperature');
    return saved === null ? 0.70 : parseFloat(saved);
  });
  const [topP, setTopP] = useState(() => {
    const saved = localStorage.getItem('yorn_top_p');
    return saved === null ? 0.90 : parseFloat(saved);
  });

  useEffect(() => {
    localStorage.setItem('yorn_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.removeItem('yorn_hub_style');
    localStorage.removeItem('yorn_chat_style');
  }, []);

  useEffect(() => {
    localStorage.setItem('yorn_prompt', systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    localStorage.setItem('yorn_show_tts', String(showTts));
  }, [showTts]);

  useEffect(() => {
    localStorage.setItem('yorn_show_regenerate', String(showRegenerate));
  }, [showRegenerate]);

  useEffect(() => {
    localStorage.setItem('yorn_loading_animation', loadingAnimation);
  }, [loadingAnimation]);

  useEffect(() => {
    localStorage.setItem('yorn_temperature', String(temperature));
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('yorn_top_p', String(topP));
  }, [topP]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)
      ) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+S (Save page)
      if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDeleteSession = async (id: string) => {
    triggerHaptic(20);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
    if (user) {
      try {
        await deleteFirestoreSession(id);
      } catch (err) {
        console.error("Failed to delete session online:", err);
      }
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    triggerHaptic(10);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    if (user) {
      try {
        await updateFirestoreSessionTitle(id, newTitle);
      } catch (err) {
        console.error("Failed to rename session online:", err);
      }
    }
  };

  const handlePinSession = async (id: string, isPinned: boolean) => {
    triggerHaptic(10);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned } : s));
    if (user) {
      try {
        await updateFirestoreSessionPin(id, isPinned);
      } catch (err) {
        console.error("Failed to pin/unpin session online:", err);
      }
    }
  };


  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];

  const handleNewChat = () => {
    triggerHaptic(15);
    setCurrentSessionId(null);
    if (window.innerWidth < 1024) setIsLeftOpen(false);
  };

  const handleSelectSession = (id: string) => {
    triggerHaptic(10);
    setCurrentSessionId(id);
    if (window.innerWidth < 1024) setIsLeftOpen(false);
  };

  const handleSaveEditedImage = async (editedImageUrl: string, editPrompt: string) => {
    const activeSessionId = currentSessionId;
    if (!activeSessionId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Редактирование фрагмента изображения: "${editPrompt}"`,
      timestamp: new Date().toISOString()
    };

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Изображение было успешно отредактировано с помощью ИИ.',
      timestamp: new Date().toISOString(),
      imageUrl: editedImageUrl,
      imageModel: 'YorN IMAGE'
    };

    setSessions(prevSessions => prevSessions.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: [...s.messages, userMsg, assistantMsg] } 
        : s
    ));

    try {
      await saveFirestoreMessage(activeSessionId, userMsg);
      await saveFirestoreMessage(activeSessionId, assistantMsg);
    } catch (err) {
      console.error("Error saving edited image messages to Firestore:", err);
    }

    triggerHaptic(12);
  };

  const handleSendMessage = async (content: string, rawAttachments?: { name: string; content: string; size: string }[]) => {
    if (isTyping) {
      return;
    }

    if (content.trim().startsWith('/skill')) {
      setIsSkillsHubOpen(true);
      return;
    }

    if (!user) {
      alert("Пожалуйста, войдите в систему, чтобы отправлять сообщения.");
      return;
    }

    let activeSkill: Skill | undefined = undefined;
    const commandMatch = content.trim().match(/^\/([a-zA-Z0-9_]+)/);
    if (commandMatch) {
      const triggerWord = commandMatch[1].toLowerCase();
      const foundSkill = [...DEFAULT_SKILLS, ...customSkills].find(s => s.trigger === triggerWord);
      if (foundSkill) {
        activeSkill = foundSkill;
      }
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      attachments: rawAttachments ? rawAttachments.map(r => ({ name: r.name, size: r.size })) : undefined,
    };
    
    let activeSessionId = currentSessionId;
    const isNewSession = !activeSessionId;
    
    if (isNewSession) {
      activeSessionId = Date.now().toString();
    }

    // Security compliance audit: scan user question for dangerous triggers
    const matchedSecurityTriggers = detectDangerousKeywords(content);
    let isBlockedBySecurity = false;
    
    if (matchedSecurityTriggers.length > 0) {
      logDangerousRequest(activeSessionId, content, matchedSecurityTriggers)
        .catch(err => console.error("Failed to commit security compliance audit log:", err));
        
      const securityPolicy = localStorage.getItem('yorn_security_policy') || 'logging';
      if (securityPolicy === 'blocking') {
        isBlockedBySecurity = true;
      }
    }
    
    if (isNewSession) {
      const dateStr = new Date().toLocaleDateString('ru-RU');
      const createdAtStr = new Date().toISOString();
      const newSession: ChatSession = {
         id: activeSessionId,
         title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
         date: dateStr,
         messages: [newUserMsg]
      };
      
      setCurrentSessionId(activeSessionId);
      setSessions(prev => [newSession, ...prev]);

      try {
        await saveFirestoreSession(user.uid, activeSessionId, newSession.title, dateStr, createdAtStr);
        await saveFirestoreMessage(activeSessionId, newUserMsg);
      } catch (err) {
        console.error("Error saving new session to Firestore:", err);
      }
    } else {
      setSessions(prev => prev.map(s => {
         if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, newUserMsg] };
         }
         return s;
      }));

      try {
        await saveFirestoreMessage(activeSessionId, newUserMsg);
      } catch (err) {
        console.error("Error saving message to Firestore:", err);
      }
    }

    // Crisis intervention: if query is about suicide or self-harm, display maximum supportive care immediately
    const isSuicide = isSuicideQuery(content);
    if (isSuicide) {
      const suicideSupportMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: `Служба психологической поддержки.`,
         timestamp: new Date().toISOString(),
         isAnimated: false,
         isSuicideSupport: true
      };
      
      setSessions(prev => prev.map(s => {
         if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, suicideSupportMsg] };
         }
         return s;
      }));
      
      try {
         await saveFirestoreMessage(activeSessionId, suicideSupportMsg);
      } catch (err) {
         console.error("Error saving automatic suicide helper reply:", err);
      }
      return;
    }

    // Crisis intervention: if query is about drugs/substance abuse, display maximum recovery care immediately
    const isDrug = isDrugQuery(content);
    if (isDrug) {
      const drugSupportMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: `Наркологическая реабилитационная служба.`,
         timestamp: new Date().toISOString(),
         isAnimated: false,
         isDrugSupport: true
      };
      
      setSessions(prev => prev.map(s => {
         if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, drugSupportMsg] };
         }
         return s;
      }));
      
      try {
         await saveFirestoreMessage(activeSessionId, drugSupportMsg);
      } catch (err) {
         console.error("Error saving automatic drug helper reply:", err);
      }
      return;
    }

    // Crisis intervention: if query is about terrorism/violence, display radicalization prevention info immediately
    const isTerrorism = isTerrorismQuery(content);
    if (isTerrorism) {
      const terrorismSupportMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: `Служба антитеррористической безопасности.`,
         timestamp: new Date().toISOString(),
         isAnimated: false,
         isTerrorismSupport: true
      };
      
      setSessions(prev => prev.map(s => {
         if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, terrorismSupportMsg] };
         }
         return s;
      }));
      
      try {
         await saveFirestoreMessage(activeSessionId, terrorismSupportMsg);
      } catch (err) {
         console.error("Error saving automatic terrorism helper reply:", err);
      }
      return;
    }

    if (isBlockedBySecurity) {
      const complianceBotMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: `🚨 **ДОСТУП ЗАБЛОКИРОВАН ОФИЦЕРОМ ИБ**\n\nВаш запрос содержит недопустимые ключевые слова/действия и заблокирован в соответствии со спецификацией **RF-152**.\n\n*   **Обнаруженные триггеры**: ${matchedSecurityTriggers.map(t => `\`${t}\``).join(', ')}\n*   **Защитное действие**: Запрос не отправлен на сервера API-ассистента для обеспечения безопасности.\n\n*Событие зафиксировано в архивах аудита Firestore и Вашей БД Supabase.*`,
         timestamp: new Date().toISOString(),
         isAnimated: true,
      };
      
      setSessions(prev => prev.map(s => {
         if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, complianceBotMsg] };
         }
         return s;
      }));
      
      try {
         await saveFirestoreMessage(activeSessionId, complianceBotMsg);
      } catch (err) {
         console.error("Error saving automatic security reply:", err);
      }
      return;
    }

    setIsTyping(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if ((mode as string) === 'plan') {
      try {
        setTypingLabel("создание плана...");
        
        let combinedUserText = content;
        if (rawAttachments && rawAttachments.length > 0) {
          const filesContext = rawAttachments.map(att => {
            const displayContent = (att.content && att.content.startsWith('data:image/'))
              ? `[Изображение/Иллюстрация: ${att.name}]`
              : att.content;
            return `--- НАЧАЛО ФАЙЛА "${att.name}" (${att.size}) ---\n${displayContent}\n--- КОНЕЦ ФАЙЛА "${att.name}" ---`;
          }).join('\n\n');
          combinedUserText = `${filesContext}\n\n${content}`;
        }

        // Prepare planning history
        const messagesForPlanning = [
          ...currentMessages.map(m => ({ role: m.role, content: m.content })),
          { 
            role: 'user', 
            content: `Пожалуйста, составь подробный пошаговый план действий (из 3-5 шагов) для решения следующей задачи: "${content}". Учти все приложенные файлы при планировании. Выведи ТОЛЬКО план с понятным заголовком "📋 План действий для решения задачи", больше ничего лишнего не пиши.` 
          }
        ];

        const planResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesForPlanning,
            mode: 'tech',
            systemPrompt: systemPrompt + (activeSkill ? `\n\n[РЕЖИМ НАВЫКА "${activeSkill.name}"]: ${activeSkill.instructions}` : ''),
            temperature: temperature,
            topP: topP,
            integrations: integrations
          })
        });

        const planData = await planResponse.json();
        const planText = planResponse.ok ? (planData.reply || "План не сгенерирован") : "Ошибка генерации плана.";
        
        const planBotMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: planText,
          timestamp: new Date().toISOString(),
          isAnimated: true,
        };

        setSessions(prevSessions => prevSessions.map(s => 
          s.id === activeSessionId 
            ? { ...s, messages: [...s.messages, planBotMsg] } 
            : s
        ));

        try {
          await saveFirestoreMessage(activeSessionId!, planBotMsg);
        } catch (err) {
          console.error("Error saving plan reply to Firestore:", err);
        }

        // Wait a short bit and set label to execution
        setTypingLabel("выполнение плана...");

        const messagesForExecution = [
          ...currentMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: combinedUserText },
          { role: 'assistant', content: planText },
          { 
            role: 'user', 
            content: `Отлично! Теперь детально реши задачу, строго придерживаясь данного плана решения шаг за шагом.` 
          }
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesForExecution,
            mode: 'tech',
            systemPrompt: systemPrompt + (activeSkill ? `\n\n[РЕЖИМ НАВЫКА "${activeSkill.name}"]: ${activeSkill.instructions}` : ''),
            temperature: temperature,
            topP: topP,
            integrations: integrations
          })
        });

        const data = await response.json();
        const botContent = response.ok ? (data.reply || "Пустой ответ") : `Ошибка: ${data.error || 'Не удалось выполнить созданный план.'}`;

        const newBotMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: botContent,
          timestamp: new Date().toISOString(),
          isAnimated: true,
        };

        setSessions(prevSessions => prevSessions.map(s => 
          s.id === activeSessionId 
            ? { ...s, messages: [...s.messages, newBotMsg] } 
            : s
        ));

        try {
          await saveFirestoreMessage(activeSessionId!, newBotMsg);
        } catch (err) {
          console.error("Error saving final text response to Firestore:", err);
        }

      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.log("Planning mode was aborted");
          const stoppedMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "⏹️ *Генерация ответа остановлена пользователем.*",
            timestamp: new Date().toISOString(),
            isAnimated: true,
          };
          setSessions(prevSessions => prevSessions.map(s => 
            s.id === activeSessionId 
              ? { ...s, messages: [...s.messages, stoppedMsg] } 
              : s
          ));
          try {
            await saveFirestoreMessage(activeSessionId!, stoppedMsg);
          } catch (err) {
            console.error("Error saving aborted plan message:", err);
          }
          return;
        }
        const newBotMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Произошла сетевая ошибка во время выполнения по плану.",
          timestamp: new Date().toISOString(),
          isAnimated: true,
        };
        setSessions(prevSessions => prevSessions.map(s => 
          s.id === activeSessionId 
            ? { ...s, messages: [...s.messages, newBotMsg] } 
            : s
        ));
      } finally {
        triggerHaptic(12);
        setIsTyping(false);
        setTypingLabel(undefined);
      }
      return;
    }

    try {
      // Get the full message history to send to API
      // Since we want the model to see the attachments' contents, we construct message history with merged file texts
      const sessionObj = sessions.find(s => s.id === activeSessionId);
      const history = sessionObj ? sessionObj.messages : [];
      
      let combinedUserText = content;
      if (rawAttachments && rawAttachments.length > 0) {
        const filesContext = rawAttachments.map(att => {
          const displayContent = (att.content && att.content.startsWith('data:image/'))
            ? `[Изображение/Иллюстрация: ${att.name}]`
            : att.content;
          return `--- НАЧАЛО ФАЙЛА "${att.name}" (${att.size}) ---\n${displayContent}\n--- КОНЕЦ ФАЙЛА "${att.name}" ---`;
        }).join('\n\n');
        combinedUserText = `${filesContext}\n\n${content}`;
      }

      let botContent = '';
      let botImageUrl: string | undefined = undefined;
      let botImageModel: string | undefined = undefined;

      let effectiveMode = mode;
      if (mode === 'auto') {
        const lowerText = combinedUserText.toLowerCase();
        const imageKeywords = ['нарисуй', 'сгенерируй фото', 'сгенерируй картинку', 'сгенерируй изображение', 'создай фото', 'создай картинку', 'создай изображение', 'сделай фото', 'сделай картинку', 'сделай изображение', 'generate image', 'generate photo', 'generate picture'];
        if (imageKeywords.some(kw => lowerText.includes(kw))) {
          effectiveMode = 'image';
        }
      }

      if (effectiveMode === 'image') {
        setTypingLabel("Генерация изображения...");
        const response = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ prompt: combinedUserText })
        });
        const data = await response.json();
        if (response.ok && data.imageUrl) {
          botContent = `Изображение сгенерировано.`;
          botImageUrl = data.imageUrl;
          botImageModel = data.model;
        } else {
          botContent = `Ошибка генерации: ${data.error || 'Сбой API.'}`;
        }
      } else {
        const messagesToSend = [
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: combinedUserText }
        ];
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesToSend,
            mode: effectiveMode,
            systemPrompt: systemPrompt + (activeSkill ? `\n\n[РЕЖИМ НАВЫКА "${activeSkill.name}"]: ${activeSkill.instructions}` : ''),
            temperature: temperature,
            topP: topP,
            integrations: integrations
          })
        });

        const data = await response.json();
        botContent = response.ok ? (data.reply || "Пустой ответ") : `Ошибка: ${data.error || 'Не удалось подключиться к моделям.'}`;
      }
      
      const newBotMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: botContent,
         timestamp: new Date().toISOString(),
         isAnimated: true,
         imageUrl: botImageUrl,
         imageModel: botImageModel,
      };
      
      setSessions(prevSessions => prevSessions.map(s => 
         s.id === activeSessionId 
           ? { ...s, messages: [...s.messages, newBotMsg] } 
           : s
      ));

      try {
        await saveFirestoreMessage(activeSessionId!, newBotMsg);
      } catch (err) {
        console.error("Error saving bot reply to Firestore:", err);
      }
      
    } catch (e: any) {
       if (e.name === 'AbortError') {
         console.log("Chat generation was aborted");
         const stoppedMsg: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: "⏹️ *Генерация ответа остановлена пользователем.*",
           timestamp: new Date().toISOString(),
           isAnimated: true,
         };
         setSessions(prevSessions => prevSessions.map(s => 
           s.id === activeSessionId 
             ? { ...s, messages: [...s.messages, stoppedMsg] } 
             : s
         ));
         try {
           await saveFirestoreMessage(activeSessionId!, stoppedMsg);
         } catch (err) {
           console.error("Error saving aborted message:", err);
         }
         return;
       }
       const newBotMsg: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: "Сетевая ошибка при связи с сервером.",
           timestamp: new Date().toISOString(),
           isAnimated: true,
       };
       setSessions(prevSessions => prevSessions.map(s => 
         s.id === activeSessionId 
           ? { ...s, messages: [...s.messages, newBotMsg] } 
           : s
       ));

       try {
         await saveFirestoreMessage(activeSessionId!, newBotMsg);
       } catch (err) {
         console.error("Error saving error bot reply to Firestore:", err);
       }
    } finally {
       triggerHaptic(12);
       setIsTyping(false);
    }
  };

  const handleRegenerateMessage = async () => {
    if (isTyping) return;
    if (!currentSessionId || !user) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session || session.messages.length === 0) return;

    // Находим индекс последнего сообщения пользователя
    let lastUserMessageIdx = -1;
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === 'user') {
        lastUserMessageIdx = i;
        break;
      }
    }

    if (lastUserMessageIdx === -1) return;

    // Оставляем только сообщения до последнего отправленного пользователем включительно
    const messagesToKeep = session.messages.slice(0, lastUserMessageIdx + 1);
    const messagesToDelete = session.messages.slice(lastUserMessageIdx + 1);

    let activeRegenSkill: Skill | undefined = undefined;
    const lastUserMsg = messagesToKeep[messagesToKeep.length - 1];
    if (lastUserMsg && lastUserMsg.content) {
      const commandMatch = lastUserMsg.content.trim().match(/^\/([a-zA-Z0-9_]+)/);
      if (commandMatch) {
        const triggerWord = commandMatch[1].toLowerCase();
        const foundSkill = [...DEFAULT_SKILLS, ...customSkills].find(s => s.trigger === triggerWord);
        if (foundSkill) {
          activeRegenSkill = foundSkill;
        }
      }
    }

    // Delete discarded elements in Firestore first
    try {
      for (const m of messagesToDelete) {
        await deleteDoc(doc(db, `sessions/${currentSessionId}/messages`, m.id));
      }
    } catch (err) {
      console.error("Error deleting old assistant messages in Firestore:", err);
    }

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: messagesToKeep };
      }
      return s;
    }));

    setIsTyping(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if ((mode as string) === 'plan') {
      try {
        setTypingLabel("создание плана...");
        const lastUserMsg = messagesToKeep[messagesToKeep.length - 1];
        const history = messagesToKeep.slice(0, messagesToKeep.length - 1);

        // Prepare planning history
        const messagesForPlanning = [
          ...history.map(m => ({ role: m.role, content: m.content })),
          { 
            role: 'user', 
            content: `Пожалуйста, составь подробный пошаговый план действий (из 3-5 шагов) для решения следующей задачи: "${lastUserMsg.content}". Учти все приложенные файлы при планировании. Выведи ТОЛЬКО план с понятным заголовком "📋 План действий для решения задачи", больше ничего лишнего не пиши.` 
          }
        ];

        const planResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesForPlanning,
            mode: 'tech',
            systemPrompt: systemPrompt + (activeRegenSkill ? `\n\n[РЕЖИМ НАВЫКА "${activeRegenSkill.name}"]: ${activeRegenSkill.instructions}` : ''),
            temperature: temperature,
            topP: topP
          })
        });

        const planData = await planResponse.json();
        const planText = planResponse.ok ? (planData.reply || "План не сгенерирован") : "Ошибка генерации плана.";

        const planBotMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: planText,
          timestamp: new Date().toISOString(),
          isAnimated: true,
        };

        // Render the plan intermediate message
        setSessions(prevSessions => prevSessions.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [...messagesToKeep, planBotMsg] } 
            : s
        ));

        try {
          await saveFirestoreMessage(currentSessionId, planBotMsg);
        } catch (err) {
          console.error("Error saving plan reply to Firestore during regen:", err);
        }

        setTypingLabel("выполнение плана...");

        const messagesForExecution = [
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: lastUserMsg.content },
          { role: 'assistant', content: planText },
          { 
            role: 'user', 
            content: `Отлично! Теперь детально реши задачу, строго придерживаясь данного плана решения шаг за шагом.` 
          }
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesForExecution,
            mode: 'tech',
            systemPrompt: systemPrompt + (activeRegenSkill ? `\n\n[РЕЖИМ НАВЫКА "${activeRegenSkill.name}"]: ${activeRegenSkill.instructions}` : ''),
            temperature: temperature,
            topP: topP
          })
        });

        const data = await response.json();
        const botContent = response.ok ? (data.reply || "Пустой ответ") : `Ошибка: ${data.error || 'Не удалось выполнить созданный план.'}`;

        const newBotMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: botContent,
          timestamp: new Date().toISOString(),
          isAnimated: true,
        };

        // Display the final combined response
        setSessions(prevSessions => prevSessions.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [...messagesToKeep, planBotMsg, newBotMsg] } 
            : s
        ));

        try {
          await saveFirestoreMessage(currentSessionId, newBotMsg);
        } catch (err) {
          console.error("Error saving final text response to Firestore during regen:", err);
        }

      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log("Regenerate planning was aborted");
          return;
        }
        console.error("Error in plan mode regeneration:", err);
      } finally {
        triggerHaptic(12);
        setIsTyping(false);
        setTypingLabel(undefined);
      }
      return;
    }

    const lastUserMsgToKeep = messagesToKeep[messagesToKeep.length - 1];
    let effectiveMode = mode;
    if (mode === 'auto' && lastUserMsgToKeep) {
      const lowerText = lastUserMsgToKeep.content.toLowerCase();
      const imageKeywords = ['нарисуй', 'сгенерируй фото', 'сгенерируй картинку', 'сгенерируй изображение', 'создай фото', 'создай картинку', 'создай изображение', 'сделай фото', 'сделай картинку', 'сделай изображение', 'generate image', 'generate photo', 'generate picture'];
      if (imageKeywords.some(kw => lowerText.includes(kw))) {
        effectiveMode = 'image';
      }
    }

    try {
      let botContent = '';
      let botImageUrl: string | undefined = undefined;
      let botImageModel: string | undefined = undefined;

      if (effectiveMode === 'image') {
        setTypingLabel("Генерация изображения...");
        const response = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ prompt: lastUserMsgToKeep.content })
        });
        const data = await response.json();
        if (response.ok && data.imageUrl) {
          botContent = `Изображение сгенерировано.`;
          botImageUrl = data.imageUrl;
          botImageModel = data.model;
        } else {
          botContent = `Ошибка генерации: ${data.error || 'Сбой API.'}`;
        }
      } else {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesToKeep.map(m => ({ role: m.role, content: m.content })),
            mode: effectiveMode,
            systemPrompt: systemPrompt + (activeRegenSkill ? `\n\n[РЕЖИМ НАВЫКА "${activeRegenSkill.name}"]: ${activeRegenSkill.instructions}` : ''),
            temperature: temperature,
            topP: topP
          })
        });

        const data = await response.json();
        botContent = response.ok ? (data.reply || "Пустой ответ") : `Ошибка: ${data.error || 'Не удалось подключиться к моделям.'}`;
      }

      const newBotMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: botContent,
         timestamp: new Date().toISOString(),
         isAnimated: true,
         imageUrl: botImageUrl,
         imageModel: botImageModel,
      };

      setSessions(prevSessions => prevSessions.map(s => 
         s.id === currentSessionId 
           ? { ...s, messages: [...messagesToKeep, newBotMsg] } 
           : s
      ));

      try {
        await saveFirestoreMessage(currentSessionId, newBotMsg);
      } catch (err) {
        console.error("Error saving regenerated response to Firestore:", err);
      }
      
    } catch (e: any) {
       if (e.name === 'AbortError') {
         console.log("Regenerate standard message was aborted");
         const stoppedMsg: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: "⏹️ *Генерация ответа остановлена пользователем.*",
           timestamp: new Date().toISOString(),
           isAnimated: true,
         };
         setSessions(prevSessions => prevSessions.map(s => 
           s.id === currentSessionId 
             ? { ...s, messages: [...messagesToKeep, stoppedMsg] } 
             : s
         ));
         try {
           await saveFirestoreMessage(currentSessionId, stoppedMsg);
         } catch (err) {
           console.error("Error saving aborted message:", err);
         }
         return;
       }
       const newBotMsg: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: "Сетевая ошибка при связи с сервером.",
           timestamp: new Date().toISOString(),
           isAnimated: true,
       };
       setSessions(prevSessions => prevSessions.map(s => 
         s.id === currentSessionId 
           ? { ...s, messages: [...messagesToKeep, newBotMsg] } 
           : s
       ));

       try {
         await saveFirestoreMessage(currentSessionId, newBotMsg);
       } catch (err) {
         console.error("Error saving regenerated error message to Firestore:", err);
       }
    } finally {
       triggerHaptic(12);
       setIsTyping(false);
    }
  };

  if (showSplash) {
    return (
      <SplashLoader 
        isLoading={authLoading} 
        onComplete={() => setShowSplash(false)} 
        theme={theme} 
      />
    );
  }

  if (!user) {
    return (
      <div className="relative h-[100dvh] w-full flex overflow-hidden" data-theme={theme}>
        <Background />
        <div className="z-10 flex w-full h-full items-center justify-center p-4">
          <div className="bg-[#111111]/80 backdrop-blur-xl border border-[#222] p-8 rounded-2xl max-w-sm w-full flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-full border border-[#333] flex items-center justify-center mb-6 shadow-inner">
               <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">Y</span>
            </div>
            <h1 className="text-xl font-semibold text-[#E0E0E0] mb-2 text-center text-balance font-sans">
              Добро пожаловать!<br />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500 mt-1 inline-block">YorN AI</span>
            </h1>
            <p className="text-xs text-[#888] text-center mb-8 text-balance font-sans leading-relaxed">
              Выберите способ авторизации для безопасного сохранения данных и продолжения общения.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => {
                  signInWithPopup(auth, googleProvider).catch((error) => {
                    if (error.code === 'auth/unauthorized-domain') {
                      alert('Для работы авторизации необходимо добавить домен этого приложения в Firebase Console -> Authentication -> Settings -> Authorized domains. Добавьте этот домен: ' + window.location.hostname);
                    } else {
                      alert('Ошибка при авторизации: ' + error.message);
                    }
                  });
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-black rounded-lg transition-colors flex items-center justify-center gap-3 font-semibold text-xs keep-original-color cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="keep-original-color">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Войти через Google
              </button>

              <button 
                onClick={() => {
                  signInWithPopup(auth, githubProvider).catch((error) => {
                    if (error.code === 'auth/unauthorized-domain') {
                      alert('Для работы авторизации необходимо добавить домен этого приложения в Firebase Console -> Authentication -> Settings -> Authorized domains. Добавьте этот домен: ' + window.location.hostname);
                    } else if (error.code === 'auth/operation-not-allowed') {
                      alert('Эта функция не активирована. Чтобы войти через GitHub, перейдите в Firebase Console -> Authentication -> Sign-in method, включите провайдера GitHub и укажите Client ID / Client Secret, полученные в настройках Discord/GitHub Developer settings.');
                    } else {
                      alert('Ошибка авторизации через GitHub: ' + error.message + '\n\nУбедитесь, что провайдер GitHub включен и настроен в панели Firebase.');
                    }
                  });
                }}
                className="w-full py-2.5 px-4 bg-[#24292F] hover:bg-[#2F363D] text-white border border-[#30363D] rounded-lg transition-colors flex items-center justify-center gap-3 font-semibold text-xs keep-original-color cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="keep-original-color">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.637-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Войти через GitHub
              </button>
            </div>

            {/* Added Policy Links */}
            <div id="login-legal-links" className="mt-6 flex flex-col items-center gap-1.5 text-[10px] text-neutral-500 font-mono">
              <span className="text-[9px] uppercase tracking-wider text-neutral-700">Правовая информация</span>
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                <button 
                  id="login-privacy-link"
                  onClick={() => { setLegalTab('privacy'); setIsLegalOpen(true); }}
                  className="hover:text-purple-400 hover:underline cursor-pointer transition-colors"
                >
                  Политика
                </button>
                <span className="text-neutral-800 select-none">•</span>
                <button 
                  id="login-terms-link"
                  onClick={() => { setLegalTab('terms'); setIsLegalOpen(true); }}
                  className="hover:text-indigo-400 hover:underline cursor-pointer transition-colors"
                >
                  Соглашение
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full flex overflow-hidden" data-theme={theme}>
      <Background isTyping={isTyping && loadingAnimation === 'default'} isMobileDevice={isMobileDevice} />
      
      {/* Main Container */}
      <div className="z-10 flex w-full h-full relative">
        <LeftSidebar 
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          onPinSession={handlePinSession}
          onNewChat={handleNewChat}
          isOpen={isLeftOpen} 
          onClose={() => setIsLeftOpen(false)} 
          onOpenProfile={() => setIsRightOpen(true)}
          user={user}
          onLogin={() => {
            signInWithPopup(auth, googleProvider).catch((error) => {
              if (error.code === 'auth/unauthorized-domain') {
                 alert('Для работы авторизации необходимо добавить домен этого приложения в Firebase Console -> Authentication -> Settings -> Authorized domains. Добавьте этот домен: ' + window.location.hostname);
              } else {
                 alert('Ошибка при авторизации: ' + error.message);
              }
            });
          }}
        />
        
        <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out ${isLeftOpen ? 'lg:pl-[280px]' : 'lg:pl-0'}`}>
          <ChatArea 
            onOpenLeftMenu={() => setIsLeftOpen(true)}
            isLeftOpen={isLeftOpen}
            onOpenRightMenu={() => setIsRightOpen(true)}
            messages={currentMessages}
            isTyping={isTyping}
            typingLabel={typingLabel}
            onSendMessage={handleSendMessage}
            onRegenerate={handleRegenerateMessage}
            onStopGeneration={handleStopGeneration}
            mode={mode}
            onModeChange={setMode}
            showTts={showTts}
            showRegenerate={showRegenerate}
            loadingAnimation={loadingAnimation}
            isMobileDevice={isMobileDevice}
            unreadNotificationsCount={notifications.filter(n => !readNotificationIds.includes(n.id)).length}
            onOpenNotifications={() => setIsNotifOpen(true)}
            customSkills={customSkills}
            systemSkills={DEFAULT_SKILLS}
            onOpenSkillsHub={() => setIsSkillsHubOpen(true)}
            chatStyle={chatStyle}
            onSaveEditedImage={handleSaveEditedImage}
          />
        </div>

        <RightSidebar 
          isOpen={isRightOpen} 
          onClose={() => setIsRightOpen(false)}
          user={user}
          theme={theme}
          setTheme={setTheme}
          hubStyle={hubStyle}
          setHubStyle={setHubStyle}
          chatStyle={chatStyle}
          setChatStyle={setChatStyle}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          showTts={showTts}
          setShowTts={setShowTts}
          showRegenerate={showRegenerate}
          setShowRegenerate={setShowRegenerate}
          loadingAnimation={loadingAnimation}
          setLoadingAnimation={setLoadingAnimation}
          temperature={temperature}
          setTemperature={setTemperature}
          topP={topP}
          setTopP={setTopP}
          isMobileDevice={isMobileDevice}
          onOpenSkillsHub={() => setIsSkillsHubOpen(true)}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onOpenLegal={(tab) => {
            setLegalTab(tab);
            setIsLegalOpen(true);
          }}
          onOpenAbuseLogs={() => setIsAbuseLogsOpen(true)}
        />

        <NotificationsPanel
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          notifications={notifications}
          readNotificationIds={readNotificationIds}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClearNotifications={handleClearNotifications}
          onPublishBroadcast={handlePublishBroadcast}
          isMobileDevice={isMobileDevice}
          currentUserEmail={user?.email || null}
        />

        <SkillsHubModal
          isOpen={isSkillsHubOpen}
          onClose={() => setIsSkillsHubOpen(false)}
          userId={user ? user.uid : 'guest-local-user'}
          customSkills={customSkills}
          systemSkills={DEFAULT_SKILLS}
          onSaveSkill={handleSaveSkill}
          onDeleteSkill={handleDeleteSkill}
          integrations={integrations}
          onUpdateIntegrations={handleUpdateIntegrations}
          hubStyle={hubStyle}
        />

        <LegalModals
          isOpen={isLegalOpen}
          onClose={() => setIsLegalOpen(false)}
          initialTab={legalTab}
        />

        <AbuseLogsModal
          isOpen={isAbuseLogsOpen}
          onClose={() => setIsAbuseLogsOpen(false)}
        />

        {/* Real-time Toast Notification Alert */}
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={() => {
                handleMarkAsRead(activeToast.id);
                setIsNotifOpen(true);
                setActiveToast(null);
              }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[340px] p-4 rounded-2xl bg-[#080808] border border-purple-500/30 shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex gap-3 cursor-pointer items-start select-none"
            >
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 shrink-0">
                <Bell size={14} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Оповещение системы</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(activeToast.id);
                      setActiveToast(null);
                    }}
                    className="text-[#444] hover:text-[#AAA] p-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-xs font-semibold text-white mt-0.5 truncate">{activeToast.title}</p>
                <p className="text-[10px] text-[#888] mt-0.5 line-clamp-2 leading-relaxed">{activeToast.content}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
