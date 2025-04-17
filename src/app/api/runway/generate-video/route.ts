import { NextRequest, NextResponse } from 'next/server';
import { RunwayClient } from '@/lib/services/api/runway';
import { isServiceEnabled } from '@/lib/config/apiConfig';

export async function POST(req: NextRequest) {
  try {
    // Überprüfen, ob der Runway-Dienst aktiviert ist
    if (!isServiceEnabled('runway')) {
      return NextResponse.json(
        { error: 'Runway-Dienst ist nicht konfiguriert oder deaktiviert' },
        { status: 503 }
      );
    }

    // Request-Body parsen
    const { type, imageUrl, text, model } = await req.json();

    // RunwayClient initialisieren
    const runwayClient = new RunwayClient();
    let taskResult;

    // Je nach Typ (text-to-video oder image-to-video) die entsprechende Methode aufrufen
    if (type === 'text-to-video') {
      if (!text) {
        return NextResponse.json(
          { error: 'Text ist erforderlich für text-to-video' },
          { status: 400 }
        );
      }
      taskResult = await runwayClient.createTextToVideo(text, model || 'gen3a_turbo');
    } else if (type === 'image-to-video') {
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Bild-URL ist erforderlich für image-to-video' },
          { status: 400 }
        );
      }
      if (!text) {
        return NextResponse.json(
          { error: 'Text ist erforderlich für image-to-video' },
          { status: 400 }
        );
      }
      taskResult = await runwayClient.createImageToVideo(imageUrl, text, model || 'gen3a_turbo');
    } else {
      return NextResponse.json(
        { error: 'Ungültiger Generierungstyp. Unterstützte Typen sind: text-to-video, image-to-video' },
        { status: 400 }
      );
    }

    // Task-ID zurückgeben
    return NextResponse.json({
      success: true,
      message: 'Videogenerierung gestartet',
      taskId: taskResult.id
    });
  } catch (error: any) {
    console.error('Fehler bei der Runway-Videogenerierung:', error);
    return NextResponse.json(
      { error: `Fehler bei der Videogenerierung: ${error.message || 'Unbekannter Fehler'}` },
      { status: 500 }
    );
  }
} 