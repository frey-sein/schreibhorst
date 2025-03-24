import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Hole den aktuellen Benutzer aus dem localStorage
  const currentUser = request.cookies.get('user-storage');
  const isLoggedIn = currentUser && JSON.parse(currentUser.value).state.currentUser;

  // Pfade, die ohne Login zugänglich sind
  const publicPaths = ['/login', '/logo-nuetzlich.svg'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path);

  // Wenn der Benutzer nicht eingeloggt ist und versucht, eine geschützte Route aufzurufen
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Wenn der Benutzer eingeloggt ist und versucht, die Login-Seite aufzurufen
  if (isLoggedIn && request.nextUrl.pathname === '/login') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// Konfiguriere die Middleware für alle Routen außer API und statische Dateien
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (including images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 