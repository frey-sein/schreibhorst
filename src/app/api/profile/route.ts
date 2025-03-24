import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const image = formData.get('image') as File | null;

    let imageUrl = null;

    if (image) {
      // Erstelle den Ordner für Uploads, falls er nicht existiert
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      try {
        await writeFile(join(uploadDir, 'test.txt'), '');
      } catch {
        // Ordner existiert nicht, also erstellen wir ihn
        const fs = require('fs');
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generiere einen eindeutigen Dateinamen
      const uniqueFilename = `${Date.now()}-${image.name}`;
      const buffer = Buffer.from(await image.arrayBuffer());
      const filepath = join(uploadDir, uniqueFilename);

      // Speichere die Datei
      await writeFile(filepath, buffer);
      imageUrl = `/uploads/${uniqueFilename}`;
    }

    // Hier würden normalerweise die Daten in einer Datenbank gespeichert
    // Für dieses Beispiel geben wir sie einfach zurück
    return NextResponse.json({
      success: true,
      data: {
        name,
        email,
        imageUrl
      }
    });
  } catch (error) {
    console.error('Fehler beim Speichern des Profils:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Speichern des Profils' },
      { status: 500 }
    );
  }
} 