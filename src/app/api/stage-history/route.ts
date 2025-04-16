import { NextRequest, NextResponse } from 'next/server';
import { saveStageSnapshot, getStageSnapshots, clearStageSnapshots } from '@/lib/services/imageStorage';

export async function GET(request: NextRequest) {
  try {
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Chat-ID aus der Anfrage abrufen
    const chatId = request.nextUrl.searchParams.get('chatId') || undefined;
    
    // Snapshots aus der Datenbank abrufen, gefiltert nach Benutzer und/oder Chat
    const snapshots = await getStageSnapshots(userId, chatId);
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
    const { id, textDrafts, imageDrafts, chatId, blogPostDraft } = data;
    
    if (!id || !textDrafts || !imageDrafts) {
      return NextResponse.json(
        { error: 'ID, Textdaten oder Bilddaten fehlen' },
        { status: 400 }
      );
    }
    
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    // Snapshot in der Datenbank speichern mit Benutzer- und Chat-ID
    await saveStageSnapshot(id, textDrafts, imageDrafts, userId, chatId, blogPostDraft);
    
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
    // Benutzer-ID aus dem Cookie abrufen
    const userId = request.cookies.get('user-id')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Nur die Snapshots des aktuellen Benutzers löschen
    await clearStageSnapshots(userId);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Stage-Snapshots:', error);
    return NextResponse.json(
      { error: 'Snapshots konnten nicht gelöscht werden' },
      { status: 500 }
    );
  }
} 