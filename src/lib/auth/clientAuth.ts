'use client';

import Cookies from 'js-cookie';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  imageUrl?: string;
}

/**
 * Prüft, ob der aktuelle Benutzer angemeldet ist
 */
export async function isLoggedIn(): Promise<boolean> {
  const userId = Cookies.get('user-id');
  return !!userId;
}

/**
 * Ruft den aktuellen Benutzer von der API ab
 */
export async function getLoggedInUser(): Promise<User | null> {
  try {
    const userId = Cookies.get('user-id');
    if (!userId) return null;
    
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) return null;
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Fehler beim Laden des Benutzers:', error);
    return null;
  }
}

/**
 * Prüft, ob der aktuelle Benutzer ein Admin ist
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getLoggedInUser();
  return user?.role === 'admin';
} 