'use client';

import { useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useUserStore } from '@/lib/store/userStore';
import Header from '@/app/components/Header';

export default function ProfilePage() {
  const { getCurrentUser, updateProfile } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    imageUrl: string | null;
    hashedPassword?: string;
  }>({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    imageUrl: currentUser?.imageUrl || null
  });
  const [previewImage, setPreviewImage] = useState<string | null>(currentUser?.imageUrl || null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setMounted(true);
    setCurrentUser(getCurrentUser());
  }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name,
        email: currentUser.email,
        imageUrl: currentUser.imageUrl || ''
      });
      setPreviewImage(currentUser.imageUrl);
    }
  }, [currentUser]);

  // Render nichts während des ersten Mounts
  if (!mounted) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Überprüfe Dateityp
      if (!file.type.startsWith('image/')) {
        setMessage({
          type: 'error',
          text: 'Bitte wählen Sie eine Bilddatei aus.'
        });
        return;
      }

      // Überprüfe Dateigröße (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({
          type: 'error',
          text: 'Das Bild darf nicht größer als 5MB sein.'
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        setProfileData(prev => ({ ...prev, imageUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await updateProfile(profileData);
      setMessage({
        type: 'success',
        text: 'Profil erfolgreich aktualisiert!'
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Aktualisieren des Profils.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Die neuen Passwörter stimmen nicht überein.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' });
      return;
    }

    try {
      await updateProfile({
        ...profileData,
        password: passwordData.newPassword
      });
      setMessage({ type: 'success', text: 'Passwort erfolgreich geändert!' });
      setIsEditingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      setMessage({ type: 'error', text: 'Fehler beim Ändern des Passworts.' });
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f4f4f4] pt-24">
        <main>
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-8">
                <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-8">Profil</h1>
                
                {message && (
                  <div className={`mb-8 p-4 rounded-lg ${
                    message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="flex items-start gap-8">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt="Profilbild"
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
                            <UserCircleIcon className="w-20 h-20 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute -bottom-2 -right-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="p-2.5 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Profilbild ändern"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex-grow space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className={`px-6 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium ${
                            isLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isLoading ? 'Wird gespeichert...' : 'Änderungen speichern'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="mt-12 pt-8 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Passwort ändern</h2>
                      <p className="text-sm text-gray-500 mt-1">Aktualisieren Sie Ihr Passwort für mehr Sicherheit</p>
                    </div>
                    {!isEditingPassword && (
                      <button
                        onClick={() => setIsEditingPassword(true)}
                        className="px-4 py-2 text-sm text-[#2c2c2c] hover:text-[#1a1a1a] focus:outline-none font-medium"
                      >
                        Passwort ändern
                      </button>
                    )}
                  </div>

                  {isEditingPassword && (
                    <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aktuelles Passwort</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort bestätigen</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPassword(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                          }}
                          className="px-4 py-2 text-gray-700 hover:text-gray-900 focus:outline-none text-sm font-medium"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                        >
                          Passwort ändern
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 