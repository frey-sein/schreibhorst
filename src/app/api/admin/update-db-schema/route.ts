import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/mysql';

export async function GET(request: NextRequest) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json(
      { error: 'Keine Datenbankverbindung verfügbar' },
      { status: 500 }
    );
  }

  try {
    const connection = await pool.getConnection();
    try {
      // Prüfen, ob die Spalten bereits existieren
      const [columns] = await connection.execute('SHOW COLUMNS FROM stage_snapshots');
      const columnNames = (columns as any[]).map(col => col.Field);
      
      const needsUserId = !columnNames.includes('user_id');
      const needsChatId = !columnNames.includes('chat_id');
      
      if (needsUserId || needsChatId) {
        // Tabelle aktualisieren
        if (needsUserId && needsChatId) {
          await connection.execute(`
            ALTER TABLE stage_snapshots 
            ADD COLUMN user_id VARCHAR(36) AFTER timestamp,
            ADD COLUMN chat_id VARCHAR(36) AFTER user_id
          `);
          return NextResponse.json({ success: true, message: 'Tabelle aktualisiert: user_id und chat_id hinzugefügt' });
        } else if (needsUserId) {
          await connection.execute(`
            ALTER TABLE stage_snapshots 
            ADD COLUMN user_id VARCHAR(36) AFTER timestamp
          `);
          return NextResponse.json({ success: true, message: 'Tabelle aktualisiert: user_id hinzugefügt' });
        } else if (needsChatId) {
          await connection.execute(`
            ALTER TABLE stage_snapshots 
            ADD COLUMN chat_id VARCHAR(36) AFTER user_id
          `);
          return NextResponse.json({ success: true, message: 'Tabelle aktualisiert: chat_id hinzugefügt' });
        }
      } else {
        return NextResponse.json({ success: true, message: 'Tabelle hat bereits alle benötigten Spalten' });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Tabelle:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Tabelle', details: String(error) },
      { status: 500 }
    );
  }
} 