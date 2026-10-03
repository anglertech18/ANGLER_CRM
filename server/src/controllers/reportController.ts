import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const today = dayjs().startOf('day').toDate();
        const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();

        // 1. Fetch current user's targets and achievements
        const userPerformance = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                calls_target: true,
                revenue_target: true
            }
        });

        // Build lead/call tracker scope based on role
        let leadWhere: any = {};
        let callTrackerWhere: any = {};

        if (user.role === 'SalesPerson') {
            leadWhere = { lead_owner_id: user.id };
            callTrackerWhere = { user_id: user.id };
        } else if (user.role === 'SalesManager') {
            const teamMembers = await prisma.user.findMany({
                where: { OR: [{ id: user.id }, { reporting_manager_id: user.id }] },
                select: { id: true }
            });
            const teamIds = teamMembers.map((u: any) => u.id);
            leadWhere = { lead_owner_id: { in: teamIds } };
            callTrackerWhere = { user_id: { in: teamIds } };
        }
        // CEO leadWhere and callTrackerWhere remain empty ({}) to see all

        // Raw-SQL mirror of the leadWhere role scoping above, for the
        // Existing EDC Milestones count query below (CR12).
        let ownerScopeSql = '1=1';
        if (user.role === 'SalesPerson') {
            ownerScopeSql = `l.lead_owner_id = ${user.id}`;
        } else if (user.role === 'SalesManager') {
            const teamIds = (leadWhere.lead_owner_id?.in as number[]) || [];
            ownerScopeSql = teamIds.length ? `l.lead_owner_id IN (${teamIds.join(',')})` : '1=0';
        }

        const [
            totalLeads,
            nurturingLeadsCount,
            todayCalls,
            callTrackerFollowUps,
            leadFollowUps,
            linkedinCount,
            emailCount,
            leadsWithCompany,
            allSalesStages,
            requiresRequalificationCount,
            existingEdcMilestonesRows
        ] = await Promise.all([
            // Total leads (scoped by role): only active Lead Quadrants (Q1-Q4).
            // Excludes Nurturing, Order Won and Order Lost.
            prisma.lead.count({
                where: { ...leadWhere, quadrant: { in: ['Q1', 'Q2', 'Q3', 'Q4'] } }
            }),

            // Nurturing leads, shown as a separate subtitle count
            prisma.lead.count({
                where: { ...leadWhere, quadrant: 'Nurturing' }
            }),

            // Calls Today: CallTracker entries created today with a valid call status
            prisma.callTracker.count({
                where: {
                    ...callTrackerWhere,
                    date: { gte: today, lt: tomorrow },
                    call_status_id: { not: null }
                }
            }),

            // Pending Follow-ups from CallTracker (next_follow_up_date = today)
            prisma.callTracker.count({
                where: {
                    ...callTrackerWhere,
                    next_follow_up_date: { gte: today, lt: tomorrow }
                }
            }),

            // Pending Follow-ups from Lead module (follow_up_datetime = today)
            prisma.lead.count({
                where: {
                    ...leadWhere,
                    follow_up_datetime: { gte: today, lt: tomorrow }
                }
            }),

            // Sales Activities - LinkedIn count
            prisma.callTracker.count({
                where: {
                    ...callTrackerWhere,
                    date: { gte: today, lt: tomorrow },
                    linkedin_sent: true
                }
            }),

            // Sales Activities - Email count
            prisma.callTracker.count({
                where: {
                    ...callTrackerWhere,
                    date: { gte: today, lt: tomorrow },
                    email_status_id: { not: null }
                }
            }),

            // Lead data for charts (role-scoped)
            prisma.lead.findMany({
                where: leadWhere,
                select: {
                    quadrant: true,
                    company_name: true,
                    company_master: { select: { name: true } },
                    sales_stage: { select: { name: true } },
                    owner: { select: { first_name: true, last_name: true } }
                }
            }),

            // All active sales stages from master (for chart initialization)
            prisma.salesStage.findMany({
                where: { is_active: true },
                select: { name: true },
                orderBy: { id: 'asc' }
            }),

            // Leads flagged for requalification (Nurturing or auto-degraded)
            prisma.lead.count({
                where: { ...leadWhere, requires_requalification: true }
            }),

            // CR12 — Existing EDC Milestones: milestones on Order Won leads still on
            // their original (never revised) EDC, that EDC is present and not yet
            // due, still have a pending balance, and aren't Stuck. Milestones whose
            // EDC has been revised are excluded — they're tracked separately.
            prisma.$queryRawUnsafe(
                `SELECT COUNT(*) AS cnt FROM lead_milestone lm
                 JOIN lead l ON lm.lead_id = l.id
                 WHERE l.quadrant = 'Order Won'
                   AND ${ownerScopeSql}
                   AND lm.revised_edc IS NULL
                   AND lm.edc >= CURDATE()
                   AND (lm.expected_amount - lm.actual_amount) > 0
                   AND lm.collection_status != 'Stuck'`
            )
        ]);

        // Combined pending follow-ups from both sources
        const pendingFollowUps = callTrackerFollowUps + leadFollowUps;

        // Sales Activities: LinkedIn + Email counted individually
        // Entry with both LinkedIn=Yes and Email sent counts as 2
        const salesActivitiesCount = linkedinCount + emailCount;

        // Initialize statsMap with fixed order to ensure all quadrants appear even with 0 counts
        const fixedOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
        const statsMap: Record<string, { quadrant: string, _count: { id: number }, companies: string[] }> = {};

        fixedOrder.forEach(q => {
            statsMap[q] = { quadrant: q, _count: { id: 0 }, companies: [] };
        });

        // Aggregate stats and company names in memory
        leadsWithCompany.forEach(lead => {
            const quad = lead.quadrant || 'N/A';
            if (!statsMap[quad]) {
                statsMap[quad] = { quadrant: quad, _count: { id: 0 }, companies: [] };
            }
            statsMap[quad]._count.id++;
            const compName = lead.company_name || lead.company_master?.name;
            if (compName) {
                statsMap[quad].companies.push(compName);
            }
        });



        // Aggregate Sales Stage Stats — initialize from master so 0-count stages still appear
        const salesStageMap: Record<string, { stage: string, _count: { id: number }, leads: { company: string; owner: string; quadrant: string; stage: string }[] }> = {};
        allSalesStages.forEach(s => {
            salesStageMap[s.name] = { stage: s.name, _count: { id: 0 }, leads: [] };
        });

        leadsWithCompany.forEach(lead => {
            const stage = (lead as any).sales_stage?.name || 'Unknown';
            if (!salesStageMap[stage]) {
                salesStageMap[stage] = { stage, _count: { id: 0 }, leads: [] };
            }
            salesStageMap[stage]._count.id++;
            const company = (lead.company_name || lead.company_master?.name || '—') as string;
            const owner = (lead as any).owner
                ? `${(lead as any).owner.first_name} ${(lead as any).owner.last_name || ''}`.trim()
                : '—';
            salesStageMap[stage].leads.push({
                company,
                owner,
                quadrant: (lead as any).quadrant || '—',
                stage,
            });
        });

        const salesStageStats = Object.values(salesStageMap);

        const quadrantStats = [
            ...fixedOrder.map(q => statsMap[q]),
            ...Object.keys(statsMap)
                .filter(k => !fixedOrder.includes(k))
                .map(k => statsMap[k])
        ];

        res.json({
            totalLeads,
            nurturingLeadsCount,
            todayCalls,
            pendingFollowUps,
            salesActivitiesCount,

            quadrantStats,
            salesStageStats,
            requiresRequalificationCount,
            existingEdcMilestonesCount: Number((existingEdcMilestonesRows as any[])[0]?.cnt || 0),
            performance: userPerformance
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

export const getLeadCategoryReport = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        const { category, startDate, endDate, salesStageId } = req.query;

        // Parse comma-separated multi-value params
        const parseIds = (val: any): number[] =>
            String(val || '').split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n));
        const parseStrings = (val: any): string[] =>
            String(val || '').split(',').map(s => s.trim()).filter(Boolean);

        const ownerIds = parseIds(req.query.ownerIds);
        const quadrants = parseStrings(req.query.quadrants);
        const productIds = parseIds(req.query.productIds);
        const company = (req.query.company as string || '').trim();

        const andConditions: any[] = [];

        // 1. Category Filter
        if (category) {
            if (category === 'Product') {
                andConditions.push({ OR: [
                    { product_or_service: 'Product' },
                    { AND: [{ product_or_service: null }, { product_id: { not: null } }] }
                ]});
            } else if (category === 'EitService') {
                andConditions.push({ OR: [
                    { product_or_service: 'EitService' },
                    { AND: [{ product_or_service: null }, { eit_service_id: { not: null } }] }
                ]});
            } else if (category === 'ImService') {
                andConditions.push({ OR: [
                    { product_or_service: 'ImService' },
                    { AND: [{ product_or_service: null }, { im_service_id: { not: null } }] }
                ]});
            } else {
                andConditions.push({ product_or_service: category as string });
            }
        }

        // 2. Date Range Filter
        if (startDate || endDate) {
            const dateCond: any = { created_at: {} };
            if (startDate) dateCond.created_at.gte = dayjs(startDate as string).startOf('day').toDate();
            if (endDate) dateCond.created_at.lte = dayjs(endDate as string).endOf('day').toDate();
            andConditions.push(dateCond);
        }

        // 3. Multi-value Owner filter (OR within)
        if (ownerIds.length > 0) {
            andConditions.push({ lead_owner_id: { in: ownerIds } });
        }

        // 4. Multi-value Quadrant filter (OR within)
        if (quadrants.length > 0) {
            andConditions.push({ quadrant: { in: quadrants } });
        }

        // 5. Multi-value Product filter (OR within)
        if (productIds.length > 0) {
            andConditions.push({ product_id: { in: productIds } });
        }

        // 6. Company text search (partial match on company_name or related master name)
        if (company) {
            andConditions.push({ OR: [
                { company_name: { contains: company } },
                { company_master: { name: { contains: company } } }
            ]});
        }

        // 7. Sales Stage filter
        if (salesStageId) {
            andConditions.push({ sales_stage_id: parseInt(salesStageId as string) });
        }

        const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

        // Fetch subordinates for edit permission check
        const subordinates = await prisma.user.findMany({
            where: { reporting_manager_id: user.id },
            select: { id: true }
        });
        const subordinateIds = new Set(subordinates.map((s: any) => s.id));

        // Fetch Leads
        const leads = await prisma.lead.findMany({
            where,
            include: {
                owner: { select: { id: true, first_name: true, last_name: true } },
                company_master: { select: { name: true } },
                sales_stage: { select: { name: true } },
                product: { select: { name: true } },
                eitService: { select: { name: true } },
                imService: { select: { name: true } }
            },
            orderBy: { id: 'desc' }
        });

        // Calculate Stats
        const stats = {
            totalLeads: leads.length,
            convertedLeads: leads.filter((l: any) => l.sales_stage?.name === 'Order Won').length,
            lostLeads: leads.filter((l: any) => l.sales_stage?.name === 'Lost').length,
            totalExpectedRevenue: leads.reduce((sum, l) => sum + (l.order_value ? Number(l.order_value) : 0), 0)
        };

        // Attach edit permission flag: own leads + subordinates' leads + CEO sees all
        const leadsWithPermission = leads.map((l: any) => ({
            ...l,
            is_editable: user.role === 'CEO' ||
                         l.lead_owner_id === user.id ||
                         subordinateIds.has(l.lead_owner_id)
        }));

        res.json({ stats, leads: leadsWithPermission });
    } catch (error) {
        console.error('Error fetching lead category report:', error);
        res.status(500).json({ message: 'Error fetching lead category report' });
    }
};

export const getMISReports = async (req: Request, res: Response) => {
    // Placeholder for complex reports
    res.json({ message: 'MIS Reports endpoint' });
};
