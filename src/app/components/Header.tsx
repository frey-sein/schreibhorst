'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from '@/lib/store/userStore';
import { UsersIcon, ArrowRightOnRectangleIcon, FolderIcon, BookOpenIcon } from '@heroicons/react/24/outline';
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
  const isProfile = pathname.startsWith('/profil');
  const isUsers = pathname.startsWith('/benutzer');
  
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