import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
} from '../controllers/notificationController';

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/mark-all-read', authenticate, markAllRead);
router.put('/:id/read', authenticate, markAsRead);

export default router;
