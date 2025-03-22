export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: Date;
  parentId: string | null;
  fileSize?: number;
  fileType?: string;
}

const STORAGE_KEY = 'filemanager_items';

export class StorageService {
  private static instance: StorageService;
  private items: FileItem[] = [];

  private constructor() {
    this.loadItems();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private loadItems() {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        this.items = JSON.parse(storedItems).map((item: any) => ({
          ...item,
          lastModified: item.lastModified ? new Date(item.lastModified) : new Date()
        }));
      } else {
        // Initialisiere mit Root-Ordner
        this.items = [{
          id: 'root',
          name: 'Meine Dateien',
          type: 'folder',
          parentId: null,
          lastModified: new Date()
        }];
        this.saveItems();
      }
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
      this.items = [{
        id: 'root',
        name: 'Meine Dateien',
        type: 'folder',
        parentId: null,
        lastModified: new Date()
      }];
    }
  }

  private saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (error) {
      console.error('Fehler beim Speichern der Dateien:', error);
    }
  }

  public getItems(): FileItem[] {
    return this.items;
  }

  public addItem(item: FileItem): void {
    const newItem = {
      ...item,
      lastModified: new Date()
    };
    this.items.push(newItem);
    this.saveItems();
  }

  public updateItem(item: FileItem): void {
    const index = this.items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.items[index] = item;
      this.saveItems();
    }
  }

  public deleteItem(itemId: string): void {
    // Lösche auch alle Unterelemente
    const deleteRecursive = (id: string) => {
      const children = this.items.filter(item => item.parentId === id);
      children.forEach(child => deleteRecursive(child.id));
      this.items = this.items.filter(item => item.id !== id);
    };
    
    deleteRecursive(itemId);
    this.saveItems();
  }

  public getItemsByParentId(parentId: string | null): FileItem[] {
    return this.items.filter(item => item.parentId === parentId);
  }

  public getItemById(id: string): FileItem | undefined {
    return this.items.find(item => item.id === id);
  }
} 