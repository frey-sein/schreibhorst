import { memo } from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = memo(({ message }: ChatMessageProps) => (
  <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] rounded-2xl p-4 ${
      message.sender === 'user' ? 'bg-[#2c2c2c] text-white' : 'bg-gray-100 text-gray-800'
    }`}>
      <p className="whitespace-pre-wrap text-sm">{message.text}</p>
      <span className="text-xs opacity-70 mt-1 block">
        {new Date(message.timestamp).toLocaleTimeString('de-DE')}
      </span>
    </div>
  </div>
));

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage; 