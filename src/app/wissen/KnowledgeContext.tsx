'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
}

interface KnowledgeContextType {
  categories: KnowledgeCategory[];
  updateCategories: (newCategories: KnowledgeCategory[]) => void;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge muss innerhalb eines KnowledgeProvider verwendet werden');
  }
  return context;
}

interface KnowledgeProviderProps {
  children: ReactNode;
}

export function KnowledgeProvider({ children }: KnowledgeProviderProps) {
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);

  useEffect(() => {
    // Lade die Kategorien beim Start
    const storedKnowledge = localStorage.getItem('knowledgeBase');
    if (storedKnowledge) {
      try {
        const parsedKnowledge = JSON.parse(storedKnowledge);
        setCategories(parsedKnowledge.categories || []);
      } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error);
      }
    }
  }, []);

  const updateCategories = (newCategories: KnowledgeCategory[]) => {
    setCategories(newCategories);
    localStorage.setItem('knowledgeBase', JSON.stringify({ categories: newCategories }));
  };

  return (
    <KnowledgeContext.Provider value={{ categories, updateCategories }}>
      {children}
    </KnowledgeContext.Provider>
  );
} 