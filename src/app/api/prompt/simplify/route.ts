import { NextRequest, NextResponse } from 'next/server';
import { simplifyPromptLocally } from '@/lib/services/promptSimplifier';
import { apiConfig } from '@/lib/config/apiConfig';

// OpenRouter API Konfiguration
const OPENROUTER_API_KEY = apiConfig.openRouter.apiKey;
const MODEL_ID = 'openai/gpt-3.5-turbo-instruct';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Prompt' },
        { status: 400 }
      );
    }
    
    // Wenn kein OpenRouter API-Key konfiguriert ist, verwende die lokale Vereinfachung
    if (!OPENROUTER_API_KEY) {
      const simplified = simplifyPromptLocally(prompt);
      return NextResponse.json({ success: true, simplifiedPrompt: simplified });
    }
    
    // System-Prompt für die KI
    const systemPrompt = `Du bist ein Experte für die Vereinfachung von Bild-Prompts. 
    Deine Aufgabe ist es, komplexe Bildbeschreibungen in 2-3 einfache Suchbegriffe umzuwandeln.
    Wichtig:
    - Extrahiere nur die wichtigsten Substantive und Adjektive
    - Ignoriere Stilanweisungen, Kameraeinstellungen und technische Details
    - Verwende deutsche Begriffe
    - Maximal 3 Wörter
    - Keine Artikel oder Präpositionen
    Beispiel:
    "Eine detaillierte Fotografie einer süßen Katze auf Hawaii, aufgenommen mit einer Canon EOS R5, im Stil von National Geographic" → "Katze Hawaii Strand"
    "Ein fotorealistisches Portrait einer jungen Frau mit blonden Haaren, 8k Auflösung, im Stil von Renaissance-Gemälden" → "Frau blonde Haare"`;

    // API-Anfrage an OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://schreibhorst.de',
        'X-Title': 'Schreibhorst'
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API Fehler: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Ungültige Antwort von OpenRouter');
    }
    
    // Extrahiere den vereinfachten Prompt
    const simplifiedPrompt = data.choices[0].message.content.trim();
    
    // Fallback zur lokalen Vereinfachung, falls die KI-Antwort zu lang ist
    if (simplifiedPrompt.split(' ').length > 3) {
      return NextResponse.json({
        success: true,
        simplifiedPrompt: simplifyPromptLocally(prompt)
      });
    }
    
    return NextResponse.json({
      success: true,
      simplifiedPrompt
    });
    
  } catch (error) {
    console.error('Fehler bei der Prompt-Vereinfachung:', error);
    
    // Bei einem Fehler verwende die lokale Vereinfachung
    const { prompt } = await request.json();
    const simplified = simplifyPromptLocally(prompt);
    
    return NextResponse.json({
      success: true,
      simplifiedPrompt: simplified,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
} 