import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load env from backend-core in dev, or local .env in production (Hugging Face)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coreEnvPath = path.join(__dirname, '../backend-core/.env');

if (fs.existsSync(coreEnvPath)) {
  dotenv.config({ path: coreEnvPath });
  // Prevent backend-core's PORT (5001) from overriding chat-service's port locally
  delete process.env.PORT;
} else {
  dotenv.config(); // Load local .env
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend to connect
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-service' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'chat-service', message: 'Anigo Chat Service is running successfully!' });
});

// Database Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Chat Service: Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Mongoose Schema with TTL Index
const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  profileId: { type: String },
  username: { type: String, required: true },
  displayName: { type: String },
  avatar: { type: String },
  role: { type: String, default: 'user' },
  text: { type: String, required: true },
  replyTo: {
    messageId: { type: String },
    userId: { type: String },
    username: { type: String },
    displayName: { type: String },
    text: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1209600 // Auto-delete after 14 days (1209600 seconds)
  }
});

const Chat = mongoose.model('GlobalChat', chatSchema);

// Middleware to authenticate socket connections
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || token === 'null' || token === 'undefined') {
    socket.user = null; // Unauthenticated users can still read
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Contains id
  } catch (err) {
    console.error("Socket authentication failed:", err.message);
    socket.user = null;
  }
  next();
};

io.use(authenticateSocket);

const connectedUsers = new Map();

const getUniqueUserCount = () => {
  const uniqueIds = new Set(connectedUsers.values());
  return uniqueIds.size;
};

io.on('connection', async (socket) => {
  console.log(`User connected to global chat: ${socket.id} (User: ${socket.user?.id || 'Guest'})`);

  const userIdentifier = socket.user?.id || socket.handshake.auth?.guestId || `guest_${socket.id}`;
  const isNewUniqueUser = !Array.from(connectedUsers.values()).includes(userIdentifier);

  connectedUsers.set(socket.id, userIdentifier);

  if (socket.user) {
    try {
      const userDoc = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(socket.user.id) });
      if (userDoc) {
        socket.displayName = userDoc.displayName || userDoc.username;
        socket.role = userDoc.role || 'user';
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  }

  // Send current active users count
  io.emit('active_users', getUniqueUserCount());

  // Join global room
  socket.join('global-chat');

  if (isNewUniqueUser && socket.displayName) {
    io.to('global-chat').emit('new_message', {
      _id: `sys_${Date.now()}_${Math.random()}`,
      type: 'system',
      text: `${socket.displayName} joined the chat`,
      createdAt: new Date()
    });
  }

  // Send recent chat history
  try {
    const history = await Chat.find().sort({ createdAt: 1 }).limit(100);
    socket.emit('chat_history', history);
  } catch (err) {
    console.error("Failed to load chat history:", err);
  }

  // Handle incoming messages
  socket.on('send_message', async (data) => {
    // 1. Check if user is logged in
    if (!socket.user) {
      return socket.emit('chat_error', { message: 'You must be logged in to chat.' });
    }

    // 2. Validate data payload
    if (!data.text || data.text.trim().length === 0) {
      return socket.emit('chat_error', { message: 'Message cannot be empty.' });
    }

    // 3. Prevent extremely long messages
    if (data.text.length > 500) {
      return socket.emit('chat_error', { message: 'Message is too long (max 500 chars).' });
    }

    try {
      // 4. Save to database
      const newMsg = new Chat({
        userId: socket.user.id,
        profileId: data.profileId || data.username,
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar,
        role: socket.role || 'user',
        text: data.text.trim(),
        replyTo: data.replyTo || null
      });
      await newMsg.save();

      // 5. Broadcast to everyone in the room
      io.to('global-chat').emit('new_message', newMsg);

      // 6. Send notification if it's a reply
      if (data.replyTo && data.replyTo.userId && data.replyTo.userId !== socket.user.id) {
        try {
          let userObjId;
          try {
            userObjId = new mongoose.Types.ObjectId(data.replyTo.userId);
          } catch {
             userObjId = data.replyTo.userId;
          }

          await mongoose.connection.collection('notifications').insertOne({
            user: userObjId,
            title: 'New Reply in Global Chat',
            message: `${data.displayName || data.username} replied to your message: "${data.text.length > 60 ? data.text.substring(0, 60) + '...' : data.text}"`,
            type: 'REPLY',
            targetUrl: '/chat',
            isRead: false,
            isHidden: false,
            createdAt: new Date()
          });
        } catch (notifErr) {
          console.error("Failed to create notification:", notifErr);
        }
      }
    } catch (err) {
      console.error("Error saving chat message:", err);
      socket.emit('chat_error', { message: 'Failed to send message.' });
    }
  });

  socket.on('delete_message', async (messageId) => {
    if (!socket.user || (socket.role !== 'admin' && socket.role !== 'moderator')) {
      return socket.emit('chat_error', { message: 'Unauthorized: Only admins and mods can delete.' });
    }
    try {
      await Chat.findByIdAndDelete(messageId);
      io.to('global-chat').emit('message_deleted', messageId);
    } catch (err) {
      console.error("Error deleting chat message:", err);
      socket.emit('chat_error', { message: 'Failed to delete message.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const userIdentifier = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);

    const isCompletelyLeft = !Array.from(connectedUsers.values()).includes(userIdentifier);

    if (isCompletelyLeft && socket.displayName) {
      io.to('global-chat').emit('new_message', {
        _id: `sys_${Date.now()}_${Math.random()}`,
        type: 'system',
        text: `${socket.displayName} left the chat`,
        createdAt: new Date()
      });
    }

    io.emit('active_users', getUniqueUserCount());
  });
});

// Hugging Face Spaces exposes port 7860 by default
const PORT = process.env.PORT || process.env.CHAT_PORT || 8080;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat service running on port ${PORT}`);
  });
});
