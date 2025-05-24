import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';
import { prisma } from './prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    const httpServer: HTTPServer = res.socket.server as any;
    const io = new Server(httpServer, {
      path: '/api/socket',
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join', (roomId: string) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
      });

      socket.on('leave', (roomId: string) => {
        socket.leave(roomId);
        console.log(`Client ${socket.id} left room ${roomId}`);
      });

      socket.on('message', async ({ roomId, content }) => {
        try {
          const message = await prisma.message.create({
            data: {
              content,
              room: { connect: { id: roomId } },
              user: { connect: { id: socket.data.userId } },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          });

          io.to(roomId).emit('message', message);
        } catch (error) {
          console.error('Error saving message:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
} 