import { create } from 'zustand';
import { FileItem } from '@/types/files';

interface FileStore {
  files: FileItem[];
  currentPath: string[];
  setFiles: (files: FileItem[]) => void;
  deleteFile: (id: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  replaceFile: (id: string, file: File) => Promise<void>;
  navigateToFolder: (folderId: string) => void;
  navigateBack: () => void;
  getCurrentFolderId: () => string;
  getCurrentItems: () => FileItem[];
  getBreadcrumbPath: () => Array<{ id: string; name: string; }>;
  initializePath: () => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  currentPath: ['root'],
  
  setFiles: (files) => set({ files }),
  
  deleteFile: async (id) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Fehler beim Löschen der Datei');
      
      set((state) => ({
        files: state.files.filter((file) => file.id !== id),
      }));
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      throw error;
    }
  },
  
  renameFile: async (id, newName) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });
      
      if (!response.ok) throw new Error('Fehler beim Umbenennen der Datei');
      
      set((state) => ({
        files: state.files.map((file) =>
          file.id === id ? { ...file, name: newName } : file
        ),
      }));
    } catch (error) {
      console.error('Fehler beim Umbenennen:', error);
      throw error;
    }
  },
  
  replaceFile: async (id, file) => {
    try {
      console.log('Starte Dateiaustausch:', { id, fileName: file.name });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/files/${id}/replace`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server-Fehler:', errorData);
        throw new Error(errorData.error || 'Fehler beim Ersetzen der Datei');
      }
      
      const updatedFile = await response.json();
      console.log('Datei erfolgreich ersetzt:', updatedFile);
      
      set((state) => ({
        files: state.files.map((f) =>
          f.id === id ? { ...f, ...updatedFile } : f
        ),
      }));
    } catch (error) {
      console.error('Fehler beim Ersetzen:', error);
      throw error;
    }
  },

  navigateToFolder: (folderId) => {
    const state = get();
    // Wenn wir zum Root-Ordner navigieren
    if (folderId === 'root') {
      set({ currentPath: ['root'] });
      localStorage.setItem('currentPath', JSON.stringify(['root']));
      return;
    }

    // Finde den Ordner und baue den Pfad auf
    const folder = state.files.find(f => f.id === folderId);
    if (!folder) return;

    const path = ['root'];
    let currentFolder = folder;

    // Baue den Pfad von unten nach oben auf
    while (currentFolder && currentFolder.parentId) {
      path.push(currentFolder.id);
      currentFolder = state.files.find(f => f.id === currentFolder.parentId) as FileItem;
    }

    // Setze den neuen Pfad
    set({ currentPath: path });
    localStorage.setItem('currentPath', JSON.stringify(path));
  },

  navigateBack: () => {
    set((state) => {
      const newPath = state.currentPath.slice(0, -1);
      localStorage.setItem('currentPath', JSON.stringify(newPath));
      return { currentPath: newPath };
    });
  },

  getCurrentFolderId: () => {
    const state = get();
    return state.currentPath[state.currentPath.length - 1];
  },

  getCurrentItems: () => {
    const state = get();
    const currentFolderId = state.getCurrentFolderId();
    return state.files.filter(file => file.parentId === currentFolderId);
  },

  getBreadcrumbPath: () => {
    const state = get();
    return state.currentPath.map(id => {
      if (id === 'root') return { id, name: 'Meine Dateien' };
      const folder = state.files.find(f => f.id === id);
      return folder ? { id, name: folder.name } : { id, name: id };
    });
  },

  initializePath: () => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedPath = localStorage.getItem('currentPath');
      if (savedPath) {
        const path = JSON.parse(savedPath);
        set({ currentPath: path });
      }
    } catch (error) {
      console.error('Fehler beim Laden des gespeicherten Pfads:', error);
      localStorage.removeItem('currentPath');
    }
  },
})); 