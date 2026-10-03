import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Check session first
    if (req.session && (req.session as any).user) {
        req.user = (req.session as any).user;
        return next();
    }

    // 2. Fallback to JWT (for existing token-based requests)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user || !user.is_active) {
            throw new Error();
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token or session' });
    }
};
