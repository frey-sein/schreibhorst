import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Hilfsfunktion zum Erstellen einer Datenbankverbindung
async function getConnection() {
  try {
    console.log('Verbindungsaufbau zur Datenbank');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'schema',
      connectTimeout: 10000,
      waitForConnections: true,
    });
    
    console.log('Datenbankverbindung erfolgreich hergestellt');
    return connection;
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    throw error;
  }
}

export async function POST() {
  let connection;
  
  try {
    connection = await getConnection();
    
    // SQL zur Erstellung der Benutzertabelle
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(32) NOT NULL, 
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        image_url VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL DEFAULT NULL,
        active BOOLEAN DEFAULT TRUE,
        INDEX idx_role (role),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    // Erstelle die Tabelle
    await connection.execute(createTableSQL);
    console.log('Benutzertabelle erfolgreich erstellt oder bereits vorhanden');
    
    // Erstelle einen Standard-Admin-Benutzer, wenn keiner existiert
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    const userCount = Array.isArray(existingUsers) && existingUsers.length > 0 ? (existingUsers[0] as any).count : 0;
    
    if (userCount === 0) {
      // Erstelle den Admin-Benutzer mit MD5-verschlüsseltem Passwort 'admin'
      // MD5 von 'admin' ist '21232f297a57a5a743894a0e4a801fc3'
      await connection.execute(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (UUID(), 'Administrator', 'admin@nuetzlich.local', '21232f297a57a5a743894a0e4a801fc3', 'admin')
      `);
      console.log('Standard-Admin-Benutzer erstellt');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Benutzertabelle erfolgreich eingerichtet'
    });
  } catch (error: any) {
    console.error('Fehler beim Erstellen der Benutzertabelle:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen der Benutzertabelle: ' + error.message,
        success: false 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Datenbankverbindung geschlossen');
      } catch (err) {
        console.error('Fehler beim Schließen der Datenbankverbindung:', err);
      }
    }
  }
} 