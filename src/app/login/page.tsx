'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';

export default function LoginPage() {
  const router = useRouter();
  const { users, setCurrentUser, verifyPassword, getCurrentUser } = useUserStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (userId: string) => {
    setSelectedUserId(userId);
    setError('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const isValid = await verifyPassword(selectedUserId, password);
      if (isValid) {
        // Setze den User im Store
        await setCurrentUser(selectedUserId);
        
        // Setze den Cookie
        document.cookie = `user-id=${selectedUserId};path=/;max-age=2592000`; // 30 Tage
        
        // Navigiere zur Hauptseite
        window.location.href = '/';
      } else {
        setError('Falsches Passwort');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <img 
            src="/logo-nuetzlich.svg" 
            alt="Nützlich Logo" 
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl font-light text-[#2c2c2c] tracking-tight">Willkommen zurück</h1>
          <p className="text-sm text-gray-500 mt-2">Wähle deinen Benutzer aus, um fortzufahren</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="space-y-4">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id)}
                type="button"
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                  selectedUserId === user.id
                    ? 'border-[#2c2c2c] bg-white shadow-lg'
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-[#2c2c2c] flex items-center justify-center text-white">
                    {user.imageUrl ? (
                      <img src={user.imageUrl} alt={user.name} className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="text-lg font-medium">{user.name[0]}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-[#2c2c2c]">{user.name}</span>
                    <span className="text-sm text-gray-500">{user.email || 'Keine E-Mail-Adresse'}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-[#2c2c2c] text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </span>
              </button>
            ))}
          </div>

          {selectedUserId && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#2c2c2c]">
                  Passwort
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-100 rounded-2xl shadow-sm placeholder-gray-400 text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] transition-all text-sm"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm mt-2">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-medium text-white bg-[#2c2c2c] hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Anmeldung...' : 'Anmelden'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 