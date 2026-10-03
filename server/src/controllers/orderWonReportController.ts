import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getTeamIds } from '../utils/teamScope';
dayjs.extend(utc);

const authUser = (req: Request) => (req as any).user;

type MonthBucket = { label: string; year: number; month: number; start: Date; end: Date };

function buildMonths(month: string | undefined, fiscalYear: string | undefined): { months: MonthBucket[]; fyLabel: string } {
    if (month) {
        const d = dayjs.utc(`${month}-01`);
        return {
            months: [{
                label: d.format('MMM-YY'), year: d.year(), month: d.month() + 1,
                start: d.startOf('month').toDate(), end: d.endOf('month').toDate(),
            }],
            fyLabel: d.format('MMM-YY'),
        };
    }

    let fyStart = parseInt(fiscalYear as string) || dayjs().year();
    if (!fiscalYear) {
        const currentMonth = dayjs().month() + 1;
        if (currentMonth < 4) fyStart = dayjs().year() - 1;
    }
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = dayjs.utc(`${fyStart}-04-01`).add(i, 'month');
        return {
            label: d.format('MMM-YY'), year: d.year(), month: d.month() + 1,
            start: d.startOf('month').toDate(), end: d.endOf('month').toDate(),
        };
    });
    return { months, fyLabel: `${fyStart}-${fyStart + 1}` };
}

// GET /api/order-won-report?product_id=&bde_id=&company_id=&sbu_id=&source_id=&fiscal_year=&month=&from_date=&to_date=
// Flat, filterable, sortable Order Won Report, per md files/reports/UI.md.
export const getOrderWonReport = async (req: Request, res: Response) => {
    try {
        const user = authUser(req);
        const { product_id, bde_id, company_id, sbu_id, source_id, fiscal_year, month, from_date, to_date } = req.query;

        let fiscalStart: Date;
        let fiscalEnd: Date;
        let fyLabel: string;

        if (from_date || to_date) {
            fiscalStart = from_date ? dayjs.utc(from_date as string).startOf('day').toDate() : dayjs.utc('1970-01-01').toDate();
            fiscalEnd = to_date ? dayjs.utc(to_date as string).endOf('day').toDate() : dayjs.utc().endOf('day').toDate();
            fyLabel = `${dayjs.utc(fiscalStart).format('DD-MMM-YYYY')} to ${dayjs.utc(fiscalEnd).format('DD-MMM-YYYY')}`;
        } else {
            const { months: builtMonths, fyLabel: builtLabel } = buildMonths(month as string | undefined, fiscal_year as string | undefined);

            // Never show months that haven't started yet — only past and present months.
            const now = dayjs.utc();
            const fiscalMonths = builtMonths.filter(m =>
                m.year < now.year() || (m.year === now.year() && m.month <= now.month() + 1)
            );

            if (!fiscalMonths.length) return res.json({ fiscalYear: builtLabel, rows: [], summary: emptySummary() });

            fiscalStart = fiscalMonths[0].start;
            fiscalEnd = fiscalMonths[fiscalMonths.length - 1].end;
            fyLabel = builtLabel;
        }

        const leadConditions: string[] = [
            `l.quadrant = 'Order Won'`,
            `l.order_won_at IS NOT NULL`,
            `l.order_won_at >= ?`,
            `l.order_won_at <= ?`,
        ];
        const leadArgs: any[] = [fiscalStart, fiscalEnd];

        const teamIds = await getTeamIds(user);

        if (user.role === 'SalesPerson') {
            leadConditions.push('l.lead_owner_id = ?');
            leadArgs.push(user.id);
        } else if (user.role === 'SalesManager') {
            if (bde_id) {
                const reqBdeId = parseInt(bde_id as string);
                if (!teamIds.includes(reqBdeId)) {
                    return res.json({ fiscalYear: fyLabel, rows: [], summary: emptySummary() });
                }
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(reqBdeId);
            } else if (teamIds.length) {
                leadConditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
            }
        } else {
            if (bde_id) { leadConditions.push('l.lead_owner_id = ?'); leadArgs.push(parseInt(bde_id as string)); }
        }

        if (product_id) { leadConditions.push('l.product_id = ?'); leadArgs.push(parseInt(product_id as string)); }
        if (company_id) { leadConditions.push('p.company_id = ?'); leadArgs.push(parseInt(company_id as string)); }
        if (sbu_id) { leadConditions.push('l.sales_sbu_id = ?'); leadArgs.push(parseInt(sbu_id as string)); }
        if (source_id) { leadConditions.push('l.lead_source_id = ?'); leadArgs.push(parseInt(source_id as string)); }

        const leadWhere = leadConditions.join(' AND ');

        const leads: any[] = await prisma.$queryRawUnsafe(
            `SELECT l.id, l.company_name, l.order_won_at, l.sales_device, l.device_count, l.order_value,
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
             ORDER BY l.order_won_at ASC`,
            ...leadArgs
        );

        const rows = leads.map((l: any) => {
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
    } catch (err: any) {
        console.error('[OrderWonReport] error:', err);
        res.status(500).json({ message: 'Failed to fetch order won report', detail: err?.message });
    }
};

function emptySummary() {
    return { totalOrders: 0, totalOrderValue: 0, totalDeviceCount: 0, averageOrderValue: 0 };
}
