import { NextResponse } from 'next/server';
import { OpenRouterClient } from '@/lib/api/openrouter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      console.error('Invalid messages array:', body.messages);
      return NextResponse.json(
        { error: 'Invalid messages array' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OpenRouter API key is not configured');
      return NextResponse.json(
        { error: 'OpenRouter API key is not configured' },
        { status: 500 }
      );
    }

    const client = new OpenRouterClient(apiKey);
    console.log('Using model:', body.model);

    const response = await client.streamChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher KI-Schreibassistent namens Schreibhorst. Du hilfst Nutzern dabei, kreative Texte zu entwickeln und zu verbessern.'
        },
        ...body.messages
      ],
      model: body.model,
      temperature: 0.7,
      stream: true
    });

    if (!response || !response.body) {
      console.error('No response body received from OpenRouter');
      return NextResponse.json(
        { error: 'No response received from API' },
        { status: 500 }
      );
    }

    // Erstelle einen ReadableStream für die Antwort
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue('data: [DONE]\n\n');
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices?.[0]?.delta?.content) {
                    const content = parsed.choices[0].delta.content;
                    console.log('Received chunk:', content);
                    controller.enqueue(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
                  }
                } catch (e) {
                  console.error('Error parsing chunk:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('API error:', error);
    
    // Spezifische Fehlerbehandlung
    if (error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'API key is invalid or missing' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    if (error.message?.includes('400')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Chat API is running' });
} 