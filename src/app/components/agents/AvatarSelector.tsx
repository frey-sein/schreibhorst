'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export type AvatarOption = {
  id: string;
  imagePath: string;
  alt: string;
  category: 'female' | 'male';
};

interface AvatarSelectorProps {
  selectedAvatar?: string;
  onSelect: (avatar: string) => void;
}

export default function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
  const [filter, setFilter] = useState<'all' | 'female' | 'male'>('all');
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);

  useEffect(() => {
    // Lade die verfügbaren Avatare
    const loadAvatars = async () => {
      try {
        const response = await fetch('/api/list-avatars');
        if (!response.ok) {
          throw new Error('Fehler beim Laden der Avatare');
        }
        const data = await response.json();
        setAvatars(data.avatars);
      } catch (error) {
        console.error('Fehler beim Laden der Avatare:', error);
      }
    };

    loadAvatars();
  }, []);

  const filteredAvatars = avatars.filter(avatar => 
    filter === 'all' || avatar.category === filter
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            filter === 'all'
              ? 'bg-[#2c2c2c] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        <button
          type="button"
          onClick={() => setFilter('female')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            filter === 'female'
              ? 'bg-[#2c2c2c] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Weiblich
        </button>
        <button
          type="button"
          onClick={() => setFilter('male')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            filter === 'male'
              ? 'bg-[#2c2c2c] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Männlich
        </button>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {filteredAvatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.imagePath)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              selectedAvatar === avatar.imagePath
                ? 'border-[#2c2c2c] ring-2 ring-[#2c2c2c] ring-offset-2'
                : 'border-gray-200 hover:border-[#2c2c2c]'
            }`}
          >
            <Image
              src={avatar.imagePath}
              alt={avatar.alt}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>
      
      {filteredAvatars.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Keine Avatare in dieser Kategorie gefunden
        </div>
      )}
    </div>
  );
} 