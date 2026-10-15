export interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  authProvider: 'local' | 'google';
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptSuggestion {
  id: string;
  category: string;
  title: string;
  prompt: string;
  icon: string;
  language?: 'en' | 'hi' | 'hinglish';
}
