/**
 * Service zum Vereinfachen von komplexen KI-Bild-Prompts zu suchbaren Begriffen
 * für Stockfoto-Datenbanken. Verwendet KI-basierte Extraktion und lokale Fallbacks.
 */

import { apiConfig } from '@/lib/config/apiConfig';

interface SimplifyPromptResponse {
  success: boolean;
  simplifiedPrompt: string;
  error?: string;
}

// Cache für bereits vereinfachte Prompts, um unnötige Verarbeitung zu vermeiden
const promptCache: Record<string, string> = {};

/**
 * Vereinfacht einen komplexen KI-Prompt zu Suchbegriffen für Stockfoto-Datenbanken
 * Nutzt OpenRouter für KI-basierte Extraktion oder lokale Methoden als Fallback
 * @param originalPrompt Der ursprüngliche komplexe Prompt
 * @returns Ein vereinfachter Suchbegriff mit 2-3 relevanten Wörtern
 */
export async function simplifyPrompt(originalPrompt: string): Promise<SimplifyPromptResponse> {
  // Prüfe, ob der Prompt bereits im Cache ist
  if (promptCache[originalPrompt]) {
    return {
      success: true,
      simplifiedPrompt: promptCache[originalPrompt]
    };
  }
  
  try {
    // Versuche zuerst, mit KI zu vereinfachen
    const simplified = await simplifyWithAI(originalPrompt);
    
    if (simplified) {
      // Cache das Ergebnis
      promptCache[originalPrompt] = simplified;
      
      return {
        success: true,
        simplifiedPrompt: simplified
      };
    } else {
      // Wenn KI fehlschlägt, verwende verbesserte lokale Methode
      const localSimplified = improvedLocalSimplifier(originalPrompt);
      promptCache[originalPrompt] = localSimplified;
      
      return {
        success: true,
        simplifiedPrompt: localSimplified
      };
    }
  } catch (error) {
    console.error('Fehler bei der Prompt-Vereinfachung:', error);
    
    // Fallback mit verbesserter lokaler Methode
    const fallbackSimplified = improvedLocalSimplifier(originalPrompt);
    
    return {
      success: true,
      simplifiedPrompt: fallbackSimplified,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}

/**
 * Verwendet OpenRouter, um den Prompt mit KI zu 2-3 Suchbegriffen zu reduzieren
 */
async function simplifyWithAI(originalPrompt: string): Promise<string | null> {
  const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    return null; // Kein API-Schlüssel vorhanden
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://schreibhorst.app' // Wichtig für OpenRouter
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku', // Schnelles, kostengünstiges Modell 
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Spezialist für die Extraktion von Suchbegriffen für Stockbilddatenbanken. Extrahiere die 2-3 wichtigsten Suchbegriffe (Nomen/Adjektive) aus dem Prompt und gib NUR diese Begriffe zurück - keine Erklärungen, keine vollständigen Sätze, nur die Begriffe durch Leerzeichen getrennt.'
          },
          {
            role: 'user',
            content: originalPrompt
          }
        ],
        max_tokens: 20 // Brauchen nur wenige Tokens für die Antwort
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    const data = await response.json();
    let simplified = data.choices[0]?.message?.content.trim();
    
    // Stelle sicher, dass wir nicht mehr als 3 Wörter haben
    if (simplified) {
      const words = simplified.split(/\s+/);
      if (words.length > 3) {
        simplified = words.slice(0, 3).join(' ');
      }
      
      return simplified;
    }
    
    return null;
  } catch (error) {
    console.error('Fehler bei der KI-basierten Vereinfachung:', error);
    return null;
  }
}

/**
 * Verbesserte lokale Vereinfachungsfunktion, die wichtige Konzepte extrahiert
 */
export function improvedLocalSimplifier(originalPrompt: string): string {
  // Entferne typische KI-Prompt-Anweisungen und Parameter
  let cleaned = originalPrompt
    // Entferne Stilanweisungen
    .replace(/(,\s*|^)(im stil von|stil von|von|wie|ähnlich wie|nach)(.+?)(?=[,.]|$)/gi, '')
    // Entferne Kameraeinstellungen
    .replace(/(,\s*|^)(aufgenommen mit|mit|objektiv|linse|blende|iso)(.+?)(?=[,.]|$)/gi, '')
    // Entferne Qualitätsanweisungen
    .replace(/(,\s*|^)(hochwertig|detailliert|fotorealistisch|ultra realistisch|8k|4k)(.+?)(?=[,.]|$)/gi, '')
    // Entferne Gewichtungssyntax für Stable Diffusion ((wort)), [wort], (wort:1.2)
    .replace(/\(\([^)]+\)\)|\[[^\]]+\]|\([^:)]+:[0-9.]+\)/g, '')
    // Entferne überzählige Kommas und Leerzeichen
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Liste unwichtiger Wörter (Stopwords)
  const stopwords = [
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'mit', 'bei', 'in', 'auf', 
    'unter', 'über', 'vor', 'nach', 'seit', 'während', 'wegen', 'trotz', 'statt', 'ohne', 
    'für', 'gegen', 'um', 'durch', 'bis', 'von', 'aus', 'nach', 'ist', 'sind', 'war', 
    'wird', 'wurde', 'hat', 'haben', 'hatte', 'wird', 'wurde', 'kann', 'muss', 'soll', 
    'will', 'mag', 'darf', 'einer', 'eines', 'einen', 'eine', 'einer', 'einem', 'einen',
    'detaillierte', 'fotografie', 'foto', 'bild', 'aufnahme', 'fotografiert', 'fotografiert',
    'zeigt', 'darstellt', 'zeigen', 'darstellung', 'enthält', 'besteht', 'a', 'an', 'the',
    'showing', 'displaying', 'consisting', 'with', 'and', 'or', 'of', 'to', 'at'
  ];
  
  // Teile den gereinigten Prompt in Wörter
  const words = cleaned.split(/[\s,]+/);
  
  // Identifiziere wichtige Wörter (keine Stopwords, mindestens 3 Zeichen)
  const importantWords = words.filter(word => {
    const normalizedWord = word.toLowerCase();
    return normalizedWord.length >= 3 && !stopwords.includes(normalizedWord);
  });
  
  // Bewerte Wörter nach Relevanz (Länge kann ein Indikator für Spezifität sein)
  const scoredWords = importantWords.map(word => ({
    word,
    score: word.length - 2, // Längere Wörter bekommen einen höheren Score
    isNoun: /^[A-ZÄÖÜ]/.test(word) // Großgeschriebene Wörter sind eher Nomen (für Deutsch)
  }));
  
  // Bevorzuge Nomen und längere Wörter
  scoredWords.sort((a, b) => {
    // Zuerst Nomen vor Nicht-Nomen
    if (a.isNoun && !b.isNoun) return -1;
    if (!a.isNoun && b.isNoun) return 1;
    // Dann nach Score sortieren
    return b.score - a.score;
  });
  
  // Wähle die Top 2-3 Wörter
  const selectedWords = scoredWords.slice(0, 3).map(item => item.word);
  
  // Falls nicht genug wichtige Wörter gefunden wurden, ergänze mit den ersten Wörtern
  if (selectedWords.length < 2 && words.length >= 2) {
    for (const word of words) {
      if (!selectedWords.includes(word) && selectedWords.length < 2) {
        selectedWords.push(word);
      }
    }
  }
  
  return selectedWords.join(' ');
}

/**
 * Bisherige lokale Vereinfachungsfunktion (für Abwärtskompatibilität)
 */
export function simplifyPromptLocally(originalPrompt: string): string {
  return improvedLocalSimplifier(originalPrompt);
} 