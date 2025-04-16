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
      // Alle Daten aus der stage_snapshots Tabelle löschen
      const [result] = await connection.execute('DELETE FROM stage_snapshots');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Alle Einträge aus der stage_snapshots Tabelle wurden gelöscht' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Daten', details: String(error) },
      { status: 500 }
    );
  }
} 