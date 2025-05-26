import { Server } from 'socket.io';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const res = new NextResponse();
  const io = new Server({
    path: '/api/socket',
    addTrailingSlash: false,
  });

  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`Client joined room: ${roomId}`);
    });

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`Client left room: ${roomId}`);
    });

    socket.on('typing', async ({ roomId, isTyping }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) return;

      socket.to(roomId).emit('typing', {
        userId: session.user.id,
        roomId,
        isTyping,
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return new NextResponse();
}

export const POST = GET;