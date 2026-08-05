import mongoose from 'mongoose';
import process from 'node:process';

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    console.log("Using existing MongoDB connection");
    return cachedConnection;
  }

  try {
    console.log("MongoDB standard connection disabled for Cloudflare Workers.");
    console.log("Using HTTP Data API instead.");
    cachedConnection = { mock: true }; // Prevent multiple calls
    return cachedConnection;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    cachedConnection = null;
  }
};

export default connectDB;
