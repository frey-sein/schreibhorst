import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { addHistoryEntry } from '../history/route';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import fs from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    console.log('Ersetze Datei mit ID:', fileId);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('Keine Datei im Request gefunden');
      return NextResponse.json(
        { error: 'Keine Datei gefunden' },
        { status: 400 }
      );
    }

    console.log('Datei erhalten:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const currentUser = await getCurrentUser();
    console.log('Benutzer geladen:', currentUser);
    
    if (!currentUser) {
      console.error('Kein Benutzer gefunden');
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Finde die ursprüngliche Datei
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const files = fs.readdirSync(uploadsDir);
    console.log('Vorhandene Dateien:', files);
    
    // Extrahiere den Dateinamen aus der ID
    const idParts = fileId.split('-');
    const originalFileName = idParts.slice(2).join('-');
    console.log('Gesuchter Dateiname:', originalFileName);

    if (!files.includes(originalFileName)) {
      console.error('Ursprüngliche Datei nicht gefunden:', originalFileName);
      return NextResponse.json(
        { error: 'Ursprüngliche Datei nicht gefunden' },
        { status: 404 }
      );
    }

    // Behalte den ursprünglichen Dateinamen bei
    const filePath = join(uploadsDir, originalFileName);
    console.log('Ziel-Dateipfad:', filePath);

    // Speichere die neue Datei mit dem ursprünglichen Namen
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log('Datei erfolgreich geschrieben');

    // Füge einen Eintrag zur Historie hinzu
    const historyEntry = addHistoryEntry({
      fileId,
      fileName: originalFileName,
      replacedBy: `${currentUser.name} (${currentUser.email})`,
      timestamp: new Date().toISOString(),
      size: file.size,
      mimeType: file.type
    });
    console.log('Historie-Eintrag erstellt:', historyEntry);

    return NextResponse.json({ 
      success: true,
      message: `Datei ${originalFileName} wurde erfolgreich ersetzt`
    });
  } catch (error) {
    console.error('Fehler beim Ersetzen der Datei:', error);
    return NextResponse.json(
      { error: 'Fehler beim Ersetzen der Datei' },
      { status: 500 }
    );
  }
} 