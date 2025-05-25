'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Message, User } from '@prisma/client';
import { Reply, MoreVertical, Pin, Star, Smile } from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import MessageReactions from './MessageReactions';
import MessageAttachment from './MessageAttachment';

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

interface ThreadedMessageProps {
  message: MessageWithRelations;
  currentUser: User;
  onReply: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onStar: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, reactionId: string) => Promise<void>;
}

export default function ThreadedMessage({
  message,
  currentUser,
  onReply,
  onPin,
  onStar,
  onAddReaction,
  onRemoveReaction,
}: ThreadedMessageProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isCurrentUser = message.userId === currentUser.id;

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onAddReaction(message.id, emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className={`flex flex-col space-y-2 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-start space-x-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700">
            {message.user.image ? (
              <Image
                src={message.user.image}
                alt={message.user.name || 'User'}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm">
                {message.user.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        </div>

        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-300">
              {message.user.name}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'MMM d, h:mm a')}
            </span>
          </div>

          <div className={`mt-1 p-3 rounded-lg ${
            isCurrentUser ? 'bg-green-600' : 'bg-gray-700'
          }`}>
            <p className="text-gray-300">{message.content}</p>
            
            {message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <MessageAttachment
                    key={attachment.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={() => onReply(message.id)}
                className="text-gray-400 hover:text-gray-300"
              >
                <Reply className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPin(message.id)}
                className="text-gray-400 hover:text-gray-300"
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStar(message.id)}
                className="text-gray-400 hover:text-gray-300"
              >
                <Star className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-gray-300"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {showEmojiPicker && (
              <div className="absolute mt-2">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}

            <MessageReactions
              message={message}
              currentUser={currentUser}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />
          </div>

          <div className="mt-1 flex items-center space-x-2">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-gray-400 hover:text-white"
            >
              <Reply className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="text-xs text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map((reaction) => (
                <span
                  key={reaction.id}
                  className="text-xs bg-gray-800 px-2 py-1 rounded-full"
                >
                  {reaction.emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {message.replies.length > 0 && (
        <div className="ml-10">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-sm text-gray-400 hover:text-white"
          >
            {showReplies ? 'Hide replies' : `Show ${message.replies.length} replies`}
          </button>

          {showReplies && (
            <div className="mt-2 space-y-2">
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

function formatFileSize(bytes?: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
} 