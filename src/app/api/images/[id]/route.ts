import { NextRequest, NextResponse } from 'next/server';
import { deleteImage } from '@/lib/services/imageStorage';

// DELETE /api/images/[id] - Bild löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
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