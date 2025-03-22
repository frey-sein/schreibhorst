'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatService } from '@/lib/services/chat';
import { AnalyzerService } from '@/lib/services/analyzer';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';
import { useChatHistoryStore, type Message, type ChatHistory } from '@/lib/store/chatHistoryStore';
import ChatHistoryComponent from './ChatHistory';
import { v4 as uuidv4 } from 'uuid';
import { DocumentService } from '@/lib/services/document/documentService';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Document, Paragraph } from 'docx';
import { ChatAnalyzer } from '@/lib/services/analyzer/chatAnalyzer';
import { ChatBubbleLeftIcon, PaperClipIcon, PaperAirplaneIcon, SparklesIcon, PlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ChatMessage } from '@/types/chat';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'openai/gpt-3.5-turbo');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string>(uuidv4());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get prompt store functions
  const { addPrompt } = usePromptStore();
  const { addChat, updateChat, getChat } = useChatHistoryStore();

  const chatService = ChatService.getInstance();
  const analyzerService = new ChatAnalyzer();
  const documentService = DocumentService.getInstance();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Setze die Willkommensnachricht nach dem Mounten
    setMessages([
      {
        id: 'welcome',
        text: 'Hallo! Ich bin Ihr KI-Assistent. Wie kann ich Ihnen helfen?',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  // Speichere Chat in der Historie
  useEffect(() => {
    if (messages.length > 0) {
      // Generiere einen sinnvollen Titel aus der Konversation
      let chatTitle = 'Neuer Chat';
      
      // Suche nach der ersten Benutzernachricht
      const firstUserMessage = messages.find(msg => msg.sender === 'user');
      if (firstUserMessage) {
        // Verwende die ersten 50 Zeichen der ersten Benutzernachricht
        chatTitle = firstUserMessage.text.substring(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '');
      }
      
      const chat: ChatHistory = {
        id: currentChatId,
        title: chatTitle,
        messages: messages,
        lastUpdated: new Date(),
      };

      // Aktualisiere den bestehenden Chat oder füge einen neuen hinzu
      const existingChat = getChat(currentChatId);
      if (existingChat) {
        updateChat(currentChatId, chat);
      } else {
        addChat(chat);
      }
    }
  }, [messages, currentChatId, addChat, updateChat, getChat]);

  // Lade Chat aus der Historie
  const handleSelectChat = (chatId: string) => {
    const chat = getChat(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setIsHistoryOpen(false);
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isUploading) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await chatService.streamMessage(
        input.trim(),
        selectedModel,
        (chunk: string) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.sender === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, text: lastMessage.text + chunk }
              ];
            }
            return [
              ...prev,
              {
                id: Date.now().toString(),
                text: chunk,
                sender: 'assistant',
                timestamp: new Date().toISOString()
              }
            ];
          });
        },
        (error: Error) => {
          console.error('Chat error:', error);
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              text: `Entschuldigung, es gab ein Problem bei der Verarbeitung Ihrer Nachricht: ${error.message}`,
              sender: 'assistant',
              timestamp: new Date().toISOString()
            }
          ]);
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isUploading, selectedModel, chatService]);

  // Send a prompt to the stage
  const handleSendToStage = (prompt: AnalysisResult) => {
    addPrompt(prompt);
  };

  // Reset chat to initial state
  const handleNewChat = () => {
    const newChatId = uuidv4();
    setCurrentChatId(newChatId);
    setMessages([
      {
        id: 'welcome',
        text: 'Hallo! Ich bin Ihr KI-Assistent. Wie kann ich Ihnen helfen?',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }
    ]);
    setInput('');
  };

  const handleFileUpload = async (file: File) => {
    if (!file || isUploading) return;

    setIsUploading(true);
    try {
      const content = await processFile(file);
      const message: ChatMessage = {
        id: uuidv4(),
        text: content,
        sender: 'user',
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
    <div className="w-1/2 flex flex-col h-full bg-[#f0f0f0] relative">
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50">
          <ChatHistoryComponent
            onSelectChat={handleSelectChat}
            onClose={() => setIsHistoryOpen(false)}
          />
        </div>
      )}
      {/* Header */}
      <div className="sticky top-[64px] z-40 h-[120px] p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-light text-gray-900 tracking-tight">Chat</h2>
            <p className="text-xs lg:text-sm text-gray-500 mt-1 break-normal">Wählen Sie ein Modell und starten Sie die Konversation</p>
          </div>
          <div className="flex items-start space-x-3 shrink-0">
            <button
              onClick={handleNewChat}
              className="p-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100 shrink-0"
              title="Neuer Chat"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100 shrink-0"
              title="Chatverlauf"
            >
              <ClockIcon className="w-5 h-5" />
            </button>
            <div className="w-48 lg:w-64 shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm bg-white text-gray-900 font-medium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.5em_1.5em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236B7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M10%203a1%201%200%2001.707.293l3%203a1%201%200%2001-1.414%201.414L10%205.414%207.707%207.707a1%201%200%2001-1.414-1.414l3-3A1%201%200%200110%203zm-3.707%209.293a1%201%200%20011.414%200L10%2014.586l2.293-2.293a1%201%200%20011.414%201.414l-3%203a1%201%200%2001-1.414%200l-3-3a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id} className="text-gray-900">
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pb-36 space-y-6">
        {/* Chat-Nachrichten */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.sender === 'user'
                      ? 'bg-[#2c2c2c] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Action Bar - Fixed */}
      <div className="sticky bottom-0 z-40 bg-[#fafafa]">
        <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex gap-3">
            <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Schreiben Sie Ihre Nachricht..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm text-gray-900"
                disabled={isLoading}
              />
              <button
                type="button"
                className="p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                <PaperClipIcon className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 pr-4 text-[#2c2c2c] hover:text-[#1a1a1a] focus:outline-none disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
            <button
              onClick={analyzeChat}
              className={`px-5 py-2.5 bg-gradient-to-r from-[#2c2c2c] to-[#1a1a1a] text-white rounded-full hover:from-[#1a1a1a] hover:to-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium flex items-center space-x-2 ${
                messages.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={messages.length < 2}
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Analysieren</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 