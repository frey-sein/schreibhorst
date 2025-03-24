import { FileItem } from '@/types/files';

export class StorageService {
  private static instance: StorageService;
  private files: FileItem[] = [];

  private constructor() {
    this.refreshFiles();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private refreshFiles() {
    try {
      const storedFiles = localStorage.getItem('files');
      if (storedFiles) {
        const parsedFiles = JSON.parse(storedFiles);
        this.files = parsedFiles.map((file: any) => ({
          ...file,
          parentId: file.parentId || null,
          createdAt: file.createdAt || new Date().toISOString(),
          updatedAt: file.updatedAt || new Date().toISOString(),
          path: file.path || `/uploads/${file.name}`
        }));
      } else {
        this.files = [];
      }
    } catch (error) {
      console.error('Fehler beim Laden der Dateien:', error);
      this.files = [];
    }
  }

  public getItems(): FileItem[] {
    this.refreshFiles();
    return this.files;
  }

  public getItemsByParentId(parentId: string | null): FileItem[] {
    this.refreshFiles();
    return this.files.filter(item => item.parentId === parentId);
  }

  public addItem(item: FileItem): void {
    this.refreshFiles();
    const newItem: FileItem = {
      ...item,
      parentId: item.parentId || null,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      path: item.path || `/uploads/${item.name}`
    };
    this.files.push(newItem);
    this.saveFiles();
  }

  public updateItem(updatedItem: FileItem): void {
    this.refreshFiles();
    const index = this.files.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      const newItem: FileItem = {
        ...updatedItem,
        parentId: updatedItem.parentId || null,
        updatedAt: new Date().toISOString()
      };
      this.files[index] = newItem;
      this.saveFiles();
    }
  }

  public deleteItem(id: string): void {
    this.refreshFiles();
    this.files = this.files.filter(item => item.id !== id);
    this.saveFiles();
  }

  private saveFiles(): void {
    try {
      localStorage.setItem('files', JSON.stringify(this.files));
    } catch (error) {
      console.error('Fehler beim Speichern der Dateien:', error);
    }
  }
} 