'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '../../../hooks/useUser';

export default function EditStilPage() {
  const router = useRouter();
  const params = useParams();
  const stilId = params.id as string;
  const { user, isAdmin, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (isAdmin) {
        // Wenn der Benutzer ein Admin ist, leite ihn zur Stile-Verwaltung im Admin-Bereich weiter
        // und übergebe die ID des zu bearbeitenden Stils
        router.push(`/admin?tab=stile&edit=${stilId}`);
      } else {
        // Wenn der Benutzer kein Admin ist, leite ihn zur Startseite weiter
        router.push('/');
      }
    }
  }, [isLoading, isAdmin, router, stilId]);

  // Render einen Ladebildschirm, während die Weiterleitung stattfindet
  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-gray-500">Wird weitergeleitet...</p>
    </div>
  );
} 