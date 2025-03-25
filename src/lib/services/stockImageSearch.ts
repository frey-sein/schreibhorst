/**
 * Service für die Suche nach Stockbildern
 */

import { apiConfig, isServiceEnabled } from '@/lib/config/apiConfig';

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
    id: 'unsplash',
    name: 'Unsplash',
    logo: 'https://unsplash.com/assets/core/logo-black-df2168ed0c378fa5506b1816e75eb379d06cfcd0af01e07a2eb813ae9b5d7405.svg',
    baseUrl: 'https://unsplash.com/s/photos/',
    description: 'Kostenlose hochwertige Bilder',
    isActive: true
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    logo: 'https://pixabay.com/static/img/logo.svg',
    baseUrl: 'https://pixabay.com/images/search/',
    description: 'Kostenlose Bilder und Royalty-free Stock',
    isActive: forceEnablePixabay || isPixabayEnabled
  },
  {
    id: 'istockphoto',
    name: 'iStock Photo',
    logo: 'https://www.istockphoto.com/istockphoto_logo.svg',
    baseUrl: 'https://www.istockphoto.com/de/search/2/image?phrase=',
    description: 'Premium Stockfotos von Getty Images',
    isActive: false
  },
  {
    id: 'adobestock',
    name: 'Adobe Stock',
    logo: 'https://www.adobe.com/content/dam/cc/icons/Adobe_Corporate_Horizontal_Red_HEX.svg',
    baseUrl: 'https://stock.adobe.com/de/search?k=',
    description: 'Große Auswahl an Stockfotos, Vektoren und Videos',
    isActive: false
  }
];

// Nur aktive Anbieter anzeigen
export const activeStockImageProviders = stockImageProviders.filter(provider => provider.isActive);

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
  
  // Prüfe, ob der Anbieter aktiv ist
  if (!provider.isActive) {
    return {
      success: false,
      results: [],
      error: 'Dieser Anbieter ist derzeit nicht aktiviert',
      provider: providerId
    };
  }
  
  // Je nach Anbieter die entsprechende Suchfunktion aufrufen
  switch (providerId) {
    case 'pixabay':
      return searchPixabay(query, page, perPage);
    default:
      return searchMockProvider(query, providerId);
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