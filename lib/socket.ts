import { io } from 'socket.io-client';
import { getSession } from 'next-auth/react';

// For development, you might explicitly use: const SOCKET_URL = 'http://localhost:3000';
// For production, this would be your deployed server URL.
// Using io() without arguments defaults to the current host and port, which should work with the custom server.
let socket: ReturnType<typeof io> | null = null;

export const getSocket = async () => {
  if (!socket) {
    const session = await getSession();
    socket = io({
      auth: {
        userId: session?.user?.id,
        userName: session?.user?.name,
      },
    });
  }
  return socket;
};

export default getSocket; 