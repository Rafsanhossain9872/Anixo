import mongoose from 'mongoose';
import process from 'node:process';

let cachedConnection = null;

const connectDB = async (env = process.env) => {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const uri = env.MONGO_URI || process.env.MONGO_URI;
    if (!uri) {
      console.warn("⚠️ MONGO_URI is missing. Cannot connect to MongoDB.");
      return null;
    }

    console.log("Creating new MongoDB connection...");
    // In serverless/edge environments, minimize pool size and set strict timeouts
    const conn = await mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 1, // CF Workers spin up many isolates; limit per-isolate connections
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is unreachable
      socketTimeoutMS: 30000,
      family: 4, // Force IPv4 to avoid DNS resolution delays on some Edge nodes
    });
    
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return cachedConnection;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    cachedConnection = null;
    throw error;
  }
};

export default connectDB;
