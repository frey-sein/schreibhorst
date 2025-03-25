'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FileSystemNode {
  type: 'file' | 'folder';
  name: string;
  children?: { [key: string]: FileSystemNode };
}

interface FileManagerContextType {
  fileSystem: FileSystemNode;
  updateFileSystem: (newFileSystem: FileSystemNode) => void;
}

const FileManagerContext = createContext<FileManagerContextType | undefined>(undefined);

export function useFileManager() {
  const context = useContext(FileManagerContext);
  if (!context) {
    throw new Error('useFileManager muss innerhalb eines FileManagerProvider verwendet werden');
  }
  return context;
}

interface FileManagerProviderProps {
  children: ReactNode;
}

export function FileManagerProvider({ children }: FileManagerProviderProps) {
  const [fileSystem, setFileSystem] = useState<FileSystemNode>({
    type: 'folder',
    name: 'root',
    children: {}
  });

  useEffect(() => {
    // Lade die Ordnerstruktur beim Start
    const storedFileSystem = localStorage.getItem('fileSystem');
    if (storedFileSystem) {
      try {
        const parsedFileSystem = JSON.parse(storedFileSystem);
        setFileSystem(parsedFileSystem);
      } catch (error) {
        console.error('Fehler beim Laden der Ordnerstruktur:', error);
      }
    }
  }, []);

  const updateFileSystem = (newFileSystem: FileSystemNode) => {
    setFileSystem(newFileSystem);
    localStorage.setItem('fileSystem', JSON.stringify(newFileSystem));
  };

  return (
    <FileManagerContext.Provider value={{ fileSystem, updateFileSystem }}>
      {children}
    </FileManagerContext.Provider>
  );
} 