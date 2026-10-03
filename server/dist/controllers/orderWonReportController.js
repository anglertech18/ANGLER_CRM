"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderWonReport = void 0;
const prisma_1 = require("../lib/prisma");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const teamScope_1 = require("../utils/teamScope");
dayjs_1.default.extend(utc_1.default);
const authUser = (req) => req.user;
function buildMonths(month, fiscalYear) {
    if (month) {
        const d = dayjs_1.default.utc(`${month}-01`);
        return {
            months: [{
                    label: d.format('MMM-YY'), year: d.year(), month: d.month() + 1,
                    start: d.startOf('month').toDate(), end: d.endOf('month').toDate(),
                }],
            fyLabel: d.format('MMM-YY'),
        };
    }
    let fyStart = parseInt(fiscalYear) || (0, dayjs_1.default)().year();
    if (!fiscalYear) {
        const currentMonth = (0, dayjs_1.default)().month() + 1;
        if (currentMonth < 4)
            fyStart = (0, dayjs_1.default)().year() - 1;
    }
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = dayjs_1.default.utc(`${fyStart}-04-01`).add(i, 'month');
        return {
            label: d.format('MMM-YY'), year: d.year(), month: d.month() + 1,
            start: d.startOf('month').toDate(), end: d.endOf('month').toDate(),
        };
    });
    return { months, fyLabel: `${fyStart}-${fyStart + 1}` };
}
// GET /api/order-won-report?product_id=&bde_id=&company_id=&sbu_id=&source_id=&fiscal_year=&month=&from_date=&to_date=
// Flat, filterable, sortable Order Won Report, per md files/reports/UI.md.
const getOrderWonReport = async (req, res) => {
    try {
        const user = authUser(req);
        const { product_id, bde_id, company_id, sbu_id, source_id, fiscal_year, month, from_date, to_date } = req.query;
        let fiscalStart;
        let fiscalEnd;
        let fyLabel;
        if (from_date || to_date) {
            fiscalStart = from_date ? dayjs_1.default.utc(from_date).startOf('day').toDate() : dayjs_1.default.utc('1970-01-01').toDate();
            fiscalEnd = to_date ? dayjs_1.default.utc(to_date).endOf('day').toDate() : dayjs_1.default.utc().endOf('day').toDate();
            fyLabel = `${dayjs_1.default.utc(fiscalStart).format('DD-MMM-YYYY')} to ${dayjs_1.default.utc(fiscalEnd).format('DD-MMM-YYYY')}`;
        }
        else {
            const { months: builtMonths, fyLabel: builtLabel } = buildMonths(month, fiscal_year);
            // Never show months that haven't started yet — only past and present months.
            const now = dayjs_1.default.utc();
            const fiscalMonths = builtMonths.filter(m => m.year < now.year() || (m.year === now.year() && m.month <= now.month() + 1));
            if (!fiscalMonths.length)
                return res.json({ fiscalYear: builtLabel, rows: [], summary: emptySummary() });
            fiscalStart = fiscalMonths[0].start;
            fiscalEnd = fiscalMonths[fiscalMonths.length - 1].end;
            fyLabel = builtLabel;
        }
        const leadConditions = [
            `l.quadrant = 'Order Won'`,
            `l.order_won_at IS NOT NULL`,
            `l.order_won_at >= ?`,
            `l.order_won_at <= ?`,
        ];
        const leadArgs = [fiscalStart, fiscalEnd];
        const teamIds = await (0, teamScope_1.getTeamIds)(user);
        if (user.role === 'SalesPerson') {
            leadConditions.push('l.lead_owner_id = ?');
            leadArgs.push(user.id);
        }
        else if (user.role === 'SalesManager') {
            if (bde_id) {
                const reqBdeId = parseInt(bde_id);
                if (!teamIds.includes(reqBdeId)) {
                    return res.json({ fiscalYear: fyLabel, rows: [], summary: emptySummary() });
                }
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(reqBdeId);
            }
            else if (teamIds.length) {
                leadConditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
            }
        }
        else {
            if (bde_id) {
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(parseInt(bde_id));
            }
        }
        if (product_id) {
            leadConditions.push('l.product_id = ?');
            leadArgs.push(parseInt(product_id));
        }
        if (company_id) {
            leadConditions.push('p.company_id = ?');
            leadArgs.push(parseInt(company_id));
        }
        if (sbu_id) {
            leadConditions.push('l.sales_sbu_id = ?');
            leadArgs.push(parseInt(sbu_id));
        }
        if (source_id) {
            leadConditions.push('l.lead_source_id = ?');
            leadArgs.push(parseInt(source_id));
        }
        const leadWhere = leadConditions.join(' AND ');
        const leads = await prisma_1.prisma.$queryRawUnsafe(`SELECT l.id, l.company_name, l.order_won_at, l.sales_device, l.device_count, l.order_value,
                    s.name AS sbu_name,
                    ls.name AS source_name,
                    u.first_name AS owner_first, u.last_name AS owner_last,
                    p.id AS product_id, p.name AS product_name,
                    c.id AS product_company_id, c.name AS product_company_name
             FROM lead l
             LEFT JOIN sbu s ON l.sales_sbu_id = s.id
             LEFT JOIN leadsource ls ON l.lead_source_id = ls.id
             LEFT JOIN user u ON l.lead_owner_id = u.id
             LEFT JOIN product p ON l.product_id = p.id
             LEFT JOIN company c ON p.company_id = c.id
             WHERE ${leadWhere}
             ORDER BY l.order_won_at ASC`, ...leadArgs);
        const rows = leads.map((l) => {
            const deviceNum = l.sales_device != null
                ? parseInt(l.sales_device, 10) || 0
                : parseInt(l.device_count, 10) || 0;
            const orderVal = l.order_value ? Number(l.order_value) : 0;
            return {
                lead_id: Number(l.id),
                company_name: l.company_name || 'Unassigned',
                product_company_id: l.product_company_id || null,
                product_company_name: l.product_company_name || 'Unassigned',
                product_name: l.product_name || 'Unassigned',
                product_id: l.product_id || null,
                account_manager: `${l.owner_first || ''} ${l.owner_last || ''}`.trim() || '—',
                sbu: l.sbu_name || '—',
                source: l.source_name || '—',
                devices: deviceNum,
                order_value: orderVal,
                order_won_at: l.order_won_at,
            };
        });
        const totalOrders = rows.length;
        const totalOrderValue = rows.reduce((s, r) => s + r.order_value, 0);
        const summary = {
            totalOrders,
            totalOrderValue,
            totalDeviceCount: rows.reduce((s, r) => s + r.devices, 0),
            averageOrderValue: totalOrders ? totalOrderValue / totalOrders : 0,
        };
        res.json({ fiscalYear: fyLabel, rows, summary });
    }
    catch (err) {
        console.error('[OrderWonReport] error:', err);
        res.status(500).json({ message: 'Failed to fetch order won report', detail: err?.message });
    }
};
exports.getOrderWonReport = getOrderWonReport;
function emptySummary() {
    return { totalOrders: 0, totalOrderValue: 0, totalDeviceCount: 0, averageOrderValue: 0 };
}
