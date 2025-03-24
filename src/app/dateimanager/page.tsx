'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { useUserStore } from '@/lib/store/userStore';
import FileUploader from '@/app/components/FileUploader';
import { StorageService } from '@/lib/services/StorageService';
import { FileItem } from '@/types/files';
import {
  FolderIcon,
  DocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useFileStore } from '@/lib/store/fileStore';
import FileList from '@/app/components/FileList';
import FolderTree from '@/app/components/FolderTree';

export default function DateimanagerPage() {
  const [mounted, setMounted] = useState(false);
  const { getCurrentUser } = useUserStore();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const storageService = StorageService.getInstance();
  const { 
    files,
    deleteFile,
    renameFile,
    replaceFile,
    navigateToFolder,
    navigateBack,
    getCurrentItems,
    getBreadcrumbPath,
    currentPath: fileStoreCurrentPath,
    setFiles,
    initializePath
  } = useFileStore();

  useEffect(() => {
    setMounted(true);
    
    // Debug-Ausgabe für localStorage
    if (typeof window !== 'undefined') {
      console.log('localStorage Inhalt:', {
        files: localStorage.getItem('files'),
        fileItems: localStorage.getItem('fileItems')
      });
    }
    
    // Versuche die alten Daten zu laden
    if (typeof window !== 'undefined') {
      try {
        const oldItems = localStorage.getItem('files');
        if (oldItems) {
          console.log('Gefundene alte Daten:', oldItems);
          const parsedOldItems = JSON.parse(oldItems);
          console.log('Parsed alte Daten:', parsedOldItems);
          setItems(parsedOldItems.map((item: any) => ({
            ...item,
            lastModified: item.lastModified ? new Date(item.lastModified) : undefined
          })));
        } else {
          console.log('Keine alten Daten gefunden, lade neue Daten');
          setItems(storageService.getItems());
        }
      } catch (error) {
        console.error('Fehler beim Laden der alten Dateien:', error);
        setItems(storageService.getItems());
      }
    }
    
    setExpandedFolders(new Set(['root']));

    // Lade die Dateien beim ersten Rendern
    const loadFiles = async () => {
      try {
        const response = await fetch('/api/files');
        if (!response.ok) throw new Error('Fehler beim Laden der Dateien');
        const files = await response.json();
        setFiles(files);
        // Initialisiere den gespeicherten Pfad nach dem Laden der Dateien
        initializePath();
      } catch (error) {
        console.error('Fehler beim Laden der Dateien:', error);
      }
    };

    loadFiles();
  }, [setFiles, initializePath]);

  // Render nichts während des ersten Mounts
  if (!mounted) return null;

  const getCurrentFolderId = () => {
    if (currentPath.length === 0) return 'root';
    return currentPath[currentPath.length - 1];
  };

  const getCurrentFolderItems = () => {
    const currentFolderId = getCurrentFolderId();
    return storageService.getItemsByParentId(currentFolderId);
  };

  const handleCreateFolder = () => {
    if (!newItemName) return;

    const newFolder: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      type: 'folder',
      parentId: getCurrentFolderId()
    };

    storageService.addItem(newFolder);
    setItems(storageService.getItems());
    setNewItemName('');
    setShowNewFolderDialog(false);
  };

  const handleDeleteItem = (item: FileItem) => {
    if (window.confirm(`Möchten Sie "${item.name}" wirklich löschen?`)) {
      storageService.deleteItem(item.id);
      setItems(storageService.getItems());
    }
  };

  const handleRenameItem = (item: FileItem) => {
    const newName = window.prompt('Neuer Name:', item.name);
    if (newName && newName !== item.name) {
      const updatedItem = { ...item, name: newName };
      storageService.updateItem(updatedItem);
      setItems(storageService.getItems());
    }
  };

  const handleNavigateToFolder = (folderId: string) => {
    setCurrentPath([...currentPath, folderId]);
    setExpandedFolders(prev => new Set([...prev, folderId]));
  };

  const handleNavigateBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
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
      .filter(item => item.type === 'folder')
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
              onClick={() => handleNavigateToFolder(item.id)}
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
                <ChevronRightIcon
                  className={`h-4 w-4 text-gray-600 transform transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </div>
              <FolderIcon className="h-4 w-4 text-gray-600" />
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f4f4f4] pt-24">
        <main>
          <div className="max-w-[2000px] mx-auto px-6 py-8">
            <div className="flex gap-6">
              {/* Seitenleiste mit Ordnerstruktur */}
              <div className="w-64">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-[88px]">
                  <div className="p-6">
                    <h2 className="text-2xl font-light text-gray-900 tracking-tight">Struktur</h2>
                  </div>
                  <div className="overflow-y-auto px-4 pb-4">
                    <FolderTree folder={{ id: 'root', name: 'Meine Dateien', type: 'folder', parentId: null }} />
                  </div>
                </div>
              </div>

              {/* Hauptbereich */}
              <div className="flex-1">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">Dateimanager</h1>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                        <button
                          onClick={() => setCurrentPath([])}
                          className="hover:text-gray-700"
                        >
                          Meine Dateien
                        </button>
                        {getBreadcrumbPath().map((folder, index, array) => (
                          <div key={folder.id} className="flex items-center">
                            <span className="mx-2">/</span>
                            <button
                              onClick={() => {
                                const newPath = array.slice(0, index + 1).map(f => f.id);
                                setCurrentPath(newPath);
                              }}
                              className="hover:text-gray-700"
                            >
                              {folder.name}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNewFolderDialog(true)}
                          className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium flex items-center gap-2"
                        >
                          <FolderIcon className="h-5 w-5" />
                          Neuer Ordner
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Neuer Ordner Dialog */}
                  {showNewFolderDialog && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Name für neuen Ordner"
                          className="input-field"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateFolder();
                            if (e.key === 'Escape') setShowNewFolderDialog(false);
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleCreateFolder}
                          className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                        >
                          Erstellen
                        </button>
                        <button
                          onClick={() => setShowNewFolderDialog(false)}
                          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Datei-Upload und Liste */}
                  <div className="space-y-6">
                    <FileUploader
                      onUpload={async (files) => {
                        try {
                          const formData = new FormData();
                          formData.append('file', files[0]);
                          formData.append('parentId', getCurrentFolderId());

                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });

                          if (!response.ok) {
                            throw new Error('Upload fehlgeschlagen');
                          }

                          const uploadedFile = await response.json();
                          storageService.addItem(uploadedFile);
                          setItems(storageService.getItems());
                        } catch (error) {
                          console.error('Fehler beim Upload:', error);
                        }
                      }}
                      parentId={getCurrentFolderId()}
                      accept={{
                        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                        'application/pdf': ['.pdf'],
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                        'application/vnd.ms-excel': ['.xls'],
                        'text/plain': ['.txt'],
                        'application/postscript': ['.eps'],
                        'image/svg+xml': ['.svg']
                      }}
                      maxSize={10 * 1024 * 1024} // 10MB
                    />
                    
                    {currentPath.length > 0 && (
                      <button
                        onClick={handleNavigateBack}
                        className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-gray-50 transition-colors rounded-lg border border-gray-100"
                      >
                        <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">Zurück</span>
                      </button>
                    )}
                    
                    {/* Neue FileList-Komponente */}
                    <FileList />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}