import { useState, useRef } from 'react';
import { useFileStore } from '@/lib/store/fileStore';

interface FileUploadDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function FileUploadDialog({ onClose, onSuccess }: FileUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, currentPath } = useFileStore();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Bitte wählen Sie eine Datei aus.');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Starte ein Intervall für den Fortschrittsbalken (Simulation)
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
      
      // Bestimme den Zielordner (aktueller Pfad)
      const folderId = Array.isArray(currentPath) && currentPath.length > 0 
        ? currentPath[currentPath.length - 1] 
        : 'root';
      
      // Datei hochladen
      await uploadFile(selectedFile);
      
      // Setze den Fortschritt auf 100%
      setUploadProgress(100);
      clearInterval(interval);
      
      // Leichte Verzögerung vor dem Schließen
      setTimeout(() => {
        setIsUploading(false);
        onSuccess();
      }, 500);
      
    } catch (error) {
      console.error('Fehler beim Hochladen:', error);
      setError('Fehler beim Hochladen der Datei. Bitte versuchen Sie es erneut.');
      setIsUploading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium mb-4">Datei hochladen</h3>
        
        {isUploading ? (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Hochladen...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-[#2c2c2c] h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              
              <div className="flex flex-col items-center">
                <svg className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                
                <p className="text-sm text-gray-600">
                  Klicken Sie oder ziehen Sie eine Datei hierher
                </p>
                
                {selectedFile && (
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Ausgewählte Datei: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className={`px-4 py-2 bg-[#2c2c2c] text-white rounded-md hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Hochladen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 