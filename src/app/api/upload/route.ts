import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parentId = formData.get('parentId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Erstelle einen sicheren Dateinamen
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Speichere die Datei im uploads-Ordner
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await writeFile(path.join(uploadsDir, filename), buffer);

    // Bestimme den übergeordneten Ordner basierend auf der parentId
    let finalParentId = parentId || 'root';

    return NextResponse.json({
      id: `file-${filename}`,
      name: filename,
      type: 'file',
      parentId: finalParentId,
      url: `/uploads/${filename}`,
      mimeType: file.type,
      size: file.size,
      lastModified: new Date()
    });
  } catch (error) {
    console.error('Fehler beim Hochladen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei' },
      { status: 500 }
    );
  }
} 