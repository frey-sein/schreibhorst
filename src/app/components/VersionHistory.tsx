import { FileVersion } from '@/lib/services/storage';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface VersionHistoryProps {
  versions: FileVersion[];
  onRestore: (versionId: string) => Promise<void>;
  onClose: () => void;
}

export default function VersionHistory({ versions, onRestore, onClose }: VersionHistoryProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-light text-gray-900">Versionshistorie</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          {versions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Keine Versionen verfügbar</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div>
                  <div className="font-medium text-gray-900">{version.name}</div>
                  <div className="text-sm text-gray-500">
                    {format(version.lastModified, 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>
                </div>
                <button
                  onClick={() => onRestore(version.id)}
                  className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                >
                  Wiederherstellen
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 