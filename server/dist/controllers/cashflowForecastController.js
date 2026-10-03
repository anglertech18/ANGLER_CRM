"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteForecastForLead = exports.deleteForecast = exports.upsertForecast = exports.getForecastByLeadId = exports.getForecastById = exports.getForecastClientCompanies = exports.getForecastBdes = exports.getForecastDashboard = exports.getForecastList = void 0;
const prisma_1 = require("../lib/prisma");
const dateFilters_1 = require("../utils/dateFilters");
const teamScope_1 = require("../utils/teamScope");
const authUser = (req) => req.user;
const QUADRANT_PROBABILITY = {
    Q1: 'High Probability',
    Q2: 'Medium Probability',
    Q3: 'Medium Probability',
    Q4: 'Low Probability',
};
function deriveMilestoneStatus(expectedCollectionDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(expectedCollectionDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime() ? 'Delayed' : 'Upcoming';
}
function deriveHeaderStatus(leadQuadrant, milestoneStatuses) {
    if (milestoneStatuses.some(s => s === 'Delayed'))
        return 'Delayed';
    return (leadQuadrant && QUADRANT_PROBABILITY[leadQuadrant]) || 'Forecast';
}
const formatForecast = (f) => {
    const milestones = (f.milestones || []).map((m) => ({
        id: m.id,
        milestone_master_id: m.milestone_master_id,
        milestone_master: m.milestone_master ? { id: m.milestone_master.id, name: m.milestone_master.name } : null,
        expected_amount: m.expected_amount,
        percentage: m.percentage,
        expected_collection_date: m.expected_collection_date,
        remarks: m.remarks,
        status: deriveMilestoneStatus(m.expected_collection_date),
    }));
    const status = deriveHeaderStatus(f.lead?.quadrant, milestones.map((m) => m.status));
    return {
        id: f.id,
        lead_id: f.lead_id,
        company_id: f.company_id,
        product_id: f.product_id,
        user_id: f.user_id,
        vertical_id: f.vertical_id,
        expected_order_value: f.expected_order_value,
        expected_order_closure_date: f.expected_order_closure_date,
        device_count: f.device_count,
        remarks: f.remarks,
        status,
        created_at: f.created_at,
        updated_at: f.updated_at,
        lead: f.lead ? {
            id: f.lead.id,
            company_name: f.lead.company_name,
            project_name: f.lead.project_name,
            first_name: f.lead.first_name,
            last_name: f.lead.last_name,
            quadrant: f.lead.quadrant,
            sales_stage_id: f.lead.sales_stage_id,
        } : null,
        company: f.company ? { id: f.company.id, name: f.company.name } : null,
        product: f.product ? { id: f.product.id, name: f.product.name } : null,
        user: f.user ? { id: f.user.id, first_name: f.user.first_name, last_name: f.user.last_name } : null,
        vertical: f.vertical ? { id: f.vertical.id, name: f.vertical.name } : null,
        milestones,
        milestones_total: milestones.length,
        milestones_upcoming: milestones.filter((m) => m.status !== 'Delayed').length,
        expected_collection: milestones.reduce((s, m) => s + (Number(m.expected_amount) || 0), 0),
    };
};
const LEAD_SELECT = { id: true, company_name: true, project_name: true, first_name: true, last_name: true, quadrant: true, sales_stage_id: true, lead_owner_id: true };
const INCLUDE_ALL = {
    lead: { select: LEAD_SELECT },
    company: true,
    product: { include: { company: true } },
    user: true,
    vertical: true,
    milestones: { include: { milestone_master: true }, orderBy: { id: 'asc' } },
};
// The forecast table shows lead qualification alongside the milestone plan, so its
// rows need more of the lead than the detail endpoints do: the scores, the
// opportunity value, and the most recent sales activity. Only the latest follow-up
// log is loaded (take: 1) — the column shows the current remark, and pulling every
// log for every row would be the N+1 this avoids.
const INCLUDE_ROWS = {
    ...INCLUDE_ALL,
    lead: {
        select: {
            ...LEAD_SELECT,
            lead_score: true,
            cp_score: true,
            opportunities_values: true,
            follow_up_logs: {
                select: { notes: true, created_at: true, activity: { select: { name: true } } },
                orderBy: { created_at: 'desc' },
                take: 1,
            },
        },
    },
};
// Scopes a Prisma `where` for ForecastHeader by role: SalesPerson → own leads,
// SalesManager → team leads, CEO → unrestricted.
async function applyRbacWhere(user, where) {
    if (user.role === 'CEO')
        return where;
    const teamIds = await (0, teamScope_1.getTeamIds)(user);
    return { ...where, lead: { ...(where.lead || {}), lead_owner_id: { in: teamIds } } };
}
// Builds the milestone-wise row set behind both the Forecast Table and the
// dashboard cards (md files/forecast/forecastUI.md), so the two never diverge
// on which rows count as "visible after filters". Each row is one forecast
// milestone. "Company" here is the product-mapped (BU) company — product.company_id
// — the same concept the Cashflow Report filters/groups by, NOT the client's
// company (lead.company_name) and not ForecastHeader.company_id. Product/BDE
// filters apply to the parent forecast header, EDC/date/search filters apply per
// milestone (or, for search, the header's BU company/lead/product too).
async function getFilteredForecastRows(user, query) {
    const { company_id, product_id, vertical_id, bde_id, client_company_id, edc_status, quick_filter, month, quarter, from_date, to_date, search } = query;
    let where = {};
    if (company_id)
        where.product = { ...(where.product || {}), company_id: Number(company_id) };
    if (product_id)
        where.product_id = Number(product_id);
    if (vertical_id)
        where.vertical_id = Number(vertical_id);
    if (bde_id)
        where.user_id = Number(bde_id);
    if (client_company_id)
        where.lead = { ...(where.lead || {}), client_company_id: Number(client_company_id) };
    if (search) {
        const s = String(search).trim();
        if (s) {
            where.OR = [
                { product: { company: { name: { contains: s } } } },
                { lead: { company_name: { contains: s } } },
                { product: { name: { contains: s } } },
                { remarks: { contains: s } },
            ];
        }
    }
    where = await applyRbacWhere(user, where);
    const headers = await prisma_1.prisma.forecastHeader.findMany({
        where,
        include: INCLUDE_ROWS,
        orderBy: { updated_at: 'desc' },
    });
    const edcStatus = edc_status || 'all';
    // Midnight today — every EDC comparison below measures against the start of the day,
    // never the current instant, so a date falling today is never counted as due.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    const dateWindows = (0, dateFilters_1.resolveDateWindows)(quick_filter, month);
    const quarterWindows = (0, dateFilters_1.resolveQuarterWindows)(quarter);
    const dateRange = (0, dateFilters_1.resolveDateRange)(from_date, to_date);
    const rows = [];
    for (const h of headers) {
        const buCompanyId = h.product?.company_id ?? null;
        const buCompanyName = h.product?.company?.name || '—';
        // Latest sales activity on the lead — the note the BDE last recorded, prefixed
        // with the activity it belongs to so the remark has its context.
        const lastLog = h.lead?.follow_up_logs?.[0];
        const salesActivityRemarks = lastLog
            ? [lastLog.activity?.name, lastLog.notes].filter(Boolean).join(' — ')
            : '';
        for (const m of h.milestones) {
            const edc = m.expected_collection_date;
            // EDC filter (md files/cashflow/edcfilter.md). Forecast milestones have no
            // Revised EDC concept, so `due` keeps its plain meaning here — the original
            // EDC has passed — rather than the Report's "expired but rescheduled
            // forward". Expired R.EDC never matches and Expired EDC / No R.EDC collapses
            // onto the same plain reading; neither is offered on the Forecast, but a
            // persisted value can still arrive here. Every comparison is against the
            // start of today, so a date falling today is Upcoming rather than expired.
            if (edcStatus === 'due_revised')
                continue;
            const edcFilter = edcStatus === 'due_no_revised' ? 'due' : edcStatus;
            if (edcFilter === 'upcoming' || edcFilter === 'due') {
                if (!edc)
                    continue;
                const overdue = new Date(edc).getTime() < startOfTodayMs;
                if (edcFilter === 'upcoming' && overdue)
                    continue;
                if (edcFilter === 'due' && !overdue)
                    continue;
            }
            if (dateWindows.length) {
                if (!edc)
                    continue;
                const d = new Date(edc);
                if (!dateWindows.some(w => d >= w.start && d <= w.end))
                    continue;
            }
            // Forecast milestones have no Revised EDC concept, so the Effective EDC
            // used by the Quarter and From/To Date filters is simply expected_collection_date.
            if (quarterWindows.length) {
                if (!edc)
                    continue;
                const d = new Date(edc);
                if (!quarterWindows.some(w => d >= w.start && d <= w.end))
                    continue;
            }
            if (dateRange) {
                if (!edc)
                    continue;
                const d = new Date(edc);
                if (dateRange.from && d < dateRange.from)
                    continue;
                if (dateRange.to && d > dateRange.to)
                    continue;
            }
            rows.push({
                milestone_id: m.id,
                forecast_id: h.id,
                lead_id: h.lead_id,
                company_id: buCompanyId,
                company: buCompanyName,
                lead_company: h.lead?.company_name || '—',
                lead_project_name: h.lead?.project_name || null,
                vertical: h.vertical?.name || '—',
                product: h.product?.name || '—',
                device_count: h.device_count,
                // Both the id and the name: the table groups by BDE, and two executives
                // sharing a name must never collapse into one band.
                bde_id: h.user_id ?? null,
                bde: h.user ? `${h.user.first_name} ${h.user.last_name || ''}`.trim() : '—',
                milestone_type: m.milestone_master?.name || '—',
                // Lead qualification, shown beside the milestone plan. BANT Score is
                // lead_score out of 28 and CP Score is cp_score out of 10 — the same
                // reading the Leads list and the Lead Report use.
                quadrant: h.lead?.quadrant || null,
                bant_score: h.lead?.lead_score ?? 0,
                cp_score: h.lead?.cp_score ?? 0,
                // The lead's opportunity value, stored as free text on the lead.
                opportunity_value: Number(h.lead?.opportunities_values) || 0,
                expected_amount: Number(m.expected_amount) || 0,
                edc,
                // Kept for API compatibility; the table now shows the sales activity
                // remark instead of the milestone's own.
                remarks: m.remarks || '',
                sales_activity_remarks: salesActivityRemarks,
            });
        }
    }
    return rows;
}
const getForecastList = async (req, res) => {
    try {
        const user = authUser(req);
        const rows = await getFilteredForecastRows(user, req.query);
        rows.sort((a, b) => a.company.localeCompare(b.company));
        res.json({ success: true, data: rows });
    }
    catch (err) {
        console.error('[getForecastList] error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch forecasts' });
    }
};
exports.getForecastList = getForecastList;
const getForecastDashboard = async (req, res) => {
    try {
        const user = authUser(req);
        const rows = await getFilteredForecastRows(user, req.query);
        const totalForecastLeads = new Set(rows.map(r => r.lead_id)).size;
        const expectedAmount = rows.reduce((s, r) => s + r.expected_amount, 0);
        res.json({
            success: true,
            data: {
                total_forecast_leads: totalForecastLeads,
                expected_amount: expectedAmount,
            },
        });
    }
    catch (err) {
        console.error('[getForecastDashboard] error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch forecast dashboard' });
    }
};
exports.getForecastDashboard = getForecastDashboard;
// BDE filter — lists only BDEs who own at least one forecast (bde.md-style filter
// optimization), scoped by the current Company/Product selection and the caller's
// normal RBAC visibility.
const getForecastBdes = async (req, res) => {
    try {
        const user = authUser(req);
        const { company_id, product_id } = req.query;
        let where = {};
        if (company_id)
            where.product = { company_id: Number(company_id) };
        if (product_id)
            where.product_id = Number(product_id);
        where = await applyRbacWhere(user, where);
        const headers = await prisma_1.prisma.forecastHeader.findMany({
            where,
            select: { user: { select: { id: true, first_name: true, last_name: true } } },
        });
        const map = new Map();
        for (const h of headers) {
            if (h.user)
                map.set(h.user.id, h.user);
        }
        const bdes = [...map.values()].sort((a, b) => a.first_name.localeCompare(b.first_name));
        res.json(bdes);
    }
    catch (err) {
        console.error('[getForecastBdes] error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch BDE filter options' });
    }
};
exports.getForecastBdes = getForecastBdes;
// Client Company filter (clientcomFilter.md) — lists only client companies with at
// least one forecasted milestone matching the current Company/Product/BDE
// selection, instead of the full Client Company master. Scoped by the same RBAC
// visibility as the forecast list itself.
const getForecastClientCompanies = async (req, res) => {
    try {
        const user = authUser(req);
        const { company_id, product_id, bde_id } = req.query;
        let where = { lead: { client_company_id: { not: null } }, milestones: { some: {} } };
        if (company_id)
            where.product = { company_id: Number(company_id) };
        if (product_id)
            where.product_id = Number(product_id);
        if (bde_id)
            where.user_id = Number(bde_id);
        where = await applyRbacWhere(user, where);
        const headers = await prisma_1.prisma.forecastHeader.findMany({
            where,
            select: { lead: { select: { client_company: { select: { id: true, name: true } } } } },
        });
        const map = new Map();
        for (const h of headers) {
            const cc = h.lead?.client_company;
            if (cc)
                map.set(cc.id, cc);
        }
        const companies = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
        res.json(companies);
    }
    catch (err) {
        console.error('[getForecastClientCompanies] error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch client company filter options' });
    }
};
exports.getForecastClientCompanies = getForecastClientCompanies;
const getForecastById = async (req, res) => {
    try {
        const user = authUser(req);
        const id = Number(req.params.id);
        const forecast = await prisma_1.prisma.forecastHeader.findUnique({ where: { id }, include: INCLUDE_ALL });
        if (!forecast)
            return res.status(404).json({ success: false, message: 'Forecast not found' });
        if (user.role !== 'CEO') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (!teamIds.includes(Number(forecast.lead?.lead_owner_id))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }
        res.json({ success: true, data: formatForecast(forecast) });
    }
    catch (err) {
        console.error('[getForecastById] error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch forecast' });
    }
};
exports.getForecastById = getForecastById;
const getForecastByLeadId = async (req, res) => {
    try {
        const lead_id = Number(req.params.leadId);
        const forecast = await prisma_1.prisma.forecastHeader.findUnique({ where: { lead_id }, include: INCLUDE_ALL });
        if (!forecast)
            return res.json({ success: true, data: null });
        res.json({ success: true, data: formatForecast(forecast) });
    }
    catch (err) {
        console.error('[getForecastByLeadId] error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch forecast' });
    }
};
exports.getForecastByLeadId = getForecastByLeadId;
// Device count, milestone Expected Amount and Percentage are intentionally left
// unvalidated: not every product tracks a device count, and BDEs commonly add or
// refine milestones incrementally over several edits rather than completing the
// full plan in one pass.
const validateForecastPayload = (body) => {
    const expectedOrderValue = parseFloat(body.expected_order_value);
    if (!expectedOrderValue || expectedOrderValue <= 0) {
        return 'Expected Order Value must be greater than 0.';
    }
    if (!body.vertical_id) {
        return 'Vertical is required.';
    }
    const milestones = body.milestones || [];
    for (const m of milestones) {
        if (!m.expected_collection_date)
            return 'Expected Collection Date is mandatory for every milestone.';
        if (!m.milestone_master_id)
            return 'Milestone Type is mandatory for every milestone.';
    }
    return null;
};
// Creates or replaces the forecast (header + milestone plan) for a lead. Called
// from LeadForm when "Expected Order" is checked and saved.
const upsertForecast = async (req, res) => {
    try {
        const user = authUser(req);
        const lead_id = Number(req.body.lead_id);
        if (!lead_id)
            return res.status(400).json({ success: false, message: 'lead_id is required.' });
        const lead = await prisma_1.prisma.lead.findUnique({ where: { id: lead_id } });
        if (!lead)
            return res.status(404).json({ success: false, message: 'Lead not found' });
        if (lead.quadrant === 'Order Won' || lead.quadrant === 'Order Lost') {
            return res.status(400).json({ success: false, message: 'Cannot forecast a lead that is already Order Won or Lost.' });
        }
        if (user.role !== 'CEO') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (!teamIds.includes(Number(lead.lead_owner_id))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }
        const validationError = validateForecastPayload(req.body);
        if (validationError)
            return res.status(400).json({ success: false, message: validationError });
        const milestones = req.body.milestones || [];
        const data = {
            lead_id,
            company_id: req.body.company_id ? Number(req.body.company_id) : (lead.company_id || null),
            product_id: req.body.product_id ? Number(req.body.product_id) : (lead.product_id || null),
            user_id: lead.lead_owner_id || null,
            vertical_id: Number(req.body.vertical_id),
            expected_order_value: parseFloat(req.body.expected_order_value),
            expected_order_closure_date: req.body.expected_order_closure_date ? new Date(req.body.expected_order_closure_date) : null,
            device_count: (req.body.device_count != null && req.body.device_count !== '') ? Number(req.body.device_count) : null,
            remarks: req.body.remarks || null,
        };
        const forecast = await prisma_1.prisma.$transaction(async (tx) => {
            const header = await tx.forecastHeader.upsert({
                where: { lead_id },
                create: data,
                update: data,
            });
            await tx.forecastMilestone.deleteMany({ where: { forecast_id: header.id } });
            if (milestones.length) {
                await tx.forecastMilestone.createMany({
                    data: milestones.map((m) => ({
                        forecast_id: header.id,
                        milestone_master_id: m.milestone_master_id ? Number(m.milestone_master_id) : null,
                        expected_amount: (m.expected_amount != null && m.expected_amount !== '') ? parseFloat(m.expected_amount) : null,
                        percentage: (m.percentage != null && m.percentage !== '') ? parseFloat(m.percentage) : null,
                        expected_collection_date: new Date(m.expected_collection_date),
                        remarks: m.remarks || null,
                    })),
                });
            }
            return tx.forecastHeader.findUnique({ where: { id: header.id }, include: INCLUDE_ALL });
        });
        res.json({ success: true, message: 'Forecast saved successfully', data: formatForecast(forecast) });
    }
    catch (err) {
        console.error('[upsertForecast] error:', err);
        res.status(500).json({ success: false, message: 'Failed to save forecast' });
    }
};
exports.upsertForecast = upsertForecast;
const deleteForecast = async (req, res) => {
    try {
        const user = authUser(req);
        const id = Number(req.params.id);
        const forecast = await prisma_1.prisma.forecastHeader.findUnique({ where: { id }, include: { lead: { select: { lead_owner_id: true } } } });
        if (!forecast)
            return res.status(404).json({ success: false, message: 'Forecast not found' });
        if (user.role !== 'CEO') {
            const teamIds = await (0, teamScope_1.getTeamIds)(user);
            if (!teamIds.includes(Number(forecast.lead?.lead_owner_id))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }
        await prisma_1.prisma.forecastHeader.delete({ where: { id } });
        res.json({ success: true, message: 'Forecast deleted successfully' });
    }
    catch (err) {
        console.error('[deleteForecast] error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete forecast' });
    }
};
exports.deleteForecast = deleteForecast;
// Called by leadController.ts whenever a lead's quadrant resolves to Order Won or
// Order Lost — the forecast record (and its milestones, via cascade) is deleted
// per the spec's Order Won/Lost flow. Safe to call even if no forecast exists.
const deleteForecastForLead = async (leadId) => {
    try {
        await prisma_1.prisma.forecastHeader.deleteMany({ where: { lead_id: leadId } });
    }
    catch (err) {
        console.error('[deleteForecastForLead] error:', err);
    }
};
exports.deleteForecastForLead = deleteForecastForLead;
