'use client';

import { useState, useCallback } from 'react';
import { ChatService } from '@/lib/services/chat';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Willkommen! Ich bin dein KI-Schreibassistent. Wie kann ich dir heute helfen?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const chatService = new ChatService();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      let responseText = '';
      
      await chatService.streamMessage(
        message,
        messages.map(m => m.text),
        (chunk) => {
          responseText += chunk;
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.sender === 'ai') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, text: responseText },
              ];
            }
            return [
              ...prev,
              {
                id: prev.length + 1,
                text: responseText,
                sender: 'ai',
                timestamp: new Date(),
              },
            ];
          });
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          text: 'Entschuldigung, es gab ein Problem bei der Verarbeitung deiner Nachricht.',
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [message, messages, isLoading, chatService]);

  return (
    <div className="w-1/2 flex flex-col h-full bg-[#fafafa]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-light text-gray-900 tracking-tight">Kreativ-Chat</h2>
          <p className="text-sm text-gray-500 mt-1">Entwickle deine Ideen im Dialog</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 transition-all duration-200 ${
                msg.sender === 'user'
                  ? 'bg-[#2c2c2c] text-white'
                  : 'bg-white border border-gray-100 text-gray-700 shadow-sm hover:shadow-md'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              <p className={`text-xs mt-2 ${
                msg.sender === 'user' ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area - Fixed */}
      <div className="sticky bottom-0 bg-[#fafafa]">
        <form onSubmit={handleSubmit} className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Schreibe deine Idee..."
              className="flex-1 px-5 py-2.5 bg-white border border-gray-100 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Sendet...' : 'Senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 