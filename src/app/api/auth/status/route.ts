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
      connectTimeout: 10000,
    });
    return connection;
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    // Cookie auslesen
    const userIdCookie = request.cookies.get('user-id')?.value;
    
    // Wenn kein Cookie vorhanden ist, ist der Benutzer nicht authentifiziert
    if (!userIdCookie) {
      return NextResponse.json({
        authenticated: false
      });
    }
    
    // Datenbankverbindung herstellen
    connection = await getConnection();
    
    // Überprüfe, ob der Benutzer existiert und aktiv ist
    const [users] = await connection.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? AND active = TRUE',
      [userIdCookie]
    );
    
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({
        authenticated: false
      });
    }
    
    const user = users[0] as any;
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Fehler bei der Authentifizierungsstatusüberprüfung:', error);
    return NextResponse.json(
      { 
        error: 'Fehler bei der Authentifizierungsüberprüfung: ' + error.message,
        authenticated: false 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
} 