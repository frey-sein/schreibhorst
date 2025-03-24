'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from '@/lib/store/userStore';
import { UsersIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
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

  const isDateimanager = pathname === '/dateimanager';
  const isWissen = pathname === '/wissen';
  const isProfile = pathname === '/profil';
  const isUsers = pathname === '/benutzer';
  
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const handleLogout = () => {
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
            className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
              isDateimanager ? 'border-[#2c2c2c] bg-gray-50' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-gray-700">Dateien</span>
          </Link>
          <Link 
            href="/wissen"
            className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
              isWissen ? 'border-[#2c2c2c] bg-gray-50' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <span className="text-gray-700">Wissen</span>
          </Link>
          {currentUser.role === 'admin' && (
            <Link 
              href="/benutzer"
              className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
                isUsers ? 'border-[#2c2c2c] bg-gray-50' : ''
              }`}
            >
              <UsersIcon className="h-5 w-5 text-gray-600" />
              <span className="text-gray-700">Benutzer</span>
            </Link>
          )}
          <Link 
            href="/profil"
            className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm ${
              isProfile ? 'border-[#2c2c2c] bg-gray-50' : ''
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
            <span className="text-gray-700">{currentUser.name}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700">Abmelden</span>
          </button>
        </div>
      </div>
    </header>
  );
} 