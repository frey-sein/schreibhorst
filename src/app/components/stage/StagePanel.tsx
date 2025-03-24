'use client';

import { useState, useEffect } from 'react';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';

interface TextDraft {
  id: number;
  content: string;
  isSelected: boolean;
  title?: string;
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
}

interface ImageDraft {
  id: number;
  url: string;
  isSelected: boolean;
  title: string;
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
}

export default function StagePanel() {
  const [textDrafts, setTextDrafts] = useState<TextDraft[]>([
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
  ]);

  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=800&auto=format&fit=crop&q=60",
      title: "Mystische Berglandschaft",
      isSelected: false,
      contentType: "Landschaft",
      tags: ["Berg", "Natur", "Mystisch"]
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=60",
      title: "Neblige Bergspitze",
      isSelected: false,
      contentType: "Landschaft",
      tags: ["Berg", "Nebel", "Natur"]
    },
    {
      id: 3,
      url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=60",
      title: "Sonnenaufgang in den Bergen",
      isSelected: false,
      contentType: "Landschaft",
      tags: ["Berg", "Sonnenaufgang", "Natur"]
    }
  ]);

  // Get prompts from the store
  const { textPrompts, imagePrompts } = usePromptStore();

  // Listen for new prompts from the store
  useEffect(() => {
    if (textPrompts.length > 0) {
      // Add new text prompts as drafts
      const newTextDrafts = textPrompts.map((prompt, index) => ({
        id: textDrafts.length + index + 1,
        content: prompt.prompt,
        isSelected: false,
        title: prompt.contentType || "Neuer Entwurf",
        contentType: prompt.contentType,
        tags: prompt.tags,
        sourceContext: prompt.sourceContext
      }));
      
      setTextDrafts(prev => [...newTextDrafts, ...prev]);
    }
  }, [textPrompts]);

  useEffect(() => {
    if (imagePrompts.length > 0) {
      // For image prompts, we'd typically generate images via an API
      // For now, we'll just use placeholders
      const placeholderImages = [
        "https://images.unsplash.com/photo-1513477967668-2aaf11838bd6?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1498598457418-36ef20772c9b?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&auto=format&fit=crop&q=60"
      ];
      
      const newImageDrafts = imagePrompts.map((prompt, index) => ({
        id: imageDrafts.length + index + 1,
        url: placeholderImages[index % placeholderImages.length],
        title: prompt.contentType || "Neues Bild",
        isSelected: false,
        contentType: prompt.contentType,
        tags: prompt.tags,
        sourceContext: prompt.sourceContext
      }));
      
      setImageDrafts(prev => [...newImageDrafts, ...prev]);
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
    // TODO: Implementiere die Logik zum Neu Generieren der Texte
    console.log("Texte neu generieren...");
  };

  const handleRegenerateImages = () => {
    // TODO: Implementiere die Logik zum Neu Generieren der Bilder
    console.log("Bilder neu generieren...");
  };

  return (
    <div className="w-1/2 flex flex-col h-full bg-[#f0f0f0]">
      {/* Header */}
      <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-start gap-4 w-full">
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Deine Entwürfe</h2>
            <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">Wähle deine besten Entwürfe</p>
          </div>
          {/* Unsichtbares Element für gleiche Höhe */}
          <div className="flex items-start space-x-3 shrink-0 invisible">
            <div className="p-2.5 border border-gray-200 rounded-full w-[48px] h-[48px]"></div>
            <div className="p-2.5 border border-gray-200 rounded-full w-[48px] h-[48px]"></div>
            <div className="px-4 py-2.5 border border-gray-200 rounded-full w-48 lg:w-64 h-[48px]"></div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-24 space-y-12 pb-24">
        {/* Text Drafts Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Textentwürfe</h3>
            <button
              onClick={handleRegenerateTexts}
              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium z-30"
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
                {draft.contentType && (
                  <div className="mb-2 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">
                      Typ: {draft.contentType}
                    </span>
                    {draft.sourceContext && (
                      <span className="text-xs text-gray-400">
                        Quelle: {draft.sourceContext}
                      </span>
                    )}
                  </div>
                )}
                
                <p className="text-gray-700 leading-relaxed">{draft.content}</p>
                
                {draft.tags && draft.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {draft.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {draft.tags.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        +{draft.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {draft.isSelected && (
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-sm text-[#2c2c2c] font-medium">Ausgewählt</span>
                    <div className="flex items-center space-x-1 text-gray-500 text-xs">
                      <span>{draft.title}</span>
                      {draft.contentType && <span>• {draft.contentType}</span>}
                    </div>
                  </div>
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
              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium z-30"
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
                  {draft.contentType && <p className="text-xs mt-1 opacity-80">{draft.contentType}</p>}
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

      {/* Action Bar - Fixed */}
      <div className="sticky bottom-0 bg-[#fafafa]">
        <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100">
              Bearbeiten
            </button>
            <button className="px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100">
              Speichern
            </button>
            <button className="px-5 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium ml-auto">
              Exportieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 