import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/mysql';
import fs from 'fs';
import path from 'path';

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
      // 1. Zuerst die Dateipfade von Bildern ohne user_id ermitteln
      const [rows] = await connection.execute(
        'SELECT id, filePath FROM images WHERE user_id IS NULL'
      );
      
      const imagesToDelete = rows as any[];
      
      // 2. Alle Bilder ohne user_id aus der Datenbank löschen
      const [result] = await connection.execute(
        'DELETE FROM images WHERE user_id IS NULL'
      );
      
      // 3. Dateien im Filesystem löschen, falls gewünscht
      let filesDeleted = 0;
      const uploadDir = path.join(process.cwd(), 'public/uploads/images');
      
      for (const image of imagesToDelete) {
        if (image.filePath) {
          const filePath = path.join(uploadDir, image.filePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            filesDeleted++;
          }
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `${imagesToDelete.length} Bilder aus der Datenbank gelöscht, ${filesDeleted} zugehörige Dateien entfernt.` 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fehler beim Zurücksetzen der Bilder:', error);
    return NextResponse.json(
      { error: 'Fehler beim Zurücksetzen der Bilder', details: String(error) },
      { status: 500 }
    );
  }
} 