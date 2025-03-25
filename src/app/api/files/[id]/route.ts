import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '../data';
import fs from 'fs';
import path from 'path';

// Rekursive Funktion zum Finden einer Datei in einem Verzeichnis und seinen Unterverzeichnissen
const findFileRecursive = (dir: string, searchTerm: string): string | null => {
  try {
    // Liste alle Einträge im aktuellen Verzeichnis
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // Suche zunächst in den Dateien des aktuellen Verzeichnisses
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return path.join(dir, entry.name);
      }
    }
    
    // Wenn nicht gefunden, durchsuche alle Unterverzeichnisse
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nestedPath = path.join(dir, entry.name);
        const result = findFileRecursive(nestedPath, searchTerm);
        if (result) {
          return result;
        }
      }
    }
    
    // Nicht gefunden
    return null;
  } catch (error) {
    console.error(`Fehler beim Durchsuchen von ${dir}:`, error);
    return null;
  }
};

// GET-Route für direkten Dateizugriff
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('Datei-GET-Anfrage für ID:', id);
    
    // Extrahiere Query-Parameter
    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get('forceDownload') === 'true' || searchParams.get('download') === '1';
    
    if (forceDownload) {
      console.log('Erzwungener Download-Modus aktiviert');
    }
    
    // Erweiterte Debugging-Ausgabe
    console.log('Suche Datei in: ' + path.join(process.cwd(), 'public', 'uploads'));
    console.log('Vollständige URL:', request.url);
    
    // 1. Versuch: Direkter Pfad, wenn es sich um einen einfachen Dateinamen handelt
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    let filePath = null;
    
    // Suche in allen bekannten Unterverzeichnissen
    const searchDirectories = [
      uploadsDir,
      path.join(uploadsDir, 'dsgvo'),
      path.join(uploadsDir, 'dsgvo', 'formulare'),
      path.join(uploadsDir, 'dsgvo', 'unterlagen'),
      path.join(uploadsDir, 'system'),
      path.join(uploadsDir, 'logo')
    ];
    
    // Zuerst: Prüfe, ob die ID direkt einen Zeitstempel enthält (format: XXXXXXXXXX-dateiname.ext)
    const timestampRegex = /^(\d+)-(.+)$/;
    const timestampMatch = id.match(timestampRegex);
    
    if (timestampMatch) {
      // Die ID enthält bereits einen Zeitstempel, verwende sie direkt
      filePath = path.join(uploadsDir, id);
      console.log('Zeitstempel-ID erkannt, versuche:', filePath);
    } else {
      // Die ID könnte ein direkter Dateiname sein - prüfe in allen Verzeichnissen
      console.log('Kein Zeitstempel erkannt, suche in allen Verzeichnissen nach:', id);
      
      // Durchsuche alle Verzeichnisse
      for (const dir of searchDirectories) {
        try {
          // Prüfe, ob das Verzeichnis existiert
          if (fs.existsSync(dir)) {
            // Liste alle Dateien im Verzeichnis
            const files = fs.readdirSync(dir);
            console.log(`Suche in ${dir} nach "${id}" unter ${files.length} Dateien`);
            
            // Prüfe sowohl auf exakte Übereinstimmung als auch Teilübereinstimmung
            const exactMatch = files.find(file => file === id);
            const partialMatch = files.find(file => 
              file.toLowerCase().includes(id.toLowerCase()) ||
              (id.includes('.') && file.toLowerCase().includes(id.toLowerCase().split('.')[0]))
            );
            
            if (exactMatch) {
              filePath = path.join(dir, exactMatch);
              console.log('Exakte Übereinstimmung gefunden:', filePath);
              break;
            } else if (partialMatch) {
              filePath = path.join(dir, partialMatch);
              console.log('Teilübereinstimmung gefunden:', filePath);
              break;
            }
          }
        } catch (error) {
          console.error(`Fehler beim Durchsuchen von ${dir}:`, error);
        }
      }
      
      // Wenn keine Datei gefunden wurde, versuche rekursiv im gesamten uploads-Ordner zu suchen
      if (!filePath) {
        console.log('Keine direkte Übereinstimmung, versuche rekursive Suche...');
        let searchTerm = id;
        
        // Wenn die ID eine Dateiendung enthält, vereinfache sie für die Suche
        if (searchTerm.includes('.')) {
          const fileNameParts = searchTerm.split('.');
          if (fileNameParts.length > 1) {
            const nameWithoutExtension = fileNameParts[0]; // Nur den ersten Teil nehmen
            searchTerm = nameWithoutExtension;
            console.log('Suche rekursiv nach einfachem Begriff:', searchTerm);
          }
        }
        
        // Rekursive Suche
        filePath = findFileRecursive(uploadsDir, searchTerm);
        
        // Wenn auch das fehlschlägt, versuche es mit einem stark vereinfachten Suchbegriff
        if (!filePath && searchTerm.includes('-')) {
          const simplifiedTerm = searchTerm.split('-')[0]; // Nur den ersten Teil des Namens verwenden
          console.log('Versuche mit noch einfacherem Suchbegriff:', simplifiedTerm);
          filePath = findFileRecursive(uploadsDir, simplifiedTerm);
        }
        
        if (filePath) {
          console.log('Datei durch rekursive Suche gefunden:', filePath);
        }
      }
      
      // Wenn immer noch nichts gefunden wurde, spezifische Behandlung für bekannte Dokumenttypen
      if (!filePath) {
        console.log('Keine Datei gefunden, prüfe auf speziellen Dokumentnamen');
        
        // Bekannte Dokumenttypen
        if (id.toLowerCase().includes('datenschutz') && id.toLowerCase().includes('.docx')) {
          // Erstelle eine neue Datei im DSGVO-Formulare-Ordner, falls sie nicht existiert
          const dsgvoFormulareDir = path.join(uploadsDir, 'dsgvo', 'formulare');
          
          // Stelle sicher, dass das Verzeichnis existiert
          if (!fs.existsSync(dsgvoFormulareDir)) {
            fs.mkdirSync(dsgvoFormulareDir, { recursive: true });
            console.log('DSGVO-Formulare-Ordner erstellt:', dsgvoFormulareDir);
          }
          
          const newFilePath = path.join(dsgvoFormulareDir, id);
          
          // Prüfe, ob die Datei bereits existiert
          if (!fs.existsSync(newFilePath)) {
            // Erstelle eine einfache DOCX-Datei mit Platzhalterinhalt
            try {
              const placeholderContent = 'Platzhalter für Datenschutzdokument';
              fs.writeFileSync(newFilePath, placeholderContent);
              console.log('Platzhalter-Datei erstellt:', newFilePath);
              filePath = newFilePath;
            } catch (error) {
              console.error('Fehler beim Erstellen der Platzhalter-Datei:', error);
            }
          } else {
            console.log('Datei existiert bereits:', newFilePath);
            filePath = newFilePath;
          }
        }
      }
    }
    
    // Debugging: Zeige an, ob eine Datei gefunden wurde
    if (filePath) {
      console.log('Endgültiger Dateipfad:', filePath);
      console.log('Existiert die Datei?', fs.existsSync(filePath));
    } else {
      console.log('Keine Datei gefunden für:', id);
      return NextResponse.json({ 
        error: 'Datei nicht gefunden',
        id,
        searchResults: `Datei konnte in keinem Verzeichnis gefunden werden: ${searchDirectories.join(', ')}` 
      }, { status: 404 });
    }

    // Prüfe, ob die Datei existiert
    if (filePath && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        // Datei gefunden - ermittle den MIME-Typ basierend auf der Dateiendung
        const fileExtension = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream'; // Standardwert
        
        // Zuordnung von Dateiendungen zu MIME-Typen
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.ppt': 'application/vnd.ms-powerpoint',
          '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          '.svg': 'image/svg+xml',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.txt': 'text/plain',
          '.csv': 'text/csv',
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.zip': 'application/zip',
          '.tar': 'application/x-tar',
          '.gz': 'application/gzip',
        };
        
        // Für Office-Dokumente immer den gleichen starken MIME-Typ verwenden
        if (fileExtension.match(/\.(docx|doc)$/i)) {
          contentType = 'application/octet-stream';
          console.log('Word-Dokument erkannt, verwende spezifischen MIME-Typ:', contentType);
        } 
        // Für andere Dateien den entsprechenden MIME-Typ verwenden
        else if (mimeTypes[fileExtension]) {
          contentType = mimeTypes[fileExtension];
        }
        
        console.log('Verwende MIME-Typ:', contentType, 'für Dateityp:', fileExtension);
        
        try {
          // Lese die Datei und sende sie als Response
          const fileContent = fs.readFileSync(filePath);
          
          // Setze die entsprechenden Header
          const headers = new Headers();
          headers.set('Content-Type', contentType);
          
          // Für Office-Dokumente und PDFs immer Download erzwingen
          const isOfficeOrPdf = fileExtension.match(/\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/i) !== null;
          
          // Erkennung der Dateitypen trennen
          const isOfficeDoc = fileExtension.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) !== null;
          const isPdf = fileExtension.match(/\.pdf$/i) !== null;
          
          // PDFs als inline anzeigen, wenn nicht explizit Download angefordert
          const forceDownloadRequested = forceDownload;
          
          // Setze immer Content-Disposition auf attachment für Office-Dokumente
          if (isOfficeDoc || (isPdf && forceDownloadRequested)) {
            console.log('Office-Dokument oder erzwungener PDF-Download: Erzwinge Download');
            headers.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
            headers.set('X-Content-Type-Options', 'nosniff');
          } else if (isPdf) {
            // PDFs inline anzeigen, außer wenn explizit Download angefordert wurde
            console.log('PDF-Dokument: Anzeige inline');
            headers.set('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
            headers.set('X-Content-Type-Options', 'nosniff');
          } else {
            // Für andere Dateien (Bilder etc.) normalen Header setzen
            headers.set('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
          }
          
          headers.set('Content-Length', stats.size.toString());
          
          // Debug-Ausgabe der Header
          console.log('Gesendete Header:', {
            'Content-Type': contentType,
            'Content-Disposition': headers.get('Content-Disposition'),
            'X-Content-Type-Options': headers.get('X-Content-Type-Options'),
            'Content-Length': headers.get('Content-Length')
          });
          
          // Sende die Datei als Response
          return new NextResponse(fileContent, { 
            status: 200,
            headers
          });
        } catch (readError) {
          console.error('Fehler beim Lesen der Datei:', readError);
          return NextResponse.json({
            error: 'Fehler beim Lesen der Datei',
            details: (readError as Error).message
          }, { status: 500 });
        }
      } else {
        console.log('Der gefundene Pfad ist keine Datei:', filePath);
        return NextResponse.json({ error: 'Der Pfad verweist nicht auf eine Datei' }, { status: 400 });
      }
    } else {
      console.log('Datei existiert nicht am angegebenen Pfad:', filePath);
      return NextResponse.json({ error: 'Datei existiert nicht' }, { status: 404 });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Datei:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Datei',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('Löschversuch für Element mit ID:', id);
    
    // UUID-Format überprüfen
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Bestimme die zu verwendende ID (mit oder ohne 'file-' Präfix)
    let fileId = id;
    let physicalId = id;
    
    if (uuidRegex.test(id)) {
      // Es handelt sich um eine reine UUID, füge 'file-' hinzu, wo nötig
      console.log('UUID-Format erkannt, bereite für interne Verarbeitung vor');
      fileId = id.startsWith('file-') ? id : `file-${id}`;
    } else if (id.startsWith('file-')) {
      // Entferne das 'file-' Präfix für Dateipfad, falls vorhanden
      physicalId = id.replace('file-', '');
    }
    
    // Wenn es sich um eine Datei handelt, versuchen wir auch die physische Datei zu löschen
    try {
      // Versuche mit beiden Formatierungen der ID
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'uploads', physicalId),
        path.join(process.cwd(), 'public', 'uploads', id),
        // Wenn die ID ein UUID-Format hat, versuche auch ohne 'file-' Präfix
        ...(uuidRegex.test(id) ? [path.join(process.cwd(), 'public', 'uploads', id)] : [])
      ];
      
      console.log('Versuche physische Datei zu löschen, mögliche Pfade:', possiblePaths);
      
      // Prüfe alle möglichen Pfade
      let fileFound = false;
      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          console.log('Physische Datei gefunden:', fullPath);
          fs.unlinkSync(fullPath);
          console.log('Physische Datei erfolgreich gelöscht');
          fileFound = true;
          break;
        }
      }
      
      if (!fileFound) {
        console.log('Physische Datei nicht gefunden, nur Metadaten werden gelöscht');
      }
    } catch (fileError) {
      console.error('Fehler beim Löschen der physischen Datei:', fileError);
      // Wir werfen keinen Fehler, da wir trotzdem versuchen wollen,
      // den Eintrag aus dem Datenspeicher zu entfernen
    }
    
    // Datei oder Ordner aus dem Datenspeicher löschen
    // Versuche mit beiden Formatierungen der ID
    let success = deleteFile(fileId);
    
    // Wenn nicht erfolgreich mit dem ersten Versuch, versuche mit der Original-ID
    if (!success && fileId !== id) {
      console.log('Erster Löschversuch fehlgeschlagen, versuche mit Original-ID:', id);
      success = deleteFile(id);
    }
    
    // Wenn es immer noch nicht erfolgreich ist, versuche mit der ID ohne Präfix
    if (!success && id.startsWith('file-')) {
      const idWithoutPrefix = id.replace('file-', '');
      console.log('Zweiter Löschversuch fehlgeschlagen, versuche ohne Präfix:', idWithoutPrefix);
      success = deleteFile(idWithoutPrefix);
    }
    
    if (!success) {
      console.error('Element nicht im Datenspeicher gefunden, versuche mit lokaler Speicherbereinigung.');
      // Auch wenn der Löschvorgang fehlschlägt, melden wir Erfolg zurück,
      // damit der Client das Element aus seiner lokalen Speicherung entfernen kann
      return NextResponse.json({ 
        success: false, 
        localCleanupNeeded: true,
        message: 'Element nicht im Datenspeicher gefunden, aber lokale Bereinigung möglich.'
      });
    }

    console.log('Element erfolgreich aus dem Datenspeicher gelöscht');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Elements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Löschen des Elements' },
      { status: 500 }
    );
  }
} 