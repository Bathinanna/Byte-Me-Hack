import { useEffect, useRef } from 'react';
import { User } from '../User/User';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender.id === currentUserId ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`flex max-w-[70%] ${
              message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div className="flex-shrink-0 mx-2">
              <User user={message.sender} />
            </div>
            <div
              className={`rounded-lg p-3 ${
                message.sender.id === currentUserId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <p>{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
} 