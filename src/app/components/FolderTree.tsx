import { useFileStore } from '@/lib/store/fileStore';
import { FolderIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { FileItem } from '@/types/files';

export default function FolderTree() {
  const { files, currentPath, navigateToFolder } = useFileStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const getFoldersByParentId = (parentId: string | null) => {
    return files.filter(file => file.type === 'folder' && file.parentId === parentId);
  };

  const isActive = (folderId: string) => {
    return currentPath.includes(folderId);
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

  const renderFolder = (folder: FileItem, level: number = 0) => {
    const children = getFoldersByParentId(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const active = isActive(folder.id);

    return (
      <div key={folder.id} className="w-full">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 ${
            active ? 'bg-gray-100' : ''
          }`}
          style={{ paddingLeft: `${(level * 12) + 8}px` }}
          onClick={() => navigateToFolder(folder.id)}
        >
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
            >
              <ChevronRightIcon
                className={`h-4 w-4 text-gray-600 transform transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
          {children.length === 0 && <div className="w-6"></div>}
          <FolderIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
          <span className="text-sm text-gray-900 truncate">{folder.name}</span>
        </div>
        
        {isExpanded && children.length > 0 && (
          <div className="w-full">
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

  // Nur den Root-Ordner rendern, seine Kinder werden automatisch in renderFolder gerendert,
  // wenn er expandiert ist (was standardmäßig der Fall ist, da 'root' in expandedFolders ist)
  return <div className="w-full space-y-1">{renderFolder(rootFolder)}</div>;
} 