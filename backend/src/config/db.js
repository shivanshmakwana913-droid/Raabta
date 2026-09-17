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
  if (!mongoURI || !mongoURI.trim()) {
    throw new Error('Database configuration error: MONGODB_URI is missing. Add it to backend/.env.');
  }

  // If using Atlas SRV string, configure reliable public DNS servers upfront to avoid Windows local DNS SRV timeouts
  if (mongoURI.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      // Ignore if DNS custom servers cannot be set
    }
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 // Fast 5-second timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Failed: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
