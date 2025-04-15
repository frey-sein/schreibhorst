'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  imageUrl?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Überprüfe, ob der Benutzer bereits angemeldet ist
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.push('/');
          }
        }
      } catch (err) {
        console.error('Authentifizierungsstatus konnte nicht abgerufen werden', err);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Anmeldung erfolgreich
        router.push('/');
      } else {
        // Anmeldung fehlgeschlagen
        setError(data.error || 'Anmeldung fehlgeschlagen');
      }
    } catch (err) {
      console.error('Login-Fehler:', err);
      setError('Ein Netzwerkfehler ist aufgetreten');
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
          <p className="text-sm text-gray-500 mt-2">Melde dich an, um fortzufahren</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-Mail-Adresse
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-100 rounded-2xl shadow-sm placeholder-gray-400 text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] transition-all text-sm"
                  placeholder="beispiel@domain.de"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Passwort
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-100 rounded-2xl shadow-sm placeholder-gray-400 text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] transition-all text-sm"
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
        </div>
      </div>
    </div>
  );
} 