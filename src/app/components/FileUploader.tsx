'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface FileUploaderProps {
  onUpload: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  parentId?: string;
}

export default function FileUploader({ onUpload, accept, maxSize = 10485760, parentId }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      await onUpload(acceptedFiles);
    } catch (error) {
      console.error('Fehler beim Upload:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    multiple: false // Erlaube nur eine Datei auf einmal
  });

  return (
    <div 
      {...getRootProps()} 
      className={`relative p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer
        ${isDragging ? 'border-[#2c2c2c] bg-[#2c2c2c]/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center">
        <CloudArrowUpIcon className={`w-12 h-12 mb-4 ${isDragging ? 'text-[#2c2c2c]' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-600 mb-1">
          {isDragActive
            ? 'Dateien hier ablegen...'
            : isUploading
              ? 'Lade Datei hoch...'
              : 'Datei hierher ziehen oder klicken zum Auswählen'}
        </p>
        <p className="text-xs text-gray-500">
          Maximale Dateigröße: {Math.round(maxSize / 1024 / 1024)}MB
        </p>
        {fileRejections.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name}>
                <p className="font-medium">{file.name}:</p>
                <ul className="list-disc list-inside">
                  {errors.map(error => (
                    <li key={error.code}>{error.message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 