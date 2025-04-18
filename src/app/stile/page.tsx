'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../hooks/useUser';

export default function StilePage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (isAdmin) {
        // Wenn der Benutzer ein Admin ist, leite ihn zur Stile-Verwaltung im Admin-Bereich weiter
        router.push('/admin?tab=stile');
      } else {
        // Wenn der Benutzer kein Admin ist, leite ihn zur Startseite weiter
        router.push('/');
      }
    }
  }, [isLoading, isAdmin, router]);

  // Render einen Ladebildschirm, während die Weiterleitung stattfindet
  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-gray-500">Wird weitergeleitet...</p>
    </div>
  );
} 