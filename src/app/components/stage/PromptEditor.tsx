'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PromptEditorProps {
  stageItemId: number;
  initialPrompt: string;
  itemType?: 'text' | 'image';
  onSave: (newPrompt: string) => void;
  onCancel: () => void;
}

export default function PromptEditor({
  stageItemId,
  initialPrompt,
  itemType = 'image',
  onSave,
  onCancel
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveClick = async () => {
    if (!prompt.trim()) {
      setError('Der Prompt darf nicht leer sein');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/stage-items/${stageItemId}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, itemType })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        onSave(prompt);
      } else {
        setError(data.error || 'Fehler beim Speichern des Prompts');
      }
    } catch (error) {
      console.error('Fehler:', error);
      setError('Netzwerkfehler beim Speichern des Prompts');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-medium text-gray-900">
            {itemType === 'text' ? 'Text bearbeiten' : 'Prompt bearbeiten'}
          </h2>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Schließen"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-gray-100 text-gray-900 rounded-lg border border-gray-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex-grow overflow-auto p-6 pt-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[300px] p-4 border border-gray-200 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#2c2c2c] focus:border-[#2c2c2c] resize-none font-normal"
            placeholder={
              itemType === 'text'
                ? 'Gib hier deinen Text ein...'
                : 'Gib hier deinen Bildprompt ein...'
            }
          />
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-full text-white text-sm font-medium transition-colors ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#2c2c2c] hover:bg-[#1a1a1a]'
            }`}
          >
            {isSaving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
} 