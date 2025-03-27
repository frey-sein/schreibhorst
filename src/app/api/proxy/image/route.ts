import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL fehlt' },
        { status: 400 }
      );
    }
    
    // Bild von der externen URL herunterladen
    const imageResponse = await fetch(url);
    
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Fehler beim Herunterladen des Bildes: ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }
    
    // Bild in ein Buffer konvertieren
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Buffer als Base64 konvertieren
    const base64Image = buffer.toString('base64');
    
    // Bestimme den Inhaltstyp
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    
    // Gib das Bild als Base64-String zurück
    return NextResponse.json({
      success: true,
      imageData: `data:${contentType};base64,${base64Image}`
    });
    
  } catch (error) {
    console.error('Fehler beim Proxy-Abruf des Bildes:', error);
    return NextResponse.json(
      { error: 'Fehler beim Herunterladen des Bildes' },
      { status: 500 }
    );
  }
} 