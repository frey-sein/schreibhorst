'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../hooks/useUser';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

export default function DatabaseAdminPage() {
  const { user, isAdmin, isLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Wenn der Benutzer nicht eingeloggt oder kein Admin ist, zur Startseite weiterleiten
    if (mounted && !isLoading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, isLoading, mounted, router]);

  // Funktion zum Abrufen der Tabellen
  const fetchTables = useCallback(async () => {
    if (!mounted || !isAdmin) return;
    
    setIsLoadingTables(true);
    setConnectionStatus('loading');
    setError(null);
    
    try {
      // Cache-Busting-Parameter hinzufügen, um Browser-Caching zu verhindern
      const endpoint = `/api/database/tables?t=${Date.now()}`;
      console.log('Fetching tables from:', endpoint);
      
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        console.log('Antwort vom Server:', data); // Debug-Ausgabe
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Fehler beim Abrufen der Tabellen');
        }
        
        // Filtere leere oder null Tabellennamen
        const validTables = (data.tables || []).filter((tableName: string) => !!tableName);
        console.log('Gültige Tabellen:', validTables); // Debug-Ausgabe
        
        setTables(validTables);
        setConnectionStatus('success');
        
        if (validTables.length > 0 && !selectedTable) {
          setSelectedTable(validTables[0]);
        }
      } catch (fetchError: any) {
        console.error('Fetch-Fehler bei Tabellenabruf:', fetchError);
        // Detaillierte Fehlerinformationen anzeigen
        setError(`Verbindungsfehler: ${fetchError.message || 'Unbekannter Fehler'}`);
        setConnectionStatus('error');
        setTables([]);
      }
    } catch (err: any) {
      console.error('Fehler beim Abrufen der Tabellen:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten');
      setConnectionStatus('error');
      setTables([]);
    } finally {
      setIsLoadingTables(false);
    }
  }, [mounted, isAdmin, selectedTable]);

  // Laden der Tabellenliste beim ersten Seitenaufruf
  useEffect(() => {
    if (mounted && isAdmin) {
      fetchTables();
    }
  }, [mounted, isAdmin, fetchTables]);

  // Funktion zur Ausführung von SQL-Abfragen
  const executeQuery = useCallback(async (customQuery?: string) => {
    const queryToExecute = customQuery || query;
    if (!queryToExecute.trim()) return;
    
    setIsExecuting(true);
    setError(null);
    setResults(null);
    setDebugInfo(null);
    
    try {
      // Cache-Busting-Parameter zur URL hinzufügen
      const endpoint = `/api/database/query?t=${Date.now()}`;
      console.log('Executing query at:', endpoint, 'Query:', queryToExecute.substring(0, 100));
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: queryToExecute }),
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Fehler bei der Ausführung der Abfrage');
        }
        
        setResults(Array.isArray(data.results) ? data.results : []);
        
        // Debug-Informationen speichern, wenn vorhanden
        if (data.debug) {
          setDebugInfo(data.debug);
        }
      } catch (fetchError: any) {
        console.error('Fetch-Fehler bei Abfrageausführung:', fetchError);
        // Detaillierte Fehlerinformationen anzeigen
        setError(`Verbindungsfehler: ${fetchError.message || 'Unbekannter Fehler'}`);
      }
    } catch (err: any) {
      console.error('Fehler bei der Abfrage:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsExecuting(false);
    }
  }, [query]);

  // Funktion zur Anzeige einer Tabelle
  const viewTable = useCallback((tableName: string) => {
    // Prüfe, ob der Tabellenname gültig ist (nicht null oder leer)
    if (!tableName) {
      console.error('Ungültiger Tabellenname:', tableName);
      setError('Ein gültiger Tabellenname muss ausgewählt werden');
      return;
    }
    
    // Setze die ausgewählte Tabelle
    setSelectedTable(tableName);
    
    // Erstelle eine angepasste Abfrage je nach Tabellentyp
    let tableQuery = '';
    
    // Spezialfall: chat_messages mit neuesten Nachrichten zuerst
    if (tableName === 'chat_messages') {
      tableQuery = `
        SELECT 
          id, 
          chat_id, 
          sender, 
          SUBSTR(text, 1, 200) AS text_preview, 
          LENGTH(text) AS text_length,
          timestamp 
        FROM \`${tableName}\` 
        ORDER BY timestamp DESC 
        LIMIT 100
      `;
    }
    // Spezialfall: chats mit neuesten zuerst
    else if (tableName === 'chats') {
      tableQuery = `
        SELECT 
          id, 
          user_id, 
          title, 
          last_message_preview,
          created_at,
          updated_at
        FROM \`${tableName}\` 
        ORDER BY updated_at DESC 
        LIMIT 100
      `;
    }
    // Spezialfall: stage_snapshots mit neuesten zuerst
    else if (tableName === 'stage_snapshots') {
      tableQuery = `
        SELECT 
          id, 
          user_id,
          chat_id,
          timestamp,
          JSON_LENGTH(data) AS data_size
        FROM \`${tableName}\` 
        ORDER BY timestamp DESC 
        LIMIT 100
      `;
    }
    // Spezialfall: images mit neuesten zuerst
    else if (tableName === 'images') {
      tableQuery = `
        SELECT 
          id, 
          user_id,
          title,
          prompt,
          modelId,
          filePath,
          width,
          height,
          created_at
        FROM \`${tableName}\` 
        ORDER BY created_at DESC 
        LIMIT 100
      `;
    }
    // Standardfall
    else {
      tableQuery = `SELECT * FROM \`${tableName}\` LIMIT 100;`;
    }
    
    // Aktualisiere den Abfragetext im State
    setQuery(tableQuery);
    
    // Führe die Abfrage direkt mit dem generierten Query aus
    // Dies vermeidet Probleme mit asynchronen State-Updates
    executeQuery(tableQuery);
  }, [executeQuery]);

  // Funktion zum Löschen einer Bilddatei im Dateisystem
  const deleteImageFile = useCallback(async (filePath: string) => {
    if (!filePath) return false;
    
    try {
      const response = await fetch('/api/admin/delete-image-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Fehler beim Löschen der Bilddatei:', error);
      return false;
    }
  }, []);

  // Funktion zum Löschen eines einzelnen Datensatzes
  const deleteRecord = useCallback(async (row: any) => {
    if (!selectedTable) return;
    
    // Versuche, den Primärschlüssel zu finden
    const potentialPrimaryKeys = ['id', 'ID', `${selectedTable}_id`, 'uuid', 'key'];
    let primaryKeyField = '';
    let primaryKeyValue = null;
    
    // Suche nach bekannten Primärschlüsselnamen
    for (const key of potentialPrimaryKeys) {
      if (row[key] !== undefined) {
        primaryKeyField = key;
        primaryKeyValue = row[key];
        break;
      }
    }
    
    // Wenn kein Primärschlüssel gefunden wurde, versuche den ersten Feldwert
    if (!primaryKeyField && Object.keys(row).length > 0) {
      primaryKeyField = Object.keys(row)[0];
      primaryKeyValue = row[primaryKeyField];
    }
    
    // Wenn immer noch kein Schlüssel gefunden wurde, Fehler anzeigen
    if (!primaryKeyField || primaryKeyValue === null) {
      setError('Konnte keinen Primärschlüssel für diesen Datensatz identifizieren');
      return;
    }
    
    // Zusätzliche Logik für die images-Tabelle
    let confirmMessage = `Datensatz mit ${primaryKeyField}=${primaryKeyValue} wirklich löschen?`;
    let isImageTable = selectedTable === 'images';
    
    if (isImageTable) {
      confirmMessage = `Bild mit ${primaryKeyField}=${primaryKeyValue} wirklich löschen? Die Datei wird auch aus dem Dateisystem entfernt.`;
    }
    
    // Bestätigung anfordern
    if (confirm(confirmMessage)) {
      // Bei der images-Tabelle zuerst die Datei löschen
      if (isImageTable && row.filePath) {
        await deleteImageFile(row.filePath);
      }
      
      // SQL-Abfrage zum Löschen des Datensatzes erstellen
      const deleteQuery = typeof primaryKeyValue === 'string' 
        ? `DELETE FROM \`${selectedTable}\` WHERE \`${primaryKeyField}\` = '${primaryKeyValue.replace(/'/g, "''")}'`
        : `DELETE FROM \`${selectedTable}\` WHERE \`${primaryKeyField}\` = ${primaryKeyValue}`;
      
      // Abfrage ausführen
      executeQuery(deleteQuery);
    }
  }, [selectedTable, executeQuery, deleteImageFile]);

  // Funktion zum Löschen aller Datensätze einer Tabelle
  const deleteAllRecords = useCallback(async (table: string) => {
    if (!table) return;
    
    let confirmMessage = `Wirklich ALLE Daten aus Tabelle "${table}" löschen?`;
    let isImageTable = table === 'images';
    
    if (isImageTable) {
      confirmMessage = `Wirklich ALLE Bilder aus der Tabelle "${table}" löschen? Alle Dateien werden auch aus dem Dateisystem entfernt.`;
    }
    
    if (confirm(confirmMessage)) {
      // Bei der images-Tabelle erst alle Dateipfade holen
      if (isImageTable) {
        try {
          // Abfrage ausführen, um alle Dateipfade zu erhalten
          setIsExecuting(true);
          const response = await fetch('/api/database/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              query: `SELECT filePath FROM \`${table}\` WHERE filePath IS NOT NULL` 
            }),
          });
          
          const data = await response.json();
          setIsExecuting(false);
          
          if (data.success && Array.isArray(data.results)) {
            // Lösche alle Bilddateien
            for (const row of data.results) {
              if (row.filePath) {
                await deleteImageFile(row.filePath);
              }
            }
          }
        } catch (error) {
          console.error('Fehler beim Abrufen der Dateipfade:', error);
          setIsExecuting(false);
        }
      }
      
      // Dann Datenbanktabelle leeren
      executeQuery(`DELETE FROM \`${table}\``);
    }
  }, [executeQuery, deleteImageFile]);

  // Nicht rendern, wenn die Komponente noch nicht geladen ist oder der Benutzer kein Admin ist
  if (isLoading || !mounted || !isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="flex h-screen pt-[72px]">
        <div className="w-full flex flex-col h-full bg-[#f0f0f0]">
          {/* Header */}
          <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="flex justify-between items-start gap-4 w-full">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-light text-[#1a1a1a] tracking-tight">Datenbank-Verwaltung</h2>
                <p className="text-xs lg:text-sm text-gray-600 mt-1 break-normal">
                  MySQL-Datenbank direkt aus der Anwendung verwalten
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={fetchTables}
                  disabled={isLoadingTables}
                  className="px-4 py-2 text-sm rounded-full border border-gray-200 hover:bg-gray-50 flex items-center space-x-1"
                >
                  <span>
                    {isLoadingTables ? (
                      <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </span>
                  <span>Aktualisieren</span>
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 text-sm rounded-full border border-gray-200 hover:bg-gray-50"
                >
                  Zurück
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 pt-24 space-y-8 pb-24">
            {connectionStatus === 'error' && (
              <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-2xl mb-8">
                <h3 className="font-medium text-lg mb-2">Verbindungsfehler</h3>
                <p className="text-sm">{error || 'Es konnte keine Verbindung zur Datenbank hergestellt werden. Bitte überprüfen Sie Ihre Datenbankeinstellungen.'}</p>
                <button 
                  onClick={fetchTables}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            <div className="grid grid-cols-12 gap-8">
              {/* Tabellenliste */}
              <div className="col-span-12 lg:col-span-3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-base text-[#1a1a1a]">Tabellen</h3>
                    {connectionStatus === 'success' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        Verbunden
                      </span>
                    )}
                    {connectionStatus === 'loading' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                        Verbinde...
                      </span>
                    )}
                  </div>

                  {isLoadingTables ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <svg className="animate-spin h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-sm text-gray-500">Tabellen werden geladen...</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                      {tables.length > 0 ? (
                        tables.map((table) => (
                          <div key={table} className="flex items-center justify-between">
                            <button
                              onClick={() => viewTable(table)}
                              className={`flex-1 text-left px-3 py-2 rounded-lg text-sm ${
                                selectedTable === table
                                  ? 'bg-[#2c2c2c] text-white'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {table}
                            </button>
                            {selectedTable === table && (
                              <button
                                onClick={() => deleteAllRecords(table)}
                                className="ml-2 p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700"
                                title="Alle Daten löschen"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm p-3">Keine Tabellen gefunden.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Query Editor und Ergebnisse */}
              <div className="col-span-12 lg:col-span-9 space-y-6">
                {/* Query Editor */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-medium text-base mb-4 text-[#1a1a1a]">SQL-Abfrage</h3>
                  <div className="space-y-4">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full h-32 p-3 border border-gray-300 rounded-xl text-sm font-mono text-[#1a1a1a] bg-white"
                      placeholder="SELECT * FROM tabelle LIMIT 10;"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => executeQuery()}
                        disabled={isExecuting || !query.trim()}
                        className="px-5 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] disabled:bg-gray-400 transition-colors text-sm flex items-center space-x-2"
                      >
                        {isExecuting ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Wird ausgeführt...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Ausführen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ergebnisse */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-base text-[#1a1a1a]">Ergebnisse</h3>
                    {debugInfo && (
                      <div className="text-xs text-gray-500">
                        <span className="mr-2">Ausführungszeit: {debugInfo.executionTime}</span>
                        {debugInfo.timestamp && (
                          <span>Zeitstempel: {new Date(debugInfo.timestamp).toLocaleTimeString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 text-sm mb-4">
                      {error}
                    </div>
                  )}
                  
                  {isExecuting ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="animate-spin h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : results && results.length > 0 && Object.keys(results[0]).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Aktionen
                            </th>
                            {Object.keys(results[0]).map((key, index) => (
                              <th 
                                key={`header-${index}-${key || 'empty'}`}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                              >
                                {key || '(Ohne Name)'}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.map((row, rowIndex) => (
                            <tr key={`row-${rowIndex}`} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm">
                                <button
                                  onClick={() => deleteRecord(row)}
                                  className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700"
                                  title="Diesen Datensatz löschen"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                              {Object.entries(row).map(([key, value], cellIndex) => (
                                <td key={`cell-${rowIndex}-${cellIndex}-${key || 'empty'}`} className="px-3 py-2 text-sm text-gray-700">
                                  {value === null ? (
                                    <span className="text-gray-500 italic">NULL</span>
                                  ) : typeof value === 'object' ? (
                                    JSON.stringify(value)
                                  ) : key === 'text' || key === 'text_preview' || key === 'prompt' ? (
                                    <div className="max-w-xs overflow-hidden">
                                      <div className="truncate" title={String(value)}>
                                        {String(value)}
                                      </div>
                                      {key === 'text_preview' && row.text_length > 200 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {`(${row.text_length} Zeichen insgesamt)`}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    String(value)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : results && results.length === 0 ? (
                    <div className="text-center py-8">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-700 text-sm">Die Abfrage wurde erfolgreich ausgeführt, aber keine Daten zurückgegeben.</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                      <p className="text-gray-700 text-sm">Führe eine SQL-Abfrage aus, um Ergebnisse zu sehen.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 