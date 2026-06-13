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

// Delete a session and all its messages
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
  // 1. Delete all messages from subcollection
  const messagesPath = `sessions/${sessionId}/messages`;
  try {
    const mSnapshot = await getDocs(collection(db, messagesPath));
    for (const mdoc of mSnapshot.docs) {
      await deleteDoc(doc(db, messagesPath, mdoc.id));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, messagesPath);
  }

  // 2. Delete parent session
  const path = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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

