import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = params.id;

    console.log('Ersetze Datei:', {
      fileId,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Extrahiere den relativen Pfad aus der fileId
    const relativePath = fileId.replace('file-', '');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, relativePath);

    console.log('Pfade:', {
      relativePath,
      uploadsDir,
      filePath,
      exists: fs.existsSync(filePath)
    });

    // Überprüfe, ob die Datei existiert
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Datei nicht gefunden' },
        { status: 404 }
      );
    }

    // Erstelle den Buffer aus der neuen Datei
    const buffer = Buffer.from(await file.arrayBuffer());

    // Stelle sicher, dass der Zielordner existiert
    const targetDir = path.dirname(filePath);
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    // Schreibe die neue Datei
    await writeFile(filePath, buffer);
    console.log('Datei erfolgreich geschrieben:', filePath);

    // Erstelle die Antwort mit dem ursprünglichen Dateinamen
    const stats = fs.statSync(filePath);
    const originalName = path.basename(relativePath); // Behalte den ursprünglichen Namen

    return NextResponse.json({
      id: fileId,
      name: originalName, // Verwende den ursprünglichen Namen
      type: 'file',
      url: `/uploads/${relativePath}`,
      mimeType: file.type,
      size: stats.size,
      lastModified: stats.mtime
    });
  } catch (error) {
    console.error('Fehler beim Ersetzen der Datei:', error);
    return NextResponse.json(
      { error: 'Fehler beim Ersetzen der Datei' },
      { status: 500 }
    );
  }
} 