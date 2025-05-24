import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';
import { prisma } from '@/app/lib/prisma';

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      socket.on('join-room', async (roomId: string) => {
        socket.join(roomId);
      });

      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
      });

      socket.on('send-message', async (data: { 
        content: string;
        userId: string;
        chatRoomId: string;
      }) => {
        try {
          const message = await prisma.message.create({
            data: {
              content: data.content,
              userId: data.userId,
              chatRoomId: data.chatRoomId,
            },
            include: {
              user: true,
            },
          });
          io.to(data.chatRoomId).emit('new-message', message);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      });

      socket.on('add-reaction', async (data: {
        emoji: string;
        userId: string;
        messageId: string;
      }) => {
        try {
          const reaction = await prisma.reaction.create({
            data: {
              emoji: data.emoji,
              userId: data.userId,
              messageId: data.messageId,
            },
            include: {
              user: true,
            },
          });
          io.emit('new-reaction', reaction);
        } catch (error) {
          console.error('Error adding reaction:', error);
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export const GET = ioHandler;
export const POST = ioHandler;