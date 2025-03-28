import { v4 as uuidv4 } from 'uuid';

export interface TextModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export const availableTextModels: TextModel[] = [
  {
    id: 'openai/gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    provider: 'OpenRouter',
    description: 'Das leistungsstärkste Modell für hochwertige Textgenerierung'
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenRouter',
    description: 'Schnelles und kostengünstiges Modell für einfachere Texte'
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'OpenRouter',
    description: 'Anthropics leistungsstärkstes Modell für kreative Texte'
  }
];

export interface BlogPostContent {
  htmlContent: string;
  metaTitle: string;
  metaDescription: string;
}

interface GenerateTextResponse {
  success: boolean;
  content?: BlogPostContent;
  error?: string;
}

export async function generateBlogPost(prompt: string, modelId?: string): Promise<GenerateTextResponse> {
  try {
    // Prüfe, ob ein API-Schlüssel konfiguriert ist
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('OpenRouter API-Schlüssel fehlt in den Umgebungsvariablen');
      return {
        success: false,
        error: 'API-Schlüssel nicht konfiguriert'
      };
    }

    // Wenn kein Modell angegeben wurde, verwende das Standardmodell
    let model = modelId || 'openai/gpt-4-turbo-preview';

    // Blocke explizit Flux-Modelle für Textgenerierung
    if (model.includes('flux') || model.includes('FLUX')) {
      console.warn(`Flux-Modell "${model}" ist für Textgenerierung nicht erlaubt. Verwende GPT-4 Turbo.`);
      model = 'openai/gpt-4-turbo-preview';
    }

    // Prüfe, ob das Modell in der Liste verfügbar ist
    const isValidModel = availableTextModels.some(m => m.id === model);
    if (!isValidModel) {
      console.warn(`Das ausgewählte Modell "${model}" ist nicht in der Liste der verfügbaren Modelle. Verwende Standardmodell.`);
      model = 'openai/gpt-4-turbo-preview';
    }

    // System-Prompt für strukturierte Blogbeiträge
    const systemPrompt = `
      Du bist ein professioneller Content-Ersteller. Generiere einen strukturierten Blogbeitrag im HTML-Format.
      
      Folgende Anforderungen:
      1. Verwende eine klare Hierarchie mit <h1>, <h2> und <h3> Tags
      2. Erstelle einen prägnanten Meta-Titel (max. 55 Zeichen)
      3. Füge eine SEO-freundliche Meta-Beschreibung hinzu
      4. Verwende semantisches HTML für die Struktur
      5. Mache den Inhalt informativ und leserfreundlich
      
      Antwort als JSON im folgenden Format:
      {
        "htmlContent": "Der vollständige HTML-Inhalt des Blogbeitrags",
        "metaTitle": "SEO-Titel (max. 55 Zeichen)",
        "metaDescription": "SEO-Meta-Beschreibung"
      }
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/carsten-frey/schreibhorst',
        'X-Title': 'Schreibhorst'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fehler bei der Textgenerierung:', errorData);
      return {
        success: false,
        error: `API-Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`
      };
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        success: false,
        error: 'Unerwartetes Antwortformat von der API'
      };
    }

    try {
      // Parse den JSON-String aus der Antwort
      let content;
      try {
        content = JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        console.error('Fehler beim Parsen der API-Antwort:', parseError);
        console.log('Versuche, das JSON zu reparieren...');
        
        // Versuche, das JSON zu reparieren oder manuell zu extrahieren
        const jsonString = data.choices[0].message.content;
        
        // Extrahiere den HTML-Inhalt
        let htmlContent = "";
        const htmlMatch = jsonString.match(/"htmlContent"\s*:\s*"([^"]*)"/);
        if (htmlMatch && htmlMatch[1]) {
          htmlContent = htmlMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        }
        
        // Extrahiere den Meta-Titel
        let metaTitle = "";
        const titleMatch = jsonString.match(/"metaTitle"\s*:\s*"([^"]*)"/);
        if (titleMatch && titleMatch[1]) {
          metaTitle = titleMatch[1].replace(/\\"/g, '"');
        }
        
        // Extrahiere die Meta-Beschreibung
        let metaDescription = "";
        const descMatch = jsonString.match(/"metaDescription"\s*:\s*"([^"]*)"/);
        if (descMatch && descMatch[1]) {
          metaDescription = descMatch[1].replace(/\\"/g, '"');
        }
        
        // Erstelle ein manuell extrahiertes Objekt
        content = {
          htmlContent,
          metaTitle,
          metaDescription
        };
        
        if (!htmlContent || !metaTitle || !metaDescription) {
          return {
            success: false,
            error: `Fehler beim Parsen der API-Antwort: ${(parseError as Error).message}. Konnte nicht automatisch repariert werden.`
          };
        }
      }
      
      // Prüfe, ob alle erforderlichen Felder vorhanden sind
      if (!content.htmlContent || !content.metaTitle || !content.metaDescription) {
        return {
          success: false,
          error: 'Unvollständiger Inhalt in der API-Antwort'
        };
      }
      
      // Stelle sicher, dass HTML korrekt formatiert ist
      // Prüfe auf und repariere fehlerhafte HTML-Tags
      let sanitizedHtml = content.htmlContent;
      
      // Stelle sicher, dass es kein HTML-Entities-Problem gibt
      sanitizedHtml = sanitizedHtml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
      
      // Entferne Escapezeichen für Anführungszeichen innerhalb von HTML-Attributen
      sanitizedHtml = sanitizedHtml.replace(/\\"/g, '"');
      
      // Gib den generierten Blogbeitrag zurück
      return {
        success: true,
        content: {
          htmlContent: sanitizedHtml,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription
        }
      };
    } catch (parseError) {
      console.error('Fehler beim Parsen der API-Antwort:', parseError);
      return {
        success: false,
        error: `Fehler beim Parsen der API-Antwort: ${(parseError as Error).message}`
      };
    }
  } catch (error) {
    console.error('Fehler bei der Textgenerierung:', error);
    return {
      success: false,
      error: `Unerwarteter Fehler: ${(error as Error).message}`
    };
  }
} 