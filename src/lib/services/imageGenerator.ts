import { v4 as uuidv4 } from 'uuid';

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(prompt: string): Promise<GenerateImageResponse> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TOGETHER_API_KEY;
    
    if (!apiKey) {
      console.error('Together API-Schlüssel fehlt in den Umgebungsvariablen');
      return {
        success: false,
        error: 'API-Schlüssel nicht konfiguriert'
      };
    }

    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
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