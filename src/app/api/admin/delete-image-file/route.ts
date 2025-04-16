import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/images');

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { filePath } = data;
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Kein Dateipfad angegeben' },
        { status: 400 }
      );
    }
    
    // Stelle sicher, dass der Pfad sicher ist und keine übergeordneten Verzeichnisse betrifft
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      return NextResponse.json(
        { error: 'Ungültiger Dateipfad' },
        { status: 400 }
      );
    }
    
    const fullPath = path.join(UPLOAD_DIR, normalizedPath);
    
    // Prüfe, ob die Datei existiert
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, message: 'Datei existiert nicht' }
      );
    }
    
    // Datei löschen
    fs.unlinkSync(fullPath);
    
    return NextResponse.json({
      success: true,
      message: `Datei ${filePath} wurde gelöscht`
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Bilddatei:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Bilddatei', details: String(error) },
      { status: 500 }
    );
  }
} 