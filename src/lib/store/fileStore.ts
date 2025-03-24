import { create } from 'zustand';
import type { FileItem } from '@/types/files';

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
  createFolder: (name: string, id?: string, parentId?: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  renameItem: (id: string, newName: string) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  addFilesToFileSystem: (files: FileItem[]) => Promise<void>;
  logState: () => void;
  validatePath: (path: string[]) => boolean;
  ensureUrlProperties: (file: any) => any;
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
    try {
      // Versuche zuerst lokale Daten zu laden
      let localFiles = [];
      let loadedFromCache = false;
      
      if (typeof window !== 'undefined') {
        const storedFiles = localStorage.getItem('filemanager_files');
        if (storedFiles) {
          try {
            const parsedFiles = JSON.parse(storedFiles);
            if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
              console.log('Lokale Dateien gefunden:', parsedFiles.length);
              // Stelle sicher, dass alle Dateien URL-Eigenschaften haben
              localFiles = parsedFiles.map(file => get().ensureUrlProperties(file));
              loadedFromCache = true;
              
              // Setze sofort die Dateien aus dem Cache, damit die UI schnell reagiert
              set({ files: localFiles });
            }
          } catch (e) {
            console.error('Fehler beim Parsen der lokalen Dateien:', e);
          }
        }
      }
      
      // Datenbankabfrage immer durchführen, auch wenn lokale Daten vorhanden sind
      console.log('Lade Dateien vom Server...');
      const response = await fetch('/api/files');
      
      if (!response.ok) {
        console.error('Server-Antwort fehlgeschlagen:', response.status);
        throw new Error('Fehler beim Laden der Dateien vom Server');
      }
      
      const serverData = await response.json();
      console.log('Dateien vom Server geladen:', serverData.length);
      
      // Stelle sicher, dass alle Server-Dateien URL-Eigenschaften haben
      const processedServerData = serverData.map((file: any) => get().ensureUrlProperties(file));
      
      if (processedServerData.length === 0 && loadedFromCache) {
        console.warn('Server lieferte keine Dateien, verwende Cache-Daten');
        // Behalte die lokalen Daten bei
        return localFiles;
      }
      
      // Synchronisiere IDs mit dem StorageService
      try {
        const storageService = await import('@/lib/services/storage').then(mod => mod.StorageService.getInstance());
        console.log('StorageService geladen');
        
        // Nur für Debug-Zwecke: Vergleiche die IDs
        const storageItems = storageService.getItems();
        console.log('StorageService enthält', storageItems.length, 'Elemente');
        
        // Finde Dateien, die in serverData aber nicht im StorageService sind
        const missingInStorage = processedServerData.filter((file: any) => 
          !storageItems.some(item => item.id === file.id)
        );
        
        if (missingInStorage.length > 0) {
          console.log('Fehlende Dateien im StorageService:', missingInStorage.length);
          
          // Füge fehlende Dateien zum StorageService hinzu
          missingInStorage.forEach((file: any) => {
            const storageItem = {
              id: file.id,
              name: file.name,
              type: 'file' as 'file' | 'folder',
              parentId: file.parentId || file.folderId || 'root', // Unterstütze beide Varianten
              lastModified: new Date(file.updatedAt || file.createdAt),
              fileSize: file.size,
              fileType: file.mimeType,
              url: file.url || file.path // Immer sicherstellen, dass eine URL-Eigenschaft vorhanden ist
            };
            storageService.addItem(storageItem);
          });
          
          console.log('Fehlende Dateien zum StorageService hinzugefügt');
        }
        
        // Auch umgekehrt: Finde Dateien, die im StorageService aber nicht in processedServerData sind
        const missingInServer = storageItems.filter(item => 
          item.id !== 'root' && !processedServerData.some((file: any) => file.id === item.id)
        );
        
        if (missingInServer.length > 0) {
          console.log('Im Server fehlende Dateien aus StorageService:', missingInServer.length);
          
          // Füge diese Dateien zu processedServerData hinzu (für die Anzeige)
          const additionalFiles = missingInServer.map(item => {
            // Stelle sicher, dass jede Datei eine URL hat
            const url = item.url || '';
            return {
              id: item.id,
              name: item.name,
              type: item.type,
              parentId: item.parentId,
              size: item.fileSize,
              mimeType: item.fileType,
              updatedAt: item.lastModified,
              createdAt: item.lastModified,
              url: url,
              path: url
            };
          });
          
          processedServerData.push(...additionalFiles);
          console.log('Dateien aus StorageService zu serverData hinzugefügt');
        }
      } catch (error) {
        console.error('Fehler bei der Synchronisation mit StorageService:', error);
      }
      
      // Aktualisiere Files im Store
      set({ files: processedServerData });
      
      // Speichere in localStorage für schnelleren Zugriff beim nächsten Mal
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(processedServerData));
      }
      
      return processedServerData;
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
      
      // Wenn der Server nicht erreichbar ist, versuche lokale Daten zu verwenden
      if (typeof window !== 'undefined') {
        const storedFiles = localStorage.getItem('filemanager_files');
        if (storedFiles) {
          try {
            const parsedFiles = JSON.parse(storedFiles);
            if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
              console.log('Verwende lokale Dateien als Fallback:', parsedFiles.length);
              // Stelle sicher, dass alle Dateien URL-Eigenschaften haben
              const processedFiles = parsedFiles.map(file => get().ensureUrlProperties(file));
              set({ files: processedFiles });
              return processedFiles;
            }
          } catch (e) {
            console.error('Fehler beim Parsen der lokalen Dateien:', e);
          }
        }
      }
      
      return [];
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
    
    console.log('replaceFile aufgerufen mit ID:', fileId);
    console.log('Dateiliste enthält', files.length, 'Dateien');
    
    // Finde die zu ersetzende Datei
    const fileToReplace = files.find(f => f.id === fileId);
    
    if (!fileToReplace) {
      console.error('Datei nicht gefunden mit ID:', fileId);
      console.error('Vorhandene Dateien:', files.map(f => ({ id: f.id, name: f.name })));
      throw new Error('Datei zum Ersetzen nicht gefunden');
    }

    console.log('Zu ersetzende Datei gefunden:', fileToReplace.name, 'mit URL:', fileToReplace.url);

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

      console.log('Sende Anfrage zum Ersetzen der Datei:', { fileId, originalName });

      // Sende die Datei an den Server
      const response = await fetch('/api/files/replace', {
        method: 'POST',
        body: formData,
      });

      console.log('Server-Antwort Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server-Fehler:', errorData);
        throw new Error(errorData.error || 'Fehler beim Ersetzen der Datei');
      }

      // Lade die aktualisierte Datei
      const updatedFile = await response.json();
      console.log('Ersetzte Datei vom Server erhalten:', updatedFile);
      
      // Stelle sicher, dass die wichtigen Eigenschaften vorhanden sind
      const parentId = updatedFile.parentId || fileToReplace.parentId;
      const url = updatedFile.url || updatedFile.path || fileToReplace.url || fileToReplace.path;
      
      console.log('Verwendete parentId:', parentId, 'Original:', fileToReplace.parentId);
      console.log('Verwendete URL:', url, 'Original:', fileToReplace.url || fileToReplace.path);
      
      // Aktualisiere im Store
      const updatedFiles = files.map(file => 
        file.id === fileId ? { 
          ...file, 
          ...updatedFile,
          name: originalName,
          parentId: parentId, // Stelle sicher, dass parentId erhalten bleibt
          url: url, // Stelle sicher, dass URL erhalten bleibt
          path: url // Stelle sicher, dass path aktualisiert wird
        } : file
      );
      
      const updatedFileInStore = updatedFiles.find(f => f.id === fileId);
      console.log('Aktualisierte Datei im Store:', updatedFileInStore);
      
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
        
        if (Array.isArray(path) && path.length > 0) {
          console.log('Gespeicherter Pfad gefunden:', path);
          
          // Prüfe, ob der Pfad gültig ist
          const isValid = get().validatePath(path);
          
          if (isValid) {
            console.log('Pfad ist gültig, setze ihn');
            set({ currentPath: path });
          } else {
            console.warn('Gespeicherter Pfad ist ungültig, setze auf Wurzelordner');
            set({ currentPath: ['root'] });
          }
          
          return;
        }
      }
      
      // Standardmäßig: setze auf Wurzelordner
      console.log('Kein gültiger gespeicherter Pfad gefunden, setze auf Wurzelordner');
      set({ currentPath: ['root'] });
    } catch (error) {
      console.error('Fehler beim Laden des gespeicherten Pfads:', error);
      set({ currentPath: ['root'] });
    }
  },
  
  // Prüft, ob ein Pfad gültig ist (alle Ordner existieren)
  validatePath: (path: string[]): boolean => {
    if (!path || path.length === 0) return false;
    
    // Wurzelordner ist immer gültig
    if (path.length === 1 && path[0] === 'root') return true;
    
    const { files } = get();
    
    // Prüfe, ob alle Ordner im Pfad existieren
    for (let i = 1; i < path.length; i++) {
      const folderId = path[i];
      
      // Prüfe, ob der Ordner existiert
      const folderExists = files.some(file => 
        file.id === folderId && file.type === 'folder'
      );
      
      if (!folderExists) {
        console.warn(`Ordner mit ID ${folderId} existiert nicht im Pfad`);
        return false;
      }
      
      // Prüfe, ob der Ordner im korrekten Elternordner ist
      if (i > 1) {
        const parentId = path[i-1];
        const hasCorrectParent = files.some(file => 
          file.id === folderId && 
          (file.parentId === parentId || file.parentId === path[i-2])
        );
        
        if (!hasCorrectParent) {
          console.warn(`Ordner mit ID ${folderId} ist nicht im erwarteten Elternordner ${parentId}`);
          return false;
        }
      }
    }
    
    return true;
  },

  getCurrentFolder: () => {
    const { currentPath } = get();
    return currentPath[currentPath.length - 1];
  },

  createFolder: async (name: string, id?: string, parentId?: string) => {
    try {
      // Generiere eine eindeutige ID, wenn keine angegeben wurde
      const folderId = id || `folder-${Date.now()}`;
      
      // Bestimme die Parent-ID
      const currentFolderId = parentId || get().getCurrentFolderId();
      
      // Erstelle ein Ordner-Objekt
      const newFolder: FileItem = {
        id: folderId,
        name,
        type: 'folder',
        parentId: currentFolderId,
        path: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Füge den Ordner zu den Dateien hinzu
      set(state => {
        const updatedFiles = [...state.files, newFolder];
        
        // Speichere die Dateien im localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('filemanager_files', JSON.stringify(updatedFiles));
        }
        
        return { files: updatedFiles };
      });
      
      // Sende die Anfrage an den Server
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, parentId: currentFolderId })
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Erstellen des Ordners');
      }
      
      console.log(`Ordner "${name}" wurde erfolgreich erstellt`);
      
      // Neues Laden der Dateien vom Server wurde entfernt, da wir die Dateien bereits lokal aktualisiert haben
      
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
  },

  // Stellt sicher, dass Datei-Objekte die erforderlichen URL-Eigenschaften haben
  ensureUrlProperties: (file: any) => {
    if (!file) return file;
    
    // Erstelle eine Kopie des Objekts
    const updatedFile = { ...file };
    
    // Stelle sicher, dass es eine URL-Eigenschaft gibt
    if (!updatedFile.url && updatedFile.path) {
      updatedFile.url = updatedFile.path;
    }
    
    // Stelle sicher, dass es eine Path-Eigenschaft gibt
    if (!updatedFile.path && updatedFile.url) {
      updatedFile.path = updatedFile.url;
    }
    
    // Wenn weder URL noch Pfad vorhanden sind und es sich um eine Datei handelt
    if (!updatedFile.url && !updatedFile.path && updatedFile.type === 'file' && updatedFile.name) {
      // Generiere eine pseudo-URL basierend auf der ID
      const pseudoUrl = `/api/files/${updatedFile.id || Math.random().toString(36).substring(2, 15)}`;
      updatedFile.url = pseudoUrl;
      updatedFile.path = pseudoUrl;
      
      console.log(`Warnung: Datei "${updatedFile.name}" hat keine URL. Eine temporäre URL wurde generiert.`);
    }
    
    return updatedFile;
  },

  // Methode zum Hinzufügen mehrerer Dateien zum Dateisystem
  addFilesToFileSystem: async (files: FileItem[]) => {
    try {
      // Aktuelle Dateien abrufen
      const currentFiles = get().files;
      
      // Stelle sicher, dass alle Dateien URL-Eigenschaften haben
      const ensureUrlProperties = get().ensureUrlProperties;
      const updatedFiles = files.map(file => ensureUrlProperties(file));
      
      // Neue Dateien hinzufügen
      const allFiles = [...currentFiles, ...updatedFiles];
      
      // Dateien setzen
      set({ files: allFiles });
      
      // Dateien im localStorage speichern
      if (typeof window !== 'undefined') {
        localStorage.setItem('filemanager_files', JSON.stringify(allFiles));
      }
      
      // Versuche, die Dateien auch auf dem Server zu speichern
      try {
        // Hier könnten wir eine Server-API aufrufen, um die Dateien zu speichern
        console.log('Dateien wurden erfolgreich zum Dateisystem hinzugefügt');
      } catch (error) {
        console.error('Fehler beim Speichern der Dateien auf dem Server:', error);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Dateien zum Dateisystem:', error);
      return Promise.reject(error);
    }
  },
})); 