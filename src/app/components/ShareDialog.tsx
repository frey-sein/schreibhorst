'use client';

import { useState } from 'react';
import { StorageService } from '@/lib/services/storage';
import { FileItem } from '@/lib/services/storage';

interface ShareDialogProps {
  file: FileItem;
  onClose: () => void;
}

export default function ShareDialog({ file, onClose }: ShareDialogProps) {
  const [expiry, setExpiry] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const storageService = StorageService.getInstance();

  const handleShare = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const options: { expiry?: Date; password?: string } = {};
      
      if (expiry) {
        options.expiry = new Date(expiry);
      }
      
      if (password) {
        options.password = password;
      }

      const { shareUrl } = await storageService.shareFile(file.id, options);
      setShareUrl(shareUrl);
    } catch (err) {
      setError('Fehler beim Teilen der Datei');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-light text-gray-900">Datei teilen</h2>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datei
            </label>
            <div className="text-sm text-gray-900">{file.name}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ablaufdatum (optional)
            </label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passwortschutz (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm"
              placeholder="Passwort eingeben"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {shareUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm font-medium"
                >
                  Kopieren
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Teilen Sie diesen Link mit anderen, damit sie auf die Datei zugreifen können.
              </p>
            </div>
          ) : (
            <button
              onClick={handleShare}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? 'Wird geteilt...' : 'Teilen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 