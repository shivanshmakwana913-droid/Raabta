require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const initSocketServer = require('./src/sockets/socketHandler');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Core Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Rate Limiters for Abuse Protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many authentication attempts, please try again after 15 minutes' }
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { message: 'Search rate limit exceeded, please slow down' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 350,
  message: { message: 'Too many requests, please try again later' }
});

// Apply Rate Limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/users/search', searchLimiter);
app.use('/api/messages/search', searchLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Raabta Backend API Running' });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Initialize Socket Event Handlers & Middleware
initSocketServer(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
