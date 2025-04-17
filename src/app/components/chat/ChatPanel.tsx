'use client';

import { useState, useCallback, useEffect, useRef, ReactNode, useMemo } from 'react';
import { ChatService } from '@/lib/services/chat';
import { usePromptStore } from '@/lib/store/promptStore';
import { AnalysisResult, ChatAnalyzer } from '@/lib/services/analyzer/chatAnalyzer';
import { useChatHistoryStore, type Message as HistoryMessage, type ChatHistory } from '@/lib/store/chatHistoryStore';
import { useActiveChatStore } from '@/lib/store/activeChatStore';
import ChatList from './ChatList';
import { v4 as uuidv4 } from 'uuid';
import { DocumentService } from '@/lib/services/document/documentService';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Document, Paragraph } from 'docx';
import {
  PlusIcon,
  ClockIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { useUser } from '@/app/hooks/useUser';
import DOMPurify from 'dompurify';
import { DEEP_RESEARCH_MODELS } from '@/lib/constants/chat';
import { ChatMessage } from '@/types/chat';

// Definiere zuerst den Role-Typ ohne system
type Role = 'user' | 'assistant';

// Erweiterte ChatMessage-Definition mit 'system' als möglichem Sender
interface ChatMessage {
  id: string;
  text: string;
  sender: Role;
  timestamp: string;
  promptsData?: {
    textPrompts: AnalysisResult[];
    imagePrompts: AnalysisResult[];
    videoPrompts: AnalysisResult[];
  };
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

// Vordefinierte Komponenten für MDX-Content
const components = {
  h1: (props: any) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-bold mb-2 mt-4" {...props} />,
  p: (props: any) => <p className="mb-2" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-5 mb-3" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-5 mb-3" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4 text-gray-600" {...props} />,
  code: (props: any) => <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm" {...props} />,
  pre: (props: any) => <pre className="bg-gray-100 rounded p-4 overflow-x-auto my-4 font-mono text-sm" {...props} />,
};

// Neue verbesserte Funktion zur Vorverarbeitung des Texts
function createMarkdownHTML(text: string): string {
  // Bereite den Text vor
  const cleanedText = text.replace(/\n{3,}/g, '\n\n');
  
  // Verarbeite zuerst die Inline-Formatierungen, bevor wir die Listen verarbeiten
  let processedText = cleanedText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
    .replace(/`(.*?)`/g, '<code>$1</code>');           // Code
  
  // Jetzt die Listen verarbeiten
  let lines = processedText.split('\n');
  let inList = false;
  let listType = '';
  
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    
    // Nummerierte Listen erkennen (mit oder ohne Punkt)
    const numberedListMatch = trimmedLine.match(/^(\d+)\.?\s+(.*)/);
    if (numberedListMatch) {
      if (!inList || listType !== 'ol') {
        // Beginne eine neue Liste
        lines[i] = '<ol class="custom-ol">' + lines[i];
        inList = true;
        listType = 'ol';
      }
      
      // Formatiere den Listeneintrag und behalte Formatierungen bei
      lines[i] = lines[i].replace(/^(\d+)\.?\s+(.*)/, '<li>$2</li>');
    } 
    // Aufzählungslisten erkennen
    else if (/^[\*\-]\s+/.test(trimmedLine)) {
      if (!inList || listType !== 'ul') {
        // Beginne eine neue Liste
        lines[i] = '<ul class="custom-ul">' + lines[i];
        inList = true;
        listType = 'ul';
      }
      
      // Formatiere den Listeneintrag und behalte Formatierungen bei
      lines[i] = lines[i].replace(/^[\*\-]\s+(.*)/, '<li>$1</li>');
    }
    // Wenn wir in einer Liste sind und eine leere Zeile oder eine Zeile ohne Listenelement finden
    else if (inList && (trimmedLine === '' || !(/^[\*\-\d]/.test(trimmedLine)))) {
      // Ende der Liste
      lines[i-1] += (listType === 'ol') ? '</ol>' : '</ul>';
      inList = false;
      listType = '';
    }
  }
  
  // Schließe offene Listen am Ende
  if (inList) {
    lines.push((listType === 'ol') ? '</ol>' : '</ul>');
  }
  
  // Konvertiere Absätze - weniger Abstände
  let html = '';
  let inParagraph = false;
  
  for (let i = 0; i < lines.length; i++) {
    // Überspringe Zeilen, die bereits als HTML formatiert sind
    if (lines[i].startsWith('<ol') || lines[i].startsWith('<ul') || 
        lines[i].startsWith('<li>') || lines[i].includes('</ol>') || lines[i].includes('</ul>')) {
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      html += lines[i];
    }
    // Leere Zeile beendet einen Absatz
    else if (lines[i].trim() === '') {
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
    }
    // Normale Zeile
    else {
      if (!inParagraph) {
        html += '<p>';
        inParagraph = true;
      }
      html += lines[i] + (i < lines.length - 1 && lines[i+1].trim() !== '' && !inList ? ' ' : '');
    }
  }
  
  // Schließe offenen Absatz am Ende
  if (inParagraph) {
    html += '</p>';
  }
  
  return html;
}

/**
 * Chat-Panel-Komponente
 * 
 * Diese Komponente implementiert die Chat-Oberfläche, die folgende Funktionen bietet:
 * - Text- und Bild-basierte Konversation mit verschiedenen KI-Modellen
 * - Analyse der Konversation zur Generierung von Text- und Bild-Prompts
 * - Deep Research Modus für umfangreichere Antworten
 * - Chat-Historie und Speicherung der Nachrichten
 * 
 * Bekannte Typprobleme: Die ChatMessage-Interface verwendet 'sender', während Message-Interface 'role' verwendet.
 * Diese Diskrepanz führt zu Typfehlern bei der Konvertierung zwischen den beiden Formaten.
 */
export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isPendingResponse, setIsPendingResponse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'openai/gpt-4-turbo-preview');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Verwende den ActiveChatStore anstelle des einfachen States
  const activeChatStore = useActiveChatStore();
  const [currentChatId, setCurrentChatIdState] = useState<string>(
    activeChatStore.getLastActiveChatId()
  );
  
  // Funktion zum Setzen der Chat-ID, die sowohl den lokalen State als auch den persistierten Store aktualisiert
  const setCurrentChatId = useCallback((chatId: string) => {
    setCurrentChatIdState(chatId);
    activeChatStore.setCurrentChatId(chatId);
  }, [activeChatStore]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<AnalysisResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModelSelectionDialog, setShowModelSelectionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState<boolean>(false);
  const [isAborted, setIsAborted] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzeStep, setAnalyzeStep] = useState<string>('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Get prompt store functions
  const { addPrompt } = usePromptStore();
  const { updateChat, getChat, getAllChats } = useChatHistoryStore();

  // Initialisiere Services
  const chatService = useMemo(() => ChatService.getInstance(), []);
  const analyzerService = useMemo(() => new ChatAnalyzer(), []);
  const documentService = DocumentService.getInstance();

  // User Hook hinzufügen
  const { user } = useUser();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Laden der Nachrichten aus der Datenbank
  useEffect(() => {
    const loadMessages = async () => {
      if (currentChatId) {
        try {
          // Versuche Nachrichten aus der Datenbank zu laden
          const loadedMessages = await chatService.loadFromLocalStorage(currentChatId, user?.id);
          
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
            console.log(`${loadedMessages.length} Nachrichten aus der Datenbank geladen`);
          } else {
            // Wenn keine Nachrichten gefunden wurden, erstelle eine Willkommensnachricht
            const welcomeMessage: ChatMessage = {
              id: 'welcome',
              text: 'Hallo! Ich bin dein KI-Assistent. Wie kann ich dir helfen?',
              sender: 'assistant',
              timestamp: new Date().toISOString()
            };
            setMessages([welcomeMessage]);
            
            // Speichere die Willkommensnachricht auch in der Datenbank
            chatService.setMessageHistory(currentChatId, [welcomeMessage]);
            await chatService.saveToLocalStorage(currentChatId, user?.id);
          }
          
          // Scrolle zum Ende des Chats
          setTimeout(scrollToBottom, 100);
          
          // Nach dem Laden der Nachrichten auch den letzten Stage-Snapshot laden
          try {
            const { loadLatestSnapshotForChat } = await import('@/lib/store/stageStore');
            await loadLatestSnapshotForChat(currentChatId);
          } catch (error) {
            console.error('Fehler beim Laden des letzten Stage-Snapshots:', error);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Nachrichten:', error);
          console.error('Die Chatnachrichten konnten nicht geladen werden.');
        }
      }
    };
    
    loadMessages();
  }, [currentChatId, chatService, scrollToBottom, user]);

  // Speichern der Nachrichten in der Datenbank bei Änderungen
  useEffect(() => {
    const saveMessages = async () => {
      if (messages.length > 0 && currentChatId) {
        try {
          // Setze die aktuellen Nachrichten im Chat-Service
          chatService.setMessageHistory(currentChatId, messages);
          
          // Speichere in der Datenbank
          await chatService.saveToLocalStorage(currentChatId, user?.id);
          console.log('Nachrichten in der Datenbank aktualisiert');
        } catch (error) {
          console.error('Fehler beim Speichern der Nachrichten:', error);
        }
      }
    };
    
    // Speichere Nachrichten, aber nicht zu oft
    const debounceTimer = setTimeout(saveMessages, 1000);
    return () => clearTimeout(debounceTimer);
  }, [messages, currentChatId, chatService, user]);

  // Einmalig alte lokale Daten aufräumen, aber ohne wichtige Daten zu löschen
  useEffect(() => {
    const cleanupOldLocalStorage = () => {
      if (typeof window !== 'undefined') {
        // Nur die alten Chat-Daten aus dem lokalen Speicher entfernen, die das alte Format haben
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          // Nur die direkt mit chat_ beginnenden Schlüssel entfernen (ohne Benutzer-ID)
          // und nicht solche, die bereits das neue Format haben (chat_USER-ID_...)
          if (key && key.startsWith('chat_') && !key.match(/^chat_[0-9a-f-]{36}_/)) {
            keysToRemove.push(key);
          }
        }
        
        // Entferne die Schlüssel
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`Altes Chat-Format entfernt: ${key}`);
        });
        
        if (keysToRemove.length > 0) {
          console.log('Alte Chat-Daten aufgeräumt');
        }
      }
    };
    
    cleanupOldLocalStorage();
  }, []);

  // Funktion zum Erstellen eines neuen Chats
  const handleNewChat = useCallback(async () => {
    try {
      // Erstelle einen neuen Chat in der Datenbank
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Neuer Chat' }),
      });
      
      // Behandle verschiedene HTTP-Statusantworten
      if (response.status === 401) {
        alert('Sie müssen angemeldet sein, um einen neuen Chat zu erstellen.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Fehler beim Erstellen des Chats: ${errorData.error || response.status}`);
      }
      
      const newChat = await response.json();
      
      // Speichere den aktuellen Chat vor dem Wechsel
      if (currentChatId !== 'default') {
        chatService.saveToLocalStorage(currentChatId, user?.id);
      }
      
      // Setze die neue Chat-ID (wird jetzt auch im persistenten Store gespeichert)
      setCurrentChatId(newChat.id);
      
      // Initialisiere mit Willkommensnachricht
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        text: 'Hallo! Ich bin dein KI-Assistent. Wie kann ich dir helfen?',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      
      // Initialisiere den neuen Chat im Service
      chatService.setMessageHistory(newChat.id, [welcomeMessage]);
      await chatService.saveToLocalStorage(newChat.id, user?.id);
      
      // Schließe den Chatverlauf-Dialog
      setIsHistoryOpen(false);
      
      // Prompt-Store leeren
      try {
        const { usePromptStore } = await import('@/lib/store/promptStore');
        const promptStore = usePromptStore.getState();
        promptStore.clearPrompts();
        console.log('Prompt-Store geleert');
      } catch (error) {
        console.error('Fehler beim Leeren des Prompt-Stores:', error);
      }
      
      // Stage zurücksetzen - Leere die Text- und Bildvorschläge
      try {
        // Importiere und verwende useStageStore dynamisch
        const { useStageStore } = await import('@/lib/store/stageStore');
        const stageStore = useStageStore.getState();
        
        // Speichere aktuelle Einstellungen
        const currentModel = stageStore.selectedModel;
        const currentTab = stageStore.activeImageTab;
        
        // Setze Text- und Bildvorschläge zurück
        stageStore.setTextDrafts([]);
        stageStore.setImageDrafts([]);
        // Setze auch den Blogbeitrag-Generator zurück
        stageStore.setBlogPostDraft(null);
        
        // Stelle die gespeicherten Einstellungen wieder her
        stageStore.setSelectedModel(currentModel);
        stageStore.setActiveImageTab(currentTab);
        
        console.log('Stage wurde für neuen Chat zurückgesetzt');
      } catch (error) {
        console.error('Fehler beim Zurücksetzen der Stage:', error);
      }
      
      // StageHistory-Store aktualisieren
      try {
        const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
        const stageHistoryStore = useStageHistoryStore.getState();
        
        // Setze die aktuelle Chat-ID und lade neue Snapshots
        stageHistoryStore.setCurrentChatId(newChat.id);
        const snapshots = await stageHistoryStore.getSnapshots(true); // true = onlyManual
        
        // Lade den letzten Snapshot für diesen Chat, falls vorhanden
        if (snapshots.length > 0) {
          const lastSnapshot = snapshots[0]; // Snapshots sind nach Zeit sortiert, neuester zuerst
          console.log('Lade letzten Snapshot für Chat:', lastSnapshot.id);
          
          // Importiere und verwende useStageStore dynamisch
          const { useStageStore } = await import('@/lib/store/stageStore');
          const stageStore = useStageStore.getState();
          
          // Wende die gespeicherten Daten aus dem Snapshot auf die Stage an
          stageStore.setTextDrafts(lastSnapshot.textDrafts || []);
          stageStore.setImageDrafts(lastSnapshot.imageDrafts || []);
          
          // Wenn der Snapshot auch Blog-Post-Daten enthält, diese ebenfalls wiederherstellen
          if (lastSnapshot.blogPostDraft) {
            stageStore.setBlogPostDraft(lastSnapshot.blogPostDraft);
          }
          
          console.log('Stage mit Daten aus dem letzten Snapshot initialisiert');
        } else {
          // Wenn kein Snapshot existiert, Stage vollständig leeren
          const { useStageStore } = await import('@/lib/store/stageStore');
          const stageStore = useStageStore.getState();
          
          // Setze Text- und Bildvorschläge zurück
          stageStore.setTextDrafts([]);
          stageStore.setImageDrafts([]);
          // Setze auch den Blogbeitrag-Generator zurück
          stageStore.setBlogPostDraft(null);
          
          // Model und Tab-Auswahl beibehalten
          const currentModel = stageStore.selectedModel;
          const currentTextModel = stageStore.selectedTextModel;
          const currentTab = stageStore.activeImageTab;
          
          // Stelle die Modelleinstellungen wieder her
          stageStore.setSelectedModel(currentModel);
          stageStore.setSelectedTextModel(currentTextModel);
          stageStore.setActiveImageTab(currentTab);
          
          console.log('Keine Snapshots gefunden - Alle Stage-Daten für diesen Chat wurden gelöscht');
        }
        
        console.log('StageHistoryStore für neuen Chat aktualisiert');
      } catch (error) {
        console.error('Fehler beim Aktualisieren des StageHistoryStore:', error);
      }
      
      console.log(`Neuer Chat erstellt: ${newChat.id}`);
    } catch (error) {
      console.error('Fehler beim Erstellen eines neuen Chats:', error);
    }
  }, [currentChatId, chatService, user, setCurrentChatId]);

  // Wechsle zu einem bestehenden Chat
  const handleSelectChat = useCallback(async (chatId: string) => {
    try {
      // Speichere den aktuellen Chat vor dem Wechsel
      if (currentChatId !== 'default') {
        await chatService.saveToLocalStorage(currentChatId, user?.id);
      }
      
      // Setze den neuen Chat (wird jetzt auch im persistenten Store gespeichert)
      setCurrentChatId(chatId);
      
      // Lade die Nachrichten für den neuen Chat
      const loadedMessages = await chatService.loadFromLocalStorage(chatId, user?.id);
      
      // Aktualisiere die Nachrichten im UI
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      } else {
        // Erstelle Willkommensnachricht wenn keine Nachrichten vorhanden
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          text: 'Hallo! Ich bin dein KI-Assistent. Wie kann ich dir helfen?',
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
        chatService.setMessageHistory(chatId, [welcomeMessage]);
        await chatService.saveToLocalStorage(chatId, user?.id);
      }
      
      // Schließe den Chatverlauf-Dialog
      setIsHistoryOpen(false);
      
      // Prompt-Store leeren
      try {
        const { usePromptStore } = await import('@/lib/store/promptStore');
        const promptStore = usePromptStore.getState();
        promptStore.clearPrompts();
        console.log('Prompt-Store für Chat-Wechsel geleert');
      } catch (error) {
        console.error('Fehler beim Leeren des Prompt-Stores:', error);
      }
      
      // Stage zurücksetzen - Leere die Text- und Bildvorschläge
      try {
        // Importiere und verwende useStageStore dynamisch
        const { useStageStore } = await import('@/lib/store/stageStore');
        const stageStore = useStageStore.getState();
        
        // Speichere aktuelle Einstellungen
        const currentModel = stageStore.selectedModel;
        const currentTab = stageStore.activeImageTab;
        
        // Setze Text- und Bildvorschläge zurück
        stageStore.setTextDrafts([]);
        stageStore.setImageDrafts([]);
        // Setze auch den Blogbeitrag-Generator zurück
        stageStore.setBlogPostDraft(null);
        
        // Stelle die gespeicherten Einstellungen wieder her
        stageStore.setSelectedModel(currentModel);
        stageStore.setActiveImageTab(currentTab);
        
        console.log('Stage wurde für Chat-Wechsel zurückgesetzt');
      } catch (error) {
        console.error('Fehler beim Zurücksetzen der Stage:', error);
      }
      
      // StageHistory-Store aktualisieren
      try {
        const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
        const stageHistoryStore = useStageHistoryStore.getState();
        
        // Setze die aktuelle Chat-ID und lade neue Snapshots
        stageHistoryStore.setCurrentChatId(chatId);
        const snapshots = await stageHistoryStore.getSnapshots(true); // true = onlyManual
        
        // Lade den letzten Snapshot für diesen Chat, falls vorhanden
        if (snapshots.length > 0) {
          const lastSnapshot = snapshots[0]; // Snapshots sind nach Zeit sortiert, neuester zuerst
          console.log('Lade letzten Snapshot für Chat:', lastSnapshot.id);
          
          // Importiere und verwende useStageStore dynamisch
          const { useStageStore } = await import('@/lib/store/stageStore');
          const stageStore = useStageStore.getState();
          
          // Wende die gespeicherten Daten aus dem Snapshot auf die Stage an
          stageStore.setTextDrafts(lastSnapshot.textDrafts || []);
          stageStore.setImageDrafts(lastSnapshot.imageDrafts || []);
          
          // Wenn der Snapshot auch Blog-Post-Daten enthält, diese ebenfalls wiederherstellen
          if (lastSnapshot.blogPostDraft) {
            stageStore.setBlogPostDraft(lastSnapshot.blogPostDraft);
          }
          
          console.log('Stage mit Daten aus dem letzten Snapshot initialisiert');
        } else {
          // Wenn kein Snapshot existiert, Stage leeren wie bisher
          const { useStageStore } = await import('@/lib/store/stageStore');
          const stageStore = useStageStore.getState();
          
          // Speichere aktuelle Einstellungen
          const currentModel = stageStore.selectedModel;
          const currentTab = stageStore.activeImageTab;
          
          // Setze Text- und Bildvorschläge zurück
          stageStore.setTextDrafts([]);
          stageStore.setImageDrafts([]);
          // Setze auch den Blogbeitrag-Generator zurück
          stageStore.setBlogPostDraft(null);
          
          // Stelle die gespeicherten Einstellungen wieder her
          stageStore.setSelectedModel(currentModel);
          stageStore.setActiveImageTab(currentTab);
          
          console.log('Keine Snapshots gefunden - Stage wurde für Chat-Wechsel zurückgesetzt');
        }
        
        console.log('StageHistoryStore für Chat-Wechsel aktualisiert');
      } catch (error) {
        console.error('Fehler beim Aktualisieren des StageHistoryStore:', error);
      }
      
      console.log(`Gewechselt zu Chat ${chatId}`);
    } catch (error) {
      console.error('Fehler beim Wechseln zu anderem Chat:', error);
    }
  }, [chatService, user, setCurrentChatId]);

  // Automatischer Fokus auf das Eingabefeld nach einer Antwort
  useEffect(() => {
    // Warte einen kurzen Moment, damit die UI aktualisiert werden kann
    const timer = setTimeout(() => {
      // Nur fokussieren, wenn wir nicht mehr laden und das letzte Element keine Benutzernachricht ist
      if (!isPendingResponse && messages.length > 0 && messages[messages.length - 1].sender !== 'user') {
        inputRef.current?.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, isPendingResponse]);

  // Setze initialen Fokus auf das Input-Feld
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Füge CSS-Stile zum Dokument hinzu
  useEffect(() => {
    // Erstelle ein Link-Element für die externe CSS-Datei
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.type = 'text/css';
    linkElement.href = '/styles/message-styles.css';
    
    // Füge es zum Dokument-Head hinzu
    document.head.appendChild(linkElement);
    
    // Clean-up Funktion
    return () => {
      if (document.head.contains(linkElement)) {
        document.head.removeChild(linkElement);
      }
    };
  }, []);

  // Stile inline definieren als Fallback
  const messageStyles = `
    .message-container {
      display: flex;
      margin-bottom: 1rem;
    }
    .message {
      max-width: 80%;
      border-radius: 1rem;
      padding: 0.75rem 1rem;
      position: relative;
    }
    .message-user {
      background-color: #2c2c2c;
      color: white;
    }
    .message-assistant {
      background-color: #f3f4f6;
      color: #1f2937;
    }
    .message-system {
      background-color: #fef3c7;
      color: #92400e;
      font-style: italic;
    }
    .message-header {
      display: flex;
      justify-content: flex-end;
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
      opacity: 0.7;
    }
    .message-content {
      white-space: pre-wrap;
      font-size: 0.875rem;
    }
    
    /* Benutzerdefinierte Scrollbar-Stile */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background-color: #f5f5f5;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af;
    }
    /* Firefox Scrollbar-Stil */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f5f5f5;
    }
  `;

  // Funktion zum Senden einer Nachricht
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || isPendingResponse) return;
    
    setIsPendingResponse(true);
    
    try {
      // User-Nachricht hinzufügen
      const newUserMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: messageText,
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, newUserMessage];
      setMessages(updatedMessages);
      setMessageText('');
      
      // Wenn dies die erste Benutzernachricht im Chat ist, aktualisiere den Chat-Titel
      const isFirstUserMessage = messages.filter(m => m.sender === 'user').length === 0;
      if (isFirstUserMessage && currentChatId !== 'default') {
        try {
          // Extrahiere maximal die ersten 40 Zeichen als Titel
          let chatTitle = messageText.trim().substring(0, 40);
          if (messageText.length > 40) chatTitle += '...';
          
          // Aktualisiere den Chat-Titel in der Datenbank
          const response = await fetch('/api/chats', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: currentChatId, title: chatTitle }),
          });
          
          if (!response.ok) {
            console.error('Fehler beim Aktualisieren des Chat-Titels:', response.status);
          } else {
            console.log('Chat-Titel aktualisiert:', chatTitle);
          }
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Chat-Titels:', error);
        }
      }
      
      // Scrolle nach unten, nachdem die Nachricht hinzugefügt wurde
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      const typingIndicatorMessage: ChatMessage = {
        id: 'typing-indicator',
        sender: 'assistant',
        text: '',
        timestamp: new Date().toISOString()
      };
      
      setMessages([...updatedMessages, typingIndicatorMessage]);
      
      // Setze die aktualisierten Nachrichten im Chat-Service
      chatService.setMessageHistory(currentChatId, updatedMessages);
      
      // AbortController für die Anfrage erstellen
      const controller = new AbortController();
      setAbortController(controller);
      
      let responseText = '';
      
      await chatService.streamMessage(
        messageText,
        selectedModel,
        (chunk) => {
          // Verarbeite jeden Chunk der Antwort
          responseText += chunk;
          
          // Aktualisiere die Typing-Indikator-Nachricht mit dem aktuellen Text
          setMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const typingIndex = newMessages.findIndex(m => m.id === 'typing-indicator');
            
            if (typingIndex !== -1) {
              newMessages[typingIndex] = {
                ...newMessages[typingIndex],
                text: responseText
              };
            }
            
            return newMessages;
          });
          
          // Scrolle während des Tippens nach unten
          scrollToBottom();
        },
        (error) => {
          console.error('Fehler beim Empfangen der Antwort:', error);
          
          // Entferne den Typing-Indikator
          setMessages(prevMessages => 
            prevMessages.filter(m => m.id !== 'typing-indicator')
          );
          
          if (error.message !== 'AbortError') {
            // Füge eine Fehlermeldung hinzu, wenn es kein Abbruch war
            const errorMessage: ChatMessage = {
              id: Date.now().toString(),
              sender: 'assistant',
              text: `Fehler: ${error.message}`,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prevMessages => [...prevMessages, errorMessage]);
          }
          
          setIsPendingResponse(false);
        },
        currentChatId,
        deepResearchEnabled,
        { signal: controller.signal }
      );
      
      // Entferne den Typing-Indikator und füge die endgültige Antwort hinzu
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(m => m.id !== 'typing-indicator');
        
        if (responseText.trim() !== '') {
          const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toISOString()
          };
          
          return [...filteredMessages, aiMessage];
        }
        
        return filteredMessages;
      });
    } catch (error: any) {
      console.error('Fehler beim Senden der Nachricht:', error);
      
      // Fehlernachricht anzeigen
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `Fehler: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => 
        prevMessages.filter(m => m.id !== 'typing-indicator').concat(errorMessage)
      );
    } finally {
      setIsPendingResponse(false);
      setAbortController(null);
    }
  }, [messageText, isPendingResponse, messages, chatService, selectedModel, scrollToBottom, deepResearchEnabled, currentChatId]);

  // Tastendruck-Handler für Eingabefeld
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handlefunktion für Formular-Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Neue PromptSelectionView-Komponente mit Korrektur des null-Parameters
  const PromptSelectionView = ({ 
    textPrompts = [], 
    imagePrompts = [], 
    videoPrompts = [],
    selectedPrompts = [], 
    onPromptSelect 
  }: { 
    textPrompts: AnalysisResult[],
    imagePrompts: AnalysisResult[],
    videoPrompts: AnalysisResult[],
    selectedPrompts: AnalysisResult[],
    onPromptSelect: (prompt: AnalysisResult | { sendAll: true }) => void
  }) => {
    const [filter, setFilter] = useState<'all' | 'text' | 'image' | 'video'>('all');
    const [expandedPrompts, setExpandedPrompts] = useState<string[]>([]);
    
    const togglePromptExpand = (promptId: string) => {
      setExpandedPrompts(prev => 
        prev.includes(promptId) 
          ? prev.filter(id => id !== promptId)
          : [...prev, promptId]
      );
    };
    
    const filteredPrompts = filter === 'all' 
      ? [...textPrompts, ...imagePrompts, ...videoPrompts]
      : filter === 'text' 
        ? textPrompts
        : filter === 'image'
          ? imagePrompts
          : videoPrompts;
    
    return (
      <div className="space-y-4 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="font-medium text-lg">Generierte Prompts</h3>
        
        <div className="flex space-x-2 mb-4">
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('all')}
          >
            Alle ({textPrompts.length + imagePrompts.length + videoPrompts.length})
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'text' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('text')}
          >
            Text ({textPrompts.length})
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'image' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('image')}
          >
            Bild ({imagePrompts.length})
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'video' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('video')}
          >
            Video ({videoPrompts.length})
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {filteredPrompts.map(prompt => {
            const isSelected = selectedPrompts.some(p => p.id === prompt.id);
            const isExpanded = expandedPrompts.includes(prompt.id);
            
            return (
              <div key={prompt.id} className="border rounded-lg p-4 hover:shadow-sm transition-all bg-gray-50 prompt-card">
                <div className="flex items-start">
                  <div className="mt-1 mr-3">
                    <input 
                      type="checkbox" 
                      id={`prompt-${prompt.id}`}
                      checked={isSelected}
                      onChange={() => onPromptSelect({ sendAll: false, ...prompt } as any)}
                      className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 prompt-checkbox"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {prompt.type === 'text' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          ) : prompt.type === 'image' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          )}
                        </svg>
                        <h4 className="font-medium text-gray-900">{prompt.title}</h4>
                      </div>
                      {prompt.format && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                          {prompt.format}{prompt.estimatedLength ? ` • ca. ${prompt.estimatedLength} Wörter` : ''}
                        </span>
                      )}
                    </div>
                    
                    <div className={`text-sm text-gray-700 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''} mb-2`}>
                      {prompt.prompt}
                    </div>
                    
                    <button 
                      className="text-xs text-gray-600 hover:text-gray-900 mb-3 flex items-center"
                      onClick={() => togglePromptExpand(prompt.id)}
                    >
                      {isExpanded ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                          </svg>
                          Weniger anzeigen
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                          Vollständigen Prompt anzeigen
                        </>
                      )}
                    </button>
                    
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.map(tag => (
                        <span key={tag} className="prompt-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {selectedPrompts.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex justify-end">
              <button 
                className="bg-gray-900 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
                onClick={() => onPromptSelect({ sendAll: true } as any)}
              >
                Ausgewählte Prompts übertragen ({selectedPrompts.length})
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Funktion zum Verarbeiten von Klicks auf Links in Nachrichten
  const handleMessageClick = (message: ChatMessage, element: HTMLElement) => {
    if (element.classList.contains('select-suggestion-btn')) {
      const id = element.getAttribute('data-id');
      const type = element.getAttribute('data-type');
      const index = parseInt(element.getAttribute('data-index') || '0');
      
      // Finde das passende Suggestion basierend auf ID, Typ und Index
      const analyzerMessages = messages.map(msg => ({
        id: parseInt(msg.id),
        text: msg.text,
        sender: msg.sender === 'user' ? 'user' : 'ai' as 'user' | 'ai',
        timestamp: new Date(msg.timestamp)
      })) as AnalyzerMessage[];
      
      analyzerService.analyzeConversation(analyzerMessages).then(results => {
        const typeResults = results.filter(r => r.type === type);
        const suggestion = typeResults[index];
        
        if (suggestion) {
          setSelectedSuggestions(prev => {
            const isSelected = prev.some(s => s.id === suggestion.id);
            if (isSelected) {
              element.classList.remove('bg-gray-900', 'text-white');
              element.classList.add('bg-white', 'text-gray-700');
              const checkIcon = element.querySelector('.suggestion-check');
              const text = element.querySelector('.suggestion-text');
              if (checkIcon) checkIcon.classList.add('hidden');
              if (text) text.textContent = 'Auswählen';
              return prev.filter(s => s.id !== suggestion.id);
            } else {
              element.classList.remove('bg-white', 'text-gray-700');
              element.classList.add('bg-gray-900', 'text-white');
              const checkIcon = element.querySelector('.suggestion-check');
              const text = element.querySelector('.suggestion-text');
              if (checkIcon) checkIcon.classList.remove('hidden');
              if (text) text.textContent = 'Ausgewählt';
              return [...prev, suggestion];
            }
          });
        }
      });
    }
  };

  // Funktion zum Senden der ausgewählten Vorschläge
  const handleSendSelectedSuggestions = async () => {
    // Prompts direkt an den Store senden
    selectedSuggestions.forEach(async (suggestion) => {
      await handleSendToStage(suggestion);
    });
    
    // Füge eine Bestätigungsnachricht hinzu
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      text: `${selectedSuggestions.length} Prompts wurden übergeben.`,
      sender: 'assistant',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, confirmationMessage]);
    setSelectedSuggestions([]);
    
    // Verzögere das Leeren des Prompt-Stores um eine Sekunde,
    // damit die Stage-Komponente Zeit hat, die Prompts zu verarbeiten
    setTimeout(() => {
      const promptStore = usePromptStore.getState();
      promptStore.clearPrompts();
      console.log('Prompt-Store nach kurzer Verzögerung geleert');
    }, 1000);
  };

  // Send a prompt to the stage
  const handleSendToStage = (prompt: AnalysisResult) => {
    // Debug-Ausgabe zum Überprüfen der Daten
    console.log('Sende Prompt an Stage:', prompt);
    
    // Direkt an den Store senden ohne Transformation
    addPrompt(prompt);
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

  // Bei Erstellung oder Wechsel des Chats:
  const resetStageForNewChat = async () => {
    try {
      // Prompt-Store leeren
      const promptStore = usePromptStore.getState();
      promptStore.clearPrompts();
      console.log('Prompt-Store geleert');
      
      // Stage zurücksetzen - Leere die Text-, Bild- und Videovorschläge
      const { useStageStore } = await import('@/lib/store/stageStore');
      const stageStore = useStageStore.getState();
      
      // Speichere aktuelle Einstellungen
      const currentModel = stageStore.selectedModel;
      const currentTextModel = stageStore.selectedTextModel;
      const currentVideoModel = stageStore.selectedVideoModel;
      const currentTab = stageStore.activeImageTab;
      
      // Setze Text- und Bildvorschläge zurück
      stageStore.setTextDrafts([]);
      stageStore.setImageDrafts([]);
      stageStore.setVideoDrafts([]);
      stageStore.setBlogPostDraft(null);
      
      // Stelle die gespeicherten Einstellungen wieder her
      stageStore.setSelectedModel(currentModel);
      stageStore.setSelectedTextModel(currentTextModel);
      stageStore.setSelectedVideoModel(currentVideoModel);
      stageStore.setActiveImageTab(currentTab);
      
      console.log('Stage wurde zurückgesetzt');
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Stage:', error);
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
    
    setIsAborted(true);
    setIsPendingResponse(false);
    
    // Eine Nachricht im Chat anzeigen, dass die Anfrage abgebrochen wurde
    const abortMessage: ChatMessage = {
      id: Date.now().toString(),
      text: '*Anfrage abgebrochen*',
      sender: 'assistant' as const,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, abortMessage]);
  };

  // Funktion zum Fortsetzen einer abgebrochenen Anfrage
  const handleResume = () => {
    setIsAborted(false);
    // Hier müssten wir die letzte Anfrage erneut senden
    if (messageText.trim()) {
      sendMessage();
    }
  };

  // Render-Funktion für den Denkindikator
  const renderThinkingIndicator = () => {
    if (!isPendingResponse) return null;
    
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
              {!isAborted ? (
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
    setIsAborted(false);

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
        if (isAborted) {
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

  // Die analyzeChat-Funktion aktualisieren
  const analyzeChat = async () => {
    if (messages.length < 3) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: '❌ Es werden mindestens 3 Nachrichten für eine sinnvolle Analyse benötigt.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    // Setze Analyse-Status auf aktiv
    setIsAnalyzing(true);
    setAnalyzeStep('Starte Analyse der Konversation...');
    
    try {
      setAnalyzeStep('Extrahiere Textelemente aus dem Gespräch...');
      const analyzerMessages = messages.map(msg => ({
        id: parseInt(msg.id) || Date.now(),
        text: msg.text,
        sender: msg.sender === 'user' ? 'user' : 'ai' as 'user' | 'ai',
        timestamp: new Date(msg.timestamp)
      }));
      
      // Kurze Verzögerung für bessere UX
      await new Promise(resolve => setTimeout(resolve, 700));
      setAnalyzeStep('KI-gestützte Themenanalyse läuft...');
      
      // Weitere Verzögerung für bessere UX
      await new Promise(resolve => setTimeout(resolve, 1200));
      setAnalyzeStep('Generiere kreative Vorschläge für Texte, Bilder und Videos...');
      
      const results = await analyzerService.analyzeConversation(analyzerMessages);
      
      // Wenn keine Ergebnisse vorhanden sind
      if (results.length === 0) {
        const feedbackMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `📝 Nicht genügend Kontext für sinnvolle Prompt-Vorschläge vorhanden.

Bitte führen Sie die Konversation fort, um mehr Kontext zu schaffen.`,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, feedbackMessage]);
        setIsAnalyzing(false); // Füge hier einen expliziten Reset hinzu
        setAnalyzeStep('');
        return;
      }

      setAnalyzeStep('Formatiere Ergebnisse...');
      
      // Gruppiere Ergebnisse nach Typ
      const textPrompts = results.filter(result => result.type === 'text');
      const imagePrompts = results.filter(result => result.type === 'image');
      const videoPrompts = results.filter(result => result.type === 'video');

      // Kurze Verzögerung für bessere UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Erzeuge eine JSX-Komponente als String für die Chat-Nachricht
      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `✨ Aufgrund unserer Konversation habe ich folgende Prompt-Vorschläge erstellt:

<PromptSelectionView />`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        promptsData: {
          textPrompts,
          imagePrompts,
          videoPrompts
        }
      };

      setMessages(prev => [...prev, analysisMessage]);
      setSelectedSuggestions([]);

      // Warte kurz, bevor die Anzeige geschlossen wird
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: '❌ Bei der Analyse ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Stelle sicher, dass dieser Block IMMER ausgeführt wird
      setIsAnalyzing(false);
      setAnalyzeStep('');
    }
  };

  // Schließe Modell-Dropdown wenn außerhalb geklickt wird
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelSelectorRef]);

  return (
    <div className="w-1/2 flex flex-col h-full bg-[#f0f0f0] relative">
      {/* Inline CSS als Fallback */}
      <style dangerouslySetInnerHTML={{ __html: messageStyles }} />
      
      {isHistoryOpen && (
        <ChatList
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          currentChatId={currentChatId}
          onClose={() => setIsHistoryOpen(false)}
        />
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
            
            {/* Neuer Modell-Auswahlbutton im Stil des Blogbeitrags-Generators */}
            <div className="relative shrink-0" ref={modelSelectorRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm w-56 lg:w-64"
                title="Modell wechseln"
              >
                <SparklesIcon className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel.split('/')[1]}
                </span>
                <ChevronDownIcon className="h-3 w-3 text-gray-500 ml-auto" />
              </button>
              
              {modelDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-1 px-2">
                      KI-Modell wählen
                    </div>
                    <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {AVAILABLE_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            const newModel = model.id;
                            setSelectedModel(newModel);
                            setModelDropdownOpen(false);
                            // Wenn das neue Modell kein Deep Research unterstützt, deaktiviere den Deep Research Modus
                            if (!supportsDeepResearch(newModel)) {
                              setDeepResearchEnabled(false);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                            selectedModel === model.id
                              ? 'bg-gray-100 text-gray-900 shadow-inner'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <SparklesIcon 
                            className={`h-4 w-4 ${
                              selectedModel === model.id
                                ? 'text-amber-500'
                                : 'text-gray-400'
                            }`} 
                          />
                          <div>
                            <div className="font-medium text-sm">{model.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pt-20 space-y-3 pb-36">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div
                key={message.id}
                ref={index === messages.length - 1 ? messagesEndRef : null}
                className={`message-container ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`message relative ${
                    message.sender === 'user'
                      ? 'message-user'
                      : message.sender === 'system'
                        ? 'message-system'
                        : 'message-assistant'
                  }`}
                >
                  <div className="message-header">
                    <span className="timestamp">{formatTime(new Date(message.timestamp))}</span>
                  </div>
                  <div className="message-content">
                    {message.text.includes('<PromptSelectionView />') && message.promptsData ? (
                      <PromptSelectionView
                        textPrompts={message.promptsData.textPrompts}
                        imagePrompts={message.promptsData.imagePrompts}
                        videoPrompts={message.promptsData.videoPrompts || []}
                        selectedPrompts={selectedSuggestions}
                        onPromptSelect={(prompt) => {
                          if ('sendAll' in prompt) {
                            handleSendSelectedSuggestions();
                          } else {
                            const updatedPrompts = selectedSuggestions.some(p => p.id === prompt.id)
                              ? selectedSuggestions.filter(p => p.id !== prompt.id)
                              : [...selectedSuggestions, prompt];
                            setSelectedSuggestions(updatedPrompts);
                          }
                        }}
                      />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(createMarkdownHTML(message.text)) 
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Denkindikator hier einfügen */}
            {isPendingResponse && (
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
                    
                    {/* Deep Research Abbruch-Option */}
                    {deepResearchEnabled && (
                      <div className="ml-auto flex space-x-2">
                        <button 
                          onClick={handleAbort}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                        >
                          Abbrechen
                        </button>
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
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Schreibe deine Nachricht..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-sm text-gray-900"
                  disabled={isPendingResponse}
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
                disabled={isPendingResponse || isUploading}
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
                disabled={isPendingResponse || !messageText.trim()}
                className="p-2.5 pr-4 text-[#2c2c2c] hover:text-[#1a1a1a] focus:outline-none disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
            <button
              onClick={analyzeChat}
              className={`px-5 py-2.5 ${isAnalyzing ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'} rounded-full hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-100 flex items-center space-x-2 ${
                messages.length < 3 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={messages.length < 3 || isAnalyzing}
              title={messages.length < 3 ? 'Mindestens 3 Nachrichten erforderlich' : 'Chat analysieren'}
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  <span>Analysiere...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>Analysieren{messages.length < 3 ? ` (${messages.length}/3)` : ''}</span>
                </>
              )}
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

      {/* Füge die Analyse-Fortschrittsanzeige vor dem Ende der Content Area hinzu */}
      {/* Fortschrittsanzeige der Analyse */}
      {isAnalyzing && (
        <div className="fixed bottom-[80px] left-1/4 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 flex flex-col items-center space-y-3 w-64">
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-5 w-5 border-3 border-gray-900 border-t-transparent rounded-full"></div>
              <span className="font-medium text-gray-900">Analyzer arbeitet...</span>
            </div>
            
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 animate-pulse rounded-full" style={{width: '70%'}}></div>
            </div>
            
            <div className="text-xs text-gray-600 text-center">{analyzeStep}</div>
          </div>
        </div>
      )}
    </div>
  );
} 