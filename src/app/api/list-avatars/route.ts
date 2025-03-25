import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Pfad zum Avatar-Verzeichnis
    const avatarDir = path.join(process.cwd(), 'public', 'images', 'avatars');
    
    // Lese alle Dateien im Verzeichnis
    const files = await fs.readdir(avatarDir);
    
    // Filtere nach Bilddateien und erstelle Avatar-Objekte
    const avatars = files
      .filter(file => /\.(jpg|jpeg|png|gif|svg)$/i.test(file))
      .map(file => {
        const id = path.parse(file).name;
        const imagePath = `/images/avatars/${file}`;
        
        // Bestimme die Kategorie basierend auf dem Dateinamen
        const category = id.toLowerCase().includes('female') ? 'female' : 'male';
        
        return {
          id,
          imagePath,
          alt: `Avatar ${id}`,
          category
        };
      });

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('Fehler beim Laden der Avatare:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Avatare' },
      { status: 500 }
    );
  }
} 