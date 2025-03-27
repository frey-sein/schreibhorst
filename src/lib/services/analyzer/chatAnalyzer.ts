import { ChatMessage } from '@/types/chat';

export interface AnalysisResult {
  id: string;
  type: 'text' | 'image';
  title: string;
  prompt: string;
  tags: string[];
  format?: string;
  estimatedLength?: number;
}

interface AnalyzerMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export class ChatAnalyzer {
  /**
   * Analysiert die Konversation und generiert Prompts für Text- und Bildinhalte
   */
  async analyzeConversation(messages: AnalyzerMessage[]): Promise<AnalysisResult[]> {
    // Prüfen, ob genügend Nachrichten vorhanden sind
    if (messages.length < 3) {
      return [];
    }

    const conversationText = this.getFullConversationText(messages);
    const mainTopics = this.extractMainTopics(conversationText);
    const keyPoints = this.extractKeyPoints(conversationText);
    const tone = this.determineConversationTone(conversationText);

    const results: AnalysisResult[] = [];
    
    // Generiere drei Text-Prompts
    const textPrompts = this.generateTextPrompts(mainTopics, keyPoints, tone);
    results.push(...textPrompts);
    
    // Generiere drei Bild-Prompts
    const imagePrompts = this.generateImagePrompts(mainTopics, keyPoints);
    results.push(...imagePrompts);
    
    return results;
  }

  /**
   * Extrahiert den gesamten Konversationstext
   */
  private getFullConversationText(messages: AnalyzerMessage[]): string {
    return messages
      .map(msg => `${msg.sender === 'user' ? 'Benutzer' : 'Assistent'}: ${msg.text}`)
      .join('\n');
  }

  /**
   * Extrahiert die Hauptthemen aus der Konversation
   */
  private extractMainTopics(text: string): string[] {
    // Bereinige Text von Sonderzeichen und Leerzeichen
    const cleanedText = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
      
    const words = cleanedText.split(' ');
    const stopWords = ['der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'ist', 'sind', 'war', 'ich', 'du', 'wir', 'sie', 'für', 'auf', 'mit', 'wie', 'was', 'wer', 'wo', 'wann', 'warum', 'kann', 'können', 'haben', 'hat', 'hatte', 'wenn', 'dann', 'also', 'nicht', 'kein', 'keine', 'über', 'unter', 'neben', 'auch', 'noch', 'nur', 'sehr', 'mal', 'schon', 'zu', 'von', 'aus', 'an', 'in', 'im', 'zum', 'zur', 'einen', 'einem', 'einer'];
    
    // Zähle Worthäufigkeiten, ohne Stoppwörter und kurze Wörter
    const wordCounts: {[key: string]: number} = {};
    for (const word of words) {
      if (word.length > 3 && !stopWords.includes(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    // Extrahiere die häufigsten Wörter als Themen
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }

  /**
   * Extrahiert Schlüsselpunkte aus der Konversation
   */
  private extractKeyPoints(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Einfache Heuristik für wichtige Sätze basierend auf Länge und Inhalt
    const importantSentences = sentences
      .filter(sentence => 
        sentence.trim().length > 30 && 
        !this.isSmallTalk(sentence)
      )
      .map(sentence => sentence.trim())
      .slice(0, 7);
    
    return importantSentences;
  }

  /**
   * Bestimmt den Ton der Konversation
   */
  private determineConversationTone(text: string): string {
    const tones = [
      { name: 'informativ', keywords: ['wie', 'warum', 'was ist', 'erklär', 'erkläre', 'erklärt', 'bedeutet', 'definition'] },
      { name: 'sachlich', keywords: ['fakten', 'daten', 'analyse', 'studie', 'forschung', 'wissenschaft'] },
      { name: 'beratend', keywords: ['sollte', 'empfehlen', 'empfehlung', 'tipp', 'rat', 'beste'] },
      { name: 'unterhaltsam', keywords: ['interessant', 'witzig', 'spannend', 'überraschend', 'unglaublich'] },
      { name: 'inspirierend', keywords: ['motivation', 'ziel', 'erfolg', 'erreichen', 'verbessern', 'optimieren'] }
    ];
    
    const textLower = text.toLowerCase();
    const toneScores = tones.map(tone => {
      const score = tone.keywords.reduce((count, keyword) => {
        const regex = new RegExp(keyword, 'g');
        const matches = textLower.match(regex);
        return count + (matches ? matches.length : 0);
      }, 0);
      
      return { tone: tone.name, score };
    });
    
    const dominantTone = toneScores.sort((a, b) => b.score - a.score)[0];
    return dominantTone.tone || 'informativ';
  }

  /**
   * Prüft, ob ein Satz Smalltalk ist
   */
  private isSmallTalk(sentence: string): boolean {
    const smallTalkPatterns = [
      /wie geht es|wie gehts/i,
      /schön|nett/i,
      /danke|bitte|gerne/i,
      /hallo|guten tag|tschüss|auf wiedersehen/i
    ];
    
    return smallTalkPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Generiert Prompts für Textinhalte
   */
  private generateTextPrompts(topics: string[], keyPoints: string[], tone: string): AnalysisResult[] {
    const thematicString = topics.slice(0, 3).join(', ');
    const keyPointsString = keyPoints.slice(0, 3).map(p => `- ${p}`).join('\n');
    
    // Artikel-Prompt
    const articlePrompt: AnalysisResult = {
      id: `text-article-${Date.now()}`,
      type: 'text',
      title: 'Blogbeitrag',
      prompt: `Erstelle einen informativen Blogbeitrag zum Thema ${thematicString}. 
Baue folgende Kernpunkte ein:
${keyPointsString}

Verwende einen ${tone}en Schreibstil und strukturiere den Artikel mit Einleitung, Hauptteil und Fazit. 
Füge passende Zwischenüberschriften und praktische Beispiele ein.`,
      tags: [...topics.slice(0, 3), 'blog', 'artikel'],
      format: 'Artikel',
      estimatedLength: 800
    };
    
    // How-To-Guide-Prompt
    const howToPrompt: AnalysisResult = {
      id: `text-howto-${Date.now()}`,
      type: 'text',
      title: 'How-To-Anleitung',
      prompt: `Erstelle eine Schritt-für-Schritt-Anleitung zu ${thematicString}.
Berücksichtige dabei:
${keyPointsString}

Der Guide sollte klar strukturierte Schritte, praktische Tipps und mögliche Fallstricke enthalten.
Verwende einen ${tone}en, leicht verständlichen Stil.`,
      tags: [...topics.slice(0, 3), 'anleitung', 'how-to', 'guide'],
      format: 'How-To-Guide',
      estimatedLength: 600
    };
    
    // Listicle-Prompt
    const listiclePrompt: AnalysisResult = {
      id: `text-listicle-${Date.now()}`,
      type: 'text',
      title: 'Top-Liste',
      prompt: `Erstelle eine listenbasierte Übersicht zu "${thematicString}".
Basiere den Inhalt auf:
${keyPointsString}

Formatiere den Inhalt als nummerierte Liste mit aussagekräftigen Überschriften und kurzen, prägnanten Erklärungen.
Schreibe in einem ${tone}en Stil und halte die einzelnen Punkte kompakt.`,
      tags: [...topics.slice(0, 3), 'liste', 'übersicht', 'tipps'],
      format: 'Listicle',
      estimatedLength: 500
    };
    
    return [articlePrompt, howToPrompt, listiclePrompt];
  }

  /**
   * Generiert Prompts für Bildinhalte
   */
  private generateImagePrompts(topics: string[], keyPoints: string[]): AnalysisResult[] {
    const thematicString = topics.slice(0, 3).join(', ');
    
    // Header-Bild
    const headerImagePrompt: AnalysisResult = {
      id: `image-header-${Date.now()}`,
      type: 'image',
      title: 'Header-Bild',
      prompt: `Erstelle ein minimalistisches, elegantes Header-Bild im Schwarz-Weiß-Stil für einen Blogbeitrag zum Thema "${thematicString}". 
Das Bild sollte modern und schlicht wirken, mit klaren Linien und ausgewogener Komposition, ähnlich dem Apple-Design-Stil.`,
      tags: [...topics.slice(0, 3), 'header', 'cover', 'minimal']
    };
    
    // Konzeptbild
    const conceptImagePrompt: AnalysisResult = {
      id: `image-concept-${Date.now()}`,
      type: 'image',
      title: 'Konzeptbild',
      prompt: `Erstelle eine konzeptionelle Visualisierung zum Thema "${thematicString}" in einem monochromatischen, eleganten Design-Stil.
Das Bild sollte eine abstrakte Darstellung der Kernkonzepte sein, mit einem klaren Fokus und grafischen Elementen, die das Thema symbolisieren.
Stil: Minimalistisch, schwarz-weiß, hochwertig, reduziert auf das Wesentliche.`,
      tags: [...topics.slice(0, 2), 'konzept', 'abstrakt', 'monochrom']
    };
    
    // Infografik
    const infographicPrompt: AnalysisResult = {
      id: `image-infographic-${Date.now()}`,
      type: 'image',
      title: 'Infografik',
      prompt: `Erstelle eine minimalistische Infografik im Schwarz-Weiß-Stil zum Thema "${thematicString}".
Die Grafik sollte Schlüsselinformationen visuell darstellen, mit klaren Symbolen, einer logischen Struktur und einer eleganten Typografie.
Stil: Zurückhaltend, präzise, informativ, im Stil moderner Apple-Präsentationen.`,
      tags: [...topics.slice(0, 2), 'infografik', 'daten', 'visualisierung']
    };
    
    return [headerImagePrompt, conceptImagePrompt, infographicPrompt];
  }
}