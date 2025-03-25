import { useFileStore } from '../../lib/store/fileStore';
import { FolderIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { FileItem } from '../../types/files';

export default function FolderTree() {
  const { files, currentPath, navigateToFolder } = useFileStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const getFoldersByParentId = (parentId: string | null) => {
    return files.filter(file => file.type === 'folder' && file.parentId === parentId);
  };

  const isActive = (folderId: string) => {
    return currentPath[currentPath.length - 1] === folderId;
  };

  const isInPath = (folderId: string) => {
    // Prüft, ob der Ordner tatsächlich im aktuellen Navigationspfad liegt
    return currentPath.includes(folderId) && !isActive(folderId);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Stellt sicher, dass alle Ordner im Pfad aufgeklappt sind
  const ensurePathFoldersExpanded = () => {
    currentPath.forEach(folderId => {
      if (!expandedFolders.has(folderId)) {
        setExpandedFolders(prev => new Set([...prev, folderId]));
      }
    });
  };

  // Beim Rendern sicherstellen, dass alle Ordner im Pfad aufgeklappt sind
  ensurePathFoldersExpanded();

  const renderFolder = (folder: FileItem, level: number = 0) => {
    const children = getFoldersByParentId(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const active = isActive(folder.id);
    const inPath = isInPath(folder.id);

    return (
      <div key={folder.id} className="w-full">
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer border 
            ${active 
              ? 'bg-[#2c2c2c]/10 font-medium text-[#2c2c2c] border-gray-300' 
              : inPath 
                ? 'bg-gray-50 text-gray-800 border-gray-200' 
                : 'bg-white text-gray-700 hover:bg-gray-50/50 border-transparent'
            }
          `}
          style={{ paddingLeft: `${(level * 12) + 8}px` }}
          onClick={() => navigateToFolder(folder.id)}
        >
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className={`
                p-1 rounded flex-shrink-0 
                ${active ? 'text-[#2c2c2c]' : 'text-gray-500 hover:bg-gray-100'}
              `}
            >
              <ChevronRightIcon
                className={`h-4 w-4 transform transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
          {children.length === 0 && <div className="w-6"></div>}
          <FolderIcon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? 'text-[#2c2c2c]' : 'text-gray-500'}`} />
          <span className="text-sm truncate">{folder.name}</span>
        </div>
        
        {isExpanded && children.length > 0 && (
          <div className="w-full pl-2 mt-1 space-y-1">
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Root-Ordner rendern
  const rootFolder: FileItem = {
    id: 'root',
    name: 'Meine Dateien',
    type: 'folder',
    parentId: null,
    path: '/',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div className="w-full space-y-1.5">
      {renderFolder(rootFolder)}
    </div>
  );
} 