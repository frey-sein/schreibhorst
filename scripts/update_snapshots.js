/**
 * Dieses Skript aktualisiert die stage_snapshots-Tabelle, um das manual_save-Feld
 * zu unterstützen und setzt bestehende Snapshots auf automatisch generiert.
 * 
 * Verwendung:
 * node scripts/update_snapshots.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  // Datenbankverbindung herstellen
  const dbConfig = {
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQL_USER || process.env.DB_USER || 'schreibhorst',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'schreibhorst'
  };

  console.log('Verbinde mit der Datenbank...');
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. Prüfen, ob die Tabelle bereits existiert
    const [tables] = await connection.execute(
      `SHOW TABLES LIKE 'stage_snapshots'`
    );

    if (tables.length === 0) {
      console.log('Tabelle stage_snapshots existiert nicht. Überspringe Aktualisierung.');
      return;
    }

    // 2. Überprüfen, ob die Spalte manual_save bereits existiert
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM stage_snapshots LIKE 'manual_save'`
    );

    // 3. Wenn die Spalte nicht existiert, füge sie hinzu
    if (columns.length === 0) {
      console.log('Füge manual_save-Spalte zur Tabelle stage_snapshots hinzu...');
      await connection.execute(
        `ALTER TABLE stage_snapshots ADD COLUMN manual_save TINYINT(1) NOT NULL DEFAULT 0`
      );
      console.log('Spalte manual_save erfolgreich hinzugefügt.');
    } else {
      console.log('Spalte manual_save existiert bereits.');
    }

    // 4. Anzahl der vorhandenen Snapshots abrufen
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM stage_snapshots`
    );
    const totalSnapshots = countResult[0].count;

    // 5. Anzahl der manuell gespeicherten Snapshots abrufen
    const [manualCountResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM stage_snapshots WHERE manual_save = 1`
    );
    const manualSnapshots = manualCountResult[0].count;

    console.log(`Gefunden: ${totalSnapshots} Snapshots insgesamt, davon ${manualSnapshots} manuell gespeichert.`);

    // 6. Frage den Benutzer, ob alle automatischen Snapshots gelöscht werden sollen
    console.log('\nMöchtest du alle automatisch erzeugten Snapshots (nicht manuell gespeichert) löschen?');
    console.log('Dies würde ' + (totalSnapshots - manualSnapshots) + ' Einträge löschen.');
    console.log('Um fortzufahren, führe folgenden Befehl aus:');
    console.log('\nmysql -u' + dbConfig.user + ' -p' + dbConfig.database + ' -e "DELETE FROM stage_snapshots WHERE manual_save = 0"\n');

    console.log('Aktualisierung abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Aktualisierung der Datenbank:', error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error); 