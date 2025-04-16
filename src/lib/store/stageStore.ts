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
  setTextDrafts: (drafts: TextDraft[]) => void;
  setImageDrafts: (drafts: ImageDraft[]) => void;
  setSelectedModel: (modelId: string) => void;
  setSelectedTextModel: (modelId: string) => void;
  setActiveImageTab: (tab: 'ai' | 'stock') => void;
  setBlogPostDraft: (draft: BlogPostDraft | null) => void;
  updateTextDraft: (id: number, updates: Partial<TextDraft>) => void;
  updateImageDraft: (id: number, updates: Partial<ImageDraft>) => void;
}

// Hilfsfunktion: Stellt sicher, dass das Modell in der verfügbaren Liste ist
const getValidModel = (modelId: string): string => {
  const isValid = availableModels.some(model => model.id === modelId);
  return isValid ? modelId : 'stabilityai/stable-diffusion-xl-base-1.0';
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

export const useStageStore = create<StageState>()(
  persist(
    (set) => ({
      textDrafts: [],
      imageDrafts: [],
      
      selectedModel: availableModels[0].id,
      selectedTextModel: availableTextModels[0].id,
      activeImageTab: 'ai',
      blogPostDraft: null,
      
      setTextDrafts: (drafts) => set({ textDrafts: drafts }),
      setImageDrafts: (drafts) => set({ imageDrafts: drafts }),
      setSelectedModel: (modelId) => set({ selectedModel: getValidModel(modelId) }),
      setSelectedTextModel: (modelId) => set({ selectedTextModel: getValidTextModel(modelId) }),
      setActiveImageTab: (tab) => set({ activeImageTab: tab }),
      setBlogPostDraft: (draft) => set({ blogPostDraft: draft }),
      
      updateTextDraft: (id, updates) => set((state) => ({
        textDrafts: state.textDrafts.map((draft) =>
          draft.id === id ? { ...draft, ...updates } : draft
        ),
      })),
      
      updateImageDraft: (id, updates) => set((state) => ({
        imageDrafts: state.imageDrafts.map((draft) =>
          draft.id === id ? { ...draft, ...updates } : draft
        ),
      })),
    }),
    {
      name: 'stage-storage',
      // Speicherung nur für die aktuelle Sitzung
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
      // Beim Wiederherstellen aus dem Speicher prüfen, ob das 
      // gespeicherte Modell noch existiert, sonst das erste verfügbare verwenden
      onRehydrateStorage: () => (state) => {
        if (state) {
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

// Funktion zum Zurücksetzen der Stage, die direkt aufgerufen werden kann
export const resetStage = () => {
  const stageStore = useStageStore.getState();
  if (stageStore) {
    const currentModel = stageStore.selectedModel;
    const currentTextModel = stageStore.selectedTextModel;
    const currentTab = stageStore.activeImageTab;
    stageStore.setTextDrafts([]);
    stageStore.setImageDrafts([]);
    stageStore.setBlogPostDraft(null);
    stageStore.setSelectedModel(currentModel); // Modell beibehalten
    stageStore.setSelectedTextModel(currentTextModel); // Text-Modell beibehalten
    stageStore.setActiveImageTab(currentTab); // Tab beibehalten
    console.log('Stage wurde zurückgesetzt');
  }
}; 