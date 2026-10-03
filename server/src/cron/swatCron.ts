import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const prisma = new PrismaClient();

async function computeLiveSwatData(
    userId: number,
    dateStr: string,
    productId: number
) {
    const startOfDay = dayjs(dateStr).startOf('day').toDate();
    const endOfDay   = dayjs(dateStr).endOf('day').toDate();

    const callWhere: any = { user_id: userId, date: { gte: startOfDay, lte: endOfDay }, product_id: productId };
    const leadWhere: any = { lead_owner_id: userId, created_at: { gte: startOfDay, lte: endOfDay }, product_id: productId };
    const moveWhere: any = { user_id: userId, moved_at: { gte: startOfDay, lte: endOfDay }, lead: { product_id: productId } };

    const [calls_achieved, linkedin_count, email_count, q1_lead_gen_achieved, movements] = await Promise.all([
        prisma.callTracker.count({ where: callWhere }),
        prisma.callTracker.count({ where: { ...callWhere, linkedin_sent: true } }),
        prisma.callTracker.count({ where: { ...callWhere, email_status_id: { not: null } } }),
        prisma.lead.count({ where: leadWhere }),
        prisma.leadQuadrantHistory.findMany({ where: moveWhere }),
    ]);

    const getCount = (oldQ: string | null, newQ: string) =>
        movements.filter((m: any) => m.old_quadrant === oldQ && m.new_quadrant === newQ).length;

    return {
        calls_achieved,
        activities_achieved: linkedin_count + email_count,
        q1_lead_gen_achieved,
        q1_to_q2:         getCount('Q1', 'Q2'),
        q2_to_q3:         getCount('Q2', 'Q3'),
        q3_to_q4:         getCount('Q3', 'Q4'),
        q4_to_order:      getCount('Q4', 'Order Won'),
        q4_to_q3:         getCount('Q4', 'Q3'),
        q3_to_q2:         getCount('Q3', 'Q2'),
        q2_to_q1:         getCount('Q2', 'Q1'),
        any_to_nurturing: movements.filter((m: any) => m.new_quadrant === 'Nurturing').length,
    };
}

export const startSwatCron = () => {
    // Run daily at 10:00 PM
    cron.schedule('0 22 * * *', async () => {
        console.log('[SwatCron] Running SWAT Performance Auto-Save at 10:00 PM...');

        try {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const today    = dayjs.utc(todayStr).startOf('day').toDate();

            // Fetch all active SalesPerson users
            const users = await prisma.user.findMany({
                where: { role: 'SalesPerson', status: 'ACTIVE' },
                select: { id: true, first_name: true, last_name: true }
            });

            for (const user of users) {
                const bde_name = `${user.first_name} ${user.last_name || ''}`.trim();

                // Fetch all product mappings for this user
                const productTargets = await prisma.userProductTarget.findMany({
                    where: { user_id: user.id },
                    include: { product: { select: { name: true, lead_q1_multiplier: true } } }
                });

                if (productTargets.length === 0) continue;

                for (const pt of productTargets) {
                    try {
                        const productId = pt.product_id;

                        // Check existing record for today
                        const existing = await prisma.swatPerformance.findFirst({
                            where: {
                                user_id: user.id,
                                date: today,
                                product_id: productId,
                            }
                        });

                        // Skip if user already manually submitted
                        if ((existing as any)?.is_manually_saved) {
                            console.log(`[SwatCron] Skip ${bde_name} / product:${productId} — manually saved`);
                            continue;
                        }

                        // Compute live achieved values
                        const liveData = await computeLiveSwatData(user.id, todayStr, productId);

                        // Compute targets
                        const multiplier = (pt as any).product?.lead_q1_multiplier || 1.0;
                        const q1_lead_gen_target = Math.round((pt.leads_target || 0) * multiplier);
                        const calls_target      = pt.calls_target || 0;
                        const linkedin_target   = pt.linkedin_target || 0;
                        // Activities Target — sourced from Target Management (pt.activities_target)
                        const activities_target = (pt as any).activities_target || 0;

                        // Performance %
                        const sections = [
                            { t: calls_target,      a: liveData.calls_achieved },
                            // Activities (Email + LinkedIn) excluded from performance % — field hidden in UI
                            // { t: activities_target, a: liveData.activities_achieved },
                            { t: q1_lead_gen_target, a: liveData.q1_lead_gen_achieved },
                        ];
                        let totalPct = 0, active = 0;
                        sections.forEach(s => { if (s.t > 0) { active++; totalPct += Math.min(100, (s.a / s.t) * 100); } });
                        const performance_percentage = active > 0 ? totalPct / active : 0;

                        const baseData = {
                            bde_name,
                            user_id:            user.id,
                            product_id:         productId,
                            date:               today,
                            calls_target,
                            activities_target,
                            linkedin_target,
                            q1_lead_gen_target,
                            direct_visit_target: pt.direct_visit_target || 0,
                            // Targets from User Profile (Sync) — mirrors saveSwatPerformance's manual-save
                            // mapping so a report built off an auto-saved (non-manually-submitted) day still
                            // shows the right target, not a stale/zeroed one.
                            email_campaign_target:      (pt as any).email_target || 0,
                            linkedin_connection_target: (pt as any).linkedin_connection_target || 0,
                            demos_target:               pt.demos_target || 0,
                            proposals_target:           pt.proposals_target || 0,
                            sales_order_won_target:     pt.sales_target || 0,
                            revenue_collected_target:   pt.revenue_target || 0,
                            // Manual-entry achieved fields — no automated source, preserve from existing record
                            demos_achieved:             existing?.demos_achieved || 0,
                            proposals_achieved:         existing?.proposals_achieved || 0,
                            direct_visit_achieved:      existing?.direct_visit_achieved || 0,
                            sales_order_won_achieved:   existing?.sales_order_won_achieved || 0,
                            revenue_collected_achieved: existing?.revenue_collected_achieved || 0,
                            linkedin_achieved:          existing?.linkedin_achieved || 0,
                            email_campaign_achieved:      existing?.email_campaign_achieved || 0,
                            linkedin_connection_achieved: existing?.linkedin_connection_achieved || 0,
                            ...liveData,
                            performance_percentage,
                            is_auto_saved:    true,
                            is_manually_saved: false,
                        };

                        if (existing) {
                            await prisma.swatPerformance.update({
                                where: { id: existing.id },
                                data: baseData as any,
                            });
                            console.log(`[SwatCron] Auto-updated: ${bde_name} / product:${productId}`);
                        } else {
                            await prisma.swatPerformance.create({ data: baseData as any });
                            console.log(`[SwatCron] Auto-created: ${bde_name} / product:${productId}`);
                        }
                    } catch (err) {
                        console.error(`[SwatCron] Error processing ${bde_name} / product:${pt.product_id}:`, err);
                    }
                }
            }

            console.log('[SwatCron] Auto-Save Cron Completed.');
        } catch (error) {
            console.error('[SwatCron] Fatal error in Auto-Save Cron:', error);
        }
    });
};
