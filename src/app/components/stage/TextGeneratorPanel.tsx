import React, { useState, useEffect, useRef } from 'react';
import { Button, TextField, Box, Typography, Paper, CircularProgress, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { availableTextModels } from '@/lib/services/textGenerator';
import { useStageStore } from '@/lib/store/stageStore';
import { BlogPostDraft } from '@/types/stage';
import { ChevronDownIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';

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
  
  const modelSelectorRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelSelectorRef]);

  const handleModelChange = (event: SelectChangeEvent) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    setSelectedTextModel(newModel);
  };

  const handleGenerateText = async () => {
    if (!prompt.trim()) {
      setError('Bitte gib einen Prompt ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generateText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
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
        prompt,
        htmlContent,
        metaTitle: newMetaTitle,
        metaDescription: newMetaDescription,
        modelId: selectedModel,
        createdAt: new Date()
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
    navigator.clipboard.writeText(text);
    // Feedback könnte hier angezeigt werden
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Blogbeitrag generieren</h3>
          
          {/* Buttons für Modellauswahl und Verlauf */}
          <div className="flex items-center space-x-2">
            {/* Verlaufsbutton */}
            <button
              onClick={() => alert("Verlaufsfunktion wird bald implementiert!")}
              className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100 shrink-0 shadow-sm"
              title="Verlauf anzeigen"
            >
              <ClockIcon className="w-4 h-4" />
            </button>
            
            {/* Kompakter Modellumschalter */}
            <div className="relative" ref={modelSelectorRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                title="Modell wechseln"
              >
                <SparklesIcon className="h-4 w-4 text-amber-500" />
                <span className="truncate max-w-[120px]">
                  {availableTextModels.find(m => m.id === selectedModel)?.name || selectedModel.split('/')[1]}
                </span>
                <ChevronDownIcon className="h-3 w-3 text-gray-500" />
              </button>
              
              {modelDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-1 px-2">
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
                        className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                          selectedModel === model.id
                            ? 'bg-gray-100 text-gray-900 shadow-inner'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <SparklesIcon 
                          className={`h-4 w-4 ${
                            selectedModel === model.id
                              ? 'text-amber-500'
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
        
        <div className="mb-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <textarea
              className="w-full p-4 min-h-[150px] text-gray-800 focus:outline-none resize-none"
              placeholder="Beschreibe den gewünschten Blogbeitrag. Je detaillierter der Prompt, desto besser das Ergebnis..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          
          <div className="flex justify-between">
            <Button 
              variant="contained" 
              onClick={handleGenerateText}
              disabled={isLoading || !prompt.trim()}
              sx={{ 
                bgcolor: '#2c2c2c', 
                '&:hover': { bgcolor: '#1a1a1a' },
                borderRadius: '9999px',
                textTransform: 'none',
                fontSize: '0.875rem',
                py: 1.2,
                px: 4
              }}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? 'Generiere...' : 'Blogbeitrag erstellen'}
            </Button>
            
            {error && (
              <div className="text-red-500 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {(metaTitle || generatedHtml) && !isLoading && (
        <div className="space-y-6">
          {metaTitle && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h4 className="font-medium text-gray-900 mb-3">Meta-Informationen</h4>
              
              <div className="mb-4">
                <div className="text-sm text-gray-700 mb-1">Meta-Titel ({metaTitle.length}/55):</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-200 text-sm text-gray-800">
                    {metaTitle}
                  </div>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => copyToClipboard(metaTitle)}
                    sx={{ 
                      borderRadius: '9999px',
                      textTransform: 'none',
                      borderColor: 'rgba(0,0,0,0.12)',
                      color: '#2c2c2c',
                      '&:hover': { borderColor: '#2c2c2c', bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                  >
                    Kopieren
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-700 mb-1">Meta-Beschreibung:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-200 text-sm max-h-24 overflow-y-auto text-gray-800">
                    {metaDescription}
                  </div>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => copyToClipboard(metaDescription)}
                    sx={{ 
                      borderRadius: '9999px',
                      textTransform: 'none',
                      borderColor: 'rgba(0,0,0,0.12)',
                      color: '#2c2c2c',
                      '&:hover': { borderColor: '#2c2c2c', bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                  >
                    Kopieren
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {generatedHtml && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Generierter Blogbeitrag</h4>
                <Button 
                  variant="outlined"
                  onClick={() => copyToClipboard(generatedHtml)}
                  sx={{ 
                    borderRadius: '9999px',
                    textTransform: 'none',
                    borderColor: 'rgba(0,0,0,0.12)',
                    color: '#2c2c2c',
                    '&:hover': { borderColor: '#2c2c2c', bgcolor: 'rgba(0,0,0,0.04)' }
                  }}
                >
                  HTML kopieren
                </Button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[400px] overflow-y-auto">
                <div 
                  className="prose prose-sm max-w-none text-gray-800 prose-headings:text-gray-800 prose-h1:text-gray-900 prose-h2:text-gray-800 prose-h3:text-gray-700" 
                  dangerouslySetInnerHTML={{ __html: generatedHtml }} 
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextGeneratorPanel; 