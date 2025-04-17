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
    setSelectedVideoModel 
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video-Modell
        </label>
        <select
          value={selectedVideoModel}
          onChange={(e) => setSelectedVideoModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
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
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium">{draft.title}</h3>
                  {draft.status === 'completed' && draft.url && (
                    <div className="mt-2">
                      <video 
                        controls 
                        className="w-full max-h-[200px] rounded"
                        src={draft.url}
                      >
                        Ihr Browser unterstützt das Video-Element nicht.
                      </video>
                    </div>
                  )}
                  
                  {draft.status === 'generating' && (
                    <div className="flex items-center space-x-2 mt-2 text-gray-600">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                      <span>Generiere Video...</span>
                    </div>
                  )}
                  
                  {draft.status === 'error' && (
                    <div className="text-red-500 mt-2">
                      Bei der Generierung ist ein Fehler aufgetreten. Bitte versuche es erneut.
                    </div>
                  )}
                  
                  {draft.status === 'pending' && (
                    <div className="text-gray-500 mt-2">
                      Klicke auf "Generieren", um das Video zu erstellen.
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => openPromptEditor(draft.id)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Prompt bearbeiten"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleGenerateVideo(draft.id)}
                    disabled={draft.status === 'generating' || !draft.prompt}
                    className={`p-1.5 rounded transition-colors ${
                      draft.status === 'generating' || !draft.prompt
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="Video generieren"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => duplicateVideoDraft(draft.id)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Duplizieren"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteVideoDraft(draft.id)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                    title="Löschen"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {draft.prompt && (
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium mb-1">Prompt:</div>
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
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full">
            <h3 className="text-lg font-medium mb-4">Video-Prompt bearbeiten</h3>
            <textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-48 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="Beschreibe das Video, das du generieren möchtest..."
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={closePromptEditor}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
              >
                Abbrechen
              </button>
              <button
                onClick={() => savePrompt(currentPrompt)}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorPanel; 