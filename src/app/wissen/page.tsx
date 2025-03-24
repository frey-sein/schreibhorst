'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export default function WissenPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newFaq, setNewFaq] = useState<Omit<FAQItem, 'id'>>({
    question: '',
    answer: '',
    category: ''
  });

  // FAQ-Daten in State verwalten
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      id: 1,
      question: "Wie funktioniert der KI-Schreibassistent?",
      answer: "Der KI-Schreibassistent nutzt fortschrittliche Sprachmodelle, um Ihnen beim Schreiben zu helfen. Sie können mit ihm in natürlicher Sprache kommunizieren und erhalten Vorschläge, Anregungen und Verbesserungen für Ihre Texte.",
      category: "Grundlagen"
    },
    {
      id: 2,
      question: "Welche Arten von Texten kann ich erstellen?",
      answer: "Sie können verschiedene Arten von Texten erstellen, darunter Blogbeiträge, Social Media Posts, Produktbeschreibungen, Geschichten und mehr. Der Assistent passt sich an Ihre spezifischen Bedürfnisse an.",
      category: "Funktionen"
    },
    {
      id: 3,
      question: "Wie sicher sind meine Daten?",
      answer: "Ihre Daten werden mit höchsten Sicherheitsstandards geschützt. Alle Informationen werden verschlüsselt übertragen und sicher gespeichert. Wir geben keine Daten an Dritte weiter.",
      category: "Datenschutz"
    }
  ]);

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddFaq = () => {
    if (!newFaq.question || !newFaq.answer || !newFaq.category) return;
    
    const newId = Math.max(...faqs.map(faq => faq.id), 0) + 1;
    setFaqs([...faqs, { ...newFaq, id: newId }]);
    setNewFaq({ question: '', answer: '', category: '' });
    setShowAddForm(false);
  };

  const handleDeleteFaq = (id: number) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
  };

  const handleEditCategory = (oldCategory: string) => {
    setEditingCategory(oldCategory);
    setNewCategoryName(oldCategory);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return;

    // Aktualisiere die Kategorie in allen FAQs
    setFaqs(faqs.map(faq => 
      faq.category === editingCategory 
        ? { ...faq, category: newCategoryName }
        : faq
    ));

    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    // Prüfe, ob die Kategorie bereits existiert
    if (categories.includes(newCategoryName)) {
      alert('Diese Kategorie existiert bereits.');
      return;
    }

    // Füge eine leere FAQ mit der neuen Kategorie hinzu
    const newId = Math.max(...faqs.map(faq => faq.id), 0) + 1;
    setFaqs([...faqs, {
      id: newId,
      question: 'Neue Frage',
      answer: 'Neue Antwort',
      category: newCategoryName
    }]);

    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f4f4f4] pt-24">
        <main>
          <div className="max-w-[2000px] mx-auto px-6 py-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">Wissensdatenbank</h1>
                  <p className="text-sm text-gray-500">Finden Sie Antworten auf häufig gestellte Fragen</p>
                </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                >
                  Neue FAQ hinzufügen
                </button>
              </div>

              {/* Formular zum Hinzufügen einer neuen FAQ */}
              {showAddForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Neue FAQ hinzufügen</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frage</label>
                      <input
                        type="text"
                        value={newFaq.question}
                        onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                        placeholder="Geben Sie die Frage ein"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Antwort</label>
                      <textarea
                        value={newFaq.answer}
                        onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                        rows={3}
                        placeholder="Geben Sie die Antwort ein"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                      <input
                        type="text"
                        value={newFaq.category}
                        onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                        placeholder="Geben Sie die Kategorie ein"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleAddFaq}
                        className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20"
                      >
                        Hinzufügen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Suchleiste */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Suchen Sie nach Antworten..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm text-gray-900"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Kategorien */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <div key={category} className="flex items-center gap-2">
                    {editingCategory === category ? (
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="px-2 py-1 text-sm border-none focus:outline-none focus:ring-0 text-gray-900 bg-transparent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategory();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleSaveCategory}
                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                            title="Speichern"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                            title="Abbrechen"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                            selectedCategory === category
                              ? 'bg-[#2c2c2c] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {category}
                        </button>
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                          title="Kategorie bearbeiten"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
                
                {isAddingCategory ? (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="px-2 py-1 text-sm border-none focus:outline-none focus:ring-0 text-gray-900 bg-transparent"
                      placeholder="Neue Kategorie"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                        if (e.key === 'Escape') handleCancelAddCategory();
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleAddCategory}
                        className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                        title="Kategorie hinzufügen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelAddCategory}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        title="Abbrechen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Neue Kategorie hinzufügen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {/* FAQ Liste */}
              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border border-gray-100 rounded-lg overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                        className="flex-1 px-4 py-3 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-5 w-5 text-gray-500 transform transition-transform ${
                            expandedId === faq.id ? 'rotate-180' : ''
                          }`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="px-4 py-3 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {expandedId === faq.id && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 