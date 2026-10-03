"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPrivilege = exports.userHasPrivilege = exports.authorize = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Same rule as `checkPrivilege`, but usable inside a controller when only part
 * of a response depends on the privilege (e.g. one section of a dashboard).
 */
const userHasPrivilege = async (user, moduleName, action) => {
    if (!user)
        return false;
    if (user.role === 'CEO')
        return true;
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
exports.userHasPrivilege = userHasPrivilege;
const checkPrivilege = (moduleName, action) => {
    return async (req, res, next) => {
        if (req.user.role === 'CEO')
            return next(); // CEO has all access
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
exports.checkPrivilege = checkPrivilege;
