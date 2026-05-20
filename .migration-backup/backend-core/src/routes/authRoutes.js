import express from 'express';
const router = express.Router();
import { register, login, getMe, updateMe, forgotPassword, resetPassword, connectAnilist, anilistCallback, disconnectAnilist, syncAnilistLibrary } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// AniList OAuth
router.get('/anilist', connectAnilist);
router.get('/anilist/callback', anilistCallback);
router.post('/anilist/disconnect', protect, disconnectAnilist);
router.post('/anilist/sync', protect, syncAnilistLibrary);

export default router;
