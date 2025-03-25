// Einfaches Skript zum Testen der Pixabay-API
require('dotenv').config({ path: '.env.local' });

// Test-Funktion
async function testPixabayAPI() {
  console.log('Starte Pixabay API Test');
  console.log('-----------------------');
  
  // API-Schlüssel prüfen
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.error('FEHLER: Der API-Schlüssel ist nicht in der .env.local Datei definiert');
    console.log('Bitte füge PIXABAY_API_KEY=dein_pixabay_schluessel in die .env.local Datei ein');
    return;
  }
  
  console.log('API-Schlüssel gefunden:', apiKey.substring(0, 4) + '...');
  
  try {
    // Test-Aufruf an die Pixabay-API
    const testQuery = 'cat';
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(testQuery)}&image_type=photo&per_page=3`;
    
    console.log('Sende Anfrage an Pixabay...');
    const response = await fetch(url);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`FEHLER: HTTP-Status ${response.status}`);
      console.error('Antwort:', text);
      return;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('FEHLER von der API:', data.error);
      return;
    }
    
    console.log('API-Antwort erhalten!');
    console.log('Anzahl der Treffer:', data.totalHits);
    console.log('Ergebnisse:', data.hits.length);
    
    if (data.hits && data.hits.length > 0) {
      console.log('\nErster Treffer:');
      console.log('- ID:', data.hits[0].id);
      console.log('- Tags:', data.hits[0].tags);
      console.log('- Vorschau URL:', data.hits[0].previewURL);
    }
    
    console.log('\nTest erfolgreich abgeschlossen!');
  } catch (error) {
    console.error('FEHLER beim API-Aufruf:', error.message);
  }
}

// Test ausführen
testPixabayAPI(); 