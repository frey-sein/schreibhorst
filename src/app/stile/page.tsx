'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

interface Stil {
  id: string;
  name: string;
  beschreibung: string;
  tags: string[];
  avatar?: string;
  prompt: string;
  beispiel?: string;
  erstellt: string;
  bearbeitet?: string;
}

const MOCK_STILE: Stil[] = [
  {
    id: '1',
    name: 'Business Formal',
    beschreibung: 'Professioneller und formeller Schreibstil für Geschäftskommunikation',
    tags: ['Business', 'Formal', 'Seriös'],
    avatar: '/images/business-formal.jpg',
    prompt: 'Schreibe in einem formellen, präzisen und professionellen Business-Stil. Verwende klare Strukturen, sachliche Ausdrücke und vermeide umgangssprachliche Wendungen. Der Ton sollte höflich und respektvoll sein.',
    beispiel: 'Sehr geehrte Damen und Herren,\n\nwir freuen uns, Ihnen mitteilen zu können, dass die geplante Implementierung des neuen CRM-Systems planmäßig verläuft...',
    erstellt: '2023-05-15T14:30:00Z',
  },
  {
    id: '2',
    name: 'Kreativ und Storytelling',
    beschreibung: 'Unterhaltsamer, bildhafter Stil für Marketing und Storytelling',
    tags: ['Kreativ', 'Marketing', 'Narrativ'],
    avatar: '/images/creative-storytelling.jpg',
    prompt: 'Schreibe in einem lebendigen, bildhaften und narrativen Stil. Verwende Metaphern, direkte Ansprache und emotionale Sprache. Erzähle Geschichten, die beim Leser Bilder erzeugen und Emotionen wecken.',
    beispiel: 'Stellen Sie sich vor: Die Morgensonne kriecht gerade über den Horizont, als Sie den ersten Schluck Ihres frisch gebrühten Kaffees nehmen...',
    erstellt: '2023-06-22T09:15:00Z',
    bearbeitet: '2023-07-05T11:20:00Z',
  },
  {
    id: '3',
    name: 'Wissenschaftlich',
    beschreibung: 'Faktenbasierter, objektiver Stil für wissenschaftliche und akademische Inhalte',
    tags: ['Wissenschaftlich', 'Faktenbasiert', 'Objektiv'],
    avatar: '/images/scientific.jpg',
    prompt: 'Schreibe in einem präzisen, faktenbasierten und objektiven Stil. Verwende Fachbegriffe angemessen und achte auf logische Argumentationsketten. Verweise auf potenzielle Quellen und halte einen neutralen Ton.',
    beispiel: 'Die Studie zeigt signifikante Korrelationen (p < 0.05) zwischen den untersuchten Variablen. Die Ergebnisse deuten darauf hin, dass...',
    erstellt: '2023-08-10T16:45:00Z',
  },
];

// Hilfsfunktionen für localStorage
const loadStile = (): Stil[] => {
  if (typeof window === 'undefined') return MOCK_STILE;
  try {
    const saved = localStorage.getItem('schreibstile');
    if (!saved) {
      localStorage.setItem('schreibstile', JSON.stringify(MOCK_STILE));
      return MOCK_STILE;
    }
    return JSON.parse(saved);
  } catch (error) {
    console.error('Fehler beim Laden der Schreibstile:', error);
    return MOCK_STILE;
  }
};

const saveStile = (stile: Stil[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('schreibstile', JSON.stringify(stile));
};

export default function StilePage() {
  const [stile, setStile] = useState<Stil[]>(MOCK_STILE);
  const router = useRouter();
  const [avatars, setAvatars] = useState<string[]>([]);

  // Lade Stile nur auf Client-Seite
  useEffect(() => {
    setStile(loadStile());
    
    // Avatare aus localStorage laden
    try {
      const storedAvatars = localStorage.getItem('avatars');
      if (storedAvatars) {
        setAvatars(JSON.parse(storedAvatars));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Avatare:', error);
    }
  }, []);

  const handleEditStil = (stilId: string) => {
    router.push(`/stile/${stilId}/edit`);
  };

  const handleDeleteStil = async (stilId: string) => {
    if (!confirm('Möchten Sie diesen Schreibstil wirklich löschen?')) return;
    
    try {
      const updatedStile = stile.filter(stil => stil.id !== stilId);
      setStile(updatedStile);
      saveStile(updatedStile);
    } catch (error) {
      console.error('Fehler beim Löschen des Schreibstils:', error);
    }
  };

  // Hilfsfunktion für formatiertes Datum
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('de-DE', options);
  };

  return (
    <>
      <Header />
      <main className="flex h-screen pt-[72px]">
        <div className="w-full flex flex-col h-full bg-[#f0f0f0]">
          {/* Header */}
          <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="flex justify-between items-start gap-4 w-full">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Schreibstile</h2>
                <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">
                  Verwalten Sie verschiedene Schreibstile für Ihre Texte
                </p>
              </div>
              <button
                onClick={() => router.push('/stile/new')}
                className="px-4 py-2.5 text-sm font-medium text-white bg-[#2c2c2c] border border-transparent rounded-full hover:bg-[#1a1a1a] transition-colors"
              >
                Neuer Stil
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stile.map((stil) => (
                <div
                  key={stil.id}
                  className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar/Bild */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                      {stil.avatar ? (
                        <Image
                          src={stil.avatar}
                          alt={`Bild für ${stil.name}`}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                          priority
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Verhindert Endlosschleifen
                            target.src = "/images/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <PencilIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Stil Info */}
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{stil.name}</h3>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Erstellt am {formatDate(stil.erstellt)}
                        {stil.bearbeitet && ` • Zuletzt bearbeitet am ${formatDate(stil.bearbeitet)}`}
                      </p>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {stil.beschreibung}
                      </p>

                      {/* Tags */}
                      {stil.tags && stil.tags.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {stil.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-md"
                              >
                                <TagIcon className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prompt-Vorschau */}
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Prompt:</p>
                        <div className="p-2 bg-gray-50 rounded-md">
                          <p className="text-xs text-gray-600 line-clamp-3">
                            {stil.prompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                    <button 
                      onClick={() => handleEditStil(stil.id)}
                      className="p-2 text-gray-400 hover:text-[#2c2c2c] transition-colors"
                      title="Stil bearbeiten"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteStil(stil.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Stil löschen"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 