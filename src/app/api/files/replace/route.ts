import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { promises as fs } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { StorageService } from '@/lib/services/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    const originalName = formData.get('originalName') as string;

    if (!file || !fileId || !originalName) {
      return NextResponse.json({ error: 'Datei, ID oder Name fehlt' }, { status: 400 });
    }

    // Der Originalname soll beibehalten werden
    const fileExtension = originalName.split('.').pop() || '';
    const uploadedFileExtension = file.name.split('.').pop() || '';

    // Prüfe, ob die Dateiendungen übereinstimmen
    if (fileExtension.toLowerCase() !== uploadedFileExtension.toLowerCase()) {
      return NextResponse.json(
        { error: `Dateityp muss ${fileExtension} sein. Hochgeladene Datei ist ${uploadedFileExtension}` }, 
        { status: 400 }
      );
    }

    // Zeitstempel zur Vermeidung von Cache-Problemen und für Versionierung
    const timestamp = Date.now();
    const fileName = `${timestamp}-${originalName}`;
    
    // Stellen Sie sicher, dass der Uploads-Ordner existiert
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadDir);
    } catch (error) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Datei in den public/uploads Ordner schreiben
    const filePath = join(uploadDir, fileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    // URL für die hochgeladene Datei
    const fileUrl = `/uploads/${fileName}`;

    // Holen Sie die Datenbankinstanz
    const storageService = StorageService.getInstance();
    
    // Suche nach der zu ersetzenden Datei
    const existingFile = storageService.getItemById(fileId);
    if (!existingFile) {
      return NextResponse.json({ error: 'Datei zum Ersetzen nicht gefunden' }, { status: 404 });
    }

    // Aktualisiere die Datei mit der neuen URL und Metadaten, behalte aber den Namen bei
    const updatedFile = {
      ...existingFile,
      url: fileUrl,
      size: file.size,
      mimeType: file.type,
      updatedAt: new Date().toISOString()
    };

    // Speichere die aktualisierte Datei
    storageService.updateItem(updatedFile);

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('Error replacing file:', error);
    return NextResponse.json(
      { error: 'Error replacing file', details: (error as Error).message },
      { status: 500 }
    );
  }
} 