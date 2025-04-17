import { create } from 'zustand';
import { AnalysisResult } from '../services/analyzer/chatAnalyzer';

interface PromptStore {
  textPrompts: AnalysisResult[];
  imagePrompts: AnalysisResult[];
  videoPrompts: AnalysisResult[];
  addPrompt: (prompt: AnalysisResult) => void;
  addPrompts: (prompts: AnalysisResult[]) => void;
  clearPrompts: () => void;
}

export const usePromptStore = create<PromptStore>((set) => ({
  textPrompts: [],
  imagePrompts: [],
  videoPrompts: [],
  
  addPrompt: (prompt: AnalysisResult) => set((state) => {
    if (prompt.type === 'text') {
      return { textPrompts: [...state.textPrompts, prompt] };
    } else if (prompt.type === 'image') {
      return { imagePrompts: [...state.imagePrompts, prompt] };
    } else if (prompt.type === 'video') {
      return { videoPrompts: [...state.videoPrompts, prompt] };
    }
    return state;
  }),
  
  addPrompts: (prompts: AnalysisResult[]) => set((state) => {
    const newTextPrompts = prompts.filter(p => p.type === 'text');
    const newImagePrompts = prompts.filter(p => p.type === 'image');
    const newVideoPrompts = prompts.filter(p => p.type === 'video');
    
    return {
      textPrompts: [...state.textPrompts, ...newTextPrompts],
      imagePrompts: [...state.imagePrompts, ...newImagePrompts],
      videoPrompts: [...state.videoPrompts, ...newVideoPrompts],
    };
  }),
  
  clearPrompts: () => set({ textPrompts: [], imagePrompts: [], videoPrompts: [] }),
}));