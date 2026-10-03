import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';
import { getTeamIds } from '../utils/teamScope';

/* ──────────────────────────────────────────────
   GET /api/seal/poas/mapped-products
   Returns the products the logged-in user is mapped to.
   - SalesPerson: only their own mapped products
   - SalesManager: own + subordinates' products
   - CEO: all active products
─────────────────────────────────────────────── */
export const getMappedProducts = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;

        // Optional BU-company filter (product.company_id) — the SEAL global
        // "Company" filter. Narrows the list without loosening RBAC scope.
        const cid = parseInt(req.query.company_id as string);
        const companyId = Number.isNaN(cid) ? null : cid;

        // ── CEO: return all active products ──
        if (authUser.role === 'CEO') {
            const products = await prisma.product.findMany({
                where: { is_active: true, ...(companyId ? { company_id: companyId } : {}) },
                select: { id: true, name: true, company_id: true },
                orderBy: { name: 'asc' },
            });
            return res.json(products.map(p => ({ id: p.id, name: p.name, company_id: p.company_id })));
        }

        // ── SalesManager: own targets + subordinates' targets (union) ──
        // ── SalesPerson:  own targets only ──
        let targetUserIds: number[] = [authUser.id];

        if (authUser.role === 'SalesManager') {
            targetUserIds = await getTeamIds(authUser);
        }

        const productTargets = await prisma.userProductTarget.findMany({
            where: { user_id: { in: targetUserIds } },
            include: { product: { select: { id: true, name: true, is_active: true, company_id: true } } },
        });

        const productMap = new Map<number, { id: number; name: string; company_id: number | null }>();

        for (const t of productTargets) {
            if (!t.product?.is_active) continue;
            if (companyId && t.product.company_id !== companyId) continue;
            if (!productMap.has(t.product.id)) {
                productMap.set(t.product.id, { id: t.product.id, name: t.product.name, company_id: t.product.company_id });
            }
        }

        const items = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        res.json(items);
    } catch (error) {
        console.error('Error fetching mapped products:', error);
        res.status(500).json({ message: 'Error fetching mapped products' });
    }
};

/* ──────────────────────────────────────────────
   GET /api/seal/poas/mapped-bdes
   Returns BDEs mapped to the selected product (for admin/manager filter).
─────────────────────────────────────────────── */
export const getMappedBdes = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { productId } = req.query;

        if (!productId || productId === '' || productId === 'null') {
            return res.status(400).json({ message: 'productId is required' });
        }

        // Build RBAC scope: restrict BDEs visible to the caller
        let rbacFilter: any = {};
        if (authUser.role === 'SalesManager') {
            rbacFilter = { id: { in: await getTeamIds(authUser) } };
        } else if (authUser.role === 'SalesPerson') {
            return res.json([]);
        }

        const pid = parseInt(productId as string);

        // Fetch BDEs from UserProductTarget
        const productRecs = await prisma.userProductTarget.findMany({
            where: { product_id: pid, user: { status: 'ACTIVE', ...rbacFilter } },
            select: { user_id: true },
        });

        const userIds = [...new Set(productRecs.map(r => r.user_id))];

        if (userIds.length === 0) return res.json([]);

        const bdes = await prisma.user.findMany({
            where: { id: { in: userIds }, status: 'ACTIVE' },
            select: { id: true, first_name: true, last_name: true, role: true },
            orderBy: { first_name: 'asc' },
        });

        res.json(bdes);
    } catch (error) {
        console.error('Error fetching mapped BDEs for POA:', error);
        res.status(500).json({ message: 'Error fetching mapped BDEs' });
    }
};

/* ──────────────────────────────────────────────
   RBAC helper
─────────────────────────────────────────────── */
const getAllowedUserIds = async (authUser: any, targetUserId?: string) => {
    let allowedIds: number[] = [];

    if (authUser.role === 'CEO') {
        const users = await prisma.user.findMany({ select: { id: true } });
        allowedIds = users.map(u => u.id);
    } else if (authUser.role === 'SalesManager') {
        allowedIds = await getTeamIds(authUser);
    } else {
        allowedIds = [authUser.id];
    }

    if (targetUserId && targetUserId !== 'all') {
        const targetId = parseInt(targetUserId);
        if (allowedIds.includes(targetId)) return [targetId];
        return [authUser.id];
    }

    return allowedIds;
};

/* ──────────────────────────────────────────────
   Build where clause from product params
─────────────────────────────────────────────── */
const buildPoaWhere = (base: any, productId?: string, companyId?: string) => {
    const w = { ...base };
    if (productId) w.product_id = parseInt(productId);
    // SEAL global Company filter — guard by the product's BU company.
    const cid = companyId ? parseInt(companyId) : NaN;
    if (!Number.isNaN(cid)) w.product = { ...(w.product || {}), company_id: cid };
    return w;
};

/* ──────────────────────────────────────────────
   GET /api/seal/poas
─────────────────────────────────────────────── */
export const getPOAs = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { userId, productId, companyId } = req.query;
        const allowedUserIds = await getAllowedUserIds(authUser, userId as string);

        const where = buildPoaWhere(
            { user_id: { in: allowedUserIds } },
            productId as string,
            companyId as string,
        );

        const poas = await prisma.planOfAction.findMany({
            where,
            include: { product: { select: { id: true, name: true } } },
            orderBy: { id: 'desc' },
        });
        res.json(poas);
    } catch (error) {
        console.error('Error fetching POAs:', error);
        res.status(500).json({ message: 'Error fetching POAs' });
    }
};

/* ──────────────────────────────────────────────
   POST /api/seal/poas
─────────────────────────────────────────────── */
export const createPOA = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const {
            product_id,
            date_of_meeting,
            poa_description,
            responsibility,
            edc,
            revised_edc,
            status,
            adc,
        } = req.body;

        if (!date_of_meeting || !poa_description || !responsibility || !status) {
            return res.status(400).json({ message: 'Meeting Date, Description, Responsibility and Status are required' });
        }

        const poa = await prisma.planOfAction.create({
            data: {
                user_id: authUser.id,
                product_id: product_id ? parseInt(product_id) : null,
                date_of_meeting: new Date(date_of_meeting),
                poa_description,
                responsibility,
                edc: edc ? new Date(edc) : null,
                revised_edc: revised_edc ? new Date(revised_edc) : null,
                status: status || 'Pending',
                adc: adc ? new Date(adc) : null,
            },
            include: { product: { select: { id: true, name: true } } },
        });

        res.status(201).json(poa);
    } catch (error) {
        console.error('Error creating POA:', error);
        res.status(500).json({ message: 'Error creating POA' });
    }
};

/* ──────────────────────────────────────────────
   PUT /api/seal/poas/:id
─────────────────────────────────────────────── */
export const updatePOA = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            product_id,
            date_of_meeting,
            poa_description,
            responsibility,
            edc,
            revised_edc,
            status,
            adc,
        } = req.body;

        const poa = await prisma.planOfAction.update({
            where: { id: parseInt(id) },
            data: {
                product_id: product_id !== undefined ? (product_id ? parseInt(product_id) : null) : undefined,
                date_of_meeting: date_of_meeting ? new Date(date_of_meeting) : undefined,
                poa_description,
                responsibility,
                edc: edc ? new Date(edc) : (edc === null ? null : undefined),
                revised_edc: revised_edc ? new Date(revised_edc) : (revised_edc === null ? null : undefined),
                status,
                adc: adc ? new Date(adc) : (adc === null ? null : undefined),
            },
            include: { product: { select: { id: true, name: true } } },
        });

        res.json(poa);
    } catch (error) {
        console.error('Error updating POA:', error);
        res.status(500).json({ message: 'Error updating POA' });
    }
};

/* ──────────────────────────────────────────────
   GET /api/seal/poas/summary
─────────────────────────────────────────────── */
export const getPOASummary = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { userId, productId, companyId } = req.query;
        const allowedUserIds = await getAllowedUserIds(authUser, userId as string);

        const baseWhere = buildPoaWhere(
            { user_id: { in: allowedUserIds } },
            productId as string,
            companyId as string,
        );

        const [total, completed, inProgress, pending] = await Promise.all([
            prisma.planOfAction.count({ where: baseWhere }),
            prisma.planOfAction.count({ where: { ...baseWhere, status: 'Completed' } }),
            prisma.planOfAction.count({ where: { ...baseWhere, status: 'In Progress' } }),
            prisma.planOfAction.count({ where: { ...baseWhere, status: 'Pending' } }),
        ]);

        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

        res.json({
            totallyGenerated: total,
            totallyCompleted: completed,
            inProgress,
            pending,
            completionPct: `${completionPct}%`,
        });
    } catch (error) {
        console.error('Error fetching POA summary:', error);
        res.status(500).json({ message: 'Error fetching POA summary' });
    }
};

/* ──────────────────────────────────────────────
   GET /api/seal/poas/weekly-summary
─────────────────────────────────────────────── */
export const getWeeklyPOASummary = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { userId, productId, companyId } = req.query;
        const allowedUserIds = await getAllowedUserIds(authUser, userId as string);

        const now = dayjs();
        const baseWhere = buildPoaWhere(
            {
                user_id: { in: allowedUserIds },
                date_of_meeting: { gte: now.startOf('month').toDate(), lte: now.endOf('month').toDate() },
            },
            productId as string,
            companyId as string,
        );

        const poas = await prisma.planOfAction.findMany({ where: baseWhere, orderBy: { id: 'desc' } });

        const weekByDay = (day: number) => {
            if (day <= 7) return 1;
            if (day <= 14) return 2;
            if (day <= 21) return 3;
            if (day <= 28) return 4;
            return 5;
        };

        const weeklyReport = [1, 2, 3, 4, 5].map(w => {
            const weekPoas = poas.filter(p => weekByDay(dayjs(p.date_of_meeting).date()) === w);
            const total = weekPoas.length;
            const completed = weekPoas.filter(p => p.status === 'Completed').length;
            const inProgress = weekPoas.filter(p => p.status === 'In Progress').length;
            const pending = weekPoas.filter(p => p.status === 'Pending').length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return {
                week: `Week ${w}`,
                totalGenerated: total,
                totalCompleted: completed,
                inProgress,
                pending,
                completionPct: `${pct}%`,
            };
        });

        res.json(weeklyReport);
    } catch (error) {
        console.error('Error fetching weekly POA summary:', error);
        res.status(500).json({ message: 'Error fetching weekly POA summary' });
    }
};

/* ──────────────────────────────────────────────
   DELETE /api/seal/poas/:id
─────────────────────────────────────────────── */
export const deletePOA = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.planOfAction.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'POA deleted successfully' });
    } catch (error) {
        console.error('Error deleting POA:', error);
        res.status(500).json({ message: 'Error deleting POA' });
    }
};
