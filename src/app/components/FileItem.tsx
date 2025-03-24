import { useState, useRef } from 'react';
import { FileItem as FileItemType } from '@/types/files';
import { 
  DocumentIcon, 
  PhotoIcon, 
  DocumentTextIcon, 
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  FolderIcon,
  PencilIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface FileItemProps {
  item: FileItemType;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onReplace: (id: string, file: File) => void;
  onPreview: (url: string) => void;
  onNavigate?: (id: string) => void;
  onShowHistory?: (id: string) => void;
}

export default function FileItem({ item, onDelete, onRename, onReplace, onPreview, onNavigate, onShowHistory }: FileItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameClick = () => {
    if (item.type === 'folder' && onNavigate) {
      onNavigate(item.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNameBlur = () => {
    setIsEditing(false);
    if (newName !== item.name) {
      onRename(item.id, newName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (newName !== item.name) {
        onRename(item.id, newName);
      }
    }
  };

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplace(item.id, file);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const getFileIcon = () => {
    if (item.type === 'folder') {
      return <FolderIcon className="h-5 w-5 text-gray-400" />;
    }

    if (!item.mimeType) return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    
    if (item.mimeType.startsWith('image/')) {
      return <PhotoIcon className="h-5 w-5 text-gray-400" />;
    }
    
    if (item.mimeType.includes('pdf')) {
      return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
    }
    
    if (item.mimeType.includes('word') || item.mimeType.includes('excel')) {
      return <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />;
    }
    
    return <DocumentIcon className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors group">
      <div 
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        onClick={handleNameClick}
      >
        {getFileIcon()}
        
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900 bg-white"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-gray-700 hover:text-gray-900">
              {item.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.type === 'file' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item.url || '');
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="Vorschau"
            >
              <EyeIcon className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={handleReplaceClick}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="Datei ersetzen"
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-500" />
            </button>
            {onShowHistory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowHistory(item.id);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                title="Versionshistorie"
              >
                <ClockIcon className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </>
        )}
        <button
          onClick={handleEditClick}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          title="Umbenennen"
        >
          <PencilIcon className="h-4 w-4 text-gray-500" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          title={`${item.type === 'folder' ? 'Ordner' : 'Datei'} löschen`}
        >
          <TrashIcon className="h-4 w-4 text-gray-500" />
        </button>
        {item.type === 'file' && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
} 