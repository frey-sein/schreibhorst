'use server';

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import { getPool } from '../db/mysql';
import { PrismaClient } from '@prisma/client';

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

// MySQL-Verbindung wird nun aus dem zentralen Pool abgerufen
let dbPool: mysql.Pool | null = null;

try {
  // Holen der Verbindung aus der zentralen Verbindungsdatei
  dbPool = getPool();
  
  // Wenn keine Verbindung vorhanden ist, geben wir eine Meldung aus
  if (!dbPool) {
    console.log('Keine MySQL-Konfiguration gefunden, verwende Filesystem-Storage');
  }
} catch (error) {
  console.error('Fehler beim Initialisieren der MySQL-Verbindung:', error);
}

// Importiere prisma, falls noch nicht vorhanden
const prisma = new PrismaClient();

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
  user_id?: string;
  title: string;
  prompt?: string;
  modelId: string;
  filePath: string;
  url: string;
  width: number;
  height: number;
  created_at: Date;
  meta?: any;
  chat_id?: string;
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
    userId?: string;
    chatId?: string;
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
      user_id: metadata.userId,
      title: metadata.title,
      prompt: metadata.prompt,
      modelId: metadata.modelId,
      filePath: fileName,
      url: `${IMAGE_BASE_URL}/${fileName}`,
      width: metadata.width,
      height: metadata.height,
      created_at: new Date(),
      meta: metadata.meta,
      chat_id: metadata.chatId
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
          id, user_id, title, prompt, modelId, filePath, width, height, created_at, meta, chat_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        image.id,
        image.user_id || null,
        image.title,
        image.prompt || null,
        image.modelId,
        image.filePath,
        image.width,
        image.height,
        image.created_at,
        JSON.stringify(image.meta || {}),
        image.chat_id || null
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
export async function getAllImages(userId?: string, chatId?: string): Promise<SavedImage[]> {
  // Wenn MySQL verfügbar ist, nutze die DB
  if (dbPool) {
    return getImagesFromDatabase(userId, chatId);
  }
  
  // Ansonsten aus dem Filesystem lesen (ohne Benutzerfilterung)
  return getImagesFromFilesystem();
}

/**
 * Holt Bilder aus der Datenbank
 */
async function getImagesFromDatabase(userId?: string, chatId?: string): Promise<SavedImage[]> {
  if (!dbPool) return [];
  
  const connection = await dbPool.getConnection();
  try {
    // Wenn eine userId oder chatId angegeben ist, filtere danach
    let query = 'SELECT * FROM images';
    const params = [];
    const conditions = [];
    
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    
    if (chatId) {
      conditions.push('chat_id = ?');
      params.push(chatId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await connection.execute(query, params);
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
  imageDrafts: ImageDraft[],
  userId?: string,
  chatId?: string,
  blogPostDraft?: any,
  isManualSave: boolean = false
): Promise<void> {
  // Wenn MySQL verfügbar ist, speichere in der Datenbank
  if (dbPool) {
    const connection = await dbPool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO stage_snapshots (id, timestamp, user_id, chat_id, manual_save, data) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE timestamp=VALUES(timestamp), user_id=VALUES(user_id), chat_id=VALUES(chat_id), data=VALUES(data)`,
        [
          id,
          new Date(),
          userId || null,
          chatId || null,
          isManualSave,
          JSON.stringify({
            textDrafts,
            imageDrafts,
            blogPostDraft
          })
        ]
      );
    } catch (error) {
      console.error('Fehler beim Speichern des Stage-Snapshots:', error);
    } finally {
      connection.release();
    }
    return;
  }
  
  // Fallback: Speichere im Filesystem
  try {
    const snapshotsDir = path.join(process.cwd(), 'public/uploads/snapshots');
    
    // Stelle sicher, dass das Verzeichnis existiert
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    
    // Erstelle einen Dateinamen mit der ID
    const filePath = path.join(snapshotsDir, `${id}.json`);
    
    // Schreibe die Daten in die Datei
    fs.writeFileSync(filePath, JSON.stringify({
      id,
      timestamp: new Date(),
      userId,
      chatId,
      textDrafts,
      imageDrafts,
      blogPostDraft
    }));
  } catch (error) {
    console.error('Fehler beim Speichern des Stage-Snapshots im Filesystem:', error);
  }
}

/**
 * Holt alle Stage-Snapshots aus der Datenbank
 */
export async function getStageSnapshots(userId?: string, chatId?: string, id?: string, onlyManual: boolean = false): Promise<Array<{
  id: string;
  timestamp: Date;
  userId?: string;
  chatId?: string;
  textDrafts: any[];
  imageDrafts: ImageDraft[];
  isManualSave?: boolean;
}>> {
  // Wenn MySQL verfügbar ist, nutze die Datenbank
  if (dbPool) {
    const connection = await dbPool.getConnection();
    try {
      let query = 'SELECT * FROM stage_snapshots';
      const params = [];
      
      // Filter nach Benutzer, Chat-ID, manueller Speicherung oder spezifischer ID
      const conditions = [];
      
      if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
      }
      
      if (chatId) {
        conditions.push('chat_id = ?');
        params.push(chatId);
      }
      
      if (id) {
        conditions.push('id = ?');
        params.push(id);
      }
      
      if (onlyManual) {
        conditions.push('manual_save = 1');
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY timestamp DESC';
      
      const [rows] = await connection.execute(query, params);
      return (rows as any[]).map(row => {
        // Prüfe, ob row.data bereits ein Objekt oder ein String ist
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return {
          id: row.id,
          timestamp: new Date(row.timestamp),
          userId: row.user_id,
          chatId: row.chat_id,
          textDrafts: data.textDrafts || [],
          imageDrafts: data.imageDrafts || [],
          isManualSave: row.manual_save === 1
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
      
      let snapshots = files.map(file => {
        const filePath = path.join(snapshotDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        return {
          id: data.id,
          timestamp: new Date(data.timestamp),
          userId: data.userId,
          chatId: data.chatId,
          textDrafts: data.textDrafts || [],
          imageDrafts: data.imageDrafts || [],
          isManualSave: data.isManualSave || false
        };
      });
      
      // Filtere nach spezifischer ID, falls angegeben
      if (id) {
        snapshots = snapshots.filter(snapshot => snapshot.id === id);
      }
      
      // Filtere nach Benutzer und/oder Chat, falls angegeben
      if (userId || chatId || onlyManual) {
        snapshots = snapshots.filter(snapshot => {
          let matches = true;
          
          if (userId) {
            matches = matches && snapshot.userId === userId;
          }
          
          if (chatId) {
            matches = matches && snapshot.chatId === chatId;
          }
          
          if (onlyManual) {
            matches = matches && snapshot.isManualSave === true;
          }
          
          return matches;
        });
      }
      
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
export async function clearStageSnapshots(userId?: string): Promise<void> {
  // Wenn MySQL verfügbar ist, lösche aus der Datenbank
  if (dbPool) {
    const connection = await dbPool.getConnection();
    try {
      if (userId) {
        // Nur die Snapshots des angegebenen Benutzers löschen
        await connection.execute('DELETE FROM stage_snapshots WHERE user_id = ?', [userId]);
        console.log(`Alle Snapshots des Benutzers ${userId} aus der Datenbank gelöscht`);
      } else {
        // Alle Snapshots löschen (nur für Administratoren)
        await connection.execute('DELETE FROM stage_snapshots');
        console.log('Alle Snapshots aus der Datenbank gelöscht');
      }
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
    
    // Wenn eine Benutzer-ID angegeben ist, filtere nach dieser
    if (userId) {
      for (const file of files) {
        const filePath = path.join(snapshotDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          // Lösche nur, wenn die Benutzer-ID übereinstimmt
          if (data.userId === userId) {
            fs.unlinkSync(filePath);
            console.log(`Snapshot ${file} des Benutzers ${userId} aus dem Dateisystem gelöscht`);
          }
        } catch (fileError) {
          console.error(`Fehler beim Verarbeiten der Datei ${file}:`, fileError);
        }
      }
    } else {
      // Lösche alle Dateien (nur für Administratoren)
      for (const file of files) {
        const filePath = path.join(snapshotDir, file);
        fs.unlinkSync(filePath);
      }
      
      console.log(`${files.length} Snapshots aus dem Dateisystem gelöscht`);
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Snapshots aus dem Dateisystem:', error);
  }
}

// Neue Funktion, um einen einzelnen Snapshot zu löschen
export async function deleteStageSnapshot(id: string, userId?: string): Promise<void> {
  try {
    console.log(`Lösche Snapshot mit ID ${id} für Benutzer ${userId || 'anonym'}`);
    
    // Wenn MySQL verfügbar ist, lösche aus der Datenbank
    if (dbPool) {
      const connection = await dbPool.getConnection();
      try {
        let query = 'DELETE FROM stage_snapshots WHERE id = ?';
        const params = [id];
        
        // Wenn eine userId angegeben ist, füge sie zur Bedingung hinzu
        if (userId) {
          query += ' AND user_id = ?';
          params.push(userId);
        }
        
        await connection.execute(query, params);
        console.log(`Snapshot ${id} erfolgreich aus der Datenbank gelöscht`);
      } catch (error) {
        console.error(`Fehler beim Löschen des Snapshots ${id} aus der Datenbank:`, error);
        throw error;
      } finally {
        connection.release();
      }
    }
    
    // Lösche auch eventuell vorhandene Dateien oder andere Ressourcen
    
    console.log(`Snapshot ${id} erfolgreich gelöscht`);
  } catch (error) {
    console.error(`Fehler beim Löschen des Snapshots ${id}:`, error);
    throw error;
  }
} 