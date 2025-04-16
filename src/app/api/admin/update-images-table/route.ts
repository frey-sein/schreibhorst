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
      // Prüfen, ob die Spalte bereits existiert
      const [columns] = await connection.execute('SHOW COLUMNS FROM images');
      const columnNames = (columns as any[]).map(col => col.Field);
      
      const needsUserId = !columnNames.includes('user_id');
      
      if (needsUserId) {
        // Tabelle aktualisieren
        await connection.execute(`
          ALTER TABLE images 
          ADD COLUMN user_id VARCHAR(36) AFTER id
        `);
        return NextResponse.json({ success: true, message: 'images-Tabelle aktualisiert: user_id hinzugefügt' });
      } else {
        return NextResponse.json({ success: true, message: 'images-Tabelle hat bereits die user_id Spalte' });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der images-Tabelle:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der images-Tabelle', details: String(error) },
      { status: 500 }
    );
  }
} 