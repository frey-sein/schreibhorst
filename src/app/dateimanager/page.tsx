'use client';

import { useEffect, useState } from 'react';
import { useFileStore } from '@/lib/store/fileStore';
import FileList from '../components/FileList';
import FolderTree from '../components/FolderTree';
import FileUploader from '../components/FileUploader';
import Header from '../components/Header';

export default function DateimanagerPage() {
  const { loadFiles, getCurrentFolder, uploadFile, initializePath } = useFileStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initial laden der Dateien
  useEffect(() => {
    // Zuerst den gespeicherten Pfad wiederherstellen
    initializePath();
    
    // Dann die Dateien laden
    loadFiles();
  }, [loadFiles, initializePath]);

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
      <div className="min-h-screen bg-[#f4f4f4] pt-24">
        <div className="max-w-[2000px] mx-auto px-6 py-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">Dateimanager</h1>
                <p className="text-sm text-gray-500">Verwalten und organisieren Sie Ihre Dateien</p>
              </div>
            </div>
            
            <div className="grid grid-cols-12 gap-8">
              {/* Linke Spalte: Ordnerstruktur */}
              <div className="col-span-3 bg-[#f4f4f4] rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="text-lg font-light text-gray-900 tracking-tight mb-4">Struktur</h2>
                <div className="bg-white rounded-md border border-gray-100 p-2">
                  <FolderTree />
                </div>
              </div>

              {/* Rechte Spalte: Dateien und Upload */}
              <div className="col-span-9 space-y-6">
                <div className="bg-[#f4f4f4] rounded-lg border border-gray-200 shadow-sm p-6">
                  <FileList />
                </div>

                <div className="bg-[#f4f4f4] rounded-lg border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-light text-gray-900 tracking-tight mb-4">Datei hochladen</h2>
                  {uploadError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                      {uploadError}
                    </div>
                  )}
                  <div className="bg-white rounded-lg border border-gray-100 p-4">
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
        </div>
      </div>
    </>
  );
} 