'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  prompt: string;
  sources: string[]; // URLs für die Recherche
  watchedFolders: string[]; // Überwachte Ordner im Dateimanager
  knowledgeCategories: string[]; // Ausgewählte Kategorien aus dem Wissensbereich
}

const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Ben',
    role: 'Texter und Recherche',
    schedule: {
      frequency: 'daily',
      time: '09:00'
    },
    topics: ['AZAV'],
    avatar: '/images/avatars/male-writer.png',
    status: 'active',
    prompt: 'Der Agent liest einmal täglich die tagesschau ;-)',
    sources: ['https://www.tagesschau.de'],
    watchedFolders: ['/dokumente/recherche', '/dokumente/artikel'],
    knowledgeCategories: ['Nachrichten', 'Bildung']
  },
  // Weitere Agenten hier...
];

// Hilfsfunktionen für localStorage
const loadAgents = (): Agent[] => {
  if (typeof window === 'undefined') return MOCK_AGENTS;
  try {
    const saved = localStorage.getItem('agents');
    if (!saved) {
      localStorage.setItem('agents', JSON.stringify(MOCK_AGENTS));
      return MOCK_AGENTS;
    }
    const parsedAgents = JSON.parse(saved);
    // Stelle sicher, dass jeder Agent ein gültiges schedule-Objekt hat
    return parsedAgents.map((agent: Agent) => ({
      ...agent,
      schedule: {
        frequency: agent.schedule?.frequency || 'daily',
        time: agent.schedule?.time || '09:00',
        days: agent.schedule?.days
      }
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Agenten:', error);
    return MOCK_AGENTS;
  }
};

const saveAgents = (agents: Agent[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('agents', JSON.stringify(agents));
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const router = useRouter();

  // Lade Agenten nur auf Client-Seite
  useEffect(() => {
    setAgents(loadAgents());
  }, []);

  const handleEditAgent = (agentId: string) => {
    router.push(`/agents/${agentId}/edit`);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Möchten Sie diesen Agenten wirklich löschen?')) return;
    
    try {
      const updatedAgents = agents.filter(agent => agent.id !== agentId);
      setAgents(updatedAgents);
      saveAgents(updatedAgents);
    } catch (error) {
      console.error('Fehler beim Löschen des Agenten:', error);
    }
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
                <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Agenten</h2>
                <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">
                  Übersicht und Verwaltung der Agenten
                </p>
              </div>
              <button
                onClick={() => router.push('/agents/new')}
                className="px-4 py-2.5 text-sm font-medium text-white bg-[#2c2c2c] border border-transparent rounded-full hover:bg-[#1a1a1a] transition-colors"
              >
                Neuer Agent
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar im Kreis */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                      <Image
                        src={agent.avatar || '/images/default-avatar.png'}
                        alt={`Avatar von ${agent.name}`}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        priority
                      />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>

                    {/* Agent Info */}
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                        <span className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
                          {agent.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {agent.schedule.frequency === 'daily' 
                          ? `Täglich um ${agent.schedule.time}`
                          : `${agent.schedule.frequency === 'weekly' ? 'Wöchentlich' : 'Monatlich'} um ${agent.schedule.time}${
                              agent.schedule.days ? ` (${agent.schedule.days.join(', ')})` : ''
                            }`}
                      </p>
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                        {agent.prompt}
                      </p>
                      
                      {/* Überwachte Ordner */}
                      {agent.watchedFolders && agent.watchedFolders.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Überwachte Ordner:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.watchedFolders.map((folder, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-md"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                {folder}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Wissensbereiche */}
                      {agent.knowledgeCategories && agent.knowledgeCategories.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Wissensbereiche:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.knowledgeCategories.map((category, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-md"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Datenquellen */}
                      {agent.sources && agent.sources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Datenquellen:</p>
                          <div className="space-y-1">
                            {agent.sources.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-[#2c2c2c] hover:text-[#1a1a1a] truncate"
                              >
                                {url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                    <button 
                      onClick={() => handleEditAgent(agent.id)}
                      className="p-2 text-gray-400 hover:text-[#2c2c2c] transition-colors"
                      title="Agent bearbeiten"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Agent löschen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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