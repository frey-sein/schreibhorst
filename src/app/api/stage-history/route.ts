import { NextRequest, NextResponse } from 'next/server';
import { saveStageSnapshot, getStageSnapshots, clearStageSnapshots } from '@/lib/services/imageStorage';

export async function GET(request: NextRequest) {
  try {
    // Snapshots aus der Datenbank abrufen
    const snapshots = await getStageSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Fehler beim Abrufen der Stage-Snapshots:', error);
    return NextResponse.json(
      { error: 'Bei der Verarbeitung ist ein Fehler aufgetreten' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, textDrafts, imageDrafts } = data;
    
    if (!id || !textDrafts || !imageDrafts) {
      return NextResponse.json(
        { error: 'ID, Textdaten oder Bilddaten fehlen' },
        { status: 400 }
      );
    }
    
    // Snapshot in der Datenbank speichern
    await saveStageSnapshot(id, textDrafts, imageDrafts);
    
    return NextResponse.json({
      success: true,
      id
    });
  } catch (error) {
    console.error('Fehler beim Speichern des Stage-Snapshots:', error);
    return NextResponse.json(
      { error: 'Snapshot konnte nicht gespeichert werden' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Alle Snapshots löschen
    await clearStageSnapshots();
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Fehler beim Löschen aller Stage-Snapshots:', error);
    return NextResponse.json(
      { error: 'Snapshots konnten nicht gelöscht werden' },
      { status: 500 }
    );
  }
} 