'use client';

import { useState, useEffect } from 'react';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';

interface TextDraft {
  id: number;
  content: string;
  isSelected: boolean;
  sourcePrompt?: AnalysisResult;
}

interface ImageDraft {
  id: number;
  url: string;
  isSelected: boolean;
  title: string;
  sourcePrompt?: AnalysisResult;
}

export default function StagePanel() {
  const [textDrafts, setTextDrafts] = useState<TextDraft[]>([
    {
      id: 1,
      content: "In einem fernen Land, wo die Berge den Himmel berührten und die Wälder voller Geheimnisse waren, lebte ein außergewöhnlicher Drache...",
      isSelected: false
    },
    {
      id: 2,
      content: "Der Drache, den alle nur Funkel nannten, war ein besonderes Wesen. Seine Schuppen glitzerten wie Diamanten im Sonnenlicht...",
      isSelected: false
    },
    {
      id: 3,
      content: "Tief in den Bergen, versteckt vor neugierigen Blicken, hatte sich ein junger Drache niedergelassen. Anders als seine Artgenossen...",
      isSelected: false
    }
  ]);

  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=800&auto=format&fit=crop&q=60",
      title: "Mystische Berglandschaft",
      isSelected: false
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=60",
      title: "Neblige Bergspitze",
      isSelected: false
    },
    {
      id: 3,
      url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=60",
      title: "Sonnenaufgang in den Bergen",
      isSelected: false
    }
  ]);

  // Get prompts from the store
  const { textPrompts, imagePrompts, clearPrompts } = usePromptStore();

  // Handle new prompts coming in
  useEffect(() => {
    if (textPrompts.length > 0) {
      // Process new text prompts that aren't already in the drafts
      const newTextPrompts = textPrompts.filter(
        (prompt: AnalysisResult) => !textDrafts.some(draft => draft.sourcePrompt?.prompt === prompt.prompt)
      );
      
      if (newTextPrompts.length > 0) {
        // Add new drafts from prompts
        const newDrafts = newTextPrompts.map((prompt: AnalysisResult, index: number) => ({
          id: textDrafts.length + index + 1,
          content: prompt.prompt,
          isSelected: false,
          sourcePrompt: prompt
        }));
        
        setTextDrafts(prev => [...prev, ...newDrafts]);
      }
    }
  }, [textPrompts]);

  // Handle new image prompts
  useEffect(() => {
    if (imagePrompts.length > 0) {
      // Process new image prompts that aren't already in the drafts
      const newImagePrompts = imagePrompts.filter(
        (prompt: AnalysisResult) => !imageDrafts.some(draft => draft.sourcePrompt?.prompt === prompt.prompt)
      );
      
      if (newImagePrompts.length > 0) {
        // In a real app, we would call an image generation API here
        // For now, just use placeholder images
        const placeholderImages = [
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&auto=format&fit=crop&q=60"
        ];
        
        // Add new drafts from prompts
        const newDrafts = newImagePrompts.map((prompt: AnalysisResult, index: number) => ({
          id: imageDrafts.length + index + 1,
          url: placeholderImages[index % placeholderImages.length],
          title: prompt.prompt.length > 25 ? prompt.prompt.substring(0, 25) + '...' : prompt.prompt,
          isSelected: false,
          sourcePrompt: prompt
        }));
        
        setImageDrafts(prev => [...prev, ...newDrafts]);
      }
    }
  }, [imagePrompts]);

  const handleTextSelect = (id: number) => {
    setTextDrafts(prev => prev.map(draft => ({
      ...draft,
      isSelected: draft.id === id
    })));
  };

  const handleImageSelect = (id: number) => {
    setImageDrafts(prev => prev.map(draft => ({
      ...draft,
      isSelected: draft.id === id
    })));
  };

  const handleRegenerateTexts = () => {
    // TODO: Implement text regeneration with actual API
    console.log("Texte neu generieren...");
  };

  const handleRegenerateImages = () => {
    // TODO: Implement image regeneration with actual API
    console.log("Bilder neu generieren...");
  };

  return (
    <div className="w-1/2 flex flex-col h-full bg-[#fafafa]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <h2 className="text-2xl font-light text-gray-900 tracking-tight">Deine Entwürfe</h2>
        <p className="text-sm text-gray-500">Wähle deine besten Entwürfe</p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-12">
        {/* Text Drafts Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Textentwürfe</h3>
            <button
              onClick={handleRegenerateTexts}
              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
            >
              Neu generieren
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {textDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => handleTextSelect(draft.id)}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 ${
                  draft.isSelected
                    ? 'bg-white border-2 border-[#2c2c2c] shadow-lg'
                    : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <p className="text-gray-700 leading-relaxed">{draft.content}</p>
                {draft.sourcePrompt && (
                  <>
                    {draft.sourcePrompt.contentType && (
                      <div className="mt-2 text-xs text-gray-500 font-medium">
                        Typ: {draft.sourcePrompt.contentType}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                      Quelle: {draft.sourcePrompt.sourceContext}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {draft.sourcePrompt.tags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {draft.isSelected && (
                  <div className="mt-3 text-sm text-[#2c2c2c] font-medium">Ausgewählt</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Image Drafts Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Bildentwürfe</h3>
            <button
              onClick={handleRegenerateImages}
              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
            >
              Neu generieren
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {imageDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => handleImageSelect(draft.id)}
                className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  draft.isSelected
                    ? 'ring-2 ring-[#2c2c2c] shadow-lg'
                    : 'hover:ring-2 hover:ring-gray-200 hover:shadow-md'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" />
                <img
                  src={draft.url}
                  alt={draft.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 z-20">
                  <h4 className="text-sm font-medium">{draft.title}</h4>
                  {draft.sourcePrompt && (
                    <>
                      {draft.sourcePrompt.contentType && (
                        <div className="mt-1 text-xs text-white/90 font-medium">
                          {draft.sourcePrompt.contentType}
                        </div>
                      )}
                      {draft.sourcePrompt.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {draft.sourcePrompt.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-black/30 text-white rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {draft.isSelected && (
                  <div className="absolute top-3 right-3 bg-[#2c2c2c] text-white px-3 py-1 rounded-full text-sm font-medium z-30">
                    Ausgewählt
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100">
            Bearbeiten
          </button>
          <button className="px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100">
            Speichern
          </button>
          <button 
            onClick={() => clearPrompts()}
            className="px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100"
          >
            Zurücksetzen
          </button>
          <button className="px-5 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium ml-auto">
            Exportieren
          </button>
        </div>
      </div>
    </div>
  );
} 