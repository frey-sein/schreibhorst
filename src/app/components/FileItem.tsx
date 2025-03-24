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
  ClockIcon,
  MusicalNoteIcon,
  FilmIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ConfirmDialog from './ConfirmDialog';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(item.id);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const getFileIcon = () => {
    if (item.type === 'folder') {
      return <FolderIcon className="h-5 w-5 text-gray-400" />;
    }

    // Wenn kein MIME-Typ vorhanden ist, dann basierend auf der Dateiendung entscheiden
    if (!item.mimeType || item.mimeType === 'application/octet-stream') {
      // Dateiendungen extrahieren und prüfen
      const fileName = item.name.toLowerCase();
      
      if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || 
          fileName.endsWith('.gif') || fileName.endsWith('.svg')) {
        return <PhotoIcon className="h-5 w-5 text-blue-400" />;
      }
      
      if (fileName.endsWith('.pdf')) {
        return <DocumentTextIcon className="h-5 w-5 text-red-400" />;
      }
      
      if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        return <DocumentDuplicateIcon className="h-5 w-5 text-blue-400" />;
      }
      
      if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        return <DocumentDuplicateIcon className="h-5 w-5 text-green-400" />;
      }
      
      if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
        return <DocumentDuplicateIcon className="h-5 w-5 text-orange-400" />;
      }
      
      return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
    
    // Bilder erkennen - erst genaue Typen prüfen
    if (
      item.mimeType === 'image/jpeg' || 
      item.mimeType === 'image/jpg' || 
      item.mimeType === 'image/png' || 
      item.mimeType === 'image/gif' || 
      item.mimeType === 'image/svg+xml' ||
      item.mimeType.startsWith('image/')
    ) {
      return <PhotoIcon className="h-5 w-5 text-blue-400" />;
    }
    
    if (item.mimeType === 'application/pdf') {
      return <DocumentTextIcon className="h-5 w-5 text-red-400" />;
    }
    
    if (
      item.mimeType === 'application/msword' || 
      item.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return <DocumentDuplicateIcon className="h-5 w-5 text-blue-400" />;
    }
    
    if (
      item.mimeType === 'application/vnd.ms-excel' || 
      item.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return <DocumentDuplicateIcon className="h-5 w-5 text-green-400" />;
    }
    
    if (
      item.mimeType === 'application/vnd.ms-powerpoint' || 
      item.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return <DocumentDuplicateIcon className="h-5 w-5 text-orange-400" />;
    }
    
    if (item.mimeType.startsWith('video/')) {
      return <FilmIcon className="h-5 w-5 text-purple-400" />;
    }
    
    if (item.mimeType.startsWith('audio/')) {
      return <MusicalNoteIcon className="h-5 w-5 text-yellow-400" />;
    }
    
    if (
      item.mimeType === 'application/zip' ||
      item.mimeType === 'application/vnd.rar' ||
      item.mimeType === 'application/x-7z-compressed'
    ) {
      return <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />;
    }
    
    if (item.mimeType === 'text/plain') {
      return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
    }
    
    return <DocumentIcon className="h-5 w-5 text-gray-400" />;
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-[#f9f9f9] border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group">
        <div 
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={handleNameClick}
        >
          <div className="w-6 h-6 flex items-center justify-center text-gray-500">
            {getFileIcon()}
          </div>
          
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
              <span className="text-gray-700 hover:text-gray-900 font-medium">
                {item.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.type === 'file' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(item.url || '');
                }}
                className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                title="Vorschau"
              >
                <EyeIcon className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={handleReplaceClick}
                className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
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
                  className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                  title="Versionshistorie"
                >
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </>
          )}
          <button
            onClick={handleEditClick}
            className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
            title="Umbenennen"
          >
            <PencilIcon className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
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

      {/* Bestätigungsdialog für das Löschen */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`${item.type === 'folder' ? 'Ordner' : 'Datei'} löschen`}
        message={`Möchten Sie "${item.name}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </>
  );
} 