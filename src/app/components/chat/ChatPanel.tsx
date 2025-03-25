'use client';

import { useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { ChatService } from '@/lib/services/chat';
import { AnalyzerService } from '@/lib/services/analyzer';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult } from '@/lib/services/analyzer/chatAnalyzer';
import { useChatHistoryStore, type Message as HistoryMessage, type ChatHistory } from '@/lib/store/chatHistoryStore';
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
import ReactMarkdown from 'react-markdown';

interface AnalyzerMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Verfügbare OpenRouter Modelle
const AVAILABLE_MODELS = [
  // OpenAI Modelle
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  
  // Anthropic Modelle
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'anthropic/claude-2.1', name: 'Claude 2.1' },
  { id: 'anthropic/claude-2', name: 'Claude 2' },
  
  // Google Modelle
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
  { id: 'google/gemini-pro', name: 'Gemini Pro' },
  { id: 'google/gemini-ultra', name: 'Gemini Ultra' },
  
  // Meta Modelle
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
  { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B' },
  { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B' },
  { id: 'meta-llama/llama-2-13b-chat', name: 'Llama 2 13B' },
  { id: 'meta-llama/codellama-70b-instruct', name: 'CodeLlama 70B' },
  
  // Mistral Modelle
  { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo' },
  { id: 'mistralai/codestral-2501', name: 'Codestral 2501' },
  { id: 'mistralai/mistral-8b', name: 'Mistral 8B' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B' },
  
  // Perplexity Modelle
  { id: 'perplexity/sonar', name: 'Perplexity Sonar' },
  { id: 'perplexity/llama-3.1-sonar-8b', name: 'Perplexity Llama 3.1 Sonar 8B' },
  { id: 'perplexity/llama-3.1-sonar-70b', name: 'Perplexity Llama 3.1 Sonar 70B' },
  { id: 'perplexity/llama-3.1-sonar-8b-online', name: 'Perplexity Llama 3.1 Sonar 8B Online' },
  { id: 'perplexity/llama-3.1-sonar-70b-online', name: 'Perplexity Llama 3.1 Sonar 70B Online' },
  { id: 'perplexity/llama-3.1-sonar-405b-online', name: 'Perplexity Llama 3.1 Sonar 405B Online' },
  { id: 'perplexity/sonar-reasoning', name: 'Perplexity Sonar Reasoning' },
  { id: 'perplexity/r1-1776', name: 'Perplexity R1 1776' },
  
  // Microsoft Modelle
  { id: 'microsoft/phi-4', name: 'Microsoft Phi-4' },
  
  // Qwen Modelle
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
  { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B' },
  
  // Amazon Modelle
  { id: 'amazon/nova-lite-v1', name: 'Amazon Nova Lite' },
  { id: 'amazon/nova-micro-v1', name: 'Amazon Nova Micro' },
  
  // Deepseek Modelle
  { id: 'deepseek/deepseek-r1', name: 'Deepseek R1' },
  
  // Cohere Modelle
  { id: 'cohere/command-r-08-2024', name: 'Cohere Command R' }
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
  const [selectedModel, setSelectedModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'openai/gpt-4-turbo-preview');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<AnalysisResult[]>([]);

  // Get prompt store functions
  const { addPrompt } = usePromptStore();
  const { addChat, updateChat, getChat, getAllChats } = useChatHistoryStore();

  const chatService = ChatService.getInstance();
  const analyzerService = new ChatAnalyzer();
  const documentService = DocumentService.getInstance();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Laden des letzten aktiven Chats oder Erstellen eines neuen Chats
  useEffect(() => {
    const loadChat = () => {
      // Versuche aus dem localStorage den letzten aktiven Chat zu laden
      const lastActiveChatId = localStorage.getItem('lastActiveChatId');
      
      if (lastActiveChatId) {
        const chat = getChat(lastActiveChatId);
        if (chat) {
          // Wenn der Chat existiert, stelle ihn wieder her
          setCurrentChatId(lastActiveChatId);
          const convertedMessages: ChatMessage[] = chat.messages.map(msg => ({
            id: msg.id,
            text: msg.content,
            sender: msg.role,
            timestamp: msg.timestamp
          }));
          setMessages(convertedMessages);
          return true;
        }
      }
      
      // Wenn kein Chat geladen wurde, prüfe ob es bereits Chats gibt
      const allChats = getAllChats();
      if (allChats.length > 0) {
        // Wenn es Chats gibt, lade den neuesten
        const newestChat = allChats.sort((a: ChatHistory, b: ChatHistory) => 
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        )[0];
        
        setCurrentChatId(newestChat.id);
        const convertedMessages: ChatMessage[] = newestChat.messages.map((msg: HistoryMessage) => ({
          id: msg.id,
          text: msg.content,
          sender: msg.role,
          timestamp: msg.timestamp
        }));
        setMessages(convertedMessages);
        // Speicher die Chat-ID im localStorage
        localStorage.setItem('lastActiveChatId', newestChat.id);
        return true;
      }
      
      return false;
    };
    
    // Wenn kein bestehender Chat geladen werden konnte, erstelle einen neuen
    if (!loadChat()) {
      const newChatId = uuidv4();
      setCurrentChatId(newChatId);
      setMessages([
        {
          id: 'welcome',
          text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
          sender: 'assistant',
          timestamp: new Date().toISOString()
        }
      ]);
      // Speicher die neue Chat-ID im localStorage
      localStorage.setItem('lastActiveChatId', newChatId);
    }
  }, [getChat, getAllChats]);

  // Speichere die aktuelle Chat-ID im localStorage, wenn sie sich ändert
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('lastActiveChatId', currentChatId);
    }
  }, [currentChatId]);

  // Lade Chat aus der Historie
  const handleSelectChat = (chatId: string) => {
    const chat = getChat(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      // Konvertiere die Message-Objekte in das richtige Format
      const convertedMessages: ChatMessage[] = chat.messages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role,
        timestamp: msg.timestamp
      }));
      setMessages(convertedMessages);
      setIsHistoryOpen(false);
      // Speicher die Chat-ID im localStorage
      localStorage.setItem('lastActiveChatId', chatId);
    }
  };

  // Speichere Chat in der Historie
  useEffect(() => {
    if (messages.length > 0) {
      let chatTitle = 'Neuer Chat';
      const firstUserMessage = messages.find(msg => msg.sender === 'user');
      if (firstUserMessage) {
        chatTitle = firstUserMessage.text.substring(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '');
      }
      
      // Konvertiere die Messages in das Format für die Historie
      const convertedMessages: HistoryMessage[] = messages.map(msg => ({
        id: msg.id,
        content: msg.text,
        role: msg.sender,
        timestamp: msg.timestamp
      }));
      
      const chat: ChatHistory = {
        id: currentChatId,
        title: chatTitle,
        messages: convertedMessages,
        lastUpdated: new Date(),
      };

      const existingChat = getChat(currentChatId);
      if (existingChat) {
        updateChat(currentChatId, chat);
      } else {
        addChat(chat);
      }
    }
  }, [messages, currentChatId, addChat, updateChat, getChat]);

  // Function to manually trigger chat analysis
  const analyzeChat = async () => {
    if (messages.length < 2) {
      return;
    }
    
    try {
      const analyzerMessages = messages.map(msg => ({
        id: parseInt(msg.id),
        text: msg.text,
        sender: msg.sender === 'user' ? 'user' : 'ai' as const,
        timestamp: new Date(msg.timestamp)
      })) as AnalyzerMessage[];
      
      const results = await analyzerService.analyzeConversation(analyzerMessages);
      if (results.length > 0) {
        const analysisMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `✨ Basierend auf unserer Konversation habe ich folgende Vorschläge für die Weiterarbeit:

${results.map((result, index) => `
### ${result.type === 'text' ? '📝' : '🎨'} Vorschlag ${index + 1}
---

**Typ:** ${result.type === 'text' ? 'Text' : 'Bild'}

**Prompt:**
${result.prompt}

**Kontext:**
${result.sourceContext}

**Tags:**
${result.tags.map(tag => `#${tag}`).join(' ')}

[Auswählen](${index})

---`).join('\n\n')}

💡 Wähle die Vorschläge aus, die du auf die Stage übertragen möchtest.`,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, analysisMessage]);
        setSelectedSuggestions([]);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: '❌ Entschuldigung, bei der Analyse ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Funktion zum Verarbeiten von Klicks auf Links in Nachrichten
  const handleMessageClick = (message: ChatMessage, linkText: string) => {
    if (linkText.startsWith('Auswählen')) {
      const index = parseInt(linkText.match(/\((\d+)\)/)?.[1] || '');
      if (!isNaN(index)) {
        const results = message.text
          .split('\n\n')
          .filter(line => line.match(/^\d+\./))
          .map(line => {
            const type = line.includes('Text') ? 'text' : 'image';
            const prompt = line.split(': ')[1].split('\n')[0];
            const sourceContext = line.split('Kontext: ')[1].split('\n')[0];
            const tags = line.split('Tags: ')[1].split('\n')[0].split(', ');
            return {
              type,
              prompt,
              sourceContext,
              tags,
              confidence: 0.8 // Standardwert für die Konfidenz
            } as AnalysisResult;
          });

        if (results[index]) {
          const suggestion = results[index];
          setSelectedSuggestions(prev => {
            const isSelected = prev.some(s => s.prompt === suggestion.prompt);
            if (isSelected) {
              return prev.filter(s => s.prompt !== suggestion.prompt);
            } else {
              return [...prev, suggestion];
            }
          });
        }
      }
    }
  };

  // Funktion zum Senden der ausgewählten Vorschläge
  const handleSendSelectedSuggestions = () => {
    selectedSuggestions.forEach(suggestion => {
      handleSendToStage(suggestion);
    });
    
    // Füge eine Bestätigungsnachricht hinzu
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      text: `✅ ${selectedSuggestions.length} Vorschläge wurden auf die Stage übertragen.`,
      sender: 'assistant',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, confirmationMessage]);
    setSelectedSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
        text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
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
      <div className="flex-1 overflow-y-auto p-6 pt-20 space-y-3 pb-36">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    message.sender === 'user'
                      ? 'bg-[#2c2c2c] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div 
                    className="whitespace-pre-wrap text-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'A') {
                        e.preventDefault();
                        handleMessageClick(message, target.textContent || '');
                      }
                    }}
                  >
                    <ReactMarkdown
                      components={{
                        h3: ({ children }: { children: ReactNode }) => (
                          <h3 className="text-lg font-semibold mb-2 bg-gray-50 p-2 rounded-lg">{children}</h3>
                        ),
                        p: ({ children }: { children: ReactNode }) => (
                          <p className="mb-1 leading-snug">{children}</p>
                        ),
                        strong: ({ children }: { children: ReactNode }) => (
                          <strong className="font-semibold text-gray-700">{children}</strong>
                        ),
                        a: ({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void }) => (
                          <a
                            href={href}
                            onClick={onClick}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${
                              selectedSuggestions.some(s => s.prompt === children?.toString().match(/\((\d+)\)/)?.[1])
                                ? 'bg-[#2c2c2c] text-white hover:bg-[#1a1a1a]'
                                : 'bg-[#2c2c2c] text-white hover:bg-[#1a1a1a]'
                            } focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20`}
                          >
                            {selectedSuggestions.some(s => s.prompt === children?.toString().match(/\((\d+)\)/)?.[1])
                              ? '✓ Ausgewählt'
                              : '+ Auswählen'}
                          </a>
                        ),
                        hr: () => (
                          <hr className="my-2 border-gray-200" />
                        )
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
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
                placeholder="Schreibe deine Nachricht..."
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
              className={`px-5 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100 flex items-center space-x-2 ${
                messages.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={messages.length < 2}
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Analysieren</span>
            </button>
            {selectedSuggestions.length > 0 && (
              <button
                onClick={handleSendSelectedSuggestions}
                className="px-5 py-2.5 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium flex items-center space-x-2"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>{selectedSuggestions.length} Vorschläge senden</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 