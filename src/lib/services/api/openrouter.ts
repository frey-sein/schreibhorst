import { MessageRole } from '@/types/chat';

interface ChatCompletionOptions {
  model: string;
  messages: Array<{ role: MessageRole; content: string }>;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
}

interface ChatCompletions {
  create: (options: ChatCompletionOptions) => Promise<void>;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      console.error('OpenRouter API Key nicht gefunden');
      throw new Error('OpenRouter API Key nicht gefunden');
    }
    
    console.log('OpenRouterClient initialisiert mit Base URL:', this.baseUrl);
  }

  public chat: { completions: ChatCompletions } = {
    completions: {
      create: async ({ model, messages, stream = true, onChunk, onError }: ChatCompletionOptions): Promise<void> => {
        console.log('Sende Anfrage an OpenRouter:', { model, messages });
        
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
              model,
              messages,
              stream,
              temperature: 0.7,
              max_tokens: 1000
            })
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter API-Fehler:', {
              status: response.status,
              statusText: response.statusText,
              data: errorData
            });
            throw new Error(`API-Fehler: ${response.status} - ${errorData}`);
          }

          if (stream && response.body) {
            console.log('Starte Stream-Verarbeitung');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log('Stream beendet');
                break;
              }

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim() !== '');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices?.[0]?.delta?.content) {
                      const content = parsed.choices[0].delta.content;
                      console.log('Empfangener Chunk:', content);
                      onChunk?.(content);
                    }
                  } catch (e) {
                    console.error('Fehler beim Parsen der Chunk-Daten:', e);
                    onError?.(e as Error);
                  }
                }
              }
            }
          } else {
            console.log('Verarbeite nicht-gestreamte Antwort');
            const data = await response.json();
            if (data.choices?.[0]?.message?.content) {
              const content = data.choices[0].message.content;
              console.log('Empfangene Antwort:', content);
              onChunk?.(content);
            } else {
              throw new Error('Ungültiges Antwortformat von OpenRouter');
            }
          }
        } catch (error) {
          console.error('OpenRouter Client Fehler:', error);
          onError?.(error as Error);
          throw error;
        }
      }
    }
  };
} 