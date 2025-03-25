import { ChatMessage } from '@/types/chat';

export interface AnalysisResult {
  type: 'text' | 'image';
  prompt: string;
  confidence: number; // 0-1 indicating how confident we are this is a good prompt
  sourceContext: string; // Brief description of the source context
  tags: string[]; // Keywords or themes extracted from the conversation
  contentType?: string; // Specific type like "blog", "story", "product photo", etc.
  eeatScore?: number; // Score von 0-1 für EEAT-Konformität
  wordEstimate?: number; // Geschätzte Wortanzahl des generierten Contents
  requiredContext?: string[]; // Fehlende Kontextinformationen
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

interface ContentQualityMetrics {
  topicDepth: number; // 0-1: Wie tief wird das Thema diskutiert
  expertiseLevel: number; // 0-1: Erkennbares Fachwissen
  contextCompleteness: number; // 0-1: Vollständigkeit des Kontexts
  informationDensity: number; // 0-1: Dichte der relevanten Informationen
  missingContext: string[]; // Fehlende wichtige Kontextinformationen
}

export class ChatAnalyzer {
  private readonly MIN_MESSAGES_FOR_ANALYSIS = 3;
  private readonly MIN_EEAT_SCORE = 0.6;
  private readonly MIN_WORDS_FOR_CONTENT = 100;

  /**
   * Analyzes the entire conversation and generates sophisticated prompts for content generation
   * @param messages Array of conversation messages to analyze
   * @returns Array of analysis results containing generation prompts
   */
  async analyzeConversation(messages: AnalyzerMessage[]): Promise<AnalysisResult[]> {
    // Prüfe ob genügend Nachrichten für eine sinnvolle Analyse vorhanden sind
    if (messages.length < this.MIN_MESSAGES_FOR_ANALYSIS) {
      return [{
        type: 'text',
        prompt: '',
        confidence: 0,
        sourceContext: 'Unzureichende Konversation',
        tags: [],
        eeatScore: 0,
        requiredContext: ['Mehr Konversationstiefe benötigt'],
        wordEstimate: 0
      }];
    }

    const fullConversation = this.getFullConversationText(messages);
    const qualityMetrics = this.analyzeContentQuality(fullConversation);
    
    // Wenn die Qualitätsmetriken zu niedrig sind, gebe Feedback zurück
    if (qualityMetrics.topicDepth < 0.4 || qualityMetrics.contextCompleteness < 0.4) {
      return [{
        type: 'text',
        prompt: '',
        confidence: 0,
        sourceContext: 'Unzureichende Informationstiefe',
        tags: [],
        eeatScore: qualityMetrics.topicDepth,
        requiredContext: qualityMetrics.missingContext,
        wordEstimate: this.estimateWordCount(fullConversation)
      }];
    }

    const results: AnalysisResult[] = [];
    
    // Generiere Text-Content-Prompts
    const textPrompts = this.generateTextContentPrompts(fullConversation, qualityMetrics);
    results.push(...textPrompts);
    
    // Generiere Bild-Prompts
    const imagePrompts = this.generateImagePrompts(fullConversation, qualityMetrics);
    results.push(...imagePrompts);
    
    // Filtere Ergebnisse nach EEAT-Score
    const validResults = results.filter(result => 
      (result.eeatScore || 0) >= this.MIN_EEAT_SCORE &&
      (result.wordEstimate || 0) >= this.MIN_WORDS_FOR_CONTENT
    );

    return validResults.length > 0 ? validResults : [{
      type: 'text',
      prompt: '',
      confidence: 0,
      sourceContext: 'Unzureichende EEAT-Qualität',
      tags: [],
      eeatScore: Math.max(...results.map(r => r.eeatScore || 0)),
      requiredContext: ['Mehr Fachexpertise benötigt', 'Mehr Autoritätsquellen benötigt'],
      wordEstimate: Math.max(...results.map(r => r.wordEstimate || 0))
    }];
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
   * Analysiert die Qualität des potentiellen Contents
   */
  private analyzeContentQuality(conversation: string): ContentQualityMetrics {
    const metrics: ContentQualityMetrics = {
      topicDepth: 0,
      expertiseLevel: 0,
      contextCompleteness: 0,
      informationDensity: 0,
      missingContext: []
    };

    // Analysiere Thementiefe
    const topics = this.extractMainTopics(conversation);
    metrics.topicDepth = this.calculateTopicDepth(conversation, topics);

    // Prüfe auf Fachbegriffe und Expertise
    metrics.expertiseLevel = this.analyzeExpertiseLevel(conversation);

    // Bewerte Kontextvollständigkeit
    const contextAnalysis = this.analyzeContextCompleteness(conversation);
    metrics.contextCompleteness = contextAnalysis.completeness;
    metrics.missingContext = contextAnalysis.missingElements;

    // Berechne Informationsdichte
    metrics.informationDensity = this.calculateInformationDensity(conversation);

    return metrics;
  }

  /**
   * Generiert Text-Content-Prompts basierend auf der Konversation
   */
  private generateTextContentPrompts(
    conversation: string, 
    metrics: ContentQualityMetrics
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const topics = this.extractMainTopics(conversation);
    
    // Blog-Post-Analyse
    if (this.canGenerateBlogPost(conversation, metrics)) {
      results.push({
        type: 'text',
        prompt: this.generateBlogPrompt(conversation, topics),
        confidence: metrics.topicDepth * metrics.contextCompleteness,
        sourceContext: 'Blog-Beitrag basierend auf Fachgespräch',
        tags: [...topics, 'blog', 'artikel'],
        contentType: 'blog',
        eeatScore: (metrics.expertiseLevel + metrics.contextCompleteness) / 2,
        wordEstimate: this.estimateWordCount(conversation) * 1.5
      });
    }

    // Artikel-Analyse
    if (this.canGenerateArticle(conversation, metrics)) {
      results.push({
        type: 'text',
        prompt: this.generateArticlePrompt(conversation, topics),
        confidence: metrics.expertiseLevel * metrics.informationDensity,
        sourceContext: 'Fachartikel basierend auf Expertengespräch',
        tags: [...topics, 'artikel', 'fachbeitrag'],
        contentType: 'article',
        eeatScore: metrics.expertiseLevel,
        wordEstimate: this.estimateWordCount(conversation) * 2
      });
    }

    // Tutorial/Guide-Analyse
    if (this.canGenerateTutorial(conversation, metrics)) {
      results.push({
        type: 'text',
        prompt: this.generateTutorialPrompt(conversation, topics),
        confidence: metrics.contextCompleteness * metrics.informationDensity,
        sourceContext: 'Praxisanleitung basierend auf Fachdiskussion',
        tags: [...topics, 'tutorial', 'anleitung'],
        contentType: 'tutorial',
        eeatScore: (metrics.expertiseLevel + metrics.contextCompleteness) / 2,
        wordEstimate: this.estimateWordCount(conversation) * 1.8
      });
    }

    return results;
  }

  /**
   * Prüft ob genügend Informationen für einen Blog-Post vorhanden sind
   */
  private canGenerateBlogPost(conversation: string, metrics: ContentQualityMetrics): boolean {
    return metrics.topicDepth >= 0.6 && 
           metrics.contextCompleteness >= 0.5 &&
           this.estimateWordCount(conversation) >= 200;
  }

  /**
   * Prüft ob genügend Expertise für einen Fachartikel vorhanden ist
   */
  private canGenerateArticle(conversation: string, metrics: ContentQualityMetrics): boolean {
    return metrics.expertiseLevel >= 0.7 && 
           metrics.informationDensity >= 0.6 &&
           this.estimateWordCount(conversation) >= 300;
  }

  /**
   * Prüft ob genügend praktische Informationen für ein Tutorial vorhanden sind
   */
  private canGenerateTutorial(conversation: string, metrics: ContentQualityMetrics): boolean {
    return metrics.contextCompleteness >= 0.7 && 
           metrics.informationDensity >= 0.5 &&
           this.hasStepByStepStructure(conversation);
  }

  /**
   * Generiert einen spezifischen Blog-Post-Prompt
   */
  private generateBlogPrompt(conversation: string, topics: string[]): string {
    return `Erstelle einen informativen Blog-Beitrag über ${topics.join(', ')}. 
    Nutze folgende Kernpunkte aus der Konversation:
    ${this.extractKeyPoints(conversation).join('\n')}
    
    Wichtig:
    - Verwende einen engagierten, aber professionellen Schreibstil
    - Füge praktische Beispiele und Anwendungsfälle ein
    - Strukturiere den Text mit klaren Überschriften
    - Schließe mit einem Fazit oder Handlungsempfehlungen`;
  }

  /**
   * Generiert einen spezifischen Artikel-Prompt
   */
  private generateArticlePrompt(conversation: string, topics: string[]): string {
    return `Erstelle einen fundierten Fachartikel über ${topics.join(', ')}.
    Basiere den Inhalt auf diesen Expertendiskussionen:
    ${this.extractExpertKnowledge(conversation).join('\n')}
    
    Anforderungen:
    - Wissenschaftlicher, faktenbasierter Stil
    - Klare Quellenverweise und Begründungen
    - Tiefgehende Analyse der Zusammenhänge
    - Professionelle Fachsprache`;
  }

  /**
   * Generiert einen spezifischen Tutorial-Prompt
   */
  private generateTutorialPrompt(conversation: string, topics: string[]): string {
    return `Erstelle eine praktische Schritt-für-Schritt-Anleitung für ${topics.join(', ')}.
    Verwende diese praktischen Erkenntnisse:
    ${this.extractPracticalSteps(conversation).join('\n')}
    
    Wichtige Elemente:
    - Klare, nachvollziehbare Schritte
    - Praktische Tipps und Warnhinweise
    - Konkrete Beispiele
    - Troubleshooting-Hinweise`;
  }

  /**
   * Berechnet die Thementiefe basierend auf Schlüsselwörtern und Kontext
   */
  private calculateTopicDepth(conversation: string, topics: string[]): number {
    let depth = 0;
    const sentences = conversation.split(/[.!?]+/);
    
    // Zähle relevante Sätze pro Thema
    topics.forEach(topic => {
      const relevantSentences = sentences.filter(sentence => 
        sentence.toLowerCase().includes(topic.toLowerCase())
      );
      depth += relevantSentences.length / sentences.length;
    });
    
    return Math.min(depth / topics.length, 1);
  }

  /**
   * Analysiert das Expertenniveau basierend auf Fachbegriffen und Erklärungen
   */
  private analyzeExpertiseLevel(conversation: string): number {
    const technicalTerms = this.extractTechnicalTerms(conversation);
    const explanationQuality = this.analyzeExplanationQuality(conversation);
    
    return (technicalTerms.length / 20 + explanationQuality) / 2;
  }

  /**
   * Analysiert die Vollständigkeit des Kontexts
   */
  private analyzeContextCompleteness(conversation: string): {
    completeness: number;
    missingElements: string[];
  } {
    const missingElements: string[] = [];
    let completeness = 1;

    // Prüfe auf wichtige Kontextelemente
    const contextElements = [
      { name: 'Zielgruppe', pattern: /für wen|zielgruppe|nutzer|anwender/i },
      { name: 'Zweck', pattern: /warum|zweck|ziel|nutzen/i },
      { name: 'Voraussetzungen', pattern: /benötigt|braucht|voraussetzung|anforderung/i },
      { name: 'Methodik', pattern: /wie|methode|vorgehen|prozess/i },
      { name: 'Beispiele', pattern: /beispiel|zum beispiel|bspw\.|z\.b\./i }
    ];

    contextElements.forEach(element => {
      if (!element.pattern.test(conversation)) {
        missingElements.push(`${element.name} fehlt`);
        completeness -= 0.2;
      }
    });

    return {
      completeness: Math.max(0, completeness),
      missingElements
    };
  }

  /**
   * Berechnet die Informationsdichte
   */
  private calculateInformationDensity(conversation: string): number {
    const words = conversation.split(/\s+/);
    const informativeWords = words.filter(word => 
      word.length > 4 && !this.isStopWord(word)
    );
    
    return Math.min(informativeWords.length / words.length * 2, 1);
  }

  /**
   * Extrahiert Fachbegriffe aus der Konversation
   */
  private extractTechnicalTerms(conversation: string): string[] {
    const words = conversation.toLowerCase().split(/\s+/);
    const technicalTerms = new Set<string>();
    
    // Einfache Heuristik für Fachbegriffe
    words.forEach(word => {
      if (
        word.length > 5 && 
        !this.isStopWord(word) &&
        /[A-Z]/.test(word) || // Enthält Großbuchstaben
        word.includes('-') || // Enthält Bindestrich
        /[a-z][A-Z]/.test(word) // Camel Case
      ) {
        technicalTerms.add(word);
      }
    });
    
    return Array.from(technicalTerms);
  }

  /**
   * Analysiert die Qualität von Erklärungen
   */
  private analyzeExplanationQuality(conversation: string): number {
    const explanationPatterns = [
      /das bedeutet/i,
      /anders ausgedrückt/i,
      /mit anderen worten/i,
      /beispielsweise/i,
      /zum beispiel/i
    ];
    
    let quality = 0;
    explanationPatterns.forEach(pattern => {
      if (pattern.test(conversation)) quality += 0.2;
    });
    
    return Math.min(quality, 1);
  }

  /**
   * Prüft ob ein Wort ein Stoppwort ist
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber',
      'ist', 'sind', 'war', 'wird', 'werden', 'wurde', 'wurden',
      'hat', 'haben', 'hatte', 'hatten', 'kann', 'können', 'könnte',
      'für', 'mit', 'bei', 'seit', 'von', 'aus', 'nach', 'zu', 'zur',
      'zum', 'in', 'im', 'an', 'auf', 'über', 'unter', 'neben'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Schätzt die Wortanzahl des generierten Contents
   */
  private estimateWordCount(conversation: string): number {
    const words = conversation.split(/\s+/);
    const informativeWords = words.filter(word => !this.isStopWord(word));
    return Math.round(informativeWords.length * 1.5); // Schätzung: 50% mehr Wörter im generierten Content
  }

  /**
   * Prüft ob die Konversation eine Schritt-für-Schritt-Struktur enthält
   */
  private hasStepByStepStructure(conversation: string): boolean {
    const stepPatterns = [
      /schritt \d/i,
      /\d\.\s/,
      /erstens|zweitens|drittens/i,
      /zuerst|dann|anschließend|schließlich/i
    ];
    
    return stepPatterns.some(pattern => pattern.test(conversation));
  }

  /**
   * Extrahiert Kernpunkte aus der Konversation
   */
  private extractKeyPoints(conversation: string): string[] {
    const sentences = conversation.split(/[.!?]+/);
    return sentences
      .filter(sentence => 
        sentence.length > 30 && // Mindestlänge
        !this.isSmallTalk(sentence) && // Kein Smalltalk
        this.containsInformativeContent(sentence) // Enthält wichtige Informationen
      )
      .map(sentence => sentence.trim())
      .slice(0, 5); // Maximal 5 Kernpunkte
  }

  /**
   * Extrahiert Fachwissen aus der Konversation
   */
  private extractExpertKnowledge(conversation: string): string[] {
    const sentences = conversation.split(/[.!?]+/);
    return sentences
      .filter(sentence => 
        this.containsTechnicalTerms(sentence) && // Enthält Fachbegriffe
        this.hasExplanationStructure(sentence) // Hat erklärende Struktur
      )
      .map(sentence => sentence.trim())
      .slice(0, 5);
  }

  /**
   * Extrahiert praktische Schritte aus der Konversation
   */
  private extractPracticalSteps(conversation: string): string[] {
    const sentences = conversation.split(/[.!?]+/);
    return sentences
      .filter(sentence => 
        this.isActionable(sentence) && // Enthält ausführbare Anweisungen
        !this.isTheoretical(sentence) // Ist nicht rein theoretisch
      )
      .map(sentence => sentence.trim())
      .slice(0, 7);
  }

  /**
   * Prüft ob ein Satz Smalltalk ist
   */
  private isSmallTalk(sentence: string): boolean {
    const smallTalkPatterns = [
      /wie geht es|wie gehts/i,
      /schönen tag|schönes wetter/i,
      /danke|bitte|gerne/i
    ];
    
    return smallTalkPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Prüft ob ein Satz informativen Inhalt hat
   */
  private containsInformativeContent(sentence: string): boolean {
    return sentence.split(/\s+/).filter(word => !this.isStopWord(word)).length >= 5;
  }

  /**
   * Prüft ob ein Satz Fachbegriffe enthält
   */
  private containsTechnicalTerms(sentence: string): boolean {
    const technicalTerms = this.extractTechnicalTerms(sentence);
    return technicalTerms.length >= 2;
  }

  /**
   * Prüft ob ein Satz eine erklärende Struktur hat
   */
  private hasExplanationStructure(sentence: string): boolean {
    const explanationPatterns = [
      /bedeutet|heißt|bezeichnet/i,
      /ist ein|sind|bezeichnet|definiert/i,
      /besteht aus|setzt sich zusammen/i
    ];
    
    return explanationPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Prüft ob ein Satz ausführbare Anweisungen enthält
   */
  private isActionable(sentence: string): boolean {
    const actionPatterns = [
      /müssen|sollten|können sie/i,
      /führen sie|gehen sie|klicken sie/i,
      /verwenden|benutzen|erstellen/i
    ];
    
    return actionPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Prüft ob ein Satz rein theoretisch ist
   */
  private isTheoretical(sentence: string): boolean {
    const theoreticalPatterns = [
      /theoretisch|konzeptionell/i,
      /könnte man|wäre möglich/i,
      /im prinzip|grundsätzlich/i
    ];
    
    return theoreticalPatterns.some(pattern => pattern.test(sentence));
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