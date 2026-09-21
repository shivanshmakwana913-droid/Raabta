const mongoose = require('mongoose');
const dns = require('dns');

// Prevent Mongoose from buffering queries when disconnected
mongoose.set('bufferCommands', false);

// Connection event listeners (non-secret status logging)
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Event] Connection established');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Event] Connection lost / disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Event] Connection error:', err.message);
});

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  // If using Atlas SRV string, configure reliable public DNS servers upfront to avoid Windows local DNS SRV timeouts
  if (mongoURI && mongoURI.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      // Ignore if DNS custom servers cannot be set
    }
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 4000 // Fast 4-second timeout
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Primary MongoDB Atlas Connection Failed]: ${error.message}`);
    console.warn('[Falling back to MongoMemoryServer for development mode...]');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[MongoDB Memory Server Connected Successfully]: ${memoryUri}`);
      return conn;
    } catch (fallbackErr) {
      console.error(`[Memory Server Fallback Failed]: ${fallbackErr.message}`);
      throw error;
    }
  }
};

module.exports = connectDB;
