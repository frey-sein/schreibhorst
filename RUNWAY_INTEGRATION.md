# Runway API Integration

Diese Dokumentation beschreibt, wie die Runway API in der Schreibhorst-Anwendung integriert und verwendet wird.

## Übersicht

Die Runway API ermöglicht die Erstellung von KI-generierten Videos aus Text oder Bildern. In Schreibhorst ist die Runway-Integration für die Videogenerierung implementiert, mit der Benutzer aus Texten oder Bildern dynamische Videos erstellen können.

## Einrichtung

### Erforderliche Umgebungsvariablen

Um die Runway API verwenden zu können, füge die folgende Variable zu deiner `.env.local` Datei hinzu:

```
RUNWAY_API_KEY=dein_runway_api_schluessel
```

### API-Schlüssel

Um einen API-Schlüssel zu erhalten:

1. Erstelle ein Konto auf [Runway](https://runwayml.com/)
2. Melde dich im [Runway Developer Portal](https://dev.runwayml.com/) an
3. Erstelle eine neue Organisation
4. Gehe zum Tab "API Keys" und erstelle einen neuen Schlüssel
5. Füge Guthaben hinzu (mindestens 10$ für 1000 Credits)

Der API-Schlüssel wird nur einmal angezeigt, daher speichere ihn sofort an einem sicheren Ort.

## Funktionsweise

Die Runway-Integration in Schreibhorst:

1. Erlaubt die Generierung von Videos aus Text oder Bildern
2. Verwendet das Runway Gen-3 Alpha Turbo-Modell für hochwertige Ergebnisse
3. Bietet asynchrone Verarbeitung für längere Generierungsaufgaben

## Komponenten der Integration

### 1. API-Konfiguration

Die API-Konfiguration ist in `src/lib/config/apiConfig.ts` definiert. Hier wird die Umgebungsvariable für den Runway API-Schlüssel eingelesen und für die Anwendung bereitgestellt.

### 2. Runway-Client

Der Service `src/lib/services/api/runway.ts` bietet eine API-Client-Klasse, die die Kommunikation mit der Runway API vereinfacht. Diese Klasse bietet Methoden für:

- Text-zu-Video-Generierung
- Bild-zu-Video-Generierung
- Abfrage des Generierungsstatus

### 3. API-Routen

Die Anwendung bietet die folgenden API-Routen für die Runway-Integration:

- `src/app/api/runway/generate-video/route.ts`: Startet einen Videogenerierungsprozess
- `src/app/api/runway/check-status/route.ts`: Überprüft den Status eines laufenden Generierungsprozesses

## Verwendung der API-Routen

### Videogenerierung starten

```
POST /api/runway/generate-video
```

Parameter:
- `type`: "text-to-video" oder "image-to-video"
- `text`: Textbeschreibung für das Video
- `imageUrl`: (nur für image-to-video) URL des Quellbilds
- `model`: (optional) das zu verwendende Modell, Standard ist "gen3a_turbo"

Antwort:
```json
{
  "success": true,
  "message": "Videogenerierung gestartet",
  "taskId": "task_id_hier"
}
```

### Status abfragen

```
GET /api/runway/check-status?taskId=task_id_hier
```

Antwort:
```json
{
  "success": true,
  "status": "SUCCEEDED",
  "output": {
    "video": "video_url_hier"
  }
}
```

## Preisgestaltung und Limits

Die Runway API hat folgende Preise:
- 0,25$ pro 5-Sekunden-Video
- 0,50$ pro 10-Sekunden-Video

Es wird empfohlen, die Nutzung zu überwachen, um unerwartete Kosten zu vermeiden.

## Fehlerbehebung

Bei Problemen mit der Runway-Integration:

1. Überprüfe, ob der API-Schlüssel korrekt in der .env.local-Datei eingetragen ist
2. Stelle sicher, dass genügend Guthaben im Runway-Konto vorhanden ist
3. Überprüfe die Server-Logs auf Fehlermeldungen
4. Prüfe, ob die API-Version in den Anfragen korrekt ist (X-Runway-Version: 2024-11-06)

## Erweiterte Funktionen

Die Runway API bietet weitere Funktionen, die bei Bedarf integriert werden können:

- Video-Verlängerung (Extend)
- Video-Expansion (Expand)
- Video-Upscaling auf 4K
- Multi-motion-Brush für präzise Bewegungssteuerung 