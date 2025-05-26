const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");
const { PrismaClient } = require('@prisma/client'); // Correct way to import PrismaClient for JS
const path = require('path');
const nodemailer = require('nodemailer');
const mailerPath = path.join(__dirname, 'app', 'lib', 'mailer.ts');
let sendEmail;
try {
  // Try to require the compiled JS version if available
  sendEmail = require('./app/lib/mailer').sendEmail;
} catch (e) {
  // fallback: dynamic import (for ESM)
  sendEmail = null;
}

const prisma = new PrismaClient(); // Instantiate Prisma Client

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let io;

// Track online users per room
const onlineUsersByRoom = {};

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

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      if (!onlineUsersByRoom[roomId]) onlineUsersByRoom[roomId] = new Set();
      onlineUsersByRoom[roomId].add(socket.handshake.auth.userId);
      io.to(roomId).emit("online_users", Array.from(onlineUsersByRoom[roomId]));
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      if (onlineUsersByRoom[roomId]) {
        onlineUsersByRoom[roomId].delete(socket.handshake.auth.userId);
        io.to(roomId).emit("online_users", Array.from(onlineUsersByRoom[roomId]));
      }
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (onlineUsersByRoom[roomId]) {
          onlineUsersByRoom[roomId].delete(socket.handshake.auth.userId);
          io.to(roomId).emit("online_users", Array.from(onlineUsersByRoom[roomId]));
        }
      }
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

        // --- @mention notification logic ---
        const mentionRegex = /@([\w]+)/g;
        const mentionedUsernames = [];
        let match;
        while ((match = mentionRegex.exec(data.content)) !== null) {
          mentionedUsernames.push(match[1]);
        }
        if (mentionedUsernames.length > 0) {
          // Find users in this room with these usernames
          const users = await prisma.user.findMany({
            where: {
              name: { in: mentionedUsernames },
              chatRooms: { some: { id: data.chatRoomId } },
            },
            select: { id: true, name: true, email: true },
          });
          for (const user of users) {
            // Check notification preference
            const pref = await prisma.notificationPreference.findUnique({
              where: { userId_roomId: { userId: user.id, roomId: data.chatRoomId } },
            });
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { emailNotificationsEnabled: true } });
            const preference = pref?.preference || 'all';
            if (preference === 'none' || dbUser?.emailNotificationsEnabled === false) continue;
            // Check if user is online in this room
            const isOnline = onlineUsersByRoom[data.chatRoomId] && onlineUsersByRoom[data.chatRoomId].has(user.id);
            // In-app notification if online
            if (isOnline) {
              for (const [id, s] of io.of("/").sockets) {
                if (s.handshake.auth && s.handshake.auth.userId === user.id) {
                  s.emit("mention-notification", {
                    roomId: data.chatRoomId,
                    message,
                    by: message.user,
                  });
                }
              }
            } else if (user.email && sendEmail && (preference === 'all' || preference === 'mentions')) {
              // Email notification if offline and enabled
              sendEmail({
                to: user.email,
                subject: `You were mentioned in ${message.roomId}`,
                text: `${message.user.name || 'Someone'} mentioned you: ${message.content}`,
                html: `<b>${message.user.name || 'Someone'}</b> mentioned you:<br>${message.content}`,
              }).catch(console.error);
            }
          }
        }
        // --- end @mention notification logic ---
        // --- Missed message email notification logic ---
        // For all users in the room except sender, with 'all' preference, who are offline
        const room = await prisma.chatRoom.findUnique({
          where: { id: data.chatRoomId },
          include: { users: true },
        });
        for (const user of room.users) {
          if (user.id === data.userId) continue;
          const pref = await prisma.notificationPreference.findUnique({
            where: { userId_roomId: { userId: user.id, roomId: data.chatRoomId } },
          });
          const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { emailNotificationsEnabled: true } });
          const preference = pref?.preference || 'all';
          if (preference !== 'all' || dbUser?.emailNotificationsEnabled === false) continue;
          const isOnline = onlineUsersByRoom[data.chatRoomId] && onlineUsersByRoom[data.chatRoomId].has(user.id);
          if (!isOnline && user.email && sendEmail) {
            sendEmail({
              to: user.email,
              subject: `New message in ${room.name || 'a chat room'}`,
              text: `${message.user.name || 'Someone'}: ${message.content}`,
              html: `<b>${message.user.name || 'Someone'}</b>: ${message.content}`,
            }).catch(console.error);
          }
        }
        // --- end missed message email notification logic ---
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

    socket.on("disconnect", () => {
      // Remove user from all rooms' online lists
      for (const roomId of Object.keys(onlineUsersByRoom)) {
        if (socket.handshake.auth && socket.handshake.auth.userId) {
          onlineUsersByRoom[roomId].delete(socket.handshake.auth.userId);
          io.to(roomId).emit("online_users", Array.from(onlineUsersByRoom[roomId]));
        }
      }
      console.log("Client disconnected:", socket.id);
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