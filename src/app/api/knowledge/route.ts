import { NextRequest, NextResponse } from 'next/server';
import * as knowledgeStorage from '../../../lib/services/knowledgeStorage';
import { FAQItem } from '../../../lib/services/knowledgeStorage';

/**
 * GET /api/knowledge
 * Gibt alle FAQ-Items zurück
 */
export async function GET(req: NextRequest) {
  try {
    const faqItems = await knowledgeStorage.getAllFAQs();
    return NextResponse.json({ success: true, data: faqItems });
  } catch (error) {
    console.error('Fehler beim Abrufen der FAQ-Items:', error);
    return NextResponse.json(
      { success: false, message: 'FAQ-Items konnten nicht abgerufen werden' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge
 * Erstellt ein neues FAQ-Item
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Prüfe, ob alle erforderlichen Felder vorhanden sind
    if (!data.question || !data.answer || !data.category) {
      return NextResponse.json(
        { success: false, message: 'Frage, Antwort und Kategorie sind erforderlich' },
        { status: 400 }
      );
    }
    
    // Prüfe, ob ein Duplikat bereits existiert
    const existingItem = await knowledgeStorage.checkForDuplicate(data.question, data.category);
    if (existingItem) {
      // Prüfe, ob die Antworten unterschiedlich sind
      const answersAreDifferent = existingItem.answer !== data.answer;
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Eine ähnliche Frage existiert bereits in dieser Kategorie', 
          isDuplicate: true,
          existingItem,
          answersAreDifferent
        },
        { status: 409 } // 409 Conflict
      );
    }
    
    const newFaqItem = await knowledgeStorage.saveFAQ({
      question: data.question,
      answer: data.answer,
      category: data.category
    });
    
    return NextResponse.json({ success: true, data: newFaqItem }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des FAQ-Items:', error);
    return NextResponse.json(
      { success: false, message: 'FAQ-Item konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/knowledge/:id
 * Aktualisiert ein FAQ-Item
 */
export async function PUT(req: NextRequest) {
  // Die ID kommt aus der URL-Suchanfrage
  const url = new URL(req.url);
  const idParam = url.searchParams.get('id');
  
  if (!idParam) {
    return NextResponse.json(
      { success: false, message: 'ID ist erforderlich' },
      { status: 400 }
    );
  }
  
  const id = parseInt(idParam);
  
  try {
    const data = await req.json();
    
    // Mindestens ein Feld muss aktualisiert werden
    if (!data.question && !data.answer && !data.category) {
      return NextResponse.json(
        { success: false, message: 'Mindestens ein Feld muss aktualisiert werden' },
        { status: 400 }
      );
    }
    
    const updatedFaqItem = await knowledgeStorage.updateFAQ(id, {
      question: data.question,
      answer: data.answer,
      category: data.category
    });
    
    return NextResponse.json({ success: true, data: updatedFaqItem });
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des FAQ-Items mit ID ${id}:`, error);
    return NextResponse.json(
      { success: false, message: 'FAQ-Item konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/knowledge/:id
 * Löscht ein FAQ-Item
 */
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const idParam = url.searchParams.get('id');
  
  if (!idParam) {
    return NextResponse.json(
      { success: false, message: 'ID ist erforderlich' },
      { status: 400 }
    );
  }
  
  const id = parseInt(idParam);
  
  try {
    await knowledgeStorage.deleteFAQ(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Fehler beim Löschen des FAQ-Items mit ID ${id}:`, error);
    return NextResponse.json(
      { success: false, message: 'FAQ-Item konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
} 