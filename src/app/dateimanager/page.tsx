'use client';

import Header from '../components/Header';
import FolderTree from '../components/FolderTree';
import FileList from '../components/FileList';
import FileUploader from '../components/FileUploader';
import { useState, useEffect } from 'react';
import { useFileStore } from '@/lib/store/fileStore';

export default function DateimanagerPage() {
  const { loadFiles, initializePath, uploadFile } = useFileStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadFilesystem = async () => {
      try {
        // Zuerst den gespeicherten Pfad wiederherstellen
        initializePath();
        // Dann die Dateien laden
        await loadFiles();
      } catch (err) {
        setError('Fehler beim Laden des Dateisystems. Bitte versuchen Sie es später erneut.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadFilesystem();
  }, [loadFiles, initializePath]);

  const handleUpload = async (files: File[]) => {
    try {
      setIsUploading(true);
      for (const file of files) {
        await uploadFile(file);
      }
      // Nach dem Upload die Dateiliste aktualisieren
      await loadFiles();
    } catch (err) {
      console.error('Fehler beim Hochladen:', err);
      setError('Dateien konnten nicht hochgeladen werden.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      
      {/* Header - angepasst an StagePanel */}
      <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md mt-16">
        <div className="flex justify-between items-start gap-4 w-full max-w-screen-2xl mx-auto">
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Dateimanager</h2>
            <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">
              Verwalten und organisieren Sie Ihre Dateien und Ordner
            </p>
          </div>
          {/* Unsichtbares Element für gleiche Höhe */}
          <div className="flex items-start space-x-3 shrink-0 invisible">
            <div className="p-2.5 border border-gray-200 rounded-full w-[48px] h-[48px]"></div>
            <div className="p-2.5 border border-gray-200 rounded-full w-[48px] h-[48px]"></div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-6 py-8 md:px-8 lg:px-12 max-w-screen-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2c2c2c]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 shadow-sm">
            <p className="font-medium mb-2">Ein Fehler ist aufgetreten</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-6">
                <span className="bg-gray-100 p-1.5 rounded-lg mr-3">
                  <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </span>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Ordner</h2>
              </div>
              <div className="h-[calc(100vh-26rem)] overflow-auto">
                <FolderTree />
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <p className="mb-1">Speichernutzung</p>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2c2c2c] rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <p className="mt-1 text-xs">Ca. 15% genutzt</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              {/* Datei-Upload-Bereich */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <FileUploader onUpload={handleUpload} isUploading={isUploading} />
              </div>
              
              {/* Dateiliste */}
              <div className="h-[calc(100vh-28rem)]">
                <FileList className="h-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 