import { NextRequest, NextResponse } from 'next/server';
import * as knowledgeStorage from '../../../../lib/services/knowledgeStorage';

/**
 * POST /api/knowledge/migrate
 * Migriert FAQ-Items aus dem localStorage in die Datenbank
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Keine gültigen FAQ-Items zum Migrieren angegeben' },
        { status: 400 }
      );
    }
    
    await knowledgeStorage.migrateFromLocalStorage(data.items);
    return NextResponse.json({ 
      success: true, 
      message: `${data.items.length} FAQ-Items wurden erfolgreich migriert` 
    });
  } catch (error) {
    console.error('Fehler bei der Migration der FAQ-Items:', error);
    return NextResponse.json(
      { success: false, message: 'FAQ-Items konnten nicht migriert werden' },
      { status: 500 }
    );
  }
} 