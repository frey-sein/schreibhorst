import { useState } from 'react';
import { useFileStore } from '@/lib/store/fileStore';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon } from '@heroicons/react/24/outline';
import { FileItem } from '@/types/files';

interface FolderTreeProps {
  folder: FileItem;
  level?: number;
}

export default function FolderTree({ folder, level = 0 }: FolderTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { files, navigateToFolder, currentPath } = useFileStore();
  
  // Finde alle Unterordner für diesen Ordner
  const subFolders = files.filter(
    (file) => file.parentId === folder.id && file.type === 'folder'
  );

  // Prüfe, ob dieser Ordner der aktive Ordner ist (der letzte im Pfad)
  const isActive = currentPath[currentPath.length - 1] === folder.id;
  const hasSubFolders = subFolders.length > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full mx-2 my-0.5 cursor-pointer transition-all ${
          isActive 
            ? 'bg-white border border-[#2c2c2c] shadow-sm' 
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => {
          navigateToFolder(folder.id);
          if (hasSubFolders && !isExpanded) {
            setIsExpanded(true);
          }
        }}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          {hasSubFolders && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 text-gray-600" />
              )}
            </button>
          )}
        </div>
        <FolderIcon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-600'}`} />
        <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
          {folder.name}
        </span>
      </div>

      {isExpanded && hasSubFolders && (
        <div>
          {subFolders
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((subFolder) => (
              <FolderTree
                key={subFolder.id}
                folder={subFolder}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
} 