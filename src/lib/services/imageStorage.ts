'use server';

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';

// Definition des Upload-Verzeichnisses
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/images');
const IMAGE_BASE_URL = '/uploads/images';

// Stelle sicher, dass das Upload-Verzeichnis existiert
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Upload-Verzeichnis wurde erstellt: ${UPLOAD_DIR}`);
  }
} catch (error) {
  console.error('Fehler beim Erstellen des Upload-Verzeichnisses:', error);
}

// MySQL-Verbindung initialisieren, falls konfiguriert
let dbPool: mysql.Pool | null = null;

try {
  if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE) {
    dbPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log('MySQL-Verbindung wurde initialisiert');
    
    // Stelle sicher, dass die Tabellen existieren
    initializeDatabase().catch(error => {
      console.error('Fehler beim Initialisieren der Datenbank:', error);
    });
  } else {
    console.log('Keine MySQL-Konfiguration gefunden, verwende Filesystem-Storage');
  }
} catch (error) {
  console.error('Fehler beim Initialisieren der MySQL-Verbindung:', error);
}

/**
 * Initialisiert die Datenbank und erstellt die benötigten Tabellen
 */
async function initializeDatabase(): Promise<void> {
  if (!dbPool) return;
  
  const connection = await dbPool.getConnection();
  try {
    // Erstelle die Bilder-Tabelle
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        prompt TEXT,
        modelId VARCHAR(50) NOT NULL,
        filePath VARCHAR(255) NOT NULL,
        width INT NOT NULL,
        height INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        meta JSON
      )
    `);
    
    // Erstelle die Snapshots-Tabelle für Stage-Zustände
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stage_snapshots (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data JSON
      )
    `);
    
    console.log('Datenbanktabellen wurden erfolgreich initialisiert');
  } catch (error) {
    console.error('Fehler beim Erstellen der Tabellen:', error);
  } finally {
    connection.release();
  }
}

// Interface für einen Bild-Entwurf (noch nicht gespeichert)
export interface ImageDraft {
  id: string;
  title: string;
  prompt?: string;
  modelId: string;
  imageData: string; // Base64
  width: number;
  height: number;
  meta?: any;
}

// Interface für ein gespeichertes Bild
export interface SavedImage {
  id: string;
  title: string;
  prompt?: string;
  modelId: string;
  filePath: string;
  url: string;
  width: number;
  height: number;
  created_at: Date;
  meta?: any;
}

// Alle Methoden sind als separate asynchrone Funktionen exportiert
/**
 * Speichert ein Base64-kodiertes Bild im Filesystem und optional in der Datenbank
 */
export async function saveImage(
  imageData: string, // Base64-kodierte Bilddaten
  metadata: {
    title: string;
    prompt?: string;
    modelId: string;
    width: number;
    height: number;
    meta?: any;
  }
): Promise<SavedImage> {
  try {
    // Entferne den Base64-Header, falls vorhanden
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Erstelle eine eindeutige ID und den Dateinamen
    const id = uuidv4();
    const imageExt = 'png'; // Standard ist PNG
    const fileName = `${id}.${imageExt}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Speichere das Bild im Filesystem
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    // Erstelle das Ergebnisobjekt
    const savedImage: SavedImage = {
      id,
      title: metadata.title,
      prompt: metadata.prompt,
      modelId: metadata.modelId,
      filePath: fileName,
      url: `${IMAGE_BASE_URL}/${fileName}`,
      width: metadata.width,
      height: metadata.height,
      created_at: new Date(),
      meta: metadata.meta
    };
    
    // In MySQL speichern, falls verfügbar
    if (dbPool) {
      await saveImageToDatabase(savedImage);
    }
    
    return savedImage;
  } catch (error) {
    console.error('Fehler beim Speichern des Bildes:', error);
    throw new Error('Bild konnte nicht gespeichert werden');
  }
}

/**
 * Speichert ein Bild in der MySQL-Datenbank
 */
async function saveImageToDatabase(image: SavedImage): Promise<void> {
  if (!dbPool) return;
  
  const connection = await dbPool.getConnection();
  try {
    await connection.execute(
      `INSERT INTO images (
          id, title, prompt, modelId, filePath, width, height, created_at, meta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        image.id,
        image.title,
        image.prompt || null,
        image.modelId,
        image.filePath,
        image.width,
        image.height,
        image.created_at,
        JSON.stringify(image.meta || {})
      ]
    );
  } catch (error) {
    console.error('Fehler beim Speichern des Bildes in der Datenbank:', error);
  } finally {
    connection.release();
  }
}

/**
 * Holt alle Bilder aus der Datenbank oder dem Filesystem
 */
export async function getAllImages(): Promise<SavedImage[]> {
  // Temporär immer aus dem Filesystem lesen (Debug)
  return getImagesFromFilesystem();
  
  // Wenn MySQL verfügbar ist, nutze die DB
  /*
  if (dbPool) {
    return getImagesFromDatabase();
  }
  
  // Ansonsten aus dem Filesystem lesen
  return getImagesFromFilesystem();
  */
}

/**
 * Holt Bilder aus der Datenbank
 */
async function getImagesFromDatabase(): Promise<SavedImage[]> {
  if (!dbPool) return [];
  
  const connection = await dbPool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM images ORDER BY created_at DESC');
    return (rows as any[]).map(row => ({
      ...row,
      url: `${IMAGE_BASE_URL}/${row.filePath}`,
      meta: row.meta ? JSON.parse(row.meta) : {}
    }));
  } catch (error) {
    console.error('Fehler beim Abrufen der Bilder aus der Datenbank:', error);
    return [];
  } finally {
    connection.release();
  }
}

/**
 * Liest Bilder aus dem Filesystem
 * Hinweis: Dies ist eine Fallback-Lösung und weniger effizient als die Datenbankabfrage
 */
async function getImagesFromFilesystem(): Promise<SavedImage[]> {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    return files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => {
        const id = path.parse(file).name;
        // Metadaten können nicht aus dem Filesystem gelesen werden, nur Basisdaten
        return {
          id,
          title: `Bild ${id}`,
          modelId: 'unknown',
          filePath: file,
          url: `${IMAGE_BASE_URL}/${file}`,
          width: 0,
          height: 0,
          created_at: new Date(fs.statSync(path.join(UPLOAD_DIR, file)).mtime)
        };
      })
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  } catch (error) {
    console.error('Fehler beim Lesen der Bilder aus dem Filesystem:', error);
    return [];
  }
}

/**
 * Speichert einen Stage-Snapshot in der Datenbank
 */
export async function saveStageSnapshot(
  id: string,
  textDrafts: any[],
  imageDrafts: ImageDraft[]
): Promise<void> {
  // Wenn MySQL verfügbar ist, speichere in der Datenbank
  if (dbPool) {
    const connection = await dbPool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO stage_snapshots (id, timestamp, data) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE timestamp=VALUES(timestamp), data=VALUES(data)`,
        [
          id,
          new Date(),
          JSON.stringify({ textDrafts, imageDrafts })
        ]
      );
    } catch (error) {
      console.error('Fehler beim Speichern des Snapshots in der Datenbank:', error);
    } finally {
      connection.release();
    }
  } else {
    // Fallback: Speichere im Dateisystem
    try {
      // Stelle sicher, dass das Verzeichnis existiert
      const snapshotDir = path.join(process.cwd(), 'public/uploads/snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      // Erstelle die Snapshot-Datei
      const snapshotData = {
        id,
        timestamp: new Date(),
        textDrafts,
        imageDrafts
      };
      
      const filePath = path.join(snapshotDir, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(snapshotData));
      
      console.log(`Snapshot ${id} im Dateisystem gespeichert`);
    } catch (error) {
      console.error('Fehler beim Speichern des Snapshots im Dateisystem:', error);
    }
  }
}

/**
 * Holt alle Stage-Snapshots aus der Datenbank
 */
export async function getStageSnapshots(): Promise<Array<{
  id: string;
  timestamp: Date;
  textDrafts: any[];
  imageDrafts: ImageDraft[];
}>> {
  // Wenn MySQL verfügbar ist, nutze die Datenbank
  if (dbPool) {
    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM stage_snapshots ORDER BY timestamp DESC');
      return (rows as any[]).map(row => {
        // Prüfe, ob row.data bereits ein Objekt oder ein String ist
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return {
          id: row.id,
          timestamp: new Date(row.timestamp),
          textDrafts: data.textDrafts || [],
          imageDrafts: data.imageDrafts || []
        };
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Snapshots aus der Datenbank:', error);
      return [];
    } finally {
      connection.release();
    }
  } else {
    // Fallback: Lade aus dem Dateisystem
    try {
      const snapshotDir = path.join(process.cwd(), 'public/uploads/snapshots');
      
      // Wenn das Verzeichnis nicht existiert, gib ein leeres Array zurück
      if (!fs.existsSync(snapshotDir)) {
        return [];
      }
      
      // Lese alle JSON-Dateien im Verzeichnis
      const files = fs.readdirSync(snapshotDir).filter(file => file.endsWith('.json'));
      
      const snapshots = files.map(file => {
        const filePath = path.join(snapshotDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        return {
          id: data.id,
          timestamp: new Date(data.timestamp),
          textDrafts: data.textDrafts || [],
          imageDrafts: data.imageDrafts || []
        };
      });
      
      // Sortiere nach Datum (neueste zuerst)
      return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Fehler beim Abrufen der Snapshots aus dem Dateisystem:', error);
      return [];
    }
  }
}

/**
 * Löscht ein Bild aus dem Filesystem und der Datenbank
 */
export async function deleteImage(id: string): Promise<boolean> {
  try {
    // Aus der Datenbank löschen, falls verfügbar
    if (dbPool) {
      const connection = await dbPool.getConnection();
      try {
        // Erst das Bild aus der DB holen, um den Dateipfad zu bekommen
        const [rows] = await connection.execute('SELECT filePath FROM images WHERE id = ?', [id]);
        if (Array.isArray(rows) && rows.length > 0) {
          // Aus der DB löschen
          await connection.execute('DELETE FROM images WHERE id = ?', [id]);
          
          // Aus dem Filesystem löschen
          const filePath = path.join(UPLOAD_DIR, (rows[0] as any).filePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.error('Fehler beim Löschen des Bildes aus der Datenbank:', error);
        return false;
      } finally {
        connection.release();
      }
    } else {
      // Ohne Datenbank direkt im Filesystem suchen
      const files = fs.readdirSync(UPLOAD_DIR);
      const matchingFile = files.find(file => file.startsWith(id));
      if (matchingFile) {
        fs.unlinkSync(path.join(UPLOAD_DIR, matchingFile));
      }
    }
    
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen des Bildes:', error);
    return false;
  }
}

/**
 * Bereinigt alte Bilder, wenn der Speicherplatz knapp wird
 * (wird nur aufgerufen, wenn nötig)
 */
export async function cleanupOldImages(maxSizeMB: number = 500): Promise<void> {
  try {
    // Überprüfe die aktuelle Verzeichnisgröße
    const stats = await getDirectoryStats();
    const currentSizeMB = stats.totalSize / (1024 * 1024);
    
    // Wenn unter dem Limit, nichts tun
    if (currentSizeMB < maxSizeMB) {
      return;
    }
    
    console.log(`Bildverzeichnis ist ${currentSizeMB.toFixed(2)} MB groß, Bereinigung wird gestartet...`);
    
    // Hole alle Bilder, sortiert nach Erstellungsdatum (älteste zuerst)
    let images: SavedImage[];
    
    if (dbPool) {
      // Aus der Datenbank
      const connection = await dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM images ORDER BY created_at ASC'
        );
        images = rows as SavedImage[];
      } finally {
        connection.release();
      }
    } else {
      // Aus dem Filesystem
      images = await getImagesFromFilesystem()
        .then(images => images.sort((a, b) => a.created_at.getTime() - b.created_at.getTime()));
    }
    
    // Lösche die ältesten Bilder, bis wir unter 80% des Maximums sind
    const targetSizeMB = maxSizeMB * 0.8;
    let currentSize = currentSizeMB;
    
    for (const image of images) {
      // Wenn wir unter dem Ziel sind, aufhören
      if (currentSize < targetSizeMB) {
        break;
      }
      
      // Dateigröße ermitteln
      const filePath = path.join(UPLOAD_DIR, image.filePath);
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        
        // Bild löschen
        await deleteImage(image.id);
        
        // Größe aktualisieren
        currentSize -= fileSizeMB;
        console.log(`Altes Bild ${image.id} (${fileSizeMB.toFixed(2)} MB) wurde gelöscht`);
      }
    }
    
    console.log(`Bereinigung abgeschlossen. Neue Größe: ${currentSize.toFixed(2)} MB`);
  } catch (error) {
    console.error('Fehler bei der Bildbereinigung:', error);
  }
}

/**
 * Ermittelt die aktuelle Größe des Bildverzeichnisses
 */
async function getDirectoryStats(): Promise<{ totalSize: number; fileCount: number }> {
  try {
    let totalSize = 0;
    let fileCount = 0;
    
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
        fileCount++;
      }
    }
    
    return { totalSize, fileCount };
  } catch (error) {
    console.error('Fehler beim Ermitteln der Verzeichnisstatistiken:', error);
    return { totalSize: 0, fileCount: 0 };
  }
}

/**
 * Löscht alle Stage-Snapshots
 */
export async function clearStageSnapshots(): Promise<void> {
  // Wenn MySQL verfügbar ist, lösche aus der Datenbank
  if (dbPool) {
    const connection = await dbPool.getConnection();
    try {
      await connection.execute('DELETE FROM stage_snapshots');
      console.log('Alle Snapshots aus der Datenbank gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen der Snapshots aus der Datenbank:', error);
    } finally {
      connection.release();
    }
  }
  
  // Lösche immer auch aus dem Dateisystem (falls vorhanden)
  try {
    const snapshotDir = path.join(process.cwd(), 'public/uploads/snapshots');
    
    // Wenn das Verzeichnis nicht existiert, gibt es nichts zu tun
    if (!fs.existsSync(snapshotDir)) {
      return;
    }
    
    // Lese alle JSON-Dateien im Verzeichnis
    const files = fs.readdirSync(snapshotDir).filter(file => file.endsWith('.json'));
    
    // Lösche jede Datei
    for (const file of files) {
      const filePath = path.join(snapshotDir, file);
      fs.unlinkSync(filePath);
    }
    
    console.log(`${files.length} Snapshots aus dem Dateisystem gelöscht`);
  } catch (error) {
    console.error('Fehler beim Löschen der Snapshots aus dem Dateisystem:', error);
  }
} 