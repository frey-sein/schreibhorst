import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

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

// Formatiert ein ISO-Datum für MySQL (YYYY-MM-DD HH:MM:SS)
function formatDateForMySQL(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.error('Fehler beim Formatieren des Datums:', error);
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
}

export async function POST(request: NextRequest) {
  let connection;
  
  try {
    const { localUsers } = await request.json();
    
    if (!Array.isArray(localUsers) || localUsers.length === 0) {
      return NextResponse.json(
        { error: 'Keine Benutzer zum Migrieren gefunden' },
        { status: 400 }
      );
    }
    
    // Verbinde zur Datenbank
    connection = await getConnection();
    
    const migratedUsers = [];
    const errors = [];
    
    // Iteriere über jeden Benutzer und migriere ihn in die Datenbank
    for (const user of localUsers) {
      try {
        // Überprüfe, ob der Benutzer bereits existiert (anhand der E-Mail-Adresse)
        if (user.email) {
          const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [user.email]
          );
          
          if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            errors.push({
              user: user.name,
              error: 'E-Mail-Adresse bereits vorhanden'
            });
            continue;
          }
        }
        
        // Erstelle ein MD5-Passwort aus dem bcrypt-Hash (als Fallback)
        // In Produktion sollte man einen besseren Ansatz wählen
        const defaultPassword = 'temp123'; // Temporäres Passwort, falls kein Hash vorhanden
        const passwordMd5 = crypto.createHash('md5').update(defaultPassword).digest('hex');
        
        // Formatiere die Daten korrekt
        const imageUrl = user.imageUrl ? user.imageUrl.substring(0, 490) : null; // Kürze auf maximal 490 Zeichen
        const createdAt = user.createdAt ? formatDateForMySQL(user.createdAt) : formatDateForMySQL(new Date().toISOString());
        const lastLogin = user.lastLogin ? formatDateForMySQL(user.lastLogin) : formatDateForMySQL(new Date().toISOString());
        
        // Füge den Benutzer in die Datenbank ein
        const [result] = await connection.execute(
          `INSERT INTO users (id, name, email, password, role, image_url, created_at, last_login, active) 
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            user.name,
            user.email || null,
            passwordMd5, // Standardpasswort für migrierte Benutzer
            user.role || 'user',
            imageUrl,
            createdAt,
            lastLogin
          ]
        );
        
        migratedUsers.push({
          name: user.name,
          email: user.email,
          role: user.role,
          // Hinweis auf Passwortänderung
          passwordReset: true
        });
      } catch (err: any) {
        console.error('Fehler beim Migrieren des Benutzers:', user.name, err);
        errors.push({
          user: user.name,
          error: err.message || 'Unbekannter Fehler'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${migratedUsers.length} Benutzer erfolgreich migriert`,
      migrated: migratedUsers,
      errors: errors
    });
  } catch (err: any) {
    console.error('Fehler bei der Benutzermigration:', err);
    return NextResponse.json(
      { error: 'Fehler bei der Benutzermigration: ' + (err.message || 'Unbekannter Fehler') },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
} 