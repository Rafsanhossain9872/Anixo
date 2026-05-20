import express from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist, bulkImport } from '../controllers/watchlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWatchlist);

router.route('/add')
  .post(addToWatchlist);

router.route('/remove/:animeId')
  .delete(removeFromWatchlist);

router.route('/import')
  .post(bulkImport);

export default router;
