import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import { getPool } from '../db/mysql';

// Typen für die Wissensdatenbank
export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  created_at?: Date;
  updated_at?: Date;
}

// Prüft, ob die MySQL-Verbindung verfügbar ist
function isDatabaseAvailable(): boolean {
  return getPool() !== null;
}

/**
 * Initialisiert die Tabelle für die Wissensdatenbank
 */
export async function initializeKnowledgeTable(): Promise<void> {
  if (!isDatabaseAvailable()) return;
  
  const pool = getPool();
  if (!pool) return;
  
  const connection = await pool.getConnection();
  try {
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
    
    console.log('Wissensdatenbank-Tabelle wurde erfolgreich initialisiert');
  } catch (error) {
    console.error('Fehler beim Erstellen der Wissensdatenbank-Tabelle:', error);
  } finally {
    connection.release();
  }
}

/**
 * Speichert ein FAQ-Item in der Datenbank
 */
export async function saveFAQ(faqItem: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>): Promise<FAQItem> {
  // Wenn keine Datenbank verfügbar ist, werfen wir einen Fehler
  if (!isDatabaseAvailable()) {
    throw new Error('Keine Datenbankverbindung verfügbar');
  }
  
  const pool = getPool();
  if (!pool) {
    throw new Error('Keine Datenbankverbindung verfügbar');
  }
  
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO knowledge_faqs (question, answer, category) 
       VALUES (?, ?, ?)`,
      [faqItem.question, faqItem.answer, faqItem.category]
    );
    
    // MySQL gibt die ID des neu erstellten Eintrags zurück
    const insertId = (result as any).insertId;
    
    // Wir holen den gerade erstellten Eintrag, um alle Felder zu haben
    const [rows] = await connection.execute(
      'SELECT * FROM knowledge_faqs WHERE id = ?',
      [insertId]
    );
    
    return (rows as any[])[0] as FAQItem;
  } catch (error) {
    console.error('Fehler beim Speichern des FAQ-Items:', error);
    throw new Error('FAQ-Item konnte nicht gespeichert werden');
  } finally {
    connection.release();
  }
}

/**
 * Aktualisiert ein FAQ-Item in der Datenbank
 */
export async function updateFAQ(id: number, faqItem: Partial<FAQItem>): Promise<FAQItem> {
  if (!isDatabaseAvailable()) {
    throw new Error('Keine Datenbankverbindung verfügbar');
  }
  
  const pool = getPool();
  if (!pool) {
    throw new Error('Keine Datenbankverbindung verfügbar');
  }
  
  const connection = await pool.getConnection();
  try {
    // Wir aktualisieren nur die angegebenen Felder
    const fields: string[] = [];
    const values: any[] = [];
    
    if (faqItem.question !== undefined) {
      fields.push('question = ?');
      values.push(faqItem.question);
    }
    
    if (faqItem.answer !== undefined) {
      fields.push('answer = ?');
      values.push(faqItem.answer);
    }
    
    if (faqItem.category !== undefined) {
      fields.push('category = ?');
      values.push(faqItem.category);
    }
    
    // Wenn keine Felder zum Aktualisieren angegeben wurden
    if (fields.length === 0) {
      throw new Error('Keine Felder zum Aktualisieren angegeben');
    }
    
    // Füge die ID für die WHERE-Klausel hinzu
    values.push(id);
    
    await connection.execute(
      `UPDATE knowledge_faqs 
       SET ${fields.join(', ')} 
       WHERE id = ?`,
      values
    );
    
    // Hole das aktualisierte FAQ-Item
    const [rows] = await connection.execute(
      'SELECT * FROM knowledge_faqs WHERE id = ?',
      [id]
    );
    
    if ((rows as any[]).length === 0) {
      throw new Error(`FAQ-Item mit ID ${id} nicht gefunden`);
    }
    
    return (rows as any[])[0] as FAQItem;
  } catch (error) {
    console.error('Fehler beim Aktualisieren des FAQ-Items:', error);
    throw new Error('FAQ-Item konnte nicht aktualisiert werden');
  } finally {
    connection.release();
  }
}

/**
 * Löscht ein FAQ-Item aus der Datenbank
 */
export async function deleteFAQ(id: number): Promise<void> {
  if (!isDatabaseAvailable()) {
    throw new Error('Keine Datenbankverbindung verfügbar');
  }
  
  const pool = getPool();
  if (!pool) {
    throw new Error('Keine Datenbankverbindung verfügbar');
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'DELETE FROM knowledge_faqs WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error('Fehler beim Löschen des FAQ-Items:', error);
    throw new Error('FAQ-Item konnte nicht gelöscht werden');
  } finally {
    connection.release();
  }
}

/**
 * Holt alle FAQ-Items aus der Datenbank
 */
export async function getAllFAQs(): Promise<FAQItem[]> {
  if (!isDatabaseAvailable()) {
    return [];
  }
  
  const pool = getPool();
  if (!pool) {
    return [];
  }
  
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM knowledge_faqs ORDER BY category, id'
    );
    
    return rows as FAQItem[];
  } catch (error) {
    console.error('Fehler beim Abrufen der FAQ-Items:', error);
    return [];
  } finally {
    connection.release();
  }
}

/**
 * Migriert FAQ-Items aus dem localStorage in die Datenbank
 */
export async function migrateFromLocalStorage(items: FAQItem[]): Promise<void> {
  if (!isDatabaseAvailable() || items.length === 0) {
    return;
  }
  
  const pool = getPool();
  if (!pool) {
    return;
  }
  
  const connection = await pool.getConnection();
  try {
    // Beginne eine Transaktion
    await connection.beginTransaction();
    
    for (const item of items) {
      await connection.execute(
        `INSERT INTO knowledge_faqs (question, answer, category) 
         VALUES (?, ?, ?)`,
        [item.question, item.answer, item.category]
      );
    }
    
    // Commit der Transaktion
    await connection.commit();
    
    console.log(`${items.length} FAQ-Items wurden erfolgreich migriert`);
  } catch (error) {
    // Rollback bei Fehler
    await connection.rollback();
    console.error('Fehler bei der Migration der FAQ-Items:', error);
    throw new Error('FAQ-Items konnten nicht migriert werden');
  } finally {
    connection.release();
  }
}

/**
 * Prüft, ob ein FAQ-Item bereits in der Datenbank existiert
 * Die Überprüfung erfolgt anhand der Kombination von Frage und Kategorie
 * Gibt das gefundene Duplikat zurück, wenn vorhanden
 */
export async function checkForDuplicate(question: string, category: string): Promise<FAQItem | null> {
  if (!isDatabaseAvailable()) {
    return null;
  }
  
  const pool = getPool();
  if (!pool) {
    return null;
  }
  
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM knowledge_faqs WHERE question = ? AND category = ? LIMIT 1',
      [question, category]
    );
    
    const results = rows as any[];
    return results.length > 0 ? results[0] as FAQItem : null;
  } catch (error) {
    console.error('Fehler bei der Duplikatprüfung:', error);
    return null;
  } finally {
    connection.release();
  }
} 