import { AnalysisResult } from './analyzer/chatAnalyzer';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export class AnalyzerService {
  /**
   * Analyzes a conversation by calling the analyzer API
   * @param messages The messages to analyze
   * @returns A list of sophisticated generation prompts for text and images
   */
  async analyzeConversation(messages: Message[]): Promise<AnalysisResult[]> {
    try {
      // Format the messages for the API (stringify Date objects)
      const formattedMessages = messages.map(msg => ({
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString()
      }));
      
      const response = await fetch('/api/analyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formattedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Analyzer API error: ' + response.statusText);
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Analyzer service error:', error);
      throw new Error('Fehler bei der Analyse der Konversation.');
    }
  }
}