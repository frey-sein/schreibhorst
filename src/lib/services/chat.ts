import { OpenRouterClient } from '../api/openrouter';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ChatService {
  private client: OpenRouterClient;

  constructor() {
    this.client = new OpenRouterClient();
  }

  async sendMessage(message: string, context: string[] = []) {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Du bist ein hilfreicher KI-Schreibassistent namens Schreibhorst. Du hilfst Nutzern dabei, kreative Texte zu entwickeln und zu verbessern.',
      },
      ...context.map(msg => ({
        role: 'user' as const,
        content: msg,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API error: ' + response.statusText);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Chat service error:', error);
      throw new Error('Entschuldigung, es gab ein Problem bei der Verarbeitung deiner Nachricht.');
    }
  }

  async streamMessage(message: string, context: string[] = [], onChunk: (chunk: string) => void) {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Du bist ein hilfreicher KI-Schreibassistent namens Schreibhorst. Du hilfst Nutzern dabei, kreative Texte zu entwickeln und zu verbessern.',
      },
      ...context.map(msg => ({
        role: 'user' as const,
        content: msg,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API error: ' + response.statusText);
      }

      const data = await response.json();
      onChunk(data.choices[0].message.content);
    } catch (error) {
      console.error('Chat service streaming error:', error);
      throw new Error('Entschuldigung, es gab ein Problem beim Streaming deiner Nachricht.');
    }
  }
} 