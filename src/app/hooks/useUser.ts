'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Diese Schnittstelle muss mit der API-Antwort übereinstimmen
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setze isLoading auf true, um Ladezustand anzuzeigen
    setIsLoading(true);

    // Funktion zum Abrufen des aktuellen Benutzers vom API-Endpunkt
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen des Benutzers:', error);
        setUser(null);
      } finally {
        // Setze isLoading auf false, unabhängig davon, ob erfolgreich oder nicht
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Bestimme, ob der Benutzer ein Administrator ist
  const isAdmin = user?.role === 'admin';

  return { user, isAdmin, isLoading };
} 