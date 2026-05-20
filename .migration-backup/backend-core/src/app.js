import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import process from 'node:process';

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: [
        'https://anixo.pages.dev',
        'http://localhost:5173',
        /\.vercel\.app$/,
        /\.github\.dev$/
    ],
    credentials: true
})); 
app.use(express.json());

// Essential for Vercel/Proxies to get the real client IP
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => process.env.NODE_ENV !== 'production' || req.ip === '::1' || req.ip === '127.0.0.1',
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Routes
app.use('/auth', authRoutes); // Temporarily removed authLimiter for testing
app.use('/watchlist', watchlistRoutes);
app.use('/progress', progressRoutes);
app.use('/settings', settingsRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('API running');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
 