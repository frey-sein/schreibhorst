import { OpenRouterClient } from '../api/openrouter';
import { ChatMessage } from '@/types/chat';

export class ChatService {
  private static instance: ChatService;
  private client: OpenRouterClient | null = null;

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
      const client = this.getClient();
      const response = await client.streamChatCompletion({
        messages: [{ role: 'user', content: message }],
        model,
        temperature: 0.7,
        stream: true
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error response: ${JSON.stringify(errorData)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                onChunk(parsed.choices[0].delta.content);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat service error:', error);
      onError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }
} 