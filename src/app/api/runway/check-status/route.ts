import { NextRequest, NextResponse } from 'next/server';
import { RunwayClient } from '@/lib/services/api/runway';
import { isServiceEnabled } from '@/lib/config/apiConfig';

export async function GET(req: NextRequest) {
  try {
    // Überprüfen, ob der Runway-Dienst aktiviert ist
    if (!isServiceEnabled('runway')) {
      return NextResponse.json(
        { error: 'Runway-Dienst ist nicht konfiguriert oder deaktiviert' },
        { status: 503 }
      );
    }

    // Task-ID aus der URL extrahieren
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // RunwayClient initialisieren
    const runwayClient = new RunwayClient();
    
    // Task-Status abrufen
    const taskStatus = await runwayClient.getTaskStatus(taskId);

    // Status zurückgeben
    return NextResponse.json({
      success: true,
      status: taskStatus.status,
      output: taskStatus.output,
      error: taskStatus.error
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen des Task-Status:', error);
    return NextResponse.json(
      { error: `Fehler beim Abrufen des Task-Status: ${error.message || 'Unbekannter Fehler'}` },
      { status: 500 }
    );
  }
} 