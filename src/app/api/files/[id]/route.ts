import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '../data';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Datei oder Ordner aus dem Datenspeicher löschen
    const success = deleteFile(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Element nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Elements:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Elements' },
      { status: 500 }
    );
  }
} 