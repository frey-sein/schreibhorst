import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Hilfsfunktion zum Erstellen einer Datenbankverbindung
async function getConnection() {
  try {
    // Protokolliere die Verbindungsparameter (ohne Passwort)
    console.log('Verbindungsaufbau zur Datenbank mit:', {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'schema',
    });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'schema',
      // Zusätzliche Optionen für mehr Stabilität
      connectTimeout: 10000,
      waitForConnections: true,
    });

    // Teste die Verbindung mit einer einfachen Abfrage
    const [testResult] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('Verbindung erfolgreich, aktuelle Datenbank:', testResult);

    return connection;
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    throw error;
  }
}

export async function GET() {
  let connection;
  try {
    // Erstelle eine neue Verbindung für jede Anfrage
    connection = await getConnection();

    // Verwende einfachere SHOW TABLES Abfrage, die für alle MySQL-Versionen funktioniert
    const [rows] = await connection.execute('SHOW TABLES');
    
    // Array mit Tabellennamen erstellen - bei SHOW TABLES enthält jedes Row-Element nur einen Wert
    const tables = Array.isArray(rows) 
      ? rows.map((row: any) => Object.values(row)[0] as string)
      : [];

    console.log('Gefundene Tabellen:', tables); // Logging für Debugging

    // Stelle sicher, dass die Verbindung geschlossen wird
    await connection.end();

    // Liefere die Tabellenliste mit einem Zeitstempel zurück
    return NextResponse.json({ 
      tables, 
      timestamp: new Date().toISOString(),
      success: true 
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Tabellen:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Tabellen: ' + error.message,
        success: false 
      },
      { status: 500 }
    );
  } finally {
    // Stelle sicher, dass die Verbindung geschlossen wird
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Fehler beim Schließen der Datenbankverbindung:', err);
      }
    }
  }
} 