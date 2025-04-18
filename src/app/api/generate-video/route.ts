import { NextRequest, NextResponse } from 'next/server';
import RunwayML from '@runwayml/sdk';
import { logger } from '@/lib/services/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'gen-2', durationInSeconds = 4 } = body;

    // Eingabevalidierung
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Ungültiger oder fehlender Prompt' }, { status: 400 });
    }
    if (typeof model !== 'string') {
      return NextResponse.json({ error: 'Ungültiges Modell' }, { status: 400 });
    }
     if (typeof durationInSeconds !== 'number' || durationInSeconds <= 0) {
       return NextResponse.json({ error: 'Ungültige Dauer' }, { status: 400 });
     }

    logger.info('API Route /api/generate-video aufgerufen', { model, promptLength: prompt.length, durationInSeconds });

    // Initialisiere das SDK auf dem Server
    let client: RunwayML;
    try {
       logger.info(`Prüfe RUNWAYML_API_SECRET: ${process.env.RUNWAYML_API_SECRET ? 'Vorhanden' : 'FEHLT!'}`);
       if (!process.env.RUNWAYML_API_SECRET) {
         throw new Error('RUNWAYML_API_SECRET Umgebungsvariable ist nicht gesetzt.');
       }
      client = new RunwayML(); // Liest RUNWAYML_API_SECRET aus env
      logger.debug('Runway SDK serverseitig initialisiert.');
    } catch (sdkError: any) {
      logger.error('Fehler beim Initialisieren des Runway SDK auf dem Server:', {
        message: sdkError?.message,
        stack: sdkError?.stack
      });
      return NextResponse.json({ error: 'Fehler bei der Initialisierung des Video-Services' }, { status: 500 });
    }

    // Rufe die SDK-Methode auf
    try {
      // LINTER HINWEIS: Property 'textToVideo' existiert laut Linter nicht auf 'RunwayML'.
      // Dies könnte an einer falschen SDK-Version oder einer veralteten Typendefinition liegen.
      // Wir prüfen dies, sobald die Initialisierung funktioniert.
      const result = await client.textToVideo.create({
        model: model,
        promptText: prompt,
        duration: durationInSeconds,
      });

      logger.info('Runway textToVideo erfolgreich aufgerufen', { taskId: result.id, status: result.status });

      // Gebe Task ID und initialen Status zurück
      return NextResponse.json({
        taskId: result.id,
        status: result.status || 'PENDING', // Fallback, falls Status fehlt
      });

    } catch (apiError: any) {
      logger.error('Fehler beim Aufruf von Runway textToVideo.create:', {
        message: apiError?.message,
        stack: apiError?.stack,
        promptLength: prompt.length,
        model,
        durationInSeconds
      });
       let userMessage = `Fehler bei der Videogenerierung: ${apiError?.message || 'Unbekannter SDK-Fehler'}`;
       if (apiError?.message?.includes('authentication')) {
         userMessage = 'Fehler bei der Authentifizierung mit der Runway API.';
       } else if (apiError?.message?.includes('insufficient credits')) {
          userMessage = 'Nicht genügend Credits für die Videogenerierung vorhanden.';
       }
       // Hier könnten spezifischere Fehlermeldungen für Rate Limits etc. hinzukommen
       
      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('Unerwarteter Fehler in /api/generate-video:', {
       message: error?.message,
       stack: error?.stack
    });
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 