'use client';

import { type Message } from '@/lib/store/chatHistoryStore';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm', { locale: de });
  };

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl p-4 transition-all duration-200 ${
              msg.role === 'user'
                ? 'bg-[#2c2c2c] text-white'
                : 'bg-white border border-gray-100 text-gray-700 shadow-sm hover:shadow-md'
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            <p className={`text-xs mt-2 ${
              msg.role === 'user' ? 'text-gray-300' : 'text-gray-400'
            }`}>
              {formatTime(new Date(msg.timestamp))}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 