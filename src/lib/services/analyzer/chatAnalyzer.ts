import { ChatMessage } from '@/types/chat';

export interface AnalysisResult {
  id: string;
  type: 'text' | 'image';
  title: string;
  prompt: string;
  tags: string[];
  format?: string;
  estimatedLength?: number;
  styleOptions?: Array<{
    name: string;
    title: string;
    description: string;
    format: string;
  }>;
  styleVariant?: string;
  contentType?: string;
  sourceContext?: string;
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
    const style = this.determineVisualStyle(conversationText);

    const results: AnalysisResult[] = [];
    
    // Generiere drei Text-Prompts
    const textPrompts = this.generateTextPrompts(mainTopics, keyPoints, tone);
    results.push(...textPrompts);
    
    // Generiere drei Bild-Prompts
    const imagePrompts = this.generateImagePrompts(mainTopics, keyPoints, style);
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
      .map(sentence => {
        // Entferne "Assistent: " oder "Benutzer: " Präfixe aus den Sätzen
        const trimmedSentence = sentence.trim();
        return trimmedSentence
          .replace(/^Assistent:\s*/i, '')
          .replace(/^Benutzer:\s*/i, '');
      })
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
   * Bestimmt den visuellen Stil basierend auf dem Konversationsinhalt
   */
  private determineVisualStyle(text: string): string {
    // Definiere verschiedene visuelle Stile mit zugehörigen Schlüsselwörtern
    const styles = [
      { name: 'fotorealistisch', keywords: ['realistisch', 'foto', 'detailliert', 'echt', 'fotografie', 'realismus'] },
      { name: 'abstrakt', keywords: ['abstrakt', 'konzeptuell', 'künstlerisch', 'experimentell'] },
      { name: 'comic', keywords: ['comic', 'zeichentrick', 'cartoon', 'animiert', 'lustig'] },
      { name: '3D', keywords: ['3d', 'render', 'modell', 'dreidimensional'] },
      { name: 'vintage', keywords: ['retro', 'alt', 'klassisch', 'antik', 'vintage', 'nostalgisch'] },
      { name: 'minimalistisch', keywords: ['minimal', 'einfach', 'schlicht', 'reduziert'] },
      { name: 'lebendig', keywords: ['bunt', 'lebendig', 'farbenfroh', 'farbig', 'kräftig'] }
    ];
    
    const textLower = text.toLowerCase();
    const styleScores = styles.map(style => {
      const score = style.keywords.reduce((count, keyword) => {
        const regex = new RegExp(keyword, 'g');
        const matches = textLower.match(regex);
        return count + (matches ? matches.length : 0);
      }, 0);
      
      return { style: style.name, score };
    });
    
    // Sortiere nach Score und wähle den dominanten Stil
    const dominantStyle = styleScores.sort((a, b) => b.score - a.score)[0];
    
    // Falls kein klarer dominanter Stil erkannt wird oder der Score zu niedrig ist, 
    // verwende 'lebendig' als Standard-Stil
    return (dominantStyle.score > 0) ? dominantStyle.style : 'lebendig';
  }

  /**
   * Generiert Prompts für Textinhalte
   */
  private generateTextPrompts(topics: string[], keyPoints: string[], tone: string): AnalysisResult[] {
    const thematicString = topics.slice(0, 3).join(', ');
    const keyPointsString = keyPoints.slice(0, 3).map(p => `- ${p}`).join('\n');
    
    // Einzelner Hauptprompt mit Blogstil
    const textPrompt: AnalysisResult = {
      id: `text-${Date.now()}`,
      type: 'text',
      title: 'Blogbeitrag',
      prompt: `Erstelle einen informativen Blogbeitrag zum Thema ${thematicString}. 
Baue folgende Kernpunkte ein:
${keyPointsString}

Verwende einen ${tone}en Stil und strukturiere den Artikel mit Einleitung, Hauptteil und Fazit.
Füge passende Zwischenüberschriften und praktische Beispiele ein.`,
      tags: [...topics.slice(0, 3), 'blog', 'artikel'],
      format: 'Artikel',
      estimatedLength: 800,
      // Nur Blog-Stil behalten
      styleVariant: 'blog',
      contentType: 'Blogbeitrag'
    };
    
    return [textPrompt];
  }

  /**
   * Generiert Prompts für Bildinhalte
   */
  private generateImagePrompts(topics: string[], keyPoints: string[], style: string = 'lebendig'): AnalysisResult[] {
    const thematicString = topics.slice(0, 3).join(', ');
    
    // Stil-Beschreibung basierend auf dem erkannten Stil
    let styleDescription = '';
    switch(style) {
      case 'fotorealistisch':
        styleDescription = 'im fotorealistischen Stil mit naturgetreuen Farben und Details';
        break;
      case 'abstrakt':
        styleDescription = 'im abstrakten, künstlerischen Stil mit expressiven Formen und Farben';
        break;
      case 'comic':
        styleDescription = 'im Comic-Stil mit lebendigen Farben und charakteristischen Outlines';
        break;
      case '3D':
        styleDescription = 'als 3D-Rendering mit realistischer Beleuchtung und Tiefe';
        break;
      case 'vintage':
        styleDescription = 'im Retro/Vintage-Stil mit warmen, leicht verblassten Farbtönen';
        break;
      case 'minimalistisch':
        styleDescription = 'im minimalistischen Stil mit klaren Linien und ausgewählten Farbelementen';
        break;
      default:
        styleDescription = 'mit lebendigen, kräftigen Farben und ansprechender Komposition';
    }
    
    // Header-Bild
    const headerImagePrompt: AnalysisResult = {
      id: `image-header-${Date.now()}`,
      type: 'image',
      title: 'Header-Bild',
      prompt: `Erstelle ein farbiges Header-Bild für einen Blogbeitrag zum Thema "${thematicString}" ${styleDescription}. 
Das Bild sollte ansprechend und gut strukturiert sein, mit einer Komposition, die das Thema gut vermittelt.`,
      tags: [...topics.slice(0, 3), 'header', 'cover', style]
    };
    
    // Konzeptbild
    const conceptImagePrompt: AnalysisResult = {
      id: `image-concept-${Date.now()}`,
      type: 'image',
      title: 'Konzeptbild',
      prompt: `Erstelle eine konzeptionelle Visualisierung zum Thema "${thematicString}" ${styleDescription}.
Das Bild sollte eine kreative Darstellung der Kernkonzepte sein, mit grafischen Elementen, die das Thema symbolisieren.
Stil: ${style}, hochwertig, mit deutlichem Bezug zum Thema.`,
      tags: [...topics.slice(0, 2), 'konzept', 'kreativ', style]
    };
    
    // Infografik
    const infographicPrompt: AnalysisResult = {
      id: `image-infographic-${Date.now()}`,
      type: 'image',
      title: 'Infografik',
      prompt: `Erstelle eine Infografik zum Thema "${thematicString}" ${styleDescription}.
Die Grafik sollte Schlüsselinformationen visuell darstellen, mit klaren Symbolen, einer logischen Struktur und einer modernen Typografie.
Stil: Informativ, präzise, mit einer ansprechenden Farbpalette, die Informationen gut strukturiert darstellt.`,
      tags: [...topics.slice(0, 2), 'infografik', 'daten', 'visualisierung', style]
    };
    
    return [headerImagePrompt, conceptImagePrompt, infographicPrompt];
  }
}