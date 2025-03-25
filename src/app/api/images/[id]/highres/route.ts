import { NextRequest, NextResponse } from 'next/server';
import { getHighResolutionImage } from '@/lib/services/imageGeneration';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;
    if (!imageId) {
      return NextResponse.json({ error: 'Bild-ID fehlt' }, { status: 400 });
    }

    const highResImage = await getHighResolutionImage(imageId);
    
    if (!highResImage) {
      return NextResponse.json({ error: 'Bild nicht gefunden' }, { status: 404 });
    }

    // Setze die korrekten Header für den Bilddownload
    return new NextResponse(highResImage, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="image_${imageId}_2048x2048.png"`,
      },
    });

  } catch (error) {
    console.error('Fehler beim Abrufen des hochaufgelösten Bildes:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 