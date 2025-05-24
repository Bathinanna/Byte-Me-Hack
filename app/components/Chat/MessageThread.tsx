'use client';

import React from 'react';
import { format } from 'date-fns';
import { CornerDownRight, Check, CheckCheck } from 'lucide-react';
import UserAvatar from '../User/UserAvatar';

interface MessageThreadProps {
  message: {
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
  };
  onReply: (messageId: string) => void;
  currentUserId?: string;
}

export default function MessageThread({ message, onReply, currentUserId }: MessageThreadProps) {
  const isRead = message.readBy.some(user => user.id !== message.user.id);
  const isReadByAll = message.readBy.length > 1;

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-2">
        <UserAvatar user={message.user} size={32} />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{message.user.name}</span>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {currentUserId === message.user.id && (
              <span className="ml-auto">
                {isReadByAll ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : isRead ? (
                  <Check className="w-4 h-4 text-gray-500" />
                ) : null}
              </span>
            )}
          </div>
          <p className="mt-1">{message.content}</p>
          <button
            onClick={() => onReply(message.id)}
            className="mt-1 text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <CornerDownRight className="w-4 h-4" />
            <span>Reply</span>
          </button>
        </div>
      </div>

      {message.replies.length > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-gray-100 pl-4">
          {message.replies.map((reply) => (
            <div key={reply.id} className="flex items-start space-x-2">
              <UserAvatar user={reply.user} size={24} />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{reply.user.name}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(reply.createdAt), 'HH:mm')}
                  </span>
                </div>
                <p className="text-sm mt-1">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}