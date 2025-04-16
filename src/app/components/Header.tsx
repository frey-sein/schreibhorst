'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UsersIcon, ArrowRightOnRectangleIcon, FolderIcon, BookOpenIcon, BeakerIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  imageUrl?: string | null;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Daten des aktuellen Benutzers abrufen
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          // Basisdaten des Benutzers setzen
          setCurrentUser(data.user);
          
          // Detaillierte Benutzerdaten abrufen (inkl. Profilbild)
          try {
            const userResponse = await fetch(`/api/users/${data.user.id}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setCurrentUser(prev => ({
                ...prev,
                ...userData,
                imageUrl: userData.imageUrl || null
              }));
            }
          } catch (detailError) {
            console.error('Fehler beim Abrufen der detaillierten Benutzerdaten:', detailError);
          }
        } else if (pathname !== '/login') {
          // Wenn nicht authentifiziert und nicht auf der Login-Seite, zum Login weiterleiten
          router.push('/login');
        }
      } catch (error) {
        console.error('Fehler beim Abrufen des Benutzerstatus:', error);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, [pathname, router]);

  const isDateimanager = pathname.startsWith('/dateimanager');
  const isWissen = pathname.startsWith('/wissen');
  const isAgents = pathname.startsWith('/agents');
  const isProfile = pathname.startsWith('/profil');
  const isUsers = pathname.startsWith('/benutzer');
  const isAdmin = pathname.startsWith('/admin');
  
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const handleLogout = async () => {
    try {
      // Zuerst alle Stage-Snapshots des aktuellen Benutzers löschen
      await fetch('/api/stage-history', {
        method: 'DELETE'
      });
      
      // Abmelden über die API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Cookie löschen (für den Fall, dass die API das nicht tut)
      document.cookie = 'user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      
      // Zur Login-Seite weiterleiten
      router.push('/login');
    } catch (error) {
      console.error('Fehler beim Logout:', error);
      // Trotzdem zum Login weiterleiten
      router.push('/login');
    }
  };

  // Render nichts während des ersten Mounts oder beim Laden
  if (!mounted || loading) return null;

  // Render nichts, wenn kein Benutzer authentifiziert ist
  if (!currentUser) return null;
  
  // Wenn die aktuelle Seite die Login-Seite ist, zeige keinen Header an
  if (pathname === '/login') return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f4f4f4]/80 backdrop-blur-md border-b border-gray-100 shadow-md">
      <div className="max-w-[2000px] mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <img src="/logo-nuetzlich.svg" alt="Nützlich Logo" className="h-8" />
        </Link>
        <div className="flex items-center gap-3">
          <Link 
            href="/dateimanager"
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
              isDateimanager 
                ? 'border-[#2c2c2c] bg-gray-200 font-medium shadow-sm' 
                : 'bg-white border-gray-100'
            }`}
          >
            <FolderIcon className={`h-5 w-5 ${isDateimanager ? 'text-gray-800' : 'text-gray-600'}`} />
            <span className={`${isDateimanager ? 'text-gray-800' : 'text-gray-700'}`}>Dateien</span>
          </Link>
          <Link 
            href="/wissen"
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
              isWissen 
                ? 'border-[#2c2c2c] bg-gray-200 font-medium shadow-sm' 
                : 'bg-white border-gray-100'
            }`}
          >
            <BookOpenIcon className={`h-5 w-5 ${isWissen ? 'text-gray-800' : 'text-gray-600'}`} />
            <span className={`${isWissen ? 'text-gray-800' : 'text-gray-700'}`}>Wissen</span>
          </Link>
          {currentUser.role === 'admin' && (
            <Link 
              href="/agents"
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
                isAgents 
                  ? 'border-[#2c2c2c] bg-gray-200 font-medium shadow-sm' 
                  : 'bg-white border-gray-100'
              }`}
            >
              <BeakerIcon className={`h-5 w-5 ${isAgents ? 'text-gray-800' : 'text-gray-600'}`} />
              <span className={`${isAgents ? 'text-gray-800' : 'text-gray-700'}`}>Agenten</span>
            </Link>
          )}
          {currentUser.role === 'admin' && (
            <Link 
              href="/benutzer"
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
                isUsers 
                  ? 'border-[#2c2c2c] bg-gray-200 font-medium shadow-sm' 
                  : 'bg-white border-gray-100'
              }`}
            >
              <UsersIcon className={`h-5 w-5 ${isUsers ? 'text-gray-800' : 'text-gray-600'}`} />
              <span className={`${isUsers ? 'text-gray-800' : 'text-gray-700'}`}>Benutzer</span>
            </Link>
          )}
          <Link 
            href="/profil"
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
              isProfile 
                ? 'border-[#2c2c2c] bg-gray-200 font-medium shadow-sm' 
                : 'bg-white border-gray-100'
            }`}
          >
            {currentUser.imageUrl ? (
              <img
                src={currentUser.imageUrl}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  console.error('Fehler beim Laden des Profilbilds');
                  // Wenn das Bild nicht geladen werden kann, zeige Initialen an
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = "w-6 h-6 rounded-full bg-[#2c2c2c] flex items-center justify-center text-white text-xs font-medium";
                    fallback.textContent = initials;
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#2c2c2c] flex items-center justify-center text-white text-xs font-medium">
                {initials}
              </div>
            )}
            <span className={`${isProfile ? 'text-gray-800' : 'text-gray-700'}`}>{currentUser.name}</span>
          </Link>
          
          {/* Admin-Icon (nur für Admins sichtbar) */}
          {currentUser.role === 'admin' && (
            <>
              <Link
                href="/admin"
                className={`p-2.5 aspect-square rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
                  isAdmin 
                    ? 'bg-[#1a1a1a] shadow-sm' 
                    : 'bg-[#2c2c2c]'
                }`}
                title="Verwaltungsbereich"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <button
                onClick={async () => {
                  if (window.confirm('⚠️ WARNUNG: Sind Sie sicher, dass Sie ALLE Bilder und Snapshots für ALLE Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden!')) {
                    try {
                      const response = await fetch('/api/admin/reset-everything');
                      const data = await response.json();
                      alert(`Erfolg: ${data.message}\n\nErgebnisse:\nSnapshots DB: ${data.results.snapshots.db.count}\nSnapshots Dateien: ${data.results.snapshots.files.count}\nBilder DB: ${data.results.images.db.count}\nBilder Dateien: ${data.results.images.files.count}`);
                      
                      // Seite neu laden, um alle Änderungen zu sehen
                      window.location.reload();
                    } catch (error) {
                      console.error('Fehler beim Zurücksetzen:', error);
                      alert('Fehler beim Zurücksetzen aller Daten. Bitte überprüfen Sie die Konsole für weitere Details.');
                    }
                  }
                }}
                className="p-2.5 aspect-square rounded-full bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all text-sm"
                title="⚠️ NOTFALL-RESET: Alle Bilder und Entwürfe löschen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          )}
          
          {/* Abmelde-Button */}
          <button
            onClick={handleLogout}
            className="p-2.5 aspect-square bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm"
            title="Abmelden"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
} 