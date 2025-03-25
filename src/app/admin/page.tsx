'use client';

import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  useEffect(() => {
    setMounted(true);
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