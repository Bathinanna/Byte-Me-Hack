const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");
const { PrismaClient } = require('@prisma/client'); // Correct way to import PrismaClient for JS

const prisma = new PrismaClient(); // Instantiate Prisma Client

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let io;

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  io = new Server(httpServer, {
    // path: "/api/socket", // Not needed if Socket.IO is at the root
    // addTrailingSlash: false, // Not typically needed here
    cors: {
      origin: "*", // Allow all origins for development, restrict in production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-room", async (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on("send-message", async (data) => {
      console.log('Received send-message event with data:', data);
      try {
        const messageData = {
          content: data.content,
          userId: data.userId,
          roomId: data.chatRoomId,
        };
        if (data.emotion) {
          messageData.emotion = data.emotion;
        }
        if (data.avatarExpression) {
          messageData.avatarExpression = data.avatarExpression;
        }

        const message = await prisma.message.create({
          data: messageData,
          include: {
            user: true,
          },
        });
        io.to(data.chatRoomId).emit("new-message", message);
        console.log('Emitted new-message to room:', data.chatRoomId);
      } catch (error) {
        console.error("Error processing send-message event:", error);
        // Optionally, emit an error back to the sender
        socket.emit('message-error', { error: 'Failed to save or send message.', details: error.message });
      }
    });
    
    socket.on("add-reaction", async (data) => {
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
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (message) {
          io.to(message.roomId).emit("new-reaction", reaction);
        }
      } catch (error) {
        console.error("Error adding reaction:", error);
         socket.emit('reaction-error', { error: 'Failed to add reaction.', details: error.message });
      }
    });

    socket.on("typing", (data) => {
      // data: { roomId, userName }
      if (data && data.roomId && data.userName) {
        socket.to(data.roomId).emit("typing", { userName: data.userName });
      }
    });

    socket.on("message_read", async (data) => {
      // data: { roomId, messageId, userId }
      if (data && data.roomId && data.messageId && data.userId) {
        try {
          await prisma.message.update({
            where: { id: data.messageId },
            data: {
              readBy: {
                connect: { id: data.userId },
              },
            },
          });
          io.to(data.roomId).emit("message_read", { messageId: data.messageId, userId: data.userId });
        } catch (err) {
          console.error("[Socket.IO] Error updating read receipt:", err);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected:", socket.id, "Reason:", reason);
    });

    socket.on('error', (error) => {
      console.error("Socket error:", error);
    });
  });


  httpServer
    .once('error', (err) => {
      console.error('HTTP server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`Socket.IO server listening on port ${port}`);
    });
}); 