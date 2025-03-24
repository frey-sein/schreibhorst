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
import { ChatBubbleLeftIcon, PaperClipIcon, PaperAirplaneIcon, SparklesIcon, PlusIcon, ClockIcon, FolderIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { ChatMessage } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { useFileStore } from '@/lib/store/fileStore';
import { FileItem } from '@/types/files';

interface AnalyzerMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

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

// Definition eines benutzerdefinierten Event-Typs für die Dateifreigabe
interface ShareToChatEventDetail {
  fileData: {
    id: string;
    name: string;
    type: 'file' | 'folder';
    mimeType?: string;
    url?: string;
    path?: string;
    size?: number;
  };
}

interface ShareFilesToChatEventDetail {
  files: Array<{
    id: string;
    name: string;
    type: 'file' | 'folder';
    mimeType?: string;
    url?: string;
    path?: string;
    size?: number;
  }>;
  folders?: string[];
}

interface UploadCompleteEventDetail {
  message: string;
}

// Deklariere die benutzerdefinierten Event-Typen
declare global {
  interface WindowEventMap {
    'shareFileToChat': CustomEvent<ShareToChatEventDetail>;
    'shareFilesToChat': CustomEvent<ShareFilesToChatEventDetail>;
    'uploadComplete': CustomEvent<UploadCompleteEventDetail>;
  }
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'openai/gpt-4-turbo-preview');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string>(uuidv4());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<AnalysisResult[]>([]);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [selectedFileItems, setSelectedFileItems] = useState<FileItem[]>([]);

  // Get prompt store functions
  const { addPrompt } = usePromptStore();
  const { addChat, updateChat, getChat } = useChatHistoryStore();

  // Zugriff auf den Dateimanager
  const { 
    getCurrentItems, 
    currentPath, 
    navigateToFolder, 
    navigateBack, 
    getBreadcrumbPath,
    loadFiles,
    initializePath
  } = useFileStore();

  const chatService = ChatService.getInstance();
  const analyzerService = new ChatAnalyzer();
  const documentService = DocumentService.getInstance();

  // Dateimanager beim Start initialisieren
  useEffect(() => {
    const initializeFileManager = async () => {
      console.log("Initialisiere Dateimanager...");
      // Lade den zuletzt gespeicherten Pfad
      initializePath();
      
      // Lade Dateien vom Server oder aus dem lokalen Speicher
      try {
        await loadFiles();
        console.log("Dateien erfolgreich geladen");
      } catch (error) {
        console.error("Fehler beim Laden der Dateien:", error);
      }
    };
    
    initializeFileManager();
  }, [initializePath, loadFiles]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Funktion, um eine automatische Antwort vom KI-Assistenten zu erhalten
  const handleSendFileSelectionToAI = useCallback(async (userMessage: string) => {
    setIsLoading(true);
    
    try {
      await chatService.streamMessage(
        userMessage,
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
  }, [selectedModel, chatService]);

  // Funktion zur Verarbeitung und Anzeige von Dateiinhalten im Chat
  const fetchAndDisplayFileContent = useCallback(async (fileData: ShareToChatEventDetail['fileData']) => {
    if (!fileData || fileData.type === 'folder') return;
    
    try {
      setIsLoading(true);
      console.log('Versuche Dateiinhalt zu laden für:', fileData);
      
      // Bereite die URL für den Datei-Abruf vor
      let fileUrl = '';
      if (fileData.url) {
        fileUrl = fileData.url;
        console.log('Verwende URL:', fileUrl);
      } else if (fileData.path) {
        fileUrl = fileData.path;
        console.log('Verwende Pfad als URL:', fileUrl);
      }
      
      // Versuche eine URL zu generieren, wenn keine vorhanden ist
      if (!fileUrl && fileData.name) {
        // Generiere eine API-URL basierend auf der ID
        fileUrl = `/api/files/${fileData.id || 'unknown'}`;
        console.log('Generierte API-URL:', fileUrl);
      }
      
      if (!fileUrl) {
        console.warn('Keine direkte URL für die Datei gefunden:', fileData.name);
        
        // Erstelle eine Nachricht ohne Inhaltsabruf
        const message: ChatMessage = {
          id: Date.now().toString(),
          text: `Ich habe die Datei "${fileData.name}" ausgewählt, konnte aber nicht auf den Inhalt zugreifen. Die Datei scheint keine verfügbare URL zu haben.`,
          sender: 'user',
          timestamp: new Date().toISOString()
        };
        
        // Füge die Nachricht zum Chat hinzu
        setMessages(prev => [...prev, message]);
        
        // Frage den Assistenten nach Hilfe
        await handleSendFileSelectionToAI(message.text);
        return;
      }
      
      // Führe die URL zu einer vollständigen URL zusammen
      if (!fileUrl.startsWith('http') && !fileUrl.startsWith('blob:')) {
        const baseUrl = window.location.origin;
        fileUrl = `${baseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        console.log('Vollständige URL:', fileUrl);
      }
      
      // Hole den Dateiinhalt basierend auf dem MIME-Typ
      let fileContent = '';
      const mimeType = fileData.mimeType || '';
      
      // Für Textdateien
      if (mimeType.startsWith('text/') || 
          fileData.name.endsWith('.txt') || 
          fileData.name.endsWith('.md') || 
          fileData.name.endsWith('.js') || 
          fileData.name.endsWith('.ts') || 
          fileData.name.endsWith('.html') || 
          fileData.name.endsWith('.css') || 
          fileData.name.endsWith('.json')) {
        
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Fehler beim Laden der Datei: ${response.statusText}`);
          }
          
          fileContent = await response.text();
          
          // Begrenzen der Anzahl der Zeichen, um die Nachricht nicht zu groß zu machen
          if (fileContent.length > 5000) {
            fileContent = fileContent.substring(0, 5000) + '...\n[Datei gekürzt, da zu groß]';
          }
          
          // Erstelle eine Nachricht mit dem Dateiinhalt
          const message: ChatMessage = {
            id: Date.now().toString(),
            text: `Hier ist der Inhalt der Datei "${fileData.name}":\n\n\`\`\`\n${fileContent}\n\`\`\`\n\nBitte analysiere diesen Inhalt.`,
            sender: 'user',
            timestamp: new Date().toISOString()
          };
          
          // Füge die Nachricht zum Chat hinzu
          setMessages(prev => [...prev, message]);
          
          // Hier verwenden wir direkt den Aufruf des Chat-Services, um die zyklische Abhängigkeit zu vermeiden
          setIsLoading(true);
          try {
            await chatService.streamMessage(
              message.text,
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
          } catch (error) {
            console.error('Fehler bei der KI-Antwort:', error);
          }
        } catch (fetchError) {
          console.error('Fehler beim Abrufen der Datei:', fetchError);
          // Erstelle eine Nachricht über den Fehler
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            text: `Ich konnte den Inhalt der Datei "${fileData.name}" nicht laden. Fehler: ${fetchError instanceof Error ? fetchError.message : 'Unbekannter Fehler'}`,
            sender: 'user',
            timestamp: new Date().toISOString()
          };
          
          // Füge die Nachricht zum Chat hinzu
          setMessages(prev => [...prev, errorMessage]);
          await handleSendFileSelectionToAI(errorMessage.text);
        }
      }
      // Für Bilder
      else if (mimeType.startsWith('image/') || 
               fileData.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        
        // Erstelle eine Nachricht mit einem Hinweis, dass es sich um ein Bild handelt
        const message: ChatMessage = {
          id: Date.now().toString(),
          text: `Ich habe das Bild "${fileData.name}" ausgewählt. Da KI-Assistenten Bilder nicht direkt sehen können, kannst du mir bitte beschreiben, was das Bild zeigt oder welche Informationen du daraus benötigst?`,
          sender: 'user',
          timestamp: new Date().toISOString()
        };
        
        // Füge die Nachricht zum Chat hinzu
        setMessages(prev => [...prev, message]);
      } 
      // Für Dokumente und andere Dateitypen
      else {
        // Erstelle eine Nachricht mit einem Hinweis, dass der Dateityp nicht unterstützt wird
        const message: ChatMessage = {
          id: Date.now().toString(),
          text: `Ich habe die Datei "${fileData.name}" ausgewählt. Der Dateityp "${mimeType || 'unbekannt'}" kann leider nicht direkt im Chat angezeigt werden. Was möchtest du mit dieser Datei machen?`,
          sender: 'user',
          timestamp: new Date().toISOString()
        };
        
        // Füge die Nachricht zum Chat hinzu
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Fehler bei der Verarbeitung der Datei:', error);
      
      // Fehler als Nachricht im Chat anzeigen
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Beim Laden der Datei ist ein Fehler aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, chatService, handleSendFileSelectionToAI]);

  useEffect(() => {
    // Setze die Willkommensnachricht nach dem Mounten
    setMessages([
      {
        id: 'welcome',
        text: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Event-Handler für das Teilen von Dateien aus dem Dateimanager
    const handleFileShare = (event: CustomEvent<ShareToChatEventDetail>) => {
      const { fileData } = event.detail;
      
      if (fileData) {
        console.log("Datei wurde geteilt:", fileData);
        
        // Ermittle, ob es sich um eine Datei oder einen Ordner handelt
        const isFolder = fileData.type === 'folder';
        
        // Erstelle eine angemessene Beschreibung
        const itemTypeText = isFolder ? 'Ordner' : 'Datei';
        const itemIcon = isFolder ? '📁' : '📄';
        const itemDetails = !isFolder ? ` (${fileData.mimeType || 'Unbekannter Typ'})` : '';
        
        // Formatiere die Nachricht
        const fileInfo = `- ${itemIcon} **${fileData.name}**${itemDetails}`;
        
        const message: ChatMessage = {
          id: Date.now().toString(),
          text: `Ich teile folgenden ${itemTypeText} aus dem Dateimanager:\n\n${fileInfo}`,
          sender: 'user',
          timestamp: new Date().toISOString()
        };
        
        // Füge die Nachricht zum Chat hinzu
        setMessages(prev => [...prev, message]);
        
        // Wenn es eine Textdatei ist, versuche den Inhalt abzurufen und anzuzeigen
        if (!isFolder) {
          fetchAndDisplayFileContent(fileData);
        } else {
          // Bei Ordnern senden wir eine normale Anfrage
          handleSendFileSelectionToAI(message.text);
        }
      }
    };
    
    // Handler für mehrere Dateien
    const handleMultipleFilesShare = (event: CustomEvent<ShareFilesToChatEventDetail>) => {
      const { files } = event.detail;
      
      if (files && files.length > 0) {
        console.log("Mehrere Dateien wurden geteilt:", files.length);
        
        // Erstelle eine Liste der Dateien mit Icons und Typen
        const filesList = files.map(file => 
          `- 📄 **${file.name}** ${file.mimeType ? `(${file.mimeType})` : ''}`
        ).join('\n');
        
        // Erstelle eine Nachricht für den Chat
        const message: ChatMessage = {
          id: uuidv4(),
          text: `Ich habe ${files.length} Dateien hochgeladen:\n\n${filesList}`,
          sender: 'user',
          timestamp: new Date().toISOString()
        };
        
        // Füge die Nachricht zum Chat hinzu
        setMessages(prev => [...prev, message]);
        
        // Fordere eine KI-Antwort an
        handleSendFileSelectionToAI(message.text);
      }
    };
    
    // Event-Listener registrieren
    window.addEventListener('shareFileToChat', handleFileShare);
    window.addEventListener('shareFilesToChat', handleMultipleFilesShare);
    
    // Event-Listener entfernen, wenn die Komponente unmounted wird
    return () => {
      window.removeEventListener('shareFileToChat', handleFileShare);
      window.removeEventListener('shareFilesToChat', handleMultipleFilesShare);
    };
  }, [fetchAndDisplayFileContent, handleSendFileSelectionToAI]);

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

  // Funktion, um Informationen über ausgewählte Dateien in den Chat einzufügen
  const handleShareFilesToChat = () => {
    if (selectedFileItems.length === 0) return;
    
    // Dateien und Ordner trennen
    const selectedFiles = selectedFileItems.filter(item => item.type === 'file');
    const selectedFolders = selectedFileItems.filter(item => item.type === 'folder');
    
    // Erstelle formatierte Informationen über Dateien
    let fileInfos = '';
    if (selectedFiles.length > 0) {
      fileInfos += `\n**Dateien:**\n`;
      fileInfos += selectedFiles.map(file => 
        `- 📄 **${file.name}** (${file.mimeType || 'Unbekannter Typ'})`
      ).join('\n');
    }
    
    // Erstelle formatierte Informationen über Ordner
    let folderInfos = '';
    if (selectedFolders.length > 0) {
      folderInfos += `\n**Ordner:**\n`;
      folderInfos += selectedFolders.map(folder => 
        `- 📁 **${folder.name}**`
      ).join('\n');
    }
    
    const paths = getBreadcrumbPath()
      .map(folder => folder.name)
      .join(' / ');
    
    // Generiere einen passenden Titel basierend auf der Auswahl
    let titleText = '';
    if (selectedFiles.length > 0 && selectedFolders.length > 0) {
      titleText = `Ich habe folgende ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Datei' : 'Dateien'} und ${selectedFolders.length} ${selectedFolders.length === 1 ? 'Ordner' : 'Ordner'} aus dem Verzeichnis "${paths}" ausgewählt:`;
    } else if (selectedFiles.length > 0) {
      titleText = `Ich habe folgende ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Datei' : 'Dateien'} aus dem Verzeichnis "${paths}" ausgewählt:`;
    } else if (selectedFolders.length > 0) {
      titleText = `Ich habe folgende ${selectedFolders.length} ${selectedFolders.length === 1 ? 'Ordner' : 'Ordner'} aus dem Verzeichnis "${paths}" ausgewählt:`;
    }
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      text: `${titleText}${fileInfos}${folderInfos}`,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, message]);
    setSelectedFileItems([]);
    setIsFilePickerOpen(false);
    
    // Automatisch eine Antwort vom KI-Assistenten anfordern
    handleSendFileSelectionToAI(message.text);
  };
  
  // Komponente zur Auswahl von Dateien aus dem Dateimanager
  const FilePicker = () => {
    const currentItems = getCurrentItems();
    const breadcrumbPath = getBreadcrumbPath();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const multipleFilesInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileStore = useFileStore();
    const currentFolderId = fileStore.getCurrentFolderId();

    // Funktion zum Erstellen einzigartiger IDs
    const generateUniqueId = () => `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const handleShareFile = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleMultipleFilesUpload = () => {
      if (multipleFilesInputRef.current) {
        multipleFilesInputRef.current.click();
      }
    };

    const handleFolderSelection = () => {
      if (folderInputRef.current) {
        folderInputRef.current.click();
      }
    };

    const processFileForFileSystem = (file: File, parentId: string = currentFolderId): FileItem => {
      // Erstellen eines FileItem-Objekts für das Dateisystem
      return {
        id: generateUniqueId(),
        name: file.name,
        type: 'file',
        size: file.size,
        mimeType: file.type,
        path: URL.createObjectURL(file), // Temporäre URL für die Vorschau
        url: URL.createObjectURL(file),  // Temporäre URL für Downloads
        parentId: parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModified: new Date(file.lastModified)
      };
    };

    const uploadFilesWithProgress = async (files: File[]) => {
      if (files.length === 0) return;
      
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simuliere Upload-Fortschritt
      const totalFiles = files.length;
      const fileItems: FileItem[] = [];
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const fileItem = processFileForFileSystem(file);
        fileItems.push(fileItem);
        
        // Aktualisiere den Fortschritt
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        
        // Simuliere Netzwerklatenz
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Füge alle Dateien zum Dateisystem hinzu
      await fileStore.addFilesToFileSystem(fileItems);
      
      // Sende ein Erfolgs-Event, um Feedback zu geben
      const uploadCompleteEvent = new CustomEvent('uploadComplete', {
        detail: { message: `${totalFiles} Dateien wurden hochgeladen` }
      });
      window.dispatchEvent(uploadCompleteEvent);
      
      setIsUploading(false);
      setUploadProgress(0);
      
      return fileItems;
    };

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      // Verarbeite die Datei und füge sie zum Dateisystem hinzu
      const uploadedFiles = await uploadFilesWithProgress(Array.from(files));
      
      if (!uploadedFiles || uploadedFiles.length === 0) return;
      
      const file = uploadedFiles[0];
      const fileData = {
        id: file.id,
        name: file.name,
        type: 'file',
        mimeType: file.mimeType,
        url: file.url,
        path: file.path,
        size: file.size
      };

      const shareEvent = new CustomEvent('shareFileToChat', { 
        detail: { fileData } 
      });
      window.dispatchEvent(shareEvent);
      
      // Zurücksetzen des Input-Felds und schließen des FilePickers
      event.target.value = '';
      setIsFilePickerOpen(false);
    };
    
    const handleMultipleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      // Verarbeite die Dateien und füge sie zum Dateisystem hinzu
      const uploadedFiles = await uploadFilesWithProgress(Array.from(files));
      
      if (!uploadedFiles || uploadedFiles.length === 0) return;
      
      // Erstelle ein Ereignis mit allen ausgewählten Dateien
      const filesData = uploadedFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: 'file',
        mimeType: file.mimeType,
        url: file.url,
        path: file.path,
        size: file.size
      }));

      const shareEvent = new CustomEvent('shareFilesToChat', { 
        detail: { files: filesData } 
      });
      window.dispatchEvent(shareEvent);
      
      // Zurücksetzen des Input-Felds und schließen des FilePickers
      event.target.value = '';
      setIsFilePickerOpen(false);
    };

    const handleFolderSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      // Verwende ein beliebiges Objekt für die webkitEntries
      // Dies ist ein Workaround für die TypeScript-Typisierung
      const target = event.target as any;
      const items = target.webkitEntries || 
                   (target.files && Array.from(target.files).map((file: any) => 
                     file.webkitGetAsEntry && file.webkitGetAsEntry()
                   ).filter(Boolean));
      
      if (items && items.length > 0) {
        console.log("Ordner wurde ausgewählt, aber die API wird nicht unterstützt");
        // Hier würden wir die Ordnerverarbeitung implementieren
        // Da dies jedoch komplex ist und Browserunterstützung erfordert,
        // zeigen wir nur eine Meldung an
        alert("Ordnerupload wird von Ihrem Browser nicht unterstützt");
      }
      
      // Zurücksetzen des Input-Felds
      event.target.value = '';
    };

    // Funktion zum Teilen einer ausgewählten Datei
    const handleShareSelectedFile = (file: FileItem) => {
      // Debugging-Ausgabe
      console.log('Teile Datei:', file);
      
      // Stelle sicher, dass wir eine URL haben
      let fileUrl = file.url || file.path;
      console.log('Verwendete URL oder Pfad:', fileUrl);
      
      // Wenn keine URL vorhanden ist, erstelle eine Fehlermeldung im Chat statt den Fehler zu werfen
      const fileData = {
        id: file.id,
        name: file.name,
        type: file.type,
        mimeType: file.mimeType,
        url: fileUrl,
        path: fileUrl,
        size: file.size
      };
      
      console.log('Erstelltes fileData-Objekt:', fileData);

      // Erstelle ein benutzerdefinierten Event zum Teilen der Datei im Chat
      const shareEvent = new CustomEvent('shareFileToChat', { 
        detail: { fileData } 
      });
      window.dispatchEvent(shareEvent);
      
      // Schließe den FilePicker
      setIsFilePickerOpen(false);
    };

    return (
      <div className="absolute inset-0 z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-medium text-gray-800">Dateien auswählen</h2>
          <button 
            onClick={() => setIsFilePickerOpen(false)}
            className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-200"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
        
        {/* Breadcrumb Navigation */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 flex-wrap">
            {breadcrumbPath.map((folder, index) => (
              <div key={`breadcrumb-${folder.id}-${index}`} className="flex items-center">
                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                <button
                  onClick={() => {
                    if (index === 0) {
                      navigateToFolder('root');
                    } else {
                      navigateToFolder(folder.id);
                    }
                  }}
                  className="hover:text-[#2c2c2c] hover:underline"
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Upload-Fortschritt */}
        {isUploading && (
          <div className="p-4 mb-2 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Datei wird hochgeladen...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Upload-Optionen */}
        <div className="p-4 bg-gray-50 border-b border-gray-300">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShareFile}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 font-medium text-sm flex items-center shadow-sm"
              disabled={isUploading}
            >
              <PaperClipIcon className="h-4 w-4 mr-2 text-gray-700" />
              Datei hochladen
            </button>
            
            <button
              onClick={handleMultipleFilesUpload}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 font-medium text-sm flex items-center shadow-sm"
              disabled={isUploading}
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2 text-gray-700" />
              Mehrere Dateien
            </button>
            
            <button
              onClick={handleFolderSelection}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 font-medium text-sm flex items-center shadow-sm"
              disabled={isUploading}
            >
              <FolderIcon className="h-4 w-4 mr-2 text-gray-700" />
              Ordner hochladen
            </button>
          </div>
        </div>
        
        {/* Dateien anzeigen */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentItems.length === 0 ? (
            <p className="text-center text-gray-500 my-8">
              Keine Dateien in diesem Ordner. Laden Sie Dateien hoch oder erstellen Sie einen neuen Ordner.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'folder') {
                      navigateToFolder(item.id);
                    } else {
                      handleShareSelectedFile(item);
                    }
                  }}
                  className="p-4 rounded-lg border border-gray-300 hover:border-[#2c2c2c] hover:shadow-md transition-all cursor-pointer bg-white"
                >
                  <div className="flex flex-col items-center">
                    {item.type === 'folder' ? (
                      <FolderIcon className="h-10 w-10 text-[#2c2c2c]" />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center text-gray-500 bg-gray-100 rounded">
                        {item.mimeType?.includes('image') ? '🖼️' : '📄'}
                      </div>
                    )}
                    <span className="mt-2 text-base font-medium text-gray-800 text-center truncate w-full">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Versteckte Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelected}
          className="hidden"
        />
        
        <input
          ref={multipleFilesInputRef}
          type="file"
          multiple
          onChange={handleMultipleFilesSelected}
          className="hidden"
        />
        
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore - webkitdirectory ist eine nicht-standardmäßige Eigenschaft
          webkitdirectory=""
          // @ts-ignore - directory ist eine nicht-standardmäßige Eigenschaft
          directory=""
          onChange={handleFolderSelected}
          className="hidden"
        />
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
      
      {isFilePickerOpen && <FilePicker />}
      
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
      <div className="flex-1 overflow-y-auto p-8 pt-24 space-y-6 pb-36">
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
                  <div 
                    className="whitespace-pre-wrap text-sm prose prose-sm max-w-none"
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
                        h3: ({ node, ...props }) => (
                          <h3 className="text-xl font-semibold mb-4 bg-gray-50 p-4 rounded-lg" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-3 leading-relaxed" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-gray-700" {...props} />
                        ),
                        a: ({ node, href, ...props }) => (
                          <a
                            href={href}
                            className={`inline-flex items-center px-5 py-2.5 rounded-full transition-colors text-sm font-medium ${
                              selectedSuggestions.some(s => s.prompt === props.children?.toString().match(/\((\d+)\)/)?.[1])
                                ? 'bg-[#2c2c2c] text-white hover:bg-[#1a1a1a]'
                                : 'bg-[#2c2c2c] text-white hover:bg-[#1a1a1a]'
                            } focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20`}
                            onClick={(e) => {
                              e.preventDefault();
                              if (props.children) {
                                handleMessageClick(message, props.children.toString());
                              }
                            }}
                            {...props}
                          >
                            {selectedSuggestions.some(s => s.prompt === props.children?.toString().match(/\((\d+)\)/)?.[1])
                              ? '✓ Ausgewählt'
                              : '+ Auswählen'}
                          </a>
                        ),
                        hr: () => (
                          <hr className="my-4 border-gray-200" />
                        )
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                  <span className="text-xs opacity-70 mt-2 block">
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
                onClick={() => setIsFilePickerOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                aria-label="Dateien auswählen oder hochladen"
                title="Dateien auswählen oder hochladen"
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