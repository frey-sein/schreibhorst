import { v4 as uuidv4 } from 'uuid';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: Date;
  parentId: string | null;
  fileSize?: number;
  fileType?: string;
  content?: string; // Base64-kodierter Dateiinhalt
  isShared?: boolean; // Gibt an, ob die Datei geteilt ist
  shareId?: string; // Eindeutige ID für den Austausch
  shareExpiry?: Date; // Ablaufdatum des Austauschs
  sharePassword?: string; // Optional: Passwortschutz für den Austausch
}

export interface FileVersion {
  id: string;
  fileId: string;
  name: string;
  fileSize: number;
  fileType: string;
  content: string;
  lastModified: Date;
}

const STORAGE_KEY = 'filemanager_items';

export class StorageService {
  private static instance: StorageService;
  private items: FileItem[] = [];
  private versions: FileVersion[] = [];
  private readonly VERSIONS_KEY = 'fileVersions';

  private constructor() {
    this.loadItems();
    this.loadVersions();
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
          lastModified: item.lastModified ? new Date(item.lastModified) : new Date(),
          content: item.content || undefined,
          fileType: item.fileType || undefined
        }));

        // Debug-Ausgabe
        console.log('Geladene Dateien:', this.items.map(item => ({
          name: item.name,
          type: item.type,
          fileType: item.fileType,
          hasContent: !!item.content
        })));
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

  private loadVersions() {
    try {
      const versionsJson = localStorage.getItem(this.VERSIONS_KEY);
      if (versionsJson) {
        const parsedVersions = JSON.parse(versionsJson);
        this.versions = parsedVersions.map((version: any) => ({
          ...version,
          lastModified: new Date(version.lastModified)
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Versionshistorie:', error);
    }
  }

  private saveVersions() {
    try {
      localStorage.setItem(this.VERSIONS_KEY, JSON.stringify(this.versions));
    } catch (error) {
      console.error('Fehler beim Speichern der Versionshistorie:', error);
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

  public async shareFile(fileId: string, options: {
    expiry?: Date;
    password?: string;
  } = {}): Promise<{ shareId: string; shareUrl: string }> {
    const file = this.getItemById(fileId);
    if (!file || file.type !== 'file') {
      throw new Error('Datei nicht gefunden');
    }

    // Generiere eine eindeutige Share-ID
    const shareId = Math.random().toString(36).substring(2, 15);
    
    // Aktualisiere die Datei mit den Share-Informationen
    const updatedFile: FileItem = {
      ...file,
      isShared: true,
      shareId,
      shareExpiry: options.expiry,
      sharePassword: options.password
    };

    this.updateItem(updatedFile);

    // Erstelle die Share-URL
    const shareUrl = `${window.location.origin}/share/${shareId}`;

    return { shareId, shareUrl };
  }

  public async unshareFile(fileId: string): Promise<void> {
    const file = this.getItemById(fileId);
    if (!file) {
      throw new Error('Datei nicht gefunden');
    }

    const updatedFile: FileItem = {
      ...file,
      isShared: false,
      shareId: undefined,
      shareExpiry: undefined,
      sharePassword: undefined
    };

    this.updateItem(updatedFile);
  }

  public async getSharedFile(shareId: string, password?: string): Promise<FileItem | null> {
    const file = this.items.find(item => item.shareId === shareId);
    
    if (!file) {
      return null;
    }

    // Prüfe Ablaufdatum
    if (file.shareExpiry && new Date(file.shareExpiry) < new Date()) {
      return null;
    }

    // Prüfe Passwort, falls vorhanden
    if (file.sharePassword && file.sharePassword !== password) {
      return null;
    }

    return file;
  }

  public async downloadSharedFile(shareId: string, password?: string): Promise<Blob | null> {
    const file = await this.getSharedFile(shareId, password);
    
    if (!file || !file.content) {
      return null;
    }

    // Konvertiere Base64 zurück in Blob
    const byteCharacters = atob(file.content);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: file.fileType });
  }

  public async replaceFile(fileId: string, newFile: File): Promise<void> {
    const existingFile = this.getItemById(fileId);
    if (!existingFile || existingFile.type !== 'file') {
      throw new Error('Datei nicht gefunden');
    }

    // Überprüfe, ob die Dateitypen übereinstimmen
    if (existingFile.fileType !== newFile.type) {
      throw new Error('Die neue Datei muss den gleichen Dateityp haben wie die zu ersetzende Datei');
    }

    try {
      // Konvertiere die neue Datei zu Base64
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target?.result as string;
          // Entferne den "data:..." Präfix
          resolve(base64String.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(newFile);
      });

      // Aktualisiere die Datei
      const updatedFile: FileItem = {
        ...existingFile,
        name: newFile.name,
        fileSize: newFile.size,
        fileType: newFile.type,
        content: base64Content,
        lastModified: new Date()
      };

      this.updateItem(updatedFile);
    } catch (error) {
      console.error('Fehler beim Ersetzen der Datei:', error);
      throw new Error('Fehler beim Ersetzen der Datei');
    }
  }

  public getFileVersions(fileId: string): FileVersion[] {
    return this.versions
      .filter(version => version.fileId === fileId)
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  public async restoreVersion(versionId: string): Promise<void> {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error('Version nicht gefunden');
    }

    const file = this.getItemById(version.fileId);
    if (!file) {
      throw new Error('Datei nicht gefunden');
    }

    // Aktualisiere die Datei mit den Daten der Version
    const updatedFile: FileItem = {
      ...file,
      name: version.name,
      fileSize: version.fileSize,
      fileType: version.fileType,
      content: version.content,
      lastModified: new Date()
    };

    this.updateItem(updatedFile);
  }
} 