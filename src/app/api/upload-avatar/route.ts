import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    const category = formData.get('category') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    if (!category || !['male', 'female'].includes(category)) {
      return NextResponse.json(
        { error: 'Ungültige oder fehlende Kategorie' },
        { status: 400 }
      );
    }

    // Überprüfe den Dateityp
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Nur Bilddateien sind erlaubt' },
        { status: 400 }
      );
    }

    // Generiere einen eindeutigen Dateinamen mit Kategorie-Präfix
    const uniqueId = uuidv4();
    const extension = file.name.split('.').pop();
    const fileName = `${category}-${uniqueId}.${extension}`;
    
    // Speichere die Datei im public/images/avatars Verzeichnis
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), 'public', 'images', 'avatars');
    const filePath = join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);

    // Gibt den Pfad zum Avatar zurück
    return NextResponse.json({
      success: true,
      avatarPath: `/images/avatars/${fileName}`
    });

  } catch (error) {
    console.error('Fehler beim Hochladen des Avatars:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Avatars' },
      { status: 500 }
    );
  }
} 