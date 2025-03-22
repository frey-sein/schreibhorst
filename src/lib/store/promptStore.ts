import { create } from 'zustand';
import { AnalysisResult } from '../services/analyzer/chatAnalyzer';

interface PromptStore {
  textPrompts: AnalysisResult[];
  imagePrompts: AnalysisResult[];
  addPrompt: (prompt: AnalysisResult) => void;
  addPrompts: (prompts: AnalysisResult[]) => void;
  clearPrompts: () => void;
}

export const usePromptStore = create<PromptStore>((set) => ({
  textPrompts: [],
  imagePrompts: [],
  
  addPrompt: (prompt: AnalysisResult) => set((state) => {
    if (prompt.type === 'text') {
      return { textPrompts: [...state.textPrompts, prompt] };
    } else {
      return { imagePrompts: [...state.imagePrompts, prompt] };
    }
  }),
  
  addPrompts: (prompts: AnalysisResult[]) => set((state) => {
    const newTextPrompts = prompts.filter(p => p.type === 'text');
    const newImagePrompts = prompts.filter(p => p.type === 'image');
    
    return {
      textPrompts: [...state.textPrompts, ...newTextPrompts],
      imagePrompts: [...state.imagePrompts, ...newImagePrompts],
    };
  }),
  
  clearPrompts: () => set({ textPrompts: [], imagePrompts: [] }),
}));