'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { useUserStore } from '../../lib/store/userStore';
import * as XLSX from 'xlsx';
import { FAQItem } from '../../lib/services/knowledgeStorage';
import * as knowledgeService from '../../lib/services/knowledgeService';

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
  const [newFaq, setNewFaq] = useState<Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>>({
    question: '',
    answer: '',
    category: ''
  });
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [editingFaq, setEditingFaq] = useState<Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>>({
    question: '',
    answer: '',
    category: ''
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMigrationMessage, setShowMigrationMessage] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false);
  const [showSkippedItems, setShowSkippedItems] = useState(false);
  const [skippedItems, setSkippedItems] = useState<Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>[]>([]);
  const [conflictItems, setConflictItems] = useState<{
    new: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>,
    existing: FAQItem,
    resolved: boolean,
    useNewAnswer: boolean
  }[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  // Funktion zum Laden der Daten
  async function loadData() {
    try {
      setIsLoading(true);
      // Daten aus der Datenbank laden
      const dbFaqs = await knowledgeService.getAllFAQs();
      
      // Prüfen, ob wir lokale Daten haben, die migriert werden müssen
      const savedFaqs = localStorage.getItem('wissensdatenbank_faqs');
      
      if (savedFaqs && dbFaqs.length === 0) {
        // Lokale Daten vorhanden und Datenbank ist leer
        setShowMigrationMessage(true);
      } else if (dbFaqs.length > 0) {
        // Daten aus der Datenbank setzen
        setFaqs(dbFaqs);
        setIsDatabaseEmpty(false);
      } else {
        // Keine Daten in der Datenbank
        setFaqs([]);
        setIsDatabaseEmpty(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  // Lade Daten aus der Datenbank beim ersten Rendern und migriere ggf. lokale Daten
  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);
  
  // Funktion zum manuellen Aktualisieren der Daten
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Funktion zur Migration lokaler Daten in die Datenbank
  const handleMigrateLocalData = async () => {
    try {
      setMigrationStatus('migrating');
      const savedFaqs = localStorage.getItem('wissensdatenbank_faqs');
      
      if (savedFaqs) {
        const localFaqs = JSON.parse(savedFaqs) as FAQItem[];
        const success = await knowledgeService.migrateFAQsFromLocalStorage(localFaqs);
        
        if (success) {
          // Nach erfolgreicher Migration Daten neu laden
          const dbFaqs = await knowledgeService.getAllFAQs();
          setFaqs(dbFaqs);
          // Lokale Daten löschen
          localStorage.removeItem('wissensdatenbank_faqs');
          setMigrationStatus('success');
        } else {
          setMigrationStatus('error');
        }
      }
    } catch (error) {
      console.error('Fehler bei der Migration der Daten:', error);
      setMigrationStatus('error');
    } finally {
      setTimeout(() => {
        setShowMigrationMessage(false);
      }, 5000);
    }
  };

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddFaq = async () => {
    if (!isAdmin) {
      alert('Nur Administratoren können neue FAQs hinzufügen.');
      return;
    }

    if (!newFaq.question || !newFaq.answer || !newFaq.category) return;
    
    const createdFaq = await knowledgeService.createFAQ(newFaq);
    
    if (createdFaq) {
      setFaqs([...faqs, createdFaq]);
      setNewFaq({ question: '', answer: '', category: '' });
      setShowAddForm(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!isAdmin) {
      alert('Nur Administratoren können FAQs löschen.');
      return;
    }

    const success = await knowledgeService.deleteFAQ(id);
    
    if (success) {
      const updatedFaqs = faqs.filter(faq => faq.id !== id);
      setFaqs(updatedFaqs);
    } else {
      alert('Fehler beim Löschen der FAQ.');
    }
  };

  const handleEditCategory = (oldCategory: string) => {
    if (!isAdmin) {
      alert('Nur Administratoren können Kategorien bearbeiten.');
      return;
    }

    setEditingCategory(oldCategory);
    setNewCategoryName(oldCategory);
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim() || !editingCategory) return;

    // Alle FAQs dieser Kategorie laden und aktualisieren
    const faqsToUpdate = faqs.filter(faq => faq.category === editingCategory);
    let allSuccess = true;
    
    for (const faq of faqsToUpdate) {
      const updated = await knowledgeService.updateFAQ(faq.id, {
        ...faq,
        category: newCategoryName
      });
      
      if (!updated) {
        allSuccess = false;
      }
    }
    
    if (allSuccess) {
      // Lokale Daten aktualisieren
      const updatedFaqs = faqs.map(faq => 
        faq.category === editingCategory 
          ? { ...faq, category: newCategoryName }
          : faq
      );
      
      setFaqs(updatedFaqs);
    } else {
      alert('Es gab Probleme beim Aktualisieren einiger FAQs.');
    }
    
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleAddCategory = async () => {
    if (!isAdmin) {
      alert('Nur Administratoren können neue Kategorien hinzufügen.');
      return;
    }

    if (!newCategoryName.trim()) return;
    
    if (categories.includes(newCategoryName)) {
      alert('Diese Kategorie existiert bereits.');
      return;
    }

    const newFaqItem = {
      question: 'Neue Frage',
      answer: 'Neue Antwort',
      category: newCategoryName
    };
    
    const createdFaq = await knowledgeService.createFAQ(newFaqItem);
    
    if (createdFaq) {
      setFaqs([...faqs, createdFaq]);
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
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
  
  const handleSaveFaq = async () => {
    if (!editingFaqId || !editingFaq.question || !editingFaq.answer || !editingFaq.category) return;
    
    const updatedFaq = await knowledgeService.updateFAQ(editingFaqId, editingFaq);
    
    if (updatedFaq) {
      const updatedFaqs = faqs.map(faq => 
        faq.id === editingFaqId 
          ? updatedFaq
          : faq
      );
      
      setFaqs(updatedFaqs);
      setEditingFaqId(null);
      setEditingFaq({
        question: '',
        answer: '',
        category: ''
      });
    } else {
      alert('Fehler beim Aktualisieren der FAQ.');
    }
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
  const confirmImport = async () => {
    if (importPreview.length === 0) return;
    
    let importedCount = 0;
    let skippedCount = 0;
    const skippedItems: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>[] = [];
    const newFaqs: FAQItem[] = [];
    const conflicts: {
      new: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>,
      existing: FAQItem,
      resolved: boolean,
      useNewAnswer: boolean
    }[] = [];
    
    // Importiere jedes FAQ-Item einzeln in die Datenbank
    for (const item of importPreview) {
      try {
        const response = await fetch('/api/knowledge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
        });
        
        const data = await response.json();
        
        if (data.success) {
          newFaqs.push(data.data);
          importedCount++;
        } else {
          if (data.isDuplicate) {
            if (data.answersAreDifferent) {
              // Bei unterschiedlichen Antworten zur Konfliktliste hinzufügen
              conflicts.push({
                new: item,
                existing: data.existingItem,
                resolved: false,
                useNewAnswer: false
              });
            } else {
              // Dies ist ein einfaches Duplikat, das wir überspringen
              skippedItems.push(item);
              skippedCount++;
            }
          } else {
            // Ein anderer Fehler ist aufgetreten
            console.error('Fehler beim Importieren:', data.message);
          }
        }
      } catch (error) {
        console.error('Fehler beim Importieren eines Items:', error);
      }
    }
    
    if (newFaqs.length > 0) {
      // Füge die neuen FAQs zum bestehenden Array hinzu
      setFaqs([...faqs, ...newFaqs]);
    }
    
    // Schließe das Import-Modal und setze die Vorschau zurück
    setShowImportModal(false);
    setImportPreview([]);
    
    // Reset das Datei-Input-Feld
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Wenn es Konflikte gibt, zeige das Konflikt-Modal
    if (conflicts.length > 0) {
      setConflictItems(conflicts);
      setCurrentConflictIndex(0);
      setShowConflictModal(true);
      return; // Noch nicht fertig mit dem Import
    }
    
    // Zeige Zusammenfassung der übersprungenen Einträge
    if (skippedCount > 0) {
      setShowSkippedItems(true);
      setSkippedItems(skippedItems);
    }
    
    // Zeige Erfolgs- oder Warnmeldung an
    if (skippedCount === 0) {
      alert(`${importedCount} Einträge wurden erfolgreich importiert.`);
    } else {
      alert(`${importedCount} Einträge wurden importiert. ${skippedCount} Einträge wurden übersprungen, da sie bereits existieren.`);
    }
  };

  // Funktion zum Auflösen des aktuellen Konflikts
  const resolveConflict = async (useNewAnswer: boolean) => {
    // Aktualisiere den Status des aktuellen Konfliktitems
    const updatedConflicts = [...conflictItems];
    updatedConflicts[currentConflictIndex].resolved = true;
    updatedConflicts[currentConflictIndex].useNewAnswer = useNewAnswer;
    setConflictItems(updatedConflicts);

    if (useNewAnswer) {
      // Wenn die neue Antwort verwendet werden soll, aktualisiere den Eintrag in der Datenbank
      const currentConflict = conflictItems[currentConflictIndex];
      const updatedFaq = await knowledgeService.updateFAQ(currentConflict.existing.id, {
        question: currentConflict.existing.question,
        category: currentConflict.existing.category,
        answer: currentConflict.new.answer
      });

      if (updatedFaq) {
        // Aktualisiere auch die lokale Faq-Liste
        const updatedFaqs = faqs.map(faq => 
          faq.id === currentConflict.existing.id ? updatedFaq : faq
        );
        setFaqs(updatedFaqs);
      }
    }

    // Zum nächsten Konflikt gehen oder Modal schließen wenn alle gelöst sind
    if (currentConflictIndex < conflictItems.length - 1) {
      setCurrentConflictIndex(prevIndex => prevIndex + 1);
    } else {
      finishImportAfterConflicts();
    }
  };

  // Funktion zum Abschließen des Imports nach der Auflösung aller Konflikte
  const finishImportAfterConflicts = () => {
    setShowConflictModal(false);
    
    // Zähle die gelösten Konflikte
    const resolvedCount = conflictItems.filter(item => item.resolved).length;
    const skippedCount = conflictItems.filter(item => item.resolved && !item.useNewAnswer).length;
    const updatedCount = conflictItems.filter(item => item.resolved && item.useNewAnswer).length;
    
    // Sammle die übersprungenen Items
    const skippedItems = conflictItems
      .filter(item => item.resolved && !item.useNewAnswer)
      .map(item => item.new);
    
    if (skippedItems.length > 0) {
      setSkippedItems(skippedItems);
      setShowSkippedItems(true);
    }
    
    // Zeige Zusammenfassung an
    alert(`Import abgeschlossen: ${resolvedCount} Konflikte gelöst, ${updatedCount} Einträge aktualisiert, ${skippedCount} Einträge übersprungen.`);
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

  // Neue Funktion zum Exportieren der aktuellen Daten als Excel
  const exportDataToExcel = () => {
    if (faqs.length === 0) {
      alert('Es sind keine Daten zum Exportieren vorhanden.');
      return;
    }
    
    // Konvertiere die FAQ-Daten in ein für Excel geeignetes Format
    const exportData = faqs.map(faq => ({
      Kategorie: faq.category,
      Frage: faq.question,
      Antwort: faq.answer
    }));
    
    // Erstelle ein Arbeitsblatt aus den Daten
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Erstelle ein Workbook und füge das Arbeitsblatt hinzu
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wissensdatenbank');
    
    // Exportiere die Excel-Datei mit Datum im Dateinamen
    const date = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    XLSX.writeFile(workbook, `Wissensdatenbank_Export_${date}.xlsx`);
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
  const confirmClearAll = async () => {
    let success = true;
    
    // Lösche jedes FAQ-Item einzeln
    for (const faq of faqs) {
      const deleted = await knowledgeService.deleteFAQ(faq.id);
      if (!deleted) {
        success = false;
      }
    }
    
    if (success) {
      setFaqs([]);
    } else {
      alert('Einige Einträge konnten nicht gelöscht werden.');
      // Lade die Daten neu, um den aktuellen Zustand der Datenbank zu erhalten
      const refreshedFaqs = await knowledgeService.getAllFAQs();
      setFaqs(refreshedFaqs);
    }
    
    setShowClearConfirmation(false);
  };

  // Zeige nur einen Ladeindikator, wenn die Komponente noch nicht gemounted ist oder Daten geladen werden
  if (!isMounted || isLoading) {
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
              {showMigrationMessage && (
                <div className={`mb-4 p-4 rounded-lg ${
                  migrationStatus === 'error' ? 'bg-red-50 text-red-800' : 
                  migrationStatus === 'success' ? 'bg-green-50 text-green-800' : 
                  'bg-blue-50 text-blue-800'
                }`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {migrationStatus === 'error' ? (
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : migrationStatus === 'success' ? (
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3 flex-1 md:flex md:justify-between">
                      <p className="text-sm">
                        {migrationStatus === 'error' ? 'Fehler bei der Migration der lokalen Daten in die Datenbank.' : 
                         migrationStatus === 'success' ? 'Die lokalen Daten wurden erfolgreich in die Datenbank migriert.' : 
                         migrationStatus === 'migrating' ? 'Migration läuft...' :
                         'Es wurden lokale Daten gefunden. Möchten Sie diese in die Datenbank übertragen?'}
                      </p>
                      {migrationStatus === 'idle' && (
                        <div className="mt-3 flex md:mt-0 md:ml-6">
                          <button
                            onClick={handleMigrateLocalData}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 whitespace-nowrap"
                          >
                            Jetzt migrieren
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">Wissensdatenbank</h1>
                  <p className="text-sm text-gray-500">Finden Sie Antworten auf häufig gestellte Fragen</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className={`p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Aktualisieren"
                    disabled={isRefreshing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={exportDataToExcel}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium"
                      >
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Daten exportieren
                        </span>
                      </button>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-3">Excel-Import Vorschau</h3>
                    
                    <div className="overflow-auto flex-1 mb-4">
                      <p className="mb-2 text-sm text-gray-700">
                        {importPreview.length} Einträge zum Importieren gefunden. Bitte überprüfen Sie die Daten vor dem Import.
                      </p>
                      
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="p-2 text-left font-bold text-gray-900 border border-gray-300">Kategorie</th>
                            <th className="p-2 text-left font-bold text-gray-900 border border-gray-300">Frage</th>
                            <th className="p-2 text-left font-bold text-gray-900 border border-gray-300">Antwort</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="p-2 border border-gray-300 text-gray-800">{item.category}</td>
                              <td className="p-2 border border-gray-300 text-gray-800">{item.question}</td>
                              <td className="p-2 border border-gray-300 text-gray-800">{item.answer}</td>
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
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map(faq => (
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
                  ))
                ) : (
                  <div className="p-8 bg-gray-50 rounded-lg text-center">
                    {searchQuery || selectedCategory ? (
                      <p className="text-gray-600">Keine FAQ-Einträge gefunden, die den Suchkriterien entsprechen.</p>
                    ) : isDatabaseEmpty ? (
                      <div>
                        <p className="text-gray-600 mb-4">Die Wissensdatenbank ist leer.</p>
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
                          >
                            Erste FAQ hinzufügen
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">Keine FAQ-Einträge gefunden.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal für die Anzeige der übersprungenen Einträge */}
              {showSkippedItems && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="text-xl font-bold text-gray-900">Übersprungene Einträge</h3>
                      <button 
                        onClick={() => setShowSkippedItems(false)} 
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="overflow-auto flex-1 mb-4">
                      <p className="mb-2 text-sm text-gray-700">
                        Die folgenden {skippedItems.length} Einträge wurden nicht importiert, da sie Duplikate darstellen:
                      </p>
                      
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="p-2 text-left font-bold text-gray-900 border border-gray-300">Kategorie</th>
                            <th className="p-2 text-left font-bold text-gray-900 border border-gray-300">Frage</th>
                            <th className="p-2 text-left font-bold text-gray-900 border border-gray-300">Antwort</th>
                          </tr>
                        </thead>
                        <tbody>
                          {skippedItems.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="p-2 border border-gray-300 text-gray-800">{item.category}</td>
                              <td className="p-2 border border-gray-300 text-gray-800">{item.question}</td>
                              <td className="p-2 border border-gray-300 text-gray-800">{item.answer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowSkippedItems(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
                      >
                        Schließen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Neues Modal für Konflikte bei Fragen mit unterschiedlichen Antworten */}
              {showConflictModal && conflictItems.length > 0 && currentConflictIndex < conflictItems.length && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="text-xl font-bold text-gray-900">Konflikt bei Import</h3>
                      <div className="text-sm text-gray-600">
                        {currentConflictIndex + 1} von {conflictItems.length}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-800 mb-2">
                        Die folgende Frage existiert bereits, hat aber eine andere Antwort. 
                        Welche Version möchten Sie verwenden?
                      </p>
                      <div className="bg-gray-100 p-3 rounded mb-2">
                        <p className="font-medium text-gray-800">Frage:</p>
                        <p className="text-gray-700">{conflictItems[currentConflictIndex].new.question}</p>
                      </div>
                      <div className="bg-gray-100 p-3 rounded mb-2">
                        <p className="font-medium text-gray-800">Kategorie:</p>
                        <p className="text-gray-700">{conflictItems[currentConflictIndex].new.category}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="border p-4 rounded-lg bg-white">
                        <h4 className="font-medium text-gray-900 mb-2">Bestehende Antwort:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {conflictItems[currentConflictIndex].existing.answer}
                        </p>
                      </div>
                      <div className="border p-4 rounded-lg bg-white">
                        <h4 className="font-medium text-gray-900 mb-2">Neue Antwort:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {conflictItems[currentConflictIndex].new.answer}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => resolveConflict(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
                      >
                        Bestehende Antwort behalten
                      </button>
                      <button
                        onClick={() => resolveConflict(true)}
                        className="px-4 py-2 bg-[#2c2c2c] text-white rounded hover:bg-[#1a1a1a] focus:outline-none"
                      >
                        Neue Antwort verwenden
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 