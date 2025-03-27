import mysql from 'mysql2/promise';

// MySQL Verbindungspool
let _pool: mysql.Pool | null = null;

/**
 * Initialisiert den MySQL-Verbindungspool, wenn er noch nicht existiert
 */
export function getPool(): mysql.Pool | null {
  if (_pool) return _pool;
  
  try {
    if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE) {
      _pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      console.log('MySQL-Verbindung wurde initialisiert');
      return _pool;
    } else {
      console.log('Keine MySQL-Konfiguration gefunden');
      return null;
    }
  } catch (error) {
    console.error('Fehler beim Initialisieren der MySQL-Verbindung:', error);
    return null;
  }
}

/**
 * Initialisiert die Datenbank und erstellt die benötigten Tabellen
 */
export async function initializeDatabase(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  
  const connection = await pool.getConnection();
  try {
    // Erstelle die Bilder-Tabelle
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        prompt TEXT,
        modelId VARCHAR(50) NOT NULL,
        filePath VARCHAR(255) NOT NULL,
        width INT NOT NULL,
        height INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        meta JSON
      )
    `);
    
    // Erstelle die Snapshots-Tabelle für Stage-Zustände
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stage_snapshots (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data JSON
      )
    `);

    // Erstelle die Wissensdatenbank-Tabelle
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Datenbanktabellen wurden erfolgreich initialisiert');
  } catch (error) {
    console.error('Fehler beim Erstellen der Tabellen:', error);
  } finally {
    connection.release();
  }
}

// Initialisiere die Datenbank beim ersten Import dieser Datei
initializeDatabase().catch(error => {
  console.error('Fehler beim Initialisieren der Datenbank:', error);
});  