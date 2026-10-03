import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: any;
}

export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

export const checkPrivilege = (moduleName: string, action: 'can_add' | 'can_edit' | 'can_delete' | 'can_view') => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.user.role === 'CEO') return next(); // CEO has all access

        const privilege = await prisma.privilege.findUnique({
            where: {
                user_id_module_name: {
                    user_id: req.user.id,
                    module_name: moduleName
                }
            }
        });

        if (!privilege || !privilege[action]) {
            return res.status(403).json({ message: 'Insufficient privileges' });
        }
        next();
    };
};
