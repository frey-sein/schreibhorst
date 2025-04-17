'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../components/Header';
import { TagIcon, PhotoIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

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

// Hilfsfunktionen für localStorage
const loadStile = (): Stil[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem('schreibstile');
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error('Fehler beim Laden der Schreibstile:', error);
    return [];
  }
};

const saveStile = (stile: Stil[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('schreibstile', JSON.stringify(stile));
};

export default function EditStilPage() {
  const router = useRouter();
  const params = useParams();
  const stilId = params.id as string;
  const isNewStil = stilId === 'new';

  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [beispiel, setBeispiel] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lade Stil-Daten, wenn es sich um eine Bearbeitung handelt
  useEffect(() => {
    if (!isNewStil) {
      const stile = loadStile();
      const stil = stile.find(s => s.id === stilId);
      
      if (stil) {
        setName(stil.name);
        setBeschreibung(stil.beschreibung);
        setTags(stil.tags || []);
        setPrompt(stil.prompt);
        setBeispiel(stil.beispiel || '');
        setAvatar(stil.avatar || '');
      } else {
        setError('Schreibstil nicht gefunden');
        setTimeout(() => {
          router.push('/stile');
        }, 2000);
      }
    }
  }, [stilId, isNewStil, router]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const stile = loadStile();
      const currentDate = new Date().toISOString();
      
      if (isNewStil) {
        // Erzeuge neue ID für neuen Stil
        const newId = `stil_${Date.now()}`;
        const newStil: Stil = {
          id: newId,
          name,
          beschreibung,
          tags,
          avatar: avatar || undefined,
          prompt,
          beispiel: beispiel || undefined,
          erstellt: currentDate,
        };
        
        saveStile([...stile, newStil]);
      } else {
        // Aktualisiere bestehenden Stil
        const updatedStile = stile.map(s => {
          if (s.id === stilId) {
            return {
              ...s,
              name,
              beschreibung,
              tags,
              avatar: avatar || undefined,
              prompt,
              beispiel: beispiel || undefined,
              bearbeitet: currentDate,
            };
          }
          return s;
        });
        
        saveStile(updatedStile);
      }
      
      // Zurück zur Übersicht
      router.push('/stile');
    } catch (error) {
      console.error('Fehler beim Speichern des Schreibstils:', error);
      setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/stile');
  };

  return (
    <>
      <Header />
      <main className="flex min-h-screen pt-[72px]">
        <div className="w-full flex flex-col h-full bg-[#f0f0f0]">
          {/* Header */}
          <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="flex justify-between items-start gap-4 w-full">
              <div className="flex-1">
                <button 
                  onClick={handleCancel}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span className="text-sm">Zurück</span>
                </button>
                <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">
                  {isNewStil ? 'Neuen Schreibstil erstellen' : 'Schreibstil bearbeiten'}
                </h2>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name des Schreibstils <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
                    placeholder="z.B. Business Formal"
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="beschreibung"
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value)}
                    required
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900 resize-none"
                    placeholder="Kurze Beschreibung des Schreibstils"
                  />
                </div>
                
                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
                      placeholder="Tag hinzufügen und Enter drücken"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Hinzufügen
                    </button>
                  </div>
                  
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          <TagIcon className="h-3.5 w-3.5" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Avatar/Bild URL */}
                <div>
                  <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
                    Bild URL (optional)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      id="avatar"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
                      placeholder="URL zu einem Bild, das den Stil repräsentiert"
                    />
                    {avatar ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img 
                          src={avatar} 
                          alt="Vorschau" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                          }} 
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100 border border-gray-200">
                        <PhotoIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt für den Schreibstil <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
                    placeholder="Anweisungen für das KI-Modell, wie es in diesem Stil schreiben soll"
                  />
                </div>

                {/* Beispiel */}
                <div>
                  <label htmlFor="beispiel" className="block text-sm font-medium text-gray-700 mb-1">
                    Beispieltext (optional)
                  </label>
                  <textarea
                    id="beispiel"
                    value={beispiel}
                    onChange={(e) => setBeispiel(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
                    placeholder="Ein kurzes Beispiel für diesen Schreibstil"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-6 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] transition-colors ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Wird gespeichert...' : isNewStil ? 'Erstellen' : 'Speichern'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
} 