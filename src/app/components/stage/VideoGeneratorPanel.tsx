'use client';

import { useState, useEffect } from 'react';
import { VideoDraft } from '@/types/stage';
import { useStageStore } from '@/lib/store/stageStore';
import { generateVideo, VideoGenerator, availableModels } from '@/lib/services/videoGenerator';
import PromptEditor from './PromptEditor';
import { 
  PlayIcon, 
  PauseIcon, 
  PencilIcon, 
  ArrowPathIcon, 
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface VideoGeneratorPanelProps {
  className?: string;
}

const VideoGeneratorPanel: React.FC<VideoGeneratorPanelProps> = ({ className }) => {
  const { 
    videoDrafts, 
    setVideoDrafts, 
    updateVideoDraft, 
    selectedVideoModel, 
    setSelectedVideoModel,
    getDefaultDuration,
    setDefaultDuration
  } = useStageStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentEditingId, setCurrentEditingId] = useState<number | null>(null);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Funktion zum Generieren eines Videos
  const handleGenerateVideo = async (id: number) => {
    const draft = videoDrafts.find(draft => draft.id === id);
    if (!draft || !draft.prompt) return;
    
    try {
      setIsGenerating(true);
      updateVideoDraft(id, { status: 'generating' });
      
      // Starte die Videogenerierung mit der Runway API
      const { jobId } = await generateVideo({
        prompt: draft.prompt,
        modelId: selectedVideoModel,
        duration: draft.duration
      });
      
      // Speichere die Job-ID im Draft
      updateVideoDraft(id, { jobId });
      
      // Starte Polling, um den Status zu überwachen
      startStatusPolling(id, jobId);
    } catch (error) {
      console.error('Fehler bei der Videogenerierung:', error);
      updateVideoDraft(id, { status: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const startStatusPolling = (id: number, jobId: string) => {
    // Bereinige vorherige Intervalle
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    
    const videoGenerator = VideoGenerator.getInstance();
    
    // Starte ein neues Polling-Intervall
    const interval = setInterval(async () => {
      try {
        const { status, outputUrl } = await videoGenerator.checkVideoStatus(jobId);
        
        if (status === 'completed' && outputUrl) {
          // Video ist fertig und URL ist verfügbar
          updateVideoDraft(id, { 
            status: 'completed', 
            url: outputUrl 
          });
          clearInterval(interval);
        } else if (status === 'failed') {
          // Generation fehlgeschlagen
          updateVideoDraft(id, { status: 'error' });
          clearInterval(interval);
        }
        // Bei 'processing' weiter warten...
      } catch (error) {
        console.error('Fehler beim Überprüfen des Videostatus:', error);
        updateVideoDraft(id, { status: 'error' });
        clearInterval(interval);
      }
    }, 3000); // Alle 3 Sekunden den Status überprüfen
    
    setStatusCheckInterval(interval);
  };
  
  // Aufräumen bei Komponenten-Unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);
  
  // Öffne den Prompt-Editor für ein Video
  const openPromptEditor = (id: number) => {
    const draft = videoDrafts.find(d => d.id === id);
    if (draft) {
      setCurrentPrompt(draft.prompt || '');
      setCurrentEditingId(id);
      setPromptEditorOpen(true);
    }
  };
  
  // Speichere den bearbeiteten Prompt
  const savePrompt = (newPrompt: string) => {
    if (currentEditingId !== null) {
      updateVideoDraft(currentEditingId, { prompt: newPrompt });
    }
    setPromptEditorOpen(false);
    setCurrentEditingId(null);
  };
  
  // Schließe den Prompt-Editor ohne zu speichern
  const closePromptEditor = () => {
    setPromptEditorOpen(false);
    setCurrentEditingId(null);
  };
  
  // Lösche ein Video-Draft
  const deleteVideoDraft = (id: number) => {
    setVideoDrafts(videoDrafts.filter(d => d.id !== id));
  };
  
  // Dupliziere ein Video-Draft
  const duplicateVideoDraft = (id: number) => {
    const draft = videoDrafts.find(d => d.id === id);
    if (!draft) return;
    
    const newId = Math.max(...videoDrafts.map(d => d.id), 0) + 1;
    const newDraft: VideoDraft = {
      ...JSON.parse(JSON.stringify(draft)),
      id: newId,
      status: 'pending',
      jobId: undefined,
      url: undefined
    };
    
    setVideoDrafts([...videoDrafts, newDraft]);
  };
  
  // Erstelle ein neues leeres Video-Draft
  const createNewVideoDraft = () => {
    const newId = Math.max(...videoDrafts.map(d => d.id), 0) + 1;
    const newDraft: VideoDraft = {
      id: newId,
      title: 'Neues Video',
      prompt: '',
      isSelected: false,
      modelId: selectedVideoModel,
      duration: 2, // 2 Sekunden Standard
      status: 'pending',
      tags: ['video'],
      contentType: 'video'
    };
    
    setVideoDrafts([...videoDrafts, newDraft]);
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-gray-900">Video-Generator</h2>
        <button
          onClick={createNewVideoDraft}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Neues Video
        </button>
      </div>
      
      {/* Modellauswahl */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Video-Modell
        </label>
        <div className="relative">
          <select
            value={selectedVideoModel}
            onChange={(e) => setSelectedVideoModel(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500
                     appearance-none text-gray-800 font-medium"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">Wähle das Modell für die Videogenerierung</p>
      </div>
      
      {/* Dauer-Einstellung */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Video-Dauer (Sekunden)
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtere die verfügbaren Dauern basierend auf dem ausgewählten Modell */}
          {[1, 2, 3, 4, 
            ...(selectedVideoModel.includes('gen-3') ? [5, 10] : [])
          ].map((duration) => (
            <button
              key={duration}
              onClick={() => {
                // Aktualisiere die Dauer bei allen ausgewählten Videos oder bei keinem ausgewählten Video
                const selectedDrafts = videoDrafts.filter(d => d.isSelected);
                if (selectedDrafts.length > 0) {
                  selectedDrafts.forEach(draft => {
                    updateVideoDraft(draft.id, { duration });
                  });
                } else {
                  // Setze Standard für neue Videos
                  setDefaultDuration(duration);
                }
              }}
              className={`px-4 py-2 border rounded-md transition-colors ${
                getDefaultDuration() === duration
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {duration}s
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Wähle die Dauer des generierten Videos
          {!selectedVideoModel.includes('gen-3') && 
            <span className="text-xs ml-1 text-gray-500"> (Längere Dauern sind nur mit Gen-3 Modellen verfügbar)</span>
          }
        </p>
      </div>
      
      {/* Video-Liste */}
      <div className="space-y-4">
        {videoDrafts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Keine Videos vorhanden. Erstelle ein neues Video oder analysiere den Chat.</p>
          </div>
        ) : (
          videoDrafts.map((draft) => (
            <div 
              key={draft.id} 
              className={`border rounded-lg p-5 transition-all ${
                draft.isSelected 
                  ? 'ring-2 ring-gray-800 shadow-md border-transparent'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => {
                const newDrafts = videoDrafts.map(d => ({
                  ...d,
                  isSelected: d.id === draft.id
                }));
                setVideoDrafts(newDrafts);
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{draft.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {draft.duration}s
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                      {availableModels.find(m => m.id === draft.modelId)?.name || draft.modelId}
                    </span>
                  </div>
                  
                  {draft.status === 'completed' && draft.url && (
                    <div className="mt-3 border border-gray-100 rounded-md overflow-hidden">
                      <video 
                        controls 
                        className="w-full max-h-[240px] rounded bg-gray-50"
                        src={draft.url}
                      >
                        Ihr Browser unterstützt das Video-Element nicht.
                      </video>
                    </div>
                  )}
                  
                  {draft.status === 'generating' && (
                    <div className="flex items-center space-x-2 mt-3 p-4 bg-gray-50 rounded-md border border-gray-100">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                      <span className="text-gray-700">Video wird generiert... (kann einige Minuten dauern)</span>
                    </div>
                  )}
                  
                  {draft.status === 'error' && (
                    <div className="flex items-center space-x-2 mt-3 p-4 bg-red-50 text-red-700 rounded-md border border-red-100">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>Bei der Generierung ist ein Fehler aufgetreten. Bitte versuche es erneut.</span>
                    </div>
                  )}
                  
                  {draft.status === 'pending' && (
                    <div className="flex items-center space-x-2 mt-3 p-4 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Video bereit zur Generierung. Bearbeite den Prompt und klicke auf "Generieren".</span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPromptEditor(draft.id);
                    }}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    title="Prompt bearbeiten"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateVideo(draft.id);
                    }}
                    disabled={draft.status === 'generating' || !draft.prompt}
                    className={`p-2 rounded-full transition-colors ${
                      draft.status === 'generating' || !draft.prompt
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="Video generieren"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateVideoDraft(draft.id);
                    }}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    title="Duplizieren"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVideoDraft(draft.id);
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Löschen"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {draft.prompt && (
                <div className="mt-3 p-4 bg-gray-50 rounded-md text-sm">
                  <div className="font-medium text-gray-800 mb-1">Prompt:</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{draft.prompt}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Prompt-Editor-Modal */}
      {promptEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Video-Prompt bearbeiten</h3>
            <p className="text-sm text-gray-600 mb-4">
              Beschreibe das Video, das du generieren möchtest. Detaillierte und klare Prompts führen zu besseren Ergebnissen.
            </p>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-1">Prompt-Tipps:</h4>
              <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                <li>Beschreibe visuelle Details: Farben, Objekte, Umgebung, Lichtverhältnisse</li>
                <li>Gib Kameraeinstellungen an: Nahaufnahme, Weitwinkel, Drohnenansicht, etc.</li>
                <li>Definiere Bewegungen: langsam, schnell, fließend, abrupt</li>
                <li>Bestimme den visuellen Stil: cineastisch, fotorealistisch, Animation, etc.</li>
                <li>Zeitliche Abläufe beschreiben: "Kamera zoomt ein", "das Objekt bewegt sich nach links"</li>
              </ul>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Beispiel-Prompts:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentPrompt("Luftaufnahme eines Waldes im Herbst, goldenes Laub, Sonnenlicht scheint durch die Bäume, die Kamera bewegt sich langsam über die Baumwipfel.")}
                  className="text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-left"
                >
                  Natur: Luftaufnahme eines Waldes im Herbst...
                </button>
                <button
                  onClick={() => setCurrentPrompt("Close-up einer Tasse, aus der Kaffee eingeschenkt wird, Dampf steigt auf, warmes Licht, cineastische Qualität, hochauflösend.")}
                  className="text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-left"
                >
                  Nahaufnahme: Tasse mit Kaffee...
                </button>
                <button
                  onClick={() => setCurrentPrompt("Zeitraffer einer Stadtstraße bei Nacht, Lichter der vorbeifahrenden Autos erzeugen Lichtspuren, moderne Architektur, dynamische Bewegung.")}
                  className="text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-left"
                >
                  Zeitraffer: Stadtstraße bei Nacht...
                </button>
                <button
                  onClick={() => setCurrentPrompt("POV durch einen fantastischen Wald, leuchtende Pilze am Wegrand, neblige Atmosphäre, mystisches blaues Licht in der Ferne, die Kamera bewegt sich vorwärts.")}
                  className="text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-left"
                >
                  POV: Fantastischer Wald...
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-800 mb-1" htmlFor="prompt-textarea">
                Dein Prompt:
              </label>
              <textarea
                id="prompt-textarea"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="w-full h-48 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                placeholder="Beschreibe das Video, das du generieren möchtest..."
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {currentPrompt.length} Zeichen - Empfohlen sind 50-200 Zeichen
                </span>
                <button
                  onClick={() => setCurrentPrompt("")}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={closePromptEditor}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => savePrompt(currentPrompt)}
                  disabled={!currentPrompt.trim()}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    !currentPrompt.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Speichern
                </button>
                <button
                  onClick={() => {
                    savePrompt(currentPrompt);
                    if (currentEditingId !== null) {
                      handleGenerateVideo(currentEditingId);
                    }
                  }}
                  disabled={!currentPrompt.trim()}
                  className={`px-4 py-2 rounded-md transition-colors flex items-center gap-1 ${
                    !currentPrompt.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Speichern & Generieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorPanel; 