'use client';

import { Message } from '@/lib/store/chatHistoryStore';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatMessagesProps {
  messages: Message[];
}

const formatTime = (date: string) => {
  return format(new Date(date), 'HH:mm', { locale: de });
};

export default function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-2xl p-4 ${
              message.role === 'user'
                ? 'bg-[#2c2c2c] text-white'
                : 'bg-white text-gray-900'
            }`}
          >
            {message.imageUrl ? (
              <div className="space-y-2">
                <img 
                  src={message.imageUrl} 
                  alt="Generiertes Bild"
                  className="rounded-lg max-w-full h-auto"
                  loading="lazy"
                />
                {message.content && (
                  <p className="text-sm mt-2">{message.content}</p>
                )}
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            <div
              className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 