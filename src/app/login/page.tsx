'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { users, setCurrentUser } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (userId: string) => {
    setCurrentUser(userId);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center">
      <div className="max-w-md w-full p-6">
        <div className="text-center mb-8">
          <img 
            src="/logo-nuetzlich.svg" 
            alt="Nützlich Logo" 
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl font-light text-gray-900 tracking-tight">Willkommen zurück</h1>
          <p className="text-sm text-gray-500 mt-2">Wähle deinen Benutzer aus, um fortzufahren</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-1">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors"
              >
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#2c2c2c] flex items-center justify-center text-white text-lg font-medium">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <h3 className="text-gray-900 font-medium">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email || 'Keine E-Mail-Adresse'}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 