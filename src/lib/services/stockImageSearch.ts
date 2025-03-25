/**
 * Service für die Suche nach Stockbildern
 */

import { apiConfig, isServiceEnabled } from '@/lib/config/apiConfig';
import { stockImageConfig } from '../config/apiConfig';

export interface StockImageProvider {
  id: string;
  name: string;
  logo?: string;
  baseUrl?: string;
  description: string;
  isActive: boolean;
}

export interface StockImageResult {
  id: string;
  thumbnailUrl: string;
  fullSizeUrl: string;
  title?: string;
  provider: StockImageProvider;
  tags?: string[];
  licenseInfo?: string;
  downloadUrl?: string;
  author?: string;
}

export interface SearchStockImagesResponse {
  success: boolean;
  results: StockImageResult[];
  error?: string;
  totalResults?: number;
  page?: number;
  provider: string;
}

// Prüft, ob Pixabay aktiviert ist
const isPixabayEnabled = isServiceEnabled('pixabay');

// Stelle sicher, dass Pixabay aktiviert wird, wenn NEXT_PUBLIC_ENABLE_PIXABAY=true gesetzt ist
// (Überschreibe das Ergebnis von isServiceEnabled, falls API-Probleme es deaktiviert haben)
const forceEnablePixabay = process.env.NEXT_PUBLIC_ENABLE_PIXABAY === 'true';

// Verfügbare Bildanbieter
export const stockImageProviders: StockImageProvider[] = [
  {
    id: 'pixabay',
    name: 'Pixabay',
    logo: 'https://pixabay.com/static/img/logo.svg',
    baseUrl: stockImageConfig.pixabay.searchUrl,
    description: 'Kostenlose Bilder und Royalty-free Stock',
    isActive: true
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    logo: 'https://unsplash.com/assets/core/logo-black.svg',
    baseUrl: 'https://unsplash.com/s/',
    description: 'Hochwertige freie Bilder',
    isActive: false
  }
];

// Nur aktive Anbieter anzeigen
export const activeStockImageProviders = stockImageProviders;

// Beispiel-Tags für verschiedene Suchbegriffe
const tagsByKeyword: Record<string, string[]> = {
  'natur': ['landschaft', 'wald', 'berge', 'see', 'wildtiere', 'blumen', 'himmel'],
  'stadt': ['urban', 'gebäude', 'architektur', 'straße', 'skyline', 'nacht', 'menschen'],
  'essen': ['food', 'restaurant', 'gericht', 'kochen', 'dessert', 'gesund', 'frisch'],
  'business': ['büro', 'meeting', 'laptop', 'team', 'konferenz', 'arbeit', 'erfolg'],
  'technologie': ['computer', 'digital', 'innovation', 'smartphone', 'internet', 'daten', 'zukunft'],
  'gesundheit': ['medizin', 'fitness', 'yoga', 'wellness', 'entspannung', 'sport', 'meditation'],
  'reise': ['urlaub', 'strand', 'meer', 'abenteuer', 'erholung', 'hotel', 'kulturell'],
  'familie': ['kinder', 'eltern', 'gemeinsam', 'glück', 'zuhause', 'generationen', 'liebe'],
  'bildung': ['schule', 'lernen', 'bücher', 'studenten', 'wissen', 'universität', 'forschung'],
  'kunst': ['kreativ', 'malerei', 'design', 'skulptur', 'fotografie', 'ausstellung', 'museum']
};

// Standardtags
const defaultTags = ['hochwertig', 'professionell', 'stockfoto', 'bild'];

/**
 * Sucht über die Pixabay API nach Bildern (verwendet die sichere Server-API-Route)
 * @param query Suchbegriff
 * @param page Seitennummer (optional)
 * @param perPage Ergebnisse pro Seite (optional)
 * @returns Promise mit den Suchergebnissen
 */
async function searchPixabay(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<SearchStockImagesResponse> {
  try {
    // Verwende die sichere Server-API-Route statt direkter API-Aufrufe
    const endpoint = `/api/stockimages/search?query=${encodeURIComponent(query)}&provider=pixabay&page=${page}&perPage=${perPage}`;
    
    console.log('Sende Anfrage an Server-Endpunkt:', endpoint);
    
    const response = await fetch(endpoint);
    
    // Hole den Antworttext für bessere Fehlerbehandlung
    const responseText = await response.text();
    
    // Wenn die Antwort leer ist, handle es als Fehler
    if (!responseText || responseText.trim() === '') {
      console.error('Leere Antwort vom Server erhalten');
      throw new Error('Der Server hat eine leere Antwort zurückgegeben');
    }
    
    let responseData;
    try {
      // Versuche die Antwort als JSON zu parsen
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Fehler beim Parsen der JSON-Antwort:', parseError);
      console.error('Erhaltener Text:', responseText);
      throw new Error('Ungültiges Antwortformat vom Server');
    }
    
    if (!response.ok) {
      console.error('Server-Fehler:', responseData.error || response.statusText);
      throw new Error(responseData.error || `HTTP-Fehler: ${response.status}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('Fehler bei der Pixabay-Suche:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Bei der Suche ist ein Fehler aufgetreten',
      provider: 'pixabay'
    };
  }
}

/**
 * Sucht nach Stockbildern (Mock-Implementierung für andere Provider als Pixabay)
 * @param query Suchbegriff
 * @param providerId ID des Anbieters
 * @returns Promise mit den Suchergebnissen
 */
async function searchMockProvider(
  query: string, 
  providerId: string
): Promise<SearchStockImagesResponse> {
  // Simuliere Netzwerklatenz
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Prüfe, ob ein gültiger Anbieter ausgewählt wurde
  const provider = stockImageProviders.find(p => p.id === providerId);
  if (!provider) {
    return {
      success: false,
      results: [],
      error: 'Ungültiger Anbieter',
      provider: providerId
    };
  }
  
  try {
    // Bestimme die Anzahl der Ergebnisse
    let resultCount = 12;
    
    // Generiere verschiedene Ergebnisse je nach Anbieter
    const results: StockImageResult[] = Array.from({ length: resultCount }).map((_, index) => {
      // Bestimme Tags basierend auf der Suchanfrage
      const keywordMatches = Object.keys(tagsByKeyword).filter(key => 
        query.toLowerCase().includes(key.toLowerCase())
      );
      
      // Wähle passende Tags oder Standardtags
      let tags: string[] = [...defaultTags];
      if (keywordMatches.length > 0) {
        keywordMatches.forEach(key => {
          tags = [...tags, ...tagsByKeyword[key]];
        });
      }
      
      // Mische die Tags und begrenze sie auf maximal 8
      tags = [...new Set(tags)].sort(() => Math.random() - 0.5).slice(0, 8);
      
      // Erstelle ein zufälliges Bild mit Unsplash-API
      const imageId = Math.floor(Math.random() * 1000) + 1;
      const width = 800;
      const height = 600;
      
      // Unsplash Source API für Beispielbilder
      const imageUrl = `https://source.unsplash.com/random/${width}x${height}?${encodeURIComponent(query)}&sig=${imageId + (providerId === 'unsplash' ? 0 : 1000)}`;
      const thumbnailUrl = imageUrl;
      
      // Erstelle das Ergebnisobjekt
      return {
        id: `${provider.id}-${imageId}`,
        thumbnailUrl,
        fullSizeUrl: imageUrl,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} Bild ${index + 1}`,
        provider,
        tags,
        licenseInfo: provider.id === 'unsplash' || provider.id === 'pixabay' 
          ? 'Kostenlose Nutzung unter Namensnennung' 
          : 'Kommerzielle Lizenz erforderlich',
        author: `Fotograf ${Math.floor(Math.random() * 100) + 1}`,
        downloadUrl: imageUrl
      };
    });
    
    return {
      success: true,
      results,
      totalResults: resultCount,
      page: 1,
      provider: providerId
    };
  } catch (error) {
    console.error('Fehler bei der Stockbildsuche:', error);
    return {
      success: false,
      results: [],
      error: 'Bei der Suche ist ein Fehler aufgetreten',
      provider: providerId
    };
  }
}

// iStock-Suchfunktion
async function searchIStock(query: string, page: number = 1, perPage: number = 20): Promise<SearchStockImagesResponse> {
  const config = stockImageConfig.istock;
  
  if (!config.isEnabled) {
    return {
      success: false,
      error: 'iStock API ist nicht konfiguriert',
      results: [],
      provider: 'istock'
    };
  }

  try {
    // Authentifizierung
    const authResponse = await fetch('https://api.gettyimages.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.apiSecret}`
    });

    const authData = await authResponse.json();
    
    if (!authResponse.ok) {
      throw new Error('Authentifizierung fehlgeschlagen');
    }

    // Bildsuche
    const searchResponse = await fetch(`${config.baseUrl}search/images?phrase=${encodeURIComponent(query)}&page=${page}&page_size=${perPage}&fields=id,title,preview,referral_destinations,keywords`, {
      headers: {
        'Api-Key': config.apiKey,
        'Authorization': `Bearer ${authData.access_token}`
      }
    });

    const data = await searchResponse.json();

    if (!searchResponse.ok) {
      throw new Error(data.error || 'Fehler bei der Suche');
    }

    // Formatiere die Ergebnisse
    const results: StockImageResult[] = data.images.map((image: any) => ({
      id: image.id,
      title: image.title,
      thumbnailUrl: image.preview.url,
      fullSizeUrl: image.referral_destinations[0].uri,
      downloadUrl: image.referral_destinations[0].uri,
      provider: stockImageProviders.find(p => p.id === 'istock')!,
      tags: image.keywords || [],
      licenseInfo: 'iStock Lizenz erforderlich',
      author: image.artist || undefined
    }));

    return {
      success: true,
      results,
      provider: 'istock',
      totalResults: data.total_count,
      page
    };

  } catch (error) {
    console.error('iStock API Fehler:', error);
    return {
      success: false,
      error: 'Fehler bei der iStock-Suche',
      results: [],
      provider: 'istock'
    };
  }
}

/**
 * Sucht nach Stockbildern
 * @param query Suchbegriff
 * @param providerId ID des Anbieters (optional)
 * @returns Promise mit den Suchergebnissen
 */
export async function searchStockImages(
  query: string,
  providerId: string = 'pixabay',
  page: number = 1,
  perPage: number = 20
): Promise<SearchStockImagesResponse> {
  // Prüfe, ob ein gültiger Anbieter ausgewählt wurde
  const provider = stockImageProviders.find(p => p.id === providerId);
  if (!provider) {
    return {
      success: false,
      results: [],
      error: 'Ungültiger Anbieter',
      provider: providerId
    };
  }

  switch (providerId) {
    case 'pixabay':
      return searchPixabay(query, page, perPage);
    case 'unsplash':
      // Temporärer Mock für Unsplash
      return {
        success: false,
        results: [],
        error: 'Unsplash API noch nicht konfiguriert',
        provider: 'unsplash'
      };
    case 'istock':
      return searchIStock(query, page, perPage);
    default:
      return {
        success: false,
        error: 'Unbekannter Provider',
        results: [],
        provider: providerId
      };
  }
}

/**
 * Generiert eine URL für die Suche auf der Website des Anbieters
 * @param query Suchbegriff
 * @param providerId ID des Anbieters
 * @returns URL für die Suche
 */
export function getStockImageSearchUrl(query: string, providerId: string): string | null {
  const provider = stockImageProviders.find(p => p.id === providerId);
  
  if (provider && provider.baseUrl) {
    return `${provider.baseUrl}${encodeURIComponent(query)}`;
  }
  
  return null;
} 