'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';

// Diese Schnittstelle muss mit der in userStore übereinstimmen
interface User {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: 'admin' | 'user';
}

export function useUser() {
  const { getCurrentUser, setCurrentUser } = useUserStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Holen des aktuellen Benutzers aus dem Store
    const currentUser = getCurrentUser();
    
    // Prüfen, ob ein Benutzer eingeloggt ist
    if (currentUser && currentUser.id) {
      setUser(currentUser as unknown as User);
      setIsLoggedIn(true);
      setIsAdmin(currentUser.role === 'admin');
    } else {
      setUser(null);
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
    
    setIsLoading(false);
  }, [getCurrentUser]);

  const login = (userData: User) => {
    // Hier übergeben wir nur die ID, da der userStore mit IDs statt Objekten arbeitet
    setCurrentUser(userData.id);
    setUser(userData);
    setIsLoggedIn(true);
    setIsAdmin(userData.role === 'admin');
  };

  const logout = () => {
    // Direkt den userStore-Wert auf null setzen
    setCurrentUser(null);
    setUser(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.push('/login');
  };

  return {
    user,
    isLoggedIn,
    isAdmin,
    isLoading,
    login,
    logout
  };
} 