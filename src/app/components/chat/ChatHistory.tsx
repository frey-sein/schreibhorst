'use client';

import { useChatHistoryStore } from '@/lib/store/chatHistoryStore';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatHistoryProps {
  onSelectChat: (chatId: string) => void;
  onClose: () => void;
}

export default function ChatHistory({ onSelectChat, onClose }: ChatHistoryProps) {
  const { chats, deleteChat } = useChatHistoryStore();

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-96 bg-white/95 shadow-lg z-50 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Chat-Verlauf</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Keine Chats verfügbar
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {chat.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(chat.lastUpdated)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 