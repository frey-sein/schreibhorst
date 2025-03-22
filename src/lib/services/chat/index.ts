export class ChatService {
  private static instance: ChatService;
  private apiUrl: string;

  private constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  async sendMessage(message: string, model: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, model }),
      });

      if (!response.ok) {
        throw new Error('Keine Antwort vom Server erhalten');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Bildgenerierung');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error in generateImage:', error);
      throw error;
    }
  }
} 