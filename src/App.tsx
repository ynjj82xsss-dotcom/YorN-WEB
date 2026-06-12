/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, googleProvider, signInWithPopup, signOut, db } from './lib/firebase';
import { 
  testFirestoreConnection, 
  loadUserSessions, 
  saveFirestoreSession, 
  updateFirestoreSessionTitle, 
  updateFirestoreSessionPin,
  deleteFirestoreSession, 
  saveFirestoreMessage,
  subscribeToNotifications,
  publishNotification
} from './lib/firebaseService';
import Background from './components/Background';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import ChatArea from './components/ChatArea';
import NotificationsPanel from './components/NotificationsPanel';
import { ChatSession, Message, AppNotification } from './types';
import SplashLoader from './components/SplashLoader';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

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
  const [mode, setMode] = useState<'speed' | 'tech' | 'plan'>('tech');
  const [theme, setTheme] = useState(() => localStorage.getItem('yorn_theme') || 'dark');
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

  const handleSendMessage = async (content: string, rawAttachments?: { name: string; content: string; size: string }[]) => {
    if (!user) {
      alert("Пожалуйста, войдите в систему, чтобы отправлять сообщения.");
      return;
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

    setIsTyping(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (mode === 'plan') {
      try {
        setTypingLabel("создание плана...");
        
        let combinedUserText = content;
        if (rawAttachments && rawAttachments.length > 0) {
          const filesContext = rawAttachments.map(att => 
            `--- НАЧАЛО ФАЙЛА "${att.name}" (${att.size}) ---\n${att.content}\n--- КОНЕЦ ФАЙЛА "${att.name}" ---`
          ).join('\n\n');
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
            systemPrompt: systemPrompt,
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
            systemPrompt: systemPrompt,
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
        const filesContext = rawAttachments.map(att => 
          `--- НАЧАЛО ФАЙЛА "${att.name}" (${att.size}) ---\n${att.content}\n--- КОНЕЦ ФАЙЛА "${att.name}" ---`
        ).join('\n\n');
        combinedUserText = `${filesContext}\n\n${content}`;
      }

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
          mode: mode,
          systemPrompt: systemPrompt,
          temperature: temperature,
          topP: topP
        })
      });

      const data = await response.json();
      const botContent = response.ok ? (data.reply || "Пустой ответ") : `Ошибка: ${data.error || 'Не удалось подключиться к моделям.'}`;
      
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
        console.error("Error saving bot reply to Firestore:", err);
      }
      
    } catch (e: any) {
       if (e.name === 'AbortError') {
         console.log("Chat generation was aborted");
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

    if (mode === 'plan') {
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
            systemPrompt: systemPrompt,
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
            systemPrompt: systemPrompt,
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: messagesToKeep.map(m => ({ role: m.role, content: m.content })),
          mode: mode,
          systemPrompt: systemPrompt,
          temperature: temperature,
          topP: topP
        })
      });

      const data = await response.json();
      const botContent = response.ok ? (data.reply || "Пустой ответ") : `Ошибка: ${data.error || 'Не удалось подключиться к моделям.'}`;

      const newBotMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: botContent,
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
        console.error("Error saving regenerated response to Firestore:", err);
      }
      
    } catch (e: any) {
       if (e.name === 'AbortError') {
         console.log("Regenerate standard message was aborted");
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
            <h1 className="text-xl font-semibold text-[#E0E0E0] mb-2 text-center text-balance">Добро пожаловать в Атмосферный Чат</h1>
            <p className="text-sm text-[#888] text-center mb-8 text-balance">
              Войдите с помощью Google, чтобы продолжить общение с искусственным интеллектом.
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
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-black rounded-lg transition-colors flex items-center justify-center gap-3 font-medium keep-original-color cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="keep-original-color">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Войти через Google
              </button>
              
              <button 
                onClick={() => {
                  const guestUser = {
                    uid: 'guest-local-user',
                    displayName: 'Локальный гость',
                    email: 'guest@yorn.ai',
                    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
                    emailVerified: true,
                    isAnonymous: false,
                    metadata: {},
                    providerData: []
                  } as any;
                  setUser(guestUser);
                }}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-white/5 text-[#888] hover:text-[#E0E0E0] border border-[#222] hover:border-[#444] rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Продолжить локально (Без облака)
              </button>
            </div>

            {/* Divider */}
            <div className="w-full h-[1px] bg-[#222] my-6" />

            {/* Technology Stack & Hosting (Render) */}
            <div className="flex flex-col items-center w-full select-none">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#555] mb-3.5 font-bold">
                Стек технологий & Хостинг
              </span>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
                {/* React */}
                <div className="flex items-center gap-1.5" title="React 18">
                  <svg className="w-3.5 h-3.5 text-[#58C4DC] fill-none stroke-current animate-[spin_10s_linear_infinite]" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(30,12,12)" />
                    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(150,12,12)" />
                  </svg>
                  <span className="text-[10px] text-[#A0A0A0] font-mono font-medium">React</span>
                </div>

                {/* Vite */}
                <div className="flex items-center gap-1.5" title="Vite">
                  <svg className="w-3.5 h-3.5 text-[#F6C61C]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.78 3H4.22a.5.5 0 0 0-.41.78l8 15a.5.5 0 0 0 .84 0l8-15a.5.5 0 0 0-.41-.78z M12 18L5.78 6.33h12.44L12 18z" />
                    <path d="M14.5 5.5l-2.5 5 1.5.5-3 5.5L12.5 11l-1.5-.5z" />
                  </svg>
                  <span className="text-[10px] text-[#A0A0A0] font-mono font-medium">Vite</span>
                </div>

                {/* Tailwind */}
                <div className="flex items-center gap-1.5" title="Tailwind CSS">
                  <svg className="w-3.5 h-3.5 text-[#38BDF8]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6.036c-2.43 0-4.05 1.216-4.86 3.649 1.215-1.216 2.632-1.621 4.251-1.216.924.23 1.584.896 2.315 1.634C14.896 11.233 16.03 12.38 18.252 12.38c2.43 0 4.05-1.216 4.86-3.649-1.215 1.216-2.632 1.621-4.25 1.216-.925-.23-1.585-.896-2.317-1.634C15.353 7.182 14.218 6.036 12 6.036zm-4.86 5.43c-2.43 0-4.05 1.216-4.86 3.649 1.215-1.216 2.632-1.621 4.25-1.216.925.23 1.585.896 2.317 1.634 1.189 1.129 2.324 2.275 4.546 2.275 2.43 0 4.05-1.216 4.86-3.649-1.215 1.216-2.632 1.621-4.25 1.216-.925-.23-1.585-.896-2.313-1.634-1.192-1.129-2.327-2.275-4.55-2.275z"/>
                  </svg>
                  <span className="text-[10px] text-[#A0A0A0] font-mono font-medium">Tailwind</span>
                </div>

                {/* Firebase */}
                <div className="flex items-center gap-1.5" title="Firebase">
                  <svg className="w-3.5 h-3.5 text-[#FFCA28]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.877 17.52L5.8 5.75c.08-.47.46-.83.94-.87.49-.03.93.22 1.11.66l2.19 5.48L3.877 17.52zM12 11.02l2.36-4.52c.23-.44.7-.68 1.19-.58.49.1.86.49.91.99l.9 8.78L12 11.02zm8.123 6.5l-3.23-6.19 2.81-5.38a1.002 1.002 0 0 1 1.76.88l-1.34 10.69zM12 21.36l-8.31-4.75L12 10.99l8.31 5.62-8.31 4.75z" />
                  </svg>
                  <span className="text-[10px] text-[#A0A0A0] font-mono font-medium">Firebase</span>
                </div>

                {/* Gemini AI */}
                <div className="flex items-center gap-1.5" title="Gemini AI">
                  <svg className="w-3.5 h-3.5 text-[#A855F7] fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="text-[10px] text-[#A0A0A0] font-mono font-medium">Gemini</span>
                </div>

                {/* Render */}
                <div className="flex items-center gap-1.5" title="Render (Cloud Hosting)">
                  <svg className="w-3.5 h-3.5 text-[#46DE91] fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="12" x2="2" y2="12" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    <line x1="6" y1="16" x2="6.01" y2="16" strokeWidth="2" />
                    <line x1="10" y1="16" x2="10.01" y2="16" strokeWidth="2" />
                  </svg>
                  <span className="text-[10px] text-[#A0A0A0] font-mono font-medium">Render</span>
                </div>
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
          onLogout={() => {
            if (user?.uid === 'guest-local-user') {
              setUser(null);
            } else {
              signOut(auth);
            }
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
          />
        </div>

        <RightSidebar 
          isOpen={isRightOpen} 
          onClose={() => setIsRightOpen(false)}
          user={user}
          theme={theme}
          setTheme={setTheme}
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
