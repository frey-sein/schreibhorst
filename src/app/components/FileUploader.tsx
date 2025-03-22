'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
}

export default function FileUploader({ onFileSelect, onCancel }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
  });

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex flex-col items-center gap-4">
        <div
          {...getRootProps()}
          className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive || isDragging
              ? 'border-[#2c2c2c] bg-gray-100'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-gray-600 mb-2">
            {isDragActive || isDragging
              ? 'Datei hier ablegen...'
              : 'Datei hierher ziehen oder klicken zum Auswählen'}
          </p>
          <p className="text-sm text-gray-500">oder</p>
          <button
            type="button"
            className="mt-2 px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
          >
            Datei auswählen
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
} 