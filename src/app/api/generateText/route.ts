import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/lib/services/serverTextGenerator';

export async function POST(req: NextRequest) {
  try {
    const { prompt, modelId } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { message: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    // Verwende den serverTextGenerator-Service zum Generieren des Blogbeitrags
    const result = await generateBlogPost(prompt, modelId);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || 'Fehler bei der Textgenerierung' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      htmlContent: result.content?.htmlContent,
      metaTitle: result.content?.metaTitle,
      metaDescription: result.content?.metaDescription
    });
  } catch (error) {
    console.error('Fehler bei der Textgenerierung:', error);
    return NextResponse.json(
      { message: `Unerwarteter Fehler: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 