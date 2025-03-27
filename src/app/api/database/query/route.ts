import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Hilfsfunktion zum Erstellen einer Datenbankverbindung
async function getConnection() {
  try {
    console.log('DB Verbindungsversuch:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    
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
    
    console.log('Datenbankverbindung erfolgreich hergestellt');
    return connection;
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  let connection;
  console.log('POST-Anfrage an /api/database/query erhalten');
  
  try {
    const body = await request.json();
    const { query } = body;
    
    console.log('Erhaltene Abfrage:', query);

    if (!query) {
      console.warn('Keine Abfrage angegeben');
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
        console.warn('Destruktive Operation in Produktion versucht:', query);
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
    try {
      connection = await getConnection();
    } catch (connError: any) {
      console.error('Verbindungsfehler:', connError);
      return NextResponse.json(
        { 
          error: `Datenbankverbindung fehlgeschlagen: ${connError.message}`,
          success: false 
        },
        { status: 500 }
      );
    }

    // Abfrage ausführen mit Timeout
    console.log('Führe Abfrage aus:', query);
    const startTime = Date.now();
    const [results] = await connection.execute({
      sql: query,
      timeout: 30000 // 30 Sekunden Timeout für lange Abfragen
    });
    const endTime = Date.now();
    console.log(`Abfrage erfolgreich in ${endTime - startTime}ms ausgeführt`);

    // Debug-Informationen hinzufügen
    const debugInfo = {
      executionTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    };

    // Stelle sicher, dass die Verbindung geschlossen wird
    await connection.end();
    console.log('Datenbankverbindung geschlossen');

    return NextResponse.json({ 
      results, 
      debug: debugInfo,
      success: true 
    });
  } catch (error: any) {
    console.error('Schwerer Fehler bei der Abfrage:', error);
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
        console.log('Datenbankverbindung im finally-Block geschlossen');
      } catch (err) {
        console.error('Fehler beim Schließen der Datenbankverbindung:', err);
      }
    }
  }
} 