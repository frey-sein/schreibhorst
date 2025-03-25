interface FileSystemNode {
  type: 'file' | 'folder';
  name: string;
  children?: { [key: string]: FileSystemNode };
}

export async function getFolderStructure(): Promise<{ [key: string]: any }> {
  // Hole die Ordnerstruktur aus dem localStorage
  const fileSystem = localStorage.getItem('fileSystem');
  if (!fileSystem) {
    return {};
  }

  const structure = JSON.parse(fileSystem);
  
  // Extrahiere nur die Ordner aus der Struktur
  function extractFolders(node: FileSystemNode): { [key: string]: any } {
    if (node.type === 'file') {
      return {};
    }

    const result: { [key: string]: any } = {};
    
    if (node.children) {
      for (const [name, child] of Object.entries(node.children)) {
        if (child.type === 'folder') {
          result[name] = extractFolders(child);
        }
      }
    }
    
    return result;
  }

  return extractFolders(structure);
} 