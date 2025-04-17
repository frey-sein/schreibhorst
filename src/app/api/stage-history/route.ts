import { NextRequest, NextResponse } from 'next/server';
import { saveStageSnapshot, getStageSnapshots, clearStageSnapshots, deleteStageSnapshot } from '@/lib/services/imageStorage';

// GET: Snapshots abrufen
export async function GET(request: NextRequest) {
  try {
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Snapshot-ID aus der Anfrage abrufen
    const id = request.nextUrl.searchParams.get('id');
    
    // Chat-ID aus der Anfrage abrufen
    
    
    // Parameter für nur manuelle Snapshots
    const onlyManual = request.nextUrl.searchParams.get('onlyManual') === 'true';
    const chatId = request.nextUrl.searchParams.get('chatId') || undefined;
    
    // Wenn eine spezifische ID angefordert wird
    if (id) {
      const snapshot = await getStageSnapshots(userId, chatId, id);
      if (!snapshot || snapshot.length === 0) {
        return NextResponse.json(
          { error: 'Snapshot nicht gefunden' },
          { status: 404 }
        );
      }
      return NextResponse.json({ snapshot: snapshot[0] });
    }
    
    // Snapshots aus der Datenbank abrufen, gefiltert nach Benutzer und/oder Chat
    const snapshots = await getStageSnapshots(userId, chatId, undefined, onlyManual);
    
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Fehler beim Abrufen der Stage-Snapshots:', error);
    return NextResponse.json(
      { error: 'Bei der Verarbeitung ist ein Fehler aufgetreten' },
      { status: 500 }
    );
  }
}

// POST: Snapshot erstellen
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, textDrafts, imageDrafts, chatId, blogPostDraft, isManualSave = true } = data;
    
    if (!id || !textDrafts || !imageDrafts) {
      return NextResponse.json(
        { error: 'ID, Textdaten oder Bilddaten fehlen' },
        { status: 400 }
      );
    }
    
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Snapshot in der Datenbank speichern mit Benutzer- und Chat-ID
    await saveStageSnapshot(id, textDrafts, imageDrafts, userId, chatId, blogPostDraft, isManualSave);
    
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

// DELETE: Snapshot(s) löschen
export async function DELETE(request: NextRequest) {
  try {
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Snapshot-ID aus der Anfrage abrufen
    const id = request.nextUrl.searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    if (id) {
      // Einzelnen Snapshot löschen
      await deleteStageSnapshot(id, userId);
      return NextResponse.json({
        success: true,
        message: 'Snapshot gelöscht'
      });
    } else {
      // Alle Snapshots des aktuellen Benutzers löschen
      await clearStageSnapshots(userId);
      return NextResponse.json({
        success: true,
        message: 'Alle Snapshots gelöscht'
      });
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Stage-Snapshots:', error);
    return NextResponse.json(
      { error: 'Snapshots konnten nicht gelöscht werden' },
      { status: 500 }
    );
  }
} 