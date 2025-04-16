import { NextRequest, NextResponse } from 'next/server';
import { saveImage, getAllImages, deleteImage } from '@/lib/services/imageStorage';

// GET /api/images - Alle Bilder abrufen
export async function GET(request: NextRequest) {
  try {
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Bilder abrufen, gefiltert nach Benutzer
    const images = await getAllImages(userId);
    
    return NextResponse.json(images);
  } catch (error) {
    console.error('Fehler beim Abrufen der Bilder:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Bilder' }, 
      { status: 500 }
    );
  }
}

// POST /api/images - Bild speichern
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { imageData, title, prompt, modelId, width, height, meta } = data;
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Keine Bilddaten erhalten' },
        { status: 400 }
      );
    }
    
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Bild speichern mit Benutzer-ID
    const savedImage = await saveImage(imageData, {
      title: title || 'Unbenanntes Bild',
      prompt,
      modelId: modelId || 'unbekannt',
      width: width || 512,
      height: height || 512,
      meta,
      userId
    });
    
    return NextResponse.json(savedImage);
  } catch (error) {
    console.error('Fehler beim Speichern des Bildes:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern des Bildes' },
      { status: 500 }
    );
  }
}

// DELETE /api/images?id=xyz - Bild löschen
export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    const { id } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Keine Bild-ID erhalten' },
        { status: 400 }
      );
    }
    
    // Löschen des Bildes
    const success = await deleteImage(id);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Fehler beim Löschen des Bildes:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Bildes' },
      { status: 500 }
    );
  }
} 