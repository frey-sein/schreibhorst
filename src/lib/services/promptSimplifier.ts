/**
 * Service zum Vereinfachen von komplexen KI-Bild-Prompts zu suchbaren Begriffen
 * für Stockfoto-Datenbanken. Verwendet lokale Vereinfachungsmethoden.
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
 * Für mehr Zuverlässigkeit nutzt diese Funktion jetzt nur noch die lokale Vereinfachung
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
    // Direkt lokale Vereinfachung verwenden, um Netzwerkfehler zu vermeiden
    const simplifiedPrompt = simplifyPromptLocally(originalPrompt);
    
    // Cache das Ergebnis
    promptCache[originalPrompt] = simplifiedPrompt;
    
    return {
      success: true,
      simplifiedPrompt: simplifiedPrompt
    };
  } catch (error) {
    console.error('Fehler bei der Prompt-Vereinfachung:', error);
    
    // Fallback mit einer sehr einfachen Vereinfachung
    const fallbackSimplified = originalPrompt.split(' ').slice(0, 3).join(' ');
    
    return {
      success: true,
      simplifiedPrompt: fallbackSimplified,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}

/**
 * Einfache lokale Vereinfachungsfunktion
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