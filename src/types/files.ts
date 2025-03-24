export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  fileType?: string;
  size?: number;
  lastModified?: Date;
  url?: string;
  content?: string;
} 