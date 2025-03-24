import { useState } from 'react';
import { FileItem as FileItemType } from '@/types/files';
import FileItem from './FileItem';
import { useFileStore } from '@/lib/store/fileStore';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function FileList() {
  const { 
    files,
    deleteFile,
    renameFile,
    replaceFile,
    navigateToFolder,
    navigateBack,
    getCurrentItems,
    getBreadcrumbPath,
    currentPath
  } = useFileStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchten Sie diese Datei wirklich löschen?')) {
      await deleteFile(id);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    await renameFile(id, newName);
  };

  const handleReplace = async (id: string, file: File) => {
    await replaceFile(id, file);
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        {getBreadcrumbPath().map((folder, index) => (
          <div key={folder.id} className="flex items-center">
            {index > 0 && <span className="mx-2">/</span>}
            <button
              onClick={() => {
                // Navigiere zu diesem Ordner, indem wir den Pfad bis zu diesem Index nehmen
                const newPath = currentPath.slice(0, index + 1);
                newPath.forEach((_, i) => {
                  if (i < index) navigateBack();
                });
              }}
              className="hover:text-gray-700"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Zurück-Button */}
      {currentPath.length > 1 && (
        <button
          onClick={navigateBack}
          className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-gray-50 transition-colors rounded-lg border border-gray-100"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
          <span className="text-gray-700">Zurück</span>
        </button>
      )}

      {/* Datei- und Ordnerliste */}
      <div className="space-y-2">
        {getCurrentItems()
          .sort((a, b) => {
            // Ordner vor Dateien
            if (a.type !== b.type) {
              return a.type === 'folder' ? -1 : 1;
            }
            // Alphabetisch innerhalb des gleichen Typs
            return a.name.localeCompare(b.name);
          })
          .map(item => (
            <FileItem
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onRename={handleRename}
              onReplace={handleReplace}
              onPreview={handlePreview}
              onNavigate={navigateToFolder}
            />
          ))}
      </div>

      {/* Vorschau-Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white p-4 rounded-lg max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {previewUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img src={previewUrl} alt="Vorschau" className="max-w-full h-auto" />
            ) : previewUrl.match(/\.(pdf)$/i) ? (
              <iframe src={previewUrl} className="w-full h-[80vh]" />
            ) : (
              <div className="p-4 text-center">
                <p>Keine Vorschau verfügbar</p>
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 inline-block px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Datei öffnen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 