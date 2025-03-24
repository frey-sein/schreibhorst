import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '../data';
import fs from 'fs';
import path from 'path';

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