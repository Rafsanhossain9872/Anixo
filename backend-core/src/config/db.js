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
    // In serverless, it's critical to disable buffering and use the right connection options
    const conn = await mongoose.connect(uri, {
      bufferCommands: false,
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
