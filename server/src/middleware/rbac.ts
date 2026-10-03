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

export type PrivilegeAction = 'can_add' | 'can_edit' | 'can_delete' | 'can_view';

/**
 * Same rule as `checkPrivilege`, but usable inside a controller when only part
 * of a response depends on the privilege (e.g. one section of a dashboard).
 */
export const userHasPrivilege = async (user: any, moduleName: string, action: PrivilegeAction): Promise<boolean> => {
    if (!user) return false;
    if (user.role === 'CEO') return true;

    const privilege = await prisma.privilege.findUnique({
        where: {
            user_id_module_name: {
                user_id: user.id,
                module_name: moduleName
            }
        }
    });

    return !!privilege?.[action];
};

export const checkPrivilege = (moduleName: string, action: PrivilegeAction) => {
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
