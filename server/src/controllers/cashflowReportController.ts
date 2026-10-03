import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveDateWindow, resolveQuarterWindow, resolveDateRange } from '../utils/dateFilters';
import { getFilteredMilestonesForLeads, computeMilestonePeriodAmounts, parseStatusFilter, matchesStatusFilters } from '../utils/cashflowMilestones';

const authUser = (req: Request) => (req as any).user;

async function getTeamIds(user: any): Promise<number[]> {
    if (user.role === 'SalesPerson') return [user.id];
    if (user.role === 'SalesManager') {
        const team = await prisma.user.findMany({
            where: { OR: [{ id: user.id }, { reporting_manager_id: user.id }] },
            select: { id: true },
        });
        return team.map((u: any) => u.id);
    }
    return [];
}

// Cashflow Privileges — Management Access: when granted, the reporting hierarchy is
// bypassed entirely for the assigned companies (any BDE's records are visible),
// scoped by the record's BU company (product.company_id), same field the existing
// Company filter already uses.
async function getManagementAccess(user: any): Promise<{ enabled: boolean; companyIds: number[] }> {
    if (!user.cashflow_management_access) return { enabled: false, companyIds: [] };
    const rows = await prisma.cashflowManagementCompany.findMany({
        where: { user_id: user.id },
        select: { company_id: true },
    });
    const companyIds = rows.map((r: any) => r.company_id);
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
async function buildLeadScope(
    user: any,
    managementAccess: { enabled: boolean; companyIds: number[] },
    companyId: string | undefined
): Promise<{ conditions: string[]; args: any[]; denied: boolean }> {
    const conditions: string[] = [`l.quadrant = 'Order Won'`];
    const args: any[] = [];

    if (managementAccess.enabled) {
        if (companyId) {
            const reqCompanyId = parseInt(companyId, 10);
            if (!managementAccess.companyIds.includes(reqCompanyId)) return { conditions, args, denied: true };
            conditions.push('p.company_id = ?');
            args.push(reqCompanyId);
        } else {
            conditions.push(`p.company_id IN (${managementAccess.companyIds.join(',')})`);
        }
    } else {
        if (user.role === 'SalesPerson') {
            conditions.push('l.lead_owner_id = ?');
            args.push(user.id);
        } else if (user.role === 'SalesManager') {
            const teamIds = await getTeamIds(user);
            if (teamIds.length) conditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
        }
        if (companyId) { conditions.push('p.company_id = ?'); args.push(parseInt(companyId, 10)); }
    }

    return { conditions, args, denied: false };
}

// Cashflow Report — one row per milestone (CR8), mirroring the Cashflow Tracker.
// Full per-payment transaction detail lives behind the Collection History popup
// (GET /leads/:id/milestones/:mid/payment-history), not in this main table.
export const getCashflowReport = async (req: Request, res: Response) => {
    try {
        const user = authUser(req);
        const { month, product_id, vertical_id, bde_id, company_id, client_company_id, edc_status, quick_filter, quarter, from_date, to_date, collection_status, poa_status } = req.query;

        // Never trust frontend values: reject malformed numeric filters up front rather
        // than letting NaN flow into the raw SQL built below.
        const numericParams: Record<string, unknown> = { product_id, vertical_id, bde_id, company_id, client_company_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw as string, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }

        const edcStatus = (edc_status as string) || 'all';
        const collectionStatusFilter = parseStatusFilter(collection_status);
        const poaStatusFilter = parseStatusFilter(poa_status);

        // CR10: the date window filters the milestone list itself (by EDC/Revised EDC,
        // same as the Cashflow Tracker) AND scopes which payment transactions count as
        // "Period Collected" — the two modules must never diverge on this.
        const dateWindow = resolveDateWindow(quick_filter as string | undefined, month as string | undefined);
        const quarterWindow = resolveQuarterWindow(quarter as string | undefined);
        const dateRange = resolveDateRange(from_date as string | undefined, to_date as string | undefined);

        const leadConditions: string[] = [`l.quadrant = 'Order Won'`];
        const leadArgs: any[] = [];

        const managementAccess = await getManagementAccess(user);

        if (managementAccess.enabled) {
            // Management Access: reporting hierarchy is bypassed entirely for the
            // assigned companies — any BDE's records are visible within them.
            if (company_id) {
                const reqCompanyId = parseInt(company_id as string);
                if (!managementAccess.companyIds.includes(reqCompanyId)) return res.json(emptyResponse());
                leadConditions.push('p.company_id = ?');
                leadArgs.push(reqCompanyId);
            } else {
                leadConditions.push(`p.company_id IN (${managementAccess.companyIds.join(',')})`);
            }
            if (bde_id) {
                // A management-access user is only ever authorized within their assigned
                // companies — validate the requested BDE actually belongs to one of them,
                // the same way an explicit company_id is validated above. Without this,
                // a user restricted to Company A could pass another company's BDE id
                // (omitting company_id) and receive that BDE's records.
                const reqBdeId = parseInt(bde_id as string);
                const bdeUser = await prisma.user.findUnique({ where: { id: reqBdeId }, select: { company_id: true } });
                if (!bdeUser || bdeUser.company_id == null || !managementAccess.companyIds.includes(bdeUser.company_id)) {
                    return res.json(emptyResponse());
                }
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(reqBdeId);
            }
        } else {
            const teamIds = await getTeamIds(user);

            if (user.role === 'SalesPerson') {
                leadConditions.push('l.lead_owner_id = ?');
                leadArgs.push(user.id);
            } else if (user.role === 'SalesManager') {
                if (bde_id) {
                    const reqBdeId = parseInt(bde_id as string);
                    if (!teamIds.includes(reqBdeId)) return res.json(emptyResponse());
                    leadConditions.push('l.lead_owner_id = ?');
                    leadArgs.push(reqBdeId);
                } else if (teamIds.length) {
                    leadConditions.push(`l.lead_owner_id IN (${teamIds.join(',')})`);
                }
            } else {
                if (bde_id) { leadConditions.push('l.lead_owner_id = ?'); leadArgs.push(parseInt(bde_id as string)); }
            }

            if (company_id) { leadConditions.push('p.company_id = ?'); leadArgs.push(parseInt(company_id as string)); }
        }

        if (product_id) { leadConditions.push('l.product_id = ?'); leadArgs.push(parseInt(product_id as string)); }
        if (vertical_id) { leadConditions.push('l.vertical_id = ?'); leadArgs.push(parseInt(vertical_id as string)); }
        if (client_company_id) { leadConditions.push('l.client_company_id = ?'); leadArgs.push(parseInt(client_company_id as string)); }

        const leadWhere = leadConditions.join(' AND ');

        const leads: any[] = await prisma.$queryRawUnsafe(
            `SELECT l.id, l.company_name, l.project_name, l.product_id, l.lead_owner_id, l.vertical_id,
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
             ORDER BY l.company_name ASC`,
            ...leadArgs
        );

        if (!leads.length) return res.json(emptyResponse());

        const leadIds = leads.map((l: any) => Number(l.id));

        // Filtering + amount calculations use the same shared logic as the Cashflow
        // Tracker (getFilteredMilestonesForLeads) so the two modules never diverge.
        const filtered = await getFilteredMilestonesForLeads(leadIds, edcStatus, dateWindow, true, quarterWindow, dateRange);
        const { milestones } = filtered;
        if (!milestones.length) return res.json(emptyResponse());

        // Stretch targets. A BDE holds one target row per product, so the monthly
        // revenue target is the sum across the products in scope — assigning instead
        // of adding made the last row win and zeroed out BDEs whose revenue target
        // sits on only one of their products.
        const ownerIds = [...new Set(leads.map((l: any) => Number(l.lead_owner_id)).filter(Boolean))];
        const targetFilter: any = { user_id: { in: ownerIds } };
        if (product_id) targetFilter.product_id = parseInt(product_id as string);
        const stretchTargets = await prisma.userProductTarget.findMany({
            where: targetFilter,
            select: { user_id: true, revenue_target: true },
        });
        const targetMap: Record<number, number> = {};
        for (const t of stretchTargets) {
            targetMap[t.user_id] = (targetMap[t.user_id] || 0) + (t.revenue_target || 0);
        }

        const now = new Date();
        // Aging is measured against the original EDC only — never the revised one.
        // Revising a date must not reset the age of a milestone: the whole point of the
        // figure is how long the money has been outstanding against the date first
        // committed to. The revised date is reported separately in its own column.
        const computeAging = (m: any): number | null => {
            if (!m.edc) return null;
            return Math.floor((now.getTime() - new Date(m.edc).getTime()) / 86400000);
        };

        // Milestones grouped by lead, in original lm.id order.
        const milestonesByLead = new Map<number, any[]>();
        for (const m of milestones) {
            const lid = Number(m.lead_id);
            if (!milestonesByLead.has(lid)) milestonesByLead.set(lid, []);
            milestonesByLead.get(lid)!.push(m);
        }

        // Row order: Client Company (companysummary.md) first — so the company-wise
        // subtotal groups land on contiguous rows — then BDE name, then milestone
        // creation order, so the "display once per consecutive BDE"/"once per
        // consecutive Client Company" rules and the running subtotal read naturally.
        const sortedLeads = [...leads].sort((a: any, b: any) => {
            const aCompany = a.company_name || '';
            const bCompany = b.company_name || '';
            if (aCompany !== bCompany) return aCompany.localeCompare(bCompany);
            const aName = `${a.owner_first || ''} ${a.owner_last || ''}`.trim();
            const bName = `${b.owner_first || ''} ${b.owner_last || ''}`.trim();
            return aName.localeCompare(bName);
        });

        const rows: any[] = [];
        for (const lead of sortedLeads) {
            const leadMilestones = milestonesByLead.get(Number(lead.id)) || [];
            for (const m of leadMilestones) {
                const expected = Number(m.expected_amount || 0);
                const periodAmounts = computeMilestonePeriodAmounts(Number(m.id), expected, filtered);
                const collectionStatus = periodAmounts.is_fully_collected ? 'Fully Paid' : (m.collection_status || 'Pending');
                const poaStatus = m.poa_status || 'Pending';

                // CR11: Collection Status / POA Status multi-select filters, applied on
                // the same derived collection_status shown in the row itself.
                if (!matchesStatusFilters(collectionStatus, poaStatus, collectionStatusFilter, poaStatusFilter)) continue;

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
        let prevBdeId: number | null | undefined = undefined;
        let prevCompany: string | undefined = undefined;
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
    } catch (err: any) {
        console.error('[CashflowReport] error:', err);
        res.status(500).json({ message: 'Failed to fetch cashflow report', detail: err?.message });
    }
};

// BDE filter — the "BDE Filter Optimization" spec (bde.md): the Cashflow Report's
// BDE dropdown must list only BDEs who own at least one milestone matching the
// current Company/Product/Vertical selection, instead of the full User Master.
// Scoped by the same RBAC/Management Access rules as getCashflowReport itself.
export const getCashflowReportBdes = async (req: Request, res: Response) => {
    try {
        const user = authUser(req);
        const { product_id, vertical_id, company_id } = req.query;

        const numericParams: Record<string, unknown> = { product_id, vertical_id, company_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw as string, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }

        const managementAccess = await getManagementAccess(user);
        const scope = await buildLeadScope(user, managementAccess, company_id as string | undefined);
        if (scope.denied) return res.json([]);

        const leadConditions = scope.conditions;
        const leadArgs = scope.args;

        if (product_id) { leadConditions.push('l.product_id = ?'); leadArgs.push(parseInt(product_id as string, 10)); }
        if (vertical_id) { leadConditions.push('l.vertical_id = ?'); leadArgs.push(parseInt(vertical_id as string, 10)); }

        const leadWhere = leadConditions.join(' AND ');

        const bdes: any[] = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT u.id, u.first_name, u.last_name
             FROM lead l
             INNER JOIN lead_milestone lm ON lm.lead_id = l.id
             INNER JOIN user u ON u.id = l.lead_owner_id
             LEFT JOIN product p ON l.product_id = p.id
             WHERE ${leadWhere}
             ORDER BY u.first_name ASC, u.last_name ASC`,
            ...leadArgs
        );

        res.json(bdes.map((b: any) => ({ id: Number(b.id), first_name: b.first_name, last_name: b.last_name })));
    } catch (err: any) {
        console.error('[CashflowReport] getCashflowReportBdes error:', err);
        res.status(500).json({ message: 'Failed to fetch BDE filter options', detail: err?.message });
    }
};

// Client Company filter (clientcomFilter.md) — lists only client companies with at
// least one milestone matching the current Company/Product/Vertical/BDE selection,
// instead of the full Client Company master. Scoped by the same RBAC/Management
// Access rules as getCashflowReport itself.
export const getCashflowReportClientCompanies = async (req: Request, res: Response) => {
    try {
        const user = authUser(req);
        const { product_id, vertical_id, bde_id, company_id } = req.query;

        const numericParams: Record<string, unknown> = { product_id, vertical_id, bde_id, company_id };
        for (const [key, raw] of Object.entries(numericParams)) {
            if (raw !== undefined && raw !== '' && Number.isNaN(parseInt(raw as string, 10))) {
                return res.status(400).json({ message: `Invalid ${key} parameter` });
            }
        }

        const managementAccess = await getManagementAccess(user);
        const scope = await buildLeadScope(user, managementAccess, company_id as string | undefined);
        if (scope.denied) return res.json([]);

        const leadConditions = [...scope.conditions, 'l.client_company_id IS NOT NULL'];
        const leadArgs = scope.args;

        if (product_id) { leadConditions.push('l.product_id = ?'); leadArgs.push(parseInt(product_id as string, 10)); }
        if (vertical_id) { leadConditions.push('l.vertical_id = ?'); leadArgs.push(parseInt(vertical_id as string, 10)); }
        if (bde_id) { leadConditions.push('l.lead_owner_id = ?'); leadArgs.push(parseInt(bde_id as string, 10)); }

        const leadWhere = leadConditions.join(' AND ');

        const companies: any[] = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT cc.id, cc.name
             FROM lead l
             INNER JOIN lead_milestone lm ON lm.lead_id = l.id
             INNER JOIN client_company cc ON cc.id = l.client_company_id
             LEFT JOIN product p ON l.product_id = p.id
             WHERE ${leadWhere}
             ORDER BY cc.name ASC`,
            ...leadArgs
        );

        res.json(companies.map((c: any) => ({ id: Number(c.id), name: c.name })));
    } catch (err: any) {
        console.error('[CashflowReport] getCashflowReportClientCompanies error:', err);
        res.status(500).json({ message: 'Failed to fetch client company filter options', detail: err?.message });
    }
};
