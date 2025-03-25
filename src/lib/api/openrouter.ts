interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ChatContent[];
}

// Neue Schnittstelle für multimodale Inhalte
interface ChatContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  stream?: boolean;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
  }

  async streamChatCompletion(request: ChatCompletionRequest): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/carsten-frey/schreibhorst',
          'X-Title': 'Schreibhorst'
        },
        body: JSON.stringify({
          ...request,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return response;
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw error;
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/carsten-frey/schreibhorst',
          'X-Title': 'Schreibhorst'
        },
        body: JSON.stringify({
          ...request,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw error;
    }
  }

  // Neue Methode für das Konvertieren von Dateien in Base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...
          // Wir brauchen nur den Base64-Teil nach dem Komma
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }

  // Neue Methode für Chat mit Datei
  async sendFileMessage(text: string, file: File, model: string): Promise<Response> {
    try {
      // Konvertiere die Datei in Base64
      const base64 = await this.fileToBase64(file);
      
      // Bestimme den MIME-Typ
      const mimeType = file.type || 'application/octet-stream';
      
      // Erstelle eine multimodale Nachricht
      const message: ChatMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: text || `Bitte analysiere diese ${file.name} Datei.`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          }
        ]
      };
      
      // Sende die Anfrage
      return this.streamChatCompletion({
        messages: [message],
        model: model,
        temperature: 0.7,
        stream: true
      });
    } catch (error) {
      console.error('Error sending file message:', error);
      throw error;
    }
  }

  async streamChat(
    messages: Message[],
    model: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://schreibhorst.de',
          'X-Title': 'Schreibhorst'
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API Fehler: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      if (!response.body) {
        throw new Error('Keine Antwort vom Server erhalten');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                onChunk(parsed.choices[0].delta.content);
              }
            } catch (e) {
              console.error('Fehler beim Parsen der Chunk-Daten:', e);
              onError(new Error(`Fehler beim Verarbeiten der Server-Antwort: ${e.message}`));
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenRouter API Fehler:', error);
      onError(new Error(`Verbindungsfehler zur OpenRouter API: ${error.message}`));
    }
  }
} 