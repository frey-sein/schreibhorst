import { useState, useEffect } from 'react';
import { FileVersion } from '@/types/files';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ClockIcon } from '@heroicons/react/24/outline';

interface FileHistoryProps {
  fileId: string;
  onClose: () => void;
}

export default function FileHistory({ fileId, onClose }: FileHistoryProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/files/${fileId}/history`);
        if (!response.ok) throw new Error('Fehler beim Laden der Historie');
        const data = await response.json();
        setVersions(data);
      } catch (error) {
        setError('Fehler beim Laden der Versionshistorie');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [fileId]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-red-600 font-medium mb-2">Fehler</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-medium text-gray-900">Versionshistorie</h2>
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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Keine Versionshistorie verfügbar
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {versions.map((version) => (
              <div
                key={version.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {version.replacedBy}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(version.timestamp), "d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Dateigröße: {(version.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Typ: {version.mimeType}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 