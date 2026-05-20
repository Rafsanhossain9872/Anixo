import express from 'express';
import { getProgress, saveProgress, deleteProgress } from '../controllers/progressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getProgress);

router.route('/save')
  .post(saveProgress);

router.route('/remove/:animeId')
  .delete(deleteProgress);

export default router;
