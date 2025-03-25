/**
 * Service zum Vereinfachen von komplexen KI-Bild-Prompts zu suchbaren Begriffen
 * für Stockfoto-Datenbanken. Verwendet ein kostengünstiges KI-Modell via OpenRouter.
 */

import { apiConfig } from '@/lib/config/apiConfig';

interface SimplifyPromptResponse {
  success: boolean;
  simplifiedPrompt: string;
  error?: string;
}

// Cache für bereits vereinfachte Prompts, um unnötige API-Aufrufe zu vermeiden
const promptCache: Record<string, string> = {};

/**
 * Vereinfacht einen komplexen KI-Prompt zu Suchbegriffen für Stockfoto-Datenbanken
 * @param originalPrompt Der ursprüngliche komplexe Prompt
 * @returns Ein vereinfachter Suchbegriff
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
    const endpoint = `/api/prompt/simplify`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: originalPrompt })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Unbekannter Fehler bei der Prompt-Vereinfachung');
    }

    // Cache das Ergebnis
    promptCache[originalPrompt] = data.simplifiedPrompt;
    
    return {
      success: true,
      simplifiedPrompt: data.simplifiedPrompt
    };
  } catch (error) {
    console.error('Fehler bei der Prompt-Vereinfachung:', error);
    
    // Fallback zur lokalen Vereinfachung
    return {
      success: true,
      simplifiedPrompt: simplifyPromptLocally(originalPrompt),
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}

/**
 * Einfache lokale Vereinfachungsfunktion als Fallback,
 * wenn die API nicht verfügbar ist oder fehlschlägt
 */
export function simplifyPromptLocally(originalPrompt: string): string {
  // Entferne typische KI-Prompt-Anweisungen und Parameter
  let simplified = originalPrompt
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
  
  // Extrahiere die wichtigsten Substantive und Adjektive
  const words = simplified.split(' ');
  const importantWords = words.filter(word => {
    // Ignoriere Artikel, Präpositionen und andere unwichtige Wörter
    const unimportantWords = [
      'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'mit', 'bei', 'in', 'auf', 
      'unter', 'über', 'vor', 'nach', 'seit', 'während', 'wegen', 'trotz', 'statt', 'ohne', 
      'für', 'gegen', 'um', 'durch', 'bis', 'von', 'aus', 'nach', 'ist', 'sind', 'war', 
      'wird', 'wurde', 'hat', 'haben', 'hatte', 'wird', 'wurde', 'kann', 'muss', 'soll', 
      'will', 'mag', 'darf', 'einer', 'eines', 'einen', 'eine', 'einer', 'einem', 'einen',
      'detaillierte', 'fotografie', 'foto', 'bild', 'aufnahme', 'fotografiert', 'fotografiert'
    ];
    return !unimportantWords.includes(word.toLowerCase());
  });
  
  // Nehme die wichtigsten 2-3 Wörter
  simplified = importantWords.slice(0, 3).join(' ');
  
  // Falls nichts übrig bleibt, verwende die ersten Worte des Originals
  if (!simplified) {
    const words = originalPrompt.split(' ');
    simplified = words.slice(0, 3).join(' ');
  }
  
  return simplified;
} 