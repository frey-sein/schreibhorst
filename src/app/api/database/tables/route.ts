import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Hilfsfunktion zum Erstellen einer Datenbankverbindung
async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schema',
  });
}

export async function GET() {
  let connection;
  try {
    // Verbindung zur Datenbank herstellen
    connection = await getConnection();

    // Abfrage ausführen, um Tabellen zu erhalten
    const [rows] = await connection.execute('SHOW TABLES');
    
    // Array mit Tabellennamen erstellen
    const tables = Array.isArray(rows) 
      ? rows.map((row: any) => Object.values(row)[0] as string)
      : [];

    // Sortiere die Tabellen alphabetisch
    tables.sort();

    return NextResponse.json({ tables, success: true });
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
    // Stellen Sie sicher, dass die Verbindung geschlossen wird
    if (connection) {
      await connection.end();
    }
  }
} 