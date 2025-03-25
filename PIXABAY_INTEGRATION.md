# Pixabay API Integration

Diese Dokumentation beschreibt, wie die Pixabay API in der Schreibhorst-Anwendung integriert und verwendet wird.

## Übersicht

Die Pixabay API ermöglicht die Suche nach kostenlosen Stockfotos, die unter der Pixabay-Lizenz verwendet werden können. In Schreibhorst ist die Pixabay-Integration für die Stockfoto-Suche im Stage-Panel implementiert.

## Einrichtung

### Erforderliche Umgebungsvariablen

Um die Pixabay API verwenden zu können, füge die folgenden Variablen zu deiner `.env.local` Datei hinzu:

```
PIXABAY_API_KEY=dein_pixabay_api_schluessel
NEXT_PUBLIC_ENABLE_PIXABAY=true
```

### API-Schlüssel

Um einen API-Schlüssel zu erhalten:

1. Erstelle ein Konto auf [Pixabay](https://pixabay.com/)
2. Navigiere zu [Pixabay API Docs](https://pixabay.com/api/docs/) und logge dich ein
3. Der API-Schlüssel wird dir angezeigt

## Funktionsweise

Die Pixabay-Integration verwendet ein sicheres Servermodell, bei dem:

1. Der Client eine Suchanfrage an unsere eigene API-Route sendet
2. Die Server-API-Route ruft die Pixabay API mit dem sicher gespeicherten API-Schlüssel auf
3. Die Ergebnisse werden transformiert und an den Client zurückgegeben

Dieses Modell stellt sicher, dass der API-Schlüssel nicht im Client-Code exponiert wird.

## Komponenten der Integration

### 1. API-Konfiguration

Die API-Konfiguration wird in `src/lib/config/apiConfig.ts` definiert. Hier werden die Umgebungsvariablen eingelesen und für die Anwendung bereitgestellt.

### 2. Server-API-Route

Die API-Route `src/app/api/stockimages/search/route.ts` fungiert als Proxy für die Pixabay API. Sie nimmt Suchanfragen entgegen, validiert sie und leitet sie an die Pixabay API weiter.

### 3. Client-Service

Der Service `src/lib/services/stockImageSearch.ts` bietet eine einheitliche Schnittstelle für die Suche nach Stockfotos, unabhängig vom verwendeten Anbieter.

### 4. UI-Komponente

Die Komponente `src/app/components/stage/StockImagePanel.tsx` stellt die Benutzeroberfläche für die Stockfoto-Suche bereit. Sie ermöglicht die Suche, Anzeige und Auswahl von Bildern.

## Verwendung und Limits

Die kostenlose Pixabay API hat folgende Limits:
- 5.000 Anfragen pro Stunde
- Maximal 200 Bilder pro Anfrage

## Fehlerbehebung

Bei Problemen mit der Pixabay-Integration:

1. Überprüfe, ob die Umgebungsvariablen korrekt gesetzt sind
2. Stelle sicher, dass der API-Schlüssel gültig ist
3. Überprüfe die Server-Logs auf Fehlermeldungen

## Lizenzierung

Pixabay-Bilder unterliegen der [Pixabay License](https://pixabay.com/service/license/):
- Erlaubt: Kommerzielle und nicht-kommerzielle Nutzung
- Keine Namensnennung erforderlich
- Modifikationen sind erlaubt

Beachte jedoch, dass identifizierbare Personen, Logos und private Eigentum in den Bildern möglicherweise zusätzliche Freigaben erfordern. 