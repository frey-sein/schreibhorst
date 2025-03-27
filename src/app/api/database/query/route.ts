import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Hilfsfunktion zum Erstellen einer Datenbankverbindung
async function getConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'schema',
      // Zusätzliche Optionen für mehr Stabilität
      connectTimeout: 10000, // 10 Sekunden
      waitForConnections: true,
      multipleStatements: false, // Vermeide mehrere Statements, Sicherheitsmaßnahme
    });
    return connection;
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Keine Abfrage angegeben', success: false },
        { status: 400 }
      );
    }

    // Sicherheits-Check für destruktive Abfragen im Produktionsmodus
    if (process.env.NODE_ENV === 'production') {
      const lowerQuery = query.toLowerCase();
      if (
        lowerQuery.includes('drop ') ||
        lowerQuery.includes('delete ') ||
        lowerQuery.includes('truncate ') ||
        lowerQuery.includes('alter ') ||
        lowerQuery.includes('create ')
      ) {
        // In Produktion verbieten wir destruktive Operationen
        return NextResponse.json(
          { 
            error: 'Destruktive Datenbankoperationen sind in der Produktionsumgebung nicht erlaubt',
            success: false
          },
          { status: 403 }
        );
      }
    }

    // Verbindung zur Datenbank herstellen
    connection = await getConnection();

    // Abfrage ausführen mit Timeout
    const startTime = Date.now();
    const [results] = await connection.execute({
      sql: query,
      timeout: 30000 // 30 Sekunden Timeout für lange Abfragen
    });
    const endTime = Date.now();

    // Debug-Informationen hinzufügen
    const debugInfo = {
      executionTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    };

    // Stelle sicher, dass die Verbindung geschlossen wird
    await connection.end();

    return NextResponse.json({ 
      results, 
      debug: debugInfo,
      success: true 
    });
  } catch (error: any) {
    console.error('Fehler bei der Abfrage:', error);
    return NextResponse.json(
      { 
        error: 'Fehler bei der Ausführung der Abfrage: ' + error.message,
        success: false 
      },
      { status: 500 }
    );
  } finally {
    // Stellen Sie sicher, dass die Verbindung geschlossen wird
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Fehler beim Schließen der Datenbankverbindung:', err);
      }
    }
  }
} 