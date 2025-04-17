import { NextRequest, NextResponse } from 'next/server';
import { saveImage, getAllImages, deleteImage } from '@/lib/services/imageStorage';

// GET /api/images - Alle Bilder abrufen
export async function GET(request: NextRequest) {
  try {
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Chat-ID aus der URL holen
    const chatId = request.nextUrl.searchParams.get('chatId') || undefined;
    
    // Bilder abrufen, gefiltert nach Benutzer und Chat
    const images = await getAllImages(userId, chatId);
    
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
    const { imageData, metadata } = data;
    
    if (!imageData) {
      console.error('POST /api/images: Keine Bilddaten im Request');
      return NextResponse.json(
        { error: 'Keine Bilddaten erhalten' },
        { status: 400 }
      );
    }
    
    if (!metadata) {
      console.error('POST /api/images: Keine Metadaten im Request');
      return NextResponse.json(
        { error: 'Keine Metadaten erhalten' },
        { status: 400 }
      );
    }
    
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    console.log('POST /api/images: Request von Benutzer', userId || 'anonym');
    
    // Validiere, dass die erforderlichen Metadaten-Felder vorhanden sind
    const { title, modelId, width, height } = metadata;
    const meta = metadata.meta || {};
    const prompt = metadata.prompt || '';
    
    try {
      // Bild speichern mit Benutzer-ID
      const savedImage = await saveImage(imageData, {
        title: title || 'Unbenanntes Bild',
        prompt,
        modelId: modelId || 'unbekannt',
        width: width || 512,
        height: height || 512,
        meta,
        userId,
        chatId: metadata.chatId
      });
      
      console.log(`POST /api/images: Bild erfolgreich gespeichert mit ID ${savedImage.id}`);
      return NextResponse.json(savedImage);
    } catch (saveError: any) {
      console.error('POST /api/images: Fehler beim Speichern des Bildes:', saveError);
      return NextResponse.json(
        { error: `Fehler beim Speichern des Bildes: ${saveError.message || 'Unbekannter Fehler'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/images: Fehler bei der Verarbeitung des Requests:', error);
    return NextResponse.json(
      { error: `Fehler bei der Verarbeitung des Requests: ${error.message || 'Unbekannter Fehler'}` },
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