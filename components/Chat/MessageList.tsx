'use client';

import React from 'react';
import MessageThread from './MessageThread';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
  readBy: Array<{ id: string; name: string }>;
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      image: string;
    };
  }>;
}

interface MessageListProps {
  messages: Message[];
  onReply: (messageId: string) => void;
  currentUserId?: string;
}

export default function MessageList({ messages, onReply, currentUserId }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageThread
          key={msg.id}
          message={msg}
          onReply={onReply}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}