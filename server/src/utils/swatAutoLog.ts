import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { prisma } from '../lib/prisma';

dayjs.extend(utc);

/**
 * Ensure a SwatPerformance row exists for TODAY for every in-scope BDE/product,
 * even on a day with zero activity — so the SWAT Performance list (and the Daily
 * Report that reads off these rows) shows "0 / target" instead of the day
 * vanishing until swatCron runs at 22:00.
 *
 * Population mirrors swatCron.ts: ACTIVE SalesPerson users who have a
 * UserProductTarget row. Targets are synced from UserProductTarget the same way
 * getSwatStats' auto-create does; achieved fields are left at their schema
 * default (0) — the list endpoint re-derives calls/activities/Q1 live per row,
 * and swatCron does the full nightly recompute for non-manually-saved rows.
 *
 * @param userIds  restrict to these user ids (list scoping); omit for all BDEs.
 */
export async function ensureSwatRowsForToday(userIds?: number[]): Promise<void> {
    const today = dayjs.utc().startOf('day').toDate();

    const users = await prisma.user.findMany({
        where: {
            role: 'SalesPerson',
            status: 'ACTIVE',
            ...(userIds && userIds.length > 0 ? { id: { in: userIds } } : {}),
        },
        select: { id: true, first_name: true, last_name: true },
    });

    for (const user of users) {
        const bde_name = `${user.first_name} ${user.last_name || ''}`.trim();

        const productTargets = await prisma.userProductTarget.findMany({
            where: { user_id: user.id },
            include: { product: { select: { lead_q1_multiplier: true } } },
        });

        for (const pt of productTargets) {
            const existing = await prisma.swatPerformance.findFirst({
                where: { user_id: user.id, date: today, product_id: pt.product_id },
            });
            if (existing) continue;

            const multiplier = (pt as any).product?.lead_q1_multiplier || 1.0;

            try {
                await prisma.swatPerformance.create({
                    data: {
                        bde_name,
                        user_id: user.id,
                        product_id: pt.product_id,
                        date: today,
                        calls_target: pt.calls_target || 0,
                        activities_target: (pt as any).activities_target || 0,
                        linkedin_target: pt.linkedin_target || 0,
                        q1_lead_gen_target: Math.round(((pt.leads_target || 0) * multiplier) / 22),
                        demos_target: pt.demos_target || 0,
                        proposals_target: pt.proposals_target || 0,
                        direct_visit_target: pt.direct_visit_target || 0,
                        email_campaign_target: (pt as any).email_target || 0,
                        linkedin_connection_target: (pt as any).linkedin_connection_target || 0,
                        sales_order_won_target: pt.sales_target || 0,
                        revenue_collected_target: pt.revenue_target || 0,
                        is_auto_saved: true,
                        is_manually_saved: false,
                    } as any,
                });
            } catch {
                // Unique ([user_id, date, product_id, service_department]) race —
                // a concurrent request/cron created the row first; nothing to do.
            }
        }
    }
}
