interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  url?: string;
  mimeType?: string;
  lastModified?: Date;
  size?: number;
}

export class StorageService {
  private static instance: StorageService;
  private items: FileItem[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadItems();
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private loadItems(): void {
    if (typeof window !== 'undefined') {
      // Definiere die Standard-Ordnerstruktur
      this.items = [
        {
          id: 'root',
          name: 'Meine Dateien',
          type: 'folder',
          parentId: null
        },
        {
          id: 'dsgvo',
          name: 'DSGVO',
          type: 'folder',
          parentId: 'root'
        },
        {
          id: 'logo',
          name: 'Logo',
          type: 'folder',
          parentId: 'root'
        }
      ];

      // Lade die tatsächlichen Dateien
      this.refreshFiles();
    }
  }

  public async refreshFiles(): Promise<void> {
    try {
      const response = await fetch('/api/files');
      const files = await response.json();
      
      // Behalte die Ordnerstruktur bei
      const folders = this.items.filter(item => item.type === 'folder');
      
      // Füge alle Dateien hinzu
      const fileItems = files.filter((file: FileItem) => file.type === 'file');
      
      // Aktualisiere die items mit Ordnern und Dateien
      this.items = [...folders, ...fileItems];
      
      // Debug-Ausgabe
      console.log('Aktualisierte Dateien:', {
        folders,
        fileItems,
        allItems: this.items
      });
      
      this.saveItems();
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
      // Versuche die Daten aus dem localStorage zu laden
      const savedItems = localStorage.getItem('folderStructure');
      if (savedItems) {
        this.items = JSON.parse(savedItems);
      }
    }
  }

  private saveItems(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('folderStructure', JSON.stringify(this.items));
      } catch (error) {
        console.error('Fehler beim Speichern der Ordnerstruktur:', error);
      }
    }
  }

  public getItems(): FileItem[] {
    return this.items;
  }

  public getItemsByParentId(parentId: string | null): FileItem[] {
    return this.items.filter(item => item.parentId === parentId);
  }

  public getItemById(itemId: string): FileItem | undefined {
    return this.items.find(item => item.id === itemId);
  }

  public async addItem(item: FileItem): Promise<void> {
    // Überprüfe, ob die ID bereits existiert
    const existingItem = this.items.find(existing => existing.id === item.id);
    if (!existingItem) {
      this.items.push(item);
      this.saveItems();
    } else {
      // Wenn die ID existiert, aktualisiere das Item
      const index = this.items.findIndex(existing => existing.id === item.id);
      this.items[index] = item;
      this.saveItems();
    }
    // Aktualisiere die Dateiliste nach dem Hinzufügen
    await this.refreshFiles();
  }

  public updateItem(updatedItem: FileItem): void {
    const index = this.items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      this.items[index] = updatedItem;
      this.saveItems();
    }
  }

  public deleteItem(itemId: string): void {
    // Lösche auch alle Unterordner und Dateien
    const itemsToDelete = this.items.filter(item => 
      item.id === itemId || 
      item.parentId === itemId ||
      (item.parentId && this.items.find(parent => parent.id === item.parentId)?.parentId === itemId)
    );
    
    this.items = this.items.filter(item => !itemsToDelete.some(toDelete => toDelete.id === item.id));
    this.saveItems();
  }
} 