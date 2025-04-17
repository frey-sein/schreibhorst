import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TextDraft, ImageDraft, BlogPostDraft } from '@/types/stage';
import { availableModels } from '@/lib/services/imageGenerator';
import { availableTextModels } from '@/lib/services/textGenerator';

export interface StageState {
  textDrafts: TextDraft[];
  imageDrafts: ImageDraft[];
  selectedModel: string;
  selectedTextModel: string;
  activeImageTab: 'ai' | 'stock';
  blogPostDraft: BlogPostDraft | null;
  chatId: string | null;
  setTextDrafts: (drafts: TextDraft[]) => void;
  setImageDrafts: (drafts: ImageDraft[]) => void;
  setSelectedModel: (modelId: string) => void;
  setSelectedTextModel: (modelId: string) => void;
  setActiveImageTab: (tab: 'ai' | 'stock') => void;
  setBlogPostDraft: (draft: BlogPostDraft | null) => void;
  setChatId: (chatId: string) => void;
  updateTextDraft: (id: number, updates: Partial<TextDraft>) => void;
  updateImageDraft: (id: number, updates: Partial<ImageDraft>) => void;
  saveToDatabase: () => Promise<void>;
}

// Hilfsfunktion: Stellt sicher, dass das Modell in der verfügbaren Liste ist
const getValidModel = (modelId: string): string => {
  const isValid = availableModels.some(model => model.id === modelId);
  return isValid ? modelId : 'black-forest-labs/FLUX.1-schnell';
};

// Hilfsfunktion: Stellt sicher, dass das Text-Modell in der verfügbaren Liste ist
const getValidTextModel = (modelId: string): string => {
  // Ersetze Flux-Modelle explizit durch GPT-4 Turbo
  if (modelId.includes('flux') || modelId.includes('FLUX')) {
    console.warn(`Flux-Modell "${modelId}" ist für Textgenerierung nicht erlaubt. Verwende GPT-4 Turbo.`);
    return 'openai/gpt-4-turbo-preview';
  }
  
  const isValid = availableTextModels.some(model => model.id === modelId);
  return isValid ? modelId : 'openai/gpt-4-turbo-preview';
};

// Hilfsfunktion: Speichert den aktuellen Zustand als Snapshot
const saveCurrentStateAsSnapshot = async (textDrafts: TextDraft[], imageDrafts: ImageDraft[], chatId: string | null, blogPostDraft: BlogPostDraft | null) => {
  if (!chatId) return;
  
  try {
    const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
    const stageHistoryStore = useStageHistoryStore.getState();
    await stageHistoryStore.addSnapshot(textDrafts, imageDrafts, chatId, blogPostDraft);
    console.log('Stage-Snapshot automatisch gespeichert');
  } catch (error) {
    console.error('Fehler beim automatischen Speichern des Stage-Snapshots:', error);
  }
};

export const useStageStore = create<StageState>()(
  persist(
    (set, get) => ({
      textDrafts: [],
      imageDrafts: [],
      selectedModel: availableModels[0].id,
      selectedTextModel: availableTextModels[0].id,
      activeImageTab: 'ai',
      blogPostDraft: null,
      chatId: null,
      
      setTextDrafts: (drafts) => {
        set({ textDrafts: drafts });
        saveCurrentStateAsSnapshot(drafts, get().imageDrafts, get().chatId, get().blogPostDraft);
      },
      
      setImageDrafts: (drafts) => {
        set({ imageDrafts: drafts });
        saveCurrentStateAsSnapshot(get().textDrafts, drafts, get().chatId, get().blogPostDraft);
      },
      
      setSelectedModel: (modelId) => set({ selectedModel: getValidModel(modelId) }),
      
      setSelectedTextModel: (modelId) => set({ selectedTextModel: getValidTextModel(modelId) }),
      
      setActiveImageTab: (tab) => set({ activeImageTab: tab }),
      
      setBlogPostDraft: (draft) => {
        set({ blogPostDraft: draft });
        saveCurrentStateAsSnapshot(get().textDrafts, get().imageDrafts, get().chatId, draft);
      },
      
      setChatId: (chatId) => set({ chatId }),
      
      updateTextDraft: (id, updates) => {
        const newDrafts = get().textDrafts.map((draft) =>
          draft.id === id ? { ...draft, ...updates } : draft
        );
        set({ textDrafts: newDrafts });
        saveCurrentStateAsSnapshot(newDrafts, get().imageDrafts, get().chatId, get().blogPostDraft);
      },
      
      updateImageDraft: (id, updates) => {
        const newDrafts = get().imageDrafts.map((draft) =>
          draft.id === id ? { ...draft, ...updates } : draft
        );
        set({ imageDrafts: newDrafts });
        saveCurrentStateAsSnapshot(get().textDrafts, newDrafts, get().chatId, get().blogPostDraft);
      },
    }),
    {
      name: 'stage-storage',
      // Speicherung im localStorage anstatt sessionStorage
      getStorage: () => { if (typeof window !== 'undefined') { return localStorage; } return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; },
      partialize: (state) => ({
        textDrafts: state.textDrafts,
        imageDrafts: state.imageDrafts,
        selectedModel: state.selectedModel,
        selectedTextModel: state.selectedTextModel,
        activeImageTab: state.activeImageTab, 
        blogPostDraft: state.blogPostDraft,
        chatId: state.chatId
      }),
      skipHydration: true, // Überspringt die automatische Hydration
onRehydrateStorage: () => (state) => {
        if (state) {
          // Prüfen, ob gespeicherte Modelle noch verfügbar sind
          const modelExists = availableModels.some(model => model.id === state.selectedModel);
          if (!modelExists) {
            state.selectedModel = availableModels[0].id;
          }

          const textModelExists = availableTextModels.some(model => model.id === state.selectedTextModel);
          if (!textModelExists) {
            state.selectedTextModel = availableTextModels[0].id;
          }
        }
      }
    }
  )
);

// Funktion zum Zurücksetzen der Stage
export const resetStage = () => {
  const stageStore = useStageStore.getState();
  if (stageStore) {
    const currentModel = stageStore.selectedModel;
    const currentTextModel = stageStore.selectedTextModel;
    const currentTab = stageStore.activeImageTab;
    const currentChatId = stageStore.chatId;
    
    stageStore.setTextDrafts([]);
    stageStore.setImageDrafts([]);
    stageStore.setBlogPostDraft(null);
    
    stageStore.setSelectedModel(currentModel); // Modell beibehalten
    stageStore.setSelectedTextModel(currentTextModel); // Text-Modell beibehalten
    stageStore.setActiveImageTab(currentTab); // Tab beibehalten
    
    console.log('Stage wurde zurückgesetzt');
  }
};

// Funktion zum Laden des letzten Snapshots für einen Chat
export const loadLatestSnapshotForChat = async (chatId: string) => {
  if (!chatId) return;
  
  try {
    const stageStore = useStageStore.getState();
    stageStore.setChatId(chatId);
    
    const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
    const stageHistoryStore = useStageHistoryStore.getState();
    stageHistoryStore.setCurrentChatId(chatId);
    
    const snapshots = await stageHistoryStore.getSnapshots();
    if (snapshots.length > 0) {
      const latestSnapshot = snapshots[0]; // Die Snapshots sind nach Zeit sortiert
      
      stageStore.setTextDrafts(latestSnapshot.textDrafts || []);
      stageStore.setImageDrafts(latestSnapshot.imageDrafts || []);
      
      if (latestSnapshot.blogPostDraft) {
        stageStore.setBlogPostDraft(latestSnapshot.blogPostDraft);
      }
      
      console.log('Letzter Snapshot für Chat geladen:', latestSnapshot.id);
    }
  } catch (error) {
    console.error('Fehler beim Laden des letzten Snapshots:', error);
  }
}; 