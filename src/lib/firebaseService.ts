import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDocFromServer,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatSession, Message, AppNotification, Skill } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation helper on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Load all sessions & theirs messages for a user
export async function loadUserSessions(userId: string): Promise<ChatSession[]> {
  if (userId === 'guest-local-user') {
    const local = localStorage.getItem('yorn_local_sessions');
    return local ? JSON.parse(local) : [];
  }
  const sessionsPath = 'sessions';
  try {
    const q = query(
      collection(db, sessionsPath), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];

    for (const d of querySnapshot.docs) {
      const data = d.data();
      if (data.isDeleted === true) {
        continue;
      }
      const sId = d.id;
      
      // Load subcollection messages
      const messagesPath = `sessions/${sId}/messages`;
      let messages: Message[] = [];
      try {
        const mq = query(collection(db, messagesPath), orderBy('timestamp', 'asc'));
        const mSnapshot = await getDocs(mq);
        messages = mSnapshot.docs.map(mdoc => {
          const mdata = mdoc.data();
          return {
            id: mdoc.id,
            role: mdata.role,
            content: mdata.content,
            timestamp: mdata.timestamp,
          } as Message;
        });
      } catch (err) {
        // Handle error loading subcollection
        handleFirestoreError(err, OperationType.LIST, messagesPath);
      }

      sessions.push({
        id: sId,
        title: data.title,
        date: data.date,
        isPinned: !!data.isPinned,
        messages: messages,
      });
    }

    return sessions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, sessionsPath);
    return [];
  }
}

// Save/Create a session (metadata only)
export async function saveFirestoreSession(userId: string, sessionId: string, title: string, date: string, createdAt: string) {
  if (userId === 'guest-local-user') {
    const local = localStorage.getItem('yorn_local_sessions');
    const sessions: ChatSession[] = local ? JSON.parse(local) : [];
    const existing = sessions.find(s => s.id === sessionId);
    if (!existing) {
      sessions.push({
        id: sessionId,
        title,
        date,
        messages: []
      });
      localStorage.setItem('yorn_local_sessions', JSON.stringify(sessions));
    }
    return;
  }
  const path = `sessions/${sessionId}`;
  try {
    await setDoc(doc(db, 'sessions', sessionId), {
      userId,
      title,
      date,
      createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update title of a session
export async function updateFirestoreSessionTitle(sessionId: string, title: string) {
  const local = localStorage.getItem('yorn_local_sessions');
  if (local) {
    const sessions: ChatSession[] = JSON.parse(local);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.title = title;
      localStorage.setItem('yorn_local_sessions', JSON.stringify(sessions));
      return;
    }
  }
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), { title });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Update pinned status of a session
export async function updateFirestoreSessionPin(sessionId: string, isPinned: boolean) {
  const local = localStorage.getItem('yorn_local_sessions');
  if (local) {
    const sessions: ChatSession[] = JSON.parse(local);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.isPinned = isPinned;
      localStorage.setItem('yorn_local_sessions', JSON.stringify(sessions));
      return;
    }
  }
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), { isPinned });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Soft-delete a session (marks as deleted but retains data on the server)
export async function deleteFirestoreSession(sessionId: string) {
  const local = localStorage.getItem('yorn_local_sessions');
  if (local) {
    let sessions: ChatSession[] = JSON.parse(local);
    const exists = sessions.some(s => s.id === sessionId);
    if (exists) {
      sessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem('yorn_local_sessions', JSON.stringify(sessions));
      return;
    }
  }

  // We do not delete messages or the session document. We flag it for administrative/compliance retention.
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), {
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Add a single message to a session
export async function saveFirestoreMessage(sessionId: string, message: Message) {
  const local = localStorage.getItem('yorn_local_sessions');
  if (local) {
    const sessions: ChatSession[] = JSON.parse(local);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      if (!session.messages) session.messages = [];
      const mIdx = session.messages.findIndex(m => m.id === message.id);
      if (mIdx >= 0) {
        session.messages[mIdx] = message;
      } else {
        session.messages.push(message);
      }
      localStorage.setItem('yorn_local_sessions', JSON.stringify(sessions));
      return;
    }
  }
  const path = `sessions/${sessionId}/messages/${message.id}`;
  try {
    await setDoc(doc(db, `sessions/${sessionId}/messages`, message.id), {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      userId: auth.currentUser?.uid || 'anonymous',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to real-time general notification broadcasts
export function subscribeToNotifications(
  callback: (notifications: AppNotification[]) => void,
  onError?: (err: any) => void
): () => void {
  const notificationsCol = collection(db, 'notifications');
  const q = query(notificationsCol, orderBy('timestamp', 'desc'), limit(50));

  // Listen to Firestore real-time snapshots
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach((snapDoc) => {
      const data = snapDoc.data();
      list.push({
        id: snapDoc.id,
        title: data.title || '',
        content: data.content || '',
        timestamp: data.timestamp || new Date().toISOString(),
        type: data.type || 'info',
        author: data.author || 'YorN AI System',
      });
    });

    // If Firestore is empty or newly created, append some default offline notifications for user onboarding
    if (list.length === 0) {
      const localNotificationKey = 'yorn_local_notifications';
      const stored = localStorage.getItem(localNotificationKey);
      if (stored) {
        callback(JSON.parse(stored));
      } else {
        const defaultList: AppNotification[] = [
          {
            id: 'init-notification',
            title: 'Добро пожаловать в YorN AI',
            content: 'Рады приветствовать вас в атмосферном нейросетевом пространстве. Все ваши сессии сохраняются локально или в облаке Firestore.',
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            type: 'system',
            author: 'YorN AI Command',
          },
          {
            id: 'mode-update',
            title: 'Интегрирован Failover-движок',
            content: 'Добавлено умное переключение между тремя ведущими языковыми моделями при пиковых нагрузках.',
            timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            type: 'success',
            author: 'Техподдержка',
          }
        ];
        localStorage.setItem(localNotificationKey, JSON.stringify(defaultList));
        callback(defaultList);
      }
    } else {
      callback(list);
    }
  }, (err) => {
    console.warn("Firestore notification subscribe error, falling back to local storage:", err);
    if (onError) onError(err);
    
    // Fallback to local storage for offline or permission-denied cases
    const localNotificationKey = 'yorn_local_notifications';
    const stored = localStorage.getItem(localNotificationKey);
    if (stored) {
      callback(JSON.parse(stored));
    } else {
      const defaultList: AppNotification[] = [
        {
          id: 'init-notification',
          title: 'Добро пожаловать в YorN AI',
          content: 'Рады приветствовать вас в атмосферном нейросетевом пространстве. Все ваши сессии сохраняются локально или в облаке Firestore.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'system',
          author: 'YorN AI Command',
        }
      ];
      callback(defaultList);
    }
  });

  return unsubscribe;
}

// Publish/Broadcast a new notification system-wide
export async function publishNotification(
  notification: Omit<AppNotification, 'id'>
): Promise<string> {
  const notificationId = 'notif_' + Math.random().toString(36).substring(2, 11);
  const path = `notifications/${notificationId}`;
  
  // Write to firestore first
  try {
    await setDoc(doc(db, 'notifications', notificationId), {
      title: notification.title,
      content: notification.content,
      timestamp: notification.timestamp,
      type: notification.type,
      author: notification.author || 'YorN AI System',
    });
  } catch (error) {
    console.warn("Could not write broadcast to Firestore, saving to localStorage as fallback:", error);
    // Also store locally as fallback
  }

  // Handle local backup and sync
  const localNotificationKey = 'yorn_local_notifications';
  const stored = localStorage.getItem(localNotificationKey);
  const currentLocal: AppNotification[] = stored ? JSON.parse(stored) : [
    {
      id: 'init-notification',
      title: 'Добро пожаловать в YorN AI',
      content: 'Рады приветствовать вас в атмосферном нейросетевом пространстве. Все ваши сессии сохраняются локально или в облаке Firestore.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'system',
      author: 'YorN AI Command',
    }
  ];

  const newNotif: AppNotification = {
    id: notificationId,
    ...notification,
  };

  const updatedLocal = [newNotif, ...currentLocal].slice(0, 50);
  localStorage.setItem(localNotificationKey, JSON.stringify(updatedLocal));

  return notificationId;
}

// Load custom skills
export async function loadUserSkills(userId: string): Promise<Skill[]> {
  const path = 'skills';
  
  // If registered user, try to load all skills to build a unified Cloud database
  if (userId !== 'guest-local-user') {
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const allSkills = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          trigger: data.trigger,
          description: data.description,
          instructions: data.instructions,
          createdAt: data.createdAt || new Date().toISOString(),
          isPublic: data.isPublic !== undefined ? !!data.isPublic : true,
          authorEmail: data.authorEmail || 'Анонимный разработчик'
        } as Skill;
      });
      // Sort by creation time descending
      allSkills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return allSkills;
    } catch (error) {
      console.warn("loadUserSkills from Firestore failed, fallback to local backup:", error);
    }
  }

  // Fallback to local storage if Firestore fails or user is guest-local-user
  const localKey = userId === 'guest-local-user' ? 'yorn_local_skills' : `yorn_skills_${userId}`;
  const local = localStorage.getItem(localKey);
  return local ? JSON.parse(local) : [];
}

// Save custom skill
export async function saveUserSkill(userId: string, skill: Skill) {
  const isPublic = skill.isPublic !== undefined ? !!skill.isPublic : true;
  const authorEmail = skill.authorEmail || auth.currentUser?.email || 'Аноним';

  if (userId === 'guest-local-user') {
    const local = localStorage.getItem('yorn_local_skills');
    const skills: Skill[] = local ? JSON.parse(local) : [];
    const idx = skills.findIndex(s => s.id === skill.id);
    const fullSkill = { 
      ...skill, 
      userId,
      isPublic,
      authorEmail: 'Локальный гость'
    };
    if (idx >= 0) {
      skills[idx] = fullSkill;
    } else {
      skills.push(fullSkill);
    }
    localStorage.setItem('yorn_local_skills', JSON.stringify(skills));
    return;
  }
  const path = `skills/${skill.id}`;
  try {
    const payload = {
      userId,
      name: skill.name,
      trigger: skill.trigger,
      description: skill.description,
      instructions: skill.instructions,
      createdAt: skill.createdAt,
      isPublic,
      authorEmail,
    };
    await setDoc(doc(db, 'skills', skill.id), payload);
    
    // Save to our user-specific local cache for offline stability
    const cached = localStorage.getItem(`yorn_skills_${userId}`);
    const cacheList: Skill[] = cached ? JSON.parse(cached) : [];
    const idx = cacheList.findIndex(c => c.id === skill.id);
    const resolvedSkill = { ...skill, isPublic, authorEmail, userId };
    if (idx >= 0) cacheList[idx] = resolvedSkill;
    else cacheList.push(resolvedSkill);
    localStorage.setItem(`yorn_skills_${userId}`, JSON.stringify(cacheList));
  } catch (error) {
    console.error("saveUserSkill failed:", error);
    // Write to local cache so user doesn't lose active edits
    const cached = localStorage.getItem(`yorn_skills_${userId}`);
    const cacheList: Skill[] = cached ? JSON.parse(cached) : [];
    const idx = cacheList.findIndex(c => c.id === skill.id);
    const resolvedSkill = { ...skill, isPublic, authorEmail, userId };
    if (idx >= 0) cacheList[idx] = resolvedSkill;
    else cacheList.push(resolvedSkill);
    localStorage.setItem(`yorn_skills_${userId}`, JSON.stringify(cacheList));
  }
}

// Delete custom skill
export async function deleteUserSkill(userId: string, skillId: string) {
  if (userId === 'guest-local-user') {
    const local = localStorage.getItem('yorn_local_skills');
    if (local) {
      let skills: Skill[] = JSON.parse(local);
      skills = skills.filter(s => s.id !== skillId);
      localStorage.setItem('yorn_local_skills', JSON.stringify(skills));
    }
    return;
  }
  try {
    await deleteDoc(doc(db, 'skills', skillId));
    const cached = localStorage.getItem(`yorn_skills_${userId}`);
    if (cached) {
      let cacheList: Skill[] = JSON.parse(cached);
      cacheList = cacheList.filter(c => c.id !== skillId);
      localStorage.setItem(`yorn_skills_${userId}`, JSON.stringify(cacheList));
    }
  } catch (error) {
    console.error("deleteUserSkill failed:", error);
  }
}

// ----------------------------------------------------
// Compliance Laws & Security Trigger Auditing
// ----------------------------------------------------

const DANGEROUS_TRIGGERS = [
  'бомба', 'взрывчатк', 'тротил', 'тринитротолуол', 'взрывное устройство', 'самодельное оружие',
  'суицид', 'самоубийств', 'порезы', 'убить себя', 'как умереть', 'свести счеты с жизнью',
  'героин', 'кокаин', 'амфетамин', 'метамфетамин', 'спайс', 'наркотик', 'наркоти', 'веществ', 'порошок', 'синтез наркотик', 'купить наркотик',
  'взлом', 'взломать', 'ddos', 'ддос', 'cyber attack', 'кибератака', 'внедрение sql', 'sql injection', 'эксплоит', 'exploit', 'бэкдор',
  'теракт', 'терроризм', 'убить человека', 'массовое убийство', 'опасный запрос', 'тест безопасности', 'cheat', 'crack',
  'хочу умереть', 'хочу уйти из жизни', 'не хочу жить', 'покончить с собой', 'вскрыть вены', 'повеситьс', 'отравитьс', 'спрыгнуть с', 'самоповреждени', 'селфхарм'
];

export function isSuicideQuery(content: string): boolean {
  const norm = content.toLowerCase();
  
  // 1. Direct explicit keywords
  const suicideKeywords = [
    'суицид', 'самоубийств', 'порезы', 'убить себя', 'как умереть', 'свести счеты с жизнью', 
    'хочу умереть', 'умереть хочу', 'хочу уйти из жизни', 'уйти из жизни хочу', 'жить не хочу',
    'селфхарм', 'самоповреждени', 'вскрыть вены',
    'повеситьс', 'отравитьс', 'спрыгнуть с', 'таблетки чтобы умереть', 'покончить с собой',
    'покончить жизнь', 'не хочу жить', 'незачем жить', 'вскрыл вены', 'наглотаться таблеток',
    'прыгнуть из окна', 'прыгнуть с моста', 'смерть лучше чем жизнь', 'хочу погибнуть', 'погибнуть хочу'
  ];

  if (suicideKeywords.some(kw => norm.includes(kw))) {
    return true;
  }

  // 2. Combination check: e.g. "хочу"/"хочеться" + "умереть"/"покончить" in any order
  const wantWords = ['хочу', 'хочет', 'желаю', 'планирую', 'думаю', 'решил', 'собираюсь', 'не хочу', 'как мне', 'как'];
  const deathWords = ['умереть', 'сдохнуть', 'покончить', 'погибнуть', 'уйти из жизни', 'убивать себя', 'убить себя'];
  
  const hasWant = wantWords.some(w => norm.includes(w));
  const hasDeath = deathWords.some(d => norm.includes(d));
  if (hasWant && hasDeath) {
    return true;
  }

  // 3. Special mental crisis combinations
  if (norm.includes('желание') && norm.includes('умереть')) {
    return true;
  }
  if (norm.includes('мысли') && (norm.includes('смерт') || norm.includes('умереть') || norm.includes('суицид'))) {
    return true;
  }

  return false;
}

export function isDrugQuery(content: string): boolean {
  const norm = content.toLowerCase();
  const drugKeywords = [
    'героин', 'кокаин', 'амфетамин', 'метамфетамин', 'спайс', 'соли', 'мефедрон', 'лсд', 
    'экстази', 'наркотик', 'наркоти', 'купить фен', 'закладка', 'торчать', 'закинуться',
    'купить марихуан', 'синтез наркотик', 'купить наркотик', 'порошок', 'наркоман', 'вещест',
    'купить меф', 'внутривенно', 'срезать дозу', 'зависимость', 'передоз'
  ];
  return drugKeywords.some(kw => norm.includes(kw));
}

export function isTerrorismQuery(content: string): boolean {
  const norm = content.toLowerCase();
  const terrorismKeywords = [
    'бомба', 'взрывчатк', 'тротил', 'тринитротолуол', 'взрывное устройство', 'самодельное оружие',
    'теракт', 'терроризм', 'убить человека', 'массовое убийство', 'игил', 'взорвать', 
    'коктейль молотова', 'подложить бомбу', 'черный порох', 'киллер', 'заказать убийство', 
    'стрельба в школе', 'колумбайн', 'взорвать мост', 'подрыв здания'
  ];
  return terrorismKeywords.some(kw => norm.includes(kw));
}

export function detectDangerousKeywords(content: string): string[] {
  const normalized = content.toLowerCase();
  const matched: string[] = [];
  
  let dynamicTriggers = [...DANGEROUS_TRIGGERS];
  try {
    const customStr = localStorage.getItem('yorn_custom_security_triggers');
    if (customStr) {
      const parsed = JSON.parse(customStr);
      if (Array.isArray(parsed)) {
        const cleanCustom = parsed.map(t => String(t).trim().toLowerCase()).filter(Boolean);
        dynamicTriggers = [...dynamicTriggers, ...cleanCustom];
      }
    }
  } catch (e) {
    console.error("Failed to parse custom security triggers:", e);
  }

  dynamicTriggers.forEach(trigger => {
    if (normalized.includes(trigger)) {
      if (!matched.includes(trigger)) {
        matched.push(trigger);
      }
    }
  });
  return matched;
}

export async function logDangerousRequest(sessionId: string, content: string, matched: string[]) {
  const currentUser = auth.currentUser;
  const logId = `abuse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const payload = {
    id: logId,
    timestamp: new Date().toISOString(),
    sessionId,
    messageContent: content,
    matchedKeywords: matched,
    user: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email || 'no-email',
      displayName: currentUser.displayName || 'anonymous',
      providerId: currentUser.providerData?.[0]?.providerId || 'password_or_other'
    } : {
      uid: 'guest-local-user',
      email: 'guest@local.device',
      displayName: 'Guest Local User',
      providerId: 'local'
    }
  };

  // 1. Firebase Firestore logging
  try {
    // Write locally for debug compliance logs
    const localLogs = localStorage.getItem('yorn_abuse_audit_logs');
    const logsList = localLogs ? JSON.parse(localLogs) : [];
    logsList.push(payload);
    localStorage.setItem('yorn_abuse_audit_logs', JSON.stringify(logsList));

    // Save directly to compliance audit base
    await setDoc(doc(db, 'abuse_logs', logId), payload);
  } catch (error) {
    console.error("Compliance logging failed in Firestore:", error);
  }

  // 2. Supabase Logging
  try {
    // Fetch credentials either from environment variables or LocalStorage integrations list
    let supabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
    let supabaseKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();
    const supabaseTable = ((import.meta as any).env.VITE_SUPABASE_TABLE || 'abuse_logs').trim();

    if (!supabaseUrl || !supabaseKey) {
      const savedIntegrations = localStorage.getItem('yorn_integrations');
      if (savedIntegrations) {
        const parsed = JSON.parse(savedIntegrations);
        const supabaseInt = parsed.find((i: any) => i.id === 'supabase');
        if (supabaseInt) {
          const urlField = supabaseInt.fields?.find((f: any) => f.key === 'SUPABASE_URL');
          const keyField = supabaseInt.fields?.find((f: any) => f.key === 'SUPABASE_ANON_KEY');
          if (urlField?.value && keyField?.value) {
            supabaseUrl = urlField.value.trim();
            supabaseKey = keyField.value.trim();
          }
        }
      }
    }

    // Default system fallback to your direct Supabase database configuration
    if (!supabaseUrl) {
      supabaseUrl = 'https://rjmehilrviykuwjanmnm.supabase.co';
    }
    if (!supabaseKey) {
      supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbWVoaWxydml5a3V3amFubW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjI5OTYsImV4cCI6MjA5NzAzODk5Nn0.n3Yd1oimjHy66UGK9aAHA7Hyxs161J3Bd71KfTKZ5wM';
    }

    if (supabaseUrl && supabaseKey) {
      let resolvedUrl = supabaseUrl;
      if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
        resolvedUrl = `https://${resolvedUrl}`;
      }
      resolvedUrl = resolvedUrl.replace(/\/+$/, '');

      const supabasePayload = {
        id: logId,
        timestamp: payload.timestamp,
        session_id: payload.sessionId,
        message_content: payload.messageContent,
        matched_keywords: payload.matchedKeywords,
        user_uid: payload.user.uid,
        user_email: payload.user.email,
        user_display_name: payload.user.displayName,
        provider_id: payload.user.providerId
      };

      const res = await fetch(`${resolvedUrl}/rest/v1/${supabaseTable}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(supabasePayload)
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        console.error(`Supabase insert failed. Status: ${res.status}. Body:`, errTxt);
      } else {
        console.log("Successfully recorded dangerous security log in Supabase database!");
      }
    }
  } catch (err) {
    console.error("Supabase audit logging crashed:", err);
  }
}

export async function fetchAbuseLogs() {
  // Try to load logs from Supabase first if configured, otherwise fall back to Firestore
  try {
    let supabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
    let supabaseKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();
    const supabaseTable = ((import.meta as any).env.VITE_SUPABASE_TABLE || 'abuse_logs').trim();

    if (!supabaseUrl || !supabaseKey) {
      const savedIntegrations = localStorage.getItem('yorn_integrations');
      if (savedIntegrations) {
        const parsed = JSON.parse(savedIntegrations);
        const supabaseInt = parsed.find((i: any) => i.id === 'supabase');
        if (supabaseInt) {
          const urlField = supabaseInt.fields?.find((f: any) => f.key === 'SUPABASE_URL');
          const keyField = supabaseInt.fields?.find((f: any) => f.key === 'SUPABASE_ANON_KEY');
          if (urlField?.value && keyField?.value) {
            supabaseUrl = urlField.value.trim();
            supabaseKey = keyField.value.trim();
          }
        }
      }
    }

    // Default system fallback to your direct Supabase database configuration
    if (!supabaseUrl) {
      supabaseUrl = 'https://rjmehilrviykuwjanmnm.supabase.co';
    }
    if (!supabaseKey) {
      supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbWVoaWxydml5a3V3amFubW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjI5OTYsImV4cCI6MjA5NzAzODk5Nn0.n3Yd1oimjHy66UGK9aAHA7Hyxs161J3Bd71KfTKZ5wM';
    }

    if (supabaseUrl && supabaseKey) {
      let resolvedUrl = supabaseUrl;
      if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
        resolvedUrl = `https://${resolvedUrl}`;
      }
      resolvedUrl = resolvedUrl.replace(/\/+$/, '');

      const res = await fetch(`${resolvedUrl}/rest/v1/${supabaseTable}?order=timestamp.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const rows = await res.json();
        return rows.map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp || new Date().toISOString(),
          sessionId: r.session_id || '',
          messageContent: r.message_content || '',
          matchedKeywords: r.matched_keywords || [],
          user: {
            uid: r.user_uid || 'guest-local-user',
            email: r.user_email || 'guest@local.device',
            displayName: r.user_display_name || 'Guest Local User',
            providerId: r.provider_id || 'local'
          }
        }));
      }
    }
  } catch (err) {
    console.error("Failed to read logs from Supabase, loading from Firestore:", err);
  }

  const abusePath = 'abuse_logs';
  try {
    const querySnapshot = await getDocs(collection(db, abusePath));
    const logs: any[] = [];
    querySnapshot.forEach(d => {
      logs.push(d.data());
    });
    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, abusePath);
    return [];
  }
}

