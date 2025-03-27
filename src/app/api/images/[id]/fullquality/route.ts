import { NextRequest, NextResponse } from 'next/server';
import { getLocalImageFullQuality } from '@/lib/services/imageGeneration';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;
    if (!imageId) {
      return NextResponse.json({ error: 'Bild-ID fehlt' }, { status: 400 });
    }

    // Versuche das lokale Bild in voller Qualität abzurufen
    const fullQualityImage = await getLocalImageFullQuality(imageId);
    
    if (!fullQualityImage) {
      return NextResponse.json({ error: 'Bild nicht gefunden' }, { status: 404 });
    }

    // Setze die korrekten Header für den Bilddownload
    return new NextResponse(fullQualityImage, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="image_${imageId}_2048x2048.png"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Fehler beim Abrufen des Bildes in voller Qualität:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 