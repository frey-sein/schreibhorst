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
    if (messages.length < 2) {
      return [];
    }

    try {
      // Extrahiere den Konversationstext für die KI-Anfrage
      const conversationText = this.getFullConversationText(messages);
      
      // Verwende OpenRouter für bessere Vorschläge
      const aiSuggestions = await this.getAISuggestions(conversationText);
      
      // Wenn KI-basierte Vorschläge verfügbar sind, nutze diese
      if (aiSuggestions && aiSuggestions.length > 0) {
        return aiSuggestions;
      }
      
      // Fallback auf die lokale Analyse bei Fehlern mit der KI
      console.log("Fallback auf lokale Analyse...");
      return this.generateLocalSuggestions(conversationText);
    } catch (error) {
      console.error("Fehler bei der KI-basierten Analyse:", error);
      
      // Bei einem Fehler: Fallback auf lokale Analyse
      const conversationText = this.getFullConversationText(messages);
      return this.generateLocalSuggestions(conversationText);
    }
  }

  /**
   * Verwendet OpenRouter für verbesserte Vorschläge
   */
  private async getAISuggestions(conversationText: string): Promise<AnalysisResult[]> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
      const baseUrl = process.env.NEXT_PUBLIC_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
      
      // Erstelle Prompt für die KI
      const prompt = `Analysiere den folgenden Konversationstext und generiere kreative, vielfältige Vorschläge für Text- und Bildprompts. Die Vorschläge sollten das Thema, den Ton und die Schlüsselinformationen der Konversation reflektieren.

Konversationstext:
${conversationText}

Erstelle 3 Textprompt-Vorschläge und 2 Bildprompt-Vorschläge.
Für jeden Textprompt gib folgende Informationen an:
- Einen kurzen, ansprechenden Titel
- Einen ausführlichen Prompt, der die zu generierenden Inhalte beschreibt
- 3-5 relevante Tags
- Das Format (z.B. Artikel, Blog, Interview, Geschichte, Anleitung)
- Die geschätzte Länge in Wörtern
- Den Stil oder die Variante (z.B. informativ, beratend, unterhaltsam)
- Den Inhaltstyp (z.B. Blogbeitrag, Interview, Ratgeber)

Für jeden Bildprompt gib folgende Informationen an:
- Einen kurzen, ansprechenden Titel
- Einen ausführlichen Prompt, der das zu erstellende Bild beschreibt
- 3-5 relevante Tags
- Den Stil (z.B. fotorealistisch, abstrakt, comic, 3D)

WICHTIG: Formatiere die Antwort AUSSCHLIESSLICH als JSON-Objekt ohne weitere Erklärungen oder Textelemente, mit folgendem Schema:
{
  "textPrompts": [
    {
      "title": "Titel des Prompts",
      "prompt": "Ausführlicher Prompt-Text",
      "tags": ["tag1", "tag2", "tag3"],
      "format": "Format des Textes",
      "estimatedLength": 500,
      "styleVariant": "Stil-Variante",
      "contentType": "Inhaltstyp"
    }
  ],
  "imagePrompts": [
    {
      "title": "Titel des Bildprompts",
      "prompt": "Ausführlicher Bildprompt-Text",
      "tags": ["tag1", "tag2", "tag3"],
      "style": "Visueller Stil"
    }
  ]
}`;

      // Sende die Anfrage an OpenRouter
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://schreibhorst.com',
          'X-Title': 'Schreibhorst Analyzer'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'Du bist ein leistungsstarker Analyst, der Konversationen versteht und kreative Vorschläge für Text- und Bildprompts generiert. Liefere AUSSCHLIESSLICH JSON-formatierte Antworten ohne zusätzliche Erklärungen, Markdown-Formatierung oder Code-Blöcke.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('Keine Antwort von der KI erhalten');
      }

      // Extrahiere und bereinige die JSON-Antwort
      try {
        // Alle möglichen Formate bereinigen
        let cleanedJson = aiResponse;
        
        // Entferne Markdown-Code-Blöcke
        cleanedJson = cleanedJson.replace(/```json\n|\n```|```\n|\n```/g, '');
        
        // Entferne "json" Labels
        cleanedJson = cleanedJson.replace(/^json\n/i, '');
        
        // Entferne Kommentare
        cleanedJson = cleanedJson.replace(/\/\/.*/g, '');
        
        // Whitespace am Anfang und Ende entfernen
        cleanedJson = cleanedJson.trim();
        
        // Wenn es nicht mit { beginnt, versuche den ersten { zu finden
        if (!cleanedJson.startsWith('{')) {
          const jsonStart = cleanedJson.indexOf('{');
          if (jsonStart >= 0) {
            cleanedJson = cleanedJson.substring(jsonStart);
          }
        }
        
        // Wenn es nicht mit } endet, finde das letzte }
        if (!cleanedJson.endsWith('}')) {
          const jsonEnd = cleanedJson.lastIndexOf('}');
          if (jsonEnd >= 0) {
            cleanedJson = cleanedJson.substring(0, jsonEnd + 1);
          }
        }
        
        console.log("Bereinigter JSON-String:", cleanedJson);
        
        // Parse den bereinigten JSON-String
        const suggestionsData = JSON.parse(cleanedJson);

        // Konvertiere die KI-Vorschläge in das erwartete Format
        return this.convertAISuggestionsToResults(suggestionsData);
      } catch (error) {
        console.error("Fehler beim Parsen der KI-Antwort:", error);
        console.error("KI-Antwort:", aiResponse);
        
        // Fallback: Erstelle ein einfaches Standard-Objekt mit Basis-Vorschlägen
        return this.createFallbackSuggestions();
      }
    } catch (error) {
      console.error("Fehler bei OpenRouter API-Anfrage:", error);
      throw error;
    }
  }

  /**
   * Erstellt einfache Fallback-Vorschläge, falls die KI-Antwort nicht verarbeitet werden kann
   */
  private createFallbackSuggestions(): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const timestamp = Date.now();
    
    // Standardmäßiger Text-Prompt
    results.push({
      id: `text-blogbeitrag-${timestamp}`,
      type: 'text',
      title: 'Blogbeitrag',
      prompt: 'Erstelle einen ausführlichen Blogbeitrag zum Thema der Konversation. Verwende einen informativen Stil und strukturiere den Artikel mit Einleitung, Hauptteil und Fazit.',
      tags: ['blog', 'artikel', 'informativ'],
      format: 'Artikel',
      estimatedLength: 800,
      styleVariant: 'informativ',
      contentType: 'Blogbeitrag'
    });
    
    // Standardmäßiger Bild-Prompt
    results.push({
      id: `image-konzeptbild-${timestamp}`,
      type: 'image',
      title: 'Konzeptbild',
      prompt: 'Erstelle ein visuelles Konzeptbild zum Thema der Konversation im lebendigen Stil mit kräftigen Farben und ansprechender Komposition.',
      tags: ['konzept', 'visuell', 'lebendig'],
      styleVariant: 'lebendig'
    });
    
    return results;
  }

  /**
   * Konvertiert die KI-Vorschläge in das erwartete Format
   */
  private convertAISuggestionsToResults(suggestionsData: any): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Text-Prompts verarbeiten
    if (suggestionsData.textPrompts && Array.isArray(suggestionsData.textPrompts)) {
      suggestionsData.textPrompts.forEach((textPrompt: any) => {
        results.push({
          id: `text-${textPrompt.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          type: 'text',
          title: textPrompt.title,
          prompt: textPrompt.prompt,
          tags: textPrompt.tags || [],
          format: textPrompt.format,
          estimatedLength: textPrompt.estimatedLength || 500,
          styleVariant: textPrompt.styleVariant,
          contentType: textPrompt.contentType
        });
      });
    }

    // Bild-Prompts verarbeiten
    if (suggestionsData.imagePrompts && Array.isArray(suggestionsData.imagePrompts)) {
      suggestionsData.imagePrompts.forEach((imagePrompt: any) => {
        results.push({
          id: `image-${imagePrompt.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          type: 'image',
          title: imagePrompt.title,
          prompt: imagePrompt.prompt,
          tags: imagePrompt.tags || [],
          styleVariant: imagePrompt.style
        });
      });
    }

    return results;
  }

  /**
   * Generiert Vorschläge lokal als Fallback
   */
  private generateLocalSuggestions(conversationText: string): AnalysisResult[] {
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
   * Extrahiert die Hauptthemen aus der Konversation mit verbesserter NLP-Analyse
   */
  private extractMainTopics(text: string): string[] {
    // Bereinige Text von Sonderzeichen und Leerzeichen
    const cleanedText = text.toLowerCase()
      .replace(/[^\w\säöüßÄÖÜ]/g, '')
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
    
    // Identifiziere Wortpaare und häufige Phrasen (einfache N-Gram-Analyse)
    const bigramCounts: {[key: string]: number} = {};
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 3 && words[i+1].length > 3 && 
          !stopWords.includes(words[i]) && !stopWords.includes(words[i+1])) {
        const bigram = `${words[i]} ${words[i+1]}`;
        bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
      }
    }
    
    // Kombiniere Einzelwörter und Phrasen, mit stärkerer Gewichtung für Phrasen
    const combinedTopics: {[key: string]: number} = {...wordCounts};
    Object.entries(bigramCounts).forEach(([bigram, count]) => {
      if (count >= 2) { // Nur mehrfach vorkommende Phrasen berücksichtigen
        combinedTopics[bigram] = count * 1.5; // Phrasen stärker gewichten
      }
    });
    
    // Kontextuelle Relevanz: Gewichte Wörter aus neueren Nachrichten höher
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const recentSentences = sentences.slice(-5); // Die letzten 5 Sätze
    const recentText = recentSentences.join(' ').toLowerCase();
    
    Object.keys(combinedTopics).forEach(topic => {
      if (recentText.includes(topic.toLowerCase())) {
        combinedTopics[topic] *= 1.3; // 30% mehr Gewichtung für aktuelle Themen
      }
    });
    
    // Extrahiere die häufigsten Themen
    return Object.entries(combinedTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7) // Mehr Themen zur Auswahl
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
   * Bestimmt den Ton der Konversation mit erweiterter Analyse
   */
  private determineConversationTone(text: string): string {
    const tones = [
      { 
        name: 'informativ', 
        keywords: ['wie', 'warum', 'was ist', 'erklär', 'erkläre', 'erklärt', 'bedeutet', 'definition', 'informier', 'informationen', 'wissen', 'lernen', 'verstehen'] 
      },
      { 
        name: 'sachlich', 
        keywords: ['fakten', 'daten', 'analyse', 'studie', 'forschung', 'wissenschaft', 'statistik', 'evidenz', 'beweis', 'belegt', 'objektiv'] 
      },
      { 
        name: 'beratend', 
        keywords: ['sollte', 'empfehlen', 'empfehlung', 'tipp', 'rat', 'beste', 'vorschlag', 'hilfe', 'unterstützen', 'lösung', 'strategie'] 
      },
      { 
        name: 'unterhaltsam', 
        keywords: ['interessant', 'witzig', 'spannend', 'überraschend', 'unglaublich', 'cool', 'lustig', 'faszinierend', 'unterhaltsam', 'amüsant'] 
      },
      { 
        name: 'inspirierend', 
        keywords: ['motivation', 'ziel', 'erfolg', 'erreichen', 'verbessern', 'optimieren', 'inspiration', 'traum', 'vision', 'leidenschaft', 'kreativ'] 
      },
      { 
        name: 'kritisch', 
        keywords: ['problem', 'herausforderung', 'schwierig', 'kritisch', 'hinterfragen', 'zweifeln', 'schwachstelle', 'negativ', 'risiko'] 
      },
      { 
        name: 'emotional', 
        keywords: ['fühlen', 'gefühl', 'liebe', 'hass', 'freude', 'trauer', 'angst', 'hoffnung', 'begeisterung', 'leidenschaft', 'empfinden'] 
      }
    ];
    
    const textLower = text.toLowerCase();
    
    // Berechne Tonwerte mit verbesserter Gewichtung
    const toneScores = tones.map(tone => {
      let score = 0;
      
      // Zähle Schlüsselwörter
      score += tone.keywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g'); // Wortgrenzenerkennung verbessert
        const matches = textLower.match(regex);
        return count + (matches ? matches.length : 0);
      }, 0);
      
      // Zusätzliche Kontextanalyse - Prüfe auf Satzstrukturen, die typisch für den Ton sind
      if (tone.name === 'informativ' && textLower.match(/(\?|wissen über|erklären|informationen zu)/g)) {
        score += 3;
      } else if (tone.name === 'beratend' && textLower.match(/(sollte man|besser|empfehle|rate zu|tipp:|hilft|verbessern)/g)) {
        score += 3;
      } else if (tone.name === 'emotional' && textLower.match(/(ich fühle|fühlt sich|liebe|wunderbar|begeistert|traurig|ängstlich)/g)) {
        score += 3;
      }
      
      return { tone: tone.name, score };
    });
    
    // Bestimme den dominanten Ton
    const sortedTones = toneScores.sort((a, b) => b.score - a.score);
    const dominantTone = sortedTones[0];
    
    // Wenn kein klarer Ton erkannt wurde oder der Score zu niedrig ist
    return (dominantTone.score > 0) ? dominantTone.tone : 'informativ';
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
   * Bestimmt den visuellen Stil basierend auf dem Konversationsinhalt mit erweiterter Analyse
   */
  private determineVisualStyle(text: string): string {
    // Erweiterte visuelle Stile mit ausführlicheren Schlüsselwörtern
    const styles = [
      { 
        name: 'fotorealistisch', 
        keywords: ['realistisch', 'foto', 'detailliert', 'echt', 'fotografie', 'realismus', 'naturgetreu', 'lebensecht', 'authentisch', 'wie ein foto', 'fotografisch'] 
      },
      { 
        name: 'abstrakt', 
        keywords: ['abstrakt', 'konzeptuell', 'künstlerisch', 'experimentell', 'modern', 'expressionistisch', 'nicht-gegenständlich', 'surreal', 'avantgarde'] 
      },
      { 
        name: 'comic', 
        keywords: ['comic', 'zeichentrick', 'cartoon', 'animiert', 'lustig', 'manga', 'anime', 'karikatur', 'comicbuch', 'superheld', 'niedlich'] 
      },
      { 
        name: '3D', 
        keywords: ['3d', 'render', 'modell', 'dreidimensional', 'rendering', 'cgi', 'animation', 'modelliert', 'blender', 'cinema4d', 'digital'] 
      },
      { 
        name: 'vintage', 
        keywords: ['retro', 'alt', 'klassisch', 'antik', 'vintage', 'nostalgisch', 'sepia', 'altmodisch', 'historisch', '50er', '60er', '70er', '80er'] 
      },
      { 
        name: 'minimalistisch', 
        keywords: ['minimal', 'einfach', 'schlicht', 'reduziert', 'clean', 'weniger ist mehr', 'geometrisch', 'klar', 'präzise', 'weißraum'] 
      },
      { 
        name: 'lebendig', 
        keywords: ['bunt', 'lebendig', 'farbenfroh', 'farbig', 'kräftig', 'vibrant', 'leuchtend', 'farbintensiv', 'dynamisch', 'hell'] 
      },
      { 
        name: 'aquarell', 
        keywords: ['aquarell', 'wasserfarben', 'gemalt', 'fließend', 'wasserfarbe', 'verwaschene farben', 'transparent', 'künstlerisch', 'handgemalt'] 
      },
      { 
        name: 'skizzenhaft', 
        keywords: ['skizze', 'zeichnung', 'handgezeichnet', 'bleistift', 'linie', 'kontur', 'entwurf', 'grob', 'strich', 'kohle'] 
      },
      { 
        name: 'technisch', 
        keywords: ['technisch', 'diagramm', 'schaltplan', 'konstruktion', 'wissenschaftlich', 'präzise', 'entwurf', 'architektonisch', 'schema', 'cad'] 
      }
    ];
    
    const textLower = text.toLowerCase();
    
    // Berechne Style-Scores mit verbesserter Relevanzbestimmung
    const styleScores = styles.map(style => {
      let score = 0;
      
      // Klassische Schlüsselwort-Zählung
      score += style.keywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g'); // Wortgrenzenerkennung
        const matches = textLower.match(regex);
        return count + (matches ? matches.length * 2 : 0); // Doppelte Gewichtung für exakte Matches
      }, 0);
      
      // Weniger strenge Prüfung für teilweise Matches
      score += style.keywords.reduce((count, keyword) => {
        if (textLower.includes(keyword)) return count + 1;
        return count;
      }, 0);
      
      // Kontextuelle Analyse für visuelle Hinweise
      if (style.name === 'fotorealistisch' && textLower.match(/(wie in echt|naturgetreu|wie im echten leben|detailreich)/g)) {
        score += 3;
      } else if (style.name === 'technisch' && textLower.match(/(technisch|wissenschaftlich|präzise|genau|fachlich|detailliert)/g)) {
        score += 3;
      } else if (style.name === 'comic' && textLower.match(/(lustig|humorvoll|witzig|karikatur|übertrieben|superheld)/g)) {
        score += 3;
      }
      
      return { style: style.name, score };
    });
    
    // Sortiere nach Score und wähle den dominanten Stil
    const sortedStyles = styleScores.sort((a, b) => b.score - a.score);
    const dominantStyle = sortedStyles[0];
    const secondaryStyle = sortedStyles[1];
    
    // Wenn kein klarer dominanter Stil erkannt wird oder der Score zu niedrig ist
    if (dominantStyle.score === 0) {
      return 'lebendig'; // Standard-Stil
    }
    
    // Bei sehr ähnlichen Scores für die Top-2-Stile, kombiniere sie
    if (secondaryStyle && dominantStyle.score - secondaryStyle.score < 2) {
      return `${dominantStyle.style} mit ${secondaryStyle.style}en Elementen`;
    }
    
    return dominantStyle.style;
  }

  /**
   * Generiert Prompts für Textinhalte mit erweiterten Format-Optionen
   */
  private generateTextPrompts(topics: string[], keyPoints: string[], tone: string): AnalysisResult[] {
    const thematicString = topics.slice(0, 3).join(', ');
    const keyPointsString = keyPoints.slice(0, 3).map(p => `- ${p}`).join('\n');
    
    // Textformat-Optionen basierend auf erkanntem Gesprächston
    const formatOptions = [];
    
    // Blogbeitrag (immer verfügbar)
    formatOptions.push({
      title: 'Blogbeitrag',
      prompt: `Erstelle einen informativen Blogbeitrag zum Thema ${thematicString}. 
Baue folgende Kernpunkte ein:
${keyPointsString}

Verwende einen ${tone}en Stil und strukturiere den Artikel mit Einleitung, Hauptteil und Fazit.
Füge passende Zwischenüberschriften und praktische Beispiele ein.`,
      tags: [...topics.slice(0, 3), 'blog', 'artikel'],
      format: 'Artikel',
      estimatedLength: 800,
      styleVariant: 'blog',
      contentType: 'Blogbeitrag'
    });
    
    // Dialogisches Format (gut für unterhaltsame oder beratende Inhalte)
    if (tone === 'unterhaltsam' || tone === 'beratend' || tone === 'informativ') {
      formatOptions.push({
        title: 'Interview/Dialog',
        prompt: `Erstelle ein fiktives Interview oder einen Dialog zum Thema ${thematicString}.
Baue folgende Kernpunkte ein:
${keyPointsString}

Der Dialog soll zwischen einem Experten und einem interessierten Laien stattfinden. 
Verwende einen ${tone}en Gesprächsstil mit natürlichen Übergängen und echten Fragen.`,
        tags: [...topics.slice(0, 2), 'interview', 'dialog', 'gespräch'],
        format: 'Dialog',
        estimatedLength: 600,
        styleVariant: 'dialog',
        contentType: 'Interview'
      });
    }
    
    // Storytelling/Narratives Format (gut für emotionale oder inspirierende Inhalte)
    if (tone === 'inspirierend' || tone === 'emotional' || tone === 'unterhaltsam') {
      formatOptions.push({
        title: 'Geschichte/Erzählung',
        prompt: `Erzähle eine kurze Geschichte oder Anekdote, die das Thema ${thematicString} veranschaulicht.
Verwebte dabei folgende Kernpunkte:
${keyPointsString}

Die Geschichte sollte einen ${tone}en Charakter haben und eine klare Botschaft oder Erkenntnis vermitteln.
Gestalte sie mit Charakteren, die das Thema durch ihre Erfahrungen erlebbar machen.`,
        tags: [...topics.slice(0, 2), 'geschichte', 'storytelling', 'narrativ'],
        format: 'Erzählung',
        estimatedLength: 700,
        styleVariant: 'narrativ',
        contentType: 'Geschichte'
      });
    }
    
    // Faktenbasiertes Format (gut für sachliche oder informative Inhalte)
    if (tone === 'sachlich' || tone === 'informativ' || tone === 'kritisch') {
      formatOptions.push({
        title: 'Faktensammlung',
        prompt: `Erstelle eine strukturierte Faktensammlung zum Thema ${thematicString}.
Organisiere die Fakten um diese Kernpunkte:
${keyPointsString}

Präsentiere die Informationen in einem ${tone}en Stil, mit klaren Kategorien, Quellenhinweisen und nummerierten Listen.
Hebe besonders überraschende oder wenig bekannte Fakten hervor.`,
        tags: [...topics.slice(0, 2), 'fakten', 'liste', 'wissen'],
        format: 'Faktensammlung',
        estimatedLength: 500,
        styleVariant: 'fakten',
        contentType: 'Wissenssammlung'
      });
    }
    
    // How-To/Anleitung (gut für beratende oder sachliche Inhalte)
    if (tone === 'beratend' || tone === 'sachlich' || tone === 'informativ') {
      formatOptions.push({
        title: 'Anleitung/How-To',
        prompt: `Erstelle eine praktische Schritt-für-Schritt-Anleitung zum Thema ${thematicString}.
Berücksichtige dabei folgende Kernaspekte:
${keyPointsString}

Die Anleitung sollte einen ${tone}en Ansatz haben, mit klar nummerierten Schritten, praktischen Tipps und möglichen Fallstricken.
Füge am Ende eine Checkliste zur Erfolgskontrolle hinzu.`,
        tags: [...topics.slice(0, 2), 'anleitung', 'how-to', 'schritte'],
        format: 'Anleitung',
        estimatedLength: 650,
        styleVariant: 'how-to',
        contentType: 'Ratgeber'
      });
    }
    
    // Wähle die besten 3 Formate basierend auf dem Gesprächston aus
    // Wenn weniger als 3 Formate verfügbar sind, nimm alle
    const selectedFormats = formatOptions.length <= 3 ? 
      formatOptions : 
      formatOptions.slice(0, 3);
    
    // Erzeuge die finalen Prompt-Ergebnisse
    return selectedFormats.map(format => ({
      id: `text-${format.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      type: 'text',
      title: format.title,
      prompt: format.prompt,
      tags: format.tags,
      format: format.format,
      estimatedLength: format.estimatedLength,
      styleVariant: format.styleVariant,
      contentType: format.contentType
    }));
  }

  /**
   * Generiert verbesserte Prompts für Bildinhalte mit mehr Details und Stiloptionen
   */
  private generateImagePrompts(topics: string[], keyPoints: string[], style: string = 'lebendig'): AnalysisResult[] {
    const thematicString = topics.slice(0, 3).join(', ');
    
    // Extrahiere spezifische Konzepte aus den Schlüsselpunkten
    const keywordExtractionRegex = /\b((?:[A-Z][a-z]+)|(?:[a-z]+))\b/g;
    const keyPointWords = keyPoints
      .join(' ')
      .match(keywordExtractionRegex) || [];
    
    // Filtere nach relevanten, längeren Wörtern und vermeide Duplikate
    const conceptKeywords = Array.from(new Set(
      keyPointWords
        .filter(word => word.length > 5)
        .filter(word => !['sollte', 'können', 'würde', 'hätte', 'hatte', 'haben', 'nicht', 'diese', 'diesen', 'dieser'].includes(word))
    )).slice(0, 4);
    
    // Stil-Beschreibung basierend auf dem erkannten Stil
    let styleDescription = '';
    let technicalDetails = '';
    
    switch(style) {
      case 'fotorealistisch':
        styleDescription = 'im fotorealistischen Stil mit naturgetreuen Farben und Details';
        technicalDetails = 'Hochwertige Fotografie mit natürlichem Licht, scharfem Fokus und realistischer Tiefenschärfe. 8K HDR-Qualität.';
        break;
      case 'abstrakt':
        styleDescription = 'im abstrakten, künstlerischen Stil mit expressiven Formen und Farben';
        technicalDetails = 'Expressive Pinselstriche, nicht-gegenständliche Komposition, dramatische Farbkontraste, inspiriert von abstraktem Expressionismus.';
        break;
      case 'comic':
        styleDescription = 'im Comic-Stil mit lebendigen Farben und charakteristischen Outlines';
        technicalDetails = 'Klare schwarze Konturen, flächige Farbflächen, minimale Schattierung, expressive Charakterdesigns im modernen Comicstil.';
        break;
      case '3D':
        styleDescription = 'als 3D-Rendering mit realistischer Beleuchtung und Tiefe';
        technicalDetails = 'Hochwertige 3D-Modellierung mit PBR-Materialien, globaler Beleuchtung, volumetrischem Licht und subtilen Reflexionen. 4K Auflösung.';
        break;
      case 'vintage':
        styleDescription = 'im Retro/Vintage-Stil mit warmen, leicht verblassten Farbtönen';
        technicalDetails = 'Retro-Farbpalette, leichtes Filmkorn, abgerundete Ecken und subtile Vignettierung. Stilisiert wie eine Fotografie aus den 70er-Jahren.';
        break;
      case 'minimalistisch':
        styleDescription = 'im minimalistischen Stil mit klaren Linien und ausgewählten Farbelementen';
        technicalDetails = 'Reduziertes Design, geometrische Formen, gezielter Einsatz von negativem Raum, begrenzte Farbpalette mit maximal 3 Farben.';
        break;
      case 'aquarell':
        styleDescription = 'im Aquarellstil mit fließenden Übergängen und transparenten Farben';
        technicalDetails = 'Zarte Farbverläufe, sichtbare Pinselstriche, leichte Textur des Papiers, sanfte Wasserfarbentechnik mit transparenten Schichten.';
        break;
      case 'skizzenhaft':
        styleDescription = 'im Skizzenstil mit expressiven Linien und gezielten Details';
        technicalDetails = 'Handgezeichnete Linien mit variierender Stärke, selektive Schattierung, leichte Bleistift- oder Tuschetextur, unvollendeter Look.';
        break;
      case 'technisch':
        styleDescription = 'im technischen Illustrationsstil mit präzisen Linien und klarer Darstellung';
        technicalDetails = 'Technische Zeichnung mit isometrischer Perspektive, gleichmäßigen Linien, maßstabsgetreuen Elementen und minimaler Farbgebung.';
        break;
      default:
        // Bei kombinierten Stilen oder unbekannten Stilen
        if (style.includes('mit')) {
          const [mainStyle, secondaryStyle] = style.split(' mit ');
          styleDescription = `${style}, der ${mainStyle}e Elemente mit ${secondaryStyle} kombiniert`;
          technicalDetails = 'Professionelle Bildkomposition mit ausgewogener Anordnung, harmonischer Farbgebung und hochwertiger Auflösung.';
        } else {
          styleDescription = 'mit lebendigen, kräftigen Farben und ansprechender Komposition';
          technicalDetails = 'Professionelle Bildkomposition mit ausgewogener Anordnung, harmonischer Farbgebung und hochwertiger Auflösung.';
        }
    }
    
    // Imagetypen mit kontextabhängigen Beschreibungen
    const imageTypes = [
      {
        title: 'Konzeptbild',
        description: `Ein visuelles Konzept zum Thema "${thematicString}" ${styleDescription}.`,
        detail: `Das Bild sollte eine kreative Darstellung der Kernkonzepte sein, mit aussagekräftigen Elementen, die das Thema symbolisieren. ${conceptKeywords.length > 0 ? 'Folgende Elemente sollten einbezogen werden: ' + conceptKeywords.join(', ') + '.' : ''} ${technicalDetails}`,
        tags: [...topics.slice(0, 2), 'konzept', 'kreativ']
      },
      {
        title: 'Header-Bild',
        description: `Ein horizontales Header-Bild für einen Artikel zum Thema "${thematicString}" ${styleDescription}.`,
        detail: `Breites Format (16:9) mit zentralem Fokus und guter Lesbarkeit. Die Komposition sollte eine Geschichte erzählen und das Interesse wecken. ${conceptKeywords.length > 0 ? 'Thematische Elemente: ' + conceptKeywords.join(', ') + '.' : ''} ${technicalDetails}`,
        tags: [...topics.slice(0, 2), 'header', 'banner']
      },
      {
        title: 'Infografik',
        description: `Eine informative Infografik zum Thema "${thematicString}" ${styleDescription}.`,
        detail: `Die Grafik sollte Schlüsselinformationen visuell darstellen, mit klaren Symbolen, einer logischen Struktur und moderner Typografie. Fokus auf Klarheit und Informationsgehalt. ${conceptKeywords.length > 0 ? 'Schlüsselkonzepte: ' + conceptKeywords.join(', ') + '.' : ''} ${technicalDetails}`,
        tags: [...topics.slice(0, 2), 'infografik', 'daten']
      },
      {
        title: 'Stimmungsbild',
        description: `Ein atmosphärisches Stimmungsbild zum Thema "${thematicString}" ${styleDescription}.`,
        detail: `Das Bild sollte die emotionale Essenz des Themas einfangen, mit besonderem Fokus auf Atmosphäre, Licht und Emotion. Es sollte beim Betrachter eine Stimmung erzeugen, die mit dem Thema resoniert. ${conceptKeywords.length > 0 ? 'Stimmungselemente: ' + conceptKeywords.join(', ') + '.' : ''} ${technicalDetails}`,
        tags: [...topics.slice(0, 2), 'atmosphäre', 'emotional']
      },
      {
        title: 'Detailansicht',
        description: `Eine nahansichtige Detaildarstellung zu Aspekten von "${thematicString}" ${styleDescription}.`,
        detail: `Eine Nahaufnahme, die wichtige Details des Themas hervorhebt. Makro-Perspektive mit gezieltem Fokus auf texturelle und strukturelle Elemente. ${conceptKeywords.length > 0 ? 'Detailelemente: ' + conceptKeywords.join(', ') + '.' : ''} ${technicalDetails}`,
        tags: [...topics.slice(0, 2), 'detail', 'nahaufnahme']
      }
    ];
    
    // Wähle die drei am besten passenden Bildtypen basierend auf dem Stil
    let selectedImageTypes;
    
    if (style === 'technisch' || style === 'minimalistisch') {
      // Für technische Themen: Infografik, Konzeptbild, Detailansicht
      selectedImageTypes = [imageTypes[2], imageTypes[0], imageTypes[4]];
    } else if (style === 'emotional' || style === 'vintage' || style === 'aquarell') {
      // Für emotionale Stile: Stimmungsbild, Header-Bild, Detailansicht
      selectedImageTypes = [imageTypes[3], imageTypes[1], imageTypes[4]];
    } else if (style === 'abstrakt' || style === 'skizzenhaft') {
      // Für abstrakte/künstlerische Stile: Konzeptbild, Stimmungsbild, Header-Bild
      selectedImageTypes = [imageTypes[0], imageTypes[3], imageTypes[1]];
    } else {
      // Standard: Header-Bild, Konzeptbild, Infografik
      selectedImageTypes = [imageTypes[1], imageTypes[0], imageTypes[2]];
    }
    
    // Erzeuge die finalen Prompt-Ergebnisse
    return selectedImageTypes.map(imageType => ({
      id: `image-${imageType.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      type: 'image',
      title: imageType.title,
      prompt: `${imageType.description}
${imageType.detail}

Stil: ${style}, hochwertig, mit deutlichem Bezug zum Thema "${thematicString}".`,
      tags: [...imageType.tags, style]
    }));
  }
}