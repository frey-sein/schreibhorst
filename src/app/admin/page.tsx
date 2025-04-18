'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useUser } from '../hooks/useUser';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import AvatarSelector from '../components/agents/AvatarSelector';
import * as knowledgeService from '../../lib/services/knowledgeService';
import { useUserStore, UserProfile } from '../../lib/store/userStore';
import { UserCircleIcon, PencilIcon, TrashIcon, PlusIcon, TagIcon, XMarkIcon, PhotoIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

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

// Kontext für die Stile-Verwaltung
const StileContext = createContext<{
  showEditor: boolean;
  setShowEditor: (show: boolean) => void;
  currentStilId: string | null;
  setCurrentStilId: (id: string | null) => void;
  refreshStile: () => void;
}>({
  showEditor: false,
  setShowEditor: () => {},
  currentStilId: null,
  setCurrentStilId: () => {},
  refreshStile: () => {}
});

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
  const [activeTab, setActiveTab] = useState<'avatare' | 'stile' | 'dateisystem' | 'wissensdatenbank' | 'datenbank' | 'system' | 'benutzer'>('avatare');
  
  // Benutzerverwaltung Zustände
  const { users, addUser, updateUser, deleteUser, currentUser } = useUserStore();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // URL-Parameter verarbeiten
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const editParam = urlParams.get('edit');
      
      if (tabParam === 'stile') {
        setActiveTab('stile');
        
        // StileContext ist zu diesem Zeitpunkt noch nicht verfügbar,
        // daher speichern wir die ID für die spätere Verwendung
        if (editParam) {
          window.localStorage.setItem('pendingEditStilId', editParam);
        }
      }
    }
  }, []);

  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    role: 'admin' | 'user';
  }>({
    name: '',
    email: '',
    role: 'user'
  });

  const [editingUserData, setEditingUserData] = useState<{
    name: string;
    email: string;
    role: 'admin' | 'user';
    password?: string;
  }>({
    name: '',
    email: '',
    role: 'user',
    password: ''
  });

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

  // Benutzerverwaltungsfunktionen
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      setMessage({ type: 'error', text: 'Bitte fülle alle Pflichtfelder aus.' });
      return;
    }

    addUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      imageUrl: null
    });

    setNewUser({ name: '', email: '', role: 'user' });
    setIsAddingUser(false);
    setMessage({ type: 'success', text: 'Benutzer erfolgreich erstellt!' });
  };

  const handleEditUser = (userId: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setEditingUser(userId);
      setEditingUserData({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        password: ''
      });
    }
  };

  const handleUpdateUser = () => {
    if (!editingUser || !editingUserData.name || !editingUserData.email) {
      setMessage({ type: 'error', text: 'Bitte fülle alle Pflichtfelder aus.' });
      return;
    }

    const userToUpdate: Partial<UserProfile> & { password?: string } = {
      name: editingUserData.name,
      email: editingUserData.email,
      role: editingUserData.role
    };

    if (editingUserData.password) {
      userToUpdate.password = editingUserData.password;
    }

    updateUser(editingUser, userToUpdate);

    setEditingUser(null);
    setEditingUserData({ name: '', email: '', role: 'user', password: '' });
    setMessage({ type: 'success', text: 'Benutzer erfolgreich aktualisiert!' });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditingUserData({ name: '', email: '', role: 'user', password: '' });
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Möchtest du diesen Benutzer wirklich löschen?')) {
      deleteUser(userId);
      setMessage({ type: 'success', text: 'Benutzer erfolgreich gelöscht!' });
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
                onClick={() => setActiveTab('stile')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'stile'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Stile
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
                onClick={() => setActiveTab('benutzer')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'benutzer'
                    ? 'bg-[#2c2c2c] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Benutzer
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

            {/* Stile-Verwaltung */}
            {activeTab === 'stile' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <StileProvider>
                  <div className="p-4 md:p-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-base font-medium text-gray-800">Schreibstile verwalten</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Hier können Sie alle verfügbaren Schreibstile verwalten und neue erstellen.
                        </p>
                      </div>
                      <StileNeuButton />
                    </div>
                    
                    {/* Stile anzeigen */}
                    <div className="mt-6">
                      <StileVerwaltung />
                    </div>
                  </div>
                </StileProvider>
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
                    {isResetting ? 'Wird gelöscht...' : 'Ja, alles löschen'}
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

            {/* Benutzerverwaltung */}
            {activeTab === 'benutzer' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-base font-medium text-gray-800">Benutzerverwaltung</h4>
                    <button
                      onClick={() => setIsAddingUser(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span>Neuer Benutzer</span>
                    </button>
                  </div>

                  {message && (
                    <div className={`mb-6 p-4 rounded-lg ${
                      message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  {/* Neuer Benutzer Formular */}
                  {isAddingUser && (
                    <div className="mb-6 p-6 border border-gray-200 rounded-xl bg-gray-50">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Neuen Benutzer erstellen</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={newUser.name}
                            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                            placeholder="Name des Benutzers"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                          <input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                            placeholder="E-Mail-Adresse"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                          >
                            <option value="user">Benutzer</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setIsAddingUser(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={handleAddUser}
                            className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                          >
                            Benutzer erstellen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Benutzerliste */}
                  <div className="space-y-4">
                    {users.map(user => (
                      <div
                        key={user.id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                      >
                        {editingUser === user.id ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900">Benutzer bearbeiten</h3>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handleUpdateUser}
                                  className="p-2 text-green-600 hover:text-green-700 focus:outline-none"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                  type="text"
                                  value={editingUserData.name}
                                  onChange={(e) => setEditingUserData(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                                <input
                                  type="email"
                                  value={editingUserData.email}
                                  onChange={(e) => setEditingUserData(prev => ({ ...prev, email: e.target.value }))}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                                <select
                                  value={editingUserData.role}
                                  onChange={(e) => setEditingUserData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                                >
                                  <option value="user">Benutzer</option>
                                  <option value="admin">Administrator</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort (optional)</label>
                                <input
                                  type="password"
                                  value={editingUserData.password}
                                  onChange={(e) => setEditingUserData(prev => ({ ...prev, password: e.target.value }))}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                                  placeholder="Leer lassen, um Passwort nicht zu ändern"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                {user.imageUrl ? (
                                  <img
                                    src={user.imageUrl}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <UserCircleIcon className="w-6 h-6 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                <div className="mt-1">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                                title="Benutzer bearbeiten"
                              >
                                <PencilIcon className="w-5 h-5" />
                              </button>
                              {/* Nicht erlauben, den aktuellen Benutzer zu löschen */}
                              {currentUser && currentUser !== user.id && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 text-red-600 hover:text-red-700 focus:outline-none"
                                  title="Benutzer löschen"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-70 backdrop-blur-sm">
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

// StileProvider Komponente zur Verwaltung des Zustands
function StileProvider({ children }: { children: React.ReactNode }) {
  const [showEditor, setShowEditor] = useState(false);
  const [currentStilId, setCurrentStilId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Prüfe, ob eine zu bearbeitende Stil-ID aus der URL vorhanden ist
  useEffect(() => {
    const pendingEditId = localStorage.getItem('pendingEditStilId');
    if (pendingEditId) {
      setCurrentStilId(pendingEditId);
      setShowEditor(true);
      localStorage.removeItem('pendingEditStilId');
    }
  }, []);

  const refreshStile = () => setRefresh(prev => prev + 1);

  return (
    <StileContext.Provider value={{ 
      showEditor, 
      setShowEditor, 
      currentStilId, 
      setCurrentStilId,
      refreshStile
    }}>
      {children}
      {showEditor && <StilEditor />}
    </StileContext.Provider>
  );
}

// Button-Komponente zum Erstellen eines neuen Stils
function StileNeuButton() {
  const { setShowEditor, setCurrentStilId } = useContext(StileContext);

  const handleNewStil = () => {
    setCurrentStilId(null);
    setShowEditor(true);
  };

  return (
    <button
      onClick={handleNewStil}
      className="px-4 py-2.5 text-sm font-medium text-white bg-[#2c2c2c] border border-transparent rounded-full hover:bg-[#1a1a1a] transition-colors"
    >
      Neuer Stil
    </button>
  );
}

// StileVerwaltung Komponente
function StileVerwaltung() {
  const [stile, setStile] = useState<Stil[]>([]);
  const { setShowEditor, setCurrentStilId, refreshStile } = useContext(StileContext);
  
  // Lade Stile aus dem localStorage
  useEffect(() => {
    try {
      const savedStile = localStorage.getItem('schreibstile');
      if (savedStile) {
        setStile(JSON.parse(savedStile));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Schreibstile:', error);
    }
  }, [refreshStile]);

  const handleEditStil = (stilId: string) => {
    setCurrentStilId(stilId);
    setShowEditor(true);
  };

  const handleDeleteStil = async (stilId: string) => {
    if (!confirm('Möchten Sie diesen Schreibstil wirklich löschen?')) return;
    
    try {
      const updatedStile = stile.filter(stil => stil.id !== stilId);
      setStile(updatedStile);
      localStorage.setItem('schreibstile', JSON.stringify(updatedStile));
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

  if (stile.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Keine Schreibstile vorhanden.</p>
        <button
          onClick={() => {
            setCurrentStilId(null);
            setShowEditor(true);
          }}
          className="mt-4 px-4 py-2 text-sm text-white bg-[#2c2c2c] rounded-md hover:bg-[#1a1a1a] transition-colors"
        >
          Ersten Stil erstellen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stile.map((stil) => (
        <div
          key={stil.id}
          className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start gap-4">
            {/* Avatar/Bild */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
              {stil.avatar ? (
                <img
                  src={stil.avatar}
                  alt={`Bild für ${stil.name}`}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Verhindert Endlosschleifen
                    target.src = "/images/placeholder.svg";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <PencilIcon className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>

            {/* Stil Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900">{stil.name}</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditStil(stil.id)}
                    className="p-1 text-gray-400 hover:text-[#2c2c2c] transition-colors"
                    title="Stil bearbeiten"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteStil(stil.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Stil löschen"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-1">
                Erstellt am {formatDate(stil.erstellt)}
                {stil.bearbeitet && ` • Zuletzt bearbeitet am ${formatDate(stil.bearbeitet)}`}
              </p>
              
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {stil.beschreibung}
              </p>

              {/* Tags */}
              {stil.tags && stil.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {stil.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-50 text-gray-600 rounded-md"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Prompt-Vorschau */}
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Prompt:</p>
                <div className="p-2 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {stil.prompt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// StilEditor-Komponente für das Erstellen/Bearbeiten von Stilen
function StilEditor() {
  const { currentStilId, setShowEditor, refreshStile } = useContext(StileContext);
  const isNewStil = currentStilId === null;

  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [beispiel, setBeispiel] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Lade Stil-Daten, wenn es sich um eine Bearbeitung handelt
  useEffect(() => {
    setMounted(true);
    if (!isNewStil && currentStilId) {
      try {
        const stile = localStorage.getItem('schreibstile');
        if (stile) {
          const parsedStile = JSON.parse(stile);
          const stil = parsedStile.find((s: Stil) => s.id === currentStilId);
          
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
              setShowEditor(false);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Schreibstils:', error);
        setError('Fehler beim Laden des Schreibstils');
      }
    }
  }, [currentStilId, isNewStil, setShowEditor]);

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
      const stileStr = localStorage.getItem('schreibstile');
      const stile = stileStr ? JSON.parse(stileStr) : [];
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
        
        localStorage.setItem('schreibstile', JSON.stringify([...stile, newStil]));
      } else {
        // Aktualisiere bestehenden Stil
        const updatedStile = stile.map((s: Stil) => {
          if (s.id === currentStilId) {
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
        
        localStorage.setItem('schreibstile', JSON.stringify(updatedStile));
      }
      
      // Schließe Editor und aktualisiere Liste
      refreshStile();
      setShowEditor(false);
    } catch (error) {
      console.error('Fehler beim Speichern des Schreibstils:', error);
      setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  // Zeige Ladeindikator während des ersten Mounts
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-70">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
          <p className="text-center">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-70 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl m-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-gray-900">
            {isNewStil ? 'Neuen Schreibstil erstellen' : 'Schreibstil bearbeiten'}
          </h2>
          <button 
            onClick={() => setShowEditor(false)}
            className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
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
                      className="ml-1 text-gray-500 hover:text-gray-700 rounded-full"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Avatar/Bild */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bild/Avatar
            </label>
            <div className="mt-2 flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center">
                  {avatar ? (
                    <>
                      <img 
                        src={avatar} 
                        alt="Vorschau" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/images/placeholder.svg";
                        }} 
                      />
                      <button
                        type="button"
                        onClick={() => setAvatar('')}
                        className="absolute top-1 right-1 bg-gray-800 bg-opacity-60 rounded-full p-0.5 text-white"
                        title="Bild entfernen"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2">
                  Wählen Sie ein Bild, das den Stil repräsentiert. Optional.
                </p>
                <div className="mt-2">
                  <AvatarSelector
                    selectedAvatar={avatar}
                    onSelect={(avatar) => setAvatar(avatar || '')}
                    isAdminView={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
              placeholder="Anweisungen für den Stil, z.B. 'Schreibe in einem formellen, präzisen und professionellen Business-Stil...'"
            />
            <p className="mt-1 text-xs text-gray-500">
              Die Anweisungen für die KI, wie der Text geschrieben werden soll.
            </p>
          </div>

          {/* Beispiel */}
          <div>
            <label htmlFor="beispiel" className="block text-sm font-medium text-gray-700 mb-1">
              Beispiel
            </label>
            <textarea
              id="beispiel"
              value={beispiel}
              onChange={(e) => setBeispiel(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2c2c2c] focus:border-[#2c2c2c] text-gray-900"
              placeholder="Optionales Beispiel für diesen Schreibstil"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ein Beispieltext, der den Stil verdeutlicht. Optional.
            </p>
          </div>

          {/* Aktionen */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Wird gespeichert...' : (isNewStil ? 'Erstellen' : 'Speichern')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 