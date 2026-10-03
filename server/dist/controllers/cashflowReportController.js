"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashflowDashboardActivities = exports.getCashflowReportClientCompanies = exports.getCashflowReportBdes = exports.getCashflowReport = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const prisma_1 = require("../lib/prisma");
const dateFilters_1 = require("../utils/dateFilters");
const cashflowMilestones_1 = require("../utils/cashflowMilestones");
const teamScope_1 = require("../utils/teamScope");
const authUser = (req) => req.user;
// Cashflow Privileges — Management Access: when granted, the reporting hierarchy is
// bypassed entirely for the assigned companies (any BDE's records are visible),
// scoped by the record's BU company (product.company_id), same field the existing
// Company filter already uses.
async function getManagementAccess(user) {
    if (!user.cashflow_management_access)
        return { enabled: false, companyIds: [] };
    const rows = await prisma_1.prisma.cashflowManagementCompany.findMany({
        where: { user_id: user.id },
        select: { company_id: true },
    });
    const companyIds = rows.map((r) => r.company_id);
    return { enabled: companyIds.length > 0, companyIds };
}
function emptyResponse() {
    return {
        summary: { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 },
        rows: [],
    };
}
// Shared "which leads is this user allowed to see" scope — the RBAC/Management
// Access portion of getCashflowReport's lead WHERE clause, minus bde_id
// filtering. Reused by the BDE filter endpoint (getCashflowReportBdes) so the
// two never diverge on visibility rules. Returns denied: true when the
// requested company_id falls outside the user's Management Access grant.
async function buildLeadScope(user, managementAccess, companyId, bdeId) {
    const conditions = [`l.quadrant = 'Order Won'`];
    const args = [];
    if (managementAccess.enabled) {
        if (companyId) {
            const reqCompanyId = parseInt(companyId, 10);
            if (!managementAccess.companyIds.includes(reqCompanyId))
                return { conditions, args, denied: true };
            conditions.push('p.company_id = ?');
            args.push(reqCompanyId);
        }
        else {
            conditions.push(`p.company_id IN (${managementAccess.companyIds.join(',')})`);
        }
        if (bdeId) {
            // A management-access user is only ever authorized within their assigned
            // companies — validate the requested BDE actually belongs to one of them,
            // the same way getCashflowReport validates it.
            const reqBdeId = parseInt(bdeId, 10);
            const bdeUser = await prisma_1.prisma.user.findUnique({ where: { id: reqBdeId }, select: { company_id: true } });
            if (!bdeUser || bdeUser.company_id == null || !managementAccess.companyIds.includes(bdeUser.company_id)) {
                return { conditions, args, denied: true };
            }
            conditions.push('l.lead_owner_id = ?');
            args.push(reqBdeId);
        }
    }
    else {
        if (user.role === 'SalesPerson') {
            conditions.push('l.lead_owner_id = ?');
            args.push(user.id);
        }
        else if (user.role === 'SalesManager') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (bdeId) {
                const reqBdeId = parseInt(bdeId, 10);
                if (!teamIds.includes(reqBdeId))
                    return { conditions, args, denied: true };
                conditions.push('l.lead_owner_id = ?');
                args.push(reqBdeId);
            }
            else if (teamIds.length) {
                conditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
            }
        }
        else if (bdeId) {
            conditions.push('l.lead_owner_id = ?');
            args.push(parseInt(bdeId, 10));
        }
        if (companyId) {
            conditions.push('p.company_id = ?');
            args.push(parseInt(companyId, 10));
        }
    }
    return { conditions, args, denied: false };
}
// Cashflow Report — one row per milestone (CR8), mirroring the Cashflow Tracker.
// Full per-payment transaction detail lives behind the Collection History popup
// (GET /leads/:id/milestones/:mid/payment-history), not in this main table.
const getCashflowReport = async (req, res) => {
    try {
        const user = authUser(req);
        const { month, product_id, vertical_id, bde_id, company_id, client_company_id, edc_status, quick_filter, quarter, from_date, to_date, collection_status, poa_status, poa_from_date, poa_to_date } = req.query;
        // Never trust frontend values: reject malformed numeric filters up front rather
        // than letting NaN flow into the raw SQL built below.
        const numericParams = { product_id, vertical_id, bde_id, company_id, client_company_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }
        const edcStatus = edc_status || 'all';
        const collectionStatusFilter = (0, cashflowMilestones_1.parseStatusFilter)(collection_status);
        const poaStatusFilter = (0, cashflowMilestones_1.parseStatusFilter)(poa_status);
        // CR10: the date window filters the milestone list itself (by EDC/Revised EDC,
        // same as the Cashflow Tracker) AND scopes which payment transactions count as
        // "Period Collected" — the two modules must never diverge on this.
        const dateWindows = (0, dateFilters_1.resolveDateWindows)(quick_filter, month);
        const quarterWindows = (0, dateFilters_1.resolveQuarterWindows)(quarter);
        const dateRange = (0, dateFilters_1.resolveDateRange)(from_date, to_date);
        // POA EDC From/To — a separate window from the EDC one above, so "collections
        // due in this period" and "POA activities due in this period" can be asked
        // independently (dashboard Cash Flow Activities cards link in with it).
        const poaDateRange = (0, dateFilters_1.resolveDateRange)(poa_from_date, poa_to_date);
        const leadConditions = [`l.quadrant = 'Order Won'`];
        const leadArgs = [];
        const managementAccess = await getManagementAccess(user);
        if (managementAccess.enabled) {
            // Management Access: reporting hierarchy is bypassed entirely for the
            // assigned companies — any BDE's records are visible within them.
            if (company_id) {
                const reqCompanyId = parseInt(company_id);
                if (!managementAccess.companyIds.includes(reqCompanyId))
                    return res.json(emptyResponse());
                leadConditions.push('p.company_id = ?');
                leadArgs.push(reqCompanyId);
            }
            else {
                leadConditions.push(`p.company_id IN (${managementAccess.companyIds.join(',')})`);
            }
            if (bde_id) {
                // A management-access user is only ever authorized within their assigned
                // companies — validate the requested BDE actually belongs to one of them,
                // the same way an explicit company_id is validated above. Without this,
                // a user restricted to Company A could pass another company's BDE id
                // (omitting company_id) and receive that BDE's records.
                const reqBdeId = parseInt(bde_id);
                const bdeUser = await prisma_1.prisma.user.findUnique({ where: { id: reqBdeId }, select: { company_id: true } });
                if (!bdeUser || bdeUser.company_id == null || !managementAccess.companyIds.includes(bdeUser.company_id)) {
                    return res.json(emptyResponse());
                }
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(reqBdeId);
            }
        }
        else {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (user.role === 'SalesPerson') {
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(user.id);
            }
            else if (user.role === 'SalesManager') {
                if (bde_id) {
                    const reqBdeId = parseInt(bde_id);
                    if (!teamIds.includes(reqBdeId))
                        return res.json(emptyResponse());
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
            if (company_id) {
                leadConditions.push('p.company_id = ?');
                leadArgs.push(parseInt(company_id));
            }
        }
        if (product_id) {
            leadConditions.push('l.product_id = ?');
            leadArgs.push(parseInt(product_id));
        }
        if (vertical_id) {
            leadConditions.push('l.vertical_id = ?');
            leadArgs.push(parseInt(vertical_id));
        }
        if (client_company_id) {
            leadConditions.push('l.client_company_id = ?');
            leadArgs.push(parseInt(client_company_id));
        }
        const leadWhere = leadConditions.join(' AND ');
        const leads = await prisma_1.prisma.$queryRawUnsafe(`SELECT l.id, l.company_name, l.project_name, l.product_id, l.lead_owner_id, l.vertical_id,
                    u.id AS owner_id, u.first_name AS owner_first, u.last_name AS owner_last,
                    p.name AS product_name, p.company_id AS bu_company_id, c.name AS bu_company_name,
                    v.name AS vertical_name, ci.name AS city_name
             FROM lead l
             LEFT JOIN user u ON l.lead_owner_id = u.id
             LEFT JOIN product p ON l.product_id = p.id
             LEFT JOIN company c ON p.company_id = c.id
             LEFT JOIN vertical v ON l.vertical_id = v.id
             LEFT JOIN city ci ON l.city_id = ci.id
             WHERE ${leadWhere}
             ORDER BY l.company_name ASC`, ...leadArgs);
        if (!leads.length)
            return res.json(emptyResponse());
        const leadIds = leads.map((l) => Number(l.id));
        // Filtering + amount calculations use the same shared logic as the Cashflow
        // Tracker (getFilteredMilestonesForLeads) so the two modules never diverge.
        const filtered = await (0, cashflowMilestones_1.getFilteredMilestonesForLeads)(leadIds, edcStatus, dateWindows, true, quarterWindows, dateRange, poaDateRange);
        const { milestones } = filtered;
        if (!milestones.length)
            return res.json(emptyResponse());
        // Stretch targets. A BDE holds one target row per product, so the monthly
        // revenue target is the sum across the products in scope — assigning instead
        // of adding made the last row win and zeroed out BDEs whose revenue target
        // sits on only one of their products.
        const ownerIds = [...new Set(leads.map((l) => Number(l.lead_owner_id)).filter(Boolean))];
        const targetFilter = { user_id: { in: ownerIds } };
        if (product_id)
            targetFilter.product_id = parseInt(product_id);
        const stretchTargets = await prisma_1.prisma.userProductTarget.findMany({
            where: targetFilter,
            select: { user_id: true, revenue_target: true },
        });
        const targetMap = {};
        for (const t of stretchTargets) {
            targetMap[t.user_id] = (targetMap[t.user_id] || 0) + (t.revenue_target || 0);
        }
        const now = new Date();
        // Aging is measured against the original EDC only — never the revised one.
        // Revising a date must not reset the age of a milestone: the whole point of the
        // figure is how long the money has been outstanding against the date first
        // committed to. The revised date is reported separately in its own column.
        const computeAging = (m) => {
            if (!m.edc)
                return null;
            return Math.floor((now.getTime() - new Date(m.edc).getTime()) / 86400000);
        };
        // Milestones grouped by lead, in original lm.id order.
        const milestonesByLead = new Map();
        for (const m of milestones) {
            const lid = Number(m.lead_id);
            if (!milestonesByLead.has(lid))
                milestonesByLead.set(lid, []);
            milestonesByLead.get(lid).push(m);
        }
        // Row order: Client Company (companysummary.md) first — so the company-wise
        // subtotal groups land on contiguous rows — then BDE name, then milestone
        // creation order, so the "display once per consecutive BDE"/"once per
        // consecutive Client Company" rules and the running subtotal read naturally.
        const sortedLeads = [...leads].sort((a, b) => {
            const aCompany = a.company_name || '';
            const bCompany = b.company_name || '';
            if (aCompany !== bCompany)
                return aCompany.localeCompare(bCompany);
            const aName = `${a.owner_first || ''} ${a.owner_last || ''}`.trim();
            const bName = `${b.owner_first || ''} ${b.owner_last || ''}`.trim();
            return aName.localeCompare(bName);
        });
        const rows = [];
        for (const lead of sortedLeads) {
            const leadMilestones = milestonesByLead.get(Number(lead.id)) || [];
            for (const m of leadMilestones) {
                const expected = Number(m.expected_amount || 0);
                const periodAmounts = (0, cashflowMilestones_1.computeMilestonePeriodAmounts)(Number(m.id), expected, filtered);
                const collectionStatus = periodAmounts.is_fully_collected ? 'Fully Paid' : (m.collection_status || 'Pending');
                const poaStatus = m.poa_status || 'Pending';
                // CR11: Collection Status / POA Status multi-select filters, applied on
                // the same derived collection_status shown in the row itself.
                if (!(0, cashflowMilestones_1.matchesStatusFilters)(collectionStatus, poaStatus, collectionStatusFilter, poaStatusFilter))
                    continue;
                rows.push({
                    milestone_id: Number(m.id),
                    lead_id: Number(lead.id),
                    bde_id: Number(lead.lead_owner_id) || null,
                    bde_name: `${lead.owner_first || ''} ${lead.owner_last || ''}`.trim() || '—',
                    monthly_stretch_target: targetMap[Number(lead.lead_owner_id)] || 0,
                    company: lead.company_name || '—',
                    city: lead.city_name || null,
                    project_name: lead.project_name || null,
                    product: lead.product_name || '—',
                    vertical: lead.vertical_name || '—',
                    bu_company_id: lead.bu_company_id != null ? Number(lead.bu_company_id) : null,
                    bu_company_name: lead.bu_company_name || '—',
                    milestone: m.pt_name || '—',
                    expected_amount: expected,
                    ...periodAmounts,
                    edc: m.edc,
                    aging: computeAging(m),
                    revised_edc: m.revised_edc,
                    cashflow_poa: m.bant_poa || '',
                    poa_status: poaStatus,
                    poa_edc: m.bant_poa_edc,
                    collection_status: collectionStatus,
                });
            }
        }
        // Mark BDE/Stretch Target visibility — shown only once for consecutive rows of
        // the same BDE. Also mark Client Company group boundaries (once per
        // consecutive Client Company) for the companysummary.md subtotal view.
        let prevBdeId = undefined;
        let prevCompany = undefined;
        for (const row of rows) {
            row.show_bde = row.bde_id !== prevBdeId;
            prevBdeId = row.bde_id;
            row.show_company_group = row.company !== prevCompany;
            prevCompany = row.company;
        }
        // CR9: dashboard cards are period-based — Total Expected is the sum of each
        // row's Month Target (period_expected), Total Collected is the sum of what
        // was collected within the window (period_collected), and Total Balance is
        // the sum of Period Pending, mirroring the per-row Period Expected/Collected/
        // Pending columns exactly (and matching the Cashflow Tracker's dashboard).
        //
        // Stuck rule: rows whose Collection Status is Stuck always contribute their
        // already-collected money to Total Collected (money already received is
        // never un-received), but never contribute to Total Expected or Total
        // Balance — the outstanding amount is not expected to be collected. Stuck
        // Amount is the sum of their Period Pending, surfaced separately.
        const totalExpected = rows.reduce((s, r) => s + (r.collection_status !== 'Stuck' ? r.period_expected : 0), 0);
        const totalCollected = rows.reduce((s, r) => s + r.period_collected, 0);
        const totalBalance = rows.reduce((s, r) => s + (r.collection_status !== 'Stuck' ? r.period_pending : 0), 0);
        const totalStuck = rows.reduce((s, r) => s + (r.collection_status === 'Stuck' ? r.period_pending : 0), 0);
        res.json({
            summary: { totalExpected, totalCollected, totalBalance, totalStuck },
            rows,
        });
    }
    catch (err) {
        console.error('[CashflowReport] error:', err);
        res.status(500).json({ message: 'Failed to fetch cashflow report', detail: err?.message });
    }
};
exports.getCashflowReport = getCashflowReport;
// BDE filter — the "BDE Filter Optimization" spec (bde.md): the Cashflow Report's
// BDE dropdown must list only BDEs who own at least one milestone matching the
// current Company/Product/Vertical selection, instead of the full User Master.
// Scoped by the same RBAC/Management Access rules as getCashflowReport itself.
const getCashflowReportBdes = async (req, res) => {
    try {
        const user = authUser(req);
        const { product_id, vertical_id, company_id } = req.query;
        const numericParams = { product_id, vertical_id, company_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }
        const managementAccess = await getManagementAccess(user);
        const scope = await buildLeadScope(user, managementAccess, company_id);
        if (scope.denied)
            return res.json([]);
        const leadConditions = scope.conditions;
        const leadArgs = scope.args;
        if (product_id) {
            leadConditions.push('l.product_id = ?');
            leadArgs.push(parseInt(product_id, 10));
        }
        if (vertical_id) {
            leadConditions.push('l.vertical_id = ?');
            leadArgs.push(parseInt(vertical_id, 10));
        }
        const leadWhere = leadConditions.join(' AND ');
        const bdes = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT u.id, u.first_name, u.last_name
             FROM lead l
             INNER JOIN lead_milestone lm ON lm.lead_id = l.id
             INNER JOIN user u ON u.id = l.lead_owner_id
             LEFT JOIN product p ON l.product_id = p.id
             WHERE ${leadWhere}
             ORDER BY u.first_name ASC, u.last_name ASC`, ...leadArgs);
        res.json(bdes.map((b) => ({ id: Number(b.id), first_name: b.first_name, last_name: b.last_name })));
    }
    catch (err) {
        console.error('[CashflowReport] getCashflowReportBdes error:', err);
        res.status(500).json({ message: 'Failed to fetch BDE filter options', detail: err?.message });
    }
};
exports.getCashflowReportBdes = getCashflowReportBdes;
// Client Company filter (clientcomFilter.md) — lists only client companies with at
// least one milestone matching the current Company/Product/Vertical/BDE selection,
// instead of the full Client Company master. Scoped by the same RBAC/Management
// Access rules as getCashflowReport itself.
const getCashflowReportClientCompanies = async (req, res) => {
    try {
        const user = authUser(req);
        const { product_id, vertical_id, bde_id, company_id } = req.query;
        const numericParams = { product_id, vertical_id, bde_id, company_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }
        const managementAccess = await getManagementAccess(user);
        const scope = await buildLeadScope(user, managementAccess, company_id);
        if (scope.denied)
            return res.json([]);
        const leadConditions = [...scope.conditions, 'l.client_company_id IS NOT NULL'];
        const leadArgs = scope.args;
        if (product_id) {
            leadConditions.push('l.product_id = ?');
            leadArgs.push(parseInt(product_id, 10));
        }
        if (vertical_id) {
            leadConditions.push('l.vertical_id = ?');
            leadArgs.push(parseInt(vertical_id, 10));
        }
        if (bde_id) {
            leadConditions.push('l.lead_owner_id = ?');
            leadArgs.push(parseInt(bde_id, 10));
        }
        const leadWhere = leadConditions.join(' AND ');
        const companies = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT cc.id, cc.name
             FROM lead l
             INNER JOIN lead_milestone lm ON lm.lead_id = l.id
             INNER JOIN client_company cc ON cc.id = l.client_company_id
             LEFT JOIN product p ON l.product_id = p.id
             WHERE ${leadWhere}
             ORDER BY cc.name ASC`, ...leadArgs);
        res.json(companies.map((c) => ({ id: Number(c.id), name: c.name })));
    }
    catch (err) {
        console.error('[CashflowReport] getCashflowReportClientCompanies error:', err);
        res.status(500).json({ message: 'Failed to fetch client company filter options', detail: err?.message });
    }
};
exports.getCashflowReportClientCompanies = getCashflowReportClientCompanies;
/* ── Dashboard · Category 3 — Cash Flow Activities ──────────────────────────
   Five consolidated counts for the dashboard cards (md files/Dashboard/cashflowSection.md):
   collections due this week, POA activities due today or this week, and
   collections/POA activities already overdue. No filters are involved — the
   cards always describe every milestone the user is allowed to see, and
   clicking one opens the Cash Flow Report with the matching filters applied.

   The buckets read the same milestone set and the same derived Collection Status
   as the Cash Flow Report itself (getFilteredMilestonesForLeads +
   effectiveCollectionStatus), so a card's count and the report it opens can never
   disagree. */
// Every card lists the same handful of records in its tooltip; the count is the
// full bucket size, not the size of this preview.
const ACTIVITY_PREVIEW_LIMIT = 8;
const COMPLETED_POA_STATUS = 'Completed';
const FULLY_PAID_STATUS = 'Fully Paid';
// Whole days a date is past, measured from the start of today — a date falling
// today is 0 days overdue, never a fraction of a day.
const daysBefore = (date, startOfToday) => Math.max(0, Math.floor((startOfToday - new Date(date).getTime()) / 86400000));
const getCashflowDashboardActivities = async (req, res) => {
    try {
        const user = authUser(req);
        const { bde_id, company_id, product_id } = req.query;
        const numericParams = { bde_id, company_id, product_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }
        const managementAccess = await getManagementAccess(user);
        const scope = await buildLeadScope(user, managementAccess, company_id, bde_id);
        if (scope.denied)
            return res.json(emptyActivitiesResponse());
        const leadConditions = scope.conditions;
        const leadArgs = scope.args;
        // Dashboard's Product filter — narrows this section the same way it
        // narrows the Cash Flow Report itself.
        if (product_id) {
            leadConditions.push('l.product_id = ?');
            leadArgs.push(parseInt(product_id, 10));
        }
        const leads = await prisma_1.prisma.$queryRawUnsafe(`SELECT l.id, l.company_name, p.name AS product_name,
                    u.first_name AS owner_first, u.last_name AS owner_last
             FROM lead l
             LEFT JOIN product p ON l.product_id = p.id
             LEFT JOIN user u ON l.lead_owner_id = u.id
             WHERE ${leadConditions.join(' AND ')}`, ...leadArgs);
        if (!leads.length)
            return res.json(emptyActivitiesResponse());
        const leadById = new Map(leads.map((l) => [Number(l.id), l]));
        const leadIds = leads.map((l) => Number(l.id));
        // No EDC filter and no date window: every bucket below decides membership
        // itself, and an unwindowed fetch keeps `already_received` the all-time figure
        // the "Fully Paid" test needs.
        const filtered = await (0, cashflowMilestones_1.getFilteredMilestonesForLeads)(leadIds, 'all', []);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayMs = startOfToday.getTime();
        const startOfTomorrowMs = startOfTodayMs + 86400000;
        const endOfWeekMs = (0, dayjs_1.default)().endOf('week').valueOf();
        const overallCashflow = [];
        const dueThisWeek = [];
        const overdueCollections = [];
        const poaDueToday = [];
        const poaDueThisWeek = [];
        const overduePoa = [];
        for (const m of filtered.milestones) {
            const lead = leadById.get(Number(m.lead_id));
            if (!lead)
                continue;
            const expected = Number(m.expected_amount || 0);
            const amounts = (0, cashflowMilestones_1.computeMilestonePeriodAmounts)(Number(m.id), expected, filtered);
            const collectionStatus = (0, cashflowMilestones_1.effectiveCollectionStatus)(m.collection_status, amounts.is_fully_collected);
            const poaStatus = m.poa_status || 'Pending';
            const base = {
                milestone_id: Number(m.id),
                lead_id: Number(m.lead_id),
                customer: lead.company_name || '—',
                product: lead.product_name || '—',
                milestone: m.pt_name || '—',
                owner_name: `${lead.owner_first || ''} ${lead.owner_last || ''}`.trim() || '—',
            };
            // Collections are read on the effective due date — Revised EDC when the
            // milestone carries one, otherwise the original EDC.
            const effectiveEdc = m.revised_edc || m.edc;
            // Stuck milestones aren't expected to be collected — exclude them from the
            // collections buckets only, same as the Cash Flow Report's summary totals.
            // POA buckets are unaffected — POA tracking is independent of collection status.
            if (collectionStatus !== FULLY_PAID_STATUS && collectionStatus !== 'Stuck') {
                const collectionRow = {
                    ...base,
                    expected_amount: expected,
                    pending_amount: Math.max(expected - amounts.already_received, 0),
                    edc: m.edc,
                    revised_edc: m.revised_edc,
                    collection_status: collectionStatus,
                };
                // The Overall bucket covers every pending collection — a milestone with
                // no EDC/REDC is still money owed, so it counts here even though it has
                // no date to place it in the due/overdue buckets.
                overallCashflow.push(collectionRow);
                if (effectiveEdc) {
                    const due = new Date(effectiveEdc).getTime();
                    if (due >= startOfTodayMs && due <= endOfWeekMs) {
                        dueThisWeek.push(collectionRow);
                    }
                    else if (due < startOfTodayMs) {
                        overdueCollections.push({ ...collectionRow, overdue_days: daysBefore(effectiveEdc, startOfTodayMs) });
                    }
                }
            }
            if (m.bant_poa_edc && poaStatus !== COMPLETED_POA_STATUS) {
                const poaDue = new Date(m.bant_poa_edc).getTime();
                const poaRow = { ...base, poa: m.bant_poa || '', poa_edc: m.bant_poa_edc, poa_status: poaStatus };
                if (poaDue >= startOfTodayMs && poaDue < startOfTomorrowMs) {
                    poaDueToday.push(poaRow);
                }
                if (poaDue >= startOfTodayMs && poaDue <= endOfWeekMs) {
                    poaDueThisWeek.push(poaRow);
                }
                if (poaDue < startOfTodayMs) {
                    overduePoa.push({ ...poaRow, overdue_days: daysBefore(m.bant_poa_edc, startOfTodayMs) });
                }
            }
        }
        // Most urgent first inside each overdue bucket, so the tooltip preview shows
        // the records that have been waiting longest.
        overdueCollections.sort((a, b) => b.overdue_days - a.overdue_days);
        overduePoa.sort((a, b) => b.overdue_days - a.overdue_days);
        // The due-this-week bucket has no age to rank by; biggest money first.
        dueThisWeek.sort((a, b) => b.pending_amount - a.pending_amount);
        // The overall bucket mixes every pending collection; biggest money first too.
        overallCashflow.sort((a, b) => b.pending_amount - a.pending_amount);
        res.json({
            overallCashflow: buildActivityBucket(overallCashflow),
            dueThisWeek: buildActivityBucket(dueThisWeek),
            poaDueToday: buildActivityBucket(poaDueToday),
            overdueCollections: buildActivityBucket(overdueCollections),
            poaDueThisWeek: buildActivityBucket(poaDueThisWeek),
            overduePoa: buildActivityBucket(overduePoa),
        });
    }
    catch (err) {
        console.error('[CashflowReport] getCashflowDashboardActivities error:', err);
        res.status(500).json({ message: 'Failed to fetch cash flow activities', detail: err?.message });
    }
};
exports.getCashflowDashboardActivities = getCashflowDashboardActivities;
// A bucket carries its full count and pending total (the card) plus a short
// preview of the records behind it (the tooltip).
function buildActivityBucket(items) {
    return {
        count: items.length,
        pendingAmount: items.reduce((s, i) => s + Number(i.pending_amount || 0), 0),
        items: items.slice(0, ACTIVITY_PREVIEW_LIMIT),
    };
}
function emptyActivitiesResponse() {
    const empty = { count: 0, pendingAmount: 0, items: [] };
    return { overallCashflow: empty, dueThisWeek: empty, poaDueToday: empty, overdueCollections: empty, poaDueThisWeek: empty, overduePoa: empty };
}
