import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FileVersion } from '@/types/files';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'file-history.json');

// Stellt sicher, dass die Datei existiert
if (!fs.existsSync(HISTORY_FILE)) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, '{}');
}

// Lädt die Historie
function loadHistory(): Record<string, FileVersion[]> {
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Fehler beim Laden der Historie:', error);
    return {};
  }
}

// Speichert die Historie
function saveHistory(history: Record<string, FileVersion[]>): void {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Fehler beim Speichern der Historie:', error);
  }
}

// Bereinigt die Historie von doppelten Einträgen
function cleanupHistory(): void {
  try {
    console.log('Starte Historie-Bereinigung');
    const history = loadHistory();
    console.log('Geladene Historie:', history);
    
    const cleanHistory: Record<string, FileVersion[]> = {};

    // Gehe durch alle Dateien
    Object.entries(history).forEach(([fileId, versions]) => {
      console.log('Verarbeite Datei:', fileId);
      
      // Extrahiere den Basis-Dateinamen aus der ID
      const idParts = fileId.split('-');
      const baseFileName = idParts.slice(2).join('-');
      console.log('Basis-Dateiname:', baseFileName);
      
      // Suche nach anderen Einträgen mit dem gleichen Basis-Dateinamen
      const relatedIds = Object.keys(history).filter(id => {
        const otherParts = id.split('-');
        const otherFileName = otherParts.slice(2).join('-');
        return otherFileName === baseFileName && id !== fileId;
      });
      console.log('Verwandte IDs gefunden:', relatedIds);

      // Wenn wir verwandte Einträge finden
      if (relatedIds.length > 0) {
        // Sammle alle Versionen
        const allVersions = [...versions];
        relatedIds.forEach(id => {
          console.log('Füge Versionen von ID hinzu:', id);
          allVersions.push(...(history[id] || []));
        });

        // Sortiere nach Zeitstempel
        allVersions.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        console.log('Sortierte Versionen:', allVersions);

        // Behalte die ursprüngliche ID
        cleanHistory[fileId] = allVersions;
        console.log('Historie für ID aktualisiert:', fileId);
      } else {
        // Wenn keine verwandten Einträge gefunden wurden, behalte den Eintrag bei
        cleanHistory[fileId] = versions;
        console.log('Keine verwandten Einträge gefunden, behalte Original:', fileId);
      }
    });

    console.log('Bereinigte Historie:', cleanHistory);
    saveHistory(cleanHistory);
    console.log('Historie wurde erfolgreich bereinigt');
  } catch (error) {
    console.error('Fehler beim Bereinigen der Historie:', error);
  }
}

// Fügt einen neuen Eintrag zur Historie hinzu
export function addHistoryEntry(version: Omit<FileVersion, 'id'>): FileVersion {
  const history = loadHistory();
  const fileHistory = history[version.fileId] || [];
  
  const newEntry: FileVersion = {
    ...version,
    id: `${version.fileId}-${Date.now()}`,
  };
  
  fileHistory.push(newEntry);
  history[version.fileId] = fileHistory;
  saveHistory(history);

  // Bereinige die Historie nach dem Hinzufügen eines neuen Eintrags
  cleanupHistory();
  
  return newEntry;
}

// GET-Handler für die Historie einer Datei
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const fileId = params.id;
    
    // Bereinige die Historie vor dem Abrufen
    cleanupHistory();
    
    const history = loadHistory();
    const fileHistory = history[fileId] || [];
    
    // Sortiere nach Zeitstempel, neueste zuerst
    fileHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return NextResponse.json(fileHistory);
  } catch (error) {
    console.error('Fehler beim Abrufen der Historie:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Historie' },
      { status: 500 }
    );
  }
} 