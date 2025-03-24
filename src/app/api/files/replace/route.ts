import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { promises as fs } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { StorageService } from '@/lib/services/storage';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    const originalName = formData.get('originalName') as string;

    console.log('Datei ersetzen angefordert:', { fileId, originalName });

    if (!file || !fileId || !originalName) {
      return NextResponse.json({ error: 'Datei, ID oder Name fehlt' }, { status: 400 });
    }

    // Holen Sie die Datenbankinstanz
    const storageService = StorageService.getInstance();
    
    // Suche nach der zu ersetzenden Datei
    let existingFile = storageService.getItemById(fileId);
    
    console.log('Existierende Datei in StorageService gefunden:', existingFile ? 'Ja' : 'Nein');
    
    // Wenn Datei nicht im StorageService gefunden wurde, versuche sie aus der Datenbank zu holen
    if (!existingFile) {
      console.log('Suche Datei in der Datenbank...');
      try {
        // Suche in der Datenbank
        const dbFile = await prisma.file.findUnique({
          where: { id: fileId }
        });
        
        console.log('Datei in Datenbank gefunden:', dbFile ? 'Ja' : 'Nein');
        
        if (dbFile) {
          // Erstelle ein temporäres StorageItem aus dem DB-Eintrag
          existingFile = {
            id: dbFile.id,
            name: dbFile.name,
            type: dbFile.type as 'file' | 'folder',
            parentId: dbFile.parentId || 'root',
            lastModified: dbFile.updatedAt || new Date(),
            fileSize: dbFile.size || 0,
            fileType: dbFile.mimeType || 'application/octet-stream'
          };
          
          // Füge die Datei zum StorageService hinzu
          storageService.addItem(existingFile);
          console.log('Datei zum StorageService hinzugefügt');
        } else {
          // Als letzten Versuch erstelle ein neues Item mit der angegebenen ID
          console.log('Erstelle neues StorageItem mit ID:', fileId);
          existingFile = {
            id: fileId,
            name: originalName,
            type: 'file',
            parentId: 'root',
            lastModified: new Date()
          };
          storageService.addItem(existingFile);
        }
      } catch (error) {
        console.error('Fehler beim Zugriff auf die Datenbank:', error);
      }
    }
    
    if (!existingFile) {
      console.error('Datei konnte nirgendwo gefunden werden mit ID:', fileId);
      return NextResponse.json({ error: 'Datei zum Ersetzen nicht gefunden' }, { status: 404 });
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

    // Aktualisiere die Datei mit der neuen URL und Metadaten, behalte aber den Namen bei
    const updatedFile = {
      ...existingFile,
      url: fileUrl,
      path: fileUrl,  // Setze auch path für die Kompatibilität
      size: file.size,
      mimeType: file.type,
      updatedAt: new Date().toISOString()
    };

    // Speichere die aktualisierte Datei
    storageService.updateItem(updatedFile);
    
    console.log('Datei erfolgreich ersetzt:', { id: fileId, name: originalName, url: fileUrl, parentId: existingFile.parentId });

    // Aktualisiere auch den Datenbankeintrag, falls vorhanden
    try {
      await prisma.file.update({
        where: { id: fileId },
        data: {
          path: fileUrl,
          size: file.size,
          mimeType: file.type,
          updatedAt: new Date()
        }
      });
      console.log('Datenbankeintrag aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Datenbankeintrags:', error);
      // Wir werfen keinen Fehler, da der Hauptprozess erfolgreich war
    }

    // Stelle sicher, dass parentId und url in der Antwort enthalten sind
    return NextResponse.json({
      ...updatedFile,
      parentId: existingFile.parentId,
      url: fileUrl,
      path: fileUrl
    });
  } catch (error) {
    console.error('Error replacing file:', error);
    return NextResponse.json(
      { error: 'Error replacing file', details: (error as Error).message },
      { status: 500 }
    );
  }
} 