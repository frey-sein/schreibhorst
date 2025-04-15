import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Debugging: Logge alle Anfragen an die Middleware
  console.log('Middleware: Anfrage für Pfad:', pathname);
  
  // Prüfe, ob ein Benutzer-Cookie existiert
  const userIdCookie = request.cookies.get('user-id')?.value;
  
  // Liste aller Pfade, die ohne Anmeldung zugänglich sein sollen
  const publicPaths = [
    '/login',
    '/migration',
    '/api/auth/login',
    '/api/auth/status',
    '/api/auth/logout',
    '/api/database/tables/users',
    '/api/migration/users',
    '/api/uploads/profile',
    '/api/users'
  ];
  
  // Einfache Prüfungen für öffentliche und statische Pfade
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Erweiterte Liste von statischen Assets
  const isStaticAsset = 
    pathname.includes('/_next') || 
    pathname.includes('/favicon.ico') || 
    pathname.includes('/logo') ||
    pathname.includes('/public') ||
    pathname.includes('/images') ||
    pathname === '/logo-nuetzlich.svg'; // Explizite Prüfung für das Logo
  
  console.log('Pfad-Checks:', { 
    isPublicPath, 
    isStaticAsset, 
    hasUserCookie: !!userIdCookie 
  });
  
  // Wenn kein Benutzer angemeldet ist und der Pfad nicht öffentlich ist, leite zur Login-Seite weiter
  if (!userIdCookie && !isPublicPath && !isStaticAsset) {
    console.log('Nicht angemeldet, leite weiter zu /login');
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 