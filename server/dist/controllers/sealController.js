"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeeklyReport = exports.createWeeklyReport = exports.getWeeklyReportLeads = exports.getLatestWeeklyReport = exports.getWeeklyReports = exports.getBdes = exports.getSealSummary = exports.getSealData = void 0;
const prisma_1 = require("../lib/prisma");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const isoWeek_1 = __importDefault(require("dayjs/plugin/isoWeek"));
const teamScope_1 = require("../utils/teamScope");
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(isoWeek_1.default);
/**
 * SEAL global "Company" filter (product.company_id — the BU company, same concept
 * as the main Dashboard's Company filter). Given a raw query value, returns the
 * ids of that company's products, or null when no valid company was supplied.
 * WeeklyReport / UserProductTarget only carry product_id (no product relation on
 * WeeklyReport), so callers intersect this list with product_id in their where.
 */
const resolveCompanyProductIds = async (raw) => {
    if (raw === undefined || raw === null || raw === '' || raw === 'null' || raw === 'undefined')
        return null;
    const cid = parseInt(raw, 10);
    if (Number.isNaN(cid))
        return null;
    const products = await prisma_1.prisma.product.findMany({ where: { company_id: cid }, select: { id: true } });
    return products.map(p => p.id);
};
/**
 * GET /api/seal?product_id=X&fiscal_year=2025&user_id=Y
 * Returns full SEAL dashboard data for a product in a fiscal year (Apr→Mar)
 */
const getSealData = async (req, res) => {
    try {
        const { product_id, fiscal_year, user_id } = req.query;
        const authUser = req.user;
        const isProductMode = !!(product_id && product_id !== 'null' && product_id !== 'undefined' && product_id !== '');
        if (!isProductMode) {
            return res.status(400).json({ message: 'product_id is required' });
        }
        const pid = parseInt(product_id);
        // SEAL global Company filter — guard: the selected product must belong to
        // the selected BU company (stale cross-company selection returns nothing).
        const companyProductIds = await resolveCompanyProductIds(req.query.company_id);
        if (companyProductIds !== null && !companyProductIds.includes(pid)) {
            return res.status(400).json({ message: 'Selected product does not belong to the selected company' });
        }
        // Sanitize user_id to handle stringified nulls
        const validUserId = (user_id && user_id !== 'null' && user_id !== 'undefined' && user_id !== '') ? user_id : null;
        // Determine fiscal year start (default: current fiscal year)
        let fyStart = parseInt(fiscal_year) || (0, dayjs_1.default)().year();
        // If current month is Jan-Mar, fiscal year started previous year
        if (!fiscal_year) {
            const currentMonth = (0, dayjs_1.default)().month() + 1;
            if (currentMonth < 4)
                fyStart = (0, dayjs_1.default)().year() - 1;
        }
        // RBAC & Target Aggregation Setup
        let targetUserId = validUserId ? parseInt(validUserId) : null;
        let isAggregated = targetUserId === null;
        // Security / Scope Definition
        let userScopeFilter = { status: 'ACTIVE' };
        if (authUser.role === 'SalesPerson') {
            targetUserId = authUser.id;
            isAggregated = false; // SalesPerson always views themselves
            userScopeFilter = { id: authUser.id, status: 'ACTIVE' };
        }
        else if (authUser.role === 'SalesManager') {
            if (targetUserId) {
                // Ensure target is self or subordinate
                if (targetUserId !== authUser.id) {
                    if (!(await (0, teamScope_1.isInTeam)(authUser.id, targetUserId))) {
                        return res.status(403).json({ message: 'Access denied: You can only view your own or your team\'s data' });
                    }
                }
            }
            else {
                // Aggregate view for Manager MUST be limited to self + full downward tree
                userScopeFilter = {
                    id: { in: await (0, teamScope_1.getTeamIds)(authUser) },
                    status: 'ACTIVE'
                };
            }
        }
        // Fiscal year months: Apr fyStart → Mar fyStart+1
        const fiscalMonths = Array.from({ length: 12 }, (_, i) => {
            const d = dayjs_1.default.utc(`${fyStart}-04-01`).add(i, 'month');
            return {
                label: d.format('MMM-YY'),
                year: d.year(),
                month: d.month() + 1,
                start: d.startOf('month').toDate(),
                end: d.endOf('month').toDate()
            };
        });
        const fiscalStart = fiscalMonths[0].start;
        const fiscalEnd = fiscalMonths[11].end;
        // Fetch product info
        const product = await prisma_1.prisma.product.findUnique({ where: { id: pid }, select: { id: true, name: true } });
        // Fetch target user info (or set to Aggregate)
        const targetUser = isAggregated
            ? { first_name: 'All', last_name: 'Mapped BDEs', role: 'Group' }
            : await prisma_1.prisma.user.findUnique({
                where: { id: targetUserId },
                select: { first_name: true, last_name: true, role: true }
            });
        // Fetch BDE targets
        const activeTargetOR = [
            { sales_target: { gt: 0 } },
            { device_target: { gt: 0 } },
            { leads_target: { gt: 0 } },
            { calls_target: { gt: 0 } }
        ];
        let monthlySalesTarget = 0;
        let monthlyLicenseTarget = 0;
        let monthlyPartnerTarget = 0;
        let userIds = [];
        const targetQuery = isAggregated
            ? { product_id: pid, user: userScopeFilter, OR: activeTargetOR }
            : { user_id: targetUserId, product_id: pid };
        const recs = await prisma_1.prisma.userProductTarget.findMany({ where: targetQuery });
        const allRecs = recs;
        if (isAggregated) {
            userIds = [...new Set(allRecs.map((t) => t.user_id))];
        }
        else {
            userIds = [targetUserId];
        }
        monthlySalesTarget = allRecs.reduce((s, t) => s + (t.sales_target || 0), 0);
        monthlyLicenseTarget = allRecs.reduce((s, t) => s + (t.device_target || 0), 0);
        monthlyPartnerTarget = allRecs.reduce((s, t) => s + (t.partner_target || 0), 0);
        // Order Won leads (for license/device count)
        // Use full RBAC scope for lead owner filter (not just users with targets),
        // so BDEs without a target assigned still have their sales_device counted.
        const orderWonLeads = [];
        const salesStageWon = await prisma_1.prisma.salesStage.findFirst({ where: { name: 'Order Won' } });
        if (salesStageWon) {
            let leadOwnerFilter;
            if (isAggregated) {
                const scopedUsers = await prisma_1.prisma.user.findMany({
                    where: userScopeFilter,
                    select: { id: true }
                });
                leadOwnerFilter = { in: scopedUsers.map(u => u.id) };
            }
            else {
                leadOwnerFilter = targetUserId;
            }
            const leads = await prisma_1.prisma.lead.findMany({
                where: {
                    lead_owner_id: leadOwnerFilter,
                    product_id: pid,
                    sales_stage_id: salesStageWon.id,
                    // Only leads actually won within the selected fiscal year — a lead
                    // won before this FY started stays out of this view entirely; the
                    // user switches the FY filter to see it under its real month.
                    order_won_at: { gte: fiscalStart, lte: fiscalEnd },
                },
                select: {
                    sales_device: true,
                    order_value: true,
                    order_won_at: true,
                }
            });
            orderWonLeads.push(...leads);
        }
        // Partner Sign-Ups (Achievement) — same user-scope logic as Device|Licence
        let partnerUserFilter;
        if (isAggregated) {
            const scopedUsers = await prisma_1.prisma.user.findMany({
                where: userScopeFilter,
                select: { id: true }
            });
            partnerUserFilter = { in: scopedUsers.map(u => u.id) };
        }
        else {
            partnerUserFilter = targetUserId;
        }
        const partnerSignUps = await prisma_1.prisma.partner.findMany({
            where: {
                product_id: pid,
                user_id: partnerUserFilter,
                created_at: { gte: fiscalStart, lte: fiscalEnd }
            },
            select: { created_at: true }
        });
        // All leads for this product (for quadrant snapshot)
        const leadWhere = {
            lead_owner_id: isAggregated ? { in: userIds } : targetUserId,
            product_id: pid,
        };
        const allLeads = await prisma_1.prisma.lead.findMany({
            where: leadWhere,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                company_name: true,
                quadrant: true,
                quadrant_updated_at: true,
                created_at: true
            }
        });
        // Build monthly data rows
        // Note: orderWonLeads is already scoped to this fiscal year only (see the
        // query above) — a lead won before this FY started does not appear here at
        // all; switch the FY filter to see it under its real won month instead.
        let monthlyData = fiscalMonths.map((m) => {
            const wonLeadsInMonth = orderWonLeads.filter(l => {
                const d = dayjs_1.default.utc(l.order_won_at);
                return d.year() === m.year && (d.month() + 1) === m.month;
            });
            // Actual Value = SUM of order_value from Order Won leads
            const salesActual = wonLeadsInMonth.reduce((s, l) => s + (Number(l.order_value) || 0), 0);
            const variancePct = monthlySalesTarget > 0 ? Math.round((salesActual / monthlySalesTarget) * 100) : 0;
            // Achievement = sales_device if > 0, else count the lead as 1
            const licenseAchieved = wonLeadsInMonth.reduce((s, l) => {
                return s + ((l.sales_device && l.sales_device > 0) ? l.sales_device : 1);
            }, 0);
            const licensePct = monthlyLicenseTarget > 0 ? Math.round((licenseAchieved / monthlyLicenseTarget) * 100) : 0;
            const partnersInMonth = partnerSignUps.filter(p => {
                const d = dayjs_1.default.utc(p.created_at);
                return d.year() === m.year && (d.month() + 1) === m.month;
            }).length;
            const partnerPct = monthlyPartnerTarget > 0 ? Math.round((partnersInMonth / monthlyPartnerTarget) * 100) : 0;
            return {
                month: m.label,
                salesTarget: monthlySalesTarget,
                actual: salesActual,
                variancePct,
                licenseTarget: monthlyLicenseTarget,
                licenseAchieved,
                licensePct,
                partnerTarget: monthlyPartnerTarget,
                partnerAchieved: partnersInMonth,
                partnerPct,
                year: m.year,
                monthNum: m.month
            };
        });
        // FILTER: Only show from FY start to CURRENT month
        const now = dayjs_1.default.utc();
        const currentFiscalMonthIndex = fiscalMonths.findIndex(m => {
            return m.year === now.year() && m.month === (now.month() + 1);
        });
        console.log('--- SEAL DASHBOARD DEBUG ---');
        console.log(`Now: ${now.format()}`);
        console.log(`Current FY Start: ${fyStart}`);
        console.log(`currentFiscalMonthIndex: ${currentFiscalMonthIndex}`);
        // If the selected FY is in the past, show all 12. If it's the current FY, slice it.
        // If it's future, show nothing or just the first month (April).
        const currentYearFY = now.month() < 3 ? now.year() - 1 : now.year();
        console.log(`currentYearFY: ${currentYearFY}`);
        if (fyStart === currentYearFY) {
            monthlyData = monthlyData.map((m, index) => {
                if (currentFiscalMonthIndex >= 0 && index > currentFiscalMonthIndex) {
                    return {
                        ...m,
                        salesTarget: null,
                        actual: null,
                        variancePct: null,
                        licenseTarget: null,
                        licenseAchieved: null,
                        licensePct: null,
                        partnerTarget: null,
                        partnerAchieved: null,
                        partnerPct: null
                    };
                }
                return m;
            });
        }
        else if (fyStart > currentYearFY) {
            // Future FY
            monthlyData = monthlyData.map(m => ({
                ...m,
                salesTarget: null,
                actual: null,
                variancePct: null,
                licenseTarget: null,
                licenseAchieved: null,
                licensePct: null,
                partnerTarget: null,
                partnerAchieved: null,
                partnerPct: null
            }));
        }
        else {
            console.log(`Past FY, showing all 12 months.`);
        }
        console.log(`Final monthlyData length: ${monthlyData.length}`);
        console.log('----------------------------');
        const quadrantLeadsMap = { Q1: [], Q2: [], Q3: [], Q4: [] };
        for (const l of allLeads) {
            const q = l.quadrant;
            if (q && quadrantLeadsMap[q]) {
                quadrantLeadsMap[q].push({
                    id: l.id,
                    name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
                    company: l.company_name || ''
                });
            }
        }
        // Quadrant Movement (Upcoming Week): from WeeklyReport CURRENT plan entries
        // Scope: reports created in the current ISO week for the scoped users
        const weekStart = now.startOf('isoWeek').toDate();
        const weekEnd = now.endOf('isoWeek').toDate();
        const weeklyReportWhere = {
            date: { gte: weekStart, lte: weekEnd },
            product_id: pid
        };
        if (!isAggregated) {
            weeklyReportWhere.user_id = targetUserId;
        }
        else if (userIds.length > 0) {
            weeklyReportWhere.user_id = { in: userIds };
        }
        const currentWeekReports = await prisma_1.prisma.weeklyReport.findMany({
            where: weeklyReportWhere,
            include: {
                details: {
                    where: {
                        type: 'CURRENT',
                        metric: { in: ['Q1_TO_Q2', 'Q2_TO_Q3', 'Q3_TO_Q4', 'Q4_TO_ORDER'] },
                        lead_id: { not: null }
                    },
                    include: {
                        lead: {
                            select: { id: true, first_name: true, last_name: true, company_name: true }
                        }
                    }
                }
            },
            orderBy: { id: 'desc' }
        });
        // Collect all movement detail rows (deduplicate same lead appearing in multiple reports)
        const seenMovementLeads = new Set(); // "<metric>-<lead_id>"
        const movementMap = {
            Q1_TO_Q2: [], Q2_TO_Q3: [], Q3_TO_Q4: [], Q4_TO_ORDER: []
        };
        for (const report of currentWeekReports) {
            for (const d of report.details) {
                if (!d.lead_id || !d.lead)
                    continue;
                const key = `${d.metric}-${d.lead_id}`;
                if (seenMovementLeads.has(key))
                    continue;
                seenMovementLeads.add(key);
                if (movementMap[d.metric]) {
                    movementMap[d.metric].push({
                        id: d.lead_id,
                        name: `${d.lead.first_name || ''} ${d.lead.last_name || ''}`.trim() || 'Unknown',
                        company: d.lead.company_name || ''
                    });
                }
            }
        }
        // Build quadrant data: actual leads + outgoing movement leads for each quadrant
        // Upcoming Week = leads in THIS quadrant expected to move to the NEXT stage this week
        const quadrantData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
            const actualLeads = quadrantLeadsMap[q] || [];
            let movementLeads = [];
            if (q === 'Q1')
                movementLeads = movementMap['Q1_TO_Q2'];
            else if (q === 'Q2')
                movementLeads = movementMap['Q2_TO_Q3'];
            else if (q === 'Q3')
                movementLeads = movementMap['Q3_TO_Q4'];
            else if (q === 'Q4')
                movementLeads = movementMap['Q4_TO_ORDER'];
            return {
                quadrant: q,
                currentLeads: actualLeads.length,
                actualLeadsInQuadrant: actualLeads.length,
                leads: actualLeads,
                quadrantMovement: movementLeads.length,
                movementLeads
            };
        });
        // Weekly data: use current calendar month if it's in this FY,
        // otherwise use the last month of the selected FY (handles past-year views)
        const currentFMIndex = fiscalMonths.findIndex(m => m.year === now.year() && m.month === (now.month() + 1));
        const weeklyFMIndex = currentFMIndex >= 0 ? currentFMIndex : fiscalMonths.length - 1;
        const wm = fiscalMonths[weeklyFMIndex];
        // Week number by day-of-month (same bucketing used throughout)
        const weekByDay = (day) => {
            if (day <= 7)
                return 1;
            if (day <= 14)
                return 2;
            if (day <= 21)
                return 3;
            return 4;
        };
        // Mirror monthly performance logic: filter orderWonLeads by wm year+month (same as monthly),
        // then partition by week-of-month using day count.
        const weeklyOrderWonLeads = orderWonLeads.filter(l => {
            const d = dayjs_1.default.utc(l.order_won_at);
            return d.year() === wm.year && (d.month() + 1) === wm.month;
        });
        const weeklyData = [1, 2, 3, 4].map(w => {
            const weekLeads = weeklyOrderWonLeads.filter(l => weekByDay(dayjs_1.default.utc(l.order_won_at).date()) === w);
            return {
                week: `Week ${w}`,
                salesTarget: Math.round(monthlySalesTarget / 4),
                salesAchieved: weekLeads.reduce((s, l) => s + (Number(l.order_value) || 0), 0),
            };
        });
        // Summary (Based on filtered/displayed months)
        const targetToDate = monthlyData.reduce((s, m) => s + (m.salesTarget || 0), 0);
        const actualToDate = monthlyData.reduce((s, m) => s + (m.actual || 0), 0);
        const perfPct = targetToDate > 0 ? Math.round((actualToDate / targetToDate) * 100) : 0;
        const zone = perfPct < 60 ? 'DANGER' : perfPct < 90 ? 'REASONABLE' : 'EXCELLENT';
        // Totals (Cumulative for the displayed period)
        const totals = {
            salesTarget: targetToDate,
            actual: actualToDate,
            licenseTarget: monthlyData.reduce((s, m) => s + (m.licenseTarget || 0), 0),
            licenseAchieved: monthlyData.reduce((s, m) => s + (m.licenseAchieved || 0), 0),
            partnerTarget: monthlyData.reduce((s, m) => s + (m.partnerTarget || 0), 0),
            partnerAchieved: monthlyData.reduce((s, m) => s + (m.partnerAchieved || 0), 0)
        };
        const licenses_total_pct = totals.licenseTarget > 0
            ? Math.round((totals.licenseAchieved / totals.licenseTarget) * 100) : 0;
        const partners_total_pct = totals.partnerTarget > 0
            ? Math.round((totals.partnerAchieved / totals.partnerTarget) * 100) : 0;
        return res.json({
            product,
            user: targetUser,
            fiscalYear: `${fyStart}-${fyStart + 1}`,
            monthlyData,
            quadrantData,
            weeklyData,
            weeklyMonth: wm.label,
            totalLeads: allLeads.length,
            summary: { targetToDate, actualToDate, perfPct, zone },
            totals: {
                ...totals,
                licensesPct: licenses_total_pct,
                partnersPct: partners_total_pct
            }
        });
    }
    catch (error) {
        console.error('Error fetching SEAL data:', error);
        res.status(500).json({ message: 'Error fetching SEAL data' });
    }
};
exports.getSealData = getSealData;
/**
 * GET /api/seal/summary?fiscal_year=2025&bde_id=&company_id=&product_id=
 * Aggregate SEAL figures across every product the caller is mapped to (RBAC-scoped
 * the same way as the isAggregated branch of getSealData), for the main Dashboard's
 * SEAL summary card — the four totals the card shows, plus a `byBde` breakdown
 * (summed across all of that BDE's mapped products) for the card's hover detail.
 * bde_id/company_id/product_id are the same Dashboard filter params every other
 * dashboard section (reports/dashboard, cashflow-report/dashboard-activities)
 * accepts, so the SEAL cards move with the page's filters instead of staying static.
 */
// bde_id/company_id/product_id — same Dashboard filter params reportController's
// dashboard endpoint honors (see parseDashboardBdeId there); rejects a non-numeric
// value up front rather than letting NaN flow into a Prisma where clause.
const parseDashboardFilterId = (raw) => {
    if (raw === undefined || raw === null || raw === '')
        return undefined;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? undefined : n;
};
const getSealSummary = async (req, res) => {
    try {
        const { fiscal_year } = req.query;
        const authUser = req.user;
        const bdeIdFilter = parseDashboardFilterId(req.query.bde_id);
        const companyIdFilter = parseDashboardFilterId(req.query.company_id);
        const productIdFilter = parseDashboardFilterId(req.query.product_id);
        // Fiscal year start — same Apr→Mar rule as getSealData
        let fyStart = parseInt(fiscal_year) || (0, dayjs_1.default)().year();
        if (!fiscal_year) {
            const currentMonth = (0, dayjs_1.default)().month() + 1;
            if (currentMonth < 4)
                fyStart = (0, dayjs_1.default)().year() - 1;
        }
        // RBAC scope — mirrors getSealData's aggregated (no user_id) branch
        let userScopeFilter = { status: 'ACTIVE' };
        if (authUser.role === 'SalesPerson') {
            userScopeFilter = { id: authUser.id, status: 'ACTIVE' };
        }
        else if (authUser.role === 'SalesManager') {
            userScopeFilter = {
                id: { in: await (0, teamScope_1.getTeamIds)(authUser) },
                status: 'ACTIVE',
            };
        }
        const scopedUsers = await prisma_1.prisma.user.findMany({ where: userScopeFilter, select: { id: true } });
        let scopedUserIds = scopedUsers.map(u => u.id);
        // Dashboard's BDE filter narrows to that one BDE — same "out-of-scope
        // request quietly returns nothing" behaviour as reportController's
        // buildRoleScope, rather than a 403 (a SalesManager's dropdown never
        // offers anyone outside their team, so this only bites a stale filter).
        if (bdeIdFilter !== undefined) {
            scopedUserIds = scopedUserIds.includes(bdeIdFilter) ? [bdeIdFilter] : [];
        }
        const empty = {
            fiscalYear: `${fyStart}-${fyStart + 1}`,
            targetToDate: 0, actualToDate: 0, perfPct: 0,
            totals: { licenseTarget: 0, licenseAchieved: 0, licensesPct: 0 },
            totalLeads: 0, productCount: 0, byBde: [],
        };
        if (scopedUserIds.length === 0)
            return res.json(empty);
        const scopedUsersFull = await prisma_1.prisma.user.findMany({
            where: { id: { in: scopedUserIds } },
            select: { id: true, first_name: true, last_name: true },
        });
        const bdeNames = new Map(scopedUsersFull.map(u => [u.id, [u.first_name, u.last_name].filter(Boolean).join(' ')]));
        // Products the scoped users carry an active target for — same activeTargetOR
        // getSealData uses to derive userIds for its isAggregated branch. Dashboard's
        // Company/Product filters narrow this further, same fields reportController's
        // applyDashboardFilters uses (product.company_id / product_id).
        const activeTargetOR = [
            { sales_target: { gt: 0 } },
            { device_target: { gt: 0 } },
            { leads_target: { gt: 0 } },
            { calls_target: { gt: 0 } },
        ];
        const productTargets = await prisma_1.prisma.userProductTarget.findMany({
            where: {
                user_id: { in: scopedUserIds },
                OR: activeTargetOR,
                product: {
                    is_active: true,
                    ...(productIdFilter !== undefined ? { id: productIdFilter } : {}),
                    ...(companyIdFilter !== undefined ? { company_id: companyIdFilter } : {}),
                },
            },
            select: { product_id: true },
        });
        const productIds = [...new Set(productTargets.map(t => t.product_id))];
        if (productIds.length === 0)
            return res.json(empty);
        // Fiscal months, clipped to the current month for the active FY — mirrors
        // getSealData's "FILTER: only show FY start to CURRENT month" step.
        const fiscalMonths = Array.from({ length: 12 }, (_, i) => {
            const d = dayjs_1.default.utc(`${fyStart}-04-01`).add(i, 'month');
            return { year: d.year(), month: d.month() + 1, end: d.endOf('month').toDate() };
        });
        const now = dayjs_1.default.utc();
        const currentYearFY = now.month() < 3 ? now.year() - 1 : now.year();
        let displayedMonths = fiscalMonths;
        if (fyStart === currentYearFY) {
            const idx = fiscalMonths.findIndex(m => m.year === now.year() && m.month === (now.month() + 1));
            displayedMonths = idx >= 0 ? fiscalMonths.slice(0, idx + 1) : fiscalMonths;
        }
        else if (fyStart > currentYearFY) {
            displayedMonths = [];
        }
        const fiscalStart = dayjs_1.default.utc(`${fyStart}-04-01`).startOf('month').toDate();
        const fiscalEnd = fiscalMonths[11].end;
        const salesStageWon = await prisma_1.prisma.salesStage.findFirst({ where: { name: 'Order Won' } });
        let targetToDate = 0;
        let licenseTarget = 0;
        let actualToDate = 0;
        let licenseAchieved = 0;
        let totalLeads = 0;
        const bdeMap = new Map();
        const bucket = (uid) => {
            let b = bdeMap.get(uid);
            if (!b) {
                b = { id: uid, name: bdeNames.get(uid) || 'Unknown', salesTarget: 0, salesActual: 0, licenseTarget: 0, licenseAchieved: 0, leads: 0 };
                bdeMap.set(uid, b);
            }
            return b;
        };
        for (const pid of productIds) {
            const recs = await prisma_1.prisma.userProductTarget.findMany({
                where: { product_id: pid, user_id: { in: scopedUserIds }, OR: activeTargetOR },
            });
            const productUserIds = [...new Set(recs.map(r => r.user_id))];
            if (productUserIds.length === 0)
                continue;
            const monthlySalesTarget = recs.reduce((s, t) => s + (t.sales_target || 0), 0);
            const monthlyLicenseTarget = recs.reduce((s, t) => s + (t.device_target || 0), 0);
            targetToDate += monthlySalesTarget * displayedMonths.length;
            licenseTarget += monthlyLicenseTarget * displayedMonths.length;
            for (const r of recs) {
                const b = bucket(r.user_id);
                b.salesTarget += (r.sales_target || 0) * displayedMonths.length;
                b.licenseTarget += (r.device_target || 0) * displayedMonths.length;
            }
            if (salesStageWon && displayedMonths.length > 0) {
                const cutoff = displayedMonths[displayedMonths.length - 1].end;
                const wonLeads = await prisma_1.prisma.lead.findMany({
                    where: {
                        lead_owner_id: { in: productUserIds },
                        product_id: pid,
                        sales_stage_id: salesStageWon.id,
                        // Scoped to the selected fiscal year only — a lead won before
                        // this FY started shows under its own FY when that filter is
                        // selected, not folded into this one.
                        order_won_at: { gte: fiscalStart, lte: fiscalEnd },
                    },
                    select: { sales_device: true, order_value: true, order_won_at: true, lead_owner_id: true },
                });
                const counted = wonLeads.filter(l => l.order_won_at && !dayjs_1.default.utc(l.order_won_at).isAfter(cutoff));
                actualToDate += counted.reduce((s, l) => s + (Number(l.order_value) || 0), 0);
                licenseAchieved += counted.reduce((s, l) => s + ((l.sales_device && l.sales_device > 0) ? l.sales_device : 1), 0);
                for (const l of counted) {
                    if (l.lead_owner_id == null)
                        continue;
                    const b = bucket(l.lead_owner_id);
                    b.salesActual += Number(l.order_value) || 0;
                    b.licenseAchieved += (l.sales_device && l.sales_device > 0) ? l.sales_device : 1;
                }
            }
            const leadsByOwner = await prisma_1.prisma.lead.groupBy({
                by: ['lead_owner_id'],
                where: { lead_owner_id: { in: productUserIds }, product_id: pid },
                _count: { id: true },
            });
            for (const g of leadsByOwner) {
                if (g.lead_owner_id == null)
                    continue;
                bucket(g.lead_owner_id).leads += g._count.id;
                totalLeads += g._count.id;
            }
        }
        const perfPct = targetToDate > 0 ? Math.round((actualToDate / targetToDate) * 100) : 0;
        const licensesPct = licenseTarget > 0 ? Math.round((licenseAchieved / licenseTarget) * 100) : 0;
        const byBde = Array.from(bdeMap.values())
            .map(b => ({
            ...b,
            salesPct: b.salesTarget > 0 ? Math.round((b.salesActual / b.salesTarget) * 100) : 0,
            licensePct: b.licenseTarget > 0 ? Math.round((b.licenseAchieved / b.licenseTarget) * 100) : 0,
        }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json({
            fiscalYear: `${fyStart}-${fyStart + 1}`,
            targetToDate, actualToDate, perfPct,
            totals: { licenseTarget, licenseAchieved, licensesPct },
            totalLeads,
            productCount: productIds.length,
            byBde,
        });
    }
    catch (error) {
        console.error('Error fetching SEAL summary:', error);
        res.status(500).json({ message: 'Error fetching SEAL summary' });
    }
};
exports.getSealSummary = getSealSummary;
/**
 * GET /api/seal/bdes?product_id=X
 * Returns list of allowed BDEs for the dropdown based on role and product targets
 */
const getBdes = async (req, res) => {
    try {
        const { product_id } = req.query;
        const authUser = req.user;
        if (!product_id || product_id === 'null' || product_id === 'undefined' || product_id === '') {
            return res.status(400).json({ message: 'product_id is required' });
        }
        // SEAL global Company filter — product outside the company → no BDEs.
        const companyProductIds = await resolveCompanyProductIds(req.query.company_id);
        if (companyProductIds !== null && !companyProductIds.includes(parseInt(product_id))) {
            return res.json([]);
        }
        const activeTargetOR = [
            { sales_target: { gt: 0 } },
            { device_target: { gt: 0 } },
            { leads_target: { gt: 0 } },
            { calls_target: { gt: 0 } }
        ];
        // Build RBAC scope
        let rbacFilter = {};
        if (authUser.role === 'SalesManager') {
            rbacFilter = { id: { in: await (0, teamScope_1.getTeamIds)(authUser) } };
        }
        else if (authUser.role === 'SalesPerson') {
            rbacFilter = { id: authUser.id };
        }
        const pid = parseInt(product_id);
        const recs = await prisma_1.prisma.userProductTarget.findMany({
            where: {
                product_id: pid,
                OR: activeTargetOR,
                user: { status: 'ACTIVE', ...rbacFilter }
            },
            select: { user_id: true }
        });
        const userIds = recs.map(r => r.user_id);
        if (userIds.length === 0)
            return res.json([]);
        const bdes = await prisma_1.prisma.user.findMany({
            where: { id: { in: userIds }, status: 'ACTIVE' },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' }
        });
        res.json(bdes);
    }
    catch (error) {
        console.error('Error fetching allowed BDEs:', error);
        res.status(500).json({ message: 'Error fetching BDEs' });
    }
};
exports.getBdes = getBdes;
/**
 * GET /api/seal/weekly-reports
 * Returns all weekly reports with RBAC
 */
const getWeeklyReports = async (req, res) => {
    try {
        const { user_id, from_date, to_date, product_id } = req.query;
        const authUser = req.user;
        let whereClause = {};
        if (user_id && user_id !== '' && user_id !== 'null' && user_id !== 'undefined') {
            const uid = parseInt(user_id);
            // RBAC for specific user
            if (authUser.role === 'SalesPerson') {
                whereClause.user_id = authUser.id;
            }
            else if (authUser.role === 'SalesManager') {
                if (uid !== authUser.id) {
                    if (!(await (0, teamScope_1.isInTeam)(authUser.id, uid))) {
                        return res.status(403).json({ message: 'Access denied' });
                    }
                }
                whereClause.user_id = uid;
            }
            else {
                whereClause.user_id = uid;
            }
        }
        else {
            // Aggregate/Consolidated view RBAC
            if (authUser.role === 'SalesPerson') {
                whereClause.user_id = authUser.id;
            }
            else if (authUser.role === 'SalesManager') {
                // Self + full downward reporting tree
                whereClause.user_id = { in: await (0, teamScope_1.getTeamIds)(authUser) };
            }
            else {
                // Admin/CEO - no user filter
            }
        }
        // Date range filtering
        if (from_date || to_date) {
            whereClause.date = {};
            if (from_date && from_date !== '') {
                whereClause.date.gte = (0, dayjs_1.default)(from_date).startOf('day').toDate();
            }
            if (to_date && to_date !== '') {
                whereClause.date.lte = (0, dayjs_1.default)(to_date).endOf('day').toDate();
            }
        }
        // Product filtering — use product_id directly on WeeklyReport for all roles
        const isProductMode = !!(product_id && product_id !== '' && product_id !== 'null');
        if (isProductMode) {
            whereClause.product_id = parseInt(product_id);
        }
        // SEAL global Company filter — restrict to the company's products
        // (WeeklyReport has no product relation, so intersect on product_id).
        const companyProductIds = await resolveCompanyProductIds(req.query.company_id);
        if (companyProductIds !== null) {
            if (isProductMode && !companyProductIds.includes(whereClause.product_id)) {
                return res.json([]);
            }
            if (!isProductMode) {
                whereClause.product_id = { in: companyProductIds };
            }
        }
        const reports = await prisma_1.prisma.weeklyReport.findMany({
            where: whereClause,
            include: {
                user: { select: { first_name: true, last_name: true } },
                details: {
                    include: {
                        lead: {
                            select: { id: true, first_name: true, last_name: true, company_name: true, quadrant: true, order_value: true, company_master: { select: { name: true } } }
                        }
                    }
                }
            },
            orderBy: { id: 'desc' }
        });
        console.log('--- GET WEEKLY REPORTS DEBUG ---');
        console.log('Where Clause:', JSON.stringify(whereClause));
        console.log('Reports Count:', reports.length);
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching weekly reports:', error);
        // Emergency logging to file for debugging
        try {
            require('fs').appendFileSync('scratch/error_log.txt', `[${new Date().toISOString()}] WeeklyReports Error: ${error.message}\nStack: ${error.stack}\n`);
        }
        catch (e) { }
        res.status(500).json({ message: 'Error fetching weekly reports' });
    }
};
exports.getWeeklyReports = getWeeklyReports;
/**
 * GET /api/seal/weekly-reports/latest
 * Returns the most recent report for auto-filling
 */
const getLatestWeeklyReport = async (req, res) => {
    try {
        const authUser = req.user;
        const { user_id, before_date, product_id } = req.query;
        let targetUserId = user_id ? parseInt(user_id) : authUser.id;
        // Simple RBAC: allow viewing own or subordinate's latest report
        if (authUser.role === 'SalesPerson')
            targetUserId = authUser.id;
        const where = { user_id: targetUserId };
        if (before_date && before_date !== '' && before_date !== 'null') {
            const d = (0, dayjs_1.default)(before_date);
            if (d.isValid()) {
                where.date = { lt: d.toDate() };
            }
        }
        // Filter by product context so each product's form shows its own previous data
        if (product_id && product_id !== '' && product_id !== 'null') {
            where.product_id = parseInt(product_id);
        }
        const latestReport = await prisma_1.prisma.weeklyReport.findFirst({
            where,
            include: {
                details: {
                    include: {
                        lead: {
                            select: { id: true, first_name: true, last_name: true, company_name: true, quadrant: true, order_value: true, company_master: { select: { name: true } } }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(latestReport || {});
    }
    catch (error) {
        console.error('Error fetching latest report:', error);
        res.status(500).json({ message: 'Error fetching latest report' });
    }
};
exports.getLatestWeeklyReport = getLatestWeeklyReport;
/**
 * GET /api/seal/weekly-reports/leads
 * Returns leads scoped to the selected product for the weekly report form dropdowns.
 */
const getWeeklyReportLeads = async (req, res) => {
    try {
        const authUser = req.user;
        const { user_id, product_id } = req.query;
        // For SalesPerson: always use their own ID, ignore user_id param
        // For other roles: allow viewing a subordinate's leads via user_id
        let targetUserId = Number(authUser.id);
        if (user_id && authUser.role !== 'SalesPerson') {
            targetUserId = parseInt(user_id);
        }
        const pid = (product_id && product_id !== '') ? parseInt(product_id) : null;
        // Ownership: mirror the Leads page — leads owned by OR created by the target user.
        let whereClause = {
            OR: [
                { lead_owner_id: targetUserId },
                { created_by_id: targetUserId },
            ]
        };
        if (pid) {
            // Filter by product for all roles so the dropdown only shows leads for the selected product
            whereClause = { AND: [whereClause, { product_id: pid }] };
        }
        const leads = await prisma_1.prisma.lead.findMany({
            where: whereClause,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                company_name: true,
                quadrant: true,
                product_id: true,
                company_master: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
            take: 500,
        });
        res.json(leads);
    }
    catch (error) {
        console.error('[getWeeklyReportLeads] ERROR:', error);
        res.status(500).json({ message: 'Error fetching leads', error: String(error) });
    }
};
exports.getWeeklyReportLeads = getWeeklyReportLeads;
/**
 * POST /api/seal/weekly-reports
 * Creates a new weekly report
 */
const createWeeklyReport = async (req, res) => {
    try {
        console.log('--- CREATE WEEKLY REPORT START ---');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        const authUser = req.user;
        const { date, user_id, // Optional user_id for managers
        product_id, prev_q4_to_order, prev_q3_to_q4, prev_q2_to_q3, prev_q1_to_q2, prev_notes, curr_q4_to_order, curr_q3_to_q4, curr_q2_to_q3, curr_q1_to_q2, curr_notes } = req.body;
        let targetUserId = authUser.id;
        if (user_id && authUser.role === 'SalesManager') {
            const uid = parseInt(user_id);
            if (uid !== authUser.id) {
                if (!(await (0, teamScope_1.isInTeam)(authUser.id, uid))) {
                    return res.status(403).json({ message: 'Access denied: You can only file reports for yourself or your subordinates' });
                }
            }
            targetUserId = uid;
        }
        else if (user_id && authUser.role === 'Admin') {
            targetUserId = parseInt(user_id);
        }
        // Validation removed to allow backdated reports
        const detailsData = [];
        const parseIds = (str) => {
            if (!str)
                return [];
            return str.split(/[,\n]/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        };
        // Current Plan
        parseIds(curr_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q4_TO_ORDER' }));
        parseIds(curr_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q3_TO_Q4' }));
        parseIds(curr_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q2_TO_Q3' }));
        parseIds(curr_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q1_TO_Q2' }));
        if (curr_notes)
            detailsData.push({ value: curr_notes, type: 'CURRENT', metric: 'NOTES' });
        // Previous Data
        parseIds(prev_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q4_TO_ORDER' }));
        parseIds(prev_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q3_TO_Q4' }));
        parseIds(prev_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q2_TO_Q3' }));
        parseIds(prev_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q1_TO_Q2' }));
        if (prev_notes)
            detailsData.push({ value: prev_notes, type: 'PREVIOUS', metric: 'NOTES' });
        const report = await prisma_1.prisma.weeklyReport.create({
            data: {
                date: new Date(date + 'T00:00:00.000Z'),
                user_id: targetUserId,
                product_id: product_id ? parseInt(product_id) : null,
                details: { create: detailsData }
            }
        });
        res.status(201).json(report);
    }
    catch (error) {
        console.error('Error creating weekly report:', error);
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'A weekly report already exists for this user, date, and product. Please edit the existing report instead.' });
        }
        res.status(500).json({ message: 'Error creating weekly report' });
    }
};
exports.createWeeklyReport = createWeeklyReport;
/**
 * PUT /api/seal/weekly-reports/:id
 * Updates an existing weekly report
 */
const updateWeeklyReport = async (req, res) => {
    try {
        const { id } = req.params;
        const authUser = req.user;
        const { curr_q4_to_order, curr_q3_to_q4, curr_q2_to_q3, curr_q1_to_q2, curr_notes, prev_q4_to_order, prev_q3_to_q4, prev_q2_to_q3, prev_q1_to_q2, prev_notes } = req.body;
        const reportId = parseInt(id);
        // Fetch existing report
        const existingReport = await prisma_1.prisma.weeklyReport.findUnique({
            where: { id: reportId }
        });
        if (!existingReport) {
            return res.status(404).json({ message: 'Report not found' });
        }
        // RBAC: Only owner or manager
        if (existingReport.user_id !== authUser.id && authUser.role !== 'Admin') {
            // Check reporting hierarchy (any level up the chain)
            if (!(await (0, teamScope_1.isInTeam)(authUser.id, existingReport.user_id))) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        const parseIds = (str) => {
            if (!str)
                return [];
            return str.split(/[,\n]/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        };
        const detailsData = [];
        // Current Plan
        parseIds(curr_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q4_TO_ORDER' }));
        parseIds(curr_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q3_TO_Q4' }));
        parseIds(curr_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q2_TO_Q3' }));
        parseIds(curr_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q1_TO_Q2' }));
        if (curr_notes)
            detailsData.push({ value: curr_notes, type: 'CURRENT', metric: 'NOTES' });
        // Previous Data (Must persist during update as well)
        parseIds(prev_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q4_TO_ORDER' }));
        parseIds(prev_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q3_TO_Q4' }));
        parseIds(prev_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q2_TO_Q3' }));
        parseIds(prev_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q1_TO_Q2' }));
        if (prev_notes)
            detailsData.push({ value: prev_notes, type: 'PREVIOUS', metric: 'NOTES' });
        const updatedReport = await prisma_1.prisma.weeklyReport.update({
            where: { id: reportId },
            data: {
                details: {
                    deleteMany: {}, // Clean slate and recreate all details
                    create: detailsData
                }
            }
        });
        res.json(updatedReport);
    }
    catch (error) {
        console.error('Error updating weekly report:', error);
        res.status(500).json({ message: 'Error updating weekly report' });
    }
};
exports.updateWeeklyReport = updateWeeklyReport;
