import React, { useState, useEffect, useRef } from 'react';
import { CircularProgress, Snackbar, Alert } from '@mui/material';
import { availableTextModels } from '@/lib/services/textGenerator';
import { useStageStore } from '@/lib/store/stageStore';
import { BlogPostDraft } from '@/types/stage';
import { ChevronDownIcon, SparklesIcon, ClockIcon, DocumentDuplicateIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline';

// Schnittstelle für Schreibstile aus dem localStorage
interface Stil {
  id: string;
  name: string;
  beschreibung: string;
  tags: string[];
  avatar?: string;
  prompt: string;
  beispiel?: string;
  erstellt: string;
  bearbeitet?: string;
}

// Hilfsfunktion zum Laden der Schreibstile
const loadStile = (): Stil[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('schreibstile');
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error('Fehler beim Laden der Schreibstile:', error);
    return [];
  }
};

interface TextGeneratorPanelProps {
  className?: string;
}

const TextGeneratorPanel: React.FC<TextGeneratorPanelProps> = ({ className }) => {
  const { blogPostDraft, setBlogPostDraft, selectedTextModel, setSelectedTextModel } = useStageStore();
  
  const [prompt, setPrompt] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(selectedTextModel);
  const [error, setError] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [schreibstile, setSchreibstile] = useState<Stil[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<Stil | null>(null);
  
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const styleSelectorRef = useRef<HTMLDivElement>(null);

  // Lade Schreibstile
  useEffect(() => {
    const stile = loadStile();
    setSchreibstile(stile);
  }, []);

  // Lade gespeicherte Daten, wenn sie verfügbar sind
  useEffect(() => {
    if (blogPostDraft) {
      setPrompt(blogPostDraft.prompt);
      setGeneratedHtml(blogPostDraft.htmlContent || '');
      setMetaTitle(blogPostDraft.metaTitle || '');
      setMetaDescription(blogPostDraft.metaDescription || '');
      setSelectedModel(blogPostDraft.modelId || selectedTextModel);
    }
  }, [blogPostDraft, selectedTextModel]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
      if (styleSelectorRef.current && !styleSelectorRef.current.contains(event.target as Node)) {
        setStyleDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelSelectorRef, styleSelectorRef]);

  // Funktion zum Anwenden des ausgewählten Schreibstils
  const applySelectedStyle = (stil: Stil) => {
    // Wenn bereits ein Stil ausgewählt war, dessen Inhalt aus dem Prompt entfernen
    let cleanedPrompt = prompt;
    if (selectedStyle) {
      // Entferne den alten Schreibstil-Prompt + Leerzeilen am Anfang
      cleanedPrompt = prompt.replace(selectedStyle.prompt, '').trimStart();
      // Entferne zusätzliche Leerzeilen am Anfang
      while (cleanedPrompt.startsWith('\n')) {
        cleanedPrompt = cleanedPrompt.substring(1).trimStart();
      }
    }
    
    // Neuen Stil setzen
    setSelectedStyle(stil);
    setStyleDropdownOpen(false);
    
    // Den Schreibstil am Anfang des Prompts hinzufügen
    const stylePart = `${stil.prompt}\n\n`;
    setPrompt(stylePart + cleanedPrompt);
  };

  // Funktion zum Zurücksetzen des ausgewählten Schreibstils
  const resetSelectedStyle = () => {
    setSelectedStyle(null);
  };

  const handleGenerateText = async () => {
    if (!prompt.trim()) {
      setError('Bitte gib einen Prompt ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Erweitere den Prompt mit dem ausgewählten Schreibstil, falls vorhanden
    let enhancedPrompt = prompt;
    if (selectedStyle && !prompt.includes(selectedStyle.prompt)) {
      enhancedPrompt = `${prompt}\n\nVerwende folgenden Schreibstil: ${selectedStyle.prompt}`;
    }

    try {
      const response = await fetch('/api/generateText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          modelId: selectedModel
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Fehler bei der Textgenerierung');
      }
      
      const htmlContent = data.htmlContent || '';
      const newMetaTitle = data.metaTitle || '';
      const newMetaDescription = data.metaDescription || '';

      // Setze die Werte im lokalen State
      setGeneratedHtml(htmlContent);
      setMetaTitle(newMetaTitle);
      setMetaDescription(newMetaDescription);

      // Speichere im Store für Persistenz
      const newBlogPostDraft: BlogPostDraft = {
        prompt: enhancedPrompt,
        htmlContent,
        metaTitle: newMetaTitle,
        metaDescription: newMetaDescription,
        modelId: selectedModel,
        createdAt: new Date(),
        // Speichere auch die Stil-ID des verwendeten Schreibstils
        styleId: selectedStyle?.id
      };
      
      setBlogPostDraft(newBlogPostDraft);
    } catch (error) {
      console.error('Fehler beim Generieren des Textes:', error);
      setError(`Fehler: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    // Wenn es sich um ein vollständiges HTML-Dokument handelt,
    // extrahiere nur den Inhalt innerhalb des article-Tags oder body-Tags
    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      // Versuche zuerst, den Inhalt des article-Tags zu extrahieren
      const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch && articleMatch[1]) {
        navigator.clipboard.writeText(articleMatch[1].trim());
        setSnackbarMessage('Artikel-Inhalt wurde in die Zwischenablage kopiert');
        setSnackbarOpen(true);
        return;
      }
      
      // Alternativ den Inhalt des body-Tags extrahieren
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        navigator.clipboard.writeText(bodyMatch[1].trim());
        setSnackbarMessage('Inhalt wurde in die Zwischenablage kopiert');
        setSnackbarOpen(true);
        return;
      }
    }
    
    // Fallback auf den ursprünglichen Text, wenn keine Tags gefunden wurden
    navigator.clipboard.writeText(text);
    setSnackbarMessage('Text wurde in die Zwischenablage kopiert');
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <div className={className}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Blogbeitrag erstellen</h3>
          
          {/* Buttons für Modellauswahl und Verlauf */}
          <div className="flex items-center space-x-3">
            {/* Verlaufsbutton */}
            <button
              onClick={() => alert("Verlaufsfunktion wird bald implementiert!")}
              className="p-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all border border-gray-200 shadow-sm"
              title="Verlauf anzeigen"
            >
              <ClockIcon className="w-4 h-4" />
            </button>
            
            {/* Kompakter Modellumschalter */}
            <div className="relative" ref={modelSelectorRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                title="Modell wechseln"
              >
                <SparklesIcon className="h-4 w-4 text-gray-500" />
                <span className="truncate max-w-[120px]">
                  {availableTextModels.find(m => m.id === selectedModel)?.name || selectedModel.split('/')[1]}
                </span>
                <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
              </button>
              
              {modelDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                  <div className="p-3">
                    <div className="text-xs font-medium text-gray-500 mb-2 px-3">
                      KI-Modell wählen
                    </div>
                    {availableTextModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setSelectedTextModel(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2.5 mb-1 ${
                          selectedModel === model.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <SparklesIcon 
                          className={`h-4 w-4 ${
                            selectedModel === model.id
                              ? 'text-gray-800'
                              : 'text-gray-400'
                          }`} 
                        />
                        <div>
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-gray-500">{model.provider}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Schreibstil-Auswahl */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Schreibstil auswählen (optional)</p>
            {selectedStyle && (
              <button
                onClick={resetSelectedStyle}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          
          <div className="relative" ref={styleSelectorRef}>
            <button
              onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-lg text-left ${
                selectedStyle 
                  ? 'border-[#2c2c2c] text-gray-900' 
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {selectedStyle ? (
                  <>
                    {selectedStyle.avatar ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                        <img 
                          src={selectedStyle.avatar} 
                          alt={selectedStyle.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 flex-shrink-0">
                        <PencilIcon className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{selectedStyle.name}</div>
                      <div className="text-sm text-gray-500 max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{selectedStyle.beschreibung}</div>
                    </div>
                  </>
                ) : (
                  <span>Schreibstil auswählen...</span>
                )}
              </div>
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            </button>
            
            {styleDropdownOpen && (
              <div className="absolute w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-10 max-h-[300px] overflow-y-auto">
                <div className="p-3">
                  {schreibstile.length > 0 ? (
                    schreibstile.map((stil) => (
                      <button
                        key={stil.id}
                        onClick={() => applySelectedStyle(stil)}
                        className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3 mb-1"
                      >
                        {stil.avatar ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                            <img 
                              src={stil.avatar} 
                              alt={stil.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 flex-shrink-0">
                            <PencilIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-base text-gray-900">{stil.name}</div>
                          <div className="text-sm text-gray-700 max-w-[400px] overflow-hidden text-ellipsis whitespace-nowrap">{stil.beschreibung}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 p-3 text-center">
                      Keine Schreibstile verfügbar. Sie können Stile im Bereich "Stile" erstellen.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {selectedStyle && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-1">Ausgewählter Stil wird angewendet:</div>
              <div className="text-sm text-gray-600 line-clamp-2">{selectedStyle.prompt}</div>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5 shadow-sm">
            <textarea
              className="w-full p-5 min-h-[180px] text-gray-800 focus:outline-none resize-none"
              placeholder="Beschreibe den gewünschten Blogbeitrag. Je detaillierter der Prompt, desto besser das Ergebnis..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={handleGenerateText}
              disabled={isLoading || !prompt.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-white transition-all text-sm font-medium ${
                isLoading || !prompt.trim() 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-[#2c2c2c] hover:bg-[#1a1a1a]'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>Generiere...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Blogbeitrag erstellen</span>
                </>
              )}
            </button>
            
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {(metaTitle || generatedHtml) && !isLoading && (
        <div className="space-y-8">
          {metaTitle && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4">Meta-Informationen</h4>
              
              <div className="mb-5">
                <div className="text-sm text-gray-700 mb-2 flex justify-between">
                  <span>Meta-Titel</span>
                  <span className={`${metaTitle.length > 55 ? 'text-red-500' : 'text-gray-500'}`}>
                    {metaTitle.length}/55
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-800">
                    {metaTitle}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(metaTitle)}
                    className="p-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all border border-gray-200"
                    title="Kopieren"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-700 mb-2 flex justify-between">
                  <span>Meta-Beschreibung</span>
                  <span className={`${metaDescription.length > 160 ? 'text-red-500' : 'text-gray-500'}`}>
                    {metaDescription.length}/160
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm max-h-32 overflow-y-auto text-gray-800">
                    {metaDescription}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(metaDescription)}
                    className="p-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all border border-gray-200"
                    title="Kopieren"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {generatedHtml && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">Generierter Blogbeitrag</h4>
                <button 
                  onClick={() => copyToClipboard(generatedHtml)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>HTML kopieren</span>
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 overflow-y-auto max-h-[500px]">
                <style>
                  {`
                  .blog-preview h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin-bottom: 1rem;
                    margin-top: 0;
                    line-height: 1.2;
                  }
                  .blog-preview h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #2c2c2c;
                    margin-bottom: 0.75rem;
                    margin-top: 1.5rem;
                    line-height: 1.3;
                  }
                  .blog-preview h3 {
                    font-size: 1.25rem;
                    font-weight: 500;
                    color: #333333;
                    margin-bottom: 0.75rem;
                    margin-top: 1.25rem;
                    line-height: 1.4;
                  }
                  .blog-preview h4 {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: #444444;
                    margin-bottom: 0.5rem;
                    margin-top: 1rem;
                  }
                  .blog-preview p {
                    color: #555555;
                    margin-bottom: 1rem;
                    line-height: 1.6;
                  }
                  .blog-preview ul, .blog-preview ol {
                    margin: 1rem 0;
                    padding-left: 1.5rem;
                    color: #555555;
                  }
                  .blog-preview ul {
                    list-style-type: disc;
                  }
                  .blog-preview ol {
                    list-style-type: decimal;
                  }
                  .blog-preview li {
                    margin-bottom: 0.25rem;
                  }
                  .blog-preview a {
                    color: #2c2c2c;
                    text-decoration: underline;
                    font-weight: 500;
                  }
                  .blog-preview blockquote {
                    border-left: 4px solid #e2e2e2;
                    padding-left: 1rem;
                    font-style: italic;
                    color: #666666;
                    margin: 1rem 0;
                  }
                  `}
                </style>
                <div 
                  className="blog-preview"
                  dangerouslySetInnerHTML={{ __html: generatedHtml }} 
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snackbar für Feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%', backgroundColor: '#2c2c2c', color: 'white', '& .MuiAlert-icon': { color: 'white' } }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default TextGeneratorPanel; 