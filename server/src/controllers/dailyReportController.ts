import { Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { prisma } from '../lib/prisma';
import { getTeamIds } from '../utils/teamScope';

dayjs.extend(utc);

// GET /api/daily-report?date=YYYY-MM-DD&productId=X&page=1&pageSize=20
export const listDailyReports = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { date, productId, userId, companyId } = req.query as { date?: string; productId?: string; userId?: string; companyId?: string };
        const page = Math.max(1, parseInt((req.query.page as string) || '1'));
        const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20')));

        const where: any = {};

        if (user.role !== 'CEO') {
            const teamIds = await getTeamIds(user);
            if (teamIds.length === 0) {
                return res.json({ data: [], total: 0, page, pageSize });
            }
            where.user_id = { in: teamIds };
        }

        if (userId) {
            const requestedId = parseInt(userId, 10);
            if (where.user_id && !where.user_id.in.includes(requestedId)) {
                return res.json({ data: [], total: 0, page, pageSize });
            }
            where.user_id = requestedId;
        }

        if (companyId) {
            where.company_id = parseInt(companyId, 10);
        }

        if (date) {
            where.report_date = dayjs.utc(date).startOf('day').toDate();
        }

        if (productId) {
            where.products = { some: { product_id: parseInt(productId, 10) } };
        }

        const [data, total] = await Promise.all([
            prisma.dailyReport.findMany({
                where,
                select: {
                    id: true,
                    report_date: true,
                    subject: true,
                    status: true,
                    sent_at: true,
                    recipient_email: true,
                    user: { select: { id: true, first_name: true, last_name: true } },
                    company: { select: { id: true, name: true } },
                    products: { select: { product_id: true, product_name: true } },
                },
                orderBy: [{ report_date: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.dailyReport.count({ where }),
        ]);

        res.json({ data, total, page, pageSize });
    } catch (error) {
        console.error('Error listing daily reports:', error);
        res.status(500).json({ message: 'Error fetching daily reports' });
    }
};

// GET /api/daily-report/:id
export const getDailyReportById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const id = parseInt(req.params.id, 10);
        if (!id || isNaN(id)) {
            return res.status(400).json({ message: 'Invalid report id' });
        }

        const report = await prisma.dailyReport.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, first_name: true, last_name: true } },
                company: { select: { id: true, name: true } },
                products: {
                    include: {
                        leads: true,
                        swat_metrics: true,
                    },
                },
            },
        });

        if (!report) {
            return res.status(404).json({ message: 'Daily report not found' });
        }

        if (user.role !== 'CEO') {
            const teamIds = await getTeamIds(user);
            if (!teamIds.includes(report.user_id)) {
                return res.status(403).json({ message: 'You do not have access to this report' });
            }
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching daily report:', error);
        res.status(500).json({ message: 'Error fetching daily report' });
    }
};
