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
      
      if (!response.ok) {
        console.error('Fehler beim Speichern des Bildes:', response.statusText);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Speichern des Bildes:', error);
      return null;
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