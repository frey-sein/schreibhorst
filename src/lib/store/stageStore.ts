import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TextDraft, ImageDraft } from '@/types/stage';
import { availableModels } from '@/lib/services/imageGenerator';

interface StageState {
  textDrafts: TextDraft[];
  imageDrafts: ImageDraft[];
  selectedModel: string;
  
  setTextDrafts: (drafts: TextDraft[]) => void;
  setImageDrafts: (drafts: ImageDraft[]) => void;
  updateTextDraft: (id: number, updates: Partial<TextDraft>) => void;
  updateImageDraft: (id: number, updates: Partial<ImageDraft>) => void;
  setSelectedModel: (modelId: string) => void;
}

// Hilfsfunktion: Stellt sicher, dass das Modell in der verfügbaren Liste ist
const getValidModel = (modelId: string): string => {
  const isValid = availableModels.some(model => model.id === modelId);
  return isValid ? modelId : 'stabilityai/stable-diffusion-xl-base-1.0';
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
      
      selectedModel: 'stabilityai/stable-diffusion-xl-base-1.0',
      
      setTextDrafts: (drafts) => set({ textDrafts: drafts }),
      
      setImageDrafts: (drafts) => set({ imageDrafts: drafts }),
      
      updateTextDraft: (id, updates) => set((state) => ({
        textDrafts: state.textDrafts.map(draft => 
          draft.id === id ? { ...draft, ...updates } : draft
        )
      })),
      
      updateImageDraft: (id, updates) => set((state) => ({
        imageDrafts: state.imageDrafts.map(draft => 
          draft.id === id ? { ...draft, ...updates } : draft
        )
      })),
      
      setSelectedModel: (modelId) => set({ 
        selectedModel: getValidModel(modelId) 
      })
    }),
    {
      name: 'stage-storage',
      partialize: (state) => ({ 
        textDrafts: state.textDrafts,
        imageDrafts: state.imageDrafts,
        selectedModel: getValidModel(state.selectedModel)
      })
    }
  )
); 