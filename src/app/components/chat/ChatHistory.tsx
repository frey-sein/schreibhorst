'use client';

import { useChatHistoryStore, type Message } from '@/lib/store/chatHistoryStore';
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
    <div className="h-full">
      <div className="divide-y divide-gray-100">
        {chats.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Keine Chats verfügbar
          </div>
        ) : (
          chats.map((chat) => (
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
          ))
        )}
      </div>
    </div>
  );
} 