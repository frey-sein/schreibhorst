/**
 * Ruft die hochaufgelöste Version (2048x2048) eines generierten Bildes ab
 */
export async function getHighResolutionImage(imageId: string): Promise<Buffer | null> {
  try {
    // Hier würden wir die hochaufgelöste Version des Bildes von der KI-API abrufen
    const response = await fetch(`${process.env.AI_API_URL}/images/${imageId}/highres`, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Fehler beim Abrufen des hochaufgelösten Bildes');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    console.error('Fehler beim Abrufen des hochaufgelösten Bildes:', error);
    return null;
  }
}

/**
 * Hilfsfunktion zur Überprüfung, ob ein Bild mit der gewünschten ID lokal existiert
 * und gibt es in voller Qualität zurück
 */
export async function getLocalImageFullQuality(imageId: string): Promise<Buffer | null> {
  try {
    // Importiere fs und path nur im server-side Kontext
    const fs = require('fs');
    const path = require('path');
    
    // Definiere den Pfad zum lokalen Bild
    const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/images');
    const filePath = path.join(UPLOAD_DIR, `${imageId}.png`);
    
    // Prüfe, ob die Datei existiert
    if (!fs.existsSync(filePath)) {
      console.log(`Lokales Bild nicht gefunden: ${filePath}`);
      return null;
    }
    
    // Lese die Datei im Binary-Format
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer;
    
  } catch (error) {
    console.error('Fehler beim Abrufen des lokalen Bildes:', error);
    return null;
  }
} 