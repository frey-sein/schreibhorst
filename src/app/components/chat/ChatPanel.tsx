'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatService } from '@/lib/services/chat';
import { AnalyzerService } from '@/lib/services/analyzer';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';
import { useChatHistoryStore, type Message, type ChatHistory } from '@/lib/store/chatHistoryStore';
import ChatHistoryComponent from './ChatHistory';
import ChatMessages from './ChatMessages';
import { v4 as uuidv4 } from 'uuid';
import { DocumentService } from '@/lib/services/document/documentService';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Document, Paragraph } from 'docx';
import { ChatAnalyzer } from '@/lib/services/analyzer/chatAnalyzer';

// Verfügbare OpenRouter Modelle
const AVAILABLE_MODELS = [
  // OpenAI Modelle
  { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  
  // Anthropic Modelle
  { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { id: 'anthropic/claude-2.1', name: 'Claude 2.1' },
  { id: 'anthropic/claude-2', name: 'Claude 2' },
  
  // Google Modelle
  { id: 'google/gemini-pro', name: 'Gemini Pro' },
  { id: 'google/gemini-ultra', name: 'Gemini Ultra' },
  
  // Meta Modelle
  { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B' },
  { id: 'meta-llama/llama-2-13b-chat', name: 'Llama 2 13B' },
  { id: 'meta-llama/codellama-70b-instruct', name: 'CodeLlama 70B' },
  
  // Mistral Modelle
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B' },
  
  // Perplexity Modelle
  { id: 'perplexity/pplx-7b-online', name: 'Perplexity 7B Online' },
  { id: 'perplexity/pplx-70b-online', name: 'Perplexity 70B Online' },
  { id: 'perplexity/pplx-7b-chat', name: 'Perplexity 7B Chat' },
  { id: 'perplexity/pplx-70b-chat', name: 'Perplexity 70B Chat' }
];

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const processFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (fileType === 'text/plain' || fileExtension === 'txt') {
    return await file.text();
  } else if (fileType === 'application/pdf' || fileExtension === 'pdf') {
    // PDF-Verarbeitung hier implementieren
    throw new Error('PDF-Verarbeitung noch nicht implementiert');
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
             fileType === 'application/vnd.ms-excel' || 
             fileExtension === 'xlsx' || 
             fileExtension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
    return data.map(row => row.join('\t')).join('\n');
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             fileExtension === 'docx') {
    // Word-Dokumente werden vorerst nicht unterstützt
    throw new Error('Word-Dokumente werden derzeit nicht unterstützt');
  } else {
    throw new Error('Nicht unterstütztes Dateiformat');
  }
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'openai/gpt-3.5-turbo');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get prompt store functions
  const { addPrompt } = usePromptStore();
  const { addChat, updateChat, getChat } = useChatHistoryStore();

  const chatService = ChatService.getInstance();
  const analyzerService = new ChatAnalyzer();
  const documentService = DocumentService.getInstance();

  // Setze die initiale Willkommensnachricht
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Willkommen! Ich bin dein KI-Schreibassistent. Wie kann ich dir heute helfen?',
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  // Speichere Chat in der Historie
  useEffect(() => {
    if (messages.length > 0) {
      // Generiere einen sinnvollen Titel aus der Konversation
      let chatTitle = 'Neuer Chat';
      
      // Suche nach der ersten Benutzernachricht
      const firstUserMessage = messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        // Verwende die ersten 50 Zeichen der ersten Benutzernachricht
        chatTitle = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
      }
      
      const chat = {
        id: uuidv4(),
        title: chatTitle,
        messages: messages,
        lastUpdated: new Date(),
      };

      addChat(chat);
    }
  }, [messages, addChat]);

  // Lade Chat aus der Historie
  const handleSelectChat = (chatId: string) => {
    const chat = getChat(chatId);
    if (chat) {
      const messagesWithIds = chat.messages.map(msg => ({
        ...msg,
        id: uuidv4(),
      }));
      setMessages(messagesWithIds);
    }
  };

  // Function to manually trigger chat analysis
  const analyzeChat = async () => {
    if (messages.length < 2) {
      return; // Not enough messages to analyze
    }
    
    try {
      const results = await analyzerService.analyzeConversation(messages);
      if (results.length > 0) {
        // Füge die erste Analyse als Prompt hinzu
        handleSendToStage(results[0]);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || isUploading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(input.trim(), selectedModel);
      console.log('Received response:', response);
      
      if (response && response.trim()) {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response.trim(),
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Empty response received');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Entschuldigung, es gab ein Problem bei der Verarbeitung deiner Nachricht. Bitte versuche es später erneut.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a prompt to the stage
  const handleSendToStage = (prompt: AnalysisResult) => {
    addPrompt(prompt);
  };

  // Reset chat to initial state
  const handleNewChat = () => {
    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: 'Willkommen! Ich bin dein KI-Schreibassistent. Wie kann ich dir heute helfen?',
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput('');
  };

  const handleFileUpload = async (file: File) => {
    if (!file || isUploading) return;

    setIsUploading(true);
    try {
      const content = await processFile(file);
      const message: Message = {
        id: uuidv4(),
        role: 'user',
        content: content,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-1/2 bg-[#f0f0f0]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">Chat</h2>
            <p className="text-sm text-gray-500 mt-1">Deine Konversation mit dem KI-Assistenten</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="px-4 py-2 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={handleNewChat}
              className="px-4 py-2 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100"
            >
              Neuer Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        <ChatMessages messages={messages} />
      </div>

      {/* Chat History Sidebar */}
      {isHistoryOpen && (
        <>
          <div 
            className="fixed inset-0 bg-transparent" 
            onClick={() => setIsHistoryOpen(false)} 
          />
          <div className="fixed inset-y-0 right-0 w-96 bg-white/95 shadow-lg transform transition-transform duration-300 ease-in-out z-50">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Chat-Verlauf</h3>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatHistoryComponent 
                  onSelectChat={handleSelectChat} 
                  onClose={() => setIsHistoryOpen(false)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 bg-[#fafafa]">
        <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Schreibe deine Nachricht hier..."
                className="flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900 placeholder-gray-400"
                rows={3}
                disabled={isLoading || isUploading}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 cursor-pointer">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        handleFileUpload(file);
                      }
                    }}
                    className="hidden"
                    disabled={isLoading || isUploading}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                  </svg>
                </label>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || isUploading || !input.trim()}
                  className="flex items-center justify-center rounded-full bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={analyzeChat}
                  disabled={messages.length < 2 || isLoading || isUploading}
                  className="flex items-center justify-center rounded-full bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Chat analysieren"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-gray-900"
                disabled={isLoading || isUploading}
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 