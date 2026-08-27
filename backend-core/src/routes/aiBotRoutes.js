import express from 'express';
import { protect, cronAuth } from '../middleware/authMiddleware.js';
import {
  getBotConfig,
  updateBotConfig,
  manualCreatePost,
  manualCreateReply,
  testPostGeneration,
  cronPost,
  cronReply,
  cronEpisodeComment
} from '../controllers/aiBotController.js';

const router = express.Router();

// ── Cron endpoints (called by Cloudflare Worker scheduled triggers) ──
router.post('/cron/post', cronAuth, cronPost);
router.post('/cron/reply', cronAuth, cronReply);
router.post('/cron/episode-comment', cronAuth, cronEpisodeComment);

// ── Public endpoints ──
router.get('/config', getBotConfig);

// ── Admin endpoints (require JWT auth) ──
router.get('/test-post', protect, testPostGeneration);
router.post('/manual-post', protect, manualCreatePost);
router.post('/manual-reply/:postId', protect, manualCreateReply);
router.put('/config/:username', protect, updateBotConfig);

export default router;
