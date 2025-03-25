'use client';

import { useState, useEffect } from 'react';
import { usePromptStore } from '@/lib/store/promptStore';
import { useStageHistoryStore } from '@/lib/store/stageHistoryStore';
import { TextDraft, ImageDraft } from '@/types/stage';
import { ClockIcon, TrashIcon, ArrowPathIcon, PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import { generateImage, availableModels, ImageModel } from '@/lib/services/imageGenerator';
import { useStageStore } from '@/lib/store/stageStore';
import StockImagePanel from './StockImagePanel';

export default function StagePanel() {
  // Zugriff auf den persistenten Store
  const { 
    textDrafts, setTextDrafts, 
    imageDrafts, setImageDrafts, 
    selectedModel, setSelectedModel,
    activeImageTab, setActiveImageTab,
    updateTextDraft, updateImageDraft
  } = useStageStore();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");
  const { addSnapshot, getSnapshots, restoreSnapshot, clearSnapshots } = useStageHistoryStore();

  // Get prompts from the store
  const { textPrompts, imagePrompts } = usePromptStore();

  // Validiere das gespeicherte Modell beim Laden
  useEffect(() => {
    // Überprüfen, ob das ausgewählte Modell verfügbar ist
    const isModelAvailable = availableModels.some(model => model.id === selectedModel);
    
    if (!isModelAvailable) {
      // Wenn nicht, setze auf das Standardmodell
      console.warn(`Das gespeicherte Modell "${selectedModel}" ist nicht verfügbar. Verwende Standardmodell.`);
      setSelectedModel(availableModels[0].id);
    }
  }, [selectedModel, setSelectedModel]);

  // Listen for new prompts from the store
  useEffect(() => {
    if (textPrompts.length > 0) {
      // Add new text prompts as drafts
      const newTextDrafts = textPrompts.map((prompt, index) => ({
        id: textDrafts.length + index + 1,
        content: prompt.prompt,
        isSelected: false,
        title: prompt.contentType || "Neuer Entwurf",
        contentType: prompt.contentType,
        tags: prompt.tags,
        sourceContext: prompt.sourceContext
      }));
      
      setTextDrafts([...newTextDrafts, ...textDrafts]);
    }
  }, [textPrompts, textDrafts.length, setTextDrafts]);

  useEffect(() => {
    if (imagePrompts.length > 0) {
      // For image prompts, we'd typically generate images via an API
      // For now, we'll just use placeholders
      const placeholderImages = [
        "https://images.unsplash.com/photo-1513477967668-2aaf11838bd6?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1498598457418-36ef20772c9b?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&auto=format&fit=crop&q=60"
      ];
      
      const newImageDrafts = imagePrompts.map((prompt, index) => ({
        id: imageDrafts.length + index + 1,
        url: placeholderImages[index % placeholderImages.length],
        title: prompt.contentType || "Neues Bild",
        isSelected: false,
        contentType: prompt.contentType,
        tags: prompt.tags,
        sourceContext: prompt.sourceContext,
        prompt: prompt.prompt
      }));
      
      setImageDrafts([...newImageDrafts, ...imageDrafts]);
    }
  }, [imagePrompts, imageDrafts.length, setImageDrafts]);

  const handleTextSelect = (id: number) => {
    setTextDrafts(textDrafts.map(draft => ({
      ...draft,
      isSelected: draft.id === id
    })));
  };

  const handleImageSelect = (id: number) => {
    setImageDrafts(imageDrafts.map(draft => ({
      ...draft,
      isSelected: draft.id === id
    })));
  };

  const handleRegenerateTexts = () => {
    // Hier würde die Logik zum Neu Laden der Prompts stehen
    // Zum Beispiel eine API-Anfrage an einen Text-Generierungs-Service
    
    console.log("Prompts neu laden...");
    
    // In einer realen Implementierung würde hier der Aufruf an einen
    // Textgenerierungsservice stehen, ähnlich wie bei den Bildern
    alert("Diese Funktion ist noch nicht implementiert. Sie würde Text-Prompts neu generieren.");
  };

  const handleRegenerateImages = async () => {
    const selectedImages = imageDrafts.filter(img => img.isSelected && img.prompt);
    
    if (selectedImages.length === 0) {
      // Wenn keine Bilder ausgewählt sind, informiere den Benutzer
      alert('Bitte wähle mindestens ein Bild aus, oder klicke auf die Regenerieren-Schaltfläche eines einzelnen Bildes.');
      return;
    }
    
    // Prüfe, ob das ausgewählte Modell in der Liste verfügbar ist
    const isValidModel = availableModels.some(m => m.id === selectedModel);
    if (!isValidModel) {
      const defaultModel = availableModels[0].id;
      setSelectedModel(defaultModel);
      alert(`Das ausgewählte Modell ist nicht verfügbar. Es wurde auf ${availableModels[0].name} zurückgesetzt.`);
    }
    
    // Setze alle ausgewählten Bilder in den Ladezustand
    setImageDrafts(imageDrafts.map(draft => 
      draft.isSelected && draft.prompt 
        ? { ...draft, url: '/images/loading.svg' } 
        : draft
    ));
    
    // Generiere alle ausgewählten Bilder neu
    let hasModelError = false;
    for (const image of selectedImages) {
      if (image.prompt) {
        try {
          await handleRegenerateImage(image.id);
        } catch (error) {
          console.error(`Fehler bei der Regenerierung von Bild ${image.id}:`, error);
          // Wenn bereits ein Modellfehler aufgetreten ist, zeige keine weiteren Meldungen an
          if (!hasModelError && (error as Error).message?.includes('nicht verfügbar')) {
            hasModelError = true;
          }
        }
      }
    }
  };

  const handleSave = () => {
    // Speichere den aktuellen Zustand im History-Store
    addSnapshot(textDrafts, imageDrafts);
    
    // Der aktuelle Zustand ist bereits im Stage-Store gespeichert
    // durch die reactive updates in den Funktionen
    
    setIsHistoryOpen(false); // Schließe das Verlaufsmenü nach dem Speichern
  };

  const handleOpenPromptModal = (id: number) => {
    const image = imageDrafts.find(img => img.id === id);
    if (image) {
      setCurrentImageId(id);
      setEditingPrompt(image.prompt || "");
      setIsPromptModalOpen(true);
    }
  };

  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
    setCurrentImageId(null);
    setEditingPrompt("");
  };

  const handleSavePrompt = () => {
    if (currentImageId) {
      updateImageDraft(currentImageId, { prompt: editingPrompt });
    }
    handleClosePromptModal();
  };

  const handleRegenerateImage = async (id: number) => {
    const image = imageDrafts.find(img => img.id === id);
    if (image && image.prompt) {
      // Setze das Bild in einen Ladezustand
      updateImageDraft(id, { url: '/images/loading.svg' });
      
      try {
        // Generiere ein neues Bild mit dem Prompt über die Together API
        const result = await generateImage(image.prompt, selectedModel);
        
        if (result.success && result.imageUrl) {
          // Aktualisiere das Bild mit der neuen URL
          updateImageDraft(id, { url: result.imageUrl as string });
        } else {
          // Fehlerbehandlung
          console.error('Fehler bei der Bildgenerierung:', result.error);
          
          // Anzeigen einer benutzerfreundlichen Fehlermeldung
          const errorMessage = result.error || 'Unbekannter Fehler';
          alert(`Fehler bei der Bildgenerierung: ${errorMessage}`);
          
          // Setze das Bild auf ein Fehlerbild
          updateImageDraft(id, { url: '/images/error.svg' });
          
          // Wenn das Modell nicht verfügbar ist, setze auf das Standardmodell zurück
          if (errorMessage.includes('nicht verfügbar') || errorMessage.includes('Unable to access model')) {
            const defaultModel = availableModels[0].id;
            setSelectedModel(defaultModel);
            alert(`Das ausgewählte Modell ist nicht verfügbar. Es wurde auf ${availableModels[0].name} zurückgesetzt.`);
          }
        }
      } catch (error) {
        console.error('Fehler bei der Bildgenerierung:', error);
        alert(`Es ist ein unerwarteter Fehler aufgetreten: ${(error as Error).message || 'Unbekannter Fehler'}`);
        
        // Setze das Bild auf ein Fehlerbild
        updateImageDraft(id, { url: '/images/error.svg' });
      }
    }
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    const snapshot = restoreSnapshot(snapshotId);
    if (snapshot) {
      // Aktualisiere beide Stores - History und Stage
      setTextDrafts(snapshot.textDrafts);
      setImageDrafts(snapshot.imageDrafts);
      setIsHistoryOpen(false);
    }
  };

  return (
    <div className="w-1/2 flex flex-col h-full bg-[#f0f0f0]">
      {/* Header */}
      <div className="sticky top-[64px] z-20 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-start gap-4 w-full">
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Deine Entwürfe</h2>
            <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">Wähle deine besten Entwürfe</p>
          </div>
          {/* Unsichtbares Element für gleiche Höhe */}
          <div className="flex items-start space-x-3 shrink-0 invisible">
            <div className="p-2.5 border border-gray-200 rounded-full w-[48px] h-[48px]"></div>
            <div className="p-2.5 border border-gray-200 rounded-full w-[48px] h-[48px]"></div>
            <div className="px-4 py-2.5 border border-gray-200 rounded-full w-48 lg:w-64 h-[48px]"></div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-24 space-y-12 pb-24">
        {/* Text Drafts Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Textentwürfe</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Hier würde die Logik zum Neu Laden der Prompts stehen
                  console.log("Prompts neu laden...");
                  
                  // In einer realen Implementierung würde hier der Aufruf an einen
                  // Textgenerierungsservice stehen, ähnlich wie bei den Bildern
                  alert("Diese Funktion ist noch nicht implementiert. Sie würde Text-Prompts neu generieren.");
                }}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium z-30"
              >
                Prompts neu laden
              </button>
              <button
                onClick={handleRegenerateTexts}
                className="p-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] transition-colors border border-[#2c2c2c] mr-3"
                title="Alle Texte neu generieren"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {textDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => handleTextSelect(draft.id)}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 ${
                  draft.isSelected
                    ? 'bg-white border-2 border-[#2c2c2c] shadow-lg'
                    : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col h-full justify-between">
                  {draft.contentType && (
                    <div className="mb-2 flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">
                        Typ: {draft.contentType}
                      </span>
                      {draft.sourceContext && (
                        <span className="text-xs text-gray-400">
                          Quelle: {draft.sourceContext}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <p className="text-gray-700 leading-relaxed">{draft.content}</p>
                  
                  <div className="mt-3 space-y-3">
                    {draft.tags && draft.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {draft.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {draft.tags.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            +{draft.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center h-6">
                      {draft.isSelected ? (
                        <>
                          <span className="text-sm text-[#2c2c2c] font-medium">Ausgewählt</span>
                          <div className="flex items-center space-x-1 text-gray-500 text-xs">
                            <span>{draft.title}</span>
                            {draft.contentType && <span>• {draft.contentType}</span>}
                          </div>
                        </>
                      ) : <div />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Drafts Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bildentwürfe</h3>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-gray-200 rounded-full p-1 flex">
                <button
                  onClick={() => setActiveImageTab('ai')}
                  className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    activeImageTab === 'ai'
                      ? 'bg-[#2c2c2c] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <SparklesIcon className="h-4 w-4" />
                  KI-Generierung
                </button>
                <button
                  onClick={() => setActiveImageTab('stock')}
                  className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    activeImageTab === 'stock'
                      ? 'bg-[#2c2c2c] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PhotoIcon className="h-4 w-4" />
                  Stockbilder
                </button>
              </div>
            </div>
          </div>
          
          {/* KI-Generierung Tab */}
          {activeImageTab === 'ai' && (
            <>
              <div className="flex justify-between items-center">
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-full leading-tight focus:outline-none focus:border-gray-400 text-sm"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={handleRegenerateImages}
                  className="p-2.5 bg-[#2c2c2c] hover:bg-[#1a1a1a] rounded-full transition-colors border border-[#2c2c2c] mr-3"
                  title="Alle ausgewählten Bilder neu generieren"
                >
                  <ArrowPathIcon className="h-5 w-5 text-white" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {imageDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex flex-col"
                  >
                    <div
                      onClick={() => handleImageSelect(draft.id)}
                      className={`group relative aspect-square rounded-t-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        draft.isSelected
                          ? 'ring-2 ring-[#2c2c2c] shadow-lg'
                          : 'hover:ring-2 hover:ring-gray-400 hover:shadow-md'
                      }`}
                    >
                      <img
                        src={draft.url}
                        alt={draft.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {draft.isSelected && (
                          <div className="bg-[#2c2c2c] text-white px-3 py-1 rounded-full text-sm font-medium">
                            Ausgewählt
                          </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateImage(draft.id);
                          }}
                          className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                          title="Bild neu generieren"
                        >
                          <ArrowPathIcon className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    {draft.prompt && (
                      <div 
                        onClick={() => handleOpenPromptModal(draft.id)}
                        className="p-3 bg-white border border-gray-100 rounded-b-2xl cursor-pointer hover:bg-gray-50"
                      >
                        <p className="text-sm text-gray-600 truncate" title={draft.prompt}>
                          {draft.prompt.length > 60 
                            ? `${draft.prompt.substring(0, 60)}...` 
                            : draft.prompt}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Klicken zum Bearbeiten</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Stockbilder Tab */}
          {activeImageTab === 'stock' && (
            <StockImagePanel />
          )}
        </div>
      </div>

      {/* Action Bar - Fixed */}
      <div className="sticky bottom-0 bg-[#fafafa]">
        <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium"
            >
              Speichern
            </button>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all border border-gray-100"
              title="Verlauf"
            >
              <ClockIcon className="w-5 h-5" />
            </button>
            <button className="px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100 ml-auto">
              Exportieren
            </button>
          </div>

          {/* Verlaufsmenü */}
          {isHistoryOpen && createPortal(
            <div className="fixed bottom-[80px] w-[calc(50%-48px)] right-6 ml-6 bg-white rounded-xl border border-gray-200 shadow-lg p-6" style={{ zIndex: 999999 }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-gray-900">Verlauf</h3>
                  {getSnapshots().length > 0 && (
                    <button 
                      onClick={() => {
                        if (window.confirm('Möchten Sie wirklich den gesamten Verlauf löschen?')) {
                          clearSnapshots();
                          setIsHistoryOpen(false);
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                      title="Verlauf löschen"
                    >
                      <TrashIcon className="h-5 w-5 text-gray-400 group-hover:text-red-500" />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {getSnapshots().length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Keine Snapshots vorhanden!</p>
                  </div>
                ) : (
                  getSnapshots().map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="group flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                      onClick={() => handleRestoreSnapshot(snapshot.id)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(snapshot.timestamp), "d. MMMM yyyy", { locale: de })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(snapshot.timestamp), "HH:mm:ss", { locale: de })} Uhr • {snapshot.textDrafts.length} Texte, {snapshot.imageDrafts.length} Bilder
                        </p>
                        {snapshot.imageDrafts.length > 0 && (
                          <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                            {snapshot.imageDrafts.map((image, index) => (
                              <img
                                key={index}
                                src={image.url}
                                alt={image.title || `Bild ${index + 1}`}
                                className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800 ml-4">
                        Wiederherstellen
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Prompt-Bearbeitungs-Modal */}
      {isPromptModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Prompt bearbeiten</h3>
              <button 
                onClick={handleClosePromptModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Bildgenerierungsprompt
              </label>
              <textarea
                id="prompt"
                className="w-full border border-gray-300 rounded-lg p-3 min-h-[150px] text-gray-700 focus:ring-2 focus:ring-[#2c2c2c] focus:border-transparent outline-none resize-none"
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                placeholder="Beschreibe das Bild, das du generieren möchtest..."
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                KI-Modell
              </label>
              <div className="relative">
                <select
                  id="model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none w-full border border-gray-300 rounded-lg py-2.5 px-4 pr-8 text-gray-700 focus:ring-2 focus:ring-[#2c2c2c] focus:border-transparent outline-none"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.provider}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              {availableModels.find(m => m.id === selectedModel)?.description && (
                <p className="mt-1 text-xs text-gray-500">
                  {availableModels.find(m => m.id === selectedModel)?.description}
                </p>
              )}
            </div>
            
            {currentImageId && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Aktuelles Bild:</h4>
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img 
                    src={imageDrafts.find(d => d.id === currentImageId)?.url} 
                    alt="Aktuelles Bild" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={handleClosePromptModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSavePrompt}
                className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a]"
              >
                Speichern & Schließen
              </button>
              <button
                onClick={() => {
                  handleSavePrompt();
                  if (currentImageId) {
                    handleRegenerateImage(currentImageId);
                  }
                }}
                className="px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a]"
              >
                Speichern & Neu Generieren
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 