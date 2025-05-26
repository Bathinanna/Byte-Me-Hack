import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

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
        const session = await getServerSession(req, res, authOptions);
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
  }

  res.end();
};

export const GET = ioHandler;
export const POST = ioHandler;