import { NextRequest, NextResponse } from 'next/server';
import { saveImage, getAllImages, deleteImage } from '@/lib/services/imageStorage';

// GET /api/images - Alle Bilder abrufen
export async function GET(request: NextRequest) {
  try {
    const images = await getAllImages();
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Fehler beim Abrufen der Bilder:', error);
    return NextResponse.json(
      { error: 'Bilder konnten nicht abgerufen werden' },
      { status: 500 }
    );
  }
}

// POST /api/images - Bild speichern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.imageData || !body.metadata) {
      return NextResponse.json(
        { error: 'Unvollständige Bilddaten' },
        { status: 400 }
      );
    }
    
    const savedImage = await saveImage(body.imageData, body.metadata);
    return NextResponse.json(savedImage);
  } catch (error) {
    console.error('Fehler beim Speichern des Bildes:', error);
    return NextResponse.json(
      { error: 'Bild konnte nicht gespeichert werden' },
      { status: 500 }
    );
  }
}

// DELETE /api/images?id=xyz - Bild löschen
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Keine Bild-ID angegeben' },
        { status: 400 }
      );
    }
    
    const success = await deleteImage(id);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Bild konnte nicht gelöscht werden' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Bildes:', error);
    return NextResponse.json(
      { error: 'Bild konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
} 