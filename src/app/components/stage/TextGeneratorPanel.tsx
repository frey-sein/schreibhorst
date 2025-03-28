import React, { useState, useEffect } from 'react';
import { Button, TextField, Box, Typography, Paper, CircularProgress, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { availableTextModels } from '@/lib/services/textGenerator';
import { useStageStore } from '@/lib/store/stageStore';
import { BlogPostDraft } from '@/types/stage';

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

  // Lade gespeicherte Daten, wenn sie verfügbar sind
  useEffect(() => {
    if (blogPostDraft) {
      setPrompt(blogPostDraft.prompt);
      setGeneratedHtml(blogPostDraft.htmlContent);
      setMetaTitle(blogPostDraft.metaTitle);
      setMetaDescription(blogPostDraft.metaDescription);
      setSelectedModel(blogPostDraft.modelId);
    }
  }, [blogPostDraft]);

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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Blogbeitrag generieren</h3>
        
        <div className="mb-4">
          <FormControl fullWidth variant="outlined" size="small" className="mb-4">
            <InputLabel id="model-select-label">KI-Modell</InputLabel>
            <Select
              labelId="model-select-label"
              id="model-select"
              value={selectedModel}
              onChange={handleModelChange}
              label="KI-Modell"
              className="bg-white"
            >
              {availableTextModels.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name} - {model.provider}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
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