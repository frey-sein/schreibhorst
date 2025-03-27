import { NextRequest, NextResponse } from 'next/server';
import { deleteChatMessage } from '@/lib/db/chatDb';

export interface RouteParams {
  params: {
    chatId: string;
    messageId: string;
  };
}

/**
 * DELETE /api/chats/[chatId]/messages/[messageId] - Löscht eine Nachricht
 */
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
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