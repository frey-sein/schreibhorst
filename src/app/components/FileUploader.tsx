'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
}

export default function FileUploader({ onFileSelect, onCancel }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const supportedFormats = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/gif',
    'image/webp',
    'application/postscript'
  ];

  const formatNames: { [key: string]: string } = {
    'text/plain': 'Text (TXT)',
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (DOCX)',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (XLSX)',
    'application/vnd.ms-excel': 'Excel (XLS)',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/svg+xml': 'SVG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'application/postscript': 'EPS'
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!supportedFormats.includes(fileType) && !['docx', 'xlsx', 'xls'].includes(fileExtension || '')) {
        alert('Bitte laden Sie nur unterstützte Dateiformate hoch.');
        return;
      }

      onFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      const fileType = file.type;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!supportedFormats.includes(fileType) && !['docx', 'xlsx', 'xls'].includes(fileExtension || '')) {
        alert('Bitte laden Sie nur unterstützte Dateiformate hoch.');
        return;
      }

      onFileSelect(file);
    }
  };

  return (
    <div className="mb-6">
      <div
        className={`p-6 border-2 border-dashed rounded-lg text-center ${
          isDragging ? 'border-[#2c2c2c] bg-gray-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept={supportedFormats.join(',')}
        />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-gray-600">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#2c2c2c] hover:text-[#1a1a1a] font-medium"
            >
              Datei auswählen
            </button>
            <span className="mx-2">oder</span>
            <span>per Drag & Drop hierher ziehen</span>
          </div>
          <p className="text-sm text-gray-500">
            Unterstützte Formate: {Object.values(formatNames).join(', ')}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
} 