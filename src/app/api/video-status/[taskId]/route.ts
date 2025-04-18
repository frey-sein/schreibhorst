import { NextRequest, NextResponse } from 'next/server';
import RunwayML from '@runwayml/sdk';
import { logger } from '@/lib/services/logger';

// Hilfsfunktion zur Status-Konvertierung (optional, falls benötigt)
function mapSdkStatus(sdkStatus: string): 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'THROTTLED' {
  switch (sdkStatus?.toUpperCase()) {
    case 'PROCESSING':
    case 'RENDERING': // Beispiel für mögliche andere Status
      return 'RUNNING';
    case 'SUCCEEDED':
      return 'SUCCEEDED';
    case 'FAILED':
      return 'FAILED';
    // Füge hier weitere Mappings hinzu, falls das SDK andere Status liefert
    default:
      return 'PENDING';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID fehlt' }, { status: 400 });
  }

  logger.info(`API Route /api/video-status/${taskId} aufgerufen`);

  // Initialisiere das SDK auf dem Server
  let client: RunwayML;
  try {
     if (!process.env.RUNWAYML_API_SECRET) {
        throw new Error('RUNWAYML_API_SECRET Umgebungsvariable ist nicht gesetzt.');
     }
    client = new RunwayML();
    logger.debug(`Runway SDK serverseitig für Statusabfrage initialisiert (Task ${taskId}).`);
  } catch (sdkError: any) {
    logger.error(`Fehler beim Initialisieren des Runway SDK für Task ${taskId}:`, {
        message: sdkError?.message,
        stack: sdkError?.stack
    });
    return NextResponse.json({ error: 'Fehler bei der Initialisierung des Video-Services' }, { status: 500 });
  }

  // Rufe die SDK-Methode auf
  try {
    const task = await client.tasks.retrieve(taskId);
    logger.info(`Runway tasks.retrieve für Task ${taskId} erfolgreich`, { status: task.status });

    // Verarbeite den Output
    let outputArray: string[] | undefined;
    if (task.status === 'SUCCEEDED' && task.output) {
        if (typeof task.output === 'string') {
           outputArray = [task.output];
        } else if (Array.isArray(task.output)) {
           outputArray = task.output as string[]; // Annahme: Array von URLs
        } else if ((task.output as any).url) {
           outputArray = [(task.output as any).url]; // Annahme: Objekt mit URL
        } else {
          logger.warn(`Unbekanntes Output-Format für Task ${taskId}:`, task.output);
        }
    }

    return NextResponse.json({
      status: mapSdkStatus(task.status), // Verwende ggf. Mapping
      videoUrl: outputArray && outputArray.length > 0 ? outputArray[0] : null, // Gebe die erste URL zurück
      rawSdkResponse: task // Optional: für Debugging die rohe Antwort mitsenden
    });

  } catch (apiError: any) {
    logger.error(`Fehler beim Abrufen des Status für Task ${taskId}:`, {
      message: apiError?.message,
      stack: apiError?.stack
    });
    // Unterscheide 404 (Task nicht gefunden) von anderen Fehlern
    if (apiError?.message?.toLowerCase().includes('not found')) {
       return NextResponse.json({ error: 'Task nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Fehler beim Abrufen des Video-Status' }, { status: 500 });
  }
} 