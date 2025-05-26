'use client';

import React from 'react';
import MessageThread from './MessageThread';
import { Message, User } from '@prisma/client';

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
    name: string;
    size: number;
  }[];
}

interface MessageListProps {
  messages: MessageWithRelations[];
  onReply: (messageId: string) => void;
  currentUser: User;
  onPin: (messageId: string) => void;
  onStar: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
}

export default function MessageList({
  messages,
  onReply,
  currentUser,
  onPin,
  onStar,
  onAddReaction,
  onRemoveReaction,
}: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageThread
          key={msg.id}
          message={msg}
          onReply={onReply}
          currentUser={currentUser}
          onPin={onPin}
          onStar={onStar}
          onAddReaction={async (...args) => { onAddReaction(...args); }}
          onRemoveReaction={async (...args) => { onRemoveReaction(...args); }}
        />
      ))}
    </div>
  );
}