import { ChatMessage } from '@/types/chat';

export interface AnalysisResult {
  type: 'text' | 'image';
  prompt: string;
  confidence: number; // 0-1 indicating how confident we are this is a good prompt
  sourceContext: string; // Brief description of the source context
  tags: string[]; // Keywords or themes extracted from the conversation
  contentType?: string; // Specific type like "blog", "story", "product photo", etc.
}

interface AnalyzerMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface NarrativeElements {
  characters: string[];
  settings: string[];
  themes: string[];
  plotPoints: string[];
}

interface VisualElements {
  scenes: string[];
  objects: string[];
  people: string[];
  settings: string[];
  style: string;
  atmosphere: string;
}

export class ChatAnalyzer {
  /**
   * Analyzes the entire conversation and generates sophisticated prompts for content generation
   * @param messages Array of conversation messages to analyze
   * @returns Array of analysis results containing generation prompts
   */
  async analyzeConversation(messages: AnalyzerMessage[]): Promise<AnalysisResult[]> {
    // Skip if there's not enough conversation
    if (messages.length < 2) {
      return [];
    }

    const results: AnalysisResult[] = [];
    
    // Extract the entire conversation as one text for comprehensive analysis
    const fullConversation = this.getFullConversationText(messages);
    
    // Generate text content prompts (blog posts, articles, stories)
    results.push(...this.generateTextContentPrompts(fullConversation));
    
    // Generate image prompts based on visual concepts in the conversation
    results.push(...this.generateImagePrompts(fullConversation));
    
    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extracts the full conversation text
   */
  private getFullConversationText(messages: AnalyzerMessage[]): string {
    return messages
      .map(msg => `${msg.sender === 'user' ? 'Benutzer' : 'Assistent'}: ${msg.text}`)
      .join('\n');
  }

  /**
   * Generates sophisticated text content prompts based on the conversation
   */
  private generateTextContentPrompts(conversation: string): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    
    // Blog Post Analyse
    if (conversation.includes('Blog') || conversation.includes('Artikel')) {
      results.push({
        type: 'text',
        prompt: `Erstelle einen Blog-Beitrag basierend auf dieser Konversation: ${conversation}`,
        confidence: 0.8,
        sourceContext: 'Blog-Beitrag basierend auf der Konversation',
        tags: ['blog', 'artikel', 'text'],
        contentType: 'blog'
      });
    }

    // Story Analyse
    if (conversation.includes('Geschichte') || conversation.includes('Story')) {
      results.push({
        type: 'text',
        prompt: `Erstelle eine Geschichte basierend auf dieser Konversation: ${conversation}`,
        confidence: 0.7,
        sourceContext: 'Geschichte basierend auf der Konversation',
        tags: ['geschichte', 'story', 'text'],
        contentType: 'story'
      });
    }

    return results;
  }

  /**
   * Generates sophisticated image prompts based on the conversation
   */
  private generateImagePrompts(conversation: string): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    
    // Extrahiere visuelle Konzepte
    const visualConcepts = this.extractVisualConcepts(conversation);
    
    if (visualConcepts.length > 0) {
      results.push({
        type: 'image',
        prompt: `Erstelle ein Bild basierend auf diesen Konzepten: ${visualConcepts.join(', ')}`,
        confidence: 0.6,
        sourceContext: 'Bild basierend auf visuellen Konzepten aus der Konversation',
        tags: ['bild', 'visualisierung', 'image'],
        contentType: 'illustration'
      });
    }

    return results;
  }

  private extractVisualConcepts(conversation: string): string[] {
    const concepts: string[] = [];
    const visualKeywords = ['sehen', 'bild', 'foto', 'fotografie', 'illustration', 'design', 'farbe', 'stil'];
    
    const sentences = conversation.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (visualKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        concepts.push(sentence.trim());
      }
    });

    return concepts;
  }

  /**
   * Extracts main topics from the conversation
   */
  private extractMainTopics(text: string): string[] {
    // In a real implementation, this would use NLP for topic modeling
    // For simplicity, we'll use a keyword frequency approach
    
    // Remove common words and punctuation
    const cleanedText = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
      
    const words = cleanedText.split(' ');
    const stopWords = ['der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'ist', 'sind', 'war', 'ich', 'du', 'wir', 'sie', 'für', 'auf', 'mit', 'wie', 'was', 'wer', 'wo', 'wann', 'warum', 'kann', 'können', 'haben', 'hat', 'hatte', 'wenn', 'dann', 'also', 'nicht', 'kein', 'keine', 'über', 'unter', 'neben', 'auch', 'noch', 'nur', 'sehr', 'mal', 'schon', 'zu', 'von', 'aus', 'an', 'in', 'im', 'zum', 'zur', 'einen', 'einem', 'einer'];
    
    // Count word frequencies, excluding stop words and short words
    const wordCounts: {[key: string]: number} = {};
    for (const word of words) {
      if (word.length > 3 && !stopWords.includes(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    // Extract the most frequent words as topics
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }

  /**
   * Extracts elements that would be valuable for social media content
   */
  private extractSocialMediaRelevantTopics(text: string): string[] {
    const topics = this.extractMainTopics(text);
    
    // Filter for topics that would be engaging on social media
    // In a real implementation, this would use more sophisticated NLP
    const socialRelevantWords = ['trend', 'neu', 'aktuell', 'viral', 'tipp', 'hack', 'digital', 'social', 'medien', 'online', 'foto', 'bild'];
    
    const relevantTopics = topics.filter(topic => 
      socialRelevantWords.some(word => topic.includes(word))
    );
    
    // If we don't find explicitly social topics, return general topics
    return relevantTopics.length > 0 ? relevantTopics : topics.slice(0, 2);
  }

  /**
   * Detects if the conversation contains narrative elements (characters, plot, etc.)
   */
  private containsNarrativeElements(text: string): boolean {
    const narrativeIndicators = ['geschichte', 'erzählung', 'charakter', 'figur', 'held', 'heldin', 'protagonist', 'antagonist', 'handlung', 'plot', 'szene', 'kapitel', 'story'];
    
    return narrativeIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  /**
   * Extracts narrative elements from the conversation
   */
  private extractNarrativeElements(text: string): NarrativeElements {
    // In a real implementation, this would use sophisticated NLP
    // For now, we'll use a simplified approach with fallbacks
    
    // Default values if we can't extract specific elements
    return {
      characters: ['Hauptfigur'],
      settings: ['moderne'],
      themes: ['Wachstum', 'Veränderung'],
      plotPoints: ['eine interessante Entwicklung']
    };
  }

  /**
   * Extracts visual elements from the conversation
   */
  private extractVisualElements(text: string): VisualElements {
    // In a real implementation, this would use sophisticated NLP
    // For now, we'll use a simplified approach with fallbacks
    
    // Default values if we can't extract specific elements
    return {
      scenes: ['Szene'],
      objects: ['Objekt'],
      people: [],
      settings: ['Umgebung'],
      style: 'moderner',
      atmosphere: 'natürliche'
    };
  }
}