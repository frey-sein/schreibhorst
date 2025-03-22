interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  stream?: boolean;
}

export class OpenRouterClient {
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey?: string) {
    // In browser context, apiKey will be passed in from the server
    // In server context, we can use the environment variable directly
    if (typeof window !== 'undefined' && !apiKey) {
      throw new Error('OPENROUTER_API_KEY ist nicht konfiguriert');
    } else if (typeof window === 'undefined' && !process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY ist nicht konfiguriert');
    }
    
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.apiBase = process.env.NEXT_PUBLIC_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
  }

  async createChatCompletion(request: ChatCompletionRequest) {
    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://schreibhorst.ai',
        'X-Title': 'Schreibhorst',
      },
      body: JSON.stringify({
        ...request,
        model: request.model || process.env.NEXT_PUBLIC_DEFAULT_MODEL,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async streamChatCompletion(request: ChatCompletionRequest) {
    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://schreibhorst.ai',
        'X-Title': 'Schreibhorst',
      },
      body: JSON.stringify({
        ...request,
        model: request.model || process.env.NEXT_PUBLIC_DEFAULT_MODEL,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return response.body;
  }
} 