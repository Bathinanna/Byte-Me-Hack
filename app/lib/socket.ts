import { io } from 'socket.io-client';
import { getSession } from 'next-auth/react';

// For development, you might explicitly use: const SOCKET_URL = 'http://localhost:3000';
// For production, this would be your deployed server URL.
// Using io() without arguments defaults to the current host and port, which should work with the custom server.
let socketInstance: ReturnType<typeof io> | null = null;

export const getSocket = async () => {
  if (!socketInstance) {
    const session = await getSession();
    socketInstance = io({
      auth: {
        userId: session?.user?.id,
        userName: session?.user?.name,
      },
    });
  }
  return socketInstance;
};

// Export a default socket instance that will be initialized when needed
export const socket = {
  on: async (event: string, callback: (...args: any[]) => void) => {
    const s = await getSocket();
    s.on(event, callback);
  },
  emit: async (event: string, data: any) => {
    const s = await getSocket();
    s.emit(event, data);
  },
  off: async (event: string) => {
    const s = await getSocket();
    s.off(event);
  },
  disconnect: async () => {
    const s = await getSocket();
    s.disconnect();
  }
};

export default getSocket; 