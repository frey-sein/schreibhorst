'use client';

import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, ArrowTopRightOnSquareIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, ArrowPathIcon, StarIcon, PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { searchStockImages, activeStockImageProviders, StockImageResult } from '@/lib/services/stockImageSearch';
import { useStageStore } from '@/lib/store/stageStore';
import { ImageDraft } from '@/types/stage';
import { simplifyPrompt, simplifyPromptLocally } from '@/lib/services/promptSimplifier';

export default function StockImagePanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const pixabayProvider = activeStockImageProviders.find(p => p.id === 'pixabay');
    return pixabayProvider || activeStockImageProviders[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [searchResults, setSearchResults] = useState<StockImageResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const resultsPerPage = 20;
  
  // Zugriff auf den stageStore für das Hinzufügen von Bildern
  const { imageDrafts, setImageDrafts } = useStageStore();
  
  // Extrahiere einzigartige Prompts aus KI-generierten Bildern
  const aiPrompts = useMemo(() => {
    // Filtere KI-generierte Bilder (alle außer modelId='stock')
    const aiImages = imageDrafts.filter(draft => draft.modelId !== 'stock' && draft.prompt);
    
    // Extrahiere eindeutige Prompts
    const uniquePrompts = new Set<string>();
    aiImages.forEach(image => {
      if (image.prompt) {
        uniquePrompts.add(image.prompt);
      }
    });
    
    // Konvertiere zu Array und limitiere auf die ersten 5 Vorschläge
    return Array.from(uniquePrompts).slice(0, 5);
  }, [imageDrafts]);
  
  // Prompt-Vereinfachung mit API oder lokalem Fallback
  const handleSimplifyPrompt = async (prompt: string) => {
    setIsSimplifying(true);
    setErrorMessage('');
    
    try {
      // Versuche zuerst die API-Vereinfachung
      const result = await simplifyPrompt(prompt);
      
      if (result.success && result.simplifiedPrompt) {
        setSearchQuery(result.simplifiedPrompt);
      } else {
        // Fallback zur lokalen Vereinfachung
        const simplified = simplifyPromptLocally(prompt);
        setSearchQuery(simplified);
      }
    } catch (error) {
      console.error('Fehler bei der Prompt-Vereinfachung:', error);
      // Einfachen lokalen Fallback verwenden
      const simplified = simplifyPromptLocally(prompt);
      setSearchQuery(simplified);
    } finally {
      setIsSimplifying(false);
    }
  };
  
  // Suchvorschlag anwenden
  const applyPromptSuggestion = (prompt: string) => {
    setSearchQuery(prompt);
  };
  
  const handleSearch = async (page: number = 1, overrideQuery?: string) => {
    const queryToUse = overrideQuery || searchQuery;
    
    if (!queryToUse.trim()) {
      setErrorMessage('Bitte gib einen Suchbegriff ein');
      return;
    }
    
    if (!selectedProvider) {
      setErrorMessage('Kein aktiver Anbieter verfügbar');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const response = await searchStockImages(queryToUse, selectedProvider.id, page, resultsPerPage);
      
      if (response.success) {
        setSearchResults(response.results);
        setCurrentPage(page);
        
        // Setze Metainformationen zur Paginierung, falls vorhanden
        if (response.totalResults) {
          setTotalResults(response.totalResults);
          setTotalPages(Math.ceil(response.totalResults / resultsPerPage));
        } else {
          setTotalResults(response.results.length);
          setTotalPages(1);
        }
        
        if (response.results.length === 0) {
          setErrorMessage('Keine Bilder gefunden. Versuche es mit einem anderen Suchbegriff.');
        }
      } else {
        setErrorMessage(response.error || 'Bei der Suche ist ein Fehler aufgetreten');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Fehler bei der Bildsuche:', error);
      setErrorMessage('Bei der Suche ist ein unerwarteter Fehler aufgetreten');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(1); // Bei neuer Suche immer auf Seite 1 starten
    }
  };
  
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };
  
  const addSelectedImagesToStage = () => {
    if (selectedImages.length === 0) {
      setErrorMessage('Bitte wähle mindestens ein Bild aus');
      return;
    }
    
    // Höchste vorhandene ID finden
    const maxId = imageDrafts.length > 0 
      ? Math.max(...imageDrafts.map(draft => draft.id)) 
      : 0;
    
    // Nur ausgewählte Bilder holen
    const selectedStockImages = searchResults.filter(img => 
      selectedImages.includes(img.id)
    );
    
    // Ausgewählte Bilder als ImageDrafts zum Stage hinzufügen
    const newImageDrafts: ImageDraft[] = selectedStockImages.map((img, index) => ({
      id: maxId + index + 1,
      url: img.fullSizeUrl,
      title: img.title || `Stockbild ${index + 1}`,
      prompt: `Stockbild: ${img.title || 'Kein Titel'} (Quelle: ${img.provider.name})`,
      isSelected: false,
      modelId: 'stock', // Markierung als Stockbild
      width: 1024,
      height: 1024,
      meta: {
        provider: img.provider.id,
        author: img.author || 'Unbekannt',
        stockImageId: img.id,
        licenseInfo: img.licenseInfo || 'Standardlizenz',
        tags: img.tags || []
      }
    }));
    
    // Zum Stage hinzufügen
    setImageDrafts([...imageDrafts, ...newImageDrafts]);
    
    // Auswahl zurücksetzen
    setSelectedImages([]);
    
    // Bestätigungsmeldung
    alert(`${newImageDrafts.length} Bilder wurden zu deinen Entwürfen hinzugefügt.`);
  };
  
  const openProviderSearch = (providerId: string) => {
    const provider = activeStockImageProviders.find(p => p.id === providerId);
    if (provider && provider.baseUrl) {
      window.open(`${provider.baseUrl}${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    handleSearch(newPage);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Suchformular */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Suche nach Stockfotos..."
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-full bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {activeStockImageProviders.length > 0 ? (
            <select
              value={selectedProvider.id}
              onChange={(e) => setSelectedProvider(activeStockImageProviders.find(p => p.id === e.target.value) || activeStockImageProviders[0])}
              className="bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-full appearance-none focus:outline-none focus:border-gray-400"
            >
              {activeStockImageProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full">
              Keine Anbieter verfügbar
            </div>
          )}
          
          <button
            onClick={() => handleSearch(1)}
            disabled={isLoading || isSimplifying || !selectedProvider}
            className="px-6 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Suche...' : 'Suchen'}
          </button>
        </div>
        
        {/* KI-Prompt Vorschläge */}
        {aiPrompts.length > 0 && (
          <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-4 w-4 text-gray-500" />
              <p className="text-sm text-gray-700 font-medium">Prompts von KI-Bildern</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiPrompts.map((prompt, index) => (
                <div key={index} className="flex items-center gap-1">
                  <button
                    onClick={() => applyPromptSuggestion(prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-l-full text-xs text-gray-700 hover:bg-gray-50 transition-colors truncate max-w-[200px]"
                    title={prompt}
                  >
                    <ArrowPathIcon className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    {prompt.length > 25 ? `${prompt.substring(0, 25)}...` : prompt}
                  </button>
                  <button
                    onClick={() => handleSimplifyPrompt(prompt)}
                    className="flex items-center px-2 py-1.5 bg-white border-y border-r border-gray-200 rounded-r-full text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Prompt vereinfachen und suchen"
                    disabled={isSimplifying}
                  >
                    <StarIcon className="h-3.5 w-3.5 text-purple-500" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              <span className="inline-flex items-center">
                <ArrowPathIcon className="h-3 w-3 mr-1" /> Direkt mit Prompt suchen
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center">
                <StarIcon className="h-3 w-3 mr-1 text-purple-500" /> Prompt vereinfachen und suchen
              </span>
            </p>
          </div>
        )}
        
        {activeStockImageProviders.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-700 text-sm">
            Keine Stockfoto-Anbieter aktiviert. Bitte konfiguriere die Umgebungsvariablen.
          </div>
        )}
        
        {/* Fehlermeldung */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {errorMessage}
          </div>
        )}
        
        {/* Anzeige während der Prompt-Vereinfachung */}
        {isSimplifying && (
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="animate-spin">
                <StarIcon className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700">Vereinfache den Prompt für die Stockbildsuche...</p>
            </div>
          </div>
        )}
        
        {/* Ergebnisse & Aktionen */}
        {searchResults.length > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {totalResults > 0 
                ? `${totalResults} Ergebnisse gefunden (Seite ${currentPage} von ${totalPages})`
                : `${searchResults.length} Ergebnisse gefunden`
              }
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => openProviderSearch(selectedProvider.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Auf Provider-Seite suchen
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </button>
              <button
                onClick={addSelectedImagesToStage}
                disabled={selectedImages.length === 0}
                className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {selectedImages.length === 0 
                  ? 'Bilder auswählen' 
                  : `${selectedImages.length} Bilder hinzufügen`}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bildergebnisse */}
      {searchResults.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-6">
            {searchResults.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-white border border-gray-100">
                  <img
                    src={image.thumbnailUrl}
                    alt={image.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {image.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {image.provider.name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={image.fullSizeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-500"
                        title="Originalseite öffnen"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(image.fullSizeUrl, '_blank');
                        }}
                      >
                        <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                      </a>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = image.downloadUrl || image.fullSizeUrl;
                          link.download = `${image.title || 'stockimage'}.jpg`;
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-gray-400 hover:text-gray-500"
                        title="Bild herunterladen"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleImageSelection(image.id)}
                        className={`text-blue-600 hover:text-blue-700 ${
                          selectedImages.includes(image.id) ? 'text-blue-700' : ''
                        }`}
                        title="Zur Bühne hinzufügen"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {image.tags && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {image.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {image.tags.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                          +{image.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Paginierung */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="p-2 bg-white border border-gray-200 rounded-full disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    // Berechne Seitennummern basierend auf aktueller Seite
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else {
                      if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoading}
                        className={`h-8 w-8 flex items-center justify-center rounded-full text-sm ${
                          currentPage === pageNum
                            ? 'bg-[#2c2c2c] text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  className="p-2 bg-white border border-gray-200 rounded-full disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 