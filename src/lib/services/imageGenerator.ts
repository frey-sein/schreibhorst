import { v4 as uuidv4 } from 'uuid';

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
    id: 'stabilityai/stable-diffusion-xl-turbo',
    name: 'SDXL Turbo',
    provider: 'Together AI',
    description: 'Schnellere Version von SDXL mit guter Bildqualität'
  },
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5',
    provider: 'Together AI',
    description: 'Grundlegendes Modell mit guter Vielseitigkeit'
  },
  {
    id: 'stability-ai/sdxl',
    name: 'SDXL (Stability AI)',
    provider: 'Together AI',
    description: 'Offizielle Version von SDXL von Stability AI'
  },
  {
    id: 'dataolympics/sd3',
    name: 'Stable Diffusion 3',
    provider: 'Together AI',
    description: 'Neueste Version der Stable Diffusion-Familie mit verbesserter Qualität'
  },
  {
    id: 'ByteDance/SDXL-Lightning',
    name: 'SDXL Lightning',
    provider: 'Together AI',
    description: 'Extrem schnelle Bildgenerierung mit guter Qualität'
  },
  {
    id: 'DeepFloyd/IF',
    name: 'DeepFloyd IF',
    provider: 'Together AI',
    description: 'Hochdetailliertes Modell mit starker Texterkennung'
  },
  {
    id: 'francois-rozet/wuerstchen',
    name: 'Würstchen',
    provider: 'Together AI',
    description: 'Effiziente latente Diffusion für detaillierte Bilder'
  }
];

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(prompt: string, modelId?: string): Promise<GenerateImageResponse> {
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
    const model = modelId || 'stabilityai/stable-diffusion-xl-base-1.0';

    // Prüfe, ob das Modell in der Liste verfügbar ist
    const isValidModel = availableModels.some(m => m.id === model);
    if (!isValidModel) {
      return {
        success: false,
        error: `Das ausgewählte Modell "${model}" ist nicht verfügbar.`
      };
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
        size: '1024x1024', // Bildgröße
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
    
    return {
      success: true,
      imageUrl: imageUrl
    };
  } catch (error) {
    console.error('Fehler bei der Bildgenerierung:', error);
    return {
      success: false,
      error: `Unerwarteter Fehler: ${(error as Error).message}`
    };
  }
} 