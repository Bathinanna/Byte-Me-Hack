'use client';

import { useState, useEffect } from 'react';
import { initSocket } from '@/app/lib/socket';

interface UserPresence {
  id: string;
  isOnline: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
}

export const usePresence = (roomId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socket = initSocket();

  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    // Join room and update presence
    socket.emit('presence:join', { roomId, userId });

    // Listen for presence updates
    socket.on('presence:update', (users: UserPresence[]) => {
      setOnlineUsers(users);
    });

    // Listen for typing status
    socket.on('typing:update', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev =>
        isTyping
          ? [...new Set([...prev, userId])]
          : prev.filter(id => id !== userId)
      );
    });

    // Update last seen on window focus/blur
    const handleVisibilityChange = () => {
      socket.emit('presence:update', {
        roomId,
        userId,
        isOnline: !document.hidden,
        lastSeen: document.hidden ? new Date() : undefined,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      socket.emit('presence:leave', { roomId, userId });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, roomId, userId]);

  const updateTypingStatus = (isTyping: boolean) => {
    socket.emit('typing:update', { roomId, userId, isTyping });
  };

  return {
    onlineUsers,
    typingUsers,
    updateTypingStatus,
  };
};