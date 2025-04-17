# Unsplash API Integration

Diese Dokumentation beschreibt, wie die Unsplash API in der Schreibhorst-Anwendung integriert und verwendet wird.

## Übersicht

Die Unsplash API ermöglicht den Zugriff auf hochwertige kostenlose Bilder, die unter der Unsplash-Lizenz verwendet werden können. In Schreibhorst ist die Unsplash-Integration für die Stockfoto-Suche im Stage-Panel implementiert.

## Einrichtung

### Erforderliche Umgebungsvariablen

Um die Unsplash API verwenden zu können, füge die folgende Variable zu deiner `.env.local` Datei hinzu:

```
NEXT_PUBLIC_UNSPLASH_API_KEY=dein_unsplash_api_schluessel
```

### API-Schlüssel

Um einen API-Schlüssel zu erhalten:

1. Erstelle ein Konto auf [Unsplash](https://unsplash.com/)
2. Registriere eine neue Anwendung auf [Unsplash Developer](https://unsplash.com/developers)
3. Der API-Schlüssel (Client ID) wird dir nach der Registrierung angezeigt

## Funktionsweise

Die Unsplash-Integration in Schreibhorst:

1. Verwendet den Unsplash API-Schlüssel aus den Umgebungsvariablen
2. Führt Suchanfragen direkt über die Unsplash API durch
3. Formatiert die Ergebnisse für die einheitliche Darstellung in der Benutzeroberfläche

## Komponenten der Integration

### 1. API-Konfiguration

Die API-Konfiguration ist in `src/lib/config/apiConfig.ts` definiert. Hier wird die Umgebungsvariable eingelesen und für die Anwendung bereitgestellt.

### 2. Suchdienst

Der Service `src/lib/services/stockImageSearch.ts` implementiert die `searchUnsplash`-Funktion, die eine Schnittstelle zur Unsplash API bietet.

### 3. UI-Komponente

Die Komponente `src/app/components/stage/StockImagePanel.tsx` stellt die Benutzeroberfläche für die Stockfoto-Suche bereit und unterstützt Unsplash als Provider.

## Verwendung und Limits

Die kostenlose Unsplash API hat folgende Limits:
- 50 Anfragen pro Stunde
- Anzeige der Autorschaft ist erforderlich

Es wird empfohlen, die [Unsplash API-Richtlinien](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) zu lesen, um über alle Anforderungen informiert zu sein.

## Attribution

Die Unsplash-Lizenz erfordert die Nennung des Fotografen. In Schreibhorst wird diese Information:
1. Im Metadatenfeld der Bildentwürfe gespeichert
2. Bei der Anzeige und Verwendung der Bilder entsprechend dargestellt

## Fehlerbehebung

Bei Problemen mit der Unsplash-Integration:

1. Überprüfe, ob die Umgebungsvariable korrekt gesetzt ist
2. Stelle sicher, dass der API-Schlüssel gültig ist
3. Überprüfe die Browser-Konsole auf Fehlermeldungen

## Lizenzierung

Unsplash-Bilder unterliegen der [Unsplash-Lizenz](https://unsplash.com/license):
- Erlaubt: Kommerzielle und nicht-kommerzielle Nutzung
- Änderungen sind erlaubt
- Namensnennung ist empfohlen, aber nicht erforderlich

## Weiteren Stockbild-Anbieter hinzufügen

Um einen weiteren Stockbild-Anbieter hinzuzufügen:

1. Erweitere die `stockImageConfig` in `src/lib/config/apiConfig.ts`
2. Füge einen neuen Provider zur `stockImageProviders`-Liste in `src/lib/services/stockImageSearch.ts` hinzu
3. Implementiere eine entsprechende Suchfunktion für den neuen Anbieter
4. Aktualisiere die `searchStockImages`-Funktion, um den neuen Anbieter zu berücksichtigen 