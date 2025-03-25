'use client';

import { useState, useEffect } from 'react';

interface AvatarSelectorProps {
  selectedAvatar?: string;
  onSelect: (avatar: string) => void;
  isAdminView?: boolean;
}

// Standard-Avatare, die immer verfügbar sind
const DEFAULT_AVATARS = [
  '/images/avatars/male-writer.png',
  '/images/avatars/female-worker.png',
  '/images/avatars/male-soldier.png',
  '/images/avatars/female-doctor.png'
];

export default function AvatarSelector({ selectedAvatar, onSelect, isAdminView = false }: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    const loadAvatars = () => {
      // Beginne mit den Standard-Avataren
      const defaultImages = [...DEFAULT_AVATARS];
      
      // Versuche, benutzerdefinierte Avatare aus dem localStorage zu laden
      try {
        const storedAvatars = localStorage.getItem('avatars');
        if (storedAvatars) {
          const parsed = JSON.parse(storedAvatars);
          // Kombiniere die Standard-Avatare mit den benutzerdefinierten Avataren
          setAvatars([...defaultImages, ...parsed]);
          return;
        }
      } catch (error) {
        console.error('Fehler beim Laden der Avatare aus dem localStorage:', error);
      }
      
      // Fallback: Nur Standard-Avatare anzeigen
      setAvatars(defaultImages);
    };
    
    loadAvatars();
  }, []);

  const handleDeleteAvatar = (indexToDelete: number, avatar: string) => {
    if (window.confirm('Möchten Sie diesen Avatar wirklich löschen?')) {
      // Wenn es sich um einen Standard-Avatar handelt, können wir ihn nicht löschen
      if (DEFAULT_AVATARS.includes(avatar)) {
        alert('Standard-Avatare können nicht gelöscht werden.');
        return;
      }
      
      // Entferne den Avatar aus der Anzeige
      const newAvatars = avatars.filter(a => a !== avatar);
      setAvatars(newAvatars);
      
      // Entferne den Avatar aus dem localStorage
      try {
        const storedAvatars = localStorage.getItem('avatars');
        if (storedAvatars) {
          const customAvatars = JSON.parse(storedAvatars).filter((a: string) => a !== avatar);
          localStorage.setItem('avatars', JSON.stringify(customAvatars));
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Avatare im localStorage:', error);
      }
    }
  };

  // Filterung der Avatare basierend auf der ausgewählten Kategorie
  const filteredAvatars = filter === 'all' 
    ? avatars 
    : avatars.filter(avatar => {
        // Standard-Avatare können nach Dateinamen gefiltert werden
        if (avatar.startsWith('/')) {
          if (filter === 'male') {
            return avatar.toLowerCase().includes('male');
          } else if (filter === 'female') {
            return avatar.toLowerCase().includes('female');
          }
        }
        // Base64-kodierte Bilder können wir nicht nach Geschlecht filtern
        return true;
      });

  return (
    <div className="space-y-4">
      {isAdminView && (
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm rounded-full ${
              filter === 'all'
                ? 'bg-[#2c2c2c] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('male')}
            className={`px-4 py-2 text-sm rounded-full ${
              filter === 'male'
                ? 'bg-[#2c2c2c] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Männlich
          </button>
          <button
            onClick={() => setFilter('female')}
            className={`px-4 py-2 text-sm rounded-full ${
              filter === 'female'
                ? 'bg-[#2c2c2c] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Weiblich
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredAvatars.map((avatar, index) => (
          <div key={index} className="relative group">
            <div
              className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                selectedAvatar === avatar
                  ? 'border-[#2c2c2c] shadow-md'
                  : 'border-transparent hover:border-gray-200'
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
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            {isAdminView && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAvatar(index, avatar);
                  }}
                  className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  title={DEFAULT_AVATARS.includes(avatar) ? 'Standard-Avatar (kann nicht gelöscht werden)' : 'Avatar löschen'}
                  disabled={DEFAULT_AVATARS.includes(avatar)}
                  style={{ opacity: DEFAULT_AVATARS.includes(avatar) ? 0.5 : 1 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredAvatars.length === 0 && (
        <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
          Keine Avatare in dieser Kategorie gefunden
        </div>
      )}
    </div>
  );
} 