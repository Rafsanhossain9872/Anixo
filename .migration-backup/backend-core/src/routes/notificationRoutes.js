import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllRead, 
  clearNotifications 
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/read/:id', markAsRead);
router.put('/read-all', markAllRead);
router.delete('/clear', clearNotifications);

export default router;
