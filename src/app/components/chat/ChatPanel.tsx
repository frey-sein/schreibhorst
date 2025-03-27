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
import { ChatBubbleLeftIcon, PaperClipIcon, PaperAirplaneIcon, SparklesIcon, PlusIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DEEP_RESEARCH_MODELS } from '@/lib/constants/chat';
import ReactMarkdown from 'react-markdown';

// Erweiterte ChatMessage-Definition mit 'system' als möglichem Sender
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
}

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

// Die unterstützten Vision-Modelle
const VISION_MODELS = [
  'openai/gpt-4-vision-preview',
  'openai/gpt-4o',
  'anthropic/claude-3-opus',
  'anthropic/claude-3-sonnet',
  'anthropic/claude-3-haiku',
  'anthropic/claude-3.5-sonnet'
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
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<AnalysisResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModelSelectionDialog, setShowModelSelectionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState<boolean>(false);
  const [aborted, setAborted] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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

  // Lade gespeicherte Nachrichten beim Start
  useEffect(() => {
    const initializeStore = async () => {
      try {
        console.log('Initialisiere Chat-Speicher...');
        
        // Lade Daten aus dem ChatService in den lokalen State
        await chatService.loadFromLocalStorage(currentChatId);
        const serviceMessages = chatService.getMessageHistory(currentChatId);
        
        if (serviceMessages.length > 0) {
          console.log('Setze Nachrichten aus ChatService:', serviceMessages);
          setMessages(serviceMessages);
        } else {
          // Erstelle Willkommensnachricht
          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
            sender: 'assistant',
            timestamp: new Date().toISOString()
          };
          setMessages([welcomeMessage]);
          chatService.setMessageHistory(currentChatId, [welcomeMessage]);
        }
      } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
        // Fallback auf Default-Werte
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    };
    
    if (currentChatId) {
      initializeStore();
    }
  }, [currentChatId]);

  // Speichere Nachrichten bei Änderungen
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      // Synchronisiere den ChatService
      chatService.setMessageHistory(currentChatId, messages);
      
      // Speichere in localStorage
      chatService.saveToLocalStorage(currentChatId);
      console.log('Nachrichten in ChatService und localStorage aktualisiert');
    }
  }, [messages, currentChatId]);

  // Lade Chat aus der Historie
  const handleSelectChat = (chatId: string) => {
    // Speichere den aktuellen Chat vor dem Wechsel
    if (currentChatId) {
      chatService.saveToLocalStorage(currentChatId);
    }
    
    // Setze den neuen Chat
    setCurrentChatId(chatId);
    
    // Lade die Nachrichten für den neuen Chat
    const chatMessages = chatService.getMessageHistory(chatId);
    
    // Aktualisiere die Nachrichten im UI
    if (chatMessages.length > 0) {
      setMessages(chatMessages);
    } else {
      // Erstelle Willkommensnachricht
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      chatService.setMessageHistory(chatId, [welcomeMessage]);
    }
    
    // Schließe den Chatverlauf-Dialog
    setIsHistoryOpen(false);
    
    // Speichere die Chat-ID im localStorage
    localStorage.setItem('lastActiveChatId', chatId);
    console.log(`Gewechselt zu Chat ${chatId}`);
  };

  // Funktion für neuen Chat
  const handleNewChat = () => {
    // Generiere eine neue Chat-ID
    const newChatId = `chat_${Date.now()}`;
    
    // Speichere den aktuellen Chat vor dem Wechsel
    if (currentChatId) {
      chatService.saveToLocalStorage(currentChatId);
    }
    
    // Setze die neue Chat-ID
    setCurrentChatId(newChatId);
    
    // Initialisiere mit Willkommensnachricht
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
      sender: 'assistant',
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
    
    // Initialisiere den neuen Chat im Service
    chatService.setMessageHistory(newChatId, [welcomeMessage]);
    
    // Setze ihn als aktuellen Chat im localStorage
    localStorage.setItem('lastActiveChatId', newChatId);
    
    // Schließe den Chatverlauf-Dialog
    setIsHistoryOpen(false);
    
    console.log(`Neuer Chat erstellt: ${newChatId}`);
  };

  // Automatischer Fokus auf das Eingabefeld nach einer Antwort
  useEffect(() => {
    // Warte einen kurzen Moment, damit die UI aktualisiert werden kann
    const timer = setTimeout(() => {
      // Nur fokussieren, wenn wir nicht mehr laden und das letzte Element keine Benutzernachricht ist
      if (!isLoading && messages.length > 0 && messages[messages.length - 1].sender !== 'user') {
        inputRef.current?.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, isLoading]); // Reagiere auf Änderungen an messages oder isLoading

  // Speichere Nachrichten bei Änderungen
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
      chatService.setMessageHistory(currentChatId, messages);
    }
  }, [messages, currentChatId]);

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
    if (messages.length < 15) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: '❌ Es werden mindestens 15 Nachrichten für eine sinnvolle Analyse benötigt.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
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
      
      // Wenn keine gültigen Ergebnisse vorhanden sind, zeige Feedback
      if (results.length === 1 && !results[0].prompt) {
        const feedbackMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `📝 Analyse-Feedback:

### Aktueller Status
- EEAT-Score: ${Math.round((results[0].eeatScore || 0) * 100)}%
- Geschätzte Wortanzahl: ${results[0].wordEstimate || 0} Wörter

### Fehlende Informationen
${results[0].requiredContext?.map(ctx => `- ${ctx}`).join('\n') || 'Keine spezifischen Anforderungen'}

### Empfehlungen
- Vertiefen Sie die Diskussion mit mehr Fachdetails
- Fügen Sie konkrete Beispiele hinzu
- Beschreiben Sie den Kontext genauer
- Stellen Sie sicher, dass alle wichtigen Aspekte behandelt werden

Sobald diese Punkte erfüllt sind, können wir hochwertigen Content generieren.`,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, feedbackMessage]);
        return;
      }

      // Wenn gültige Ergebnisse vorhanden sind, zeige sie an
      if (results.length > 0) {
        const analysisMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `✨ Basierend auf unserer Konversation habe ich folgende Vorschläge für die Content-Generierung:

${results.map((result, index) => `
<div class="bg-gray-50 rounded-lg p-4 my-4">
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center space-x-2">
      ${result.type === 'text' 
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'}
      <span class="font-medium">${result.contentType || (result.type === 'text' ? 'Textvorschlag' : 'Bildvorschlag')} ${index + 1}</span>
    </div>
    <div class="flex items-center space-x-2">
      <span class="text-sm text-gray-500">${Math.round((result.eeatScore || 0) * 100)}% EEAT</span>
      <span class="text-sm text-gray-500">${result.wordEstimate || 0} Wörter</span>
    </div>
  </div>

  <div class="mb-3">
    <div class="text-sm text-gray-700 whitespace-pre-wrap">${result.prompt}</div>
  </div>

  <div class="flex flex-wrap gap-2 mb-3">
    ${result.tags.map(tag => `
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        #${tag}
      </span>
    `).join('')}
  </div>

  <div class="flex items-center justify-between mt-4">
    <div class="text-sm text-gray-500">
      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      Kontext: ${result.sourceContext}
    </div>
    <button onclick="selectSuggestion(${index})" class="select-suggestion-btn inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2c2c]">
      <span class="suggestion-text">Auswählen</span>
      <svg class="suggestion-check ml-1.5 w-4 h-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </button>
  </div>
</div>
`).join('')}`,
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
        text: '❌ Bei der Analyse ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Funktion zum Verarbeiten von Klicks auf Links in Nachrichten
  const handleMessageClick = (message: ChatMessage, element: HTMLElement) => {
    if (element.classList.contains('select-suggestion-btn')) {
      const index = parseInt(element.getAttribute('data-index') || '');
      if (!isNaN(index)) {
        const suggestion = message.text
          .split('Vorschlag')
          .slice(1)
          .map(section => {
            const type = section.includes('Textvorschlag') ? 'text' : 'image';
            const promptMatch = section.match(/whitespace-pre-wrap">(.*?)<\/div>/s);
            const sourceContextMatch = section.match(/Kontext: (.*?)<\/div>/);
            const tagsMatch = section.match(/#(\w+)/g);
            
            return {
              type,
              prompt: promptMatch ? promptMatch[1].trim() : '',
              sourceContext: sourceContextMatch ? sourceContextMatch[1].trim() : '',
              tags: tagsMatch ? tagsMatch.map(tag => tag.slice(1)) : [],
              confidence: 0.8
            } as AnalysisResult;
          })[index];

        if (suggestion) {
          setSelectedSuggestions(prev => {
            const isSelected = prev.some(s => s.prompt === suggestion.prompt);
            if (isSelected) {
              element.classList.remove('bg-[#2c2c2c]', 'text-white');
              element.classList.add('bg-white', 'text-gray-700');
              const checkIcon = element.querySelector('.suggestion-check');
              const text = element.querySelector('.suggestion-text');
              if (checkIcon) checkIcon.classList.add('hidden');
              if (text) text.textContent = 'Auswählen';
              return prev.filter(s => s.prompt !== suggestion.prompt);
            } else {
              element.classList.remove('bg-white', 'text-gray-700');
              element.classList.add('bg-[#2c2c2c]', 'text-white');
              const checkIcon = element.querySelector('.suggestion-check');
              const text = element.querySelector('.suggestion-text');
              if (checkIcon) checkIcon.classList.remove('hidden');
              if (text) text.textContent = 'Ausgewählt';
              return [...prev, suggestion];
            }
          });
        }
      }
    }
  };

  // Funktion zum Senden der ausgewählten Vorschläge
  const handleSendSelectedSuggestions = async () => {
    selectedSuggestions.forEach(async (suggestion) => {
      await handleSendToStage(suggestion);
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

  // Setze initialen Fokus auf das Input-Feld
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || isUploading) return;

    // Aborted-Status zurücksetzen
    setAborted(false);

    // Neuen AbortController erstellen
    const controller = new AbortController();
    setAbortController(controller);

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
          // Prüfen, ob es sich um einen AbortError handelt
          if (error.name === 'AbortError' || error.message === 'AbortError') {
            console.log('Anfrage wurde abgebrochen');
            // Wir setzen keine Fehlermeldung, da wir bereits eine Abbruchmeldung im handleAbort setzen
          } else {
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
        },
        currentChatId,
        deepResearchEnabled,
        { signal: controller.signal } // Übergebe das Signal an die API
      );
    } catch (error: any) {
      // Prüfen, ob es sich um einen AbortError handelt
      if (error.name === 'AbortError' || error.message === 'AbortError') {
        console.log('Anfrage wurde abgebrochen');
        // Wir setzen keine Fehlermeldung, da wir bereits eine Abbruchmeldung im handleAbort setzen
      } else {
        console.error('Chat error:', error);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            text: `Entschuldigung, es gab ein Problem bei der Verarbeitung Ihrer Nachricht: ${error.message || 'Unbekannter Fehler'}`,
            sender: 'assistant',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      // Setze den Fokus zurück auf das Input-Feld
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [input, isLoading, isUploading, selectedModel, chatService, currentChatId, deepResearchEnabled]);

  // Send a prompt to the stage
  const handleSendToStage = (prompt: AnalysisResult) => {
    addPrompt(prompt);
  };

  // Diese Funktion ist für die direkte Textnachrichtenverarbeitung
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Neuen AbortController erstellen
    const controller = new AbortController();
    setAbortController(controller);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      text: text,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Füge die Benutzernachricht zum UI hinzu
    setMessages(prev => [...prev, userMessage]);

    setIsLoading(true);
    setAborted(false);
    
    try {
      console.log('Sende Nachricht an API:', text);
      console.log('Deep Research Modus:', deepResearchEnabled ? 'Aktiv' : 'Inaktiv');

      // Anpassen des Aufrufs basierend auf der API-Signatur
      const botResponse = await chatService.sendMessage(
        text, 
        selectedModel, 
        currentChatId, 
        deepResearchEnabled
      );

      // Der API-Aufruf wurde während der Antwort geprüft
      if (aborted) {
        console.log('Operation wurde abgebrochen');
        return;
      }

      const aiMessage: ChatMessage = {
        id: uuidv4(),
        text: botResponse.trim(),
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Speichere den Chat in der Historie
      const chatMessages: HistoryMessage[] = [
        ...messages.map(msg => ({
          id: msg.id,
          content: msg.text,
          role: msg.sender,
          timestamp: msg.timestamp
        })),
        {
          id: userMessage.id,
          content: userMessage.text,
          role: userMessage.sender,
          timestamp: userMessage.timestamp
        },
        {
          id: aiMessage.id,
          content: aiMessage.text,
          role: aiMessage.sender,
          timestamp: aiMessage.timestamp
        }
      ];
      
      // Aktualisiere den Chat in der Historie
      if (currentChatId) {
        updateChat(currentChatId, {
          messages: chatMessages,
          lastUpdated: new Date()
        });
      }

    } catch (error: any) {
      // Prüfen, ob es sich um einen AbortError handelt
      if (error.name === 'AbortError') {
        console.log('Anfrage wurde abgebrochen');
      } else {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, {
          id: uuidv4(),
          text: `Fehler bei der Verarbeitung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        }]);
      }
    } finally {
      setIsLoading(false);
      setInput('');
      setAbortController(null);
    }
  };
  
  // Prüft, ob das aktuelle Modell Vision-Fähigkeiten hat
  const hasVisionCapabilities = (model: string) => {
    return VISION_MODELS.includes(model);
  };

  // Prüft, ob das aktuelle Modell Deep Research unterstützt
  const supportsDeepResearch = (model: string) => {
    // Zuerst direkte Übereinstimmung prüfen
    const directMatch = DEEP_RESEARCH_MODELS.includes(model as any);
    
    // Dann Teil-Übereinstimmungen prüfen (GPT-4-Turbo vs. GPT-4-Turbo-Preview)
    const modelLower = model.toLowerCase();
    
    const partialMatch = DEEP_RESEARCH_MODELS.some(supportedModel => {
      const supportedModelName = supportedModel.split('/')[1]?.toLowerCase() || supportedModel.toLowerCase();
      return modelLower.includes(supportedModelName) || supportedModelName?.includes(modelLower);
    });
    
    console.log('Deep Research Check:', model, 'Direct Match:', directMatch, 'Partial Match:', partialMatch);
    
    return directMatch || partialMatch;
  };

  // Funktion zum Wechseln des Modells und Fortsetzen des Uploads
  const switchModelAndUpload = (newModel: string) => {
    setSelectedModel(newModel);
    if (pendingFile) {
      // Verzögerung hinzufügen, um sicherzustellen, dass das neue Modell ausgewählt wurde
      setTimeout(() => {
        handleFileUpload(pendingFile);
        setPendingFile(null);
      }, 100);
    }
    setShowModelSelectionDialog(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!file || isUploading) return;
    
    // Prüfe, ob es sich um ein Bild handelt
    const isImage = file.type.startsWith('image/');
    
    // Wenn es ein Bild ist und das ausgewählte Modell keine Vision-Fähigkeiten hat,
    // zeige den Dialog an und speichere die Datei für später
    if (isImage && !hasVisionCapabilities(selectedModel)) {
      setPendingFile(file);
      setShowModelSelectionDialog(true);
      return;
    }

    // Neuen AbortController erstellen
    const controller = new AbortController();
    setAbortController(controller);
    
    // Aborted-Status zurücksetzen
    setAborted(false);

    setIsUploading(true);
    try {
      // Füge die Benutzernachricht mit der Datei hinzu
      const userMessage: ChatMessage = {
        id: uuidv4(),
        text: `Datei-Upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      if (isImage) {
        // Für Bilder verwenden wir den sendFileMessage-Service mit AbortController
        console.log('Sende Bild an API mit Modell:', selectedModel);
        let botResponse = '';
        
        await chatService.sendFileMessage(
          `Bitte analysiere dieses Bild: ${file.name}`, 
          file, 
          selectedModel,
          (chunk) => {
            botResponse += chunk;
          },
          (error) => {
            // Prüfen, ob es sich um einen AbortError handelt
            if (error.name === 'AbortError' || error.message === 'AbortError') {
              console.log('Datei-Upload wurde abgebrochen');
              // Keine Fehlermeldung, da wir im handleAbort eine setzen
            } else {
              console.error('Error sending file:', error);
              throw error;
            }
          },
          currentChatId,
          { signal: controller.signal } // AbortSignal übergeben
        );
        
        // Wenn der Request abgebrochen wurde, keinen Response anzeigen
        if (aborted) {
          return;
        }
        
        // Füge die Antwort des Bots hinzu
        const aiMessage: ChatMessage = {
          id: uuidv4(),
          text: botResponse.trim(),
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Speichere den Chat in der Historie
        const chatMessages: HistoryMessage[] = [
          ...messages.map(msg => ({
            id: msg.id,
            content: msg.text,
            role: msg.sender,
            timestamp: msg.timestamp
          })),
          {
            id: userMessage.id,
            content: userMessage.text,
            role: userMessage.sender,
            timestamp: userMessage.timestamp
          },
          {
            id: aiMessage.id,
            content: aiMessage.text,
            role: aiMessage.sender,
            timestamp: aiMessage.timestamp
          }
        ];
        
        // Aktualisiere den Chat in der Historie
        if (currentChatId) {
          updateChat(currentChatId, {
            messages: chatMessages,
            lastUpdated: new Date()
          });
        }
      } else {
        // Für Textdateien weiterhin verarbeiten wie bisher
        const content = await processFile(file);
        await sendMessage(content);
      }
    } catch (error: any) {
      // Abbruch-Fehler ignorieren, da wir das im handleAbort behandeln
      if (error.name === 'AbortError' || error.message === 'AbortError') {
        console.log('Datei-Upload wurde abgebrochen');
      } else {
        console.error('Error processing file:', error);
        // Feedback an den Benutzer anzeigen
        setMessages(prev => [...prev, {
          id: uuidv4(),
          text: `Fehler beim Verarbeiten der Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        }]);
      }
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setAbortController(null);
    }
  };

  // Funktion zum Öffnen des Datei-Dialogs
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Funktion zum Verarbeiten der ausgewählten Datei
  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  // Dialog-Komponente für die Modellauswahl
  const ModelSelectionDialog = () => {
    if (!showModelSelectionDialog) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl">
          <h3 className="text-lg font-semibold mb-3">Modell unterstützt keine Bilder</h3>
          <p className="mb-4">
            Das aktuell ausgewählte Modell <span className="font-semibold">{selectedModel}</span> unterstützt 
            keine Bildverarbeitung. Bitte wählen Sie eines der folgenden Modelle:
          </p>
          <div className="grid gap-2 mb-4">
            {VISION_MODELS.map(model => (
              <button
                key={model}
                onClick={() => switchModelAndUpload(model)}
                className="w-full text-left px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium">{model.split('/')[1]}</div>
                <div className="text-xs text-gray-500">{model.split('/')[0]}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setPendingFile(null);
                setShowModelSelectionDialog(false);
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Funktion zum Abbrechen der aktuellen Anfrage
  const handleAbort = () => {
    if (abortController) {
      // Tatsächlich den API-Aufruf abbrechen
      abortController.abort();
    }
    
    setAborted(true);
    setIsLoading(false);
    
    // Eine Nachricht im Chat anzeigen, dass die Anfrage abgebrochen wurde
    const abortMessage = {
      id: uuidv4(),
      text: '*Anfrage abgebrochen*',
      sender: 'assistant' as const,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, abortMessage]);
  };

  // Funktion zum Fortsetzen einer abgebrochenen Anfrage
  const handleResume = () => {
    setAborted(false);
    // Hier müssten wir die letzte Anfrage erneut senden
    if (input.trim()) {
      handleSubmit();
    }
  };

  // Render-Funktion für den Denkindikator
  const renderThinkingIndicator = () => {
    if (!isLoading) return null;
    
    return (
      <div className="flex flex-col space-y-2 p-4 max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="animate-pulse flex space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <div className="text-sm text-gray-600">
            {deepResearchEnabled ? "Führe tiefere Recherche durch..." : "Denke..."}
          </div>
          
          {/* Deep Research Abbruch- und Fortsetzungsoptionen */}
          {deepResearchEnabled && (
            <div className="ml-auto flex space-x-2">
              {!aborted ? (
                <button 
                  onClick={handleAbort}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Abbrechen
                </button>
              ) : (
                <button 
                  onClick={handleResume}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Fortsetzen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
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
      
      {/* Dialog für Modellauswahl anzeigen */}
      <ModelSelectionDialog />
      
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
                onChange={(e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  // Wenn das neue Modell kein Deep Research unterstützt, deaktiviere den Deep Research Modus
                  if (!supportsDeepResearch(newModel)) {
                    setDeepResearchEnabled(false);
                  }
                }}
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
                        handleMessageClick(message, target);
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
            
            {/* Denkindikator hier einfügen */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl p-3 bg-gray-50 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="animate-pulse flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {deepResearchEnabled ? "Führe tiefere Recherche durch..." : "Denke..."}
                    </div>
                    
                    {/* Deep Research Abbruch- und Fortsetzungsoptionen */}
                    {deepResearchEnabled && (
                      <div className="ml-auto flex space-x-2">
                        {!aborted ? (
                          <button 
                            onClick={handleAbort}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                          >
                            Abbrechen
                          </button>
                        ) : (
                          <button 
                            onClick={handleResume}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                          >
                            Fortsetzen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Action Bar - Fixed */}
      <div className="sticky bottom-0 z-40 bg-[#fafafa]">
        <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex gap-3">
            <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2">
              {/* Input-Container mit integriertem Deep Research Button */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Schreibe deine Nachricht..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm text-gray-900"
                  disabled={isLoading}
                />
                
                {/* Deep Research Button innerhalb des Eingabefelds */}
                {supportsDeepResearch(selectedModel) && (
                  <button
                    type="button"
                    onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full z-10 transition-colors ${
                      deepResearchEnabled 
                        ? 'bg-[#2c2c2c] text-white' 
                        : 'bg-white text-gray-400 hover:bg-gray-100'
                    }`}
                    title={deepResearchEnabled ? "Deep Research aktiv" : "Deep Research aktivieren"}
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Verstecktes File-Input-Element */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelected}
                className="hidden"
                accept={hasVisionCapabilities(selectedModel) 
                  ? ".txt,.xlsx,.xls,.csv,image/jpeg,image/png,image/gif,image/webp" 
                  : ".txt,.xlsx,.xls,.csv"}
              />
              <button
                type="button"
                onClick={triggerFileUpload}
                className="p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                title={hasVisionCapabilities(selectedModel)
                  ? "Datei hochladen (Text, CSV, Excel, Bilder)" 
                  : "Datei hochladen (nur Text, CSV, Excel)"}
                disabled={isLoading || isUploading}
              >
                {isUploading ? (
                  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <PaperClipIcon className="w-5 h-5" />
                )}
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
                messages.length < 15 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={messages.length < 15}
              title={messages.length < 15 ? 'Mindestens 15 Nachrichten erforderlich' : 'Chat analysieren'}
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Analysieren{messages.length < 15 ? ` (${messages.length}/15)` : ''}</span>
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