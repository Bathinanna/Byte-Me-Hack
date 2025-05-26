'use client';

import { useState } from 'react';
import { Message, User } from '@prisma/client';
import { Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface MessageWithRelations extends Message {
  user: User;
  reactions: {
    id: string;
    emoji: string;
    userId: string;
    user: User;
  }[];
}

interface MessageReactionsProps {
  message: MessageWithRelations;
  currentUser: User;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, reactionId: string) => Promise<void>;
}

export default function MessageReactions({
  message,
  currentUser,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onAddReaction(message.id, emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const groupedReactions = message.reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        count: 0,
        users: [],
        id: reaction.id,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user);
    return acc;
  }, {} as Record<string, { count: number; users: User[]; id: string }>);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupedReactions).map(([emoji, { count, users, id }]) => {
          const hasReacted = users.some((user) => user.id === currentUser.id);
          return (
            <button
              key={emoji}
              onClick={() => hasReacted ? onRemoveReaction(message.id, id) : onAddReaction(message.id, emoji)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm ${
                hasReacted ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 text-gray-400 hover:text-gray-300"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {showEmojiPicker && (
        <div className="absolute mt-2">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
    </div>
  );
} 