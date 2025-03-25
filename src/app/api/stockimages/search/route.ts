import { NextRequest, NextResponse } from 'next/server';
import { apiConfig, getServerApiKey, isServiceEnabled } from '@/lib/config/apiConfig';

// Umgebungsvariablen Diagnose
console.log('API-Route geladen:');
console.log('- PIXABAY_API_KEY Status:', process.env.PIXABAY_API_KEY ? 'vorhanden' : 'fehlt');
console.log('- NEXT_PUBLIC_ENABLE_PIXABAY:', process.env.NEXT_PUBLIC_ENABLE_PIXABAY);

export async function GET(
  request: NextRequest
) {
  try {
    // Extrahiere Parameter aus der Anfrage
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const provider = searchParams.get('provider') || 'pixabay';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    
    console.log(`Stockbild-Suche: Anbieter=${provider}, Abfrage="${query}", Seite=${page}, PerPage=${perPage}`);
    
    // Prüfe, ob die Abfrage gültig ist
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Suchbegriff fehlt' },
        { status: 400 }
      );
    }
    
    // Erweiterte Validierung
    if (page < 1 || perPage < 1 || perPage > 50) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Seitenkonfiguration' },
        { status: 400 }
      );
    }
    
    // Prüfe, ob der angeforderte Anbieter aktiviert ist
    if (provider === 'pixabay') {
      const pixabayEnabled = isServiceEnabled('pixabay');
      const forceEnablePixabay = process.env.NEXT_PUBLIC_ENABLE_PIXABAY === 'true';
      
      if (!pixabayEnabled && !forceEnablePixabay) {
        console.error('Pixabay ist nicht aktiviert oder der API-Schlüssel fehlt');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Pixabay ist nicht aktiviert oder der API-Schlüssel fehlt. Bitte konfiguriere die Umgebungsvariablen.',
            debug: {
              enabled: process.env.NEXT_PUBLIC_ENABLE_PIXABAY === 'true',
              keyExists: !!process.env.PIXABAY_API_KEY
            }
          },
          { status: 400 }
        );
      }
    } else {
      // Standardmäßig einen Fehler zurückgeben
      return NextResponse.json(
        { success: false, error: 'Unbekannter oder nicht unterstützter Provider' },
        { status: 400 }
      );
    }
    
    // Je nach Provider die entsprechende Suchfunktion aufrufen
    if (provider === 'pixabay') {
      return await searchPixabay(query, page, perPage);
    }
    
    // Falls wir hierher kommen, ist etwas schiefgelaufen
    return NextResponse.json(
      { success: false, error: 'Unerwarteter Fehler bei der Providerauswahl' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Fehler bei der Stockbildsuche:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? `Ein interner Serverfehler ist aufgetreten: ${error.message}` : 'Ein interner Serverfehler ist aufgetreten'
      },
      { status: 500 }
    );
  }
}

/**
 * Sucht über die Pixabay API nach Bildern (serverseitig)
 */
async function searchPixabay(
  query: string,
  page: number = 1,
  perPage: number = 20
) {
  try {
    const apiKey = getServerApiKey('pixabay');
    
    if (!apiKey) {
      console.error('Pixabay API-Schlüssel fehlt');
      return NextResponse.json(
        { success: false, error: 'API-Konfiguration unvollständig' },
        { status: 500 }
      );
    }
    
    // Pixabay API-Endpunkt
    const endpoint = `${apiConfig.pixabay.baseUrl}?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=${perPage}&page=${page}&lang=de`;
    
    console.log('Pixabay API Anfrage URL (ohne Schlüssel):', 
      endpoint.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Keine Fehlermeldung verfügbar');
      console.error(`Pixabay API Fehler ${response.status}: ${errorText}`);
      throw new Error(`HTTP-Fehler: ${response.status}, Details: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Überprüfe, ob die Antwort eine Fehlermeldung enthält
    if (data.error) {
      console.error('Pixabay API meldete Fehler:', data.error);
      return NextResponse.json(
        { success: false, error: `Pixabay API Fehler: ${data.error}` },
        { status: 400 }
      );
    }
    
    // Prüfe, ob Ergebnisse vorhanden sind
    if (!data.hits || !Array.isArray(data.hits)) {
      console.error('Unerwartetes Antwortformat von Pixabay:', data);
      return NextResponse.json(
        { success: false, error: 'Unerwartetes Antwortformat von der API' },
        { status: 500 }
      );
    }
    
    console.log(`Pixabay API Antwort: ${data.hits.length} Treffer`);
    
    // Provider-Informationen für die Antwort
    const providerInfo = {
      id: 'pixabay',
      name: 'Pixabay',
      logo: 'https://pixabay.com/static/img/logo.svg',
      baseUrl: 'https://pixabay.com/images/search/',
      description: 'Kostenlose Bilder und Royalty-free Stock',
      isActive: true
    };
    
    // Ergebnisse in unser Format umwandeln
    const results = data.hits.map((hit: any) => {
      // Tags aus der Pixabay-Antwort extrahieren
      const tags = hit.tags.split(',').map((tag: string) => tag.trim());
      
      return {
        id: `pixabay-${hit.id}`,
        thumbnailUrl: hit.previewURL,
        fullSizeUrl: hit.largeImageURL,
        title: hit.tags.split(',')[0] || 'Pixabay Bild',
        provider: providerInfo,
        tags,
        licenseInfo: 'Pixabay License - Kostenlose kommerzielle Nutzung',
        author: hit.user,
        downloadUrl: hit.largeImageURL
      };
    });
    
    return NextResponse.json({
      success: true,
      results,
      totalResults: data.totalHits,
      page,
      provider: 'pixabay'
    });
  } catch (error) {
    console.error('Fehler bei der Pixabay-Suche:', error);
    return NextResponse.json(
      { success: false, error: 'Bei der Suche ist ein Fehler aufgetreten' },
      { status: 500 }
    );
  }
} 