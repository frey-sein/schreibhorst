import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  url?: string;
  mimeType?: string;
  lastModified?: Date;
}

// Funktion zum Entfernen des Zeitstempel-Präfixes
function removeTimestampPrefix(fileName: string): string {
  // Entfernt Zeitstempel im Format: 1742829254899-
  return fileName.replace(/^\d+-/, '');
}

function readDirRecursively(dir: string, baseDir: string): FileItem[] {
  const items: FileItem[] = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(baseDir, fullPath);
    const stats = fs.statSync(fullPath);

    // Überspringe den system-Ordner
    if (relativePath.startsWith('system')) {
      return;
    }

    if (stats.isDirectory()) {
      // Rekursiv in Unterordner gehen
      items.push(...readDirRecursively(fullPath, baseDir));
    } else {
      // Profilbilder ausschließen
      if (/^\d+-\w+\.(jpg|jpeg|png|gif)$/.test(file)) {
        return;
      }

      // Bestimme den übergeordneten Ordner basierend auf dem Pfad
      let parentId = 'root';
      const pathParts = relativePath.split(path.sep);
      
      // Wenn die Datei in einem Unterordner liegt
      if (pathParts.length > 1) {
        const topFolder = pathParts[0].toLowerCase();
        if (topFolder === 'dsgvo') {
          parentId = 'dsgvo';
        } else if (topFolder === 'logo') {
          parentId = 'logo';
        }
      } else {
        // Für Dateien im Hauptverzeichnis
        const fileLower = file.toLowerCase();
        if (fileLower.includes('dsgvo')) {
          parentId = 'dsgvo';
        } else if (fileLower.includes('logo') || fileLower.includes('nuetzlich')) {
          parentId = 'logo';
        }
      }

      items.push({
        id: `file-${relativePath.replace(/\\/g, '/')}`,
        name: removeTimestampPrefix(file), // Hier entfernen wir den Zeitstempel
        type: 'file',
        parentId,
        url: `/uploads/${relativePath.replace(/\\/g, '/')}`,
        mimeType: getMimeType(file),
        lastModified: stats.mtime
      });
    }
  });

  return items;
}

export async function GET() {
  try {
    // Definiere die Ordnerstruktur
    const folders: FileItem[] = [
      {
        id: 'root',
        name: 'Meine Dateien',
        type: 'folder',
        parentId: null
      },
      {
        id: 'dsgvo',
        name: 'DSGVO',
        type: 'folder',
        parentId: 'root'
      },
      {
        id: 'logo',
        name: 'Logo',
        type: 'folder',
        parentId: 'root'
      }
    ];

    // Lade die Dateien aus dem uploads-Ordner
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Erstelle den Ordner, falls er nicht existiert
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Lese alle Dateien rekursiv
    const fileItems = readDirRecursively(uploadsDir, uploadsDir);

    // Debug-Ausgabe
    console.log('Verarbeitete Dateien:', fileItems);

    // Kombiniere Ordner und Dateien
    const allItems = [...folders, ...fileItems];

    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Fehler beim Lesen der Dateien:', error);
    return NextResponse.json({ error: 'Fehler beim Lesen der Dateien' }, { status: 500 });
  }
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.eps': 'application/postscript',
    '.svg': 'image/svg+xml'
  };
  return mimeTypes[ext] || 'application/octet-stream';
} 