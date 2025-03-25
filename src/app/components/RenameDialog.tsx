import { useState, useEffect } from 'react';

interface RenameDialogProps {
  initialName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export default function RenameDialog({ initialName, onConfirm, onCancel }: RenameDialogProps) {
  const [newName, setNewName] = useState(initialName);

  // Fokussiere das Eingabefeld, wenn der Dialog geöffnet wird
  useEffect(() => {
    const inputElement = document.getElementById('rename-input');
    if (inputElement) {
      inputElement.focus();
      
      // Setze den Cursor ans Ende des Textes
      const inputLength = initialName.length;
      (inputElement as HTMLInputElement).setSelectionRange(inputLength, inputLength);
    }
  }, [initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onConfirm(newName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium mb-4">Element umbenennen</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="rename-input" className="block text-sm font-medium text-gray-700 mb-1">
              Neuer Name
            </label>
            <input
              id="rename-input"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel();
              }}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2c2c2c] text-white rounded-md hover:bg-[#1a1a1a]"
            >
              Umbenennen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 