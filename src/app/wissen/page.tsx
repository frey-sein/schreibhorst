'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { useUserStore } from '../../lib/store/userStore';
import * as XLSX from 'xlsx';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export default function WissenPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { getCurrentUser } = useUserStore();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
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
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [editingFaq, setEditingFaq] = useState<Omit<FAQItem, 'id'>>({
    question: '',
    answer: '',
    category: ''
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<FAQItem, 'id'>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  // Initialisiere FAQ-Daten mit Beispieldaten oder lade sie aus dem localStorage
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Lade Daten aus dem localStorage beim ersten Rendern
  useEffect(() => {
    setIsMounted(true);
    
    try {
      const savedFaqs = localStorage.getItem('wissensdatenbank_faqs');
      if (savedFaqs) {
        setFaqs(JSON.parse(savedFaqs));
      } else {
        // Verwende Beispieldaten beim ersten Besuch
        const initialFaqs: FAQItem[] = [
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
        ];
        setFaqs(initialFaqs);
        localStorage.setItem('wissensdatenbank_faqs', JSON.stringify(initialFaqs));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten aus dem localStorage:', error);
    }
  }, []);

  // Speichere Daten im localStorage bei jeder Änderung
  useEffect(() => {
    if (isMounted && faqs.length > 0) {
      try {
        localStorage.setItem('wissensdatenbank_faqs', JSON.stringify(faqs));
      } catch (error) {
        console.error('Fehler beim Speichern der Daten im localStorage:', error);
      }
    }
  }, [faqs, isMounted]);

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddFaq = () => {
    if (!isAdmin) {
      alert('Nur Administratoren können neue FAQs hinzufügen.');
      return;
    }

    if (!newFaq.question || !newFaq.answer || !newFaq.category) return;
    
    const newId = Math.max(...faqs.map(faq => faq.id), 0) + 1;
    const updatedFaqs = [...faqs, { ...newFaq, id: newId }];
    setFaqs(updatedFaqs);
    setNewFaq({ question: '', answer: '', category: '' });
    setShowAddForm(false);
  };

  const handleDeleteFaq = (id: number) => {
    if (!isAdmin) {
      alert('Nur Administratoren können FAQs löschen.');
      return;
    }

    const updatedFaqs = faqs.filter(faq => faq.id !== id);
    setFaqs(updatedFaqs);
  };

  const handleEditCategory = (oldCategory: string) => {
    if (!isAdmin) {
      alert('Nur Administratoren können Kategorien bearbeiten.');
      return;
    }

    setEditingCategory(oldCategory);
    setNewCategoryName(oldCategory);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return;

    // Aktualisiere die Kategorie in allen FAQs
    const updatedFaqs = faqs.map(faq => 
      faq.category === editingCategory 
        ? { ...faq, category: newCategoryName }
        : faq
    );
    
    setFaqs(updatedFaqs);
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleAddCategory = () => {
    if (!isAdmin) {
      alert('Nur Administratoren können neue Kategorien hinzufügen.');
      return;
    }

    if (!newCategoryName.trim()) return;
    
    if (categories.includes(newCategoryName)) {
      alert('Diese Kategorie existiert bereits.');
      return;
    }

    const newId = Math.max(...faqs.map(faq => faq.id), 0) + 1;
    const updatedFaqs = [...faqs, {
      id: newId,
      question: 'Neue Frage',
      answer: 'Neue Antwort',
      category: newCategoryName
    }];
    
    setFaqs(updatedFaqs);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleEditFaq = (faq: FAQItem) => {
    if (!isAdmin) {
      alert('Nur Administratoren können FAQs bearbeiten.');
      return;
    }
    
    setEditingFaqId(faq.id);
    setEditingFaq({
      question: faq.question,
      answer: faq.answer,
      category: faq.category
    });
  };
  
  const handleSaveFaq = () => {
    if (!editingFaqId || !editingFaq.question || !editingFaq.answer || !editingFaq.category) return;
    
    const updatedFaqs = faqs.map(faq => 
      faq.id === editingFaqId 
        ? { ...faq, ...editingFaq }
        : faq
    );
    
    setFaqs(updatedFaqs);
    setEditingFaqId(null);
    setEditingFaq({
      question: '',
      answer: '',
      category: ''
    });
  };
  
  const handleCancelEditFaq = () => {
    setEditingFaqId(null);
    setEditingFaq({
      question: '',
      answer: '',
      category: ''
    });
  };

  // Funktion zum Importieren von Excel-Dateien
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Nimm das erste Arbeitsblatt
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Konvertiere das Arbeitsblatt in ein Array von Objekten
        const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet);
        
        // Überprüfe, ob die Daten die erforderlichen Spalten haben
        if (jsonData.length > 0) {
          const firstRow = jsonData[0];
          
          // Prüfe, ob die benötigten Spalten vorhanden sind
          // Unterstütze sowohl deutsche als auch englische Spaltenbezeichnungen
          const hasCategory = 'Kategorie' in firstRow || 'Category' in firstRow || 'category' in firstRow;
          const hasQuestion = 'Frage' in firstRow || 'Question' in firstRow || 'question' in firstRow;
          const hasAnswer = 'Antwort' in firstRow || 'Answer' in firstRow || 'answer' in firstRow;
          
          if (!hasCategory || !hasQuestion || !hasAnswer) {
            setImportError('Die Excel-Datei muss Spalten für "Kategorie/Category", "Frage/Question" und "Antwort/Answer" enthalten.');
            return;
          }
          
          // Konvertiere die Daten in das FAQItem-Format
          const convertedData = jsonData.map(row => {
            // Ermittle die tatsächlichen Spaltennamen
            const categoryKey = Object.keys(row).find(key => 
              key.toLowerCase() === 'kategorie' || key.toLowerCase() === 'category') || '';
            const questionKey = Object.keys(row).find(key => 
              key.toLowerCase() === 'frage' || key.toLowerCase() === 'question') || '';
            const answerKey = Object.keys(row).find(key => 
              key.toLowerCase() === 'antwort' || key.toLowerCase() === 'answer') || '';
            
            return {
              category: String(row[categoryKey] || ''),
              question: String(row[questionKey] || ''),
              answer: String(row[answerKey] || '')
            };
          }).filter(item => item.category && item.question && item.answer);
          
          if (convertedData.length === 0) {
            setImportError('Keine gültigen Daten in der Excel-Datei gefunden.');
            return;
          }
          
          // Zeige eine Vorschau der zu importierenden Daten
          setImportPreview(convertedData);
          setShowImportModal(true);
        } else {
          setImportError('Die Excel-Datei enthält keine Daten.');
        }
      } catch (error) {
        console.error('Fehler beim Parsen der Excel-Datei:', error);
        setImportError('Die Datei konnte nicht verarbeitet werden. Bitte stellen Sie sicher, dass es sich um eine gültige Excel-Datei handelt.');
      }
    };
    
    reader.onerror = () => {
      setImportError('Fehler beim Lesen der Datei.');
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Funktion zum tatsächlichen Import der Daten
  const confirmImport = () => {
    if (importPreview.length === 0) return;
    
    // Generiere neue IDs für die importierten FAQs
    const lastId = Math.max(...faqs.map(faq => faq.id), 0);
    const newFaqs = importPreview.map((item, index) => ({
      ...item,
      id: lastId + index + 1
    }));
    
    // Füge die neuen FAQs zum bestehenden Array hinzu
    const updatedFaqs = [...faqs, ...newFaqs];
    setFaqs(updatedFaqs);
    
    // Schließe das Modal und setze die Vorschau zurück
    setShowImportModal(false);
    setImportPreview([]);
    
    // Reset das Datei-Input-Feld
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Funktion zum Erstellen einer Beispiel-Excel-Datei zum Download
  const createExampleExcel = () => {
    // Erstelle einen Beispiel-Datensatz
    const exampleData = [
      { Kategorie: 'Grundlagen', Frage: 'Beispielfrage 1', Antwort: 'Beispielantwort 1' },
      { Kategorie: 'Funktionen', Frage: 'Beispielfrage 2', Antwort: 'Beispielantwort 2' },
      { Kategorie: 'Datenschutz', Frage: 'Beispielfrage 3', Antwort: 'Beispielantwort 3' }
    ];
    
    // Erstelle ein Arbeitsblatt aus den Daten
    const worksheet = XLSX.utils.json_to_sheet(exampleData);
    
    // Erstelle ein Workbook und füge das Arbeitsblatt hinzu
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wissensdatenbank');
    
    // Exportiere die Excel-Datei
    XLSX.writeFile(workbook, 'Wissensdatenbank_Vorlage.xlsx');
  };

  // Funktion zum Leeren aller FAQs
  const clearAllFaqs = () => {
    if (!isAdmin) {
      alert('Nur Administratoren können die Wissensdatenbank leeren.');
      return;
    }
    
    setShowClearConfirmation(true);
  };
  
  // Funktion zum Bestätigen des Löschens aller FAQs
  const confirmClearAll = () => {
    setFaqs([]);
    setShowClearConfirmation(false);
    
    // Optional: Füge eine Basiskategorie hinzu, damit die Datenbank nicht komplett leer ist
    // Entferne diese Zeilen, falls die Datenbank vollständig leer sein soll
    /*
    const emptyFaq: FAQItem = {
      id: 1,
      question: 'Beispielfrage',
      answer: 'Beispielantwort',
      category: 'Allgemein'
    };
    setFaqs([emptyFaq]);
    */
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Zeige nur einen Ladeindikator, wenn die Komponente noch nicht gemounted ist
  if (!isMounted) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#f4f4f4] pt-24">
          <main>
            <div className="max-w-[2000px] mx-auto px-6 py-8">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex justify-center items-center">
                <p className="text-gray-500">Lade Wissensdatenbank...</p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }
  
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
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                    >
                      Excel importieren
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx,.xls"
                      className="hidden"
                    />
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                    >
                      Neue FAQ hinzufügen
                    </button>
                  </div>
                )}
              </div>

              {/* Bestätigungsdialog für das Leeren der Datenbank */}
              {showClearConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                    <h3 className="text-lg font-semibold mb-2 text-red-600">Wissensdatenbank leeren</h3>
                    <p className="mb-4 text-gray-700">
                      Sind Sie sicher, dass Sie alle Einträge aus der Wissensdatenbank löschen möchten? 
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowClearConfirmation(false)}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={confirmClearAll}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Ja, alles löschen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Import-Vorschau-Modal */}
              {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] shadow-xl overflow-hidden flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Excel-Import Vorschau</h3>
                    
                    <div className="overflow-auto flex-1 mb-4">
                      <p className="mb-2 text-sm text-gray-500">
                        {importPreview.length} Einträge zum Importieren gefunden. Bitte überprüfen Sie die Daten vor dem Import.
                      </p>
                      
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-2 text-left font-medium text-gray-700 border border-gray-200">Kategorie</th>
                            <th className="p-2 text-left font-medium text-gray-700 border border-gray-200">Frage</th>
                            <th className="p-2 text-left font-medium text-gray-700 border border-gray-200">Antwort</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="p-2 border border-gray-200">{item.category}</td>
                              <td className="p-2 border border-gray-200">{item.question}</td>
                              <td className="p-2 border border-gray-200">{item.answer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowImportModal(false);
                          setImportPreview([]);
                        }}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={confirmImport}
                        className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20"
                      >
                        Importieren
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Fehler-Modal */}
              {importError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                    <h3 className="text-lg font-semibold mb-2 text-red-600">Fehler beim Import</h3>
                    <p className="mb-4 text-gray-700">{importError}</p>
                    
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={createExampleExcel}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none"
                      >
                        Beispiel-Excel herunterladen
                      </button>
                      
                      <button
                        onClick={() => setImportError(null)}
                        className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none"
                      >
                        Schließen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Formular zum Hinzufügen einer neuen FAQ */}
              {showAddForm && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Neue FAQ hinzufügen</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frage</label>
                      <input
                        type="text"
                        value={newFaq.question}
                        onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                        placeholder="Geben Sie die Frage ein"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Antwort</label>
                      <textarea
                        value={newFaq.answer}
                        onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                        rows={3}
                        placeholder="Geben Sie die Antwort ein"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                      <div className="flex gap-2">
                        <select
                          value={newFaq.category}
                          onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                        >
                          <option value="">Kategorie auswählen</option>
                          {categories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                          {!categories.includes(newFaq.category) && newFaq.category && (
                            <option value={newFaq.category}>{newFaq.category}</option>
                          )}
                        </select>
                        <input
                          type="text"
                          value={newFaq.category}
                          onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                          placeholder="Oder neue Kategorie eingeben"
                        />
                      </div>
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
                      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-2 py-1 shadow-sm">
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
                            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                            title="Speichern"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
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
                        {isAdmin && (
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                            title="Kategorie bearbeiten"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                
                {isAdmin && (
                  isAddingCategory ? (
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-2 py-1 shadow-sm">
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
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                          title="Kategorie hinzufügen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelAddCategory}
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
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
                  )
                )}
              </div>

              {/* FAQ Liste */}
              <div className="space-y-4">
                {filteredFaqs.map(faq => (
                  <div
                    key={faq.id}
                    className="border border-gray-100 rounded-lg overflow-hidden"
                  >
                    {editingFaqId === faq.id ? (
                      // Bearbeitungsformular
                      <div className="p-4 bg-gray-100">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">FAQ bearbeiten</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frage</label>
                            <input
                              type="text"
                              value={editingFaq.question}
                              onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                              placeholder="Geben Sie die Frage ein"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Antwort</label>
                            <textarea
                              value={editingFaq.answer}
                              onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                              rows={3}
                              placeholder="Geben Sie die Antwort ein"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                            <div className="flex gap-2">
                              <select
                                value={editingFaq.category}
                                onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                                className="flex-1 px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                              >
                                {categories.map(category => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                                {!categories.includes(editingFaq.category) && editingFaq.category && (
                                  <option value={editingFaq.category}>{editingFaq.category}</option>
                                )}
                              </select>
                              <input
                                type="text"
                                value={editingFaq.category}
                                onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                                className="flex-1 px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 focus:border-[#2c2c2c] text-gray-900"
                                placeholder="Oder neue Kategorie eingeben"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleCancelEditFaq}
                              className="px-4 py-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                            >
                              Abbrechen
                            </button>
                            <button
                              onClick={handleSaveFaq}
                              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20"
                            >
                              Speichern
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
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
                          {isAdmin && (
                            <div className="flex">
                              <button
                                onClick={() => handleEditFaq(faq)}
                                className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                title="FAQ bearbeiten"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteFaq(faq.id)}
                                className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                title="FAQ löschen"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {expandedId === faq.id && (
                          <div className="px-4 py-3 bg-gray-100 border-t border-gray-300">
                            <p className="text-gray-800">{faq.answer}</p>
                            <div className="mt-2 text-sm text-gray-600">
                              Kategorie: {faq.category}
                            </div>
                          </div>
                        )}
                      </>
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