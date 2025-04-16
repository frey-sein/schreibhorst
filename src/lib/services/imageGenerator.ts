'use client';

import { v4 as uuidv4 } from 'uuid';
import { SavedImage, ImageStorageClient } from './imageStorageClient';

export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export const availableModels: ImageModel[] = [
  {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL',
    provider: 'Together AI',
    description: 'Hohe Qualität mit guter Balance aus Geschwindigkeit und Detailgrad'
  },
  {
    id: 'black-forest-labs/FLUX.1-dev',
    name: 'FLUX.1 (Dev)',
    provider: 'Together AI / Black Forest Labs',
    description: 'Fortschrittliches Modell für kreative Bildgenerierung'
  },
  {
    id: 'black-forest-labs/FLUX.1',
    name: 'FLUX.1',
    provider: 'Together AI / Black Forest Labs',
    description: 'Produktionsversion des FLUX.1 Modells für hochwertige Bildgenerierung'
  },
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5',
    provider: 'Together AI',
    description: 'Grundlegendes Modell mit guter Vielseitigkeit'
  }
];

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  image?: SavedImage;
  error?: string;
}

// Hilfsfunktion zum Herunterladen eines Bildes
async function downloadImage(url: string): Promise<string> {
  try {
    // Verwende den Proxy-Endpunkt, um CORS-Probleme zu vermeiden
    const response = await fetch('/api/proxy/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Fehler beim Herunterladen des Bildes: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.imageData;
  } catch (error) {
    console.error('Fehler beim Herunterladen des Bildes:', error);
    throw error;
  }
}

export async function generateImage(prompt: string, modelId?: string, title?: string): Promise<GenerateImageResponse> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TOGETHER_API_KEY;
    
    if (!apiKey) {
      console.error('Together API-Schlüssel fehlt in den Umgebungsvariablen');
      return {
        success: false,
        error: 'API-Schlüssel nicht konfiguriert'
      };
    }

    // Wenn kein Modell angegeben wurde, verwende das Standardmodell
    let model = modelId || 'stabilityai/stable-diffusion-xl-base-1.0';

    // Prüfe, ob das Modell in der Liste verfügbar ist
    const isValidModel = availableModels.some(m => m.id === model);
    if (!isValidModel) {
      console.warn(`Das ausgewählte Modell "${model}" ist nicht in der Liste der verfügbaren Modelle. Verwende Standardmodell.`);
      model = 'stabilityai/stable-diffusion-xl-base-1.0';
    }

    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        n: 1, // Anzahl der zu generierenden Bilder
        size: '1024x1024', // Standard-Bildgröße für Together AI (FLUX akzeptiert scheinbar nur Standard-Größen)
        response_format: 'url' // URL statt Base64
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fehler bei der Bildgenerierung:', errorData);
      return {
        success: false,
        error: `API-Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`
      };
    }

    const data = await response.json();
    
    // Die Struktur der Antwort kann variieren, daher müssen wir die URL entsprechend extrahieren
    // Annahme: Die API gibt eine URL im data.images[0].url zurück
    const imageUrl = data.data?.[0]?.url || data.images?.[0]?.url;
    
    if (!imageUrl) {
      return {
        success: false,
        error: 'Keine Bild-URL in der API-Antwort gefunden'
      };
    }
    
    // Bild herunterladen und im Filesystem/DB speichern
    try {
      console.log('Bild-URL von der API erhalten:', imageUrl);
      const imageData = await downloadImage(imageUrl);
      
      try {
        // Bild im neuen Storage-Service speichern (client-seitig)
        const savedImage = await ImageStorageClient.saveImage(imageData, {
          title: title || prompt.substring(0, 50) + '...',
          prompt: prompt,
          modelId: model,
          width: 1024,
          height: 1024,
          meta: {
            provider: 'togetherAI',
            generationModel: model
          }
        });
        
        // Erfolg mit gespeichertem Bild zurückgeben
        if (savedImage && savedImage.url) {
          console.log('Bild erfolgreich lokal gespeichert mit URL:', savedImage.url);
          // Immer den lokalen Pfad zurückgeben, wenn verfügbar
          return {
            success: true,
            imageUrl: savedImage.url,
            image: savedImage
          };
        } else {
          console.warn('Bild wurde gespeichert, aber keine URL zurückgegeben');
          return {
            success: true,
            imageUrl,
            error: 'Bild wurde gespeichert, aber lokale URL fehlt'
          };
        }
      } catch (storageError: any) {
        console.error('Fehler beim Speichern des Bildes im lokalen Speicher:', storageError);
        
        // Versuche trotzdem, mit der Original-URL fortzufahren
        return {
          success: true,
          imageUrl: imageUrl,
          error: `Bild wurde generiert, aber Speicherung fehlgeschlagen: ${storageError.message || 'Unbekannter Fehler'}`
        };
      }
    } catch (saveError: any) {
      console.error('Fehler beim Speichern des generierten Bildes:', saveError);
      
      // Wir geben trotzdem die Original-URL zurück, damit das Bild angezeigt werden kann
      return {
        success: true,
        imageUrl: imageUrl,
        error: `Bild wurde generiert, konnte aber nicht gespeichert werden: ${saveError.message || 'Unbekannter Fehler'}`
      };
    }
  } catch (error) {
    console.error('Fehler bei der Bildgenerierung:', error);
    return {
      success: false,
      error: `Unerwarteter Fehler: ${(error as Error).message}`
    };
  }
} 