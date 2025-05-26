'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/app/lib/socket';

interface UserPresence {
  id: string;
  isOnline: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
}

export const usePresence = (roomId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const setupSocket = async () => {
      const s = await getSocket();
      s.emit('presence:join', { roomId, userId });
      s.on('presence:update', (users: UserPresence[]) => {
        setOnlineUsers(users);
      });
      s.on('typing:start', (userId: string) => {
        setTypingUsers(prev => [...prev, userId]);
      });
      s.on('typing:stop', (userId: string) => {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      });
    };
    setupSocket();
  }, [roomId, userId]);

  const updateTypingStatus = async (isTyping: boolean) => {
    const s = await getSocket();
    s.emit('typing:update', { roomId, userId, isTyping });
  };

  return {
    onlineUsers,
    typingUsers,
    updateTypingStatus,
  };
};