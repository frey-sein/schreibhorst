import { NextRequest, NextResponse } from 'next/server';
import { createChat, getAllChats, getChat, updateChat, deleteChat } from '@/lib/db/chatDb';

/**
 * GET /api/chats - Ruft alle Chats ab
 */
export async function GET(req: NextRequest) {
  try {
    const chats = await getAllChats();
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Fehler beim Abrufen der Chats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Chats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats - Erstellt einen neuen Chat
 */
export async function POST(req: NextRequest) {
  try {
    const { title = 'Neuer Chat' } = await req.json();
    
    const chat = await createChat(title);
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat konnte nicht erstellt werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Chats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Chats' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/chats - Aktualisiert einen Chat
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, title } = await req.json();
    
    if (!id || !title) {
      return NextResponse.json(
        { error: 'ID und Titel sind erforderlich' },
        { status: 400 }
      );
    }
    
    const success = await updateChat(id, title);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Chat konnte nicht aktualisiert werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Chats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Chats' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats - Löscht einen Chat
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ist erforderlich' },
        { status: 400 }
      );
    }
    
    const success = await deleteChat(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Chat konnte nicht gelöscht werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Chats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Chats' },
      { status: 500 }
    );
  }
} 