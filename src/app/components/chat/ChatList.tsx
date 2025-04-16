'use client';

import { useState, useEffect } from 'react';
import { DBChat } from '@/lib/db/chatDb';
import { PlusIcon, TrashIcon, PencilIcon, ChevronRightIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useUser } from '@/app/hooks/useUser';

interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId: string;
  onClose: () => void;
}

export default function ChatList({ onSelectChat, onNewChat, currentChatId, onClose }: ChatListProps) {
  const [chats, setChats] = useState<DBChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { user } = useUser();

  // Lade Chats beim Mounten der Komponente oder wenn sich der Benutzer ändert
  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chats');
        if (!response.ok) {
          throw new Error(`Fehler beim Laden der Chats: ${response.status}`);
        }
        const data = await response.json();
        setChats(data);
      } catch (err) {
        console.error('Fehler beim Laden der Chats:', err);
        setError('Chats konnten nicht geladen werden.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchChats();
    }
  }, [user]);

  // Funktion zum Löschen eines Chats
  const handleDeleteChat = async (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Verhindere Bubble-Up zum übergeordneten Element
    
    if (!confirm('Möchten Sie diesen Chat wirklich löschen?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/chats', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: chatId }),
      });
      
      if (!response.ok) {
        throw new Error(`Fehler beim Löschen des Chats: ${response.status}`);
      }
      
      // Entferne den gelöschten Chat aus der lokalen Liste
      setChats(chats.filter(chat => chat.id !== chatId));
      
      // Falls der aktuelle Chat gelöscht wurde, erstelle einen neuen
      if (chatId === currentChatId) {
        onNewChat();
      }
    } catch (err) {
      console.error('Fehler beim Löschen des Chats:', err);
      setError('Chat konnte nicht gelöscht werden.');
    }
  };

  // Funktion zum Aktualisieren eines Chat-Titels
  const handleUpdateChatTitle = async (chatId: string, event: React.FormEvent) => {
    event.preventDefault();
    
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    
    try {
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: chatId, title: editTitle }),
      });
      
      if (!response.ok) {
        throw new Error(`Fehler beim Aktualisieren des Chats: ${response.status}`);
      }
      
      // Aktualisiere den Chat in der lokalen Liste
      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, title: editTitle } : chat
      ));
      
      // Beende den Bearbeitungsmodus
      setEditingChatId(null);
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Chats:', err);
      setError('Chat-Titel konnte nicht aktualisiert werden.');
    }
  };

  // Funktion zum Starten der Bearbeitung eines Chat-Titels
  const startEditing = (chatId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Verhindere Bubble-Up zum übergeordneten Element
    setEditingChatId(chatId);
    setEditTitle(currentTitle);
  };

  // Formatiere das Datum
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd. MMMM yyyy, HH:mm', { locale: de });
    } catch (error) {
      console.error('Fehler beim Formatieren des Datums:', error);
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden flex flex-col">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-medium text-gray-900">Meine Chats</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronRightIcon className="w-5 h-5 text-gray-700" />
        </button>
      </div>
      
      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center mb-4 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2 text-gray-700" />
          <span className="text-gray-900">Neuen Chat erstellen</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Keine Chats vorhanden. Erstellen Sie einen neuen Chat, um zu beginnen.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => editingChatId !== chat.id && onSelectChat(chat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  chat.id === currentChatId && editingChatId !== chat.id
                    ? 'bg-gray-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                {editingChatId === chat.id ? (
                  <form onSubmit={(e) => handleUpdateChatTitle(chat.id, e)} className="flex">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-3 py-1 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-gray-800 text-white rounded-r-lg"
                    >
                      Speichern
                    </button>
                  </form>
                ) : (
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{chat.title}</div>
                      <div className="text-xs text-gray-700 mt-1 flex items-center">
                        <span className="mr-2">
                          {formatDate(chat.updated_at)}
                        </span>
                        {chat.last_message_preview && (
                          <>
                            <span className="inline-block w-1 h-1 bg-gray-500 rounded-full mr-2"></span>
                            <span className="truncate max-w-[180px] inline-block text-gray-700">
                              {chat.last_message_preview}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => startEditing(chat.id, chat.title, e)}
                        className="p-2 rounded-full hover:bg-gray-200"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-700" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="p-2 rounded-full hover:bg-gray-200"
                      >
                        <TrashIcon className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 