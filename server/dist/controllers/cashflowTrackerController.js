"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCashflowTracker = exports.updateCashflowTracker = exports.createCashflowTracker = exports.getCashflowTrackerById = exports.getCashflowTrackers = void 0;
const prisma_1 = require("../lib/prisma");
const teamScope_1 = require("../utils/teamScope");
const authUser = (req) => req.user;
function computeMilestoneStatus(expected, received) {
    if (!received || received === 0)
        return 'Yet To Start';
    if (received >= expected && expected > 0)
        return 'Completed';
    return 'In Progress';
}
async function canAccessCashflowTracker(id, user) {
    if (user.role === 'CEO')
        return true;
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT executive_id FROM cashflow_tracker WHERE id = ?`, id);
    if (!rows.length)
        return false;
    const execId = Number(rows[0].executive_id);
    const teamIds = await (0, teamScope_1.getTeamIds)(user);
    return teamIds.includes(execId);
}
const SELECT_COLS = `
    ct.id, ct.executive_id, ct.product_id, ct.client_company_id, ct.vertical_id, ct.payment_type_id,
    ct.expected_cashflow, ct.actual_received, ct.monthly_stretch_target,
    ct.edc, ct.revised_edc, ct.bant_poa, ct.bant_poa_edc, ct.notes,
    ct.created_at, ct.updated_at,
    u.id AS exec_id, u.first_name AS exec_first_name, u.last_name AS exec_last_name,
    cc.name AS client_name,
    v.name AS vertical_name,
    pt.name AS payment_type_name,
    p.name AS product_name
`;
const JOINS = `
    LEFT JOIN user u ON ct.executive_id = u.id
    LEFT JOIN client_company cc ON ct.client_company_id = cc.id
    LEFT JOIN vertical v ON ct.vertical_id = v.id
    LEFT JOIN paymenttype pt ON ct.payment_type_id = pt.id
    LEFT JOIN product p ON ct.product_id = p.id
`;
function formatRow(t) {
    return {
        id: t.id,
        executive_id: t.executive_id,
        product_id: t.product_id,
        client_company_id: t.client_company_id,
        vertical_id: t.vertical_id,
        payment_type_id: t.payment_type_id,
        expected_cashflow: t.expected_cashflow,
        actual_received: t.actual_received,
        monthly_stretch_target: t.monthly_stretch_target,
        edc: t.edc,
        revised_edc: t.revised_edc,
        bant_poa: t.bant_poa,
        bant_poa_edc: t.bant_poa_edc,
        notes: t.notes,
        created_at: t.created_at,
        updated_at: t.updated_at,
        executive: t.exec_id ? { id: t.exec_id, first_name: t.exec_first_name, last_name: t.exec_last_name } : null,
        product: t.product_name ? { id: t.product_id, name: t.product_name } : null,
        client_company: t.client_name ? { id: t.client_company_id, name: t.client_name } : null,
        vertical: t.vertical_name ? { id: t.vertical_id, name: t.vertical_name } : null,
        payment_type: t.payment_type_name ? { id: t.payment_type_id, name: t.payment_type_name } : null,
        milestones: [],
    };
}
const getCashflowTrackers = async (req, res) => {
    try {
        const user = authUser(req);
        const { executive_id, product_id, vertical_id, payment_type_id, date_from, date_to } = req.query;
        const conditions = [];
        const args = [];
        // RBAC: restrict visible records by role
        if (user.role === 'SalesPerson') {
            conditions.push('ct.executive_id = ?');
            args.push(user.id);
        }
        else if (user.role === 'SalesManager') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (executive_id) {
                const reqId = parseInt(executive_id);
                if (!teamIds.includes(reqId)) {
                    return res.json({ data: [], summary: { totalExpected: 0, totalReceived: 0, pending: 0 } });
                }
                conditions.push('ct.executive_id = ?');
                args.push(reqId);
            }
            else {
                if (teamIds.length) {
                    conditions.push(`ct.executive_id IN (${teamIds.join(',')})`);
                }
            }
        }
        else {
            // CEO: honour explicit executive_id filter if provided
            if (executive_id) {
                conditions.push('ct.executive_id = ?');
                args.push(parseInt(executive_id));
            }
        }
        if (product_id) {
            conditions.push('ct.product_id = ?');
            args.push(parseInt(product_id));
        }
        if (vertical_id) {
            conditions.push('ct.vertical_id = ?');
            args.push(parseInt(vertical_id));
        }
        if (payment_type_id) {
            conditions.push('ct.payment_type_id = ?');
            args.push(parseInt(payment_type_id));
        }
        if (date_from) {
            conditions.push('ct.edc >= ?');
            args.push(new Date(date_from));
        }
        if (date_to) {
            conditions.push('ct.edc <= ?');
            args.push(new Date(date_to));
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const trackers = await prisma_1.prisma.$queryRawUnsafe(`SELECT ${SELECT_COLS} FROM cashflow_tracker ct ${JOINS} ${where} ORDER BY ct.updated_at DESC`, ...args);
        const formatted = trackers.map(formatRow);
        if (formatted.length > 0) {
            const ids = formatted.map(t => t.id);
            const milestones = await prisma_1.prisma.$queryRawUnsafe(`SELECT * FROM cashflow_milestone WHERE cashflow_tracker_id IN (${ids.join(',')}) ORDER BY id ASC`);
            for (const t of formatted) {
                t.milestones = milestones.filter((m) => Number(m.cashflow_tracker_id) === t.id);
            }
        }
        const totalExpected = formatted.reduce((s, t) => s + Number(t.expected_cashflow || 0), 0);
        const totalReceived = formatted.reduce((s, t) => s + Number(t.actual_received || 0), 0);
        res.json({ data: formatted, summary: { totalExpected, totalReceived, pending: totalExpected - totalReceived } });
    }
    catch (err) {
        console.error('[CashflowTracker] getAll error:', err);
        res.status(500).json({ message: 'Failed to fetch cashflow trackers', detail: err?.message });
    }
};
exports.getCashflowTrackers = getCashflowTrackers;
const getCashflowTrackerById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = authUser(req);
        if (!(await canAccessCashflowTracker(id, user))) {
            return res.status(403).json({ message: 'Access denied' });
        }
        await getCashflowTrackerByIdInternal(id, res);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch record', detail: err?.message });
    }
};
exports.getCashflowTrackerById = getCashflowTrackerById;
const createCashflowTracker = async (req, res) => {
    try {
        const user = authUser(req);
        const { product_id, client_company_id, vertical_id, payment_type_id, expected_cashflow, actual_received, monthly_stretch_target, edc, revised_edc, bant_poa, bant_poa_edc, notes, milestones, } = req.body;
        const now = new Date();
        await prisma_1.prisma.$executeRawUnsafe(`
            INSERT INTO cashflow_tracker
                (executive_id, product_id, client_company_id, vertical_id, payment_type_id,
                 expected_cashflow, actual_received, monthly_stretch_target,
                 edc, revised_edc, bant_poa, bant_poa_edc, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, user.id, product_id ? parseInt(product_id) : null, client_company_id ? parseInt(client_company_id) : null, vertical_id ? parseInt(vertical_id) : null, payment_type_id ? parseInt(payment_type_id) : null, parseFloat(expected_cashflow) || 0, parseFloat(actual_received) || 0, monthly_stretch_target ? parseFloat(monthly_stretch_target) : null, edc ? new Date(edc) : null, revised_edc ? new Date(revised_edc) : null, bant_poa || null, bant_poa_edc ? new Date(bant_poa_edc) : null, notes || null, now, now);
        const idRows = await prisma_1.prisma.$queryRawUnsafe(`SELECT LAST_INSERT_ID() AS id`);
        const newId = Number(idRows[0]?.id);
        if (milestones?.length) {
            for (const m of milestones) {
                const expected = parseFloat(m.amount) || 0;
                const received = parseFloat(m.received_amount) || 0;
                const status = computeMilestoneStatus(expected, received);
                await prisma_1.prisma.$executeRawUnsafe(`
                    INSERT INTO cashflow_milestone (cashflow_tracker_id, name, amount, received_amount, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, newId, m.name, expected, received, status, now, now);
            }
        }
        return getCashflowTrackerByIdInternal(newId, res);
    }
    catch (err) {
        console.error('[CashflowTracker] create error:', err);
        res.status(500).json({ message: 'Failed to create record', detail: err?.message });
    }
};
exports.createCashflowTracker = createCashflowTracker;
const updateCashflowTracker = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = authUser(req);
        if (!(await canAccessCashflowTracker(id, user))) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { product_id, client_company_id, vertical_id, payment_type_id, expected_cashflow, actual_received, monthly_stretch_target, edc, revised_edc, bant_poa, bant_poa_edc, notes, milestones, } = req.body;
        const now = new Date();
        await prisma_1.prisma.$executeRawUnsafe(`
            UPDATE cashflow_tracker SET
                product_id = ?, client_company_id = ?, vertical_id = ?, payment_type_id = ?,
                expected_cashflow = ?, actual_received = ?, monthly_stretch_target = ?,
                edc = ?, revised_edc = ?, bant_poa = ?, bant_poa_edc = ?, notes = ?, updated_at = ?
            WHERE id = ?
        `, product_id ? parseInt(product_id) : null, client_company_id ? parseInt(client_company_id) : null, vertical_id ? parseInt(vertical_id) : null, payment_type_id ? parseInt(payment_type_id) : null, parseFloat(expected_cashflow) || 0, parseFloat(actual_received) || 0, monthly_stretch_target ? parseFloat(monthly_stretch_target) : null, edc ? new Date(edc) : null, revised_edc ? new Date(revised_edc) : null, bant_poa || null, bant_poa_edc ? new Date(bant_poa_edc) : null, notes || null, now, id);
        if (milestones !== undefined) {
            await prisma_1.prisma.$executeRawUnsafe(`DELETE FROM cashflow_milestone WHERE cashflow_tracker_id = ?`, id);
            for (const m of (milestones || [])) {
                const expected = parseFloat(m.amount) || 0;
                const received = parseFloat(m.received_amount) || 0;
                const status = computeMilestoneStatus(expected, received);
                await prisma_1.prisma.$executeRawUnsafe(`
                    INSERT INTO cashflow_milestone (cashflow_tracker_id, name, amount, received_amount, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, id, m.name, expected, received, status, now, now);
            }
        }
        return getCashflowTrackerByIdInternal(id, res);
    }
    catch (err) {
        console.error('[CashflowTracker] update error:', err);
        res.status(500).json({ message: 'Failed to update record', detail: err?.message });
    }
};
exports.updateCashflowTracker = updateCashflowTracker;
const deleteCashflowTracker = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = authUser(req);
        if (!(await canAccessCashflowTracker(id, user))) {
            return res.status(403).json({ message: 'Access denied' });
        }
        await prisma_1.prisma.$executeRawUnsafe(`DELETE FROM cashflow_tracker WHERE id = ?`, id);
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to delete', detail: err?.message });
    }
};
exports.deleteCashflowTracker = deleteCashflowTracker;
async function getCashflowTrackerByIdInternal(id, res) {
    const rows = await prisma_1.prisma.$queryRawUnsafe(`SELECT ${SELECT_COLS} FROM cashflow_tracker ct ${JOINS} WHERE ct.id = ?`, id);
    if (!rows.length)
        return res.status(404).json({ message: 'Not found' });
    const t = rows[0];
    const milestones = await prisma_1.prisma.$queryRawUnsafe(`SELECT * FROM cashflow_milestone WHERE cashflow_tracker_id = ? ORDER BY id ASC`, id);
    const record = formatRow(t);
    record.milestones = milestones;
    return res.json(record);
}
