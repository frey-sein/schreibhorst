import { Message } from '@/lib/store/chatHistoryStore';

export interface AnalysisResult {
  type: 'text' | 'image';
  prompt: string;
  confidence: number; // 0-1 indicating how confident we are this is a good prompt
  sourceContext: string; // Brief description of the source context
  tags: string[]; // Keywords or themes extracted from the conversation
  contentType?: string; // Specific type like "blog", "story", "product photo", etc.
}

interface NarrativeElements {
  characters: string[];
  setting: string;
  plot: string;
  themes: string[];
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
  analyzeConversation(messages: Message[]): AnalysisResult[] {
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
  private getFullConversationText(messages: Message[]): string {
    // Focus mainly on user messages as they contain the user's intent and interests
    return messages.map(m => m.content).join("\n\n");
  }

  /**
   * Generates sophisticated text content prompts based on the conversation
   */
  private generateTextContentPrompts(conversationText: string): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const mainTopics = this.extractMainTopics(conversationText);
    
    // Generate blog post prompt
    if (mainTopics.length > 0) {
      const topicString = mainTopics.slice(0, 3).join(", ");
      results.push({
        type: 'text',
        prompt: `Schreibe einen informativen Blogbeitrag über ${topicString}. Füge wichtige Fakten, Erkenntnisse und praktische Anwendungen ein.`,
        confidence: 0.85,
        sourceContext: "Hauptthemen aus der Konversation",
        tags: mainTopics,
        contentType: "blog"
      });
    }
    
    // Generate story prompt if the conversation has narrative elements
    if (this.containsNarrativeElements(conversationText)) {
      const narrativeElements = this.extractNarrativeElements(conversationText);
      results.push({
        type: 'text',
        prompt: `Schreibe eine kurze Geschichte mit ${narrativeElements.characters.join(", ")} in einer ${narrativeElements.setting} Umgebung. Die Geschichte sollte ${narrativeElements.plot} beinhalten.`,
        confidence: 0.75,
        sourceContext: "Narrative Elemente aus der Konversation",
        tags: [...narrativeElements.characters, narrativeElements.setting, ...narrativeElements.themes],
        contentType: "story"
      });
    }
    
    // Generate article prompt with specific structure
    if (mainTopics.length > 0) {
      results.push({
        type: 'text',
        prompt: `Erstelle einen strukturierten Artikel über ${mainTopics[0]} mit einer Einleitung, 3-4 Hauptabschnitten und einem Fazit. Füge relevante Fakten und Beispiele ein.`,
        confidence: 0.8,
        sourceContext: "Hauptthema aus der Konversation",
        tags: [mainTopics[0], "article", "structured"],
        contentType: "article"
      });
    }
    
    // Generate social media post
    const socialTags = this.extractSocialMediaRelevantTopics(conversationText);
    if (socialTags.length > 0) {
      results.push({
        type: 'text',
        prompt: `Schreibe einen ansprechenden Social-Media-Beitrag über ${socialTags.slice(0, 2).join(" und ")}. Mache ihn prägnant, ansprechend und teilbar.`,
        confidence: 0.7,
        sourceContext: "Social Media relevante Themen",
        tags: [...socialTags, "social media"],
        contentType: "social post"
      });
    }
    
    return results;
  }

  /**
   * Generates sophisticated image prompts based on the conversation
   */
  private generateImagePrompts(conversationText: string): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    
    // Extract visual elements from the conversation
    const visualElements = this.extractVisualElements(conversationText);
    const mainTopics = this.extractMainTopics(conversationText);
    
    // Generate a detailed scene prompt
    if (visualElements.scenes.length > 0) {
      const mainScene = visualElements.scenes[0];
      results.push({
        type: 'image',
        prompt: `${mainScene} mit ${visualElements.objects.slice(0, 2).join(" und ")}. ${visualElements.style} Stil, detailliert, hochwertig.`,
        confidence: 0.9,
        sourceContext: "Visuelle Szene aus der Konversation",
        tags: [mainScene, ...visualElements.objects, visualElements.style],
        contentType: "scene"
      });
    }
    
    // Generate concept illustration
    if (mainTopics.length > 0) {
      results.push({
        type: 'image',
        prompt: `Konzeptuelle Illustration von ${mainTopics[0]}. Modernes, klares Design mit symbolischen Elementen. ${visualElements.style || "Minimalistischer"} Stil.`,
        confidence: 0.8,
        sourceContext: "Hauptkonzept aus der Konversation",
        tags: [mainTopics[0], "conceptual", "illustration"],
        contentType: "concept"
      });
    }
    
    // Generate portrait/character prompt if people were discussed
    if (visualElements.people.length > 0) {
      const person = visualElements.people[0];
      results.push({
        type: 'image',
        prompt: `Porträt von ${person} in einer ${visualElements.settings[0] || "professionellen"} Umgebung. ${visualElements.style || "Realistischer"} Stil, hohe Detailgenauigkeit.`,
        confidence: 0.75,
        sourceContext: "Person aus der Konversation",
        tags: [person, "portrait", visualElements.style || "realistic"],
        contentType: "portrait"
      });
    }
    
    // Generate landscape/setting prompt
    if (visualElements.settings.length > 0) {
      const setting = visualElements.settings[0];
      results.push({
        type: 'image',
        prompt: `${setting} Landschaft mit ${visualElements.atmosphere || "natürlicher Beleuchtung"}. ${visualElements.style || "Fotorealistischer"} Stil, Panoramaansicht.`,
        confidence: 0.85,
        sourceContext: "Schauplatz aus der Konversation",
        tags: [setting, "landscape", visualElements.atmosphere || "natural"],
        contentType: "landscape"
      });
    }
    
    return results;
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
      setting: 'moderne',
      plot: 'eine interessante Entwicklung',
      themes: ['Wachstum', 'Veränderung']
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