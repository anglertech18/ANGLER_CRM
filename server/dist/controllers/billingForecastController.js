"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingForecastMilestoneCompanies = exports.getBillingForecastMilestoneBdes = exports.getBillingForecastClientCompanies = exports.getBillingForecastBdes = exports.getBillingAchievedReport = exports.saveBillingInvoice = exports.getBillingForecastTracker = exports.addToBillingForecast = exports.getAvailableMilestones = exports.searchBillingCompanies = void 0;
const prisma_1 = require("../lib/prisma");
const dateFilters_1 = require("../utils/dateFilters");
const teamScope_1 = require("../utils/teamScope");
const authUser = (req) => req.user;
// "which leads is this user allowed to see" — shared rule (see utils/teamScope):
// SalesPerson sees only their own leads, SalesManager sees self + their entire
// downward reporting tree, everyone else (CEO / management) is unscoped.
//
// Billing Forecast Privileges — Management Access: when granted, the reporting
// hierarchy is bypassed entirely for the assigned companies (any BDE's records
// are visible), scoped by the record's BU company (product.company_id), same
// field the "Our Company" filter already uses. Mirrors the Cashflow Report
// Management Access pattern (cashflowReportController.ts).
async function getManagementAccess(user) {
    if (!user.billing_forecast_management_access)
        return { enabled: false, companyIds: [] };
    const rows = await prisma_1.prisma.billingForecastManagementCompany.findMany({
        where: { user_id: user.id },
        select: { company_id: true },
    });
    const companyIds = rows.map((r) => r.company_id);
    return { enabled: companyIds.length > 0, companyIds };
}
// Builds the RBAC portion of a lead WHERE clause. Requires every query using it
// to join `product p ON p.id = l.product_id` (LEFT is fine), since Management
// Access scopes by p.company_id. Returns `denied: true` when an explicitly
// requested bde_id/company_id falls outside what the caller is allowed to see,
// so the caller can short-circuit to an empty result instead of leaking data.
async function applyLeadScope(user, bdeId, companyId) {
    const conditions = [];
    const args = [];
    const managementAccess = await getManagementAccess(user);
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
            // companies — validate the requested BDE actually belongs to one of them.
            const reqBdeId = parseInt(bdeId, 10);
            const bdeUser = await prisma_1.prisma.user.findUnique({ where: { id: reqBdeId }, select: { company_id: true } });
            if (!bdeUser || bdeUser.company_id == null || !managementAccess.companyIds.includes(bdeUser.company_id)) {
                return { conditions, args, denied: true };
            }
            conditions.push('l.lead_owner_id = ?');
            args.push(reqBdeId);
        }
        return { conditions, args, denied: false };
    }
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
    return { conditions, args, denied: false };
}
// ── Screen 1 · Billing Forecast Milestones ──────────────────────────────
// Company / Client autocomplete — Order Won leads only (the only leads that
// carry real lead_milestone rows), minimum 3 characters, scoped by RBAC.
const searchBillingCompanies = async (req, res) => {
    try {
        const user = authUser(req);
        const q = String(req.query.q || '').trim();
        if (q.length < 3)
            return res.json([]);
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.json([]);
        const conditions = [`l.quadrant = 'Order Won'`, 'l.client_company_id IS NOT NULL', 'cc.name LIKE ?', ...scope.conditions];
        const args = [`%${q}%`, ...scope.args];
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT cc.id, cc.name
             FROM lead l
             INNER JOIN lead_milestone lm ON lm.lead_id = l.id
             INNER JOIN client_company cc ON cc.id = l.client_company_id
             LEFT JOIN product p ON p.id = l.product_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY cc.name ASC
             LIMIT 20`, ...args);
        res.json(rows.map(r => ({ id: Number(r.id), name: r.name })));
    }
    catch (err) {
        console.error('[searchBillingCompanies] error:', err);
        res.status(500).json({ message: 'Failed to search companies', detail: err?.message });
    }
};
exports.searchBillingCompanies = searchBillingCompanies;
// Milestones available to add to the Billing Forecast, flagged with whether
// they've already been added — the UI disables/hides those rather than
// letting them be selected a second time (unique FK enforces it server-side
// regardless). Only milestones whose collection status is still Pending are
// returned (NULL counts as Pending). With no client_company_id, returns every
// not-yet-added Pending milestone in scope, so the page has a full list to work
// from before anyone types a search; picking a company narrows it down.
const getAvailableMilestones = async (req, res) => {
    try {
        const user = authUser(req);
        const q = req.query;
        const clientCompanyIdRaw = String(q.client_company_id || '').trim();
        const clientCompanyId = clientCompanyIdRaw ? parseInt(clientCompanyIdRaw, 10) : null;
        const scope = await applyLeadScope(user, q.bde_id, q.our_company_id);
        if (scope.denied)
            return res.json([]);
        // Only Pending milestones are planned here — a milestone that has any
        // collection against it (Partial Paid / Stuck / Fully Paid) is no longer
        // a candidate for the Billing Forecast. A freshly-saved milestone has a
        // NULL collection_status, which is treated as Pending.
        const conditions = [
            `l.quadrant = 'Order Won'`,
            `(lm.collection_status IS NULL OR lm.collection_status = 'Pending')`,
            ...scope.conditions,
        ];
        const args = [...scope.args];
        if (clientCompanyId) {
            conditions.push('l.client_company_id = ?');
            args.push(clientCompanyId);
        }
        else {
            // No company filter — this is the default "all incomplete
            // milestones" list, so only show ones not yet added.
            conditions.push('bf.id IS NULL');
        }
        if (q.product_id) {
            conditions.push('l.product_id = ?');
            args.push(parseInt(q.product_id, 10));
        }
        if (q.vertical_id) {
            conditions.push('l.vertical_id = ?');
            args.push(parseInt(q.vertical_id, 10));
        }
        // "Our Company" (BU that owns the product, product.company_id — the same
        // field the Cashflow Report scopes on, not the legacy lead.company_id
        // which is not reliably populated) is applied by applyLeadScope above,
        // both as a plain filter and, for Management Access users, as an RBAC
        // check against their assigned companies.
        if (q.edc_status === 'upcoming') {
            conditions.push('COALESCE(lm.revised_edc, lm.edc) >= CURDATE()');
        }
        else if (q.edc_status === 'expired') {
            conditions.push('COALESCE(lm.revised_edc, lm.edc) < CURDATE()');
        }
        // Duration filter — same Week/Month + Quarter multi-select as the
        // Cashflow Report, each checked option an OR window on the shown EDC.
        const mDurationWindows = [
            ...(0, dateFilters_1.resolveDateWindows)(q.quick_filter, undefined),
            ...(0, dateFilters_1.resolveQuarterWindows)(q.quarter),
        ];
        if (mDurationWindows.length) {
            const ors = mDurationWindows.map(() => '(COALESCE(lm.revised_edc, lm.edc) >= ? AND COALESCE(lm.revised_edc, lm.edc) <= ?)');
            conditions.push(`(${ors.join(' OR ')})`);
            mDurationWindows.forEach(w => { args.push(w.start, w.end); });
        }
        const mEdcRange = (0, dateFilters_1.resolveDateRange)(q.from_date, q.to_date);
        if (mEdcRange?.from) {
            conditions.push('COALESCE(lm.revised_edc, lm.edc) >= ?');
            args.push(mEdcRange.from);
        }
        if (mEdcRange?.to) {
            conditions.push('COALESCE(lm.revised_edc, lm.edc) <= ?');
            args.push(mEdcRange.to);
        }
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT lm.id AS milestone_id, lm.expected_amount, lm.edc, lm.revised_edc, lm.collection_status,
                    l.id AS lead_id, l.company_name, l.project_name,
                    p.name AS product_name, v.name AS vertical_name, pt.name AS milestone_name,
                    bf.id AS billing_forecast_id
             FROM lead_milestone lm
             INNER JOIN lead l ON l.id = lm.lead_id
             LEFT JOIN product p ON p.id = l.product_id
             LEFT JOIN vertical v ON v.id = l.vertical_id
             LEFT JOIN paymenttype pt ON pt.id = lm.payment_type_id
             LEFT JOIN billing_forecast bf ON bf.lead_milestone_id = lm.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY l.project_name ASC, lm.id ASC`, ...args);
        res.json(rows.map(r => ({
            milestone_id: Number(r.milestone_id),
            lead_id: Number(r.lead_id),
            client: r.company_name || '-',
            project: r.project_name || '-',
            vertical: r.vertical_name || '-',
            product: r.product_name || '-',
            milestone: r.milestone_name || '-',
            amount: Number(r.expected_amount || 0),
            edc: r.edc,
            revised_edc: r.revised_edc,
            collection_status: r.collection_status || 'Pending',
            already_added: r.billing_forecast_id != null,
        })));
    }
    catch (err) {
        console.error('[getAvailableMilestones] error:', err);
        res.status(500).json({ message: 'Failed to fetch milestones', detail: err?.message });
    }
};
exports.getAvailableMilestones = getAvailableMilestones;
// Add one or more selected milestones to the Billing Forecast. A milestone can
// only ever be added once (unique FK on lead_milestone_id) — already-added ids
// are silently skipped rather than failing the whole batch, since the UI
// itself prevents re-selecting them and a race is the only way one shows up
// here.
const addToBillingForecast = async (req, res) => {
    try {
        const user = authUser(req);
        const milestoneIds = Array.isArray(req.body.milestone_ids)
            ? req.body.milestone_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
            : [];
        if (!milestoneIds.length)
            return res.status(400).json({ message: 'Select at least one milestone.' });
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.status(403).json({ message: 'Access denied' });
        const conditions = [`l.quadrant = 'Order Won'`, `lm.id IN (${milestoneIds.map(() => '?').join(',')})`, ...scope.conditions];
        const args = [...milestoneIds, ...scope.args];
        const allowed = await prisma_1.prisma.$queryRawUnsafe(`SELECT lm.id
             FROM lead_milestone lm
             INNER JOIN lead l ON l.id = lm.lead_id
             LEFT JOIN product p ON p.id = l.product_id
             LEFT JOIN billing_forecast bf ON bf.lead_milestone_id = lm.id
             WHERE ${conditions.join(' AND ')} AND bf.id IS NULL`, ...args);
        const allowedIds = allowed.map((r) => Number(r.id));
        if (!allowedIds.length) {
            return res.status(400).json({ message: 'The selected milestones are unavailable or already added.' });
        }
        await prisma_1.prisma.billingForecast.createMany({
            data: allowedIds.map(id => ({ lead_milestone_id: id, added_by_id: user.id })),
        });
        res.json({
            success: true,
            message: `${allowedIds.length} milestone${allowedIds.length === 1 ? '' : 's'} added to the Billing Forecast.`,
            added: allowedIds.length,
            skipped: milestoneIds.length - allowedIds.length,
        });
    }
    catch (err) {
        console.error('[addToBillingForecast] error:', err);
        res.status(500).json({ success: false, message: 'Failed to add milestones to the Billing Forecast' });
    }
};
exports.addToBillingForecast = addToBillingForecast;
async function buildTrackerRows(user, q, periodColumn) {
    const scope = await applyLeadScope(user, q.bde_id, q.our_company_id);
    if (scope.denied)
        return { rows: [], denied: false };
    const conditions = [...scope.conditions];
    const args = [...scope.args];
    if (q.status) {
        conditions.push('bf.status = ?');
        args.push(q.status);
    }
    // "Our Company" (BU that owns the product, product.company_id) is applied
    // by applyLeadScope above, both as a plain filter and, for Management
    // Access users, as an RBAC check against their assigned companies.
    if (q.product_id) {
        conditions.push('l.product_id = ?');
        args.push(parseInt(q.product_id, 10));
    }
    if (q.vertical_id) {
        conditions.push('l.vertical_id = ?');
        args.push(parseInt(q.vertical_id, 10));
    }
    if (q.client_company_id) {
        conditions.push('l.client_company_id = ?');
        args.push(parseInt(q.client_company_id, 10));
    }
    if (q.period) {
        const [yr, mo] = q.period.split('-').map(Number);
        if (yr && mo) {
            conditions.push(`${periodColumn} >= ? AND ${periodColumn} <= ?`);
            args.push(new Date(yr, mo - 1, 1), new Date(yr, mo, 0, 23, 59, 59));
        }
    }
    // EDC status filter — same shape as the Milestone Planning screen, but
    // compares the EDC the row actually shows: for an Achieved row that's the
    // recorded payment-collection date, otherwise the (revised) milestone EDC.
    const edcExpr = 'COALESCE(bf.edc_payment_collection, lm.revised_edc, lm.edc)';
    if (q.edc_status === 'upcoming') {
        conditions.push(`${edcExpr} >= CURDATE()`);
    }
    else if (q.edc_status === 'expired') {
        conditions.push(`${edcExpr} < CURDATE()`);
    }
    // Duration filter — same Week/Month + Quarter multi-select as the Cashflow
    // Report. Each checked option contributes its own window on the shown EDC;
    // a row matches if it falls in ANY of them (strict OR).
    const durationWindows = [
        ...(0, dateFilters_1.resolveDateWindows)(q.quick_filter, undefined),
        ...(0, dateFilters_1.resolveQuarterWindows)(q.quarter),
    ];
    if (durationWindows.length) {
        const ors = durationWindows.map(() => `(${edcExpr} >= ? AND ${edcExpr} <= ?)`);
        conditions.push(`(${ors.join(' OR ')})`);
        durationWindows.forEach(w => { args.push(w.start, w.end); });
    }
    // EDC From / To date range — open-ended on either side, on the shown EDC.
    const edcRange = (0, dateFilters_1.resolveDateRange)(q.from_date, q.to_date);
    if (edcRange?.from) {
        conditions.push(`${edcExpr} >= ?`);
        args.push(edcRange.from);
    }
    if (edcRange?.to) {
        conditions.push(`${edcExpr} <= ?`);
        args.push(edcRange.to);
    }
    const where = conditions.length ? conditions.join(' AND ') : '1=1';
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT bf.id AS billing_forecast_id, bf.status, bf.invoice_number, bf.invoice_date, bf.edc_payment_collection,
                lm.id AS milestone_id, lm.expected_amount, lm.edc,
                l.id AS lead_id, l.company_name, l.project_name,
                co.name AS our_company_name, p.name AS product_name, v.name AS vertical_name, pt.name AS milestone_name,
                u.first_name AS bde_first, u.last_name AS bde_last
         FROM billing_forecast bf
         INNER JOIN lead_milestone lm ON lm.id = bf.lead_milestone_id
         INNER JOIN lead l ON l.id = lm.lead_id
         LEFT JOIN product p ON p.id = l.product_id
         LEFT JOIN company co ON co.id = p.company_id
         LEFT JOIN vertical v ON v.id = l.vertical_id
         LEFT JOIN paymenttype pt ON pt.id = lm.payment_type_id
         LEFT JOIN user u ON u.id = l.lead_owner_id
         WHERE ${where}
         ORDER BY bf.created_at DESC`, ...args);
    return { rows, denied: false };
}
const mapTrackerRow = (r) => ({
    billing_forecast_id: Number(r.billing_forecast_id),
    milestone_id: Number(r.milestone_id),
    lead_id: Number(r.lead_id),
    client: r.company_name || '—',
    project: r.project_name || '—',
    our_company: r.our_company_name || '—',
    product: r.product_name || '—',
    vertical: r.vertical_name || '—',
    milestone: r.milestone_name || '—',
    amount: Number(r.expected_amount || 0),
    edc: r.edc,
    bde: r.bde_first ? `${r.bde_first} ${r.bde_last || ''}`.trim() : '—',
    status: r.status,
    invoice_number: r.invoice_number || null,
    invoice_date: r.invoice_date || null,
    edc_payment_collection: r.edc_payment_collection || null,
});
// ── Screen 2 · Billing Forecast Tracker ─────────────────────────────────
const getBillingForecastTracker = async (req, res) => {
    try {
        const user = authUser(req);
        const q = req.query;
        const { rows } = await buildTrackerRows(user, q, 'lm.edc');
        const mapped = rows.map(mapTrackerRow);
        const total = mapped.reduce((s, r) => s + r.amount, 0);
        res.json({ rows: mapped, total_forecast_amount: total });
    }
    catch (err) {
        console.error('[getBillingForecastTracker] error:', err);
        res.status(500).json({ message: 'Failed to fetch the Billing Forecast Tracker', detail: err?.message });
    }
};
exports.getBillingForecastTracker = getBillingForecastTracker;
// Save the invoice details for one forecasted milestone. This is the one
// action that moves a milestone from Forecast to Achieved — deliberately
// one-directional, matching the spec (no revert path in this first version).
const saveBillingInvoice = async (req, res) => {
    try {
        const user = authUser(req);
        const id = parseInt(req.params.id, 10);
        const { invoice_number, invoice_date, edc_payment_collection } = req.body;
        if (!invoice_number || !String(invoice_number).trim()) {
            return res.status(400).json({ success: false, message: 'Invoice Number is required.' });
        }
        if (!invoice_date || isNaN(new Date(invoice_date).getTime())) {
            return res.status(400).json({ success: false, message: 'A valid Invoice Date is required.' });
        }
        if (!edc_payment_collection || isNaN(new Date(edc_payment_collection).getTime())) {
            return res.status(400).json({ success: false, message: 'A valid EDC for Payment Collection is required.' });
        }
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.status(403).json({ success: false, message: 'Access denied' });
        const conditions = ['bf.id = ?', ...scope.conditions];
        const existingRows = await prisma_1.prisma.$queryRawUnsafe(`SELECT bf.id FROM billing_forecast bf
             INNER JOIN lead_milestone lm ON lm.id = bf.lead_milestone_id
             INNER JOIN lead l ON l.id = lm.lead_id
             LEFT JOIN product p ON p.id = l.product_id
             WHERE ${conditions.join(' AND ')}`, id, ...scope.args);
        if (!existingRows.length)
            return res.status(404).json({ success: false, message: 'Billing Forecast entry not found.' });
        const updated = await prisma_1.prisma.billingForecast.update({
            where: { id },
            data: {
                invoice_number: String(invoice_number).trim(),
                invoice_date: new Date(invoice_date),
                edc_payment_collection: new Date(edc_payment_collection),
                status: 'Achieved',
            },
        });
        res.json({ success: true, message: 'Invoice details saved — milestone marked Billing Achieved.', data: updated });
    }
    catch (err) {
        console.error('[saveBillingInvoice] error:', err);
        res.status(500).json({ success: false, message: 'Failed to save invoice details' });
    }
};
exports.saveBillingInvoice = saveBillingInvoice;
// ── Screen 3 · Billing Achieved Report ──────────────────────────────────
const getBillingAchievedReport = async (req, res) => {
    try {
        const user = authUser(req);
        const q = req.query;
        // Forecast total ignores the Achievement Period filter (it filters
        // invoice_date, which Forecast-status rows don't have yet) but honours
        // every entity filter, so "Balance"/"Achievement %" compare like scopes.
        const { rows: forecastScopeRows } = await buildTrackerRows(user, { ...q, period: undefined, status: undefined }, 'lm.edc');
        const forecastTotal = forecastScopeRows.reduce((s, r) => s + Number(r.expected_amount || 0), 0);
        const { rows: achievedRows } = await buildTrackerRows(user, { ...q, status: 'Achieved' }, 'bf.invoice_date');
        const achieved = achievedRows.map(mapTrackerRow);
        const achievedTotal = achieved.reduce((s, r) => s + r.amount, 0);
        const balance = forecastTotal - achievedTotal;
        const achievementPct = forecastTotal > 0 ? Math.round((achievedTotal / forecastTotal) * 1000) / 10 : 0;
        // Pending = still "Forecast" status (not yet invoiced). The Achievement
        // Period filter is EDC-based for these since they carry no invoice_date.
        const { rows: pendingRows } = await buildTrackerRows(user, { ...q, status: 'Forecast' }, 'lm.edc');
        const pending = pendingRows.map(mapTrackerRow);
        const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);
        res.json({
            summary: {
                billing_forecast: forecastTotal,
                billing_achieved: achievedTotal,
                billing_pending: pendingTotal,
                balance,
                achievement_percent: achievementPct,
            },
            pending,
            achieved,
            // Back-compat: previous callers read `rows` as the achieved list.
            rows: achieved,
        });
    }
    catch (err) {
        console.error('[getBillingAchievedReport] error:', err);
        res.status(500).json({ message: 'Failed to fetch the Billing Achieved Report', detail: err?.message });
    }
};
exports.getBillingAchievedReport = getBillingAchievedReport;
// ── Shared filter option lists ──────────────────────────────────────────
const getBillingForecastBdes = async (req, res) => {
    try {
        const user = authUser(req);
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.json([]);
        const where = scope.conditions.length ? scope.conditions.join(' AND ') : '1=1';
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT u.id, u.first_name, u.last_name
             FROM billing_forecast bf
             INNER JOIN lead_milestone lm ON lm.id = bf.lead_milestone_id
             INNER JOIN lead l ON l.id = lm.lead_id
             INNER JOIN user u ON u.id = l.lead_owner_id
             LEFT JOIN product p ON p.id = l.product_id
             WHERE ${where}
             ORDER BY u.first_name ASC`, ...scope.args);
        res.json(rows.map(r => ({ id: Number(r.id), name: `${r.first_name} ${r.last_name || ''}`.trim() })));
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch BDEs', detail: err?.message });
    }
};
exports.getBillingForecastBdes = getBillingForecastBdes;
const getBillingForecastClientCompanies = async (req, res) => {
    try {
        const user = authUser(req);
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.json([]);
        const where = scope.conditions.length ? scope.conditions.join(' AND ') : '1=1';
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT cc.id, cc.name
             FROM billing_forecast bf
             INNER JOIN lead_milestone lm ON lm.id = bf.lead_milestone_id
             INNER JOIN lead l ON l.id = lm.lead_id
             INNER JOIN client_company cc ON cc.id = l.client_company_id
             LEFT JOIN product p ON p.id = l.product_id
             WHERE ${where}
             ORDER BY cc.name ASC`, ...scope.args);
        res.json(rows.map(r => ({ id: Number(r.id), name: r.name })));
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch client companies', detail: err?.message });
    }
};
exports.getBillingForecastClientCompanies = getBillingForecastClientCompanies;
// Milestones-screen (Screen 1) filter option lists — scoped to every Order Won
// lead with milestones, not just ones already pulled into the Billing
// Forecast, since that screen's whole point is to surface milestones *before*
// they're added.
const getBillingForecastMilestoneBdes = async (req, res) => {
    try {
        const user = authUser(req);
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.json([]);
        const conditions = [`l.quadrant = 'Order Won'`, ...scope.conditions];
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT u.id, u.first_name, u.last_name
             FROM lead_milestone lm
             INNER JOIN lead l ON l.id = lm.lead_id
             INNER JOIN user u ON u.id = l.lead_owner_id
             LEFT JOIN product p ON p.id = l.product_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY u.first_name ASC`, ...scope.args);
        res.json(rows.map(r => ({ id: Number(r.id), name: `${r.first_name} ${r.last_name || ''}`.trim() })));
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch BDEs', detail: err?.message });
    }
};
exports.getBillingForecastMilestoneBdes = getBillingForecastMilestoneBdes;
// Distinct "our companies" the caller actually has Order Won milestones under.
// The Screen 1 UI only shows the Our Company filter when this returns more than
// one — a BDE mapped to a single company has nothing to choose, so the UI
// hides the filter and just scopes to that lone company instead.
const getBillingForecastMilestoneCompanies = async (req, res) => {
    try {
        const user = authUser(req);
        const scope = await applyLeadScope(user);
        if (scope.denied)
            return res.json([]);
        // "Our Company" = the BU that owns the product (product.company_id),
        // matching the filter applied in getAvailableMilestones.
        const conditions = [`l.quadrant = 'Order Won'`, `p.company_id IS NOT NULL`, ...scope.conditions];
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT co.id, co.name
             FROM lead_milestone lm
             INNER JOIN lead l ON l.id = lm.lead_id
             INNER JOIN product p ON p.id = l.product_id
             INNER JOIN company co ON co.id = p.company_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY co.name ASC`, ...scope.args);
        res.json(rows.map(r => ({ id: Number(r.id), name: r.name })));
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch companies', detail: err?.message });
    }
};
exports.getBillingForecastMilestoneCompanies = getBillingForecastMilestoneCompanies;
