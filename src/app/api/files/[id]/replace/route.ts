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

    // Benutzer laden und Berechtigungen prüfen
    const currentUser = await getCurrentUser();
    console.log('Benutzer geladen:', currentUser);
    
    // Prüfen, ob der Benutzer angemeldet ist
    if (!currentUser) {
      console.error('Kein Benutzer gefunden');
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Verbesserte Admin-Prüfung: Stelle sicher, dass das role-Feld existiert und 'admin' ist
    if (!currentUser.role || currentUser.role !== 'admin') {
      console.error('Benutzer ist kein Admin:', currentUser);
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Ersetzen der Datei' },
        { status: 403 }
      );
    }

    // Finde die ursprüngliche Datei
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    
    try {
      // Stelle sicher, dass das Upload-Verzeichnis existiert
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Upload-Verzeichnis erstellt:', uploadsDir);
      }
    } catch (dirError) {
      console.error('Fehler beim Prüfen/Erstellen des Upload-Verzeichnisses:', dirError);
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log('Vorhandene Dateien:', files);
    
    // Extrahiere den Dateinamen aus der ID
    const idParts = fileId.split('-');
    let originalFileName = '';
    
    // Wenn die ID ein Zeitstempel-Format hat (z.B. '1234567890-dateiname.txt')
    if (idParts.length >= 2 && /^\d+$/.test(idParts[0])) {
      originalFileName = idParts.slice(1).join('-');
    } else {
      // Andernfalls könnte es ein anderes Format sein
      originalFileName = fileId;
    }
    
    console.log('Gesuchter Dateiname:', originalFileName);

    // Prüfe, ob die Datei existiert
    const fileExists = files.includes(originalFileName) || files.some(f => f.includes(originalFileName));
    
    if (!fileExists) {
      console.error('Ursprüngliche Datei nicht gefunden:', originalFileName);
      
      // Erstelle einen neuen Zeitstempel für die Datei
      const timestamp = Date.now();
      const newFileName = `${timestamp}-${file.name}`;
      const filePath = join(uploadsDir, newFileName);
      
      // Speichere die neue Datei
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      console.log('Neue Datei erstellt, da Original nicht gefunden wurde:', newFileName);
      
      // Füge einen Eintrag zur Historie hinzu
      const historyEntry = addHistoryEntry({
        fileId,
        fileName: newFileName,
        replacedBy: `${currentUser.name} (${currentUser.email || 'keine E-Mail'})`,
        timestamp: new Date().toISOString(),
        size: file.size,
        mimeType: file.type
      });
      
      return NextResponse.json({ 
        success: true,
        message: `Neue Datei ${newFileName} wurde erstellt, da Original nicht gefunden wurde`
      });
    }

    // Behalte den ursprünglichen Dateinamen bei, falls gefunden
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
      replacedBy: `${currentUser.name} (${currentUser.email || 'keine E-Mail'})`,
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