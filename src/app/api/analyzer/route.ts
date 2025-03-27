import { NextResponse } from 'next/server';
import { ChatAnalyzer, AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  timestamp: string; // ISO date string
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    
    // Convert string timestamps to Date objects
    const formattedMessages = messages.map((msg: Message) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    
    // Create analyzer and analyze the conversation
    const analyzer = new ChatAnalyzer();
    const results = await analyzer.analyzeConversation(formattedMessages);
    
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Analyzer API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Analyzer API is running' });
}