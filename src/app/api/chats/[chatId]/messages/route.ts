import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages, saveChatMessage, deleteChatMessage } from '@/lib/db/chatDb';
import { ChatMessage } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

export interface RouteParams {
  params: {
    chatId: string;
  };
}

/**
 * GET /api/chats/[chatId]/messages - Ruft alle Nachrichten eines Chats ab
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { chatId } = params;
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const messages = await getChatMessages(chatId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Fehler beim Abrufen der Nachrichten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Nachrichten' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats/[chatId]/messages - Fügt eine neue Nachricht hinzu
 */
export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { chatId } = params;
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const messageData = await req.json();
    
    // Wenn keine ID vorhanden ist, generiere eine
    if (!messageData.id) {
      messageData.id = uuidv4();
    }
    
    // Wenn kein Zeitstempel vorhanden ist, verwende den aktuellen Zeitpunkt
    if (!messageData.timestamp) {
      messageData.timestamp = new Date().toISOString();
    }
    
    const success = await saveChatMessage(messageData as ChatMessage, chatId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Nachricht konnte nicht gespeichert werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(messageData, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Speichern der Nachricht:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Nachricht' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats/[chatId]/messages/batch - Fügt mehrere Nachrichten hinzu
 */
export async function POST_MANY(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { chatId } = params;
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const { messages } = await req.json();
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Nachrichten müssen als Array bereitgestellt werden' },
        { status: 400 }
      );
    }
    
    // Stelle sicher, dass alle Nachrichten IDs und Zeitstempel haben
    const processedMessages = messages.map((msg: Partial<ChatMessage>) => {
      return {
        id: msg.id || uuidv4(),
        text: msg.text || '',
        sender: msg.sender || 'system',
        timestamp: msg.timestamp || new Date().toISOString()
      } as ChatMessage;
    });
    
    // Speichere alle Nachrichten in der Datenbank
    for (const message of processedMessages) {
      await saveChatMessage(message, chatId);
    }
    
    return NextResponse.json(
      { success: true, count: processedMessages.length }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Fehler beim Speichern der Nachrichten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Nachrichten' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[chatId]/messages/[messageId] - Löscht eine Nachricht
 */
export async function DELETE(
  req: NextRequest,
  { params }: {
    params: {
      chatId: string;
      messageId: string;
    };
  }
) {
  try {
    const { messageId } = params;
    if (!messageId) {
      return NextResponse.json(
        { error: 'Nachrichten-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const success = await deleteChatMessage(messageId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Nachricht konnte nicht gelöscht werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Nachricht:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Nachricht' },
      { status: 500 }
    );
  }
} 