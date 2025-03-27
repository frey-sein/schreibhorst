import { getPool } from './mysql';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/types/chat';

// Chat-Typen
export interface DBChat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_preview?: string;
}

export interface DBChatMessage {
  id: string;
  chat_id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

export interface DBPromptSuggestion {
  id: string;
  chat_id: string;
  message_id: string;
  type: 'text' | 'image';
  title: string;
  prompt_text: string;
  tags: string; // JSON-String
  format?: string;
  estimated_length?: number;
  created_at: string;
}

/**
 * Erstellt einen neuen Chat in der Datenbank
 */
export async function createChat(title: string = 'Neuer Chat'): Promise<DBChat | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await pool.execute(
      'INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, title, now, now]
    );
    
    return {
      id,
      title,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Fehler beim Erstellen des Chats:', error);
    return null;
  }
}

/**
 * Holt alle Chats aus der Datenbank
 */
export async function getAllChats(): Promise<DBChat[]> {
  const pool = getPool();
  if (!pool) return [];

  try {
    const [rows] = await pool.execute('SELECT * FROM chats ORDER BY updated_at DESC');
    return rows as DBChat[];
  } catch (error) {
    console.error('Fehler beim Abrufen aller Chats:', error);
    return [];
  }
}

/**
 * Holt einen Chat anhand seiner ID
 */
export async function getChat(chatId: string): Promise<DBChat | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const [rows]: any = await pool.execute('SELECT * FROM chats WHERE id = ?', [chatId]);
    if (rows.length === 0) return null;
    return rows[0] as DBChat;
  } catch (error) {
    console.error(`Fehler beim Abrufen des Chats mit ID ${chatId}:`, error);
    return null;
  }
}

/**
 * Aktualisiert einen Chat
 */
export async function updateChat(chatId: string, title: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.execute(
      'UPDATE chats SET title = ?, updated_at = NOW() WHERE id = ?',
      [title, chatId]
    );
    return true;
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Chats mit ID ${chatId}:`, error);
    return false;
  }
}

/**
 * Löscht einen Chat und alle zugehörigen Nachrichten
 */
export async function deleteChat(chatId: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    // Nachrichten werden durch ON DELETE CASCADE automatisch gelöscht
    await pool.execute('DELETE FROM chats WHERE id = ?', [chatId]);
    return true;
  } catch (error) {
    console.error(`Fehler beim Löschen des Chats mit ID ${chatId}:`, error);
    return false;
  }
}

/**
 * Speichert eine einzelne Chatnachricht
 */
export async function saveChatMessage(message: ChatMessage, chatId: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    // Format der Nachricht anpassen (Zeitstempel als MySQL TIMESTAMP)
    const timestamp = new Date(message.timestamp).toISOString().slice(0, 19).replace('T', ' ');
    
    // Prüfen, ob die Nachricht bereits existiert
    const [existingRows]: any = await pool.execute(
      'SELECT id FROM chat_messages WHERE id = ?',
      [message.id]
    );
    
    if (existingRows.length > 0) {
      // Nachricht existiert bereits, aktualisieren
      await pool.execute(
        'UPDATE chat_messages SET sender = ?, text = ?, timestamp = ? WHERE id = ?',
        [message.sender, message.text, timestamp, message.id]
      );
    } else {
      // Neue Nachricht einfügen
      await pool.execute(
        'INSERT INTO chat_messages (id, chat_id, sender, text, timestamp) VALUES (?, ?, ?, ?, ?)',
        [message.id, chatId, message.sender, message.text, timestamp]
      );
      
      // Chat-Preview aktualisieren
      const preview = message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text;
      await pool.execute(
        'UPDATE chats SET last_message_preview = ?, updated_at = NOW() WHERE id = ?',
        [preview, chatId]
      );
    }
    
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Nachricht:', error);
    return false;
  }
}

/**
 * Speichert mehrere Chatnachrichten auf einmal
 */
export async function saveChatMessages(messages: ChatMessage[], chatId: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const message of messages) {
        const timestamp = new Date(message.timestamp).toISOString().slice(0, 19).replace('T', ' ');
        
        // Prüfen, ob die Nachricht bereits existiert
        const [existingRows]: any = await connection.execute(
          'SELECT id FROM chat_messages WHERE id = ?',
          [message.id]
        );
        
        if (existingRows.length > 0) {
          // Nachricht existiert bereits, aktualisieren
          await connection.execute(
            'UPDATE chat_messages SET sender = ?, text = ?, timestamp = ? WHERE id = ?',
            [message.sender, message.text, timestamp, message.id]
          );
        } else {
          // Neue Nachricht einfügen
          await connection.execute(
            'INSERT INTO chat_messages (id, chat_id, sender, text, timestamp) VALUES (?, ?, ?, ?, ?)',
            [message.id, chatId, message.sender, message.text, timestamp]
          );
        }
      }
      
      // Chat-Preview mit der letzten Nachricht aktualisieren
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const preview = lastMessage.text.length > 100 ? lastMessage.text.substring(0, 100) + '...' : lastMessage.text;
        
        await connection.execute(
          'UPDATE chats SET last_message_preview = ?, updated_at = NOW() WHERE id = ?',
          [preview, chatId]
        );
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Nachrichten:', error);
    return false;
  }
}

/**
 * Holt alle Nachrichten für einen Chat
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const pool = getPool();
  if (!pool) return [];

  try {
    const [rows]: any = await pool.execute(
      'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY timestamp ASC',
      [chatId]
    );
    
    // Format der Nachrichten anpassen
    return rows.map((row: DBChatMessage) => ({
      id: row.id,
      text: row.text,
      sender: row.sender,
      timestamp: new Date(row.timestamp).toISOString()
    }));
  } catch (error) {
    console.error(`Fehler beim Abrufen der Nachrichten für Chat ${chatId}:`, error);
    return [];
  }
}

/**
 * Löscht eine Nachricht aus einem Chat
 */
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.execute('DELETE FROM chat_messages WHERE id = ?', [messageId]);
    return true;
  } catch (error) {
    console.error(`Fehler beim Löschen der Nachricht mit ID ${messageId}:`, error);
    return false;
  }
} 