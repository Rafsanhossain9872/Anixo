import app from '../backend-core/src/app.js';
import connectDB from '../backend-core/src/config/db.js';

let isConnected = false;

export default async (req, res) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    return app(req, res);
  } catch (error) {
    console.error('Vercel API Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during startup', 
      error: error.message 
    });
  }
};
