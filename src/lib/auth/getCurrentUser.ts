import { cookies } from 'next/headers';

export async function getCurrentUser() {
  try {
    console.log('Starte getCurrentUser');
    const cookieStore = await cookies();
    const userId = cookieStore.get('user-id')?.value;
    console.log('Cookie gefunden:', { userId });
    
    if (!userId) {
      console.log('Kein Benutzer-Cookie gefunden');
      return null;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const userApiUrl = `${apiUrl}/api/users/${userId}`;
    console.log('Versuche Benutzer zu laden von:', userApiUrl);
    
    const response = await fetch(userApiUrl);
    console.log('API Antwort Status:', response.status);
    
    if (!response.ok) {
      console.log('Fehler beim Laden des Benutzers:', response.status);
      return null;
    }
    
    const user = await response.json();
    console.log('Benutzer erfolgreich geladen:', user);
    return user;
  } catch (error) {
    console.error('Fehler beim Laden des Benutzers:', error);
    return null;
  }
} 