import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addFile } from '../data';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parentId = formData.get('parentId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei gefunden' },
        { status: 400 }
      );
    }

    // Erzeuge eine eindeutige ID für die Datei
    const fileId = uuidv4();
    
    // Erstelle Zeitstempel für den Dateinamen (wie im public/uploads-Verzeichnis)
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    
    // Verwende nur einen direkten Pfad ohne UUID-Segment, da wir bereits
    // Zeitstempel verwenden, um eindeutige Namen zu generieren
    const fileUrl = `/uploads/${fileName}`;
    
    console.log('Neue Datei wird hochgeladen mit URL:', fileUrl);
    
    // Speichere die Datei physisch
    try {
      // Erstelle die Ordnerstruktur, falls sie noch nicht existiert
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      
      // Konvertiere die Datei in einen Buffer und speichere sie
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(uploadsDir, fileName);
      
      // Schreibe die Datei auf die Festplatte
      await fs.promises.writeFile(filePath, fileBuffer);
      
      console.log('Datei erfolgreich gespeichert unter:', filePath);
      
      // Setze die richtigen Berechtigungen für die Datei
      await fs.promises.chmod(filePath, 0o644);
      
      // Datei erfolgreich gespeichert, jetzt Metadaten hinzufügen
      const newFile = addFile({
        name: file.name,
        type: 'file',
        parentId: parentId,
        path: fileUrl,
        url: fileUrl,
        mimeType: file.type || 'application/octet-stream',
        size: file.size
      });

      return NextResponse.json(newFile);
      
    } catch (fsError) {
      console.error('Fehler beim physischen Speichern der Datei:', fsError);
      return NextResponse.json(
        { error: 'Fehler beim physischen Speichern der Datei' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei' },
      { status: 500 }
    );
  }
} 