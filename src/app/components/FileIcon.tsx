'use client';

interface FileIconProps {
  type: string;
  className?: string;
}

export default function FileIcon({ type, className = 'h-5 w-5 text-gray-400' }: FileIconProps) {
  // Word
  if (type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 384 512" fill="currentColor">
        <path d="M48 448V64c0-8.8 7.2-16 16-16h256c8.8 0 16 7.2 16 16v384c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zm144-336c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96z"/>
      </svg>
    );
  }

  // Excel
  if (type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 384 512" fill="currentColor">
        <path d="M48 448V64c0-8.8 7.2-16 16-16h256c8.8 0 16 7.2 16 16v384c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zm48-240h96v32H96v-32zm0 64h96v32H96v-32zm192 128H96v-32h144v32zm0-64H96v-32h144v32z"/>
      </svg>
    );
  }

  // PowerPoint
  if (type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 384 512" fill="currentColor">
        <path d="M48 448V64c0-8.8 7.2-16 16-16h256c8.8 0 16 7.2 16 16v384c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zm144-208c35.3 0 64-28.7 64-64s-28.7-64-64-64h-80v192h32v-64h48z"/>
      </svg>
    );
  }

  // PDF
  if (type === 'application/pdf') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 384 512" fill="currentColor">
        <path d="M48 448V64c0-8.8 7.2-16 16-16h256c8.8 0 16 7.2 16 16v384c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zm144-336c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96z"/>
      </svg>
    );
  }

  // Bild
  if (type.startsWith('image/')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 384 512" fill="currentColor">
        <path d="M48 448V64c0-8.8 7.2-16 16-16h256c8.8 0 16 7.2 16 16v384c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zm80-144l48-64 48 64 80-96v128H80V304z"/>
      </svg>
    );
  }

  // Standard-Datei
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 384 512" fill="currentColor">
      <path d="M48 448V64c0-8.8 7.2-16 16-16h256c8.8 0 16 7.2 16 16v384c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zm144-336c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96z"/>
    </svg>
  );
} 