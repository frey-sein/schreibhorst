'use client';

import { FileItem } from '@/lib/services/storage';
import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
  onReplace?: (file: File) => Promise<void>;
}

export default function FilePreview({ file, onClose, onReplace }: FilePreviewProps) {
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        if (!file.content) {
          setError('Keine Dateiinhalte verfügbar');
          return;
        }

        // Für Bilder
        if (file.fileType?.startsWith('image/')) {
          setPreviewContent(file.content);
          return;
        }

        // Extrahiere Base64-Daten
        const base64Content = file.content.split(',')[1];
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Für Word-Dokumente
        if (file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const arrayBuffer = bytes.buffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          setPreviewContent(result.value);
          return;
        }

        // Für Excel-Dateien
        if (file.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.fileType === 'application/vnd.ms-excel') {
          const data = new Uint8Array(bytes);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const htmlTable = XLSX.utils.sheet_to_html(firstSheet);
          setPreviewContent(htmlTable);
          return;
        }

        if (file.fileType === 'application/postscript') {
          setPreviewContent(null);
          setError('EPS-Dateien können nicht direkt in der Vorschau angezeigt werden.');
          return;
        }

        setError('Keine Vorschau für diesen Dateityp verfügbar');
      } catch (err) {
        console.error('Fehler beim Laden der Vorschau:', err);
        setError('Fehler beim Laden der Vorschau');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [file]);

  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Überprüfe den Dateityp
    if (selectedFile.type !== file.fileType) {
      alert('Bitte wählen Sie eine Datei vom gleichen Typ aus.');
      return;
    }

    try {
      if (onReplace) {
        await onReplace(selectedFile);
        // Aktualisiere die Vorschau
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setPreviewContent(content);
          setIsLoading(false);
        };
        reader.readAsDataURL(selectedFile);
      }
    } catch (error) {
      console.error('Fehler beim Ersetzen der Datei:', error);
      alert('Fehler beim Ersetzen der Datei');
    }
  };

  const renderPreview = () => {
    if (!file.content) {
      return (
        <div className="text-center text-gray-500">
          Keine Vorschau verfügbar
        </div>
      );
    }

    if (file.fileType?.startsWith('image/')) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={file.content}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (file.fileType === 'application/postscript') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">EPS-Datei</p>
            <p className="text-sm text-gray-400 mt-2">EPS-Dateien können nicht direkt in der Vorschau angezeigt werden.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="preview-content h-full">
        {file.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           file.fileType === 'application/vnd.ms-excel' ? (
          <div 
            className="excel-preview" 
            dangerouslySetInnerHTML={{ __html: previewContent || '' }}
          />
        ) : (
          <div className="text-preview">
            {previewContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overlay">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4 p-2 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">{file.name}</h2>
            {onReplace && (
              <div className="flex items-center">
                <button
                  onClick={handleReplaceClick}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Aktualisieren
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={file.fileType}
                />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : renderPreview()}
        </div>
      </div>

      <style jsx>{`
        .overlay {
          background-color: rgba(0, 0, 0, 0.8);
        }

        .preview-content {
          padding: 1rem;
          font-size: 1rem;
          line-height: 1.5;
        }
        
        .text-preview {
          white-space: pre-wrap;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1a1a1a;
          max-height: calc(90vh - 8rem);
          overflow-y: auto;
        }

        .excel-preview {
          max-height: calc(90vh - 8rem);
          overflow-y: auto;
        }

        .excel-preview :global(table) {
          border-collapse: collapse;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .excel-preview :global(th),
        .excel-preview :global(td) {
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
          text-align: left;
          font-size: 0.875rem;
        }

        .excel-preview :global(tr:nth-child(even)) {
          background-color: #f8fafc;
        }

        .excel-preview :global(th) {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #1a1a1a;
        }

        .excel-preview :global(td) {
          color: #1a1a1a;
        }
      `}</style>
    </div>
  );
} 