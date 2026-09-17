const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const checkDbConnection = require('./src/middleware/dbMiddleware');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const initSocketServer = require('./src/sockets/socketHandler');

const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Ensure uploads folder exists for local media storage
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Flexible CORS helper to allow localhost, local network IPs, and configured CLIENT_URL
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    // Allow localhost and private local IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalOrNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
    if (isLocalOrNetwork) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
};

// Core Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

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

// REST API Routes with DB Connection Readiness Middleware
app.use('/api/auth', checkDbConnection, authRoutes);
app.use('/api/users', checkDbConnection, userRoutes);
app.use('/api/conversations', checkDbConnection, conversationRoutes);
app.use('/api/messages', checkDbConnection, messageRoutes);
app.use('/api/reports', checkDbConnection, reportRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Sequential Startup Function
const startServer = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI || !mongoURI.trim()) {
      console.error('Database configuration error: MONGODB_URI is missing. Add it to backend/.env.');
      process.exit(1);
    }

    // Connect to MongoDB before starting server or socket server
    await connectDB();

    // Initialize Socket Event Handlers & Middleware
    initSocketServer(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Fatal Startup Error]: Unable to connect to MongoDB - ${error.message}`);
    process.exit(1);
  }
};

startServer();
