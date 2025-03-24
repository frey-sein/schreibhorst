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
  
  replaceFile: async (fileId: string, newFile: File) => {
    const { files } = get();
    
    // Finde die zu ersetzende Datei
    const fileToReplace = files.find(f => f.id === fileId);
    if (!fileToReplace) {
      throw new Error('Datei zum Ersetzen nicht gefunden');
    }

    // Extrahiere Dateiname und -typ
    const originalName = fileToReplace.name;
    const originalExtension = originalName.split('.').pop()?.toLowerCase() || '';
    const newFileName = newFile.name;
    const newExtension = newFileName.split('.').pop()?.toLowerCase() || '';

    // Prüfe, ob die Dateierweiterung übereinstimmt
    if (newExtension !== originalExtension) {
      throw new Error(`Dateityp muss ${originalExtension} sein. Hochgeladene Datei ist ${newExtension}`);
    }

    try {
      // Erstelle FormData für den Upload
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('fileId', fileId);
      formData.append('originalName', originalName); // Behalte den originalen Dateinamen

      // Sende die Datei an den Server
      const response = await fetch('/api/files/replace', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Ersetzen der Datei');
      }

      // Lade die aktualisierte Datei
      const updatedFile = await response.json();
      
      // Aktualisiere im Store
      const updatedFiles = files.map(file => 
        file.id === fileId ? { ...file, ...updatedFile, name: originalName } : file
      );
      
      set({ files: updatedFiles });
      
      // Speichere in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
      }
      
      return updatedFile;
    } catch (error) {
      console.error('Fehler beim Ersetzen der Datei:', error);
      throw error;
    }
  },

  navigateToFolder: (folderId) => {
    const { files, currentPath } = get();
    
    // Wenn wir zum Root-Ordner navigieren, setzen wir den Pfad zurück
    if (folderId === 'root') {
      set({ currentPath: ['root'] });
    } else {
      // Der Ordner muss real existieren
      const targetFolder = files.find(file => file.id === folderId && file.type === 'folder');
      if (!targetFolder) {
        console.error('Ordner nicht gefunden:', folderId);
        return;
      }
      
      // Baue den korrekten Pfad zum Ziel-Ordner auf
      const newPath = ['root'];
      
      // Funktion, um den Pfad zum Ordner rekursiv zu finden
      const findPathToFolder = (folder: string): boolean => {
        if (folder === 'root') return true;
        
        const folderItem = files.find(file => file.id === folder);
        if (!folderItem) return false;
        
        const parentId = folderItem.parentId;
        if (!parentId) return false;
        
        // Rekursiver Aufruf für den Elternordner
        if (findPathToFolder(parentId)) {
          // Wenn wir den Pfad zum Elternordner gefunden haben, fügen wir den aktuellen Ordner hinzu
          if (parentId !== 'root') { // Vermeidet Duplizierung von 'root'
            newPath.push(parentId);
          }
          return true;
        }
        
        return false;
      };
      
      // Finde den Pfad zum Ziel-Ordner
      if (findPathToFolder(folderId)) {
        // Füge den Ziel-Ordner selbst hinzu
        newPath.push(folderId);
        set({ currentPath: newPath });
      } else {
        console.error('Konnte keinen Pfad zum Ordner finden:', folderId);
      }
    }
    
    // Aktuellen Pfad im localStorage speichern
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentPath', JSON.stringify(get().currentPath));
    }
  },

  navigateBack: () => {
    const { currentPath } = get();
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      set({ currentPath: newPath });
      
      // Aktuellen Pfad im localStorage speichern
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentPath', JSON.stringify(newPath));
      }
    }
  },

  navigateToRoot: () => {
    const rootPath = ['root'];
    set({ currentPath: rootPath });
    
    // Aktuellen Pfad im localStorage speichern
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentPath', JSON.stringify(rootPath));
    }
  },

  navigateToPathIndex: (index) => {
    const { currentPath } = get();
    if (index >= 0 && index < currentPath.length) {
      const newPath = currentPath.slice(0, index + 1);
      set({ currentPath: newPath });
      
      // Aktuellen Pfad im localStorage speichern
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentPath', JSON.stringify(newPath));
      }
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
      console.log('Löschvorgang für Element mit ID:', id);
      
      // Prüfe, ob es sich um einen Ordner handelt mit Unterordnern oder Dateien
      if (!id.startsWith('file-')) {
        const children = files.filter(file => file.parentId === id);
        if (children.length > 0) {
          console.log('Ordner enthält Unterelemente:', children.length);
          // Lösche alle Unterelemente rekursiv
          for (const child of children) {
            try {
              await get().deleteItem(child.id);
            } catch (childError) {
              console.error('Fehler beim Löschen eines Unterelements:', childError);
              // Wir setzen den Löschvorgang fort, auch wenn ein Unterelement nicht gelöscht werden konnte
            }
          }
        }
      }
      
      // API-Aufruf zum Löschen des Elements
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      let success = false;
      let responseData;
      
      try {
        responseData = await response.json();
      } catch (jsonError) {
        console.error('Fehler beim Parsen der API-Antwort:', jsonError);
        responseData = { success: false, error: 'Fehler beim Parsen der Antwort' };
      }
      
      if (!response.ok && !responseData.localCleanupNeeded) {
        console.error('API-Fehler beim Löschen:', responseData);
        throw new Error(responseData.error || responseData.message || 'Fehler beim Löschen des Elements');
      }

      // Wenn der Server eine lokale Bereinigung anfordert oder erfolgreich gelöscht hat,
      // entfernen wir das Element aus dem lokalen Speicher
      if (responseData.success || responseData.localCleanupNeeded) {
        console.log('Element wurde vom Server gelöscht oder lokale Bereinigung angefordert');
        success = true;
      } else {
        console.error('Element konnte nicht gelöscht werden:', responseData);
        throw new Error(responseData.error || responseData.message || 'Fehler beim Löschen des Elements');
      }
      
      if (success) {
        // Aktualisiere die Dateien im State (entferne das gelöschte Element)
        const updatedFiles = files.filter(file => file.id !== id);
        set({ files: updatedFiles });
        
        // Speichere in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
        }
        
        console.log('Element erfolgreich aus dem lokalen Store entfernt');
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      
      // Bei kritischen Fehlern versuchen wir trotzdem, das Element lokal zu entfernen
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Element nicht auf dem Server gefunden, entferne es aus dem lokalen Speicher');
        const updatedFiles = files.filter(file => file.id !== id);
        set({ files: updatedFiles });
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
        }
      }
      
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