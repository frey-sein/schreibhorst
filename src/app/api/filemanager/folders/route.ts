import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface FileSystemNode {
  type: 'file' | 'folder';
  name: string;
  children?: { [key: string]: FileSystemNode };
}

export async function GET() {
  try {
    // Hole die Ordnerstruktur aus dem localStorage (via Cookies)
    const fileSystemCookie = cookies().get('fileSystem');
    if (!fileSystemCookie?.value) {
      return NextResponse.json([]);
    }

    const structure: FileSystemNode = JSON.parse(fileSystemCookie.value);
    const folders: string[] = [];

    // Konvertiere die Baumstruktur in eine flache Liste von Pfaden
    function traverseStructure(node: FileSystemNode, parentPath = '') {
      if (node.type === 'folder') {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        folders.push(currentPath);

        if (node.children) {
          for (const child of Object.values(node.children)) {
            traverseStructure(child, currentPath);
          }
        }
      }
    }

    traverseStructure(structure);
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Fehler beim Laden der Ordner:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Ordner' },
      { status: 500 }
    );
  }
} 