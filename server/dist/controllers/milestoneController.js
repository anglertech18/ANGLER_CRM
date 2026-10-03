"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderWonClientCompanies = exports.getOrderWonLeadsWithMilestones = exports.getMilestoneBantPoaHistory = exports.getMilestonePaymentHistory = exports.updateMilestone = exports.saveLeadMilestones = exports.getLeadMilestones = void 0;
const prisma_1 = require("../lib/prisma");
const dateFilters_1 = require("../utils/dateFilters");
const cashflowMilestones_1 = require("../utils/cashflowMilestones");
const teamScope_1 = require("../utils/teamScope");
const computeStatus = (expected, actual) => {
    if (!actual || actual === 0)
        return 'Yet To Start';
    if (actual >= expected)
        return 'Completed';
    return 'In Progress';
};
const computeAging = (edc, revisedEdc) => {
    const ref = revisedEdc || edc;
    if (!ref)
        return null;
    const diff = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
};
const VALID_POA_STATUSES = ['Pending', 'In Progress', 'Completed'];
const AUTO_COLLECTION_STATUSES = ['Pending', 'Partial Paid', 'Fully Paid']; // Stuck is manual-only
const VALID_COLLECTION_STATUSES = [...AUTO_COLLECTION_STATUSES, 'Stuck'];
// Stuck is sticky: once a user manually sets it, it is never auto-recalculated
// away until they manually pick a different Collection Status — except Fully
// Paid always wins once the milestone is fully collected (CR9: the milestone
// becomes read-only at that point, so Stuck can no longer apply).
const computeCollectionStatus = (expected, totalCollected, currentStatus) => {
    if (totalCollected >= expected && expected > 0)
        return 'Fully Paid';
    if (currentStatus === 'Stuck')
        return 'Stuck';
    if (!totalCollected || totalCollected <= 0)
        return 'Pending';
    return 'Partial Paid';
};
const isPastDate = (d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cmp = new Date(d);
    cmp.setHours(0, 0, 0, 0);
    return cmp.getTime() < today.getTime();
};
const isFutureDate = (d) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(d).getTime() > today.getTime();
};
const formatMilestone = (m) => {
    const expected = Number(m.expected_amount) || 0;
    const actual = Number(m.actual_amount) || 0;
    return {
        ...m,
        payment_type: m.payment_type_id ? { id: m.payment_type_id, name: m.pt_name || null } : null,
        aging: computeAging(m.edc, m.revised_edc),
        pending_amount: m.expected_amount != null ? expected - actual : null,
        is_fully_collected: expected > 0 && actual >= expected - 0.01,
    };
};
// Recomputes a milestone's cumulative received amount from its payment history,
// so lead_milestone.actual_amount never has to be trusted as the source of truth.
const recomputeReceivedFromHistory = async (mid) => {
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(collected_amount), 0) AS total FROM lead_milestone_payment_history WHERE lead_milestone_id = ?`, mid);
    return Number(rows[0]?.total || 0);
};
const logPaymentHistory = async (params) => {
    const { milestoneId, leadId, amount, collectedById, remarks, collectionDate } = params;
    if (!amount || amount <= 0)
        return;
    try {
        await prisma_1.prisma.leadMilestonePaymentHistory.create({
            data: {
                lead_milestone_id: milestoneId,
                lead_id: leadId,
                collected_amount: amount,
                collected_by_id: collectedById,
                remarks: remarks || null,
                ...(collectionDate ? { collection_date: collectionDate } : {}),
            },
        });
    }
    catch (error) {
        console.error('[logPaymentHistory] Failed to log payment history:', error);
    }
};
const logBantPoaHistory = async (params) => {
    const { milestoneId, leadId, bantPoa, bantPoaEdc, poaStatus, updatedById } = params;
    try {
        await prisma_1.prisma.leadMilestoneBantPoaHistory.create({
            data: {
                lead_milestone_id: milestoneId,
                lead_id: leadId,
                bant_poa: bantPoa,
                bant_poa_edc: bantPoaEdc,
                poa_status: poaStatus,
                updated_by_id: updatedById,
            },
        });
    }
    catch (error) {
        console.error('[logBantPoaHistory] Failed to log BANT POA history:', error);
    }
};
// Shared RBAC + existence check for a milestone. Writes the error response itself
// and returns null when access should be denied, so callers can just early-return.
const assertMilestoneAccess = async (mid, user, res) => {
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT lm.*, l.lead_owner_id FROM lead_milestone lm
         JOIN lead l ON lm.lead_id = l.id
         WHERE lm.id = ?`, mid);
    if (!rows.length) {
        res.status(404).json({ success: false, message: 'Milestone not found' });
        return null;
    }
    const existing = rows[0];
    const ownerId = Number(existing.lead_owner_id);
    if (user.role === 'SalesPerson') {
        if (ownerId !== user.id) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return null;
        }
    }
    else if (user.role === 'SalesManager') {
        const teamIds = await (0, teamScope_1.getTeamIds)(user);
        if (!teamIds.includes(ownerId)) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return null;
        }
    }
    return existing;
};
const getLeadMilestones = async (req, res) => {
    try {
        const lead_id = parseInt(req.params.id);
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT lm.*, pt.name AS pt_name FROM lead_milestone lm
             LEFT JOIN paymenttype pt ON lm.payment_type_id = pt.id
             WHERE lm.lead_id = ? ORDER BY lm.id ASC`, lead_id);
        res.json(rows.map(formatMilestone));
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch milestones', detail: err?.message });
    }
};
exports.getLeadMilestones = getLeadMilestones;
// Saves the milestone plan/template for a lead (percentages, expected amounts, EDCs,
// payment types). Upserts by the milestone's own id instead of delete+reinsert so that
// actual_amount / bant_poa / bant_poa_edc / status / payment & BANT POA history for
// milestones that already have collections are never wiped out by re-saving the plan.
// Keying on id (not payment_type_id) is what allows a lead to hold several milestones
// that share a payment type — and any number of rows whose type is still unset — instead
// of every such row collapsing onto the first one and silently never being created.
const saveLeadMilestones = async (req, res) => {
    try {
        const lead_id = parseInt(req.params.id);
        const milestones = req.body.milestones || [];
        const now = new Date();
        const leadRows = await prisma_1.prisma.$queryRawUnsafe('SELECT `order_value` FROM `lead` WHERE `id` = ?', lead_id);
        const orderValue = Number(leadRows[0]?.order_value || 0);
        const totalExpected = milestones.reduce((sum, m) => sum + (parseFloat(m.expected_amount) || 0), 0);
        // Amount is authoritative: when an Order Value exists, derive the total
        // percentage from the (exact) amount total rather than summing each row's
        // client-rounded percentage — otherwise splits like /6 or /7 round each row
        // up and the sum trips this check even though the amounts are within the
        // Order Value. Mirrors the same fix on the client (OrderWonLeadView/LeadForm).
        const totalPercentage = orderValue > 0
            ? (totalExpected / orderValue) * 100
            : milestones.reduce((sum, m) => sum + (parseFloat(m.percentage) || 0), 0);
        for (const m of milestones) {
            if ((parseFloat(m.expected_amount) || 0) <= 0) {
                return res.status(400).json({ message: 'Expected Amount must be greater than 0 for every milestone.' });
            }
            if (!m.edc) {
                return res.status(400).json({ message: 'Please select an EDC for all milestones.' });
            }
        }
        if (orderValue > 0 && totalExpected > orderValue + 0.01) {
            return res.status(400).json({ message: 'Total milestone expected amount cannot exceed the Order Value.' });
        }
        if (totalPercentage > 100.01) {
            return res.status(400).json({ message: 'Total milestone percentage cannot exceed 100%.' });
        }
        const existingRows = await prisma_1.prisma.$queryRawUnsafe(`SELECT id, payment_type_id, actual_amount FROM lead_milestone WHERE lead_id = ?`, lead_id);
        const existingById = new Map();
        for (const row of existingRows) {
            existingById.set(Number(row.id), row);
        }
        const keptIds = new Set();
        for (const m of milestones) {
            const expected = parseFloat(m.expected_amount) || 0;
            const percentage = m.percentage != null && m.percentage !== '' ? parseFloat(m.percentage) : null;
            const edc = m.edc ? new Date(m.edc) : null;
            const paymentTypeId = m.payment_type_id ? parseInt(m.payment_type_id) : null;
            const incomingId = m.id != null && m.id !== '' ? parseInt(String(m.id)) : NaN;
            const existing = !isNaN(incomingId) ? existingById.get(incomingId) : undefined;
            if (existing) {
                keptIds.add(Number(existing.id));
                await prisma_1.prisma.$executeRawUnsafe(`UPDATE lead_milestone SET payment_type_id=?, percentage=?, expected_amount=?, edc=?, updated_at=? WHERE id=?`, paymentTypeId, percentage, expected || null, edc, now, existing.id);
            }
            else {
                const status = computeStatus(expected, 0);
                await prisma_1.prisma.$executeRawUnsafe(`INSERT INTO lead_milestone (lead_id, payment_type_id, percentage, expected_amount, actual_amount, edc, revised_edc, bant_poa, bant_poa_edc, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 0, ?, NULL, NULL, NULL, ?, ?, ?)`, lead_id, paymentTypeId, percentage, expected || null, edc, status, now, now);
            }
        }
        // Only remove milestones that are no longer in the plan, and only when they have
        // no collected money and no history — otherwise skip the delete so collection /
        // BANT POA audit data is never silently destroyed.
        for (const row of existingRows) {
            if (keptIds.has(Number(row.id)))
                continue;
            const hasHistory = await prisma_1.prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM lead_milestone_payment_history WHERE lead_milestone_id = ?
                 UNION ALL
                 SELECT COUNT(*) FROM lead_milestone_bant_poa_history WHERE lead_milestone_id = ?`, row.id, row.id);
            const totalHistory = hasHistory.reduce((sum, r) => sum + Number(r.cnt || 0), 0);
            const hasCollectedAmount = Number(row.actual_amount || 0) > 0;
            if (hasCollectedAmount || totalHistory > 0) {
                console.warn(`[saveLeadMilestones] Skipped deleting lead_milestone ${row.id} (lead ${lead_id}): has collected amount or history.`);
                continue;
            }
            await prisma_1.prisma.$executeRawUnsafe(`DELETE FROM lead_milestone WHERE id = ?`, row.id);
        }
        const saved = await prisma_1.prisma.$queryRawUnsafe(`SELECT lm.*, pt.name AS pt_name FROM lead_milestone lm
             LEFT JOIN paymenttype pt ON lm.payment_type_id = pt.id
             WHERE lm.lead_id = ? ORDER BY lm.id ASC`, lead_id);
        res.json(saved.map(formatMilestone));
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to save milestones', detail: err?.message });
    }
};
exports.saveLeadMilestones = saveLeadMilestones;
const updateMilestone = async (req, res) => {
    try {
        const mid = parseInt(req.params.mid);
        const user = req.user;
        const { actual_amount, revised_edc, bant_poa, bant_poa_edc, poa_status, collection_status, remarks, collection_date } = req.body;
        const existing = await assertMilestoneAccess(mid, user, res);
        if (!existing)
            return;
        const expected = Number(existing.expected_amount) || 0;
        const existingCumulative = Number(existing.actual_amount) || 0;
        const existingPending = expected - existingCumulative;
        const EPSILON = 0.01;
        // actual_amount from the client is the NEW payment entered this save, not the
        // cumulative total — it gets appended to history rather than overwriting.
        const hasAmountInput = actual_amount != null && actual_amount !== '';
        const newPaymentAmount = hasAmountInput ? parseFloat(actual_amount) : 0;
        // CR9: once a milestone is fully collected, all financial fields (new
        // collections, Revised EDC, Collection Status) become read-only — only
        // Cashflow POA / POA Status / POA EDC may still change. Enforced here so
        // the frontend disabling inputs is never the only line of defense.
        const isFullyCollected = expected > 0 && existingCumulative >= expected - EPSILON;
        if (isFullyCollected) {
            const attemptsFinancialChange = hasAmountInput
                || revised_edc !== undefined
                || (collection_status !== undefined && collection_status);
            if (attemptsFinancialChange) {
                return res.status(400).json({ success: false, message: 'Milestone is fully collected and read-only for financial fields.' });
            }
        }
        if (hasAmountInput) {
            if (isNaN(newPaymentAmount) || newPaymentAmount < 0) {
                return res.status(400).json({ success: false, message: 'Current Collection Amount must be a valid non-negative number.' });
            }
            if (existingCumulative > expected + EPSILON) {
                return res.status(400).json({ success: false, message: 'Already Received Amount exceeds Expected Amount. Please contact admin to correct historical data.' });
            }
            if (newPaymentAmount > existingPending + EPSILON) {
                return res.status(400).json({ success: false, message: `Current Collection Amount (₹${newPaymentAmount}) cannot exceed Pending Amount (₹${existingPending}).` });
            }
            if (existingCumulative + newPaymentAmount > expected + EPSILON) {
                return res.status(400).json({ success: false, message: `Already Received Amount + Current Collection Amount cannot exceed Expected Amount (₹${expected}).` });
            }
        }
        let revisedDate = null;
        if (revised_edc !== undefined && revised_edc) {
            revisedDate = new Date(revised_edc);
            if (isNaN(revisedDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid Revised EDC date.' });
            }
            if (isPastDate(revisedDate)) {
                return res.status(400).json({ success: false, message: "Revised EDC cannot be earlier than today's date." });
            }
        }
        if (poa_status !== undefined && poa_status && !VALID_POA_STATUSES.includes(poa_status)) {
            return res.status(400).json({ success: false, message: 'Invalid POA Status value.' });
        }
        if (collection_status !== undefined && collection_status && !VALID_COLLECTION_STATUSES.includes(collection_status)) {
            return res.status(400).json({ success: false, message: 'Invalid Collection Status value.' });
        }
        // POA notes and POA EDC travel together: a milestone left holding POA notes must
        // also carry the date they are promised for, otherwise the POA is invisible to
        // every EDC filter and report. Checked against the resolved after-save state, so
        // clearing only the EDC on a milestone that keeps its notes is rejected too.
        // Gated on the request actually touching a POA field — legacy rows saved before
        // this rule may hold notes without an EDC, and an unrelated save (a collection,
        // a revised EDC) must not be blocked by data the user is not editing here.
        if (bant_poa !== undefined || bant_poa_edc !== undefined) {
            const resolvedPoa = bant_poa !== undefined ? bant_poa : existing.bant_poa;
            const resolvedPoaEdc = bant_poa_edc !== undefined ? bant_poa_edc : existing.bant_poa_edc;
            if (resolvedPoaEdc && isNaN(new Date(resolvedPoaEdc).getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid POA EDC date.' });
            }
            if (String(resolvedPoa ?? '').trim() && !resolvedPoaEdc) {
                return res.status(400).json({ success: false, message: 'POA EDC is required when BANT POA notes are entered.' });
            }
        }
        let collectionDate = null;
        if (collection_date !== undefined && collection_date) {
            collectionDate = new Date(collection_date);
            if (isNaN(collectionDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid Collection Date.' });
            }
            if (isFutureDate(collectionDate)) {
                return res.status(400).json({ success: false, message: 'Collection Date cannot be in the future.' });
            }
        }
        if (newPaymentAmount > 0) {
            await logPaymentHistory({
                milestoneId: mid,
                leadId: existing.lead_id,
                amount: newPaymentAmount,
                collectedById: user?.id ?? null,
                remarks: remarks || null,
                collectionDate,
            });
        }
        const cumulativeActual = await recomputeReceivedFromHistory(mid);
        const status = computeStatus(expected, cumulativeActual);
        const isNowFullyCollected = expected > 0 && cumulativeActual >= expected - EPSILON;
        // Fully Paid always wins once this update completes the milestone (CR9: it
        // becomes read-only from here on, so Stuck can no longer apply even if it
        // was requested in this same call). Otherwise explicit 'Stuck' wins; an
        // explicit auto-family pick also un-sticks a prior 'Stuck'; otherwise
        // recompute from amounts, respecting stickiness.
        const newCollectionStatus = isNowFullyCollected
            ? 'Fully Paid'
            : collection_status === 'Stuck'
                ? 'Stuck'
                : (collection_status && AUTO_COLLECTION_STATUSES.includes(collection_status))
                    ? collection_status
                    : computeCollectionStatus(expected, cumulativeActual, existing.collection_status);
        const newRevisedEdc = revised_edc !== undefined
            ? (revised_edc ? revisedDate : null)
            : existing.revised_edc;
        const newBantPoa = bant_poa !== undefined ? (bant_poa || null) : existing.bant_poa;
        const newBantPoaEdc = bant_poa_edc !== undefined
            ? (bant_poa_edc ? new Date(bant_poa_edc) : null)
            : existing.bant_poa_edc;
        const newPoaStatus = poa_status !== undefined ? (poa_status || 'Pending') : existing.poa_status;
        const bantPoaChanged = (newBantPoa || null) !== (existing.bant_poa || null);
        const bantPoaEdcChanged = String(newBantPoaEdc ? new Date(newBantPoaEdc).toISOString() : '') !==
            String(existing.bant_poa_edc ? new Date(existing.bant_poa_edc).toISOString() : '');
        const poaStatusChanged = (newPoaStatus || null) !== (existing.poa_status || null);
        if (bantPoaChanged || bantPoaEdcChanged || poaStatusChanged) {
            await logBantPoaHistory({
                milestoneId: mid,
                leadId: existing.lead_id,
                bantPoa: newBantPoa,
                bantPoaEdc: newBantPoaEdc,
                poaStatus: newPoaStatus || null,
                updatedById: user?.id ?? null,
            });
        }
        await prisma_1.prisma.$executeRawUnsafe(`UPDATE lead_milestone SET actual_amount=?, revised_edc=?, bant_poa=?, bant_poa_edc=?, poa_status=?, collection_status=?, status=?, updated_at=? WHERE id=?`, cumulativeActual, newRevisedEdc, newBantPoa, newBantPoaEdc, newPoaStatus, newCollectionStatus, status, new Date(), mid);
        const updated = await prisma_1.prisma.$queryRawUnsafe(`SELECT lm.*, pt.name AS pt_name FROM lead_milestone lm
             LEFT JOIN paymenttype pt ON lm.payment_type_id = pt.id
             WHERE lm.id = ?`, mid);
        res.json({ success: true, message: 'Milestone updated successfully', data: formatMilestone(updated[0]) });
    }
    catch (err) {
        console.error('[updateMilestone] error:', err);
        res.status(500).json({ success: false, message: 'Failed to update milestone' });
    }
};
exports.updateMilestone = updateMilestone;
const getMilestonePaymentHistory = async (req, res) => {
    try {
        const mid = parseInt(req.params.mid);
        const user = req.user;
        const existing = await assertMilestoneAccess(mid, user, res);
        if (!existing)
            return;
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT h.*, u.first_name, u.last_name
             FROM lead_milestone_payment_history h
             LEFT JOIN user u ON h.collected_by_id = u.id
             WHERE h.lead_milestone_id = ?
             ORDER BY h.collection_date DESC, h.id DESC`, mid);
        res.json({
            success: true,
            message: 'Payment history fetched',
            data: rows.map(r => ({
                id: Number(r.id),
                collection_date: r.collection_date,
                collected_amount: r.collected_amount,
                collected_by: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : null,
                remarks: r.remarks || null,
                created_at: r.created_at,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
    }
};
exports.getMilestonePaymentHistory = getMilestonePaymentHistory;
const getMilestoneBantPoaHistory = async (req, res) => {
    try {
        const mid = parseInt(req.params.mid);
        const user = req.user;
        const existing = await assertMilestoneAccess(mid, user, res);
        if (!existing)
            return;
        const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT h.*, u.first_name, u.last_name
             FROM lead_milestone_bant_poa_history h
             LEFT JOIN user u ON h.updated_by_id = u.id
             WHERE h.lead_milestone_id = ?
             ORDER BY h.updated_at DESC, h.id DESC`, mid);
        res.json({
            success: true,
            message: 'BANT POA history fetched',
            data: rows.map(r => ({
                id: Number(r.id),
                updated_on: r.updated_at,
                bant_poa: r.bant_poa,
                bant_poa_edc: r.bant_poa_edc,
                poa_status: r.poa_status || null,
                updated_by: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : null,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch BANT POA history' });
    }
};
exports.getMilestoneBantPoaHistory = getMilestoneBantPoaHistory;
const emptyOrderWonResponse = () => ({
    summary: { total_expected: 0, total_collected: 0, balance_amount: 0, stuck_amount: 0 },
    leads: [],
});
const getOrderWonLeadsWithMilestones = async (req, res) => {
    try {
        const user = req.user;
        const { lead_id, milestone_id, product_id, bde_id, client_company_id, edc_status, quick_filter, month, quarter, from_date, to_date, collection_status, poa_status, not_overdue, poa_from_date, poa_to_date } = req.query;
        const collectionStatusFilter = (0, cashflowMilestones_1.parseStatusFilter)(collection_status);
        const poaStatusFilter = (0, cashflowMilestones_1.parseStatusFilter)(poa_status);
        // Mirrors the dashboard's "Existing EDC Milestones" KPI (CR12): original
        // EDC not yet passed and never revised.
        const notOverdueOnly = not_overdue === '1' || not_overdue === 'true';
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const conditions = [`l.quadrant = 'Order Won'`];
        const args = [];
        // Deep-links the Dashboard's Cash Flow Activities tooltip straight to the one
        // lead a clicked item belongs to — narrowed by RBAC below same as every
        // other filter, so it can never surface a lead outside the caller's scope.
        if (lead_id) {
            conditions.push('l.id = ?');
            args.push(parseInt(lead_id));
        }
        if (product_id) {
            conditions.push('l.product_id = ?');
            args.push(parseInt(product_id));
        }
        if (client_company_id) {
            conditions.push('l.client_company_id = ?');
            args.push(parseInt(client_company_id));
        }
        // RBAC filtering by role
        if (user.role === 'SalesPerson') {
            // SalesPerson sees only their own leads; bde_id from query is ignored for security
            conditions.push('l.lead_owner_id = ?');
            args.push(user.id);
        }
        else if (user.role === 'SalesManager') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (bde_id) {
                const reqBdeId = parseInt(bde_id);
                // Reject if requested BDE is outside the manager's team
                if (!teamIds.includes(reqBdeId))
                    return res.json(emptyOrderWonResponse());
                conditions.push('l.lead_owner_id = ?');
                args.push(reqBdeId);
            }
            else {
                if (teamIds.length) {
                    conditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
                }
            }
        }
        else {
            // CEO: apply bde_id filter if provided, otherwise see all
            if (bde_id) {
                conditions.push('l.lead_owner_id = ?');
                args.push(parseInt(bde_id));
            }
        }
        const where = conditions.join(' AND ');
        const leads = await prisma_1.prisma.$queryRawUnsafe(`SELECT l.id, l.company_name, l.project_name, l.product_id, l.lead_owner_id, l.order_value,
                    u.first_name AS owner_first, u.last_name AS owner_last,
                    p.name AS product_name
             FROM lead l
             LEFT JOIN user u ON l.lead_owner_id = u.id
             LEFT JOIN product p ON l.product_id = p.id
             WHERE ${where}
             ORDER BY l.company_name ASC`, ...args);
        if (!leads.length)
            return res.json(emptyOrderWonResponse());
        const leadIds = leads.map((l) => Number(l.id));
        // Filtering + amount calculations use the same shared logic as Cashflow Report
        // (getFilteredMilestonesForLeads) so the two modules never diverge in their numbers.
        const edcStatus = edc_status || 'all';
        // Cashflow Tracker's date filter narrows the milestone list itself, by the
        // milestone's effective due date (Revised EDC, falling back to EDC).
        const dateWindows = (0, dateFilters_1.resolveDateWindows)(quick_filter, month);
        const quarterWindows = (0, dateFilters_1.resolveQuarterWindows)(quarter);
        const dateRange = (0, dateFilters_1.resolveDateRange)(from_date, to_date);
        // POA EDC From/To — gates on the milestone's own POA EDC (bant_poa_edc),
        // independently of the collection EDC range above. Mirrors the Cashflow
        // Report's poa_from_date/poa_to_date filter.
        const poaDateRange = (0, dateFilters_1.resolveDateRange)(poa_from_date, poa_to_date);
        const filtered = await (0, cashflowMilestones_1.getFilteredMilestonesForLeads)(leadIds, edcStatus, dateWindows, true, quarterWindows, dateRange, poaDateRange);
        const { allTimeCollectedByMilestone, periodCollectedByMilestone, useWindow } = filtered;
        // CR11: Collection Status / POA Status multi-select filters, applied on the
        // effective (derived) Collection Status so a milestone that just became
        // fully collected is filterable as "Fully Paid" even if the stored column
        // hasn't caught up yet — mirrors the precedence used when persisting
        // collection_status in updateMilestone.
        let milestones = (collectionStatusFilter || poaStatusFilter || notOverdueOnly)
            ? filtered.milestones.filter((m) => {
                if (notOverdueOnly) {
                    if (m.revised_edc)
                        return false;
                    if (!m.edc || new Date(m.edc) < todayStart)
                        return false;
                }
                const periodAmounts = (0, cashflowMilestones_1.computeMilestonePeriodAmounts)(Number(m.id), Number(m.expected_amount || 0), filtered);
                const status = (0, cashflowMilestones_1.effectiveCollectionStatus)(m.collection_status, periodAmounts.is_fully_collected);
                return (0, cashflowMilestones_1.matchesStatusFilters)(status, m.poa_status, collectionStatusFilter, poaStatusFilter);
            })
            : filtered.milestones;
        // Deep-links the Dashboard's Cash Flow Activities tooltip to the exact
        // milestone a clicked item belongs to — not just its lead — so the Tracker
        // shows that one record alone rather than every milestone under the lead.
        if (milestone_id) {
            const targetId = parseInt(milestone_id);
            milestones = milestones.filter((m) => Number(m.id) === targetId);
        }
        const milestonesByLead = new Map();
        for (const m of milestones) {
            const leadId = Number(m.lead_id);
            if (!milestonesByLead.has(leadId))
                milestonesByLead.set(leadId, []);
            milestonesByLead.get(leadId).push(m);
        }
        // CR9: dashboard cards are period-based — Total Expected is the sum of each
        // milestone's Month Target (expected amount minus what was already collected
        // before the selected window), Total Collected is the sum of what was
        // collected within the window, and Total Balance is their difference. This
        // mirrors the per-row Period Expected/Collected/Pending columns exactly.
        //
        // Stuck rule: a milestone whose effective Collection Status is Stuck always
        // contributes its already-collected money to Total Collected (money already
        // received is never un-received), but never contributes to Total Expected or
        // Total Balance — that outstanding amount is not expected to be collected.
        // Stuck Amount is the sum of their Period Pending, surfaced separately.
        let totalExpected = 0;
        let totalCollected = 0;
        let totalPending = 0;
        let totalStuck = 0;
        for (const m of milestones) {
            const periodAmounts = (0, cashflowMilestones_1.computeMilestonePeriodAmounts)(Number(m.id), Number(m.expected_amount || 0), filtered);
            totalCollected += periodAmounts.period_collected;
            const status = (0, cashflowMilestones_1.effectiveCollectionStatus)(m.collection_status, periodAmounts.is_fully_collected);
            if (status !== 'Stuck') {
                totalExpected += periodAmounts.period_expected;
                totalPending += periodAmounts.period_pending;
            }
            else {
                totalStuck += periodAmounts.period_pending;
            }
        }
        const result = leads
            .map((l) => {
            const leadMilestones = milestonesByLead.get(Number(l.id)) || [];
            if (!leadMilestones.length)
                return null;
            const expectedAmount = leadMilestones.reduce((s, m) => s + Number(m.expected_amount || 0), 0);
            const alreadyReceived = leadMilestones.reduce((s, m) => s + (allTimeCollectedByMilestone.get(Number(m.id)) || 0), 0);
            const currentPeriodCollection = useWindow
                ? leadMilestones.reduce((s, m) => s + (periodCollectedByMilestone.get(Number(m.id)) || 0), 0)
                : alreadyReceived;
            const pendingAmount = expectedAmount - alreadyReceived;
            const lastEdc = leadMilestones.reduce((latest, m) => {
                const ref = m.revised_edc || m.edc;
                if (!ref)
                    return latest;
                const refDate = new Date(ref);
                return !latest || refDate > latest ? refDate : latest;
            }, null);
            return {
                id: Number(l.id),
                company_name: l.company_name || '—',
                project_name: l.project_name || null,
                product: l.product_name ? { id: l.product_id, name: l.product_name } : null,
                owner: l.owner_first ? { id: l.lead_owner_id, first_name: l.owner_first, last_name: l.owner_last } : null,
                order_value: l.order_value,
                total_milestones: leadMilestones.length,
                expected_amount: expectedAmount,
                already_received: alreadyReceived,
                current_period_collection: currentPeriodCollection,
                pending_amount: pendingAmount,
                last_edc: lastEdc,
                milestones: leadMilestones.map((m) => {
                    const periodAmounts = (0, cashflowMilestones_1.computeMilestonePeriodAmounts)(Number(m.id), Number(m.expected_amount || 0), filtered);
                    return {
                        ...formatMilestone(m),
                        ...periodAmounts,
                        pending_amount: Number(m.expected_amount || 0) - periodAmounts.already_received,
                    };
                }),
            };
        })
            .filter((l) => l !== null)
            .sort((a, b) => {
            const aTime = a.last_edc ? new Date(a.last_edc).getTime() : 0;
            const bTime = b.last_edc ? new Date(b.last_edc).getTime() : 0;
            return bTime - aTime;
        });
        res.json({
            summary: {
                total_expected: totalExpected,
                total_collected: totalCollected,
                balance_amount: totalPending,
                stuck_amount: totalStuck,
            },
            leads: result,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch leads', detail: err?.message });
    }
};
exports.getOrderWonLeadsWithMilestones = getOrderWonLeadsWithMilestones;
// Client Company filter — the Cashflow Tracker's Client Company dropdown must list
// only client companies with at least one Order Won milestone matching the current
// Product/BDE selection (clientcomFilter.md), instead of the full Client Company
// master. Scoped by the same RBAC visibility rules as getOrderWonLeadsWithMilestones.
const getOrderWonClientCompanies = async (req, res) => {
    try {
        const user = req.user;
        const { product_id, bde_id } = req.query;
        const conditions = [`l.quadrant = 'Order Won'`, 'l.client_company_id IS NOT NULL'];
        const args = [];
        if (product_id) {
            conditions.push('l.product_id = ?');
            args.push(parseInt(product_id));
        }
        if (user.role === 'SalesPerson') {
            conditions.push('l.lead_owner_id = ?');
            args.push(user.id);
        }
        else if (user.role === 'SalesManager') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (bde_id) {
                const reqBdeId = parseInt(bde_id);
                if (!teamIds.includes(reqBdeId))
                    return res.json([]);
                conditions.push('l.lead_owner_id = ?');
                args.push(reqBdeId);
            }
            else if (teamIds.length) {
                conditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
            }
        }
        else {
            if (bde_id) {
                conditions.push('l.lead_owner_id = ?');
                args.push(parseInt(bde_id));
            }
        }
        const where = conditions.join(' AND ');
        const companies = await prisma_1.prisma.$queryRawUnsafe(`SELECT DISTINCT cc.id, cc.name
             FROM lead l
             INNER JOIN lead_milestone lm ON lm.lead_id = l.id
             INNER JOIN client_company cc ON cc.id = l.client_company_id
             WHERE ${where}
             ORDER BY cc.name ASC`, ...args);
        res.json(companies.map((c) => ({ id: Number(c.id), name: c.name })));
    }
    catch (err) {
        console.error('[getOrderWonClientCompanies] error:', err);
        res.status(500).json({ message: 'Failed to fetch client company filter options', detail: err?.message });
    }
};
exports.getOrderWonClientCompanies = getOrderWonClientCompanies;
