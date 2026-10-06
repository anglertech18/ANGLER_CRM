import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// GET /api/notifications  — paginated bell items for current user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { unread_only, page = 1, limit = 20 } = req.query;

    const where: any = { user_id: userId };
    if (unread_only === 'true') where.is_read = false;

    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const [total, notifications, unreadCount] = await Promise.all([
      (prisma as any).applicationNotification.count({ where }),
      (prisma as any).applicationNotification.findMany({
        where,
        skip,
        take: parseInt(String(limit)),
        orderBy: { created_at: 'desc' },
      }),
      (prisma as any).applicationNotification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    res.json({ data: notifications, total, unread_count: unreadCount, page: parseInt(String(page)) });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching notifications', detail: err.message });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await (prisma as any).applicationNotification.count({
      where: { user_id: userId, is_read: false },
    });
    res.json({ unread_count: count });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching count', detail: err.message });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = parseInt(req.params.id);
    await (prisma as any).applicationNotification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true, read_at: new Date() },
    });
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error marking notification', detail: err.message });
  }
};

// PUT /api/notifications/mark-all-read
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await (prisma as any).applicationNotification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    res.json({ message: 'All marked as read' });
  } catch (err: any) {
    res.status(400).json({ message: 'Error marking notifications', detail: err.message });
  }
};
