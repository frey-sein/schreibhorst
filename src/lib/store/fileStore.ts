import { create } from 'zustand';
import { FileItem } from '@/types/files';

interface FileStore {
  files: FileItem[];
  currentPath: string[];
  folders: FileItem[];
  setFiles: (files: FileItem[]) => void;
  setCurrentPath: (path: string[]) => void;
  loadFiles: () => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  replaceFile: (id: string, file: File) => Promise<void>;
  navigateToFolder: (folderId: string) => void;
  navigateBack: () => void;
  navigateToRoot: () => void;
  navigateToPathIndex: (index: number) => void;
  getCurrentFolderId: () => string;
  getCurrentItems: () => FileItem[];
  getBreadcrumbPath: () => Array<{ id: string; name: string; }>;
  initializePath: () => void;
  getCurrentFolder: () => string;
  createFolder: (name: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  renameItem: (id: string, newName: string) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  logState: () => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  currentPath: ['root'],
  folders: [],
  
  setFiles: (files) => {
    if (!files || !Array.isArray(files)) {
      console.error('setFiles wurde mit ungültigen Daten aufgerufen:', files);
      set({ files: [] });
      return;
    }
    
    // Duplikate entfernen basierend auf ID
    const uniqueFiles = Array.from(
      new Map(files.map(file => [file.id, file])).values()
    );
    set({ files: uniqueFiles });
  },
  
  setCurrentPath: (path) => set({ currentPath: path }),
  
  loadFiles: async () => {
    // Versuche zuerst Daten aus localStorage zu laden
    if (typeof window !== 'undefined') {
      const storedFiles = localStorage.getItem('filemanager_files');
      if (storedFiles) {
        try {
          const files = JSON.parse(storedFiles);
          console.log('Dateien aus localStorage geladen:', files);
          get().setFiles(files);
          // Wenn wir Daten aus localStorage haben, beenden wir hier
          return;
        } catch (e) {
          console.error('Fehler beim Parsen der gespeicherten Dateien:', e);
        }
      }
    }
    
    // Nur wenn keine lokalen Daten vorhanden sind, laden wir vom Server
    try {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Fehler beim Laden der Dateien');
      
      const data = await response.json();
      console.log('Geladene Dateien vom Server:', data);
      
      // Stelle sicher, dass wir ein Array haben
      const files = Array.isArray(data) ? data : [];
      
      // Setze die Dateien im Store
      get().setFiles(files);
      
      // In localStorage speichern
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(files));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
      get().setFiles([]);
    }
  },
  
  deleteFile: async (id) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Datei');
      }

      const state = get();
      set({ files: state.files.filter(file => file.id !== id) });
    } catch (error) {
      console.error('Fehler beim Löschen der Datei:', error);
      throw error;
    }
  },
  
  renameFile: async (id, newName) => {
    try {
      const response = await fetch(`/api/files/${id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Umbenennen der Datei');
      }

      const updatedFile = await response.json();
      const state = get();
      set({
        files: state.files.map(file =>
          file.id === id ? { ...file, name: newName } : file
        ),
      });
    } catch (error) {
      console.error('Fehler beim Umbenennen der Datei:', error);
      throw error;
    }
  },
  
  replaceFile: async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/files/${id}/replace`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Fehler beim Ersetzen der Datei');
      }

      await get().loadFiles();
    } catch (error) {
      console.error('Fehler beim Ersetzen der Datei:', error);
      throw error;
    }
  },

  navigateToFolder: (folderId) => {
    const { currentPath } = get();
    
    // Wenn wir zum Root-Ordner navigieren, setzen wir den Pfad zurück
    if (folderId === 'root') {
      set({ currentPath: ['root'] });
      return;
    }
    
    // Wenn der Ordner bereits im Pfad ist, navigieren wir zu diesem Punkt
    const existingIndex = currentPath.indexOf(folderId);
    if (existingIndex >= 0) {
      set({ currentPath: currentPath.slice(0, existingIndex + 1) });
      return;
    }
    
    // Sonst fügen wir den Ordner zum Pfad hinzu
    set({ currentPath: [...currentPath, folderId] });
  },

  navigateBack: () => {
    const { currentPath } = get();
    if (currentPath.length > 1) {
      set({ currentPath: currentPath.slice(0, -1) });
    }
  },

  navigateToRoot: () => {
    set({ currentPath: ['root'] });
  },

  navigateToPathIndex: (index) => {
    const { currentPath } = get();
    if (index >= 0 && index < currentPath.length) {
      set({ currentPath: currentPath.slice(0, index + 1) });
    }
  },

  getCurrentFolderId: () => {
    const state = get();
    return state.currentPath[state.currentPath.length - 1];
  },

  getCurrentItems: () => {
    const { files, currentPath } = get();
    const currentFolder = currentPath[currentPath.length - 1];
    return files.filter(item => item.parentId === currentFolder);
  },

  getBreadcrumbPath: () => {
    const { files, currentPath } = get();
    return currentPath.map((id) => ({
      id,
      name: id === 'root' ? 'Meine Dateien' : 
        files.find(f => f.id === id)?.name || id
    }));
  },

  initializePath: () => {
    try {
      const savedPath = localStorage.getItem('currentPath');
      if (savedPath) {
        const path = JSON.parse(savedPath);
        if (Array.isArray(path)) {
          set({ currentPath: path });
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des gespeicherten Pfads:', error);
      set({ currentPath: ['root'] });
    }
  },

  getCurrentFolder: () => {
    const { currentPath } = get();
    return currentPath[currentPath.length - 1];
  },

  createFolder: async (name: string) => {
    const { files, currentPath } = get();
    const currentFolder = currentPath[currentPath.length - 1];

    try {
      const response = await fetch('/api/files/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          parentId: currentFolder
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen des Ordners');
      }

      const newFolder = await response.json();
      
      // Duplikate vermeiden
      const updatedFiles = [...files];
      const existingIndex = updatedFiles.findIndex(f => f.id === newFolder.id);
      if (existingIndex >= 0) {
        updatedFiles[existingIndex] = newFolder;
      } else {
        updatedFiles.push(newFolder);
      }
      
      set({ files: updatedFiles });
      
      // Speichere in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error);
      throw error;
    }
  },

  deleteItem: async (id) => {
    const { files } = get();
    try {
      // API-Aufruf zum Löschen des Elements
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Elements');
      }

      // Aktualisiere die Dateien im State (entferne das gelöschte Element)
      const updatedFiles = files.filter(file => file.id !== id);
      set({ files: updatedFiles });
      
      // Speichere in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      throw error;
    }
  },

  renameItem: async (id, newName) => {
    const { files } = get();
    try {
      // API-Aufruf zum Umbenennen des Elements
      const response = await fetch(`/api/files/${id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Umbenennen');
      }

      const updatedFile = await response.json();
      
      // Aktualisiere die Dateien im State
      const updatedFiles = files.map(file => 
        file.id === id ? { ...file, name: newName } : file
      );
      set({ files: updatedFiles });
      
      // Speichere in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
      }
    } catch (error) {
      console.error('Fehler beim Umbenennen:', error);
      throw error;
    }
  },

  uploadFile: async (file: File) => {
    const { files, currentPath } = get();
    const currentFolder = currentPath[currentPath.length - 1];

    try {
      // Erstelle FormData für den Upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', currentFolder);

      // Sende die Datei an den Server
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Hochladen der Datei');
      }

      // Lade die neue Datei
      const uploadedFile = await response.json();
      
      // Füge die Datei zum Store hinzu
      const updatedFiles = [...files];
      const existingIndex = updatedFiles.findIndex(f => f.id === uploadedFile.id);
      if (existingIndex >= 0) {
        updatedFiles[existingIndex] = uploadedFile;
      } else {
        updatedFiles.push(uploadedFile);
      }
      
      set({ files: updatedFiles });
      
      // Speichere in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
      }
      
      return uploadedFile;
    } catch (error) {
      console.error('Fehler beim Hochladen der Datei:', error);
      throw error;
    }
  },

  logState: () => {
    const state = get();
    console.log('FileStore State:', {
      files: state.files,
      currentPath: state.currentPath,
      currentFolder: state.getCurrentFolder(),
      currentItems: state.getCurrentItems(),
      breadcrumbPath: state.getBreadcrumbPath()
    });
  }
})); 