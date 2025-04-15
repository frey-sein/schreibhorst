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

// GET-Endpunkt zum Abrufen eines Benutzers
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  
  try {
    const userId = params.id;
    const requestUserId = request.cookies.get('user-id')?.value;
    
    // Überprüfe, ob ein Benutzer angemeldet ist
    if (!requestUserId) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Verbinde zur Datenbank
    connection = await getConnection();
    
    // Überprüfe, ob der aktuelle Benutzer Admin ist oder sein eigenes Profil abruft
    const isCurrentUserAdmin = await isAdmin(requestUserId);
    
    if (!isCurrentUserAdmin && requestUserId !== userId) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }
    
    // Benutzer aus der Datenbank abrufen (ohne Passwort)
    const [users] = await connection.execute(
      `SELECT id, name, email, role, image_url, created_at, last_login, active 
       FROM users WHERE id = ?`,
      [userId]
    );
    
    // Wenn kein Benutzer gefunden wurde
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Formatiere die Benutzerdaten
    const user = users[0] as any;
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      imageUrl: user.image_url,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      active: Boolean(user.active)
    });
  } catch (error: any) {
    console.error('Fehler beim Laden des Benutzers:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Benutzers: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// PATCH-Endpunkt zum Aktualisieren eines Benutzers
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  
  try {
    const userId = params.id;
    const requestUserId = request.cookies.get('user-id')?.value;
    
    // Überprüfe, ob ein Benutzer angemeldet ist
    if (!requestUserId) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Verbinde zur Datenbank
    connection = await getConnection();
    
    // Überprüfe, ob der aktuelle Benutzer Admin ist oder sein eigenes Profil bearbeitet
    const isCurrentUserAdmin = await isAdmin(requestUserId);
    
    if (!isCurrentUserAdmin && requestUserId !== userId) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }
    
    // Daten aus dem Request-Body extrahieren
    const body = await request.json();
    const { name, email, password, imageUrl, role, active } = body;
    
    // Stelle sicher, dass zumindest ein Feld aktualisiert wird
    if (!name && !email && !password && imageUrl === undefined && role === undefined && active === undefined) {
      return NextResponse.json(
        { error: 'Keine Aktualisierungsdaten angegeben' },
        { status: 400 }
      );
    }
    
    // Verhindere, dass ein Nicht-Admin die Rolle oder den Aktivitätsstatus ändert
    if (!isCurrentUserAdmin && (role !== undefined || active !== undefined)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Ändern der Rolle oder des Aktivitätsstatus' },
        { status: 403 }
      );
    }
    
    // Baue die SQL-Abfrage dynamisch auf
    let updateSQL = 'UPDATE users SET ';
    const updateParams = [];
    const updateFields = [];
    
    if (name) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    
    if (email) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }
    
    if (password) {
      updateFields.push('password = ?');
      updateParams.push(crypto.createHash('md5').update(password).digest('hex'));
    }
    
    if (imageUrl !== undefined) {
      updateFields.push('image_url = ?');
      updateParams.push(imageUrl);
    }
    
    if (isCurrentUserAdmin && role !== undefined) {
      updateFields.push('role = ?');
      updateParams.push(role);
    }
    
    if (isCurrentUserAdmin && active !== undefined) {
      updateFields.push('active = ?');
      updateParams.push(active);
    }
    
    updateSQL += updateFields.join(', ') + ' WHERE id = ?';
    updateParams.push(userId);
    
    // Führe die Update-Abfrage aus
    const [result] = await connection.execute(updateSQL, updateParams);
    
    // Überprüfe, ob der Benutzer gefunden und aktualisiert wurde
    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Aktualisierte Benutzerdaten abrufen
    const [users] = await connection.execute(
      `SELECT id, name, email, role, image_url, created_at, last_login, active 
       FROM users WHERE id = ?`,
      [userId]
    );
    
    const user = Array.isArray(users) && users.length > 0 ? users[0] as any : null;
    
    return NextResponse.json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert',
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        imageUrl: user.image_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        active: Boolean(user.active)
      } : null
    });
  } catch (error: any) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    
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
      { error: 'Fehler beim Aktualisieren des Benutzers: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE-Endpunkt zum Löschen eines Benutzers
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  
  try {
    const userId = params.id;
    const requestUserId = request.cookies.get('user-id')?.value;
    
    // Überprüfe, ob ein Benutzer angemeldet ist
    if (!requestUserId) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Nur Admins dürfen Benutzer löschen
    const isCurrentUserAdmin = await isAdmin(requestUserId);
    if (!isCurrentUserAdmin) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Löschen von Benutzern' },
        { status: 403 }
      );
    }
    
    // Verbinde zur Datenbank
    connection = await getConnection();
    
    // Verhindere das Löschen des eigenen Accounts
    if (userId === requestUserId) {
      return NextResponse.json(
        { error: 'Du kannst deinen eigenen Account nicht löschen' },
        { status: 400 }
      );
    }
    
    // Benutzer deaktivieren anstatt zu löschen (soft delete)
    const [result] = await connection.execute(
      'UPDATE users SET active = FALSE WHERE id = ?',
      [userId]
    );
    
    // Überprüfe, ob der Benutzer gefunden und deaktiviert wurde
    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Benutzer erfolgreich deaktiviert'
    });
  } catch (error: any) {
    console.error('Fehler beim Deaktivieren des Benutzers:', error);
    return NextResponse.json(
      { error: 'Fehler beim Deaktivieren des Benutzers: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
} 