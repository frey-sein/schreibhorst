'use client';

import { useState, useEffect } from 'react';
import { useFileManager } from '@/app/dateimanager/FileManagerContext';

interface FolderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folders: string[]) => void;
  selectedFolders: string[];
}

export default function FolderSelector({ isOpen, onClose, onSelect, selectedFolders }: FolderSelectorProps) {
  const { fileSystem } = useFileManager();
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(selectedFolders);

  useEffect(() => {
    const extractFolderPaths = (node: any, parentPath = ''): string[] => {
      const paths: string[] = [];
      
      if (node.type === 'folder') {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        paths.push(currentPath);
        
        if (node.children) {
          Object.values(node.children).forEach(child => {
            paths.push(...extractFolderPaths(child, currentPath));
          });
        }
      }
      
      return paths;
    };

    if (isOpen && fileSystem) {
      const folders = extractFolderPaths(fileSystem);
      setAvailableFolders(folders);
    }
  }, [isOpen, fileSystem]);

  const handleSelect = (folder: string) => {
    const newSelected = selected.includes(folder)
      ? selected.filter(f => f !== folder)
      : [...selected, folder];
    setSelected(newSelected);
  };

  const handleSave = () => {
    onSelect(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ordner auswählen
            </h3>
            <div className="max-h-96 overflow-y-auto">
              {availableFolders.map((folder) => (
                <div
                  key={folder}
                  className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => handleSelect(folder)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(folder)}
                    onChange={() => handleSelect(folder)}
                    className="h-4 w-4 text-[#2c2c2c] border-gray-300 rounded focus:ring-[#2c2c2c]"
                  />
                  <div className="ml-3 flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-900">{folder}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSave}
              className="w-full inline-flex justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-[#2c2c2c] text-base font-medium text-white hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c] sm:ml-3 sm:w-auto sm:text-sm"
            >
              Auswählen
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 