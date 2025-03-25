'use client';

import { useState, useEffect } from 'react';
import { useKnowledge } from '@/app/wissen/KnowledgeContext';

interface KnowledgeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (categories: string[]) => void;
  selectedCategories: string[];
}

export default function KnowledgeSelector({ isOpen, onClose, onSelect, selectedCategories }: KnowledgeSelectorProps) {
  const { categories } = useKnowledge();
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(selectedCategories);

  useEffect(() => {
    if (isOpen && categories) {
      const categoryNames = categories.map(cat => cat.name);
      setAvailableCategories(categoryNames);
    }
  }, [isOpen, categories]);

  const handleSelect = (category: string) => {
    const newSelected = selected.includes(category)
      ? selected.filter(c => c !== category)
      : [...selected, category];
    setSelected(newSelected);
  };

  const handleSave = () => {
    onSelect(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Wissensbereiche auswählen
            </h3>
            <div className="max-h-96 overflow-y-auto">
              {availableCategories.map((category) => (
                <div
                  key={category}
                  className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => handleSelect(category)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(category)}
                    onChange={() => handleSelect(category)}
                    className="h-4 w-4 text-[#2c2c2c] border-gray-300 rounded focus:ring-[#2c2c2c]"
                  />
                  <div className="ml-3 flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm text-gray-900">{category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSave}
              className="w-full inline-flex justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-[#2c2c2c] text-base font-medium text-white hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c] sm:ml-3 sm:w-auto sm:text-sm"
            >
              Auswählen
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 