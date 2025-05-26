'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Message, User } from '@prisma/client';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react';
import MessageReactions from './MessageReactions';
import { useTheme } from '../../layout';
import toast from 'react-hot-toast';

interface MessageWithRelations extends Message {
  user: User;
  reactions: {
    id: string;
    emoji: string;
    userId: string;
    user: User;
  }[];
  attachments: {
    id: string;
    type: string;
    url: string;
    name: string;
    size: number;
  }[];
}

interface MessageSearchProps {
  onSearch: (query: string) => Promise<void>;
  onMessageClick: (messageId: string) => void;
  messages: MessageWithRelations[];
  isLoading: boolean;
}

export default function MessageSearch({
  onSearch,
  onMessageClick,
  messages,
  isLoading,
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { darkMode, setDarkMode } = useTheme();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      try {
        await onSearch(query);
        setIsExpanded(true);
      } catch (error) {
        toast.error('An error occurred while searching');
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-8 pr-4 py-1 bg-gray-700 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search
        </button>
      </form>

      {isExpanded && (
        <div className="mt-2">
          {isLoading ? (
            <div className="text-center text-gray-400 py-4">Searching...</div>
          ) : messages.length > 0 ? (
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="bg-gray-700 rounded-lg p-2 cursor-pointer hover:bg-gray-600"
                  onClick={() => onMessageClick(message.id)}
                >
                  <div className="flex items-center space-x-2">
                    <Image
                      src={message.user.image || '/default-avatar.png'}
                      alt={message.user.name || 'User'}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        {message.user.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-gray-300 line-clamp-2">
                    {message.content}
                  </p>

                  {message.attachments.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {message.attachments.length} {message.attachments.length === 1 ? 'attachment' : 'attachments'}
                    </div>
                  )}

                  <MessageReactions
                    message={message}
                    currentUser={message.user}
                    onAddReaction={async () => {}}
                    onRemoveReaction={async () => {}}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-4">No messages found</div>
          )}
        </div>
      )}
    </div>
  );
} 