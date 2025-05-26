'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Paperclip, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { socket } from '@/lib/socket';

interface ChatInputProps {
  roomId: string;
  onSendMessage: (content: string, attachments?: File[]) => void;
}

export default function ChatInput({ roomId, onSendMessage }: ChatInputProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Listen for typing events
    socket.on('typing', ({ userId, roomId: typingRoomId, isTyping }) => {
      if (typingRoomId === roomId && userId !== session?.user?.id) {
        // Handle typing indicator
        console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
      }
    });

    return () => {
      socket.off('typing');
    };
  }, [roomId, session?.user?.id]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { roomId, isTyping: false });
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    onSendMessage(message, attachments);
    setMessage('');
    setAttachments([]);
    setIsEmojiPickerOpen(false);
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    socket.emit('typing', { roomId, isTyping: false });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2">
          {attachments.map((file, index) => (
            <div key={index} className="relative">
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded"
                />
              ) : (
                <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-sm text-gray-500">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <Smile size={20} />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isEmojiPickerOpen && (
            <div className="absolute bottom-full mb-2">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>

        <label className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer">
          <Paperclip size={20} />
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <button
          type="submit"
          disabled={!message.trim() && attachments.length === 0}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
} 