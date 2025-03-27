import { FAQItem } from './knowledgeStorage';

/**
 * Holt alle FAQ-Items über die API
 */
export async function getAllFAQs(): Promise<FAQItem[]> {
  try {
    const response = await fetch('/api/knowledge');
    const data = await response.json();
    
    if (!data.success) {
      console.error('Fehler beim Abrufen der FAQ-Items:', data.message);
      return [];
    }
    
    return data.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der FAQ-Items:', error);
    return [];
  }
}

/**
 * Erstellt ein neues FAQ-Item über die API
 */
export async function createFAQ(faqItem: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>): Promise<FAQItem | null> {
  try {
    const response = await fetch('/api/knowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(faqItem)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Fehler beim Erstellen des FAQ-Items:', data.message);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Fehler beim Erstellen des FAQ-Items:', error);
    return null;
  }
}

/**
 * Aktualisiert ein FAQ-Item über die API
 */
export async function updateFAQ(id: number, faqItem: Partial<FAQItem>): Promise<FAQItem | null> {
  try {
    const response = await fetch(`/api/knowledge?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(faqItem)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`Fehler beim Aktualisieren des FAQ-Items mit ID ${id}:`, data.message);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des FAQ-Items mit ID ${id}:`, error);
    return null;
  }
}

/**
 * Löscht ein FAQ-Item über die API
 */
export async function deleteFAQ(id: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/knowledge?id=${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`Fehler beim Löschen des FAQ-Items mit ID ${id}:`, data.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Fehler beim Löschen des FAQ-Items mit ID ${id}:`, error);
    return false;
  }
}

/**
 * Migriert FAQ-Items aus dem localStorage in die Datenbank
 */
export async function migrateFAQsFromLocalStorage(items: FAQItem[]): Promise<boolean> {
  try {
    const response = await fetch('/api/knowledge/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Fehler bei der Migration der FAQ-Items:', data.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Fehler bei der Migration der FAQ-Items:', error);
    return false;
  }
} 