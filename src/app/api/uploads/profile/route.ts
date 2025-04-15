import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Hilfs-Funktion, um sicherzustellen, dass der Upload-Ordner existiert
async function ensureUploadDirExists(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('Fehler beim Erstellen des Upload-Verzeichnisses:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Stelle sicher, dass der Benutzer authentifiziert ist
    const userIdCookie = request.cookies.get('user-id')?.value;
    if (!userIdCookie) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Verarbeite die Anfrage als FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei übermittelt' },
        { status: 400 }
      );
    }

    // Überprüfe den Dateityp (nur Bilder erlaubt)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Nur Bilddateien sind erlaubt' },
        { status: 400 }
      );
    }

    // Begrenze die Dateigröße (z.B. auf 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Die Dateigröße darf 5MB nicht überschreiten' },
        { status: 400 }
      );
    }

    // Generiere einen eindeutigen Dateinamen
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${uuidv4()}.${fileExtension}`;
    
    // Definiere Pfad für das Profilbild (relativer und absoluter Pfad)
    const relativePath = `/uploads/profile/${fileName}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads/profile');
    const filePath = path.join(uploadDir, fileName);

    // Stelle sicher, dass das Upload-Verzeichnis existiert
    await ensureUploadDirExists(uploadDir);

    // Konvertiere das File-Objekt in einen ArrayBuffer und dann in einen Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Speichere die Datei
    await writeFile(filePath, buffer);

    // Gib die URL zum gespeicherten Bild zurück
    return NextResponse.json({
      success: true,
      url: relativePath
    });

  } catch (error: any) {
    console.error('Fehler beim Hochladen des Profilbilds:', error);
    return NextResponse.json(
      { error: `Fehler beim Hochladen des Profilbilds: ${error.message}` },
      { status: 500 }
    );
  }
} 