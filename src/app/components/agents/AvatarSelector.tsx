'use client';

import { useState, useEffect } from 'react';

interface AvatarSelectorProps {
  selectedAvatar?: string;
  onSelect: (avatar: string) => void;
  isAdminView?: boolean;
}

// Standard-Avatare, die immer verfügbar sind
const DEFAULT_AVATARS: string[] = [];

export default function AvatarSelector({ selectedAvatar, onSelect, isAdminView = false }: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    const loadAvatars = () => {
      // Benutzerdefinierte Avatare aus dem localStorage laden
      try {
        const storedAvatars = localStorage.getItem('avatars');
        if (storedAvatars) {
          const customAvatars = JSON.parse(storedAvatars);
          setAvatars(customAvatars);
        } else {
          setAvatars([]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Avatare aus dem localStorage:', error);
        setAvatars([]);
      }
    };
    
    loadAvatars();
  }, []);

  const handleDeleteAvatar = (indexToDelete: number, avatar: string) => {
    if (window.confirm('Möchten Sie diesen Avatar wirklich löschen?')) {
      // Aktualisiere die Anzeige
      const newAvatars = avatars.filter((_, index) => index !== indexToDelete);
      setAvatars(newAvatars);
      
      // Speichere die aktualisierten Avatare
      try {
        localStorage.setItem('avatars', JSON.stringify(newAvatars));
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Avatare im localStorage:', error);
      }
    }
  };

  // Filtere Avatare, falls ein Filter aktiviert ist
  const filteredAvatars = avatars;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-3">
        {filteredAvatars.map((avatar, index) => (
          <div key={index} className="relative group">
            <div
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                selectedAvatar === avatar
                  ? 'border-[#2c2c2c] shadow-md scale-105'
                  : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => onSelect(avatar)}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error(`Fehler beim Laden des Bildes: ${avatar}`);
                    // Setze ein Fallback-Bild
                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'%3E%3C/path%3E%3C/svg%3E";
                    target.classList.add('bg-gray-100');
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              
              {selectedAvatar === avatar && (
                <div className="absolute bottom-0 right-0 bg-[#2c2c2c] text-white p-1 rounded-tl-md">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            
            {isAdminView && (
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAvatar(index, avatar);
                  }}
                  className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none"
                  title="Avatar löschen"
                >
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredAvatars.length === 0 && (
        <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-lg text-sm">
          Keine Avatare vorhanden. Bitte laden Sie Avatare im Verwaltungsbereich hoch.
        </div>
      )}
    </div>
  );
} 