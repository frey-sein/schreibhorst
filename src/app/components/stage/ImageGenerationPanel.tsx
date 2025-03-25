import { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  ArrowDownTrayIcon 
} from '@heroicons/react/24/outline';
import { GeneratedImage } from '@/lib/types';

interface ImageGenerationPanelProps {
  images: GeneratedImage[];
  onRegenerate: (imageId: string) => void;
}

export default function ImageGenerationPanel({ images, onRegenerate }: ImageGenerationPanelProps) {
  useEffect(() => {
    console.log('Received images:', images);
  }, [images]);

  const downloadHighResImage = async (imageId: string, prompt: string) => {
    try {
      console.log('Downloading image:', imageId);
      const response = await fetch(`/api/images/${imageId}/highres`);
      if (!response.ok) throw new Error('Fehler beim Laden des Bildes');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_2048x2048.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Download:', error);
    }
  };

  if (!images || images.length === 0) {
    return <div className="p-4 text-gray-500">Keine Bilder verfügbar</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {images.map((image) => {
        console.log('Rendering image:', image);
        return (
          <div key={image.id} className="relative border rounded-lg shadow-sm bg-white p-2">
            <div className="aspect-square relative">
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.prompt || 'Generiertes Bild'}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Bild wird geladen...
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex gap-2 bg-white/80 p-1 rounded-lg backdrop-blur-sm">
                <button
                  onClick={() => onRegenerate(image.id)}
                  className="p-2 bg-white rounded-full text-gray-800 shadow-md hover:bg-gray-100 transition-colors"
                  title="Bild neu generieren"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => downloadHighResImage(image.id, image.prompt)}
                  className="p-2 bg-white rounded-full text-gray-800 shadow-md hover:bg-gray-100 transition-colors"
                  title="Hochauflösendes Bild herunterladen (2048x2048)"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            {image.prompt && (
              <div className="mt-2 text-sm text-gray-600 truncate">
                {image.prompt}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 