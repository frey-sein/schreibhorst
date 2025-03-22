'use client';

import { useState, useCallback } from 'react';
import { ChatService } from '@/lib/services/chat';
import { AnalyzerService } from '@/lib/services/analyzer';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';

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
  const [analyzedPrompts, setAnalyzedPrompts] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<AnalysisResult | null>(null);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);

  // Get prompt store functions
  const { addPrompt } = usePromptStore();

  const chatService = new ChatService();
  const analyzerService = new AnalyzerService();

  // Function to manually trigger chat analysis
  const analyzeChat = async () => {
    if (messages.length < 2) {
      return; // Not enough messages to analyze
    }
    
    setIsAnalyzing(true);
    setShowAnalysisResults(true);
    
    try {
      const results = await analyzerService.analyzeConversation(messages);
      setAnalyzedPrompts(results);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

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

  // Send a prompt to the stage
  const handleSendToStage = (prompt: AnalysisResult) => {
    addPrompt(prompt);
    setSelectedPrompt(null);
  };

  // Close the analysis panel
  const closeAnalysisPanel = () => {
    setShowAnalysisResults(false);
    setSelectedPrompt(null);
  };

  return (
    <div className="w-1/2 flex flex-col h-full bg-[#fafafa]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-gray-900 tracking-tight">Kreativ-Chat</h2>
          <p className="text-sm text-gray-500 mt-1">Entwickle deine Ideen im Dialog</p>
        </div>
        <button
          onClick={analyzeChat}
          disabled={isAnalyzing || messages.length < 2}
          className={`px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium ${
            isAnalyzing || messages.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isAnalyzing ? 'Analysiere...' : 'Chat Analysieren'}
        </button>
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

      {/* Analysis Results Panel */}
      {showAnalysisResults && (
        <div className="p-4 border-t border-gray-100 bg-white/90">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              {isAnalyzing ? 'Analysiere Chat...' : 'Generierte Prompts'}
            </h3>
            <button 
              className="text-gray-400 hover:text-gray-600"
              onClick={closeAnalysisPanel}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {isAnalyzing ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2c2c2c]"></div>
            </div>
          ) : (
            analyzedPrompts.length > 0 ? (
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {analyzedPrompts.map((prompt, index) => (
                    <div 
                      key={index}
                      onClick={() => setSelectedPrompt(prompt)}
                      className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-all ${
                        selectedPrompt === prompt
                          ? 'bg-[#2c2c2c] text-white border-[#2c2c2c]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {prompt.type === 'text' ? '📝 ' : '🖼️ '}
                      {prompt.contentType ? `${prompt.contentType}: ` : ''}
                      {prompt.prompt.length > 25 
                        ? prompt.prompt.substring(0, 25) + '...' 
                        : prompt.prompt}
                    </div>
                  ))}
                </div>
                
                {selectedPrompt && (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-700">
                        {selectedPrompt.type === 'text' ? '📝 Text' : '🖼️ Bild'} 
                        {selectedPrompt.contentType ? ` (${selectedPrompt.contentType})` : ''}
                      </p>
                      <button
                        onClick={() => handleSendToStage(selectedPrompt)}
                        className="px-3 py-1 bg-[#2c2c2c] text-white text-xs rounded-full hover:bg-[#1a1a1a] transition-colors"
                      >
                        Zur Bühne senden
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{selectedPrompt.prompt}</p>
                    <p className="text-xs text-gray-500 mt-1">{selectedPrompt.sourceContext}</p>
                    {selectedPrompt.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedPrompt.tags.map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Keine Prompts gefunden. Versuche, mehr Details in deinem Chat zu besprechen.</p>
            )
          )}
        </div>
      )}

      {/* Input Area */}
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
  );
} 