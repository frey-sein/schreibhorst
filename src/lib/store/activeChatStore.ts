import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveChatState {
  currentChatId: string;
  setCurrentChatId: (chatId: string) => void;
  getLastActiveChatId: () => string;
}

export const useActiveChatStore = create<ActiveChatState>()(
  persist(
    (set, get) => ({
      currentChatId: 'default',
      
      setCurrentChatId: (chatId) => {
        set({ currentChatId: chatId });
      },
      
      getLastActiveChatId: () => {
        return get().currentChatId;
      },
    }),
    {
      name: 'active-chat-storage',
      getStorage: () => localStorage,
    }
  )
); 