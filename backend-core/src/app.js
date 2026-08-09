import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import aiBotRoutes from './routes/aiBotRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import process from 'node:process';
import connectDB from './config/db.js';

const app = express();

// CORS Configuration
app.use(cors({
    origin: ['https://tenzora.top', 'https://www.tenzora.top', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5175', 'http://127.0.0.1:5175'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-api']
}));

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url} from ${req.headers.origin || 'unknown origin'}`);
    next();
});

// Initialize DB on every request (re-uses cached connection in serverless)
app.use(async (req, res, next) => {
    try {
        await connectDB(req.env || process.env);
        next();
    } catch (err) {
        next(err);
    }
});

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(express.json());

// Essential for Vercel/Proxies to get the real client IP
app.set('trust proxy', 1);

// Rate limiting (Deferred initialization to avoid Cloudflare global scope interval errors)
let limiter;
app.use('/api', (req, res, next) => {
  if (process.env.CF_WORKER === 'true') {
    return next(); // Cloudflare Edge handles rate limiting natively, skip node-based limiter
  }
  if (!limiter) {
    limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      skip: (req) => process.env.NODE_ENV !== 'production' || req.ip === '::1' || req.ip === '127.0.0.1',
      message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
    });
  }
  return limiter(req, res, next);
});

// Routes
app.use('/auth', authRoutes); // Temporarily removed authLimiter for testing
app.use('/watchlist', watchlistRoutes);
app.use('/progress', progressRoutes);
app.use('/settings', settingsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/users', userRoutes);
app.use('/ai', aiRoutes);
app.use('/community', communityRoutes);
app.use('/ai-bot', aiBotRoutes);

app.get('/', (req, res) => {
  res.send('API running');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
