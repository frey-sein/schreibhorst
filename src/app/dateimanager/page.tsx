'use client';

import { useEffect, useState } from 'react';
import { useFileStore } from '@/lib/store/fileStore';
import FileList from '../components/FileList';
import FolderTree from '../components/FolderTree';
import FileUploader from '../components/FileUploader';
import Header from '../components/Header';

export default function DateimanagerPage() {
  const { loadFiles, getCurrentFolder, uploadFile } = useFileStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initial laden der Dateien
  useEffect(() => {
    // LoadFiles kümmert sich jetzt direkt um das Laden von Dateien aus localStorage
    loadFiles();
  }, [loadFiles]);

  const currentFolder = getCurrentFolder();

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Da unser FileUploader mehrere Dateien unterstützt, verarbeiten wir sie einzeln
      for (const file of files) {
        await uploadFile(file);
      }
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError('Fehler beim Hochladen der Datei');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dateimanager</h1>
          
          <div className="grid grid-cols-12 gap-8">
            {/* Linke Spalte: Ordnerstruktur */}
            <div className="col-span-3 bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Struktur</h2>
              <FolderTree />
            </div>

            {/* Rechte Spalte: Dateien und Upload */}
            <div className="col-span-9 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <FileList />
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Datei hochladen</h2>
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {uploadError}
                  </div>
                )}
                <FileUploader
                  onUpload={handleUpload}
                  maxSize={10 * 1024 * 1024} // 10MB
                  isUploading={isUploading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 