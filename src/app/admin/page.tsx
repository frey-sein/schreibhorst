'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import AvatarSelector from '../components/agents/AvatarSelector';
import Image from 'next/image';

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
  const confirmClearKnowledgeBase = () => {
    localStorage.removeItem('wissensdatenbank_faqs');
    setShowClearConfirmation(false);
    alert('Die Wissensdatenbank wurde erfolgreich geleert.');
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
          <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="flex justify-between items-start gap-4 w-full">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Verwaltungsbereich</h2>
                <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">
                  Administration und Konfiguration des Systems
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 pt-24 space-y-12 pb-24">
            {/* Avatar-Verwaltung */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Avatar-Verwaltung</h3>
              
              <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md space-y-8">
                {/* Upload-Bereich */}
                <div>
                  <h4 className="text-base font-semibold text-gray-800">Avatar hochladen</h4>
                  <p className="text-gray-600 text-sm mt-2">
                    Laden Sie hier neue Avatare für die Agenten hoch. Unterstützte Formate: JPG, PNG, GIF
                  </p>
                  <div className="mt-4 space-y-4">
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
                        className={`w-full px-4 py-2 text-sm text-center border border-gray-300 rounded-full cursor-pointer hover:bg-gray-50 transition-colors ${
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
                  <h4 className="text-base font-semibold text-gray-800">Verfügbare Avatare</h4>
                  <p className="text-gray-600 text-sm mt-2">
                    Hier sehen Sie alle verfügbaren Avatare. Die Standard-Avatare können nicht gelöscht werden. 
                    Benutzerdefinierte Avatare können über das Lösch-Symbol entfernt werden.
                  </p>
                  <div className="mt-6">
                    <AvatarSelector
                      selectedAvatar={selectedAvatar}
                      onSelect={(avatar) => setSelectedAvatar(avatar)}
                      isAdminView={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dateisystem-Verwaltung */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Dateisystem-Verwaltung</h3>
              
              <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-800">Dateisystem zurücksetzen</h4>
                  <p className="text-gray-600 text-sm mt-2">
                    Dies löscht alle Dateien und Ordner und setzt das Dateisystem auf den Ausgangszustand zurück.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
                <button
                  onClick={resetStorage}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-medium"
                >
                  Dateisystem zurücksetzen
                </button>
              </div>
            </div>
            
            {/* Wissensdatenbank-Verwaltung */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Wissensdatenbank-Verwaltung</h3>
              
              <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-800">Wissensdatenbank leeren</h4>
                  <p className="text-gray-600 text-sm mt-2">
                    Dies löscht alle FAQ-Einträge aus der Wissensdatenbank und setzt sie auf einen leeren Zustand zurück.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
                <button
                  onClick={clearKnowledgeBase}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-medium"
                >
                  Wissensdatenbank leeren
                </button>
              </div>
            </div>

            {/* Weitere Verwaltungskategorien */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Benutzer-Verwaltung</h3>
              <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md">
                <p className="text-gray-600 text-sm">
                  Hier können in Zukunft Funktionen für die Benutzer-Verwaltung hinzugefügt werden,
                  wie z.B. das Zurücksetzen von Passwörtern oder das Verwalten von Benutzerrechten.
                </p>
              </div>
            </div>

            {/* System-Konfiguration */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System-Konfiguration</h3>
              <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md">
                <p className="text-gray-600 text-sm">
                  Hier können in Zukunft Funktionen für die System-Konfiguration hinzugefügt werden,
                  wie z.B. das Einstellen von Sicherheitsoptionen oder das Konfigurieren von Backup-Einstellungen.
                </p>
              </div>
            </div>
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Ja, alles löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 