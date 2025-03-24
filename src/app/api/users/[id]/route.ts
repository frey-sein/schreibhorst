import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    console.log('Benutzer-ID angefragt:', userId);

    // Überprüfe, ob die angefragte ID mit dem Cookie übereinstimmt
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('user-id')?.value;

    if (userId !== cookieUserId) {
      console.log('Benutzer-ID stimmt nicht mit Cookie überein');
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Hier würden Sie normalerweise die Benutzerinformationen aus der Datenbank laden
    // Für den Moment geben wir Testdaten zurück
    const user = {
      id: userId,
      name: 'Carsten Frey',
      email: 'carsten@example.com',
      role: 'admin'
    };

    console.log('Sende Benutzerinformationen:', user);
    return NextResponse.json(user);
  } catch (error) {
    console.error('Fehler beim Laden des Benutzers:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 