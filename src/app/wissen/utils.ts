interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
}

export async function getCategories(): Promise<string[]> {
  // Hole die Kategorien aus dem localStorage
  const knowledgeBase = localStorage.getItem('knowledgeBase');
  if (!knowledgeBase) {
    return [];
  }

  const data = JSON.parse(knowledgeBase);
  
  // Extrahiere die Kategorienamen
  const categories = data.categories || [];
  return categories.map((cat: KnowledgeCategory) => cat.name);
} 