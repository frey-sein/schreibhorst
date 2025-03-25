import { NextRequest, NextResponse } from 'next/server';
import { URL } from 'url';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Debugging: Logge alle Anfragen an die Middleware
  console.log('Middleware: Anfrage für Pfad:', pathname);
  
  // Behandle spezifische Uploads-Anfragen
  if (pathname.startsWith('/uploads/')) {
    console.log('Uploads-Pfad erkannt:', pathname);
    
    try {
      // Erlaube den Zugriff auf das Uploads-Verzeichnis
      return NextResponse.next({
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      console.error('Middleware-Fehler bei Uploads-Anfrage:', error);
    }
  }
  
  // Bei allen anderen Pfaden: normal weiterleiten
  return NextResponse.next();
}

// Konfiguriere, für welche Pfade die Middleware ausgeführt werden soll
export const config = {
  matcher: [
    '/uploads/:path*',
    '/api/files/:path*',
  ],
}; 