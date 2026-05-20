import mongoose from 'mongoose';
import process from 'node:process';

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    console.log("Using existing MongoDB connection");
    return cachedConnection;
  }

  try {
    console.log("Connecting to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    cachedConnection = conn;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Reset cache on error
    cachedConnection = null;
  }
};

export default connectDB;
