'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import AvatarSelector from '../components/agents/AvatarSelector';
import * as knowledgeService from '../../lib/services/knowledgeService';

interface Agent {
  id: string;
  name: string;
  imageUrl?: string;
  role?: string;
  schedule?: {
    frequency: string;
    time: string;
  };
  status: string;
  prompt?: string;
  sources?: string[];
  watchedFolders?: string[];
  knowledgeCategories?: string[];
}

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(undefined);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'male' | 'female'>('male');
  const [isResetting, setIsResetting] = useState(false);
  const [isUploadingAvatars, setIsUploadingAvatars] = useState(false);
  const [activeTab, setActiveTab] = useState<'avatare' | 'dateisystem' | 'wissensdatenbank' | 'datenbank' | 'system'>('avatare');

  useEffect(() => {
    setMounted(true);

    // Stelle die vorhandenen Avatar-Bilder aus den Agenten-Profilen wieder her
    const restoreAvatars = () => {
      const storedAgents = localStorage.getItem('agents');
      if (!storedAgents) return;

      try {
        const agents: Agent[] = JSON.parse(storedAgents);
        const existingAvatars = agents
          .map((agent: Agent) => agent.imageUrl)
          .filter((url: string | undefined) => url && url !== '');

        if (existingAvatars.length > 0) {
          // Speichere die wiederhergestellten Avatare
          localStorage.setItem('avatars', JSON.stringify(existingAvatars));
          window.location.reload();
        }
      } catch (error) {
        console.error('Fehler beim Wiederherstellen der Avatare:', error);
      }
    };

    // Prüfe, ob bereits Avatare existieren
    const existingAvatars = localStorage.getItem('avatars');
    if (!existingAvatars) {
      restoreAvatars();
    }
  }, []);

  useEffect(() => {
    // Wenn der Benutzer nicht eingeloggt oder kein Admin ist, zur Startseite weiterleiten
    if (mounted && !isLoading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, isLoading, mounted, router]);

  const resetStorage = () => {
    if (window.confirm('Möchten Sie wirklich das Dateisystem zurücksetzen? Alle Dateien und Ordner werden gelöscht.')) {
      localStorage.removeItem('filemanager_files');
      localStorage.removeItem('filemanager_state');
      window.location.reload();
    }
  };
  
  // Funktion zum Leeren der Wissensdatenbank
  const clearKnowledgeBase = () => {
    setShowClearConfirmation(true);
  };
  
  // Funktion zum Bestätigen des Löschens der Wissensdatenbank
  const confirmClearKnowledgeBase = async () => {
    try {
      setIsResetting(true);
      // Hole alle FAQs
      const faqs = await knowledgeService.getAllFAQs();
      
      // Lösche jedes FAQ-Item einzeln
      let success = true;
      for (const faq of faqs) {
        const deleted = await knowledgeService.deleteFAQ(faq.id);
        if (!deleted) {
          success = false;
        }
      }
      
      if (success) {
        alert('Die Wissensdatenbank wurde erfolgreich geleert.');
        // Seite neu laden, damit alle Änderungen übernommen werden
        window.location.reload();
      } else {
        alert('Einige Einträge konnten nicht gelöscht werden.');
      }
    } catch (error) {
      console.error('Fehler beim Leeren der Wissensdatenbank:', error);
      alert('Fehler beim Leeren der Wissensdatenbank');
    } finally {
      setIsResetting(false);
      setShowClearConfirmation(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploadingAvatars(true);
    try {
      // Lade die vorhandenen Avatare
      let existingAvatars: string[] = [];
      const storedAvatars = localStorage.getItem('avatars');
      if (storedAvatars) {
        try {
          existingAvatars = JSON.parse(storedAvatars);
        } catch (e) {
          console.error('Fehler beim Parsen der vorhandenen Avatare:', e);
          existingAvatars = [];
        }
      }

      // Konvertiere die Bilder in Base64
      const newAvatars: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        newAvatars.push(base64);
      }

      // Speichere die Avatare im localStorage
      localStorage.setItem('avatars', JSON.stringify([...existingAvatars, ...newAvatars]));
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Hochladen der Avatare:', error);
    } finally {
      setIsUploadingAvatars(false);
    }
  };

  const handleClearAvatars = () => {
    if (window.confirm('Sind Sie sicher, dass Sie alle Avatare löschen möchten?')) {
      localStorage.removeItem('avatars');
      window.location.reload();
    }
  };

  // Funktion zum Zurücksetzen aller Bilder und Snapshots (neue Funktion)
  const resetAllImagesAndSnapshots = async () => {
    if (window.confirm('⚠️ WARNUNG: Sind Sie sicher, dass Sie ALLE Bilder und Snapshots für ALLE Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden!')) {
      try {
        setIsResetting(true);
        const response = await fetch('/api/admin/reset-everything');
        const data = await response.json();
        
        setIsResetting(false);
        alert(`Erfolg: ${data.message}\n\nErgebnisse:\nSnapshots DB: ${data.results.snapshots.db.count}\nSnapshots Dateien: ${data.results.snapshots.files.count}\nBilder DB: ${data.results.images.db.count}\nBilder Dateien: ${data.results.images.files.count}`);
        
        // Seite neu laden, um alle Änderungen zu sehen
        window.location.reload();
      } catch (error) {
        setIsResetting(false);
        console.error('Fehler beim Zurücksetzen:', error);
        alert('Fehler beim Zurücksetzen aller Daten. Bitte überprüfen Sie die Konsole für weitere Details.');
      }
    }
  };

  // Nicht rendern, wenn die Komponente noch nicht geladen ist oder der Benutzer kein Admin ist
  if (isLoading || !mounted || !isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="flex h-screen pt-[72px]">
        <div className="w-full flex flex-col h-full bg-[#f0f0f0]">
          {/* Header */}
          <div className="sticky top-[64px] z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="p-4 md:p-6">
              <h2 className="text-xl font-medium text-gray-900">Verwaltungsbereich</h2>
              <p className="text-sm text-gray-500 mt-1">Administration und Konfiguration des Systems</p>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 overflow-x-auto px-4 pb-2">
              <button
                onClick={() => setActiveTab('avatare')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'avatare'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Avatare
              </button>
              <button
                onClick={() => setActiveTab('dateisystem')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dateisystem'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Dateisystem
              </button>
              <button
                onClick={() => setActiveTab('wissensdatenbank')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'wissensdatenbank'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Wissensdatenbank
              </button>
              <button
                onClick={() => setActiveTab('datenbank')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'datenbank'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Datenbank
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'system'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                System
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Avatar-Verwaltung */}
            {activeTab === 'avatare' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6 space-y-6">
                  {/* Upload-Bereich */}
                  <div>
                    <h4 className="text-base font-medium text-gray-800">Avatar hochladen</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Unterstützte Formate: JPG, PNG, GIF
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="category"
                            value="male"
                            checked={selectedCategory === 'male'}
                            onChange={(e) => setSelectedCategory(e.target.value as 'male' | 'female')}
                            className="mr-2 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Männlich</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="category"
                            value="female"
                            checked={selectedCategory === 'female'}
                            onChange={(e) => setSelectedCategory(e.target.value as 'male' | 'female')}
                            className="mr-2 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Weiblich</span>
                        </label>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <label
                          htmlFor="avatar-upload"
                          className={`inline-block px-4 py-2 text-sm text-center bg-[#2c2c2c] text-white rounded-md cursor-pointer hover:bg-[#1a1a1a] transition-colors ${
                            isUploadingAvatars ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploadingAvatars ? 'Wird hochgeladen...' : 'Avatare auswählen'}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Trennlinie */}
                  <div className="border-t border-gray-200"></div>

                  {/* Avatar-Übersicht */}
                  <div>
                    <h4 className="text-base font-medium text-gray-800">Verfügbare Avatare</h4>
                    <div className="mt-2 max-h-[300px] overflow-y-auto">
                      <AvatarSelector
                        selectedAvatar={selectedAvatar}
                        onSelect={(avatar) => setSelectedAvatar(avatar)}
                        isAdminView={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dateisystem-Verwaltung */}
            {activeTab === 'dateisystem' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6">
                  <h4 className="text-base font-medium text-gray-800">Dateisystem zurücksetzen</h4>
                  <p className="text-gray-600 text-sm mt-1 mb-4">
                    Dies löscht alle Dateien und Ordner und setzt das Dateisystem auf den Ausgangszustand zurück.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  <button
                    onClick={resetStorage}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-medium"
                  >
                    Dateisystem zurücksetzen
                  </button>
                </div>
              </div>
            )}
            
            {/* Wissensdatenbank-Verwaltung */}
            {activeTab === 'wissensdatenbank' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6">
                  <h4 className="text-base font-medium text-gray-800">Wissensdatenbank leeren</h4>
                  <p className="text-gray-600 text-sm mt-1 mb-4">
                    Dies löscht alle FAQ-Einträge aus der Wissensdatenbank und setzt sie auf einen leeren Zustand zurück.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  <button
                    onClick={clearKnowledgeBase}
                    className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-medium ${
                      isResetting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isResetting}
                  >
                    {isResetting ? 'Wird geleert...' : 'Wissensdatenbank leeren'}
                  </button>
                </div>
              </div>
            )}

            {/* Datenbankverwaltung */}
            {activeTab === 'datenbank' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6">
                  <h4 className="text-base font-medium text-gray-800">MySQL-Administration</h4>
                  <p className="text-gray-600 text-sm mt-1 mb-4">
                    Verwalten Sie die MySQL-Datenbank direkt über das integrierte Administrator-Tool. 
                    Sie können SQL-Abfragen ausführen und Tabellen anzeigen.
                  </p>
                  <button 
                    onClick={() => router.push('/admin/database')}
                    className="inline-flex items-center px-4 py-2 bg-[#2c2c2c] text-white rounded-md hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Datenbank-Administration öffnen
                  </button>
                </div>
              </div>
            )}

            {/* System-Verwaltung */}
            {activeTab === 'system' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Systemverwaltung</h3>
                  <p className="text-sm text-gray-600">
                    Hier können Sie grundlegende Systemfunktionen ausführen und Systemdaten zurücksetzen.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <h4 className="font-medium text-red-800 mb-2">⚠️ Gefährliche Aktionen</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Die folgenden Aktionen führen zu dauerhaftem Datenverlust und können nicht rückgängig gemacht werden.
                      </p>
                      
                      <button
                        onClick={resetAllImagesAndSnapshots}
                        disabled={isResetting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isResetting ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Wird zurückgesetzt...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>Alle Bilder und Snapshots zurücksetzen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Bestätigungsdialog für das Leeren der Wissensdatenbank */}
      {showClearConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Wissensdatenbank leeren</h3>
            <p className="mb-4 text-gray-700">
              Sind Sie sicher, dass Sie alle Einträge aus der Wissensdatenbank löschen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmClearKnowledgeBase}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isResetting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isResetting}
              >
                {isResetting ? 'Wird gelöscht...' : 'Ja, alles löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 