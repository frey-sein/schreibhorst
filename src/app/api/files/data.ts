import { v4 as uuidv4 } from 'uuid';
import { FileItem } from '@/types/files';

// Einfacher Speicher für unsere Beispieldaten
let files: FileItem[] = [
  {
    id: 'root',
    name: 'Meine Dateien',
    type: 'folder',
    parentId: null,
    path: '/',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Funktionen für den Dateizugriff
export function getAllFiles(): FileItem[] {
  return [...files];
}

export function addFile(file: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): FileItem {
  const newFile: FileItem = {
    ...file,
    id: file.id || uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  files.push(newFile);
  return newFile;
}

export function updateFile(id: string, updates: Partial<FileItem>): FileItem | null {
  const index = files.findIndex(f => f.id === id);
  if (index === -1) return null;
  
  const updatedFile = {
    ...files[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  files[index] = updatedFile;
  return updatedFile;
}

export function deleteFile(id: string): boolean {
  console.log('Lösche Datenspeicher-Element mit ID:', id);
  
  // Lösche rekursiv alle untergeordneten Elemente
  const findChildren = (parentId: string) => {
    return files.filter(file => file.parentId === parentId);
  };
  
  const deleteRecursively = (itemId: string) => {
    // Finde zuerst alle untergeordneten Elemente
    const children = findChildren(itemId);
    console.log(`Gefundene Unterelemente für ${itemId}:`, children.length);
    
    // Lösche rekursiv jedes untergeordnete Element
    for (const child of children) {
      deleteRecursively(child.id);
    }
    
    // Dann lösche das Element selbst
    const initialLength = files.length;
    files = files.filter(f => f.id !== itemId);
    console.log(`Element ${itemId} gelöscht:`, initialLength > files.length);
  };
  
  // Prüfe, ob das Element existiert
  const elementExists = files.some(f => f.id === id);
  if (!elementExists) {
    console.log('Element nicht gefunden:', id);
    return false;
  }
  
  // Führe das rekursive Löschen durch
  deleteRecursively(id);
  
  // Prüfe, ob das Löschen erfolgreich war
  const success = !files.some(f => f.id === id);
  console.log('Löschvorgang abgeschlossen, Erfolg:', success);
  
  return success;
}

// Funktion zum Speichern der Daten in localStorage im Client
export function saveToLocalStorage() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('filemanager_files', JSON.stringify(files));
  }
}

// Funktion zum Laden der Daten aus localStorage im Client
export function loadFromLocalStorage() {
  if (typeof window !== 'undefined') {
    const storedFiles = window.localStorage.getItem('filemanager_files');
    if (storedFiles) {
      try {
        files = JSON.parse(storedFiles);
      } catch (error) {
        console.error('Fehler beim Parsen der gespeicherten Dateien:', error);
      }
    }
  }
}

// Initialisierung, falls keine Daten vorhanden sind
export function ensureRootFolder() {
  if (!files.some(f => f.id === 'root')) {
    files.push({
      id: 'root',
      name: 'Meine Dateien',
      type: 'folder',
      parentId: null,
      path: '/',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
} 