/**
 * API-Konfigurationen für verschiedene Dienste
 */

// Debugging-Informationen für Umgebungsvariablen
const pixabayEnabled = process.env.NEXT_PUBLIC_ENABLE_PIXABAY === 'true';
const pixabayKeyExists = !!process.env.PIXABAY_API_KEY;
const unsplashKeyExists = !!process.env.NEXT_PUBLIC_UNSPLASH_API_KEY;
const runwayKeyExists = !!process.env.RUNWAY_API_KEY;

console.log('API-Konfiguration geladen:');
console.log('- NEXT_PUBLIC_ENABLE_PIXABAY:', pixabayEnabled ? 'aktiviert' : 'deaktiviert');
console.log('- PIXABAY_API_KEY:', pixabayKeyExists ? 'vorhanden' : 'fehlt');
console.log('- NEXT_PUBLIC_UNSPLASH_API_KEY:', unsplashKeyExists ? 'vorhanden' : 'fehlt');
console.log('- RUNWAY_API_KEY:', runwayKeyExists ? 'vorhanden' : 'fehlt');

export const apiConfig = {
  // Pixabay-API-Konfiguration
  pixabay: {
    apiKey: process.env.PIXABAY_API_KEY || '',
    isEnabled: pixabayEnabled,
    baseUrl: 'https://pixabay.com/api/',
  },
  
  // Together AI Konfiguration
  togetherAi: {
    apiKey: process.env.TOGETHER_API_KEY || '',
    baseUrl: 'https://api.together.xyz',
  },
  
  // OpenRouter Konfiguration
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    isEnabled: !!process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-3.5-turbo-instruct'
  },
  
  // Unsplash Konfiguration
  unsplash: {
    apiKey: process.env.NEXT_PUBLIC_UNSPLASH_API_KEY || '',
    isEnabled: !!process.env.NEXT_PUBLIC_UNSPLASH_API_KEY,
    baseUrl: 'https://api.unsplash.com/'
  },
  
  // Runway Konfiguration
  runway: {
    apiKey: process.env.RUNWAY_API_KEY || '',
    isEnabled: !!process.env.RUNWAY_API_KEY,
    baseUrl: 'https://api.dev.runwayml.com/v1'
  },
  
  // Konfigurationen für weitere APIs können hier hinzugefügt werden
};

export const stockImageConfig = {
  pixabay: {
    apiKey: process.env.PIXABAY_API_KEY || '',
    isEnabled: Boolean(process.env.PIXABAY_API_KEY),
    baseUrl: 'https://pixabay.com/api/',
    searchUrl: 'https://pixabay.com/images/search/'
  },
  unsplash: {
    apiKey: process.env.NEXT_PUBLIC_UNSPLASH_API_KEY || '',
    isEnabled: Boolean(process.env.NEXT_PUBLIC_UNSPLASH_API_KEY),
    baseUrl: 'https://api.unsplash.com/',
    searchUrl: 'https://unsplash.com/s/'
  }
};

/**
 * Hilfsfunktion zur Verwendung auf der Serverseite, um den API-Schlüssel zu bekommen
 */
export function getServerApiKey(service: 'pixabay' | 'togetherAi' | 'openRouter' | 'unsplash' | 'runway'): string {
  const key = apiConfig[service].apiKey;
  if (!key) {
    console.warn(`API-Schlüssel für '${service}' fehlt oder ist leer`);
  }
  return key;
}

/**
 * Prüft, ob ein Dienst aktiviert ist (kann auf Client und Server verwendet werden)
 */
export function isServiceEnabled(service: 'pixabay' | 'togetherAi' | 'openRouter' | 'unsplash' | 'runway'): boolean {
  if (service === 'pixabay') {
    const isEnabled = apiConfig.pixabay.isEnabled;
    const hasKey = !!apiConfig.pixabay.apiKey;
    const status = isEnabled && hasKey;
    console.log(`Pixabay-Status: aktiviert=${isEnabled}, API-Schlüssel=${hasKey ? 'vorhanden' : 'fehlt'}, Gesamtstatus=${status ? 'aktiv' : 'inaktiv'}`);
    return status;
  } else if (service === 'openRouter') {
    return !!apiConfig.openRouter.apiKey;
  } else if (service === 'unsplash') {
    const hasKey = !!apiConfig.unsplash.apiKey;
    const status = apiConfig.unsplash.isEnabled && hasKey;
    console.log(`Unsplash-Status: API-Schlüssel=${hasKey ? 'vorhanden' : 'fehlt'}, Gesamtstatus=${status ? 'aktiv' : 'inaktiv'}`);
    return status;
  } else if (service === 'runway') {
    const hasKey = !!apiConfig.runway.apiKey;
    const status = apiConfig.runway.isEnabled && hasKey;
    console.log(`Runway-Status: API-Schlüssel=${hasKey ? 'vorhanden' : 'fehlt'}, Gesamtstatus=${status ? 'aktiv' : 'inaktiv'}`);
    return status;
  }
  
  // Andere Dienste können hier hinzugefügt werden
  return false;
} 