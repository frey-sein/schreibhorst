import { v4 as uuidv4 } from 'uuid';

// Definition der verfügbaren Videomodelle
export const availableModels = [
  { id: 'gen-2', name: 'Runway Gen-2' },
];

export interface VideoModel {
  id: string;
  name: string;
}

export interface GenerateVideoOptions {
  prompt: string;
  modelId: string;
  duration?: number; // Dauer in Sekunden (im Bereich 1-4)
  numberOfFrames?: number; // Anzahl der Frames (im Bereich 24-120)
}

interface RunwayResponse {
  id: string;
  status: string;
  output_url?: string;
  error?: string;
}

/**
 * VideoGenerator-Service für die Integration mit der Runway API
 * Generiert Videos basierend auf Textprompts
 */
export class VideoGenerator {
  private static instance: VideoGenerator;
  private apiKey: string;
  private apiUrl: string = 'https://api.runwayml.com/v1/';
  private defaultDuration: number = 2; // 2 Sekunden
  private defaultNumberOfFrames: number = 48; // 24 FPS

  private constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY || '';
    if (!this.apiKey) {
      console.error('RUNWAY_API_KEY ist nicht definiert in .env.local');
    }
  }

  public static getInstance(): VideoGenerator {
    if (!VideoGenerator.instance) {
      VideoGenerator.instance = new VideoGenerator();
    }
    return VideoGenerator.instance;
  }

  /**
   * Generiert ein Video basierend auf einem Textprompt
   * @param options Optionen für die Videogenerierung
   * @returns Ein Promise mit der Generations-ID und dem Status
   */
  public async generateVideo(options: GenerateVideoOptions): Promise<{ id: string, jobId: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('Runway API-Schlüssel nicht konfiguriert');
      }

      // Generiere eine einzigartige ID für dieses Video
      const videoId = uuidv4();
      
      // Bereite die Anfrage für die Runway API vor
      const payload = {
        prompt: options.prompt,
        mode: 'text-to-video', // Der Standard-Modus für Text-zu-Video
        duration: options.duration || this.defaultDuration,
        num_frames: options.numberOfFrames || this.defaultNumberOfFrames,
      };

      // Sende die Anfrage an die Runway API
      const response = await fetch(`${this.apiUrl}generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Runway API-Fehler: ${errorData.error || response.statusText}`);
      }

      // Parse die Antwort
      const data = await response.json() as RunwayResponse;
      
      return {
        id: videoId,
        jobId: data.id
      };
    } catch (error) {
      console.error('Fehler bei der Videogenerierung:', error);
      throw error;
    }
  }

  /**
   * Prüft den Status eines generierten Videos
   * @param jobId Die Job-ID der Videogenerierung
   * @returns Der aktuelle Status und die URL des Videos, falls verfügbar
   */
  public async checkVideoStatus(jobId: string): Promise<{ status: string, outputUrl?: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('Runway API-Schlüssel nicht konfiguriert');
      }

      // Sende die Anfrage an die Runway API
      const response = await fetch(`${this.apiUrl}generations/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Runway API-Fehler: ${errorData.error || response.statusText}`);
      }

      // Parse die Antwort
      const data = await response.json() as RunwayResponse;
      
      return {
        status: data.status,
        outputUrl: data.output_url
      };
    } catch (error) {
      console.error('Fehler beim Abrufen des Videostatus:', error);
      throw error;
    }
  }
}

// Exportiere eine Hilfsfunktion zum direkten Generieren eines Videos
export async function generateVideo(options: GenerateVideoOptions): Promise<{ id: string, jobId: string }> {
  const generator = VideoGenerator.getInstance();
  return generator.generateVideo(options);
} 