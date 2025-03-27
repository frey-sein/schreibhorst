import { NextRequest, NextResponse } from 'next/server';
import { getLocalImageFullQuality } from '@/lib/services/imageGeneration';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;
    if (!imageId) {
      console.log('Fehler: Keine Bild-ID übermittelt');
      return NextResponse.json({ error: 'Bild-ID fehlt' }, { status: 400 });
    }

    console.log(`Angeforderte Vollqualitäts-Bild-ID: ${imageId}`);
    
    // Versuche das lokale Bild in voller Qualität abzurufen
    const fullQualityImage = await getLocalImageFullQuality(imageId);
    
    if (!fullQualityImage) {
      console.error(`Bild mit ID ${imageId} nicht im lokalen Speicher gefunden.`);
      return NextResponse.json({ 
        error: `Bild mit ID ${imageId} nicht gefunden. Prüfen Sie, ob das Bild lokal gespeichert wurde.` 
      }, { status: 404 });
    }

    console.log(`Bild mit ID ${imageId} in voller Qualität gefunden. Sende als Download...`);
    
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
      { error: `Interner Serverfehler: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 