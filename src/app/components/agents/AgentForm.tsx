'use client';

import { useState, useRef } from 'react';
import { Agent } from '@/types/agent';
import AvatarSelector from './AvatarSelector';

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

type Schedule = {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  days?: number[];
};

export default function AgentForm({ agent, onSubmit, onCancel }: AgentFormProps) {
  const [name, setName] = useState(agent?.name || '');
  const [title, setTitle] = useState(agent?.title || '');
  const [avatar, setAvatar] = useState(agent?.avatar || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [topics, setTopics] = useState<string[]>(agent?.topics || []);
  const [newTopic, setNewTopic] = useState('');
  const [sources, setSources] = useState<string[]>(agent?.sources || []);
  const [newSource, setNewSource] = useState('');
  const [schedule, setSchedule] = useState<Schedule>(agent?.schedule || {
    frequency: 'daily',
    time: '09:00',
    days: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      title,
      avatar,
      description,
      topics,
      sources,
      schedule
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics(topics.filter(topic => topic !== topicToRemove));
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSource.trim() && !sources.includes(newSource.trim())) {
      setSources([...sources, newSource.trim()]);
      setNewSource('');
    }
  };

  const handleRemoveSource = (sourceToRemove: string) => {
    setSources(sources.filter(source => source !== sourceToRemove));
  };

  const handleScheduleChange = (field: keyof Schedule, value: string) => {
    setSchedule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-6">
        <div className="flex-shrink-0">
          <AvatarSelector
            selectedAvatar={avatar}
            onSelect={setAvatar}
          />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-full border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] placeholder:text-gray-400"
              required
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titel / Rolle
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. KI-Recherche-Spezialist für Technologie"
              className="block w-full px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-full border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] placeholder:text-gray-400"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Aufgabenbeschreibung
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Beschreiben Sie die konkreten Aufgaben und Ziele des Agenten..."
          className="block w-full px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-2xl border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] placeholder:text-gray-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Themengebiete
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Neues Thema hinzufügen"
            className="block flex-1 px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-full border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleAddTopic}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-[#2c2c2c] hover:bg-[#2c2c2c]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c]"
          >
            Hinzufügen
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
            >
              {topic}
              <button
                type="button"
                onClick={() => handleRemoveTopic(topic)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quellen
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Neue Quelle hinzufügen"
            className="block flex-1 px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-full border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c] placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleAddSource}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-[#2c2c2c] hover:bg-[#2c2c2c]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c]"
          >
            Hinzufügen
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {sources.map((source) => (
            <span
              key={source}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
            >
              {source}
              <button
                type="button"
                onClick={() => handleRemoveSource(source)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Zeitplan
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="frequency" className="block text-xs font-medium text-gray-500 mb-1">
              Häufigkeit
            </label>
            <select
              id="frequency"
              value={schedule.frequency}
              onChange={(e) => handleScheduleChange('frequency', e.target.value)}
              className="block w-full px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-full border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c]"
            >
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
            </select>
          </div>
          <div>
            <label htmlFor="time" className="block text-xs font-medium text-gray-500 mb-1">
              Uhrzeit
            </label>
            <input
              type="time"
              id="time"
              value={schedule.time}
              onChange={(e) => handleScheduleChange('time', e.target.value)}
              className="block w-full px-4 py-3 text-base text-gray-900 bg-[#f4f4f4] rounded-full border-gray-300 shadow-sm focus:border-[#2c2c2c] focus:ring-[#2c2c2c]"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-full text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c]"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="px-6 py-3 border border-transparent rounded-full text-base font-medium text-white bg-[#2c2c2c] hover:bg-[#2c2c2c]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c]"
        >
          {agent ? 'Speichern' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
} 