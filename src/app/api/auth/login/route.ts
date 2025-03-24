import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Generiere eine einfache Benutzer-ID
    const userId = 'user-' + Date.now();

    // Erstelle die Response mit dem Cookie
    const response = NextResponse.json({
      success: true,
      userId
    });

    // Setze den Cookie in der Response
    response.cookies.set('user-id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    console.log('Benutzer-Cookie gesetzt:', userId);
    return response;
  } catch (error) {
    console.error('Fehler beim Login:', error);
    return NextResponse.json(
      { error: 'Fehler beim Login' },
      { status: 500 }
    );
  }
} 