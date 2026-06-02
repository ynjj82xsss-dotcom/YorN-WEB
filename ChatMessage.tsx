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
};

export type ChatSession = {
  id: string;
  title: string;
  date: string;
  messages: Message[];
};
