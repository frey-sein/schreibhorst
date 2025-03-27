import { create } from 'zustand';
import { ChatMessage } from '@/types/chat';
import { CHAT_CONSTANTS } from '@/lib/constants/chat';
import { persist } from 'zustand/middleware';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isUploading: boolean;
  isAnalyzing: boolean;
  isProcessingPrompts: boolean;
  currentModel: string;
  input: string;
}

interface ChatActions {
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (text: string) => void;
  setLoading: (isLoading: boolean) => void;
  setUploading: (isUploading: boolean) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setProcessingPrompts: (isProcessingPrompts: boolean) => void;
  setModel: (model: string) => void;
  setInput: (input: string) => void;
  reset: () => void;
}

// Erstelle die Willkommensnachricht mit einer festen ID und einem festen Zeitstempel
export const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  text: CHAT_CONSTANTS.UI_MESSAGES.WELCOME,
  sender: 'assistant',
  timestamp: '2024-01-01T00:00:00.000Z' // Fester Zeitstempel für konsistente Hydration
});

const initialState: ChatState = {
  messages: [], // Leeres Array für initiale Server-Renderung
  isLoading: false,
  isUploading: false,
  isAnalyzing: false,
  isProcessingPrompts: false,
  currentModel: CHAT_CONSTANTS.DEFAULT_MODEL,
  input: ''
};

// Validierungsfunktionen
const validateChatMessage = (message: ChatMessage): boolean => {
  return (
    typeof message.id === 'string' &&
    message.id.length > 0 &&
    ['user', 'assistant', 'system'].includes(message.sender) &&
    typeof message.text === 'string' &&
    typeof message.timestamp === 'string'
  );
};

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMessages: (messages) => {
        console.log('setMessages aufgerufen mit:', messages);
        set((state) => {
          const newMessages = typeof messages === 'function' ? messages(state.messages) : messages;
          console.log('Neue Nachrichten:', newMessages);
          return { messages: newMessages };
        });
      },
      
      addMessage: (message) => {
        console.log('addMessage aufgerufen mit:', message);
        set((state) => ({
          messages: [...state.messages, message]
        }));
      },
      
      updateLastMessage: (text) => {
        console.log('updateLastMessage aufgerufen mit:', text);
        set((state) => {
          const messages = [...state.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.sender === 'assistant') {
            messages[messages.length - 1] = {
              ...lastMessage,
              text: lastMessage.text + text
            };
          }
          return { messages };
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      setUploading: (isUploading) => set({ isUploading }),
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setProcessingPrompts: (isProcessingPrompts) => set({ isProcessingPrompts }),
      setModel: (currentModel) => set({ currentModel }),
      setInput: (input) => set({ input }),
      
      reset: () => {
        console.log('Chat-Store wird zurückgesetzt');
        set({
          ...initialState,
          messages: [createWelcomeMessage()]
        });
      }
    }),
    {
      name: 'chat-store',
      getStorage: () => localStorage,
      partialize: (state) => ({
        messages: state.messages,
        currentModel: state.currentModel
      }),
      skipHydration: true // Überspringt die automatische Hydration
    }
  )
); 