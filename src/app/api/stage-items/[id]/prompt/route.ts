import { NextRequest, NextResponse } from 'next/server';
import { useStageStore } from '@/lib/store/stageStore';

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
    
    // Zugriff auf den Stage-Store
    const stageStore = useStageStore.getState();
    
    if (itemType === 'text') {
      // Finde den Text im Store
      const textDraft = stageStore.textDrafts.find(item => item.id === itemId);
      
      if (!textDraft) {
        return NextResponse.json(
          { error: 'Text nicht gefunden' }, 
          { status: 404 }
        );
      }
      
      // Aktualisiere den Text-Prompt (content)
      stageStore.updateTextDraft(itemId, { content: prompt });
      
      return NextResponse.json({ 
        success: true,
        updatedText: true,
        id: itemId
      });
    } else {
      // Standardmäßig als Bild behandeln
      // Finde das Bild im Store
      const imageDraft = stageStore.imageDrafts.find(item => item.id === itemId);
      
      if (!imageDraft) {
        return NextResponse.json(
          { error: 'Bild nicht gefunden' }, 
          { status: 404 }
        );
      }
      
      // Aktualisiere den Bild-Prompt
      stageStore.updateImageDraft(itemId, { prompt });
      
      return NextResponse.json({ 
        success: true,
        updatedImage: true,
        id: itemId
      });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Prompts:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' }, 
      { status: 500 }
    );
  }
} 