'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  maxSize?: number;
  isUploading?: boolean;
}

export default function FileUploader({ onUpload, maxSize = 10485760, isUploading = false }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localUploading, setLocalUploading] = useState(false);
  
  // Kombiniere lokalen und externen Ladezustand
  const uploading = isUploading || localUploading;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || uploading) return;
    
    setLocalUploading(true);
    try {
      await onUpload(acceptedFiles);
    } catch (error) {
      console.error('Fehler beim Upload:', error);
    } finally {
      setLocalUploading(false);
    }
  }, [onUpload, uploading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    disabled: uploading
  });

  return (
    <div 
      {...getRootProps()} 
      className={`relative p-8 border-2 border-dashed rounded-xl transition-all shadow-sm ${
        uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
      } ${isDragging ? 'border-[#2c2c2c] bg-[#2c2c2c]/5' : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'}`}
    >
      <input {...getInputProps()} disabled={uploading} />
      <div className="flex flex-col items-center justify-center text-center">
        <CloudArrowUpIcon className={`w-12 h-12 mb-4 ${isDragging ? 'text-[#2c2c2c]' : 'text-gray-500'}`} />
        <p className="text-sm font-medium text-gray-700 mb-2">
          {isDragActive
            ? 'Dateien hier ablegen...'
            : uploading
              ? 'Lade Datei hoch...'
              : 'Datei hierher ziehen oder klicken zum Auswählen'}
        </p>
        <p className="text-xs text-gray-500">
          Maximale Dateigröße: {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>
    </div>
  );
} 