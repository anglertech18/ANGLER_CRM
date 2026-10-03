import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const prisma = new PrismaClient();

/**
 * Sum Lead.order_value for leads owned by the user whose order_won_at (local date)
 * falls on the selected SWAT date, and build the matching multi-line remarks.
 */
async function computeSalesOrderWonAuto(userId: number, startOfDay: Date, endOfDay: Date) {
    const leads = await prisma.lead.findMany({
        where: {
            lead_owner_id: userId,
            order_won_at: { gte: startOfDay, lte: endOfDay },
        },
        select: { company_name: true, order_value: true },
        orderBy: { order_won_at: 'asc' },
    });
    const total = leads.reduce((sum, l) => sum + Number(l.order_value || 0), 0);
    const remarks = leads
        .map(l => `${l.company_name || 'Unknown'} - ${Number(l.order_value || 0)}`)
        .join('\n');
    return { achieved: total, remarks };
}

/**
 * Sum LeadMilestonePaymentHistory.collected_amount for collections recorded by the
 * user whose collection_date (local date) falls on the selected SWAT date, and build
 * the matching multi-line remarks.
 */
async function computeRevenueCollectedAuto(userId: number, startOfDay: Date, endOfDay: Date) {
    const payments = await prisma.leadMilestonePaymentHistory.findMany({
        where: {
            collected_by_id: userId,
            collection_date: { gte: startOfDay, lte: endOfDay },
        },
        select: {
            collected_amount: true,
            lead: { select: { company_name: true } },
            lead_milestone: { select: { payment_type: { select: { name: true } } } },
        },
        orderBy: { collection_date: 'asc' },
    });
    const total = payments.reduce((sum, p) => sum + Number(p.collected_amount || 0), 0);
    const remarks = payments
        .map(p => `${p.lead?.company_name || 'Unknown'} - ${p.lead_milestone?.payment_type?.name || 'N/A'} - ${Number(p.collected_amount || 0)}`)
        .join('\n');
    return { achieved: total, remarks };
}

/**
 * Create or update a SWAT performance record
 */
export const saveSwatPerformance = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const user = (req as any).user;

        if (!body.date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const dateStr = body.date;
        const date = dayjs.utc(dateStr).startOf('day').toDate();
        const today = dayjs.utc().startOf('day');
        const product_id = (body.product_id && body.product_id !== 'null') ? parseInt(body.product_id) : null;

        if (!product_id) {
            return res.status(400).json({ message: 'Product selection is required.' });
        }

        // Rule: Only today's record (or future, if applicable) can be edited/updated
        if (dayjs.utc(date).isBefore(today, 'day')) {
            return res.status(400).json({ message: 'Past records cannot be modified.' });
        }

        // For querying other models like Lead, CallTracker which use local time (created_at)
        // We use local dayjs for startOfDay and endOfDay
        const startOfDay = dayjs(dateStr).startOf('day').toDate();
        const endOfDay = dayjs(dateStr).endOf('day').toDate();

        // 1. Fetch user targets from product profile
        const targetUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                first_name: true,
                last_name: true
            }
        });

        const userTargets = await prisma.userProductTarget.findUnique({
            where: { user_id_product_id: { user_id: user.id, product_id: product_id } }
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const bde_name = `${targetUser.first_name} ${targetUser.last_name || ''}`.trim();

        // 2. Calls Achieved: filter by product_id and valid call_status
        const callTrackerWhere: any = {
            user_id: user.id,
            date: { gte: startOfDay, lte: endOfDay },
            product_id: product_id,
            call_status_id: { not: null },
        };

        // A. Calls Achieved
        const calls_achieved = await prisma.callTracker.count({ where: callTrackerWhere });

        // B. Activities Target
        const activities_target = (userTargets?.calls_target || 0) + (userTargets?.linkedin_target || 0);

        // C. LinkedIn Connections Achieved (Manual Entry)
        const linkedin_achieved = parseInt(body.linkedin_achieved || 0);

        const email_count_for_activities = await prisma.callTracker.count({
            where: { ...callTrackerWhere, email_status_id: { not: null } }
        });

        const activities_achieved = (await prisma.callTracker.count({
            where: { ...callTrackerWhere, linkedin_sent: true }
        })) + email_count_for_activities;

        // E. Q1 Lead Generation
        const leadWhere: any = {
            lead_owner_id: user.id,
            created_at: { gte: startOfDay, lte: endOfDay },
            product_id: product_id,
        };
        const q1_lead_gen_achieved = await prisma.lead.count({ where: leadWhere });

        // E. Quadrant Movements
        const movementLeadFilter = { product_id };

        const movementWhere: any = {
            user_id: user.id,
            moved_at: { gte: startOfDay, lte: endOfDay },
            lead: movementLeadFilter,
        };

        const movements = await prisma.leadQuadrantHistory.findMany({
            where: movementWhere,
            include: { lead: { select: { product_id: true } } }
        });

        const getCount = (oldQ: string | null, newQ: string) =>
            movements.filter(m => m.old_quadrant === oldQ && m.new_quadrant === newQ).length;

        const getNurturingCount = () =>
            movements.filter(m => m.new_quadrant === 'Nurturing').length;

        const q1_to_q2 = getCount('Q1', 'Q2');
        const q2_to_q3 = getCount('Q2', 'Q3');
        const q3_to_q4 = getCount('Q3', 'Q4');
        const q4_to_order = getCount('Q4', 'Order Won');

        const q4_to_q3 = getCount('Q4', 'Q3');
        const q3_to_q2 = getCount('Q3', 'Q2');
        const q2_to_q1 = getCount('Q2', 'Q1');
        const any_to_nurturing = getNurturingCount();

        // 2B. Fetch Multiplier
        const productDetails = await prisma.product.findUnique({
            where: { id: product_id },
            select: { lead_q1_multiplier: true }
        });
        const multiplier = productDetails?.lead_q1_multiplier || 1.0;
        const q1_lead_gen_target = Math.round(((userTargets?.leads_target || 0) * multiplier) / 22);
        // Sales Order Won & Revenue Collected use the single Monthly Target (not split by working days)
        const sales_order_won_target = userTargets?.sales_target || 0;
        const revenue_collected_target = userTargets?.revenue_target || 0;

        // F. Sales Order Won & Revenue Collected — auto-computed from Leads / Milestone payments
        const salesOrderWonAuto = await computeSalesOrderWonAuto(user.id, startOfDay, endOfDay);
        const revenueCollectedAuto = await computeRevenueCollectedAuto(user.id, startOfDay, endOfDay);

        // 3. Prepare Data
        const data: any = {
            bde_name,
            date,
            user_id: user.id,
            product_id: product_id,

            // Automated Fields (Override Posted Values)
            calls_achieved,
            activities_target,
            activities_achieved,
            linkedin_achieved,

            // Movement Fields (Automated)
            q1_to_q2,
            q2_to_q3,
            q3_to_q4,
            q4_to_order,
            q4_to_q3,
            q3_to_q2,
            q2_to_q1,
            any_to_nurturing,

            // Targets from User Profile (Sync)
            calls_target: userTargets?.calls_target || 0,
            linkedin_target: userTargets?.linkedin_target || 0,
            q1_lead_gen_target,
            demos_target: userTargets?.demos_target || 0,
            proposals_target: userTargets?.proposals_target || 0,
            direct_visit_target: userTargets?.direct_visit_target || 0,
            email_campaign_target: userTargets?.email_target || 0,
            linkedin_connection_target: userTargets?.linkedin_connection_target || 0,

            // Manual Entry Fields (Achievements)
            q1_lead_gen_achieved,           // Now auto-calculated
            demos_achieved: parseInt(body.demos_achieved || 0),
            proposals_achieved: parseInt(body.proposals_achieved || 0),
            direct_visit_achieved: parseInt(body.direct_visit_achieved || 0),
            email_campaign_achieved: parseInt(body.email_campaign_achieved || 0),
            linkedin_connection_achieved: parseInt(body.linkedin_connection_achieved || 0),
            // Sales Order Won & Revenue Collected Achieved — auto-calculated from Leads / Milestone payments
            sales_order_won_achieved: Math.round(salesOrderWonAuto.achieved),
            revenue_collected_achieved: Math.round(revenueCollectedAuto.achieved),

            // Sales Order Won & Revenue Collected Targets — synced from User Profile (monthly Sales/Revenue Target ÷ working days)
            sales_order_won_target,
            revenue_collected_target,

            // Save status — mark as manually saved so cron skips this record
            is_manually_saved: true,
            is_auto_saved: false,

            // Remarks
            calls_remarks: body.calls_remarks || null,
            activities_remarks: body.activities_remarks || null,
            q1_lead_gen_remarks: body.q1_lead_gen_remarks || null,
            linkedin_remarks: body.linkedin_remarks || null,
            demos_remarks: body.demos_remarks || null,
            proposals_remarks: body.proposals_remarks || null,
            direct_visit_remarks: body.direct_visit_remarks || null,
            email_campaign_remarks: body.email_campaign_remarks || null,
            linkedin_connection_remarks: body.linkedin_connection_remarks || null,
            // Sales Order Won & Revenue Collected Remarks — auto-generated (company-wise breakdown)
            sales_order_won_remarks: salesOrderWonAuto.remarks || null,
            revenue_collected_remarks: revenueCollectedAuto.remarks || null,
        };

        // 4. Performance Calculation
        const fields = [
            { target: data.calls_target, achieved: data.calls_achieved },
            { target: data.activities_target, achieved: data.activities_achieved },
            { target: data.q1_lead_gen_target, achieved: data.q1_lead_gen_achieved },
            { target: data.linkedin_target, achieved: data.linkedin_achieved },
            { target: data.demos_target, achieved: data.demos_achieved },
            { target: data.proposals_target, achieved: data.proposals_achieved },
            { target: data.direct_visit_target, achieved: data.direct_visit_achieved },
            { target: data.email_campaign_target, achieved: data.email_campaign_achieved },
            { target: data.linkedin_connection_target, achieved: data.linkedin_connection_achieved },
            { target: data.sales_order_won_target, achieved: data.sales_order_won_achieved },
            { target: data.revenue_collected_target, achieved: data.revenue_collected_achieved }
        ];

        let totalPct = 0;
        let activeSections = 0;

        fields.forEach(f => {
            if (f.target > 0) {
                activeSections++;
                totalPct += Math.min(100, (f.achieved / f.target) * 100); // Cap at 100% per section for average? 
                // Wait, if they exceed, it usually counts. But rule says "Achieved calculation cannot exceed Target". 
                // Actually, Rule says "BDE can't manually override".
            }
        });

        data.performance_percentage = activeSections > 0 ? totalPct / activeSections : 0;

        // 5. Upsert SWAT Performance — find existing record by current key
        let existingRecord = await prisma.swatPerformance.findFirst({
            where: {
                user_id: user.id,
                date: date,
                product_id: product_id,
            }
        });

        let result;
        if (existingRecord) {
            result = await prisma.swatPerformance.update({
                where: { id: existingRecord.id },
                data
            });
        } else {
            result = await prisma.swatPerformance.create({ data });
        }

        // 6. Handle Key Closures
        if (body.key_closures && Array.isArray(body.key_closures)) {
            // Delete old closures for this entry if updating
            await prisma.swatKeyClosure.deleteMany({
                where: { swat_performance_id: result.id }
            });

            // Create new ones
            if (body.key_closures.length > 0) {
                await prisma.swatKeyClosure.createMany({
                    data: body.key_closures
                        .filter((c: any) => c.closure_text && c.closure_text.trim() !== '')
                        .map((c: any) => ({
                            swat_performance_id: result.id,
                            closure_text: c.closure_text
                        }))
                });
            }
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error saving SWAT performance:', error);
        res.status(500).json({ message: 'Error saving performance data', error });
    }
};

/**
 * Get SWAT performance for a specific date range / BDE / Status
 */
export const getSwatPerformance = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, user_id, status, product_id } = req.query;
        const user = (req as any).user;

        let where: any = {};

        if (product_id) {
            where.product_id = parseInt(product_id as string);
        }

        // Date range
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = dayjs.utc(startDate as string).startOf('day').toDate();
            if (endDate) where.date.lte = dayjs.utc(endDate as string).endOf('day').toDate();
        }

        // BDE Filtering
        if (user_id) {
            where.user_id = parseInt(user_id as string);
        }

        // Role-based visibility
        if (user.role === 'SalesPerson') {
            where.user_id = user.id;
        } else if (user.role === 'SalesManager') {
            // Managers see their team and themselves
            const subordinates = await prisma.user.findMany({
                where: { reporting_manager_id: user.id },
                select: { id: true }
            });
            const subIds = subordinates.map(s => s.id);
            subIds.push(user.id);

            if (where.user_id) {
                if (!subIds.includes(where.user_id)) {
                    return res.status(403).json({ message: 'Access denied to this user performance' });
                }
            } else {
                where.user_id = { in: subIds };
            }
        }

        const reports = await prisma.swatPerformance.findMany({
            where,
            orderBy: { id: 'desc' },
            include: {
                user: {
                    select: { first_name: true, last_name: true }
                },
                product: {
                    select: { name: true }
                },
                key_closures: true
            }
        });

        // Enrich product-based records with live call/activity counts
        const enrichedReports = await Promise.all(reports.map(async (report: any) => {
            if (!report.product_id) {
                return report;
            }

            const dateStr = dayjs.utc(report.date).format('YYYY-MM-DD');
            const startOfDay = dayjs(dateStr).startOf('day').toDate();
            const endOfDay = dayjs(dateStr).endOf('day').toDate();

            const callWhere: any = { user_id: report.user_id, date: { gte: startOfDay, lte: endOfDay }, product_id: report.product_id, call_status_id: { not: null } };
            const leadWhere: any = { lead_owner_id: report.user_id, created_at: { gte: startOfDay, lte: endOfDay }, product_id: report.product_id };

            const [calls, linkedinCount, emailCount, leadsCreated] = await Promise.all([
                prisma.callTracker.count({ where: callWhere }),
                prisma.callTracker.count({ where: { ...callWhere, linkedin_sent: true } }),
                prisma.callTracker.count({ where: { ...callWhere, email_status_id: { not: null } } }),
                prisma.lead.count({ where: leadWhere })
            ]);

            return {
                ...report,
                calls_achieved: calls,
                activities_achieved: linkedinCount + emailCount,
                q1_lead_gen_achieved: leadsCreated,
            };
        }));

        // Client-side filtering for performance status
        let filteredReports = enrichedReports;
        if (status) {
            filteredReports = enrichedReports.filter((r: any) => {
                const pct = r.performance_percentage || 0;
                if (status === 'Below Target') return pct < 70;
                if (status === 'Achieved') return pct >= 70 && pct < 100;
                if (status === 'Exceeded') return pct >= 100;
                return true;
            });
        }

        res.json(filteredReports);
    } catch (error) {
        console.error('Error fetching SWAT performance:', error);
        res.status(500).json({ message: 'Error fetching data' });
    }
};

/**
 * Get live SWAT stats for a specific user and date
 */
export const getSwatStats = async (req: Request, res: Response) => {
    try {
        const { date: dateStr, user_id, product_id } = req.query;
        const authUser = (req as any).user;

        console.log(`[getSwatStats] Date: ${dateStr}, targetUser: ${user_id}, authUser: ${authUser?.id}, productId: ${product_id}`);

        const targetUserId = user_id ? parseInt(user_id as string) : authUser.id;
        const parsedProductId: number | null = (product_id && product_id !== 'null') ? parseInt(product_id as string) : null;

        if (!parsedProductId) {
            return res.json({ targets: {}, achievements: {}, existing: null });
        }

        // Security check
        if (authUser.role === 'SalesPerson' && targetUserId !== authUser.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const date = dayjs.utc(dateStr as string).startOf('day').toDate();
        // Use local timezone for querying dynamic data (calls/leads) created today
        const startOfDay = dayjs(dateStr as string).startOf('day').toDate();
        const endOfDay = dayjs(dateStr as string).endOf('day').toDate();

        // 1. Fetch user & targets (moved up — needed for lookups below)
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { first_name: true, last_name: true }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const userTargets = await prisma.userProductTarget.findUnique({
            where: { user_id_product_id: { user_id: targetUserId, product_id: parsedProductId } }
        });

        // 0. Fetch existing SWAT performance
        let existing = await prisma.swatPerformance.findFirst({
            where: {
                user_id: targetUserId,
                date: date,
                product_id: parsedProductId,
            },
            include: { key_closures: true }
        });

        // 2. Automated Calculations — filter by product_id and valid call_status
        const callTrackerWhere: any = {
            user_id: targetUserId,
            date: { gte: startOfDay, lte: endOfDay },
            product_id: parsedProductId,
            call_status_id: { not: null },
        };

        const calls_achieved = await prisma.callTracker.count({
            where: callTrackerWhere
        });

        // Activities achieved = LinkedIn sent + Email sent (no call_status filter)
        const linkedin_count_for_activities = await prisma.callTracker.count({
            where: { ...callTrackerWhere, linkedin_sent: true }
        });

        const email_count_for_activities = await prisma.callTracker.count({
            where: { ...callTrackerWhere, email_status_id: { not: null } }
        });

        const activities_achieved = linkedin_count_for_activities + email_count_for_activities;

        // LinkedIn Connections field should be manual entry from existing record if available
        const linkedin_achieved = existing?.linkedin_achieved || 0;

        const productDetails = await prisma.product.findUnique({
            where: { id: parsedProductId },
            select: { lead_q1_multiplier: true }
        });
        const multiplier = productDetails?.lead_q1_multiplier || 1.0;
        const q1_lead_gen_target = Math.round(((userTargets?.leads_target || 0) * multiplier) / 22);
        const activities_target = (userTargets?.calls_target || 0) + (userTargets?.linkedin_target || 0);
        // Sales Order Won & Revenue Collected use the single Monthly Target (not split by working days)
        const sales_order_won_target = userTargets?.sales_target || 0;
        const revenue_collected_target = userTargets?.revenue_target || 0;

        // Auto-calculate Q1 Lead Generation
        const leadWhere: any = {
            lead_owner_id: targetUserId,
            created_at: { gte: startOfDay, lte: endOfDay },
            product_id: parsedProductId,
        };
        const q1_lead_gen_achieved = await prisma.lead.count({ where: leadWhere });

        // Sales Order Won & Revenue Collected — auto-computed live preview
        const salesOrderWonAuto = await computeSalesOrderWonAuto(targetUserId, startOfDay, endOfDay);
        const revenueCollectedAuto = await computeRevenueCollectedAuto(targetUserId, startOfDay, endOfDay);

        // 3. Quadrant Movements (Live)
        const movementLeadFilter = { product_id: parsedProductId };

        const movementWhere: any = {
            user_id: targetUserId,
            moved_at: { gte: startOfDay, lte: endOfDay },
            lead: movementLeadFilter,
        };

        const movements = await prisma.leadQuadrantHistory.findMany({
            where: movementWhere,
            include: { lead: { select: { product_id: true } } }
        });

        const getCount = (oldQ: string | null, newQ: string) =>
            movements.filter(m => m.old_quadrant === oldQ && m.new_quadrant === newQ).length;

        // Actual stored values from leadHelper.ts are 'Nurturing' and 'Order Won' (not uppercase aliases)
        const getNurturingCount = () =>
            movements.filter(m => m.new_quadrant === 'Nurturing').length;

        const liveMovementStats = {
            q1_to_q2: getCount('Q1', 'Q2'),
            q2_to_q3: getCount('Q2', 'Q3'),
            q3_to_q4: getCount('Q3', 'Q4'),
            q4_to_order: getCount('Q4', 'Order Won'),
            q4_to_q3: getCount('Q4', 'Q3'),
            q3_to_q2: getCount('Q3', 'Q2'),
            q2_to_q1: getCount('Q2', 'Q1'),
            any_to_nurturing: getNurturingCount(),
        };


        // 5. Auto-create or refresh today's record
        const isToday = dayjs.utc(date).isSame(dayjs.utc().startOf('day'), 'day');
        if (isToday) {
            if (!existing) {
                try {
                    const bde_name = (req as any).user.id === targetUserId
                        ? `${authUser.first_name} ${authUser.last_name || ''}`.trim()
                        : await prisma.user.findUnique({ where: { id: targetUserId } }).then(u => `${u?.first_name} ${u?.last_name || ''}`.trim());

                    existing = await prisma.swatPerformance.create({
                        data: {
                            user_id: targetUserId,
                            product_id: parsedProductId,
                            date: date,
                            bde_name: bde_name,
                            calls_target: userTargets?.calls_target || 0,
                            activities_target: activities_target,
                            linkedin_target: userTargets?.linkedin_target || 0,
                            q1_lead_gen_target: q1_lead_gen_target,
                            demos_target: userTargets?.demos_target || 0,
                            proposals_target: userTargets?.proposals_target || 0,
                            direct_visit_target: userTargets?.direct_visit_target || 0,
                            email_campaign_target: userTargets?.email_target || 0,
                            linkedin_connection_target: userTargets?.linkedin_connection_target || 0,
                            sales_order_won_target,
                            revenue_collected_target,
                            calls_achieved,
                            activities_achieved,
                            linkedin_achieved,
                            q1_lead_gen_achieved,
                            demos_achieved: 0,
                            proposals_achieved: 0,
                            direct_visit_achieved: 0,
                            email_campaign_achieved: 0,
                            linkedin_connection_achieved: 0,
                            sales_order_won_achieved: Math.round(salesOrderWonAuto.achieved),
                            revenue_collected_achieved: Math.round(revenueCollectedAuto.achieved),
                            sales_order_won_remarks: salesOrderWonAuto.remarks || null,
                            revenue_collected_remarks: revenueCollectedAuto.remarks || null,
                            ...liveMovementStats
                        },
                        include: { key_closures: true }
                    });
                    console.log(`[getSwatStats] Auto-created today's SWAT log for User ID ${targetUserId}`);
                } catch (createError) {
                    console.error('[getSwatStats] Failed to auto-create SWAT log:', createError);
                }
            } else {
                // Refresh auto-computed fields so the list always shows current values
                try {
                    existing = await prisma.swatPerformance.update({
                        where: { id: existing.id },
                        data: {
                            calls_achieved,
                            activities_achieved,
                            q1_lead_gen_achieved,
                            calls_target: userTargets?.calls_target || 0,
                            activities_target,
                            q1_lead_gen_target,
                            linkedin_target: userTargets?.linkedin_target || 0,
                            direct_visit_target: userTargets?.direct_visit_target || 0,
                            email_campaign_target: userTargets?.email_target || 0,
                            linkedin_connection_target: userTargets?.linkedin_connection_target || 0,
                            proposals_target: userTargets?.proposals_target || 0,
                            demos_target: userTargets?.demos_target || 0,
                            sales_order_won_target,
                            revenue_collected_target,
                            sales_order_won_achieved: Math.round(salesOrderWonAuto.achieved),
                            revenue_collected_achieved: Math.round(revenueCollectedAuto.achieved),
                            sales_order_won_remarks: salesOrderWonAuto.remarks || null,
                            revenue_collected_remarks: revenueCollectedAuto.remarks || null,
                            ...liveMovementStats
                        },
                        include: { key_closures: true }
                    });
                } catch (refreshError) {
                    console.error('[getSwatStats] Failed to refresh today\'s SWAT log:', refreshError);
                }
            }
        }

        res.json({
            targets: {
                calls_target: userTargets?.calls_target || 0,
                activities_target: activities_target,
                linkedin_target: userTargets?.linkedin_target || 0,
                q1_lead_gen_target: q1_lead_gen_target,
                demos_target: userTargets?.demos_target || 0,
                proposals_target: userTargets?.proposals_target || 0,
                direct_visit_target: userTargets?.direct_visit_target || 0,
                email_campaign_target: userTargets?.email_target || 0,
                linkedin_connection_target: userTargets?.linkedin_connection_target || 0,
                sales_order_won_target,
                revenue_collected_target,
            },
            achievements: {
                calls_achieved,
                activities_achieved,
                linkedin_achieved,
                q1_lead_gen_achieved,
                demos_achieved: existing?.demos_achieved || 0,
                proposals_achieved: existing?.proposals_achieved || 0,
                direct_visit_achieved: existing?.direct_visit_achieved || 0,
                email_campaign_achieved: existing?.email_campaign_achieved || 0,
                linkedin_connection_achieved: existing?.linkedin_connection_achieved || 0,
                sales_order_won_achieved: Math.round(salesOrderWonAuto.achieved),
                revenue_collected_achieved: Math.round(revenueCollectedAuto.achieved),
                ...liveMovementStats
            },
            computedRemarks: {
                sales_order_won_remarks: salesOrderWonAuto.remarks,
                revenue_collected_remarks: revenueCollectedAuto.remarks,
            },
            existing
        });
    } catch (error: any) {
        console.error('Error fetching SWAT stats:', error);
        res.status(500).json({ message: 'Error fetching stats', details: error.message });
    }
};

export const getMyMappings = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const productTargets = await prisma.userProductTarget.findMany({
            where: { user_id: user.id },
            select: { product_id: true }
        });
        const product_ids = productTargets.map((t: any) => t.product_id);
        res.json({ product_ids });
    } catch (error: any) {
        console.error('Error fetching my mappings:', error);
        res.status(500).json({ message: 'Error fetching mappings', details: error.message });
    }
};
