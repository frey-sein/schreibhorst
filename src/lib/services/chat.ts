import { OpenRouterClient } from '../api/openrouter';
import { ChatMessage } from '@/types/chat';

export class ChatService {
  private static instance: ChatService;
  private client: OpenRouterClient | null = null;
  private messageHistory: ChatMessage[] = [];

  private constructor() {
    // Der Client wird erst bei Bedarf initialisiert
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private getClient(): OpenRouterClient {
    if (!this.client) {
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenRouter API key is not configured. Please set NEXT_PUBLIC_OPENROUTER_API_KEY in your environment variables.');
      }
      this.client = new OpenRouterClient(apiKey);
    }
    return this.client;
  }

  private getApiUrl(): string {
    // Verwende die aktuelle Browser-URL als Basis
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/api/chat`;
  }

  async sendMessage(message: string, model: string = 'openai/gpt-3.5-turbo'): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let hasReceivedContent = false;
      
      console.log('Starting message send with model:', model);
      
      this.streamMessage(message, model, 
        (chunk) => {
          console.log('Received chunk:', chunk);
          if (chunk) {
            hasReceivedContent = true;
            fullResponse += chunk;
            console.log('Updated full response:', fullResponse);
          }
        },
        (error) => {
          console.error('Stream error:', error);
          reject(error);
        }
      ).then(() => {
        console.log('Stream completed. Final response:', fullResponse);
        if (!hasReceivedContent) {
          console.error('No content received during stream');
          reject(new Error('Keine Antwort vom Server erhalten'));
        } else {
          resolve(fullResponse);
        }
      }).catch((error) => {
        console.error('Stream promise error:', error);
        reject(error);
      });
    });
  }

  async streamMessage(
    message: string,
    model: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Hole die letzten 10 Nachrichten aus dem Verlauf
      const conversationHistory = this.messageHistory.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

      // Füge die aktuelle Nachricht hinzu
      const messages = [
        ...conversationHistory,
        {
          role: 'user' as const,
          content: message
        }
      ];

      // Sende die Nachricht an die API
      await this.getClient().streamChat(
        messages,
        model,
        onChunk,
        onError
      );

      // Speichere die Nachricht im Verlauf
      this.messageHistory.push({
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Stream error:', error);
      onError(error as Error);
    }
  }

  // Neue Methode zum Senden einer Datei
  async sendFileMessage(
    message: string,
    file: File,
    model: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      console.log('Sending file message with model:', model);
      console.log('File details:', file.name, file.type, file.size);

      const client = this.getClient();
      
      // Prüfen Sie, ob das ausgewählte Modell multimodale Inhalte unterstützt
      const visionModels = [
        'openai/gpt-4-vision-preview',
        'openai/gpt-4o',
        'anthropic/claude-3-opus',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-haiku',
        'anthropic/claude-3.5-sonnet'
      ];
      
      // Dateitypen, die als Bilder behandelt werden können
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      if (!visionModels.includes(model)) {
        throw new Error(`Das ausgewählte Modell (${model}) unterstützt keine Bilder. Bitte wählen Sie ein Modell mit Vision-Fähigkeiten.`);
      }
      
      if (!imageTypes.includes(file.type)) {
        throw new Error(`Dateiformat ${file.type} wird nicht unterstützt. Nur Bilder (JPEG, PNG, GIF, WEBP) werden derzeit unterstützt.`);
      }

      // ... rest of the method ...

    } catch (error) {
      console.error('Stream error:', error);
      onError(error as Error);
    }
  }
}