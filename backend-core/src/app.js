import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

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

const app = express();

// Cloudflare nodejs_compat strict stream polyfill
app.use((req, res, next) => {
    if (typeof res._write !== 'function') {
        res._write = function (chunk, encoding, callback) {
            if (typeof callback === 'function') callback();
        };
    }
    next();
});

app.use((req, res, next) => {
    const allowedOrigins = ['https://tenzora.top', 'https://www.tenzora.top', 'http://localhost:5173'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Handle direct OPTIONS preflight requests immediately
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
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
