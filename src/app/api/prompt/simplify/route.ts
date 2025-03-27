import { NextRequest, NextResponse } from 'next/server';
import { simplifyPromptLocally } from '@/lib/services/promptSimplifier';

// Vereinfachte API-Route, die nur lokale Vereinfachung nutzt
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Kein Prompt angegeben' },
        { status: 400 }
      );
    }

    // Wir verwenden ausschließlich die lokale Vereinfachung, um Fehler zu vermeiden
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