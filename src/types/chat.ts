export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  role?: 'user' | 'assistant' | 'system';
  content?: string;
} 