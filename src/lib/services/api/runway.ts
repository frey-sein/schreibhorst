import { apiConfig } from '@/lib/config/apiConfig';

export class RunwayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = apiConfig.runway.apiKey;
    this.baseUrl = apiConfig.runway.baseUrl;
    
    if (!this.apiKey) {
      console.error('Runway API Key nicht gefunden');
      throw new Error('Runway API Key nicht gefunden');
    }
    
    console.log('RunwayClient initialisiert mit Base URL:', this.baseUrl);
  }

  /**
   * Wandelt ein Bild in ein Video um
   * @param imageUrl URL des Quellbilds oder Base64-kodiertes Bild als Data-URI
   * @param promptText Textbeschreibung für die Videogenerierung
   * @param model Das zu verwendende Modell (Standard: gen3a_turbo)
   * @returns Ein Promise mit der Task-ID und anderen Metadaten
   */
  async createImageToVideo(imageUrl: string, promptText: string, model = 'gen3a_turbo') {
    try {
      const response = await fetch(`${this.baseUrl}/image_to_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify({
          promptImage: imageUrl,
          promptText: promptText,
          model: model
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Runway API Fehler: ${response.status} ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler bei der Runway API Anfrage (Image-to-Video):', error);
      throw error;
    }
  }

  /**
   * Erstellt ein Video aus einer Textbeschreibung
   * @param promptText Textbeschreibung für die Videogenerierung
   * @param model Das zu verwendende Modell (Standard: gen3a_turbo)
   * @returns Ein Promise mit der Task-ID und anderen Metadaten
   */
  async createTextToVideo(promptText: string, model = 'gen3a_turbo') {
    try {
      const response = await fetch(`${this.baseUrl}/text_to_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify({
          promptText: promptText,
          model: model
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Runway API Fehler: ${response.status} ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler bei der Runway API Anfrage (Text-to-Video):', error);
      throw error;
    }
  }

  /**
   * Ruft den Status einer Task ab
   * @param taskId Die ID der zu überprüfenden Task
   * @returns Den Status und ggf. die Ausgabe der Task
   */
  async getTaskStatus(taskId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Runway API Fehler: ${response.status} ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Abrufen des Task-Status:', error);
      throw error;
    }
  }

  /**
   * Hilfsfunktion zum Warten auf die Fertigstellung einer Task
   * @param taskId Die ID der zu überwachenden Task
   * @param maxAttempts Maximale Anzahl von Versuchen (Standard: 30)
   * @param delay Verzögerung zwischen den Versuchen in ms (Standard: 5000)
   * @returns Das Ergebnis der Task
   */
  async waitForTaskCompletion(taskId: string, maxAttempts = 30, delay = 5000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const taskStatus = await this.getTaskStatus(taskId);
      
      if (taskStatus.status === 'SUCCEEDED') {
        return taskStatus;
      } else if (taskStatus.status === 'FAILED') {
        throw new Error(`Task fehlgeschlagen: ${JSON.stringify(taskStatus.error || 'Unbekannter Fehler')}`);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error(`Zeitüberschreitung bei der Aufgabe. Die Task wurde nach ${maxAttempts} Versuchen nicht abgeschlossen.`);
  }
} 