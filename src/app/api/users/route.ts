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

// Hilfsfunktion zur Überprüfung, ob der aktuelle Benutzer Admin ist
async function isAdmin(userId: string) {
  if (!userId) return false;
  
  let connection;
  try {
    connection = await getConnection();
    const [users] = await connection.execute(
      'SELECT role FROM users WHERE id = ? AND active = TRUE',
      [userId]
    );
    
    if (Array.isArray(users) && users.length > 0) {
      return (users[0] as any).role === 'admin';
    }
    
    return false;
  } catch (error) {
    console.error('Fehler bei der Admin-Überprüfung:', error);
    return false;
  } finally {
    if (connection) await connection.end();
  }
}

// GET-Endpunkt zum Abrufen aller Benutzer
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    // Überprüfe, ob der Benutzer authentifiziert ist
    const userIdCookie = request.cookies.get('user-id')?.value;
    
    if (!userIdCookie) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Überprüfe, ob der Benutzer Admin ist (nur Admins können alle Benutzer sehen)
    const admin = await isAdmin(userIdCookie);
    if (!admin) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }
    
    // Verbinde zur Datenbank
    connection = await getConnection();
    
    // Alle Benutzer abrufen (ohne Passwörter)
    const [users] = await connection.execute(
      'SELECT id, name, email, role, image_url, created_at, last_login, active FROM users'
    );
    
    return NextResponse.json({
      users,
      success: true
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Benutzer: ' + error.message,
        success: false 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// POST-Endpunkt zum Erstellen eines neuen Benutzers
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    // Überprüfe, ob der Benutzer authentifiziert ist
    const userIdCookie = request.cookies.get('user-id')?.value;
    
    if (!userIdCookie) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Überprüfe, ob der Benutzer Admin ist
    const admin = await isAdmin(userIdCookie);
    if (!admin) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Erstellen von Benutzern' },
        { status: 403 }
      );
    }
    
    // Daten aus dem Request-Body extrahieren
    const body = await request.json();
    const { name, email, password, role, imageUrl } = body;
    
    // Validiere Eingabedaten
    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name und Passwort sind erforderlich' },
        { status: 400 }
      );
    }
    
    // Stelle sicher, dass die Rolle gültig ist
    const validRole = role === 'admin' || role === 'user';
    if (role && !validRole) {
      return NextResponse.json(
        { error: 'Ungültige Rolle' },
        { status: 400 }
      );
    }
    
    // Verbinde zur Datenbank
    connection = await getConnection();
    
    // MD5-Hash des Passworts erstellen
    const passwordHash = require('crypto')
      .createHash('md5')
      .update(password)
      .digest('hex');
    
    // Benutzer einfügen
    const [result] = await connection.execute(
      `INSERT INTO users (id, name, email, password, role, image_url) 
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [name, email || null, passwordHash, role || 'user', imageUrl || null]
    );
    
    // ID des neuen Benutzers abrufen
    const [newUserRows] = await connection.execute(
      'SELECT id, name, email, role, image_url, created_at FROM users WHERE name = ? ORDER BY created_at DESC LIMIT 1',
      [name]
    );
    
    const newUser = Array.isArray(newUserRows) && newUserRows.length > 0 
      ? newUserRows[0] 
      : null;
    
    return NextResponse.json({
      user: newUser,
      success: true,
      message: 'Benutzer erfolgreich erstellt'
    });
  } catch (error: any) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    
    // Überprüfe auf Duplikatfehler
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { 
          error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
          success: false 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen des Benutzers: ' + error.message,
        success: false 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
} 