'use client';

import { useState } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [messages] = useState<Message[]>([
    {
      id: 1,
      text: 'Willkommen! Ich bin dein KI-Schreibassistent. Wie kann ich dir heute helfen?',
      sender: 'ai',
      timestamp: new Date(),
    },
    {
      id: 2,
      text: 'Ich möchte eine Geschichte über einen Drachen schreiben.',
      sender: 'user',
      timestamp: new Date(),
    },
    {
      id: 3,
      text: 'Das ist eine tolle Idee! Lass uns gemeinsam eine fesselnde Geschichte entwickeln. Möchtest du, dass der Drache eher freundlich oder gefährlich ist?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  return (
    <div className="w-1/2 flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Kreativ-Chat</h2>
        <p className="text-sm text-gray-500">Entwickle deine Ideen im Dialog</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p>{msg.text}</p>
              <p className="text-xs mt-1 opacity-70">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Schreibe deine Idee..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
            Senden
          </button>
        </div>
      </div>
    </div>
  );
} 