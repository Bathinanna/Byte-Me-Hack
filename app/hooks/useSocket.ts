import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(url: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(url);
    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [url]);

  return socketRef.current;
} 