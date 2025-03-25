import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
}

export async function GET() {
  try {
    // Hole die Kategorien aus dem localStorage (via Cookies)
    const knowledgeBaseCookie = cookies().get('knowledgeBase');
    if (!knowledgeBaseCookie?.value) {
      return NextResponse.json([]);
    }

    const data = JSON.parse(knowledgeBaseCookie.value);
    const categories = data.categories || [];
    return NextResponse.json(categories.map((cat: KnowledgeCategory) => cat.name));
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kategorien' },
      { status: 500 }
    );
  }
} 