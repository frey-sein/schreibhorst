import { FileItem } from '@/types/files';

/**
 * Prüft, ob es sich bei einer Datei um ein Bild handelt.
 * @param file Die zu prüfende Datei.
 * @returns true, wenn es sich um ein Bild handelt, sonst false.
 */
export const isImageFile = (file: FileItem): boolean => {
  if (!file) return false;
  
  // Prüfe den MIME-Typ
  if (file.mimeType && file.mimeType.startsWith('image/')) {
    return true;
  }
  
  // Prüfe die Dateiendung
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.gif') ||
    fileName.endsWith('.webp') ||
    fileName.endsWith('.svg') ||
    fileName.endsWith('.bmp')
  );
};

/**
 * Prüft, ob es sich bei einer Datei um ein Dokument handelt (PDF, Word, Excel, etc.).
 * @param file Die zu prüfende Datei.
 * @returns true, wenn es sich um ein Dokument handelt, sonst false.
 */
export const isDocumentFile = (file: FileItem): boolean => {
  if (!file) return false;
  
  // Prüfe den MIME-Typ
  if (file.mimeType) {
    if (file.mimeType.includes('pdf') ||
        file.mimeType.includes('msword') ||
        file.mimeType.includes('officedocument') ||
        file.mimeType.includes('text/')) {
      return true;
    }
  }
  
  // Prüfe die Dateiendung
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith('.pdf') ||
    fileName.endsWith('.doc') ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.ppt') ||
    fileName.endsWith('.pptx') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.rtf')
  );
};

/**
 * Formatiert eine Dateigröße in Bytes zu einer menschenlesbaren Darstellung.
 * @param bytes Die Dateigröße in Bytes.
 * @returns Eine formatierte Zeichenkette der Dateigröße.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}; 