'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Message, User } from '@prisma/client';
import { format } from 'date-fns';
import { Pin, X } from 'lucide-react';
import MessageReactions from './MessageReactions';

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

interface PinnedMessagesProps {
  messages: MessageWithRelations[];
  currentUser: User;
  onUnpin: (messageId: string) => Promise<void>;
  onMessageClick: (messageId: string) => void;
}

export default function PinnedMessages({
  messages,
  currentUser,
  onUnpin,
  onMessageClick,
}: PinnedMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 w-full text-left text-gray-300 hover:text-white"
      >
        <Pin className="w-4 h-4" />
        <span className="text-sm font-medium">
          {messages.length} {messages.length === 1 ? 'pinned message' : 'pinned messages'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className="bg-gray-700 rounded-lg p-2 cursor-pointer hover:bg-gray-600"
              onClick={() => onMessageClick(message.id)}
            >
              <div className="flex items-start justify-between">
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(message.id);
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
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
                currentUser={currentUser}
                onAddReaction={async () => {}}
                onRemoveReaction={async () => {}}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 