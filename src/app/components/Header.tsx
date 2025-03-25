'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from '../../lib/store/userStore';
import { UsersIcon, ArrowRightOnRectangleIcon, FolderIcon, BookOpenIcon, BeakerIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { getCurrentUser, setCurrentUser } = useUserStore();
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());

  useEffect(() => {
    setMounted(true);
    setCurrentUserState(getCurrentUser());
  }, [getCurrentUser]);

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

  const handleLogout = () => {
    // Benutzer abmelden
    setCurrentUser(null);
    // Lösche den Cookie
    document.cookie = 'user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  // Render nichts während des ersten Mounts
  if (!mounted) return null;

  // Render nichts wenn kein User
  if (!currentUser) return null;

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
            <Link
              href="/admin"
              className={`p-2.5 aspect-square bg-white border rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
                isAdmin 
                  ? 'border-[#2c2c2c] bg-gray-200 shadow-sm' 
                  : 'border-gray-100'
              }`}
              title="Verwaltungsbereich"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${isAdmin ? 'text-gray-800' : 'text-gray-600'}`}
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