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
  const isValid = availableTextModels.some(model => model.id === modelId);
  return isValid ? modelId : 'openai/gpt-4-turbo-preview';
};

export const useStageStore = create<StageState>()(
  persist(
    (set) => ({
      textDrafts: [
        {
          id: 1,
          content: "In einem fernen Land, wo die Berge den Himmel berührten und die Wälder voller Geheimnisse waren, lebte ein außergewöhnlicher Drache...",
          isSelected: false,
          title: "Drachengeschichte",
          contentType: "Geschichte",
          tags: ["Drache", "Fantasy", "Abenteuer"]
        },
        {
          id: 2,
          content: "Der Drache, den alle nur Funkel nannten, war ein besonderes Wesen. Seine Schuppen glitzerten wie Diamanten im Sonnenlicht...",
          isSelected: false,
          title: "Funkel der Drache",
          contentType: "Kurzgeschichte",
          tags: ["Drache", "Fantasy"]
        },
        {
          id: 3,
          content: "Tief in den Bergen, versteckt vor neugierigen Blicken, hatte sich ein junger Drache niedergelassen. Anders als seine Artgenossen...",
          isSelected: false,
          title: "Der Bergdrache",
          contentType: "Erzählung",
          tags: ["Drache", "Berge", "Einsamkeit"]
        }
      ],
      
      imageDrafts: [
        {
          id: 1,
          url: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=800&auto=format&fit=crop&q=60",
          title: "Mystische Berglandschaft",
          isSelected: false,
          contentType: "Landschaft",
          tags: ["Berg", "Natur", "Mystisch"],
          prompt: "Eine atemberaubende mystische Berglandschaft bei Sonnenuntergang, mit Nebelschwaden zwischen den Bergen, warmes goldenes Licht, fotorealistisch, hohe Auflösung."
        },
        {
          id: 2,
          url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=60",
          title: "Neblige Bergspitze",
          isSelected: false,
          contentType: "Landschaft",
          tags: ["Berg", "Nebel", "Natur"],
          prompt: "Eine einsame Bergspitze im dichten Nebel, mysteriöse Atmosphäre, dramatisches Licht, hochdetailliert, fotorealistisch."
        },
        {
          id: 3,
          url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=60",
          title: "Sonnenaufgang in den Bergen",
          isSelected: false,
          contentType: "Landschaft",
          tags: ["Berg", "Sonnenaufgang", "Natur"],
          prompt: "Majestätischer Sonnenaufgang über einer Bergkette, dramatische Lichtstrahlen, lebendige Farben, Morgennebel im Tal, fotorealistisch, atmosphärisch."
        }
      ],
      
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