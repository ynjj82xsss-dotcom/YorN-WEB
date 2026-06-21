export type MessageAttachment = {
  name: string;
  size: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isAnimated?: boolean;
  attachments?: MessageAttachment[];
  imageUrl?: string;
  imageModel?: string;
  audioUrl?: string;
  audioModel?: string;
  isSuicideSupport?: boolean;
  isDrugSupport?: boolean;
  isTerrorismSupport?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  date: string;
  messages: Message[];
  isPinned?: boolean;
};

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  timestamp: string; // ISO String
  type: 'info' | 'warning' | 'system' | 'success';
  author: string;
}

export interface Skill {
  id: string;
  userId?: string; // Opt for custom skills
  name: string;
  trigger: string; // e.g. "translate"
  description: string;
  instructions: string;
  createdAt: string;
  isSystem?: boolean;
  isPublic?: boolean;
  authorEmail?: string;
}

export interface IntegrationConfig {
  id: string; // "supabase" | "github" | "vercel" | "firebase"
  name: string;
  description: string;
  isEnabled: boolean;
  value: string; // Primary default (e.g. table name or repo name)
  placeholder: string;
  label: string;
  fields: {
    key: string;
    label: string;
    value: string;
    type: 'text' | 'password';
    placeholder: string;
  }[];
}


