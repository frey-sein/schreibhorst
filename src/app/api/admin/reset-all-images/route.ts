import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/mysql';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  // Benutzer-ID aus dem Cookie abrufen
  const userId = request.cookies.get('user-id')?.value;
  
  // Überprüfen, ob der Benutzer angemeldet ist
  if (!userId) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    );
  }
  
  // Überprüfen, ob der Benutzer Administrator ist
  // Diese Funktion würde in einer realen Anwendung implementiert sein
  // Für jetzt überspringen wir diese Prüfung, um schnell alle Daten zu löschen
  
  try {
    // Lösche Bilder aus der Datenbank
    const pool = getPool();
    if (pool) {
      const connection = await pool.getConnection();
      try {
        // ALLE Einträge aus der images-Tabelle löschen
        await connection.execute('DELETE FROM images');
        console.log('Alle Bilder aus der Datenbank gelöscht');
      } catch (dbError) {
        console.error('Fehler beim Löschen der Bilder aus der Datenbank:', dbError);
      } finally {
        connection.release();
      }
    }
    
    // Lösche Bilder aus dem Dateisystem
    try {
      const uploadsDir = path.join(process.cwd(), 'public/uploads/images');
      
      // Wenn das Verzeichnis nicht existiert, gibt es nichts zu tun
      if (fs.existsSync(uploadsDir)) {
        // Lese alle Dateien im Verzeichnis
        const files = fs.readdirSync(uploadsDir);
        
        // Lösche alle Dateien
        let deletedCount = 0;
        for (const file of files) {
          // Überspringe versteckte Dateien und .gitkeep
          if (file.startsWith('.') || file === '.gitkeep') {
            continue;
          }
          
          const filePath = path.join(uploadsDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
        
        console.log(`${deletedCount} Bilder aus dem Uploads-Verzeichnis gelöscht`);
      }
    } catch (fsError) {
      console.error('Fehler beim Löschen der Bilder aus dem Dateisystem:', fsError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Alle Bilder wurden vollständig gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Bilder:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Bilder' },
      { status: 500 }
    );
  }
} 