interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  url?: string;
  mimeType?: string;
}

export class StorageService {
  private static instance: StorageService;
  private items: FileItem[] = [];

  private constructor() {
    this.loadItems();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private loadItems(): void {
    const storedItems = localStorage.getItem('files');
    this.items = storedItems ? JSON.parse(storedItems) : [];
  }

  getItems(): FileItem[] {
    return this.items;
  }

  addItem(item: FileItem): void {
    this.items.push(item);
    localStorage.setItem('files', JSON.stringify(this.items));
  }

  deleteItem(itemId: string): void {
    this.items = this.items.filter(item => item.id !== itemId);
    localStorage.setItem('files', JSON.stringify(this.items));
  }

  updateItem(item: FileItem): void {
    const index = this.items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.items[index] = item;
      localStorage.setItem('files', JSON.stringify(this.items));
    }
  }
} 