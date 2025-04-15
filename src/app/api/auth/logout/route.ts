import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Erstelle eine Antwort
    const response = NextResponse.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });
    
    // Lösche das Cookie, indem es mit einem abgelaufenen Datum gesetzt wird
    response.cookies.set('user-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Sofort ablaufen lassen
      expires: new Date(0) // Datum in der Vergangenheit
    });
    
    console.log('Benutzer abgemeldet, Cookie gelöscht');
    return response;
  } catch (error) {
    console.error('Fehler beim Logout:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abmelden' },
      { status: 500 }
    );
  }
} 