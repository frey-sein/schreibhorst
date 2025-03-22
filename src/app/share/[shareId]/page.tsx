'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StorageService } from '@/lib/services/storage';
import { FileItem } from '@/lib/services/storage';

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [file, setFile] = useState<FileItem | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const storageService = StorageService.getInstance();

  useEffect(() => {
    loadSharedFile();
  }, [shareId]);

  const loadSharedFile = async () => {
    try {
      const sharedFile = await storageService.getSharedFile(shareId);
      if (!sharedFile) {
        setError('Diese Datei ist nicht mehr verfügbar oder wurde gelöscht.');
        return;
      }
      setFile(sharedFile);
    } catch (err) {
      setError('Fehler beim Laden der Datei');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      const blob = await storageService.downloadSharedFile(shareId, password);
      if (!blob) {
        setError('Fehler beim Herunterladen der Datei');
        return;
      }

      // Erstelle Download-Link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Fehler beim Herunterladen der Datei');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-gray-500">Datei nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h1 className="text-2xl font-light text-gray-900 mb-6">Geteilte Datei</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dateiname
            </label>
            <div className="text-sm text-gray-900">{file.name}</div>
          </div>

          {file.shareExpiry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verfügbar bis
              </label>
              <div className="text-sm text-gray-900">
                {new Date(file.shareExpiry).toLocaleString('de-DE')}
              </div>
            </div>
          )}

          {file.sharePassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm"
                placeholder="Passwort eingeben"
              />
            </div>
          )}

          <button
            onClick={handleDownload}
            className="w-full px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm font-medium"
          >
            Herunterladen
          </button>
        </div>
      </div>
    </div>
  );
} 