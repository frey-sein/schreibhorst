'use client';

import { useState, useEffect } from 'react';
import { StorageService, FileItem } from '@/lib/services/storage';
import FileUploader from '@/app/components/FileUploader';
import FileIcon from '@/app/components/FileIcon';
import { v4 as uuidv4 } from 'uuid';

export default function DateimanagerPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('folder');
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const storageService = StorageService.getInstance();

  useEffect(() => {
    setIsClient(true);
    setItems(storageService.getItems());
    setExpandedFolders(new Set(['root']));
  }, []);

  const generateId = () => {
    return uuidv4();
  };

  const getCurrentFolderId = () => {
    if (currentPath.length === 0) return 'root';
    return currentPath[currentPath.length - 1];
  };

  const getCurrentFolderItems = () => {
    const currentFolderId = getCurrentFolderId();
    return storageService.getItemsByParentId(currentFolderId);
  };

  const handleCreateNew = () => {
    if (!newItemName.trim()) return;

    const newItem: FileItem = {
      id: generateId(),
      name: newItemName,
      type: newItemType,
      parentId: getCurrentFolderId(),
      lastModified: new Date()
    };

    storageService.addItem(newItem);
    setItems(storageService.getItems());
    setNewItemName('');
    setIsCreatingNew(false);
  };

  const handleFileUpload = (file: File) => {
    const newItem: FileItem = {
      id: generateId(),
      name: file.name,
      type: 'file',
      parentId: getCurrentFolderId(),
      lastModified: new Date(),
      fileSize: file.size,
      fileType: file.type
    };

    storageService.addItem(newItem);
    setItems(storageService.getItems());
    setIsCreatingNew(false);
  };

  const handleNavigateToFolder = (folderId: string, folderName: string) => {
    setCurrentPath([...currentPath, folderId]);
    setExpandedFolders(prev => new Set([...prev, folderId]));
  };

  const handleNavigateBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const handleDeleteItem = (item: FileItem) => {
    if (confirm(`Möchten Sie "${item.name}" wirklich löschen?`)) {
      storageService.deleteItem(item.id);
      setItems(storageService.getItems());
      setSelectedItem(null);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFolderTree = (parentId: string | null, level: number = 0) => {
    const items = storageService.getItemsByParentId(parentId);
    return items
      .filter(item => item.type === 'folder') // Nur Ordner anzeigen
      .map(item => {
        const isExpanded = expandedFolders.has(item.id);
        const hasChildren = storageService.getItemsByParentId(item.id).some(child => child.type === 'folder');
        const isCurrentFolder = getCurrentFolderId() === item.id;

        return (
          <div key={item.id}>
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-100 ${
                isCurrentFolder ? 'bg-gray-100' : ''
              }`}
              style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
              onClick={() => {
                if (item.type === 'folder') {
                  handleNavigateToFolder(item.id, item.name);
                }
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) {
                    toggleFolder(item.id);
                  }
                }}
                className={`p-1 hover:bg-gray-200 rounded cursor-pointer ${!hasChildren ? 'invisible' : ''}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-600 transform transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-sm text-gray-900 truncate">{item.name}</span>
            </div>
            {isExpanded && hasChildren && (
              <div style={{ marginLeft: `${level * 0.75 + 0.5}rem` }}>
                {renderFolderTree(item.id, level + 1)}
              </div>
            )}
          </div>
        );
      });
  };

  const getBreadcrumbPath = () => {
    const path = ['Meine Dateien'];
    let currentId = getCurrentFolderId();
    
    while (currentId !== 'root') {
      const parent = storageService.getItemById(currentId);
      if (parent) {
        path.unshift(parent.name);
        currentId = parent.parentId || 'root';
      } else {
        break;
      }
    }
    
    return path;
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <main className="pt-16">
          <div className="max-w-[2000px] mx-auto px-6 py-8">
            <div className="flex gap-6">
              <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <h2 className="text-sm font-medium text-gray-900 mb-4">Ordnerstruktur</h2>
                  <div className="space-y-1">
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-2">
                      <div className="h-12 bg-gray-200 rounded"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="pt-16">
        <div className="max-w-[2000px] mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Seitenleiste mit Ordnerstruktur */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-medium text-gray-900 mb-4">Ordnerstruktur</h2>
                <div className="space-y-1">
                  {renderFolderTree(null)}
                </div>
              </div>
            </div>

            {/* Hauptbereich */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">Dateimanager</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {getBreadcrumbPath().map((folder, index) => (
                        <div key={index} className="flex items-center">
                          {index > 0 && <span className="mx-2">/</span>}
                          <button
                            onClick={() => {
                              if (index === 0) {
                                setCurrentPath([]);
                              } else {
                                setCurrentPath(currentPath.slice(0, index));
                              }
                            }}
                            className="hover:text-gray-700"
                          >
                            {folder}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNewItemType('folder');
                        setIsCreatingNew(true);
                      }}
                      className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      Neuer Ordner
                    </button>
                    <button
                      onClick={() => {
                        setNewItemType('file');
                        setIsCreatingNew(true);
                      }}
                      className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      Neue Datei
                    </button>
                  </div>
                </div>

                {/* Neues Element erstellen */}
                {isCreatingNew && (
                  newItemType === 'folder' ? (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Name für neuen Ordner"
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm text-gray-900 placeholder-gray-500"
                        />
                        <button
                          onClick={handleCreateNew}
                          className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                        >
                          Erstellen
                        </button>
                        <button
                          onClick={() => setIsCreatingNew(false)}
                          className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <FileUploader
                      onFileSelect={handleFileUpload}
                      onCancel={() => setIsCreatingNew(false)}
                    />
                  )
                )}

                {/* Datei- und Ordnerliste */}
                <div className="space-y-2">
                  {currentPath.length > 0 && (
                    <button
                      onClick={handleNavigateBack}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-gray-50 transition-colors rounded-lg border border-gray-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Zurück</span>
                    </button>
                  )}
                  
                  {getCurrentFolderItems().map((item) => (
                    <div
                      key={item.id}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors rounded-lg border border-gray-100 ${
                        selectedItem?.id === item.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (item.type === 'folder') {
                            handleNavigateToFolder(item.id, item.name);
                          } else {
                            setSelectedItem(selectedItem?.id === item.id ? null : item);
                          }
                        }}
                        className="flex-1 flex items-center gap-3"
                      >
                        {item.type === 'folder' ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-gray-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        ) : (
                          <FileIcon type={item.fileType || ''} className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="text-gray-700">{item.name}</span>
                        {item.lastModified && (
                          <span className="ml-auto text-sm text-gray-400">
                            {item.lastModified.toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </button>
                      {selectedItem?.id === item.id && (
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 