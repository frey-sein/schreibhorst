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

// Prüft, ob Unsplash aktiviert ist
const isUnsplashEnabled = isServiceEnabled('unsplash');

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
    isActive: isPixabayEnabled || forceEnablePixabay
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    logo: 'https://unsplash.com/assets/core/logo-black.svg',
    baseUrl: 'https://unsplash.com/s/',
    description: 'Hochwertige freie Bilder',
    isActive: isUnsplashEnabled
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
    const pixabayApiKey = process.env.NEXT_PUBLIC_PIXABAY_API_KEY;
    
    if (!pixabayApiKey) {
      throw new Error('Pixabay API-Key nicht konfiguriert');
    }

    const response = await fetch(
      `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&lang=de`
    );

    if (!response.ok) {
      throw new Error(`Pixabay API Fehler: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.hits) {
      throw new Error('Ungültige Antwort von Pixabay API');
    }

    return {
      success: true,
      results: data.hits.map((hit: any) => ({
        id: hit.id.toString(),
        thumbnailUrl: hit.previewURL,
        fullSizeUrl: hit.largeImageURL,
        downloadUrl: hit.largeImageURL,
        title: hit.tags.split(', ')[0] || 'Stockbild',
        provider: stockImageProviders.find(p => p.id === 'pixabay')!,
        tags: hit.tags.split(', '),
        licenseInfo: 'Pixabay Lizenz',
        author: hit.user
      })),
      totalResults: data.totalHits,
      page,
      provider: 'pixabay'
    };
  } catch (error) {
    console.error('Fehler bei der Pixabay-Suche:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Pixabay-Suche',
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
      // Konvertiere das Set zu einem Array, um die Iteration zu ermöglichen
      const uniqueTags = Array.from(new Set(tags));
      const mixedTags = uniqueTags.sort(() => Math.random() - 0.5).slice(0, 8);
      
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
        tags: mixedTags,
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
 * Sucht über die Unsplash API nach Bildern
 * @param query Suchbegriff
 * @param page Seitennummer (optional)
 * @param perPage Ergebnisse pro Seite (optional)
 * @returns Promise mit den Suchergebnissen
 */
async function searchUnsplash(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<SearchStockImagesResponse> {
  try {
    const unsplashApiKey = process.env.NEXT_PUBLIC_UNSPLASH_API_KEY;
    
    if (!unsplashApiKey) {
      throw new Error('Unsplash API-Key nicht konfiguriert');
    }

    // Rufe die Unsplash API auf
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashApiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API Fehler: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      throw new Error('Ungültige Antwort von Unsplash API');
    }

    return {
      success: true,
      results: data.results.map((photo: any) => {
        // Generiere Tags aus der Beschreibung oder dem alt_description, wenn keine Tags vorhanden sind
        let tags: string[] = [];
        
        // Wenn photo.tags existiert und ein Array ist
        if (photo.tags && Array.isArray(photo.tags) && photo.tags.length > 0) {
          tags = photo.tags.map((tag: any) => tag.title || '');
        } else {
          // Extrahiere Wörter aus der Beschreibung oder alt_description
          const description = photo.description || photo.alt_description || '';
          if (description) {
            // Teile die Beschreibung in Wörter auf und entferne kurze Wörter
            tags = description
              .split(/\s+/)
              .filter((word: string) => word.length > 3)
              .slice(0, 5);
          }
        }
        
        // Stelle sicher, dass wir einen anständigen Titel haben
        const title = photo.description || photo.alt_description || `Unsplash Bild ${photo.id.substring(0, 5)}`;
        
        return {
          id: photo.id,
          thumbnailUrl: photo.urls.small,
          fullSizeUrl: photo.urls.regular,
          downloadUrl: photo.urls.full,
          title: title.charAt(0).toUpperCase() + title.slice(1), // Erster Buchstabe groß
          provider: stockImageProviders.find(p => p.id === 'unsplash')!,
          tags: tags.filter(tag => tag && tag.trim().length > 0),
          licenseInfo: 'Unsplash Lizenz',
          author: photo.user.name
        };
      }),
      totalResults: data.total,
      page,
      provider: 'unsplash'
    };
  } catch (error) {
    console.error('Fehler bei der Unsplash-Suche:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Unsplash-Suche',
      provider: 'unsplash'
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
      return searchUnsplash(query, page, perPage);
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