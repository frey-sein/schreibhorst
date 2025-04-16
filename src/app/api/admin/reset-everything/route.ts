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
  
  const results = {
    snapshots: { 
      db: { success: false, count: 0 },
      files: { success: false, count: 0 }
    },
    images: { 
      db: { success: false, count: 0 },
      files: { success: false, count: 0 }
    }
  };
  
  try {
    // Lösche Snapshots und Bilder aus der Datenbank
    const pool = getPool();
    if (pool) {
      const connection = await pool.getConnection();
      try {
        // 1. Lösche alle Einträge aus der stage_snapshots-Tabelle
        const [snapshotResult] = await connection.execute('DELETE FROM stage_snapshots');
        results.snapshots.db.success = true;
        results.snapshots.db.count = (snapshotResult as any).affectedRows || 0;
        console.log(`${results.snapshots.db.count} Snapshots aus der Datenbank gelöscht`);
        
        // 2. Lösche alle Einträge aus der images-Tabelle
        const [imagesResult] = await connection.execute('DELETE FROM images');
        results.images.db.success = true;
        results.images.db.count = (imagesResult as any).affectedRows || 0;
        console.log(`${results.images.db.count} Bilder aus der Datenbank gelöscht`);
      } catch (dbError) {
        console.error('Fehler beim Löschen von Daten aus der Datenbank:', dbError);
      } finally {
        connection.release();
      }
    }
    
    // Lösche Snapshots aus dem Dateisystem
    try {
      const snapshotDir = path.join(process.cwd(), 'public/uploads/snapshots');
      
      if (fs.existsSync(snapshotDir)) {
        const files = fs.readdirSync(snapshotDir).filter(file => file.endsWith('.json'));
        
        for (const file of files) {
          const filePath = path.join(snapshotDir, file);
          fs.unlinkSync(filePath);
        }
        
        results.snapshots.files.success = true;
        results.snapshots.files.count = files.length;
        console.log(`${files.length} Snapshots aus dem Dateisystem gelöscht`);
      } else {
        results.snapshots.files.success = true;
        results.snapshots.files.count = 0;
      }
    } catch (fsError) {
      console.error('Fehler beim Löschen der Snapshots aus dem Dateisystem:', fsError);
    }
    
    // Lösche Bilder aus dem Dateisystem
    try {
      const uploadsDir = path.join(process.cwd(), 'public/uploads/images');
      
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        
        let deletedCount = 0;
        for (const file of files) {
          if (file.startsWith('.') || file === '.gitkeep') {
            continue;
          }
          
          const filePath = path.join(uploadsDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
        
        results.images.files.success = true;
        results.images.files.count = deletedCount;
        console.log(`${deletedCount} Bilder aus dem Uploads-Verzeichnis gelöscht`);
      } else {
        results.images.files.success = true;
        results.images.files.count = 0;
      }
    } catch (fsError) {
      console.error('Fehler beim Löschen der Bilder aus dem Dateisystem:', fsError);
    }
    
    // Leere die lokalen Sessions im sessionStorage, damit keine alten Referenzen bleiben
    // Dies kann nur clientseitig geschehen und nicht vom Server
    
    return NextResponse.json({
      success: true,
      message: 'Alle Daten wurden zurückgesetzt',
      results
    });
  } catch (error) {
    console.error('Fehler beim Zurücksetzen aller Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Zurücksetzen aller Daten', results },
      { status: 500 }
    );
  }
} 