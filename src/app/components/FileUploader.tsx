'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
}

export default function FileUploader({ onFileSelect, onCancel }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const fileType = file.type.toLowerCase();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // Erlaubte Dateitypen
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(fileType) && !['docx', 'xlsx', 'xls'].includes(fileExtension || '')) {
      alert('Bitte laden Sie nur Text-, PDF-, Word- oder Excel-Dateien hoch.');
      return;
    }

    try {
      let processedFile: File;

      if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          fileType === 'application/vnd.ms-excel' ||
          fileExtension === 'xlsx' ||
          fileExtension === 'xls') {
        // Excel-Datei verarbeiten
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);
        
        // Konvertiere zu Text
        const textContent = jsonData.map(row => 
          Object.values(row).join('\t')
        ).join('\n');

        // Erstelle neue Textdatei
        const textBlob = new Blob([textContent], { type: 'text/plain' });
        processedFile = new File([textBlob], file.name.replace(/\.(xlsx|xls)$/, '.txt'), { type: 'text/plain' });
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 fileExtension === 'docx') {
        // Word-Datei verarbeiten
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const textContent = result.value;
        
        // Erstelle neue Textdatei
        const textBlob = new Blob([textContent], { type: 'text/plain' });
        processedFile = new File([textBlob], file.name.replace(/\.docx$/, '.txt'), { type: 'text/plain' });
      } else {
        processedFile = file;
      }

      onFileSelect(processedFile);
    } catch (error) {
      console.error('Fehler bei der Dateiverarbeitung:', error);
      alert('Es gab einen Fehler bei der Verarbeitung der Datei.');
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
          accept=".txt,.pdf,.docx,.xlsx,.xls"
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
            Unterstützte Formate: TXT, PDF, Word (DOCX), Excel (XLSX, XLS)
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