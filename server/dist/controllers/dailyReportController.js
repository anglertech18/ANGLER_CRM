"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyReportById = exports.listDailyReports = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const prisma_1 = require("../lib/prisma");
const teamScope_1 = require("../utils/teamScope");
dayjs_1.default.extend(utc_1.default);
// GET /api/daily-report?date=YYYY-MM-DD&productId=X&page=1&pageSize=20
const listDailyReports = async (req, res) => {
    try {
        const user = req.user;
        const { date, productId, userId, companyId } = req.query;
        const page = Math.max(1, parseInt(req.query.page || '1'));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20')));
        const where = {};
        if (user.role !== 'CEO') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
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
            where.report_date = dayjs_1.default.utc(date).startOf('day').toDate();
        }
        if (productId) {
            where.products = { some: { product_id: parseInt(productId, 10) } };
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.dailyReport.findMany({
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
            prisma_1.prisma.dailyReport.count({ where }),
        ]);
        res.json({ data, total, page, pageSize });
    }
    catch (error) {
        console.error('Error listing daily reports:', error);
        res.status(500).json({ message: 'Error fetching daily reports' });
    }
};
exports.listDailyReports = listDailyReports;
// GET /api/daily-report/:id
const getDailyReportById = async (req, res) => {
    try {
        const user = req.user;
        const id = parseInt(req.params.id, 10);
        if (!id || isNaN(id)) {
            return res.status(400).json({ message: 'Invalid report id' });
        }
        const report = await prisma_1.prisma.dailyReport.findUnique({
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
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (!teamIds.includes(report.user_id)) {
                return res.status(403).json({ message: 'You do not have access to this report' });
            }
        }
        res.json(report);
    }
    catch (error) {
        console.error('Error fetching daily report:', error);
        res.status(500).json({ message: 'Error fetching daily report' });
    }
};
exports.getDailyReportById = getDailyReportById;
