import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addFile } from '../data';

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
    
    // Simuliere das Speichern der Datei
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
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei' },
      { status: 500 }
    );
  }
} 