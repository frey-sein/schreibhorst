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

export async function POST(request: NextRequest) {
  let connection;
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validiere Eingaben
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }
    
    // Datenbankverbindung herstellen
    connection = await getConnection();
    
    // Verschlüssele das eingegebene Passwort mit MD5
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    
    // Benutzer in der Datenbank suchen
    const [users] = await connection.execute(
      'SELECT id, name, email, role, image_url FROM users WHERE email = ? AND password = ? AND active = TRUE',
      [email, hashedPassword]
    );
    
    // Wenn kein Benutzer gefunden wurde
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail oder Passwort' },
        { status: 401 }
      );
    }
    
    const user = users[0] as any;
    
    // Aktualisiere den letzten Login-Zeitpunkt
    await connection.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    
    // Erstelle die Response mit dem Cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        imageUrl: user.image_url
      }
    });
    
    // Setze den Cookie in der Response
    response.cookies.set('user-id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 Tage
    });
    
    console.log('Benutzer erfolgreich angemeldet:', user.name);
    return response;
  } catch (error: any) {
    console.error('Fehler beim Login:', error);
    return NextResponse.json(
      { error: 'Fehler beim Login: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
} 