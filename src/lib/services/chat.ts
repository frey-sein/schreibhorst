import { OpenRouterClient } from '../api/openrouter';
import { ChatMessage } from '@/types/chat';
import { CHAT_CONSTANTS } from '@/lib/constants/chat';

export class ChatService {
  private static instance: ChatService;
  private client: OpenRouterClient | null = null;
  private messageHistories: { [chatId: string]: ChatMessage[] } = {};

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

  async sendMessage(message: string, model: string = 'openai/gpt-3.5-turbo', chatId: string = 'default', deepResearch: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let hasReceivedContent = false;
      
      console.log('Starting message send with model:', model);
      console.log('Deep Research mode:', deepResearch ? 'Enabled' : 'Disabled');
      
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
        },
        chatId,
        deepResearch
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
    onError: (error: Error) => void,
    chatId: string = 'default',
    deepResearch: boolean = false,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    try {
      // Hole die Nachrichtenhistorie für diesen spezifischen Chat
      const messageHistory = this.messageHistories[chatId] || [];
      
      // Filtere die Willkommensnachricht und Systemnachrichten aus der Historie
      const filteredHistory = messageHistory.filter(msg => 
        msg.id !== 'welcome' && 
        (msg.sender === 'user' || msg.sender === 'assistant') && 
        msg.text.trim() !== ''
      );
      
      // Konvertiere die Nachrichtenhistorie in das richtige Format
      const conversationHistory = filteredHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

      // Wähle den passenden System-Prompt basierend auf dem Deep Research Modus
      const systemPrompt = deepResearch 
        ? CHAT_CONSTANTS.DEEP_RESEARCH_PROMPT 
        : CHAT_CONSTANTS.SYSTEM_PROMPT;

      // Füge System-Prompt und die aktuelle Nachricht hinzu
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        {
          role: 'user' as const,
          content: message
        }
      ];

      // Speichere nach dem Empfang auch die Antwort in der Historie
      let aiResponse = '';
      
      // Sende die Nachricht an die API mit dem erweiterten Handler und dem AbortSignal
      await this.getClient().streamChat(
        messages,
        model,
        (chunk) => {
          // Prüfen, ob abgebrochen wurde, bevor wir den Chunk verarbeiten
          if (options?.signal?.aborted) {
            return;
          }
          
          aiResponse += chunk;
          onChunk(chunk);
        },
        onError,
        { signal: options?.signal } // Hier geben wir das Signal weiter
      );

      // Wenn abgebrochen wurde, nicht in die Historie speichern
      if (options?.signal?.aborted) {
        return;
      }

      // Speichere die Nachricht im Verlauf für diesen spezifischen Chat
      const newUserMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString()
      };

      this.messageHistories[chatId] = [...messageHistory, newUserMessage];
      
      // Nach Abschluss der Antwort auch die KI-Antwort speichern
      if (aiResponse.trim() !== '') {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        this.messageHistories[chatId] = [...this.messageHistories[chatId], aiMessage];
      }
    } catch (error: any) {
      console.error('Stream error:', error);
      
      // Prüfen ob der Fehler ein AbortError ist
      if (error.name === 'AbortError' || error.message === 'AbortError') {
        console.log('Request aborted');
        // Bei abort trotzdem den error-Handler aufrufen
        onError(new Error('AbortError'));
        return;
      }
      
      onError(error as Error);
    }
  }

  // Neue Methode zum Senden einer Datei
  async sendFileMessage(
    message: string,
    file: File,
    model: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    chatId: string = 'default',
    options?: { signal?: AbortSignal }
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

      // Hole die Nachrichtenhistorie für diesen spezifischen Chat
      const messageHistory = this.messageHistories[chatId] || [];
      
      // Speichere die Nachricht im Verlauf für diesen spezifischen Chat
      const newUserMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString()
      };

      this.messageHistories[chatId] = [...messageHistory, newUserMessage];

      // ... rest of the method ...
      
      // Hier würde die tatsächliche Dateiverarbeitung und API-Anfrage stattfinden
      // Füge AbortController-Unterstützung hinzu 
      
      // Beispiel wie wir einen Stream mit AbortController handlen würden:
      const response = await fetch('/api/someEndpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, file }),
        signal: options?.signal // Hier verwenden wir das Signal
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Stream-Verarbeitung ähnlich wie in streamMessage
      // ...

    } catch (error: any) {
      console.error('Stream error:', error);
      
      // Prüfen ob der Fehler ein AbortError ist
      if (error.name === 'AbortError' || error.message === 'AbortError') {
        console.log('File request aborted');
        // Bei abort trotzdem den error-Handler aufrufen
        onError(new Error('AbortError'));
        return;
      }
      
      onError(error as Error);
    }
  }

  // Neue Methode zum Setzen der Nachrichtenhistorie für einen Chat
  public setMessageHistory(chatId: string, messages: ChatMessage[]): void {
    this.messageHistories[chatId] = messages;
  }

  // Neue Methode zum Abrufen der Nachrichtenhistorie für einen Chat
  public getMessageHistory(chatId: string): ChatMessage[] {
    return this.messageHistories[chatId] || [];
  }

  // Lädt Chatdaten aus dem localStorage
  public async loadFromLocalStorage(chatId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const storedData = localStorage.getItem('chat-store');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (parsedData.state && parsedData.state.messages) {
          this.messageHistories[chatId] = parsedData.state.messages;
          console.log(`Chat-Verlauf für ${chatId} aus localStorage geladen`);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Chatverlaufs:', error);
      }
    }
  }

  // Speichert Chatdaten im localStorage
  public async saveToLocalStorage(chatId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const currentStore = localStorage.getItem('chat-store');
      const storeData = currentStore ? JSON.parse(currentStore) : { state: {} };
      
      storeData.state.messages = this.messageHistories[chatId];
      localStorage.setItem('chat-store', JSON.stringify(storeData));
      console.log(`Chat-Verlauf für ${chatId} in localStorage gespeichert`);
    } catch (error) {
      console.error('Fehler beim Speichern des Chatverlaufs:', error);
    }
  }

  // Löscht einen Chat aus der Historie
  public deleteChat(chatId: string): void {
    if (this.messageHistories[chatId]) {
      delete this.messageHistories[chatId];
      console.log(`Chat ${chatId} aus der Historie gelöscht`);
    }
  }

  // Holt alle Chat-IDs
  public getAllChatIds(): string[] {
    return Object.keys(this.messageHistories);
  }
}