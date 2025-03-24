export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  path: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
  isPublic?: boolean;
  isShared?: boolean;
  sharedWith?: string[];
  sharedBy?: string;
  isFavorite?: boolean;
  isTrashed?: boolean;
  isVersion?: boolean;
  originalFileId?: string;
  replacedBy?: string;
  timestamp?: string;
  url?: string;
  lastModified?: Date;
  content?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  fileName: string;
  replacedBy: string;
  timestamp: string;
  size: number;
  mimeType: string;
} 