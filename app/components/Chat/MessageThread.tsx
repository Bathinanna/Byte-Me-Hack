'use client';

import { useState } from 'react';
import { Message, User } from '@prisma/client';
import ThreadedMessage from './ThreadedMessage';
import MessageReactions from './MessageReactions';
import MessageAttachment from './MessageAttachment';
import { useTheme } from '../../layout';
import toast from 'react-hot-toast';

interface MessageWithRelations extends Message {
  user: User;
  replies: MessageWithRelations[];
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
    name: string | null;
    size: number | null;
    createdAt?: Date;
    messageId?: string;
  }[];
}

interface MessageThreadProps {
  message: MessageWithRelations;
  currentUser: User;
  onReply: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onStar: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, reactionId: string) => Promise<void>;
}

export default function MessageThread({
  message,
  currentUser,
  onReply,
  onPin,
  onStar,
  onAddReaction,
  onRemoveReaction,
}: MessageThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { darkMode, setDarkMode } = useTheme();

  return (
    <div className="space-y-4">
      <ThreadedMessage
        message={message}
        currentUser={currentUser}
        onReply={onReply}
        onPin={onPin}
        onStar={onStar}
        onAddReaction={onAddReaction}
        onRemoveReaction={onRemoveReaction}
      />

      {message.replies.length > 0 && (
        <div className="ml-8">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            {isExpanded ? 'Hide replies' : `Show ${message.replies.length} replies`}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-4">
              {message.replies.map((reply) => (
                <ThreadedMessage
                  key={reply.id}
                  message={reply}
                  currentUser={currentUser}
                  onReply={onReply}
                  onPin={onPin}
                  onStar={onStar}
                  onAddReaction={onAddReaction}
                  onRemoveReaction={onRemoveReaction}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}