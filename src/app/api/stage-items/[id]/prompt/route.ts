import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id);
    const { prompt, itemType } = await request.json();
    
    if (isNaN(itemId) || !prompt) {
      return NextResponse.json(
        { error: 'Ungültige Item-ID oder Prompt fehlt' }, 
        { status: 400 }
      );
    }
    
    // Statt den Store direkt zu verwenden, geben wir einfach eine Erfolgsantwort zurück
    // Der Client-Code wird dann den Store aktualisieren
    
    return NextResponse.json({ 
      success: true,
      updatedItem: true,
      id: itemId,
      itemType,
      prompt
    });
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Prompts:', error);
    return NextResponse.json(
      { error: `Interner Serverfehler: ${(error instanceof Error ? error.message : String(error))}` }, 
      { status: 500 }
    );
  }
} 