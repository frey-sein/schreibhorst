'use client';

import { FileItem } from '@/lib/services/storage';
import { useEffect, useState } from 'react';

interface ImagePreviewProps {
  file: FileItem;
  onClose: () => void;
}

export default function ImagePreview({ file, onClose }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('ImagePreview Mount:', {
      name: file.name,
      type: file.fileType,
      hasContent: !!file.content,
      contentLength: file.content?.length,
      contentStart: file.content?.substring(0, 50)
    });

    if (!file.content || !file.fileType) {
      setError('Keine Bilddaten oder Dateityp verfügbar');
      return;
    }

    try {
      // Der Content sollte bereits eine vollständige Data URL sein
      setImageUrl(file.content);
    } catch (err) {
      console.error('Fehler beim Erstellen der Bildvorschau:', err);
      setError('Fehler beim Erstellen der Bildvorschau');
    }
  }, [file]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="mt-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <p className="text-sm text-gray-500 mt-2">Debug-Info:</p>
              <pre className="text-xs text-left bg-gray-100 p-2 mt-2 rounded">
                {JSON.stringify({
                  name: file.name,
                  type: file.fileType,
                  hasContent: !!file.content,
                  contentStart: file.content?.substring(0, 50)
                }, null, 2)}
              </pre>
            </div>
          ) : imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={file.name}
                className="max-h-[70vh] w-auto mx-auto"
                style={{ maxWidth: '100%' }}
                onError={(e) => {
                  console.error('Fehler beim Laden des Bildes:', e);
                  setError('Fehler beim Laden des Bildes');
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Lade Vorschau...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 