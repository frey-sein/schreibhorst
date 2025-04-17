'use client';

import { useState, useEffect } from 'react';
import { usePromptStore } from '@/lib/store/promptStore';
import { useStageHistoryStore } from '@/lib/store/stageHistoryStore';
import { TextDraft, ImageDraft, BlogPostDraft } from '@/types/stage';
import { ClockIcon, TrashIcon, ArrowPathIcon, PhotoIcon, SparklesIcon, PencilIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import { generateImage, availableModels, ImageModel } from '@/lib/services/imageGenerator';
import { useStageStore } from '@/lib/store/stageStore';
import StockImagePanel from './StockImagePanel';
import PromptEditor from './PromptEditor';
import TextGeneratorPanel from './TextGeneratorPanel';
import { ImageStorageClient } from '@/lib/services/imageStorageClient';

export default function StagePanel() {
  // Zugriff auf den persistenten Store
  const { 
    textDrafts, setTextDrafts,
    imageDrafts, setImageDrafts,
    updateTextDraft, updateImageDraft,
    selectedModel, setSelectedModel,
    selectedTextModel, setBlogPostDraft,
    activeImageTab, setActiveImageTab
  } = useStageStore();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<number | null>(null);
  const [currentTextId, setCurrentTextId] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");
  const [editingItemType, setEditingItemType] = useState<'text' | 'image'>('image');
  const { addSnapshot, getSnapshots, restoreSnapshot, clearSnapshots } = useStageHistoryStore();
  const [snapshots, setSnapshots] = useState<Array<{
    id: string;
    timestamp: Date;
    textDrafts: any[];
    imageDrafts: any[];
  }>>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'images' | 'blog'>('images');

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
      // Debug-Ausgabe zum Überprüfen der eingehenden Textprompts
      console.log('Neue Textprompts empfangen:', textPrompts);
      
      // Add new text prompts as drafts
      const newTextDrafts = textPrompts.map((prompt, index) => ({
        id: textDrafts.length > 0 ? Math.max(...textDrafts.map(d => d.id)) + index + 1 : index + 1,
        content: prompt.prompt,
        isSelected: false,
        title: prompt.title || "Blogbeitrag",
        contentType: prompt.contentType || "Blogbeitrag",
        styleVariant: prompt.styleVariant || "blog",
        tags: prompt.tags || ["blog", "artikel"],
        sourceContext: prompt.sourceContext || "Chatanalyse"
      }));
      
      console.log('Neue TextDrafts erstellt:', newTextDrafts);
      
      // Komplett neue Liste erstellen
      setTextDrafts([...newTextDrafts, ...textDrafts]);
    }
  }, [textPrompts]);

  useEffect(() => {
    if (imagePrompts.length > 0) {
      console.log('Neue Bildprompts empfangen:', imagePrompts);
      
      const newImageDrafts = imagePrompts.map((prompt, index) => ({
        id: imageDrafts.length > 0 ? Math.max(...imageDrafts.map(d => d.id)) + index + 1 : index + 1,
        url: '/images/placeholder.svg', // Standard-Platzhalter
        title: prompt.title || prompt.contentType || "Neues Bild",
        isSelected: false,
        contentType: prompt.contentType,
        tags: prompt.tags,
        sourceContext: prompt.sourceContext,
        prompt: prompt.prompt,
        // Status setzen als "pending" - noch nicht generiert
        status: 'pending' as 'pending' | 'generating' | 'completed' | 'error',
        // Erforderliche Eigenschaften für ImageDraft
        modelId: selectedModel,
        width: 800,
        height: 600,
        meta: {
          provider: 'pending',
          tags: prompt.tags
        }
      }));
      
      console.log('Neue ImageDrafts erstellt:', newImageDrafts);
      
      // Komplett neue Liste erstellen
      setImageDrafts([...newImageDrafts, ...imageDrafts]);
    }
  }, [imagePrompts, selectedModel]);

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

  const handleSave = async () => {
    try {
      // Speichere den aktuellen Zustand im History-Store
      await addSnapshot(textDrafts, imageDrafts);
      
      // Lade die Snapshots neu
      const loadedSnapshots = await getSnapshots();
      setSnapshots(loadedSnapshots);
      
      // Der aktuelle Zustand ist bereits im Stage-Store gespeichert
      // durch die reactive updates in den Funktionen
      
      setIsHistoryOpen(false); // Schließe das Verlaufsmenü nach dem Speichern
    } catch (error) {
      console.error('Fehler beim Speichern des Snapshots:', error);
      alert('Fehler beim Speichern des Snapshots. Bitte versuchen Sie es erneut.');
    }
  };

  const handleOpenPromptModal = (id: number, type: 'text' | 'image' = 'image') => {
    if (type === 'text') {
      const text = textDrafts.find(item => item.id === id);
      if (text) {
        setCurrentTextId(id);
        setCurrentImageId(null);
        setEditingPrompt(text.content || "");
        setEditingItemType('text');
        setIsPromptModalOpen(true);
      }
    } else {
      const image = imageDrafts.find(img => img.id === id);
      if (image) {
        setCurrentImageId(id);
        setCurrentTextId(null);
        setEditingPrompt(image.prompt || "");
        setEditingItemType('image');
        setIsPromptModalOpen(true);
      }
    }
  };

  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
    setCurrentImageId(null);
    setCurrentTextId(null);
    setEditingPrompt("");
  };

  const handleSavePrompt = (newPrompt: string) => {
    if (editingItemType === 'text' && currentTextId) {
      updateTextDraft(currentTextId, { content: newPrompt });
    } else if (editingItemType === 'image' && currentImageId) {
      updateImageDraft(currentImageId, { prompt: newPrompt });
    }
    handleClosePromptModal();
  };

  const handleRegenerateImage = async (id: number) => {
    const image = imageDrafts.find(img => img.id === id);
    
    if (!image) return;
    
    // Lade die aktuelle Chat-ID aus dem Store
    const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
    const currentChatId = useStageHistoryStore.getState().currentChatId;
    
    // Setze den Status auf "generiere"
    updateImageDraft(id, { status: 'generating' });
    
    if (image.prompt) {
      try {
        // Bild generieren mit der aktuellen Chat-ID
        const result = await generateImage(
          image.prompt,
          selectedModel,
          image.title,
          currentChatId || undefined // Chat-ID übergeben
        );
        
        if (result.success) {
          // Status auf "completed" setzen
          updateImageDraft(id, { status: 'completed' });
          
          // Verwende die URL vom gespeicherten Bild, falls vorhanden (lokaler Pfad)
          if (result.image && result.image.url) {
            console.log('Verwende lokale Bild-URL:', result.image.url);
            updateImageDraft(id, { url: result.image.url });
          } 
          // Fallback zur externen URL, falls keine lokale URL vorhanden
          else if (result.imageUrl) {
            let imageUrl = result.imageUrl as string;
            
            // Prüfe, ob es sich um eine imgproxy-URL handelt
            if (imageUrl.includes('imgproxy') || imageUrl.includes('api.together.ai')) {
              console.log('Externe imgproxy-URL erkannt:', imageUrl);
              
              // Versuche, die lokale ID aus der URL zu extrahieren (falls möglich)
              try {
                // Versuch, ein generiertes Bild aus dem lokalen Speicher zu laden
                // Im realen Fall würde hier eine komplexere Logik stehen
                // Wir könnten zum Beispiel einen API-Aufruf machen, um das zuletzt generierte Bild zu finden
                
                // Für jetzt behalten wir die URL bei und markieren sie für späteren Download-Fallback
                console.log('Markiere Bild mit ID', id, 'als extern - wird beim Download lokale Version versuchen');
              } catch (loadError) {
                console.error('Fehler beim Versuch, lokale Version zu laden:', loadError);
              }
            }
            
            updateImageDraft(id, { url: imageUrl });
            console.warn('Bild wurde generiert, aber ohne lokalen Pfad - verwende externe URL');
          }
        } else {
          // Fehlerbehandlung - Status auf "error" setzen
          updateImageDraft(id, { 
            status: 'error',
            url: '/images/error.svg' 
          });
          
          // Fehlermeldung anzeigen
          console.error('Fehler bei der Bildgenerierung:', result.error);
          
          // Anzeigen einer benutzerfreundlichen Fehlermeldung
          const errorMessage = result.error || 'Unbekannter Fehler';
          alert(`Fehler bei der Bildgenerierung: ${errorMessage}`);
          
          // Wenn das Modell nicht verfügbar ist, setze auf das Standardmodell zurück
          if (errorMessage.includes('nicht verfügbar') || errorMessage.includes('Unable to access model')) {
            const defaultModel = availableModels[0].id;
            setSelectedModel(defaultModel);
            alert(`Das ausgewählte Modell ist nicht verfügbar. Es wurde auf ${availableModels[0].name} zurückgesetzt.`);
          }
        }
      } catch (error) {
        // Fehlerhandling - Status auf "error" setzen
        updateImageDraft(id, { 
          status: 'error',
          url: '/images/error.svg' 
        });
        
        console.error('Fehler bei der Bildgenerierung:', error);
        alert(`Es ist ein unerwarteter Fehler aufgetreten: ${(error as Error).message || 'Unbekannter Fehler'}`);
      }
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    try {
      const snapshot = await restoreSnapshot(snapshotId);
      if (snapshot) {
        // Aktualisiere beide Stores - History und Stage
        setTextDrafts(snapshot.textDrafts);
        setImageDrafts(snapshot.imageDrafts);
        setIsHistoryOpen(false);
      }
    } catch (error) {
      console.error('Fehler beim Wiederherstellen des Snapshots:', error);
      alert('Fehler beim Wiederherstellen des Snapshots. Bitte versuchen Sie es erneut.');
    }
  };

  // Lade Snapshots beim Öffnen des History-Panels
  useEffect(() => {
    if (isHistoryOpen) {
      const loadSnapshots = async () => {
        try {
          const loadedSnapshots = await getSnapshots();
          setSnapshots(loadedSnapshots);
        } catch (error) {
          console.error('Fehler beim Laden der Snapshots:', error);
          setSnapshots([]);
        }
      };
      
      loadSnapshots();
    }
  }, [isHistoryOpen, getSnapshots]);

  const handleDownloadImage = async (id: number) => {
    const image = imageDrafts.find(img => img.id === id);
    if (!image) return;
    
    try {
      // Detaillierte Logging-Ausgaben für Debugging
      console.log('Herunterladen des Bildes:', id);
      console.log('Bild-URL:', image.url);
      console.log('Enthält imgproxy?', image.url?.includes('imgproxy'));
      console.log('Enthält api.together.ai?', image.url?.includes('api.together.ai'));
      
      // Verbesserte Erkennung für lokale Bilder
      const isLocalImage = image.url && (
        image.url.includes('/uploads/images/') || 
        (image.url.startsWith('/') && !image.url.includes('api.together.ai'))
      );
      
      console.log('Wird als lokales Bild erkannt:', isLocalImage);
      
      // Wenn URL api.together.ai/imgproxy enthält, versuche lokale Alternative zu finden
      if (image.url && (image.url.includes('api.together.ai/imgproxy') || image.url.includes('imgproxy'))) {
        console.log('Together imgproxy URL erkannt, versuche lokale Alternative zu finden');
        
        // Versuche, eine lokale ID aus anderen Eigenschaften des Bildes zu extrahieren
        let localImageId = '';
        
        // Wenn wir eine lokale ID haben, versuche den lokalen Download
        if (localImageId || id) {
          try {
            const imageIdToUse = localImageId || id.toString();
            console.log('Versuche fullquality Download mit ID:', imageIdToUse);
            const response = await fetch(`/api/images/${imageIdToUse}/fullquality`);
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${image.prompt ? image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : `bild_${id}`}_2048x2048.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              return;
            } else {
              console.error('Fehler beim fullquality Download:', await response.text());
            }
          } catch (fullQualityError) {
            console.error('Vollqualitätsversion nicht verfügbar:', fullQualityError);
          }
        }
      }
      
      if (isLocalImage) {
        // Extrahiere die Bild-ID aus der URL für lokale Bilder
        let imageId = '';
        try {
          const pathParts = image.url.split('/');
          const filename = pathParts[pathParts.length - 1];
          imageId = filename.split('.')[0]; // Entferne die Dateiendung
          console.log('Extrahierte Bild-ID aus URL:', imageId);
        } catch (e) {
          console.error('Fehler beim Extrahieren der Bild-ID:', e);
          imageId = id.toString();
        }
        
        // Verwende die extrahierte ID für die fullquality API
        try {
          console.log('Versuche fullquality Download mit ID:', imageId);
          const response = await fetch(`/api/images/${imageId}/fullquality`);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${image.prompt ? image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : `bild_${id}`}_2048x2048.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            return;
          } else {
            console.error('Fehler beim fullquality Download:', await response.text());
          }
        } catch (fullQualityError) {
          console.error('Vollqualitätsversion nicht verfügbar:', fullQualityError);
        }
        
        // Direkter Download als Fallback für lokale Bilder
        try {
          console.log('Versuche direkten Download der lokalen Datei:', image.url);
          const response = await fetch(image.url);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${image.prompt ? image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : `bild_${id}`}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            return;
          }
        } catch (localError) {
          console.error('Fehler beim Herunterladen des lokalen Bildes:', localError);
        }
      }
      
      // Versuche als nächstes, die hochauflösende Version zu erhalten (falls API verfügbar)
      try {
        console.log('Versuche highres API mit ID:', id);
        const response = await fetch(`/api/images/${id}/highres`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${image.prompt ? image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : `bild_${id}`}_highres.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          return;
        }
      } catch (highResError) {
        console.log('Hochauflösende Version nicht verfügbar:', highResError);
      }
      
      // Fallback zur Canvas-Methode für externe URLs
      if (image.url) {
        try {
          console.log('Versuche Canvas-Methode für:', image.url);
          // Canvas-Methode zum Umgehen von CORS und temporären URLs
          const img = new Image();
          img.crossOrigin = 'anonymous';  // Wichtig für CORS-Kompatibilität
          
          // Warte, bis das Bild geladen ist
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = image.url;
          });
          
          // Zeichne das Bild auf einen Canvas mit voller Auflösung
          const canvas = document.createElement('canvas');
          
          // Bestimme die optimale Größe für den Canvas
          // Um bessere Qualität zu erhalten, skalieren wir auf 2048x2048
          const targetWidth = 2048;
          const targetHeight = 2048;
          
          // Wenn das Bild stark vom Seitenverhältnis 1:1 abweicht, behalten wir das originale Seitenverhältnis bei
          const aspectRatio = img.width / img.height;
          
          // Setze Canvas-Größe basierend auf dem Seitenverhältnis
          if (Math.abs(aspectRatio - 1.0) < 0.1) {
            // Bei nahezu 1:1-Verhältnis setzen wir auf 2048x2048
            canvas.width = targetWidth;
            canvas.height = targetHeight;
          } else {
            // Bei anderen Seitenverhältnissen behalten wir das originale Verhältnis bei,
            // sorgen aber für eine Mindestgröße von 2048 Pixeln auf der längeren Seite
            if (aspectRatio > 1) {
              canvas.width = targetWidth;
              canvas.height = Math.round(targetWidth / aspectRatio);
            } else {
              canvas.height = targetHeight;
              canvas.width = Math.round(targetHeight * aspectRatio);
            }
          }
          
          console.log(`Originalbild: ${img.width}x${img.height}, Download-Größe: ${canvas.width}x${canvas.height}`);
          
          const ctx = canvas.getContext('2d');
          
          // Verwende eine bessere Interpolationsmethode für das Upscaling
          if (ctx) {
            // Hochwertige Skalierung aktivieren
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Zeichne das Bild mit der vollen Auflösung
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          
          // Konvertiere den Canvas in einen Blob mit höchster Qualität
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${image.prompt ? image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : `bild_${id}`}_2048x2048.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        } catch (canvasError) {
          console.error('Canvas-Methode fehlgeschlagen, versuche direkte Methode:', canvasError);
          
          // Als letzter Ausweg: Direkte Link-Methode
          console.log('Letzter Ausweg: Direkte Link-Methode für:', image.url);
          const a = document.createElement('a');
          a.href = image.url;
          a.download = `${image.prompt ? image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : `bild_${id}`}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        throw new Error('Keine Bild-URL vorhanden');
      }
    } catch (error) {
      console.error('Fehler beim Download:', error);
      alert('Das Bild konnte nicht heruntergeladen werden. Bitte versuchen Sie es später erneut.');
    }
  };

  // Neue Funktion: Überträgt den Textentwurf in den Blogbeitrag-Generator
  const sendToBlogGenerator = (id: number) => {
    // Finde den gewählten Textentwurf anhand der ID
    const text = textDrafts.find(item => item.id === id);
    if (!text) return;
    
    // Setze das aktive Tab auf 'blog'
    setActiveTab('blog');
    
    // Erstelle einen neuen BlogPostDraft-Entwurf mit dem Inhalt des Textentwurfs
    const newBlogPostDraft: BlogPostDraft = {
      prompt: text.content,
      htmlContent: "",
      metaTitle: "",
      metaDescription: "",
      modelId: selectedTextModel,
      createdAt: new Date()
    };
    
    // Aktualisiere den Store mit dem neuen BlogPostDraft
    setBlogPostDraft(newBlogPostDraft);
  };

  // Bei der Initialisierung der Komponente
  useEffect(() => {
    // Aktuelle Chat-ID aus dem StageHistoryStore laden
    const loadInitialImages = async () => {
      try {
        const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
        const currentChatId = useStageHistoryStore.getState().currentChatId;
        
        if (currentChatId) {
          // Lade nur Bilder, die zu diesem Chat gehören
          const images = await ImageStorageClient.getAllImages(currentChatId);
          console.log(`${images.length} Bilder für den aktuellen Chat geladen`);
        }
      } catch (error) {
        console.error('Fehler beim Laden der initialen Bilder:', error);
      }
    };
    
    loadInitialImages();
  }, []);

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
        {/* Tab Navigation */}
        <div className="bg-white border border-gray-200 rounded-full p-1 flex w-fit">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-[#2c2c2c] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <PencilIcon className="h-4 w-4" />
            Textentwürfe
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium transition-colors ${
              activeTab === 'images'
                ? 'bg-[#2c2c2c] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <PhotoIcon className="h-4 w-4" />
            Bildentwürfe
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium transition-colors ${
              activeTab === 'blog'
                ? 'bg-[#2c2c2c] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <SparklesIcon className="h-4 w-4" />
            Blogbeitrag-Generator
          </button>
        </div>

        {/* Text Drafts Section */}
        {activeTab === 'text' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Textentwürfe</h3>
              <div className="flex items-center">
                <button
                  onClick={handleRegenerateTexts}
                  className="p-2.5 bg-[#2c2c2c] hover:bg-[#1a1a1a] rounded-full transition-colors border border-[#2c2c2c] mr-3"
                  title="Alle Texte neu generieren"
                >
                  <ArrowPathIcon className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {textDrafts.map((draft) => (
                <div 
                  key={draft.id}
                  className="flex flex-col"
                >
                  <div
                    onClick={() => handleTextSelect(draft.id)}
                    className={`group relative rounded-t-2xl overflow-hidden cursor-pointer transition-all duration-200 border border-gray-100 ${
                      draft.isSelected
                        ? 'ring-2 ring-[#2c2c2c] shadow-lg'
                        : 'hover:ring-2 hover:ring-gray-400 hover:shadow-md'
                    }`}
                  >
                    <div className="p-5 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-gray-900 truncate">{draft.title || 'Unbenannter Text'}</h3>
                      </div>
                      
                      <div className="mb-3 text-xs text-gray-500">
                        {draft.contentType || 'Text'} {draft.styleVariant ? `(${draft.styleVariant})` : ''}
                      </div>
                      
                      <div className="h-36 overflow-y-auto text-sm text-gray-700 leading-relaxed">
                        {draft.content}
                      </div>
                      
                      {draft.tags && draft.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {draft.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {draft.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{draft.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPromptModal(draft.id, 'text');
                        }}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                        title="Text bearbeiten"
                      >
                        <PencilIcon className="h-4 w-4 text-gray-600" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Sende den Textentwurf an den Blogbeitrag-Generator
                          sendToBlogGenerator(draft.id);
                        }}
                        className="p-1.5 bg-black hover:bg-gray-800 rounded-full transition-colors border border-black"
                        title="An Blogbeitrag-Generator senden"
                      >
                        <PaperAirplaneIcon className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPromptModal(draft.id, 'text');
                    }}
                    className="p-3 bg-white border border-gray-100 rounded-b-2xl cursor-pointer hover:bg-gray-50"
                  >
                    <p className="text-sm text-gray-600 truncate" title={draft.content}>
                      {draft.content.length > 60 
                        ? `${draft.content.substring(0, 60)}...` 
                        : draft.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Klicken zum Bearbeiten</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Drafts Section */}
        {activeTab === 'images' && (
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
            
            {/* AI-Bilder Tab */}
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
                <div className="grid grid-cols-3 gap-6 mt-6">
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
                        {draft.status === 'pending' ? (
                          // Anzeige für noch nicht generierte Bilder
                          <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
                            <div className="text-gray-400 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-600 text-center mb-3">Bild noch nicht generiert</p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateImage(draft.id);
                              }}
                              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                            >
                              Bild generieren
                            </button>
                          </div>
                        ) : draft.status === 'generating' ? (
                          // Anzeige für Bilder im Generierungsprozess
                          <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
                            <div className="animate-spin text-gray-400 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-600 text-center">Bild wird generiert...</p>
                          </div>
                        ) : draft.status === 'error' ? (
                          // Anzeige für Fehler bei der Generierung
                          <div className="flex flex-col items-center justify-center h-full bg-red-50 p-4">
                            <div className="text-red-500 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <p className="text-sm text-red-600 text-center mb-3">Fehler bei der Generierung</p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateImage(draft.id);
                              }}
                              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                            >
                              Erneut versuchen
                            </button>
                          </div>
                        ) : (
                          // Anzeige für erfolgreich generierte Bilder
                          <img
                            src={draft.url}
                            alt={draft.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          {/* Ausgewählt-Label wurde entfernt */}
                          {draft.status !== 'pending' && draft.status !== 'generating' && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPromptModal(draft.id, 'image');
                                }}
                                className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                                title="Prompt bearbeiten"
                              >
                                <PencilIcon className="h-4 w-4 text-gray-600" />
                              </button>
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
                              {draft.status === 'completed' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadImage(draft.id);
                                  }}
                                  className="p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                                  title="Bild herunterladen"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {draft.prompt && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPromptModal(draft.id, 'image');
                          }}
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
        )}
        
        {/* Blogbeitrag-Generator Tab */}
        {activeTab === 'blog' && (
          <TextGeneratorPanel />
        )}
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
                  {snapshots.length > 0 && (
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
                {snapshots.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Keine Snapshots vorhanden!</p>
                  </div>
                ) : (
                  snapshots.map((snapshot) => (
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

      {/* Prompt Editor Modal */}
      {isPromptModalOpen && (
        <PromptEditor
          stageItemId={editingItemType === 'text' ? (currentTextId || 0) : (currentImageId || 0)}
          initialPrompt={editingPrompt}
          itemType={editingItemType}
          onSave={handleSavePrompt}
          onCancel={handleClosePromptModal}
        />
      )}
    </div>
  );
} 