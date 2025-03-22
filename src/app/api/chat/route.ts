import { NextResponse } from 'next/server';
import { OpenRouterClient } from '@/lib/api/openrouter';

export async function POST(request: Request) {
  try {
    const { messages, model, temperature } = await request.json();
    const client = new OpenRouterClient();

    const response = await client.createChatCompletion({
      messages,
      model,
      temperature,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Chat API is running' });
} 