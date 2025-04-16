'use client';

import { v4 as uuidv4 } from 'uuid';

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

/**
 * Client-seitiger Wrapper für den Zugriff auf Bilder
 * Verwendet API-Aufrufe statt direkter Dateisysteminteraktion
 */
export class ImageStorageClient {
  /**
   * Holt alle Bilder über die API
   */
  static async getAllImages(): Promise<SavedImage[]> {
    try {
      const response = await fetch('/api/images');
      
      if (!response.ok) {
        console.error('Fehler beim Abrufen der Bilder:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data.images || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Bilder:', error);
      return [];
    }
  }
  
  /**
   * Speichert ein Bild über die API
   */
  static async saveImage(
    imageData: string,
    metadata: {
      title: string;
      prompt?: string;
      modelId: string;
      width: number;
      height: number;
      meta?: any;
    }
  ): Promise<SavedImage | null> {
    try {
      if (!imageData) {
        console.error('Fehler beim Speichern des Bildes: Keine Bilddaten vorhanden');
        return null;
      }
      
      // Prüfen der Datenlänge, um frühzeitig übermäßig große Datenmengen zu erkennen
      if (imageData.length > 10000000) { // Grenze bei ca. 10 MB
        console.warn('Sehr große Bilddaten erkannt: ', (imageData.length / (1024 * 1024)).toFixed(2), 'MB');
      }

      // Verzögerung hinzufügen, um mögliche Race-Conditions zu vermeiden
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          metadata
        })
      });
      
      // Detailliertere Fehlerbehandlung
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.error || response.statusText;
        } catch (parseError) {
          // Falls die Antwort kein gültiges JSON ist
          errorText = `Status ${response.status}: ${response.statusText}`;
        }
        
        console.error('Fehler beim Speichern des Bildes:', errorText);
        throw new Error(errorText);
      }
      
      // Antwort parsen und Bild zurückgeben
      try {
        const savedImage = await response.json();
        return savedImage;
      } catch (parseError) {
        console.error('Fehler beim Parsen der Antwort:', parseError);
        throw new Error('Fehler beim Parsen der Serverantwort');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Bildes:', error);
      // Werfe den Fehler weiter, damit der Aufrufer ihn behandeln kann
      throw error;
    }
  }
  
  /**
   * Löscht ein Bild über die API
   */
  static async deleteImage(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error('Fehler beim Löschen des Bildes:', response.statusText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Fehler beim Löschen des Bildes:', error);
      return false;
    }
  }
} 