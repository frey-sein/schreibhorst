import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;  // Optional URL für generierte Bilder
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

interface ChatHistoryStore {
  chats: ChatHistory[];
  addChat: (chat: ChatHistory) => void;
  updateChat: (id: string, chat: Partial<ChatHistory>) => void;
  deleteChat: (id: string) => void;
  getChat: (id: string) => ChatHistory | undefined;
  getAllChats: () => ChatHistory[];
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set, get) => ({
      chats: [],
      addChat: (chat) => set((state) => ({ chats: [...state.chats, chat] })),
      updateChat: (id, chat) =>
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === id ? { ...c, ...chat } : c
          ),
        })),
      deleteChat: (id) =>
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== id),
        })),
      getChat: (id) => get().chats.find((c) => c.id === id),
      getAllChats: () => get().chats,
    }),
    {
      name: 'chat-history-storage',
    }
  )
); 