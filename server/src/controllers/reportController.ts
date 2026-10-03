import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { userHasPrivilege } from '../middleware/rbac';
import { getTeamIds, getSubordinateIds } from '../utils/teamScope';

dayjs.extend(utc);

const prisma = new PrismaClient();

/* ── Role scope ─────────────────────────────────────────────────────────────
   A Sales Person sees only their own records, a Sales Manager their team's
   (themselves + their entire downward reporting tree), the CEO everything. Returned as Prisma `where`
   fragments so every report applies the identical scope.

   `bdeId` narrows that scope down to a single BDE — the Dashboard's BDE filter
   (CEO/SalesManager only). A Sales Manager can only narrow to someone on their
   own team; a request for anyone else comes back `denied` (empty result)
   rather than silently widening to the manager's full team. */
export const buildRoleScope = async (
    user: any,
    bdeId?: number
): Promise<{ leadWhere: any; callTrackerWhere: any; denied?: boolean }> => {
    if (user.role === 'SalesPerson') {
        return { leadWhere: { lead_owner_id: user.id }, callTrackerWhere: { user_id: user.id } };
    }
    if (user.role === 'SalesManager') {
        const teamIds = await getTeamIds(user);
        if (bdeId) {
            if (!teamIds.includes(bdeId)) {
                return { leadWhere: { lead_owner_id: -1 }, callTrackerWhere: { user_id: -1 }, denied: true };
            }
            return { leadWhere: { lead_owner_id: bdeId }, callTrackerWhere: { user_id: bdeId } };
        }
        return { leadWhere: { lead_owner_id: { in: teamIds } }, callTrackerWhere: { user_id: { in: teamIds } } };
    }
    // CEO (and any other unscoped role) — bdeId narrows to that one BDE.
    if (bdeId) {
        return { leadWhere: { lead_owner_id: bdeId }, callTrackerWhere: { user_id: bdeId } };
    }
    return { leadWhere: {}, callTrackerWhere: {} };
};

// Dashboard filter params (bde_id, company_id, product_id) — bde_id is only
// honored for CEO/SalesManager (buildRoleScope already ignores it for
// SalesPerson, who only ever sees their own records); company_id/product_id
// apply for every role. Rejects a non-numeric value up front rather than
// letting NaN flow into the raw-SQL mirror below.
const parseDashboardBdeId = (raw: unknown): number | undefined => {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const n = parseInt(raw as string, 10);
    return Number.isNaN(n) ? undefined : n;
};

// Dashboard Company/Product filters — narrow every section (Categories 1-5)
// down to one BU Company (product.company_id, the same field the Cash Flow
// Report's Company filter uses) and/or one Product, on top of whatever
// role/BDE scope already applies. Reuses the BDE parser — same "reject
// non-numeric" behaviour.
const parseDashboardFilterId = parseDashboardBdeId;

// Merges the Company/Product filters into the role-scoped where fragments
// buildRoleScope returned. Neither Lead nor CallTracker carry a populated
// company_id of their own (Lead.company_id is an unused legacy field — every
// row is null) — Company is reached via each model's product relation
// instead, same as the raw SQL in cashflowReportController.ts.
const applyDashboardFilters = (
    leadWhere: any,
    callTrackerWhere: any,
    companyId?: number,
    productId?: number
) => ({
    leadWhere: {
        ...leadWhere,
        ...(companyId !== undefined ? { product: { company_id: companyId } } : {}),
        ...(productId !== undefined ? { product_id: productId } : {}),
    },
    callTrackerWhere: {
        ...callTrackerWhere,
        ...(companyId !== undefined ? { product: { company_id: companyId } } : {}),
        ...(productId !== undefined ? { product_id: productId } : {}),
    },
});

// Closed sales stages — a lead sitting on either is out of play and is excluded
// from every "activity" bucket below.
const CLOSED_SALES_STAGES = ['Order Won', 'Order Lost'];

// The Lead Report reachable from the dashboard is the Product category report,
// so both it and the dashboard cards that link into it apply this same
// condition — a card's count and the report it opens can never disagree.
const PRODUCT_CATEGORY_CONDITION = {
    OR: [
        { product_or_service: 'Product' },
        { AND: [{ product_or_service: null }, { product_id: { not: null } }] }
    ]
};

/* ── Dashboard chart helpers (Phase 1 revamp) ───────────────────────────── */

// Quadrants shown on the product-wise dashboard charts.
// Order Won / Order Lost are closed states and are excluded.
const DASHBOARD_QUADRANTS = ['Q1', 'Q2', 'Q3', 'Q4', 'Nurturing'] as const;

// Cap on the individual leads listed in the Quadrant Split by Opportunity
// Value tooltip — biggest value first, so a large range doesn't balloon the
// tooltip payload or the on-screen list.
const OPPORTUNITY_QUADRANT_LEADS_PREVIEW_LIMIT = 25;

// Leads with neither a product master nor a service type roll up here.
const OTHER_PRODUCTS_LABEL = 'Other Products';
const EIT_SERVICES_LABEL = 'EIT Services';
const IM_SERVICES_LABEL = 'IM Services';

// Fixed display order for the product-wise dashboard charts. Anything not
// listed keeps its pipeline-size order after these, with "Other Products" last.
const PRODUCT_DISPLAY_ORDER = [
    'TimeCheck', 'Aura', 'Vendora', 'FMS', 'IWay', 'Tsense',
    EIT_SERVICES_LABEL, IM_SERVICES_LABEL,
];

// Master names vary in case/spacing ("Time Check", "T-Sense"), so compare loosely
const normalizeProduct = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const PRODUCT_ORDER_INDEX: Record<string, number> = PRODUCT_DISPLAY_ORDER.reduce((acc, name, i) => {
    acc[normalizeProduct(name)] = i;
    return acc;
}, {} as Record<string, number>);

const productRank = (name: string) => {
    if (name === OTHER_PRODUCTS_LABEL) return Number.MAX_SAFE_INTEGER;
    const rank = PRODUCT_ORDER_INDEX[normalizeProduct(name)];
    return rank === undefined ? PRODUCT_DISPLAY_ORDER.length : rank;
};

// Service-only leads carry no product master, so they get their own buckets
const productLabel = (lead: any): string => {
    if (lead.product_or_service === 'EitService') return EIT_SERVICES_LABEL;
    if (lead.product_or_service === 'ImService') return IM_SERVICES_LABEL;
    return lead.product?.name || OTHER_PRODUCTS_LABEL;
};

// Opportunity value buckets, evaluated top-down (first match wins).
const OPPORTUNITY_RANGES: { label: string; min: number; max: number | null }[] = [
    { label: 'Above ₹10 Lakhs', min: 1000000, max: null },
    { label: '₹8 Lakhs – ₹10 Lakhs', min: 800000, max: 1000000 },
    { label: '₹5 Lakhs – ₹8 Lakhs', min: 500000, max: 800000 },
    { label: '₹2.5 Lakhs – ₹5 Lakhs', min: 250000, max: 500000 },
    { label: 'Below ₹2.5 Lakhs', min: 0, max: 250000 },
];

const rangeOf = (amount: number) =>
    OPPORTUNITY_RANGES.find(r => amount >= r.min && (r.max === null || amount < r.max))?.label ?? null;

// Opportunity value is stored as free text on the lead; Order Won leads carry
// the frozen order_value instead. Returns 0 when nothing usable is present.
const leadOpportunityValue = (lead: any): number => {
    const raw = lead.opportunities_values ?? lead.order_value;
    if (raw === null || raw === undefined || raw === '') return 0;
    const amount = Number(String(raw).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

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

        // Build lead/call tracker scope based on role. CEO leadWhere and
        // callTrackerWhere stay empty ({}) to see all, unless narrowed by the
        // Dashboard's BDE filter (CEO/SalesManager only — see buildRoleScope).
        const bdeId = parseDashboardBdeId(req.query.bde_id);
        const companyId = parseDashboardFilterId(req.query.company_id);
        const productId = parseDashboardFilterId(req.query.product_id);
        const { leadWhere: baseLeadWhere, callTrackerWhere: baseCallTrackerWhere, denied } = await buildRoleScope(user, bdeId);
        if (denied) return res.status(403).json({ message: 'Not authorized to view this BDE\'s dashboard' });
        const { leadWhere, callTrackerWhere } = applyDashboardFilters(baseLeadWhere, baseCallTrackerWhere, companyId, productId);

        // Raw-SQL mirror of the leadWhere role scoping above, for the
        // Existing EDC Milestones count query below (CR12).
        let ownerScopeSql = '1=1';
        if (typeof leadWhere.lead_owner_id === 'number') {
            ownerScopeSql = `l.lead_owner_id = ${leadWhere.lead_owner_id}`;
        } else if (leadWhere.lead_owner_id?.in) {
            const teamIds = leadWhere.lead_owner_id.in as number[];
            ownerScopeSql = teamIds.length ? `l.lead_owner_id IN (${teamIds.join(',')})` : '1=0';
        }
        if (typeof leadWhere.product?.company_id === 'number') {
            ownerScopeSql += ` AND l.product_id IN (SELECT id FROM product WHERE company_id = ${leadWhere.product.company_id})`;
        }
        if (typeof leadWhere.product_id === 'number') {
            ownerScopeSql += ` AND l.product_id = ${leadWhere.product_id}`;
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
                    owner: { select: { first_name: true, last_name: true } },
                    product: { select: { name: true } },
                    product_or_service: true,
                    opportunities_values: true,
                    order_value: true,
                    requires_requalification: true
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

        // Requalification leads (Nurturing or auto-degraded), broken down the same
        // way as the pipeline — one bucket per quadrant, so the dashboard can show
        // it as a quadrant-wise breakdown instead of a single number.
        const requalMap: Record<string, { quadrant: string, _count: { id: number }, companies: string[] }> = {};
        fixedOrder.forEach(q => {
            requalMap[q] = { quadrant: q, _count: { id: 0 }, companies: [] };
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

            if ((lead as any).requires_requalification) {
                if (!requalMap[quad]) {
                    requalMap[quad] = { quadrant: quad, _count: { id: 0 }, companies: [] };
                }
                requalMap[quad]._count.id++;
                if (compName) {
                    requalMap[quad].companies.push(compName);
                }
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

        const requalificationQuadrantStats = [
            ...fixedOrder.map(q => requalMap[q]),
            ...Object.keys(requalMap)
                .filter(k => !fixedOrder.includes(k))
                .map(k => requalMap[k])
        ];

        /* ── Category 4: Product-wise quadrant counts ──
           One entry per product (leads without a product master roll into
           "Other Products"), with the per-quadrant split used by the tooltip. */
        const productMap: Record<string, any> = {};
        const ensureProduct = (name: string) => {
            if (!productMap[name]) {
                productMap[name] = {
                    product: name,
                    Q1: 0, Q2: 0, Q3: 0, Q4: 0, Nurturing: 0,
                    total: 0,
                    totalOpportunityValue: 0,
                    ranges: OPPORTUNITY_RANGES.reduce((acc, r) => {
                        acc[r.label] = { count: 0, value: 0 };
                        return acc;
                    }, {} as Record<string, { count: number; value: number }>),
                };
            }
            return productMap[name];
        };

        /* ── Category 5: opportunity value range → quadrant counts ──
           Inverse of Category 4: each range carries its quadrant split, the
           per-product breakdown, and the individual leads (name, quadrant,
           opportunity value) surfaced in the tooltip. */
        const rangeMap: Record<string, any> = OPPORTUNITY_RANGES.reduce((acc, r) => {
            acc[r.label] = {
                range: r.label,
                Q1: 0, Q2: 0, Q3: 0, Q4: 0, Nurturing: 0,
                total: 0,
                totalOpportunityValue: 0,
                products: {} as Record<string, { product: string; count: number; value: number }>,
                leads: [] as { company: string; product: string; quadrant: string; amount: number }[],
            };
            return acc;
        }, {} as Record<string, any>);

        leadsWithCompany.forEach((lead: any) => {
            const quadrant = lead.quadrant || '';
            if (!(DASHBOARD_QUADRANTS as readonly string[]).includes(quadrant)) return;

            const product = productLabel(lead);
            const entry = ensureProduct(product);
            entry[quadrant]++;
            entry.total++;

            /* Leads with no captured opportunity value are not bucketed, so a
               blank value is never mistaken for a "Below ₹2.5 Lakhs" deal. */
            const amount = leadOpportunityValue(lead);
            if (amount <= 0) return;
            const range = rangeOf(amount);
            if (!range) return;
            entry.ranges[range].count++;
            entry.ranges[range].value += amount;
            entry.totalOpportunityValue += amount;

            const bucket = rangeMap[range];
            bucket[quadrant]++;
            bucket.total++;
            bucket.totalOpportunityValue += amount;
            if (!bucket.products[product]) {
                bucket.products[product] = { product, count: 0, value: 0 };
            }
            bucket.products[product].count++;
            bucket.products[product].value += amount;
            bucket.leads.push({
                company: lead.company_name || lead.company_master?.name || '—',
                product,
                quadrant,
                amount,
            });
        });

        // Fixed product order; unlisted products fall back to largest-pipeline-first
        const byDisplayOrder = (a: any, b: any) =>
            productRank(a.product) - productRank(b.product) || b.total - a.total;

        const productQuadrantStats = Object.values(productMap)
            .sort(byDisplayOrder)
            .map((p: any) => ({
                product: p.product,
                Q1: p.Q1, Q2: p.Q2, Q3: p.Q3, Q4: p.Q4,
                Nurturing: p.Nurturing,
                total: p.total,
            }));

        const productOpportunityStats = Object.values(productMap)
            .map((p: any) => ({
                product: p.product,
                totalOpportunityValue: p.totalOpportunityValue,
                ranges: OPPORTUNITY_RANGES.map(r => ({
                    label: r.label,
                    count: p.ranges[r.label].count,
                    value: p.ranges[r.label].value,
                })),
            }))
            .filter((p: any) => p.ranges.some((r: any) => r.count > 0))
            .sort((a: any, b: any) =>
                productRank(a.product) - productRank(b.product) ||
                b.totalOpportunityValue - a.totalOpportunityValue);

        // Ranges keep their declared (highest-value-first) order; empty ones drop out
        const opportunityQuadrantStats = OPPORTUNITY_RANGES
            .map(r => rangeMap[r.label])
            .filter((r: any) => r.total > 0)
            .map((r: any) => ({
                range: r.range,
                Q1: r.Q1, Q2: r.Q2, Q3: r.Q3, Q4: r.Q4,
                Nurturing: r.Nurturing,
                total: r.total,
                totalOpportunityValue: r.totalOpportunityValue,
                products: Object.values(r.products)
                    .sort((a: any, b: any) =>
                        productRank(a.product) - productRank(b.product) || b.count - a.count),
                leadCount: r.leads.length,
                leads: [...r.leads]
                    .sort((a: any, b: any) => b.amount - a.amount)
                    .slice(0, OPPORTUNITY_QUADRANT_LEADS_PREVIEW_LIMIT),
            }));

        res.json({
            totalLeads,
            nurturingLeadsCount,
            todayCalls,
            pendingFollowUps,
            salesActivitiesCount,

            quadrantStats,
            requalificationQuadrantStats,
            salesStageStats,
            productQuadrantStats,
            productOpportunityStats,
            opportunityQuadrantStats,
            opportunityRanges: OPPORTUNITY_RANGES.map(r => r.label),
            requiresRequalificationCount,
            existingEdcMilestonesCount: Number((existingEdcMilestonesRows as any[])[0]?.cnt || 0),
            performance: userPerformance
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// Dashboard BDE filter's dropdown — lists only BDEs (Sales Person / Sales
// Manager) with at least one lead or call tracker entry matching the current
// Company/Product selection (and the viewer's own role scope), instead of
// every BDE the role scope would otherwise allow. Mirrors
// getCashflowReportBdes's "only BDEs with matching records" narrowing.
export const getDashboardBdes = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const companyId = parseDashboardFilterId(req.query.company_id);
        const productId = parseDashboardFilterId(req.query.product_id);

        // No bdeId here — this endpoint produces the BDE list itself, scoped
        // only by role (CEO -> everyone, SalesManager -> self + team) plus
        // whatever Company/Product is selected.
        const { leadWhere: baseLeadWhere, callTrackerWhere: baseCallTrackerWhere } = await buildRoleScope(user);
        const { leadWhere, callTrackerWhere } = applyDashboardFilters(baseLeadWhere, baseCallTrackerWhere, companyId, productId);

        const [leadOwners, callUsers] = await Promise.all([
            prisma.lead.findMany({ where: leadWhere, select: { lead_owner_id: true }, distinct: ['lead_owner_id'] }),
            prisma.callTracker.findMany({ where: callTrackerWhere, select: { user_id: true }, distinct: ['user_id'] }),
        ]);
        const ids = new Set<number>();
        leadOwners.forEach((l: any) => { if (l.lead_owner_id) ids.add(l.lead_owner_id); });
        callUsers.forEach((c: any) => ids.add(c.user_id));

        const bdes = await prisma.user.findMany({
            where: { id: { in: [...ids] }, role: { in: ['SalesPerson', 'SalesManager'] } },
            select: { id: true, first_name: true, last_name: true },
            orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        });
        res.json(bdes);
    } catch (error: any) {
        console.error('[Reports] getDashboardBdes error:', error);
        res.status(500).json({ message: 'Error fetching BDE filter options' });
    }
};

// Product filter options for the Dashboard. With no bde_id this mirrors
// /masters/product (active products, optionally narrowed to one Company).
// With a bde_id it narrows to that BDE's *mapped* products — the ones they
// hold a UserProductTarget row for — so the Product dropdown lines up with
// the BDE picked just above it. bde_id is RBAC-validated the same way the
// rest of the dashboard is (SalesManager only for their own team).
export const getDashboardProducts = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const companyId = parseDashboardFilterId(req.query.company_id);
        const bdeId = parseDashboardFilterId(req.query.bde_id);

        const where: any = { is_active: true };
        if (companyId !== undefined) where.company_id = companyId;

        if (bdeId !== undefined) {
            const { denied } = await buildRoleScope(user, bdeId);
            if (denied) return res.status(403).json({ message: 'Not authorized to view this BDE\'s products' });

            const targets = await prisma.userProductTarget.findMany({
                where: { user_id: bdeId },
                select: { product_id: true },
            });
            where.id = { in: targets.map((t: any) => t.product_id) };
        }

        const products = await prisma.product.findMany({
            where,
            select: { id: true, name: true, company_id: true, is_active: true },
            orderBy: { name: 'asc' },
        });
        res.json(products);
    } catch (error: any) {
        console.error('[Reports] getDashboardProducts error:', error);
        res.status(500).json({ message: 'Error fetching product filter options' });
    }
};

export const getLeadCategoryReport = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        const {
            category, startDate, endDate, salesStageId,
            engagementFrom, engagementTo, engagementNotNull, excludeClosed
        } = req.query;

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

        // 0. No role scope here — the Products Leads Report is view-all for anyone
        // holding the Reports/can_view privilege (route is gated by
        // checkPrivilege('Reports', 'can_view')). Editing stays restricted: the
        // per-lead `is_editable` flag below still limits changes to a user's own
        // leads and their direct reports' leads (CEO unrestricted).

        // 1. Category Filter
        if (category) {
            if (category === 'Product') {
                andConditions.push(PRODUCT_CATEGORY_CONDITION);
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

        // 8. Sales Engagement Date (Lead.follow_up_datetime) — the window the
        // dashboard "Sales Activities" cards count by. `engagementNotNull` covers
        // the Date Exit Activities card, which has no window at all.
        if (engagementFrom || engagementTo) {
            const engagementCond: any = {};
            if (engagementFrom) engagementCond.gte = dayjs(engagementFrom as string).startOf('day').toDate();
            if (engagementTo) engagementCond.lte = dayjs(engagementTo as string).endOf('day').toDate();
            andConditions.push({ follow_up_datetime: engagementCond });
        } else if (engagementNotNull === '1') {
            andConditions.push({ follow_up_datetime: { not: null } });
        }

        // 9. Exclude closed leads. A lead with no sales stage yet is still open,
        // so it stays in.
        if (excludeClosed === '1') {
            andConditions.push({ OR: [
                { sales_stage_id: null },
                { sales_stage: { name: { notIn: CLOSED_SALES_STAGES } } }
            ]});
        }

        const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

        // Fetch subordinates (full downward reporting tree) for edit permission check
        const subordinateIds = new Set(await getSubordinateIds(user.id));

        // Fetch Leads
        const leads = await prisma.lead.findMany({
            where,
            include: {
                owner: { select: { id: true, first_name: true, last_name: true } },
                company_master: { select: { name: true } },
                sales_stage: { select: { name: true } },
                product: { select: { name: true } },
                eitService: { select: { name: true } },
                imService: { select: { name: true } },
                // Sales Engagement notes live on the newest follow-up log
                follow_up_logs: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { notes: true }
                }
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
            follow_up_notes: l.follow_up_logs?.[0]?.notes || '-',
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

/* ── Dashboard · Category 2 — Sales Activities ──────────────────────────────
   Eight consolidated counts for the dashboard cards
   (md files/Dashboard/salesactivities.md).

   Two of them read the Call Tracker — follow-up calls that are still waiting to
   be moved into the pipeline — and the other six read the Lead module's Sales
   Engagement Date. No filters are involved: each card describes every record the
   signed-in user is allowed to see, and clicking it opens the list it was
   counted from with the same conditions applied.

   The lead buckets reuse PRODUCT_CATEGORY_CONDITION and CLOSED_SALES_STAGES —
   the very conditions getLeadCategoryReport applies — so a card's count and the
   Lead Report it opens always agree. */

// Each card lists a handful of records in its tooltip; the count is the full
// bucket size, not the size of this preview.
const SALES_ACTIVITY_PREVIEW_LIMIT = 8;

// Cap on how many of a lead's own Activity Log entries are sent per lead row
// in the "Lead Sales Activities" card hover detail — a long-lived lead can
// carry dozens of log entries, and the card only needs the recent history.
const SALES_ACTIVITY_LOG_HISTORY_LIMIT = 10;

const fullName = (first?: string | null, last?: string | null) =>
    [first, last].filter(Boolean).join(' ').trim() || '—';

// Follow-up notes are stored as a literal '-' when the user left them blank.
const noteOrNull = (note?: string | null) => {
    const trimmed = (note || '').trim();
    return trimmed && trimmed !== '-' ? trimmed : null;
};

const inWindow = (date: any, start: Date, endExclusive: Date) => {
    const t = new Date(date).getTime();
    return t >= start.getTime() && t < endExclusive.getTime();
};

const salesActivityBucket = (items: any[]) => ({
    count: items.length,
    items: items.slice(0, SALES_ACTIVITY_PREVIEW_LIMIT)
});

// A Call Tracker record has no project name — that only exists once the call
// becomes a lead, which by definition a still-pending follow-up has not.
const toCallRow = (c: any) => ({
    id: c.id,
    company: c.company_name || '—',
    project_name: null,
    contact_person: c.contact_person_name || '—',
    product: c.product?.name || '—',
    lead_owner: fullName(c.user?.first_name, c.user?.last_name),
    engagement_date: c.next_follow_up_date,
    engagement_note: noteOrNull(c.remarks),
    follow_up_note: noteOrNull(c.follow_up_note),
    follow_up_status: c.follow_up_status || 'Pending',
    quadrant: c.moved_to_quad || null,
    lead_status: c.call_status?.name || '—'
});

const emptySalesActivitiesResponse = () => {
    const empty = { count: 0, items: [] as any[] };
    return {
        todayCalls: empty, lastWeekCalls: empty, thisWeekCalls: empty,
        nextWeekCalls: empty, overdueCalls: empty,
        todayLeads: empty, thisWeekLeads: empty, nextWeekLeads: empty,
        thisMonthLeads: empty, nextMonthLeads: empty, dateExitLeads: empty
    };
};

export const getSalesActivities = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const bdeId = parseDashboardBdeId(req.query.bde_id);
        const companyId = parseDashboardFilterId(req.query.company_id);
        const productId = parseDashboardFilterId(req.query.product_id);
        const { leadWhere: baseLeadWhere, callTrackerWhere: baseCallTrackerWhere, denied } = await buildRoleScope(user, bdeId);
        if (denied) return res.json(emptySalesActivitiesResponse());
        const { leadWhere, callTrackerWhere } = applyDashboardFilters(baseLeadWhere, baseCallTrackerWhere, companyId, productId);

        const now = dayjs();
        const todayStart = now.startOf('day').toDate();
        const tomorrowStart = now.add(1, 'day').startOf('day').toDate();
        const lastWeekStart = now.subtract(1, 'week').startOf('week').toDate();
        const weekStart = now.startOf('week').toDate();
        const nextWeekStart = now.add(1, 'week').startOf('week').toDate();
        const weekAfterNextStart = now.add(2, 'week').startOf('week').toDate();
        const monthStart = now.startOf('month').toDate();
        const nextMonthStart = now.add(1, 'month').startOf('month').toDate();
        const monthAfterNextStart = now.add(2, 'month').startOf('month').toDate();

        // Lead.follow_up_datetime is stored as a literal wall-clock value tagged
        // "Z" (LeadForm.tsx: "the picked date/time is a plain wall-clock value
        // with no timezone concept... it's tagged Z so `new Date(...)` reads it
        // as that literal value instead of reinterpreting it") — it is NOT a
        // true UTC instant. Bucketing it against this server's local-timezone
        // day/week/month boundaries (the *Start values above, correct for
        // CallTracker.next_follow_up_date, a genuine UTC instant) silently drops
        // any evening engagement past the server's local UTC offset from
        // "Today" into "Tomorrow" — e.g. an engagement literally picked as
        // "8/20, 9:00 PM" is stored as 2026-08-20T21:00:00.000Z, which is after
        // this IST server's local day boundary (18:30 UTC) and so fails
        // `< tomorrowStart` even though the BDE picked today. The Lead-based
        // cards below (3-8) must instead bucket by the literal UTC-calendar
        // date/week/month, matching how the value was written.
        const nowUtc = dayjs.utc();
        const todayStartUtc = nowUtc.startOf('day').toDate();
        const tomorrowStartUtc = nowUtc.add(1, 'day').startOf('day').toDate();
        const lastWeekStartUtc = nowUtc.subtract(1, 'week').startOf('week').toDate();
        const weekStartUtc = nowUtc.startOf('week').toDate();
        const nextWeekStartUtc = nowUtc.add(1, 'week').startOf('week').toDate();
        const weekAfterNextStartUtc = nowUtc.add(2, 'week').startOf('week').toDate();
        const monthStartUtc = nowUtc.startOf('month').toDate();
        const nextMonthStartUtc = nowUtc.add(1, 'month').startOf('month').toDate();
        const monthAfterNextStartUtc = nowUtc.add(2, 'month').startOf('month').toDate();

        const response: any = emptySalesActivitiesResponse();

        /* ── Cards 1-5 — Call Tracker follow-ups still outside the pipeline ──
           "Pending" = pipeline_action IS NULL (not yet moved to pipeline). Last
           week / today / this week / next week come from one windowed fetch;
           overdue has no lower bound, so it is fetched separately — mirrors
           dateExitLeads and the Cash Flow Activities overdue cards. A follow-up
           already marked Closed isn't outstanding anymore, so it's excluded
           from every bucket regardless of its date window. */
        if (await userHasPrivilege(user, 'Calls', 'can_view')) {
            const callSelect = {
                id: true,
                company_name: true,
                contact_person_name: true,
                next_follow_up_date: true,
                remarks: true,
                follow_up_note: true,
                follow_up_status: true,
                moved_to_quad: true,
                product: { select: { name: true } },
                call_status: { select: { name: true } },
                user: { select: { first_name: true, last_name: true } }
            };

            const [windowedCalls, overdueCallsRaw] = await Promise.all([
                prisma.callTracker.findMany({
                    where: {
                        AND: [
                            callTrackerWhere,
                            { pipeline_action: null },
                            { follow_up_status: { not: 'Closed' } },
                            { next_follow_up_date: { gte: lastWeekStart, lt: weekAfterNextStart } }
                        ]
                    },
                    select: callSelect,
                    orderBy: { next_follow_up_date: 'asc' }
                }),
                prisma.callTracker.findMany({
                    where: {
                        AND: [
                            callTrackerWhere,
                            { pipeline_action: null },
                            { follow_up_status: { not: 'Closed' } },
                            { next_follow_up_date: { lt: todayStart } }
                        ]
                    },
                    select: callSelect,
                    orderBy: { next_follow_up_date: 'asc' }
                })
            ]);

            const callRows = windowedCalls.map(toCallRow);

            response.lastWeekCalls = salesActivityBucket(
                callRows.filter(c => inWindow(c.engagement_date, lastWeekStart, weekStart))
            );
            response.todayCalls = salesActivityBucket(
                callRows.filter(c => inWindow(c.engagement_date, todayStart, tomorrowStart))
            );
            response.thisWeekCalls = salesActivityBucket(
                callRows.filter(c => inWindow(c.engagement_date, weekStart, nextWeekStart))
            );
            response.nextWeekCalls = salesActivityBucket(
                callRows.filter(c => inWindow(c.engagement_date, nextWeekStart, weekAfterNextStart))
            );
            response.overdueCalls = salesActivityBucket(overdueCallsRaw.map(toCallRow));
        }

        /* ── Cards 3-8 — Lead Sales Engagement Dates ── */
        const leads = await prisma.lead.findMany({
            where: {
                AND: [
                    leadWhere,
                    PRODUCT_CATEGORY_CONDITION,
                    { follow_up_datetime: { not: null } }
                ]
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                company_name: true,
                project_name: true,
                quadrant: true,
                follow_up_datetime: true,
                // The engagement note lives on the newest follow-up log, not the lead.
                // Capped preview of the full Activity Log history (date, activity,
                // notes, status) for the dashboard card's hover detail.
                follow_up_logs: {
                    orderBy: { created_at: 'desc' as const },
                    take: SALES_ACTIVITY_LOG_HISTORY_LIMIT,
                    select: { date: true, notes: true, status: true, activity: { select: { name: true } } }
                },
                company_master: { select: { name: true } },
                product: { select: { name: true } },
                sales_stage: { select: { name: true } },
                owner: { select: { first_name: true, last_name: true } }
            },
            orderBy: { follow_up_datetime: 'asc' }
        });

        const leadRows = leads.map((l: any) => ({
            id: l.id,
            company: l.company_name || l.company_master?.name || '—',
            project_name: l.project_name || null,
            contact_person: fullName(l.first_name, l.last_name),
            product: l.product?.name || '—',
            lead_owner: fullName(l.owner?.first_name, l.owner?.last_name),
            engagement_date: l.follow_up_datetime,
            engagement_note: noteOrNull(l.follow_up_logs?.[0]?.notes),
            quadrant: l.quadrant || null,
            sales_stage: l.sales_stage?.name || '—',
            is_closed: CLOSED_SALES_STAGES.includes(l.sales_stage?.name),
            // Full Activity Log history (most recent first) — narrowed per bucket
            // below so each card's hover only shows the entries that actually fall
            // in that card's own window (e.g. "This Week" hides an Aug 7 entry and
            // keeps an Aug 12 one).
            activity_logs: (l.follow_up_logs || []).map((log: any) => ({
                date: log.date,
                activity: log.activity?.name || null,
                notes: noteOrNull(log.notes),
                status: log.status || 'Pending',
            })),
        }));

        // Cards 3-8 all drop closed (Order Won / Order Lost) leads — an activity
        // on a lead that's already resolved isn't something left to chase.
        const openLeads = leadRows.filter(l => !l.is_closed);
        // Windowed cards (Today/This Week/etc.) also narrow each lead's own
        // activity_logs to just the entries that fall in that same window — a
        // lead with one log this week and another next week should only show
        // the matching one under each card's hover, not its whole history.
        const between = (start: Date, endExclusive: Date) =>
            openLeads
                .filter(l => inWindow(l.engagement_date, start, endExclusive))
                .map(l => ({
                    ...l,
                    activity_logs: l.activity_logs.filter((log: any) => log.date && inWindow(log.date, start, endExclusive)),
                }));

        response.todayLeads = salesActivityBucket(between(todayStartUtc, tomorrowStartUtc));
        response.thisWeekLeads = salesActivityBucket(between(weekStartUtc, nextWeekStartUtc));
        response.nextWeekLeads = salesActivityBucket(between(nextWeekStartUtc, weekAfterNextStartUtc));
        response.thisMonthLeads = salesActivityBucket(between(monthStartUtc, nextMonthStartUtc));
        response.nextMonthLeads = salesActivityBucket(between(nextMonthStartUtc, monthAfterNextStartUtc));

        // Over Due Activities: open leads whose engagement date has already
        // passed AND whose latest log isn't already Completed. Previously this
        // counted every open lead with any engagement date ever set — including
        // ones scheduled in the future, and ones already Completed — which made
        // it disagree with anything actually computing "overdue" from the same
        // leads (e.g. the Daily Report's Overdue column). Fixed to require both:
        // an engagement date before today, and the most recent log (logs are
        // fetched newest-first) not already Completed.
        response.dateExitLeads = salesActivityBucket(
            openLeads
                .filter(l => l.engagement_date && new Date(l.engagement_date).getTime() < todayStartUtc.getTime())
                .filter(l => (l.activity_logs[0]?.status || 'Pending') !== 'Completed')
                .map(l => ({
                    ...l,
                    activity_logs: l.activity_logs.filter((log: any) => log.status !== 'Completed'),
                }))
        );

        res.json(response);
    } catch (error: any) {
        console.error('[Reports] getSalesActivities error:', error);
        res.status(500).json({ message: 'Error fetching sales activities' });
    }
};

export const getMISReports = async (req: Request, res: Response) => {
    // Placeholder for complex reports
    res.json({ message: 'MIS Reports endpoint' });
};
