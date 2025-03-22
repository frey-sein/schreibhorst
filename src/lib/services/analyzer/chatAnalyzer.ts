interface Message {
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface AnalysisResult {
  type: 'text' | 'image';
  prompt: string;
  confidence: number; // 0-1 indicating how confident we are this is a good prompt
  sourceContext: string; // Brief description of the source context
  tags: string[]; // Keywords or themes extracted from the conversation
  contentType?: string; // Specific type like "blog", "story", "product photo", etc.
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
    results.push(...this.generateTextContentPrompts(fullConversation, messages));
    
    // Generate image prompts based on visual concepts in the conversation
    results.push(...this.generateImagePrompts(fullConversation, messages));
    
    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extracts the full conversation text
   */
  private getFullConversationText(messages: Message[]): string {
    // Focus mainly on user messages as they contain the user's intent and interests
    return messages
      .map(m => m.text)
      .join("\n\n");
  }

  /**
   * Generates sophisticated text content prompts based on the conversation
   */
  private generateTextContentPrompts(conversationText: string, messages: Message[]): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const mainTopics = this.extractMainTopics(conversationText);
    
    // Generate blog post prompt
    if (mainTopics.length > 0) {
      const topicString = mainTopics.slice(0, 3).join(", ");
      results.push({
        type: 'text',
        prompt: `Write an informative blog post about ${topicString}. Include key facts, insights, and practical applications.`,
        confidence: 0.85,
        sourceContext: "Main topics from conversation",
        tags: mainTopics,
        contentType: "blog"
      });
    }
    
    // Generate story prompt if the conversation has narrative elements
    if (this.containsNarrativeElements(conversationText)) {
      const narrativeElements = this.extractNarrativeElements(conversationText);
      results.push({
        type: 'text',
        prompt: `Write a short story featuring ${narrativeElements.characters.join(", ")} in a ${narrativeElements.setting} setting. The story should involve ${narrativeElements.plot}.`,
        confidence: 0.75,
        sourceContext: "Narrative elements from conversation",
        tags: [...narrativeElements.characters, narrativeElements.setting, ...narrativeElements.themes],
        contentType: "story"
      });
    }
    
    // Generate article prompt with specific structure
    if (mainTopics.length > 0) {
      results.push({
        type: 'text',
        prompt: `Create a structured article on ${mainTopics[0]} with an introduction, 3-4 main sections, and a conclusion. Include relevant facts and examples.`,
        confidence: 0.8,
        sourceContext: "Primary topic from conversation",
        tags: [mainTopics[0], "article", "structured"],
        contentType: "article"
      });
    }
    
    // Generate social media post
    const socialTags = this.extractSocialMediaRelevantTopics(conversationText);
    if (socialTags.length > 0) {
      results.push({
        type: 'text',
        prompt: `Write an engaging social media post about ${socialTags.slice(0, 2).join(" and ")}. Make it concise, engaging, and shareable.`,
        confidence: 0.7,
        sourceContext: "Social media relevant topics",
        tags: [...socialTags, "social media"],
        contentType: "social post"
      });
    }
    
    return results;
  }

  /**
   * Generates sophisticated image prompts based on the conversation
   */
  private generateImagePrompts(conversationText: string, messages: Message[]): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    
    // Extract visual elements from the conversation
    const visualElements = this.extractVisualElements(conversationText);
    const mainTopics = this.extractMainTopics(conversationText);
    
    // Generate a detailed scene prompt
    if (visualElements.scenes.length > 0) {
      const mainScene = visualElements.scenes[0];
      results.push({
        type: 'image',
        prompt: `${mainScene} with ${visualElements.objects.slice(0, 2).join(" and ")}. ${visualElements.style} style, detailed, high quality.`,
        confidence: 0.9,
        sourceContext: "Visual scene from conversation",
        tags: [mainScene, ...visualElements.objects, visualElements.style],
        contentType: "scene"
      });
    }
    
    // Generate concept illustration
    if (mainTopics.length > 0) {
      results.push({
        type: 'image',
        prompt: `Conceptual illustration representing ${mainTopics[0]}. Modern, clean design with symbolic elements. ${visualElements.style || "Minimalist"} style.`,
        confidence: 0.8,
        sourceContext: "Main concept from conversation",
        tags: [mainTopics[0], "conceptual", "illustration"],
        contentType: "concept"
      });
    }
    
    // Generate portrait/character prompt if people were discussed
    if (visualElements.people.length > 0) {
      const person = visualElements.people[0];
      results.push({
        type: 'image',
        prompt: `Portrait of ${person} in a ${visualElements.settings[0] || "professional"} setting. ${visualElements.style || "Realistic"} style, high detail.`,
        confidence: 0.75,
        sourceContext: "Person referenced in conversation",
        tags: [person, "portrait", visualElements.style || "realistic"],
        contentType: "portrait"
      });
    }
    
    // Generate landscape/setting prompt
    if (visualElements.settings.length > 0) {
      const setting = visualElements.settings[0];
      results.push({
        type: 'image',
        prompt: `${setting} landscape with ${visualElements.atmosphere || "natural lighting"}. ${visualElements.style || "Photorealistic"} style, panoramic view.`,
        confidence: 0.85,
        sourceContext: "Setting mentioned in conversation",
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
  private extractNarrativeElements(text: string): {
    characters: string[],
    setting: string,
    plot: string,
    themes: string[]
  } {
    // In a real implementation, this would use sophisticated NLP
    // For now, we'll use a simplified approach with fallbacks
    
    // Default values if we can't extract specific elements
    const defaults = {
      characters: ['a protagonist', 'a supporting character'],
      setting: 'modern-day urban',
      plot: 'overcoming a personal challenge',
      themes: ['growth', 'change']
    };
    
    // Extract potential character names (capitalized words)
    const characterRegex = /\b[A-Z][a-z]+\b/g;
    const potentialCharacters = text.match(characterRegex) || [];
    
    // Extract potential settings
    const settingWords = ['haus', 'stadt', 'dorf', 'wald', 'berg', 'fluss', 'meer', 'schule', 'büro', 'land', 'welt', 'universum', 'zukunft', 'vergangenheit'];
    const settings = settingWords.filter(word => text.toLowerCase().includes(word));
    
    // Extract potential plot elements
    const plotWords = ['problem', 'konflikt', 'herausforderung', 'quest', 'reise', 'abenteuer', 'kampf', 'überwindung', 'entdeckung'];
    const plots = plotWords.filter(word => text.toLowerCase().includes(word));
    
    // Extract potential themes
    const themeWords = ['liebe', 'freundschaft', 'vertrauen', 'betrug', 'hoffnung', 'verzweiflung', 'mut', 'angst', 'erfolg', 'scheitern'];
    const themes = themeWords.filter(word => text.toLowerCase().includes(word));
    
    return {
      characters: potentialCharacters.length > 0 ? potentialCharacters.slice(0, 2) : defaults.characters,
      setting: settings.length > 0 ? settings[0] : defaults.setting,
      plot: plots.length > 0 ? plots[0] : defaults.plot,
      themes: themes.length > 0 ? themes : defaults.themes
    };
  }

  /**
   * Extracts visual elements that would be useful for image generation
   */
  private extractVisualElements(text: string): {
    scenes: string[],
    objects: string[],
    people: string[],
    settings: string[],
    atmosphere: string,
    style: string
  } {
    // In a real implementation, this would use sophisticated NLP
    // For this simplified version, we'll use keyword matching
    
    const lowercaseText = text.toLowerCase();
    
    // Common visual scenes 
    const sceneWords = ['landschaft', 'strand', 'berge', 'stadt', 'dorf', 'wald', 'büro', 'zimmer', 'garten', 'straße'];
    const scenes = sceneWords.filter(word => lowercaseText.includes(word));
    
    // Common visual objects
    const objectWords = ['tisch', 'stuhl', 'buch', 'telefon', 'computer', 'baum', 'blume', 'auto', 'haus', 'brücke', 'fenster', 'tür'];
    const objects = objectWords.filter(word => lowercaseText.includes(word));
    
    // People references
    const peopleWords = ['mann', 'frau', 'kind', 'junge', 'mädchen', 'person', 'gruppe', 'familie', 'freunde'];
    const people = peopleWords.filter(word => lowercaseText.includes(word));
    
    // Settings
    const settingWords = ['innen', 'außen', 'natur', 'stadt', 'nacht', 'tag', 'morgen', 'abend', 'winter', 'sommer', 'frühling', 'herbst'];
    const settings = settingWords.filter(word => lowercaseText.includes(word));
    
    // Atmosphere
    const atmosphereWords = ['hell', 'dunkel', 'neblig', 'sonnig', 'regnerisch', 'warm', 'kalt', 'mystisch', 'friedlich', 'chaotisch'];
    const atmosphere = atmosphereWords.find(word => lowercaseText.includes(word)) || '';
    
    // Visual style
    const styleWords = ['realistisch', 'abstrakt', 'cartoon', 'skizze', 'fotorealistisch', 'minimalistisch', 'vintage', 'futuristisch', 'retro'];
    const style = styleWords.find(word => lowercaseText.includes(word)) || 'photorealistic';
    
    return {
      scenes: scenes.length > 0 ? scenes : ['landscape'],
      objects: objects.length > 0 ? objects : ['natural elements'],
      people: people,
      settings: settings.length > 0 ? settings : ['outdoor'],
      atmosphere,
      style
    };
  }
}