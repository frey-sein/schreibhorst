import { NextRequest, NextResponse } from 'next/server';
import { saveChatMessage } from '@/lib/db/chatDb';
import { ChatMessage } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

export interface RouteParams {
  params: {
    chatId: string;
  };
}

/**
 * POST /api/chats/[chatId]/messages/batch - Fügt mehrere Nachrichten auf einmal hinzu
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
    console.error('Fehler beim Speichern der Nachrichten im Batch:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Nachrichten' },
      { status: 500 }
    );
  }
} 