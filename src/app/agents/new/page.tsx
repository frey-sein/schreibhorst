'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Image from 'next/image';
import AvatarSelector from '../../components/agents/AvatarSelector';
import FolderSelector from '../../components/agents/FolderSelector';
import KnowledgeSelector from '../../components/agents/KnowledgeSelector';

interface Agent {
  id: string;
  name: string;
  role: string;
  schedule: {
    frequency: string;
    time: string;
    days?: string[];
  };
  topics: string[];
  avatar?: string;
  status: 'active' | 'inactive';
  prompt?: string;
  sources?: string[];
  watchedFolders?: string[];
  knowledgeCategories?: string[];
}

export default function NewAgentPage() {
  const router = useRouter();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false);
  const [formData, setFormData] = useState<Partial<Agent>>({
    schedule: {
      frequency: 'daily',
      time: '09:00'
    },
    topics: [],
    status: 'active',
    watchedFolders: [],
    knowledgeCategories: []
  });

  const handleAvatarSelect = (avatarPath: string) => {
    setFormData({ ...formData, avatar: avatarPath });
    setShowAvatarModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Generiere eine eindeutige ID
      const newId = crypto.randomUUID();
      
      // Erstelle einen vollständigen Agenten
      const newAgent: Agent = {
        id: newId,
        name: formData.name || 'Neuer Agent',
        role: formData.role || '',
        schedule: {
          frequency: formData.schedule?.frequency || 'daily',
          time: formData.schedule?.time || '09:00',
          days: formData.schedule?.days
        },
        topics: formData.topics || [],
        avatar: formData.avatar,
        status: formData.status || 'inactive',
        prompt: formData.prompt || '',
        sources: formData.sources || [],
        watchedFolders: formData.watchedFolders || [],
        knowledgeCategories: formData.knowledgeCategories || []
      };

      // Lade aktuelle Agenten
      const agents = JSON.parse(localStorage.getItem('agents') || '[]');
      // Füge den neuen Agenten hinzu
      const updatedAgents = [...agents, newAgent];
      // Speichere die aktualisierten Agenten
      localStorage.setItem('agents', JSON.stringify(updatedAgents));
      
      router.push('/agents');
    } catch (error) {
      console.error('Fehler beim Erstellen des Agenten:', error);
    }
  };

  // Ordner-Auswahl
  const handleFolderSelect = (folders: string[]) => {
    setFormData({ ...formData, watchedFolders: folders });
  };

  // Wissensbereiche-Auswahl
  const handleKnowledgeSelect = (categories: string[]) => {
    setFormData({ ...formData, knowledgeCategories: categories });
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
                <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Neuen Agenten erstellen</h2>
                <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">
                  Erstellen Sie einen neuen Agenten
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-gray-100 space-y-6">
                  {/* Avatar-Bereich */}
                  <div className="flex items-center space-x-4">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                      {formData.avatar ? (
                        <Image
                          src={formData.avatar}
                          alt="Avatar"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      className="text-sm text-[#2c2c2c] hover:text-[#1a1a1a]"
                    >
                      Avatar auswählen
                    </button>
                  </div>

                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Rolle */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Rolle
                    </label>
                    <input
                      type="text"
                      id="role"
                      value={formData.role || ''}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Zeitplan */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Zeitplan
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="frequency" className="block text-sm text-gray-600">
                          Häufigkeit
                        </label>
                        <select
                          id="frequency"
                          value={formData.schedule?.frequency || 'daily'}
                          onChange={(e) => setFormData({
                            ...formData,
                            schedule: {
                              frequency: e.target.value,
                              time: formData.schedule?.time || '09:00',
                              days: formData.schedule?.days
                            }
                          })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="daily">Täglich</option>
                          <option value="weekly">Wöchentlich</option>
                          <option value="monthly">Monatlich</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="time" className="block text-sm text-gray-600">
                          Uhrzeit
                        </label>
                        <input
                          type="time"
                          id="time"
                          value={formData.schedule?.time || '09:00'}
                          onChange={(e) => setFormData({
                            ...formData,
                            schedule: {
                              frequency: formData.schedule?.frequency || 'daily',
                              time: e.target.value,
                              days: formData.schedule?.days
                            }
                          })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {formData.schedule?.frequency !== 'daily' && (
                      <div>
                        <label htmlFor="days" className="block text-sm text-gray-600">
                          Tage
                        </label>
                        <select
                          id="days"
                          multiple
                          value={formData.schedule?.days || []}
                          onChange={(e) => {
                            const selectedDays = Array.from(e.target.selectedOptions).map(option => option.value);
                            setFormData({
                              ...formData,
                              schedule: {
                                frequency: formData.schedule?.frequency || 'daily',
                                time: formData.schedule?.time || '09:00',
                                days: selectedDays
                              }
                            });
                          }}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Montag">Montag</option>
                          <option value="Dienstag">Dienstag</option>
                          <option value="Mittwoch">Mittwoch</option>
                          <option value="Donnerstag">Donnerstag</option>
                          <option value="Freitag">Freitag</option>
                          <option value="Samstag">Samstag</option>
                          <option value="Sonntag">Sonntag</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Halten Sie Strg/Cmd gedrückt, um mehrere Tage auszuwählen
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status || 'inactive'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </div>

                  {/* Prompt Eingabe */}
                  <div className="col-span-6">
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                      Prompt
                    </label>
                    <textarea
                      id="prompt"
                      name="prompt"
                      rows={3}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] sm:text-sm p-2 text-gray-900"
                      placeholder="Beschreiben Sie die Aufgabe des Agenten..."
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    />
                  </div>

                  {/* Datenquellen */}
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Datenquellen
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Fügen Sie URLs hinzu, die der Agent für die Recherche nutzen soll
                    </p>
                    <div className="space-y-2">
                      {formData.sources?.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                              const newSources = [...(formData.sources || [])];
                              newSources[index] = e.target.value;
                              setFormData({ ...formData, sources: newSources });
                            }}
                            className="flex-1 rounded-lg border border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] sm:text-sm p-2 text-gray-900"
                            placeholder="https://..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newSources = [...(formData.sources || [])];
                              newSources.splice(index, 1);
                              setFormData({ ...formData, sources: newSources });
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          sources: [...(formData.sources || []), ''] 
                        })}
                        className="mt-2 px-4 py-2 text-sm text-[#2c2c2c] border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        + Neue Quelle hinzufügen
                      </button>
                    </div>
                  </div>

                  {/* Überwachte Ordner */}
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Überwachte Ordner
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Wählen Sie Ordner aus, die der Agent überwachen soll
                    </p>
                    <div className="space-y-2">
                      {formData.watchedFolders?.map((folder, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-900">{folder}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newFolders = [...(formData.watchedFolders || [])];
                              newFolders.splice(index, 1);
                              setFormData({ ...formData, watchedFolders: newFolders });
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowFolderSelector(true)}
                        className="mt-2 px-4 py-2 text-sm text-[#2c2c2c] border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        + Ordner auswählen
                      </button>
                    </div>
                  </div>

                  {/* Wissensbereiche */}
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Wissensbereiche
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Wählen Sie relevante Kategorien aus dem Wissensbereich
                    </p>
                    <div className="space-y-2">
                      {formData.knowledgeCategories?.map((category, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-sm text-gray-900">{category}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newCategories = [...(formData.knowledgeCategories || [])];
                              newCategories.splice(index, 1);
                              setFormData({ ...formData, knowledgeCategories: newCategories });
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowKnowledgeSelector(true)}
                        className="mt-2 px-4 py-2 text-sm text-[#2c2c2c] border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        + Kategorie auswählen
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/agents')}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-[#2c2c2c] border border-transparent rounded-full hover:bg-[#1a1a1a]"
                  >
                    Erstellen
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Avatar-Auswahl Modal */}
          {showAvatarModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowAvatarModal(false)}></div>
                </div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                          Avatar auswählen
                        </h3>
                        <div className="mt-2">
                          <AvatarSelector
                            selectedAvatar={formData.avatar}
                            onSelect={handleAvatarSelect}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selector Modals */}
          <FolderSelector
            isOpen={showFolderSelector}
            onClose={() => setShowFolderSelector(false)}
            onSelect={handleFolderSelect}
            selectedFolders={formData.watchedFolders || []}
          />
          <KnowledgeSelector
            isOpen={showKnowledgeSelector}
            onClose={() => setShowKnowledgeSelector(false)}
            onSelect={handleKnowledgeSelect}
            selectedCategories={formData.knowledgeCategories || []}
          />
        </div>
      </main>
    </>
  );
} 