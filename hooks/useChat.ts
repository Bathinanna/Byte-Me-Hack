import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const socket = useSocket(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001');

  const sendMessage = useCallback(
    (content: string) => {
      if (socket) {
        socket.emit('message', { roomId, content });
      }
    },
    [socket, roomId]
  );

  useEffect(() => {
    if (!socket) return;

    socket.emit('join', roomId);

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit('leave', roomId);
      socket.off('message');
    };
  }, [socket, roomId]);

  return {
    messages,
    sendMessage,
  };
} 