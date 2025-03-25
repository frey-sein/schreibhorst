import { NextRequest, NextResponse } from 'next/server';
import { simplifyPromptLocally } from '@/lib/services/promptSimplifier';
import { apiConfig } from '@/lib/config/apiConfig';

// OpenRouter API Konfiguration
const OPENROUTER_API_KEY = apiConfig.openRouter.apiKey;
const MODEL_ID = 'openai/gpt-3.5-turbo-instruct';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Kein Prompt angegeben' },
        { status: 400 }
      );
    }

    const simplifiedPrompt = simplifyPromptLocally(prompt);
    
    return NextResponse.json({
      success: true,
      simplifiedPrompt
    });
  } catch (error) {
    console.error('Fehler beim Vereinfachen des Prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
} 