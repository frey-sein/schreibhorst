export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  url?: string;
  mimeType?: string;
  lastModified?: Date;
} 