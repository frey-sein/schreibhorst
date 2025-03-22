import { OpenRouterClient } from '../api/openrouter';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
      const apiUrl = this.getApiUrl();
      console.log('Sending request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(`API error response: ${JSON.stringify(errorData)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('No response body available');
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let hasProcessedData = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream reading completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Raw chunk received:', chunk);
          
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              console.log('Processing data line:', data);
              
              if (data === '[DONE]') {
                console.log('Received [DONE] signal');
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  console.log('Processing content chunk:', content);
                  hasProcessedData = true;
                  onChunk(content);
                }
              } catch (e) {
                console.error('Error parsing JSON data:', e);
                console.error('Problematic data:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!hasProcessedData) {
        console.error('No data was processed during stream');
        throw new Error('Keine Daten während des Streams verarbeitet');
      }
    } catch (error) {
      console.error('Chat service error:', error);
      onError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }
} 