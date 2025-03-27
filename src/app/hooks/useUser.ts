'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';

// Diese Schnittstelle muss mit der in userStore übereinstimmen
interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
}

interface UseUserResult {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useUser(): UseUserResult {
  const { getCurrentUser } = useUserStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setze isLoading auf true, um Ladezustand anzuzeigen
    setIsLoading(true);
    try {
      // Hole den aktuellen Benutzer aus dem Store
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzers:', error);
      setUser(null);
    } finally {
      // Setze isLoading auf false, unabhängig davon, ob erfolgreich oder nicht
      setIsLoading(false);
    }
  }, [getCurrentUser]);

  // Bestimme, ob der Benutzer ein Administrator ist
  const isAdmin = user?.role === 'admin';

  return { user, isAdmin, isLoading };
} 