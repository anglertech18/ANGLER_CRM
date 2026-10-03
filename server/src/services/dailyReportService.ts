import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { prisma } from '../lib/prisma';

dayjs.extend(utc);

const SWAT_METRICS: { key: string; label: string }[] = [
    { key: 'calls', label: 'Calls' },
    { key: 'activities', label: 'Activities' },
    { key: 'q1_lead_gen', label: 'Q1 Lead Gen' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'demos', label: 'Demo' },
    { key: 'proposals', label: 'Proposal' },
    { key: 'direct_visit', label: 'Direct Visit' },
    { key: 'sales_order_won', label: 'Sales Order Won' },
    { key: 'revenue_collected', label: 'Revenue Collected' },
];

export interface DailyReportLeadRow {
    lead_id: number | null;
    lead_name: string;
    quadrant: string | null;
    follow_up_notes: string;
}

export interface DailyReportSwatRow {
    category: string;
    target: number;
    achieved: number;
}

export interface DailyReportProductSection {
    product_id: number;
    product_name: string;
    leads: DailyReportLeadRow[];
    swat: DailyReportSwatRow[];
}

export interface GeneratedDailyReport {
    subject: string;
    html: string;
    products: DailyReportProductSection[];
}

// Builds the grouped Employee -> Product report (Lead Activity + SWAT Activity Summary)
// for a single user on a single date. Pure — does not write to the database.
export async function generateDailyReportForUser(
    user: { id: number; first_name: string; last_name: string | null },
    date: string // 'YYYY-MM-DD'
): Promise<GeneratedDailyReport | null> {
    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();
    const dbDate = dayjs.utc(date).startOf('day').toDate();

    const productTargets = await prisma.userProductTarget.findMany({
        where: { user_id: user.id },
        include: { product: { select: { id: true, name: true, is_active: true } } },
    });

    const activeProducts = productTargets.filter((pt: any) => pt.product.is_active);
    if (activeProducts.length === 0) return null;

    const products: DailyReportProductSection[] = [];

    for (const pt of activeProducts) {
        const productId = pt.product_id;

        const [followUps, swatPerformance] = await Promise.all([
            prisma.followUpLog.findMany({
                where: {
                    created_by_id: user.id,
                    created_at: { gte: startOfDay, lte: endOfDay },
                    lead: { product_id: productId },
                },
                include: {
                    lead: {
                        select: { id: true, company_name: true, quadrant: true, company_master: { select: { name: true } } },
                    },
                },
                orderBy: { created_at: 'asc' },
            }),
            prisma.swatPerformance.findFirst({
                where: { user_id: user.id, date: dbDate, product_id: productId },
            }),
        ]);

        if (followUps.length === 0 && !swatPerformance) continue;

        const leads: DailyReportLeadRow[] = followUps.map((f: any) => ({
            lead_id: f.lead.id,
            lead_name: f.lead.company_name || f.lead.company_master?.name || `Lead #${f.lead.id}`,
            quadrant: f.lead.quadrant || null,
            follow_up_notes: f.notes?.trim() || '—',
        }));

        const swat: DailyReportSwatRow[] = SWAT_METRICS
            .map(({ key, label }) => ({
                category: label,
                target: (swatPerformance as any)?.[`${key}_target`] ?? 0,
                achieved: (swatPerformance as any)?.[`${key}_achieved`] ?? 0,
            }))
            .filter(m => m.target !== 0 || m.achieved !== 0);

        if (leads.length === 0 && swat.length === 0) continue;

        products.push({ product_id: productId, product_name: pt.product.name, leads, swat });
    }

    if (products.length === 0) return null;

    const employeeName = `${user.first_name} ${user.last_name || ''}`.trim();
    const dateStr = dayjs(date).format('DD-MMM-YYYY');
    const subject = `Daily Activity Report - ${employeeName} - ${dateStr}`;
    const html = renderReportHtml(employeeName, dateStr, products);

    return { subject, html, products };
}

function renderReportHtml(employeeName: string, dateStr: string, products: DailyReportProductSection[]): string {
    const productSections = products.map(p => {
        const leadRows = p.leads.length > 0
            ? p.leads.map(l => `
                <tr>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.lead_name)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.quadrant || '—')}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.follow_up_notes)}</td>
                </tr>`).join('')
            : `<tr><td colspan="3" style="padding:10px 14px;color:#94a3b8;">No lead activity recorded.</td></tr>`;

        const swatRows = p.swat.length > 0
            ? p.swat.map(s => `
                <tr>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(s.category)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;">${s.achieved}</td>
                </tr>`).join('')
            : `<tr><td colspan="2" style="padding:10px 14px;color:#94a3b8;">No SWAT activity recorded.</td></tr>`;

        return `
    <div style="margin-top:24px;">
        <h3 style="color:#074388;font-size:15px;margin:0 0 10px;">Product: ${escapeHtml(p.product_name)}</h3>

        <h4 style="color:#475569;font-size:13px;margin:12px 0 6px;">Lead Activity</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Lead Name</th>
                    <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Quadrant</th>
                    <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Follow-up Notes</th>
                </tr>
            </thead>
            <tbody>${leadRows}</tbody>
        </table>

        <h4 style="color:#475569;font-size:13px;margin:16px 0 6px;">SWAT Activity Summary</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Activity</th>
                    <th style="padding:10px 14px;text-align:right;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Achieved</th>
                </tr>
            </thead>
            <tbody>${swatRows}</tbody>
        </table>
    </div>`;
    }).join('');

    return `
<div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#1e293b;">
    <div style="background:#074388;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Daily Activity Report</h2>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">${escapeHtml(employeeName)} &nbsp;|&nbsp; ${dateStr}</p>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        ${productSections}
    </div>
</div>`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
