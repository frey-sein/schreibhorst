import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    // CORS-Header hinzufügen
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONS-Anfragen für CORS
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { headers });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const image = formData.get('image') as File | null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name ist erforderlich' },
        { status: 400, headers }
      );
    }

    let imageUrl = null;

    if (image) {
      // Erstelle den Ordner für Uploads, falls er nicht existiert
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
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
    }, { headers });

  } catch (error) {
    console.error('Fehler beim Speichern des Profils:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Fehler beim Speichern des Profils'
      },
      { status: 500 }
    );
  }
} 