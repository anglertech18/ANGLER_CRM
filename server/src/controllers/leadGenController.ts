import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getTeamIds, isInTeam } from '../utils/teamScope';
dayjs.extend(utc);

// ── helpers ─────────────────────────────────────────────────────────────────

// Pipeline stages in display order (per pipeline.md)
const PIPELINE_STAGES = ['order_won', 'q4', 'q3', 'q2', 'q1', 'nurturing', 'order_lost'] as const;
type PipelineStage = typeof PIPELINE_STAGES[number];

// Maps a stage key to the Lead.quadrant value stored in the database
const STAGE_QUADRANT: Record<PipelineStage, string> = {
    order_won: 'Order Won', q4: 'Q4', q3: 'Q3', q2: 'Q2',
    q1: 'Q1', nurturing: 'Nurturing', order_lost: 'Order Lost',
};

interface LeadDetail { id: number; name: string; created_at: Date; source: string; }
type LeadDetails = Record<PipelineStage | 'total', LeadDetail[]>;

function emptyLeadDetails(): LeadDetails {
    return { order_won: [], q4: [], q3: [], q2: [], q1: [], nurturing: [], order_lost: [], total: [] };
}

function safePct(achieved: number, target: number): number {
    if (!target) return 0;
    return Math.round((achieved / target) * 100);
}

function emptyMetrics() {
    return {
        calls:      { target: 0, achieved: 0, percent: 0, details: [] as LeadDetail[] },
        leads:      { target: 0, achieved: 0, percent: 0, details: [] as LeadDetail[] },
        lead_count: { order_won: 0, q4: 0, q3: 0, q2: 0, q1: 0, nurturing: 0, order_lost: 0, total: 0 },
        lead_details: emptyLeadDetails(),
        demos:      { achieved: 0 },
        proposals:  { submitted: 0 },
    };
}

// Concatenates the per-BDE tooltip lists into one list per pipeline stage,
// so the Total row's tooltip covers every lead behind that stage's count.
function mergeLeadDetails(all: LeadDetails[]): LeadDetails {
    const merged = emptyLeadDetails();
    (Object.keys(merged) as (keyof LeadDetails)[]).forEach(key => {
        merged[key] = all.flatMap(d => d?.[key] ?? []);
    });
    return merged;
}

function sumMetrics(rows: any[]): ReturnType<typeof emptyMetrics> {
    const callsTgt  = rows.reduce((s, r) => s + r.calls.target, 0);
    const callsAch  = rows.reduce((s, r) => s + r.calls.achieved, 0);
    const leadsTgt  = rows.reduce((s, r) => s + r.leads.target, 0);
    const leadsAch  = rows.reduce((s, r) => s + r.leads.achieved, 0);
    return {
        calls:      { target: callsTgt, achieved: callsAch, percent: safePct(callsAch, callsTgt), details: rows.flatMap(r => r.calls.details ?? []) },
        leads:      { target: leadsTgt, achieved: leadsAch, percent: safePct(leadsAch, leadsTgt), details: rows.flatMap(r => r.leads.details ?? []) },
        lead_count: {
            order_won:  rows.reduce((s, r) => s + r.lead_count.order_won, 0),
            q4:         rows.reduce((s, r) => s + r.lead_count.q4, 0),
            q3:         rows.reduce((s, r) => s + r.lead_count.q3, 0),
            q2:         rows.reduce((s, r) => s + r.lead_count.q2, 0),
            q1:         rows.reduce((s, r) => s + r.lead_count.q1, 0),
            nurturing:  rows.reduce((s, r) => s + r.lead_count.nurturing, 0),
            order_lost: rows.reduce((s, r) => s + r.lead_count.order_lost, 0),
            total:      rows.reduce((s, r) => s + r.lead_count.total, 0),
        },
        lead_details: mergeLeadDetails(rows.map(r => r.lead_details)),
        demos:      { achieved: rows.reduce((s, r) => s + r.demos.achieved, 0) },
        proposals:  { submitted: rows.reduce((s, r) => s + r.proposals.submitted, 0) },
    };
}

// Lead WHERE clause mirrors the sealController pattern
function buildLeadWhere(isProductMode: boolean, pid: number | null, svcDept: string | null): any {
    if (isProductMode) return { product_id: pid! };
    if (svcDept === 'IM Services')  return { OR: [{ im_service_id: { not: null } }, { product_or_service: 'ImService'  }, { product_or_service: 'IM Services'  }] };
    if (svcDept === 'EIT Services') return { OR: [{ eit_service_id: { not: null } }, { product_or_service: 'EitService' }, { product_or_service: 'EIT Services' }] };
    return { product_or_service: svcDept! };
}

// SWAT WHERE clause for service mode (covers proxy-product records too)
function buildSwatServiceFilter(svcDept: string, proxyProductId: number | null): any {
    const orConds: any[] = [{ service_department: svcDept }];
    if (proxyProductId) orConds.push({ product_id: proxyProductId });
    return { OR: orConds };
}

// Counts actual working days (Monday–Friday) within an inclusive date range.
// Used to scale daily targets instead of assuming fixed 5-day/20-day periods.
function countWorkingDays(from: Date, to: Date): number {
    const start = dayjs.utc(from).startOf('day');
    const end   = dayjs.utc(to).startOf('day');
    const totalDays = end.diff(start, 'day') + 1;
    let workingDays = 0;
    for (let i = 0; i < totalDays; i++) {
        const dow = start.add(i, 'day').day(); // 0=Sun .. 6=Sat
        if (dow >= 1 && dow <= 5) workingDays++;
    }
    return workingDays;
}

// Real calendar weeks (Monday–Sunday), clipped to the selected month so no week
// ever spans into the previous/next month (first/last week may be partial).
function buildCalendarWeeks(monthBase: dayjs.Dayjs, daysInMonth: number): { start: number; end: number }[] {
    const weeks: { start: number; end: number }[] = [];
    let cursor = 1;
    while (cursor <= daysInMonth) {
        const dow = monthBase.date(cursor).day(); // 0=Sun .. 6=Sat
        const daysUntilSunday = dow === 0 ? 0 : (7 - dow);
        const end = Math.min(cursor + daysUntilSunday, daysInMonth);
        weeks.push({ start: cursor, end });
        cursor = end + 1;
    }
    return weeks;
}

// ── GET /api/lead-gen ────────────────────────────────────────────────────────

export const getLeadGenSummary = async (req: Request, res: Response) => {
    try {
        const { product_id, service_department, bde_id, month, year, week, lead_source_type_id, company_id } = req.query;
        const authUser = (req as any).user;
        const targetTypeId = (lead_source_type_id && lead_source_type_id !== 'null' && lead_source_type_id !== '') ? parseInt(lead_source_type_id as string) : null;

        const isProductMode = !!(product_id && product_id !== 'null' && product_id !== 'undefined' && product_id !== '');
        const isServiceMode = !!(service_department && service_department !== 'null' && service_department !== '');

        if (!isProductMode && !isServiceMode) {
            return res.status(400).json({ message: 'product_id or service_department is required' });
        }

        const pid     = isProductMode ? parseInt(product_id as string) : null;

        // SEAL global Company filter — guard: the selected product must belong to
        // the selected BU company (product.company_id).
        const companyIdFilter = (company_id && company_id !== 'null' && company_id !== '') ? parseInt(company_id as string) : null;
        if (companyIdFilter !== null && pid !== null) {
            const prod = await prisma.product.findUnique({ where: { id: pid }, select: { company_id: true } });
            if (!prod || prod.company_id !== companyIdFilter) {
                return res.status(400).json({ message: 'Selected product does not belong to the selected company' });
            }
        }
        const svcDept = isServiceMode ? (service_department as string) : null;
        const targetBdeId = (bde_id && bde_id !== 'null' && bde_id !== '') ? parseInt(bde_id as string) : null;

        // ── RBAC: resolve which user IDs are in scope ────────────────────────
        let userIds: number[] = [];

        if (authUser.role === 'SalesPerson') {
            userIds = [authUser.id];
        } else if (targetBdeId) {
            if (authUser.role === 'SalesManager' && targetBdeId !== authUser.id) {
                if (!(await isInTeam(authUser.id, targetBdeId))) return res.status(403).json({ message: 'Access denied' });
            }
            userIds = [targetBdeId];
        } else {
            // Aggregate view — scope by role. Matches getLeadGenBdes: BDE-only
            // (SalesPerson/SalesManager), CEO/admin accounts aren't BDEs.
            let userScopeFilter: any = { status: 'ACTIVE', role: { not: 'CEO' } };
            if (authUser.role === 'SalesManager') {
                userScopeFilter = { id: { in: await getTeamIds(authUser) }, status: 'ACTIVE' };
            }
            // Same LeadGenSummary-privilege restriction as the BDE dropdown, so the
            // "All BDEs" aggregate doesn't fold in data from users who couldn't be
            // selected individually.
            userScopeFilter = {
                AND: [
                    userScopeFilter,
                    { privileges: { some: { module_name: 'LeadGenSummary', can_view: true } } },
                ],
            };

            if (isProductMode) {
                const recs = await prisma.userProductTarget.findMany({
                    where: { product_id: pid!, user: userScopeFilter },
                    select: { user_id: true }
                });
                userIds = recs.map(r => r.user_id);
            } else {
                const proxyProduct = await prisma.product.findFirst({ where: { name: svcDept! } });
                const proxyRecs = proxyProduct
                    ? await prisma.userProductTarget.findMany({ where: { product_id: proxyProduct.id, user: userScopeFilter }, select: { user_id: true } })
                    : [];
                userIds = [...new Set(proxyRecs.map(r => r.user_id))];
            }
        }

        // ── Lead Source Type mapping — resolved once, shared by every section ──
        // Replaces the old hard-coded 4-source list: every active Lead Source Type
        // gets its own section in the response, populated from whichever Lead
        // Sources are mapped to it (Masters → Lead Source Type / Lead Source).
        const leadSourceTypes = await prisma.leadSourceType.findMany({
            where: { is_active: true, ...(targetTypeId ? { id: targetTypeId } : {}) },
            include: { lead_sources: { select: { id: true, name: true } } },
            orderBy: { id: 'asc' },
        });
        const sourceIdToTypeId = new Map<number, number>();
        leadSourceTypes.forEach(t => t.lead_sources.forEach(s => sourceIdToTypeId.set(s.id, t.id)));
        const allMappedSourceIds = [...sourceIdToTypeId.keys()];

        // The "Digital" Lead Source Type's Lead Target/Achieved columns are sourced
        // differently from every other type: Enquiry conversions (is_converted +
        // converted_to='Lead'), not the Lead table's enquiry_date-based pipeline —
        // Leads created by converting a Digital Enquiry never get enquiry_date set,
        // so the normal pipeline-based Achieved count would under-report them.
        const digitalType = leadSourceTypes.find(t => t.name === 'Digital') ?? null;
        const digitalSourceIds = digitalType ? digitalType.lead_sources.map(s => s.id) : [];

        // ── Per-BDE Lead Source Type restriction (Manage Privileges → Lead Source
        // Types). No rows for a user = unrestricted, so it still sees every active
        // type — this keeps the map empty (fast-path) unless someone is restricted.
        const restrictionRows = await prisma.userLeadSourceType.findMany({
            where: { user_id: { in: userIds } },
            select: { user_id: true, lead_source_type_id: true },
        });
        const allowedTypesByUser = new Map<number, Set<number>>();
        restrictionRows.forEach(r => {
            if (!allowedTypesByUser.has(r.user_id)) allowedTypesByUser.set(r.user_id, new Set());
            allowedTypesByUser.get(r.user_id)!.add(r.lead_source_type_id);
        });
        // Only a BDE with at least one restriction row is actually restricted;
        // everyone else keeps seeing every Lead Source Type.
        const isUserAllowedForType = (userId: number, typeId: number) => {
            const allowed = allowedTypesByUser.get(userId);
            return !allowed || allowed.has(typeId);
        };

        if (!userIds.length) {
            return res.json({
                product_name: null, service_dept: svcDept, is_product_mode: isProductMode,
                lead_source_types: leadSourceTypes.map(t => ({
                    id: t.id, name: t.name, sources: t.lead_sources.map(s => s.name),
                    weekly:  { bde_rows: [], total: emptyMetrics() },
                    monthly: { bde_rows: [], total: emptyMetrics() },
                })),
            });
        }

        // ── Date ranges ──────────────────────────────────────────────────────
        const todayUtc = dayjs.utc();

        // Resolve selected month (defaults to current month)
        const selMonth = (month && month !== '') ? parseInt(month as string) : todayUtc.month() + 1;
        const selYear  = (year  && year  !== '') ? parseInt(year  as string) : todayUtc.year();
        const monthBase  = dayjs.utc(`${selYear}-${String(selMonth).padStart(2, '0')}-01`);
        const monthStart = monthBase.startOf('month').startOf('day').toDate();
        const monthEnd   = monthBase.endOf('month').endOf('day').toDate();

        // Resolve selected week within the month — real calendar weeks (Mon–Sun),
        // clipped to the month so no week spans into another month.
        const daysInMonth   = monthBase.daysInMonth();
        const calendarWeeks = buildCalendarWeeks(monthBase, daysInMonth);
        const totalWeeks    = calendarWeeks.length;
        const isCurrentMonth = selMonth === todayUtc.month() + 1 && selYear === todayUtc.year();
        const todayWeekIdx  = calendarWeeks.findIndex(w => todayUtc.date() >= w.start && todayUtc.date() <= w.end);
        const defaultWeek   = (isCurrentMonth && todayWeekIdx >= 0) ? todayWeekIdx + 1 : 1;
        const selWeek       = (week && week !== '') ? Math.min(Math.max(parseInt(week as string), 1), totalWeeks) : defaultWeek;
        const { start: weekDayStart, end: weekDayEnd } = calendarWeeks[selWeek - 1];
        const weekStart     = monthBase.date(weekDayStart).startOf('day').toDate();
        const weekEnd       = monthBase.date(weekDayEnd).endOf('day').toDate();

        // Batch query covers both selected week AND selected month
        const batchStart = weekStart < monthStart ? weekStart : monthStart;
        const batchEnd   = weekEnd   > monthEnd   ? weekEnd   : monthEnd;

        // ── Single batch query: SWAT records covering week + selected month ────
        const proxyProduct = isServiceMode ? await prisma.product.findFirst({ where: { name: svcDept! } }) : null;

        const swatBaseWhere: any = {
            user_id: { in: userIds },
            date:    { gte: batchStart, lte: batchEnd },
        };
        if (isProductMode) {
            swatBaseWhere.product_id = pid!;
        } else {
            Object.assign(swatBaseWhere, buildSwatServiceFilter(svcDept!, proxyProduct?.id ?? null));
        }

        // ── Fetch configured targets from Target Management ───────────────────
        // calls_target = per day, scaled by actual Mon–Fri working days in the selected week/month
        // Lead Target (per leadgensum.md) = SWAT Q1 Lead Target formula:
        //   dailyQ1Target = round(leads_target * product.lead_q1_multiplier / 22)
        // then scaled the same way as calls_target (actual Mon–Fri working days).
        const targetCallsMap = new Map<number, number>();
        const targetLeadsMap = new Map<number, number>();
        // Digital Leads Target — configured per user/product (Target Configuration
        // modal), scaled the same way as calls_target: daily rate × actual Mon–Fri
        // working days in the selected week/month (no Q1-multiplier funnel formula).
        const targetDigitalLeadsMap = new Map<number, number>();
        const activeProductId = isProductMode ? pid! : (proxyProduct?.id ?? null);
        const q1Multiplier = activeProductId
            ? ((await prisma.product.findUnique({ where: { id: activeProductId }, select: { lead_q1_multiplier: true } }))?.lead_q1_multiplier ?? 1.0)
            : 1.0;

        if (activeProductId) {
            const tgts = await prisma.userProductTarget.findMany({
                where: { product_id: activeProductId, user_id: { in: userIds } },
                select: { user_id: true, calls_target: true, leads_target: true, digital_leads_target: true },
            });
            tgts.forEach(t => {
                targetCallsMap.set(t.user_id, t.calls_target ?? 0);
                targetLeadsMap.set(t.user_id, Math.round(((t.leads_target ?? 0) * q1Multiplier) / 22));
                targetDigitalLeadsMap.set(t.user_id, t.digital_leads_target ?? 0);
            });
        }

        const swatRecords = await prisma.swatPerformance.findMany({
            where: swatBaseWhere,
            select: {
                user_id: true, date: true,
                demos_achieved: true,
                proposals_achieved: true,
                product_id: true, service_department: true,
            }
        });

        // ── Call Tracker records for Calls Achieved (excludes NULL call_status) ─
        const callTrackerBaseWhere: any = {
            user_id: { in: userIds },
            call_status_id: { not: null },
            date: { gte: batchStart, lte: batchEnd },
            lead_source_id: { in: allMappedSourceIds },
        };
        if (isProductMode) {
            callTrackerBaseWhere.product_id = pid!;
        } else {
            Object.assign(callTrackerBaseWhere, buildSwatServiceFilter(svcDept!, proxyProduct?.id ?? null));
        }

        const callTrackerRecords = await prisma.callTracker.findMany({
            where: callTrackerBaseWhere,
            select: {
                id: true, user_id: true, date: true, lead_source_id: true,
                company_name: true, lead_source: { select: { name: true } },
            },
        });

        // ── Digital Leads Achieved: Enquiries converted to a Lead, whose Lead
        // Source falls under the "Digital" Lead Source Type — feeds the Digital
        // card's Lead Target/Achieved columns instead of the usual Lead-table
        // pipeline breakdown (see digitalType comment above). Counted by
        // converted_at (when the conversion happened), not the Enquiry's own date.
        // Attributed to created_by_id — the BDE who logged the Enquiry — not
        // allocated_to_id, which may have been reassigned to someone else after
        // creation; the achievement belongs to whoever originated it.
        let convertedDigitalEnquiries: {
            id: number; created_by_id: number | null; converted_at: Date | null;
            company_name: string | null; contact_name: string | null;
            lead_source: { name: string } | null;
        }[] = [];
        if (digitalType && digitalSourceIds.length) {
            const enquiryWhere: any = {
                created_by_id: { in: userIds },
                is_converted: true,
                converted_to: 'Lead',
                converted_at: { gte: batchStart, lte: batchEnd },
                lead_source_id: { in: digitalSourceIds },
            };
            if (isProductMode) {
                enquiryWhere.product_id = pid!;
            } else {
                enquiryWhere.service_department = svcDept!;
            }
            convertedDigitalEnquiries = await prisma.enquiry.findMany({
                where: enquiryWhere,
                select: {
                    id: true, created_by_id: true, converted_at: true,
                    company_name: true, contact_name: true,
                    lead_source: { select: { name: true } },
                },
            });
        }

        // ── Lead count filtered to batchStart–batchEnd (covers week + selected month) ─
        // Restricted to Lead Sources mapped to an active Lead Source Type — the same
        // filtered set feeds both Lead Achievement and the Sales Pipeline breakdown,
        // then gets split per type below. Date filter is on enquiry_date (not
        // created_at) — leads with no enquiry_date fall outside every range.
        const leadWhere: any = {
            lead_owner_id: { in: userIds },
            enquiry_date: { gte: batchStart, lte: batchEnd },
            lead_source_id: { in: allMappedSourceIds },
            ...buildLeadWhere(isProductMode, pid, svcDept),
        };
        const allLeads = await prisma.lead.findMany({
            where: leadWhere,
            select: {
                id: true, lead_owner_id: true, quadrant: true, created_at: true, enquiry_date: true,
                company_name: true, first_name: true, last_name: true, lead_source_id: true,
                company_master: { select: { name: true } },
                lead_source:    { select: { name: true } },
            }
        });

        // ── Split leads/calls per Lead Source Type once (fetched once above, grouped
        // in memory here) — avoids a separate DB query per type (per pipeline.md perf note).
        const leadsByType = new Map<number, typeof allLeads>();
        const callsByType = new Map<number, typeof callTrackerRecords>();
        leadSourceTypes.forEach(t => {
            leadsByType.set(t.id, allLeads.filter(l => sourceIdToTypeId.get(l.lead_source_id!) === t.id));
            callsByType.set(t.id, callTrackerRecords.filter(r => sourceIdToTypeId.get(r.lead_source_id!) === t.id));
        });

        // ── Fetch user display names ──────────────────────────────────────────
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, first_name: true, last_name: true }
        });
        const userMap = new Map(users.map(u => [u.id, `${u.first_name} ${u.last_name ?? ''}`.trim()]));

        // ── Helper: filter call tracker records (call_status IS NOT NULL, applied
        // upstream in callTrackerBaseWhere) for a user within a date range, against
        // a given (already Lead-Source-Type-filtered) subset of records. Returns the
        // matching records themselves so callers can both count and list them.
        const filterCalls = (records: typeof callTrackerRecords, userId: number, from: Date, to: Date) => {
            return records.filter(r => {
                if (r.user_id !== userId) return false;
                const d = r.date.getTime();
                return d >= from.getTime() && d <= to.getTime();
            });
        };

        // ── Helper: converted Digital Enquiries for one user within a date range
        const filterDigitalEnquiries = (userId: number, from: Date, to: Date) => {
            return convertedDigitalEnquiries.filter(e => {
                if (e.created_by_id !== userId || !e.converted_at) return false;
                const d = e.converted_at.getTime();
                return d >= from.getTime() && d <= to.getTime();
            });
        };

        // ── Helper: aggregate SWAT achieved values for one user over a date range
        const aggSwat = (userId: number, from: Date, to: Date) => {
            const recs = swatRecords.filter(r => {
                if (r.user_id !== userId) return false;
                const d = r.date.getTime();
                return d >= from.getTime() && d <= to.getTime();
            });
            return {
                demos_achieved:  recs.reduce((s, r) => s + (r.demos_achieved ?? 0), 0),
                proposals:       recs.reduce((s, r) => s + (r.proposals_achieved ?? 0), 0),
            };
        };

        // ── Helper: display name for a lead, matching the Leads/Lead Report convention
        const leadDisplayName = (l: typeof allLeads[number]) =>
            l.company_name
            || l.company_master?.name
            || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim()
            || `Lead #${l.id}`;

        // ── Helper: sales-pipeline breakdown per stage for one user within a date range ─
        // Stage order per pipeline.md: Order Won, Q4, Q3, Q2, Q1, Nurturing, Order Lost.
        // Returns both the counts and the per-stage lead lists used by the hover tooltip.
        // `leads` is the subset already filtered down to one Lead Source Type.
        const leadBreakdown = (leads: typeof allLeads, userId: number, from: Date, to: Date) => {
            leads = leads.filter(l => {
                if (l.lead_owner_id !== userId) return false;
                if (!l.enquiry_date) return false;
                const d = l.enquiry_date.getTime();
                return d >= from.getTime() && d <= to.getTime();
            });

            const details = emptyLeadDetails();
            const counts = { order_won: 0, q4: 0, q3: 0, q2: 0, q1: 0, nurturing: 0, order_lost: 0, total: 0 };

            PIPELINE_STAGES.forEach(stage => {
                const staged = leads.filter(l => l.quadrant === STAGE_QUADRANT[stage]);
                counts[stage]   = staged.length;
                counts.total   += staged.length;
                details[stage]  = staged.map(l => ({
                    id:         l.id,
                    name:       leadDisplayName(l),
                    created_at: l.enquiry_date!,
                    source:     l.lead_source?.name ?? '—',
                }));
                details.total.push(...details[stage]);
            });

            return { counts, details };
        };

        // ── Build one row per BDE ─────────────────────────────────────────────
        // calls_target / leads_target (daily) scaled by actual Mon–Fri working days in [from, to].
        // Target is shared across every Lead Source Type section unchanged; only the
        // Achieved side is scoped to `leadsSubset`/`callsSubset` (one Lead Source Type).
        const buildRow = (userId: number, from: Date, to: Date, leadsSubset: typeof allLeads, callsSubset: typeof callTrackerRecords, isDigitalSection: boolean) => {
            const s  = aggSwat(userId, from, to);
            const { counts: lc, details } = leadBreakdown(leadsSubset, userId, from, to);
            const workingDays    = countWorkingDays(from, to);
            const cfgCallsTarget  = (targetCallsMap.get(userId) ?? 0) * workingDays;
            const matchedCalls    = filterCalls(callsSubset, userId, from, to);
            const callsAchieved   = matchedCalls.length;
            const callDetails: LeadDetail[] = matchedCalls.map(c => ({
                id: c.id, name: c.company_name || `Call #${c.id}`,
                created_at: c.date, source: c.lead_source?.name ?? '—',
            }));

            // Lead Achievement: for the Digital Lead Source Type, sourced from
            // Enquiry conversions (digital_leads_target / converted-Enquiry count)
            // rather than the Lead-table pipeline breakdown — see digitalType
            // comment above for why. Every other type keeps the existing
            // enquiry_date-based pipeline total, which always equals the Sales
            // Pipeline stage total since both use the same filtered lead set.
            let leadsTarget: number, leadsAchieved: number, leadsDetails: LeadDetail[];
            if (isDigitalSection) {
                const matchedEnquiries = filterDigitalEnquiries(userId, from, to);
                leadsTarget   = (targetDigitalLeadsMap.get(userId) ?? 0) * workingDays;
                leadsAchieved = matchedEnquiries.length;
                leadsDetails  = matchedEnquiries.map(e => ({
                    id: e.id, name: e.company_name || e.contact_name || `Enquiry #${e.id}`,
                    created_at: e.converted_at!, source: e.lead_source?.name ?? '—',
                }));
            } else {
                leadsTarget   = (targetLeadsMap.get(userId) ?? 0) * workingDays;
                leadsAchieved = lc.total;
                leadsDetails  = [];
            }

            return {
                bde_id:   userId,
                bde_name: userMap.get(userId) ?? `User ${userId}`,
                calls:      { target: cfgCallsTarget, achieved: callsAchieved, percent: safePct(callsAchieved, cfgCallsTarget), details: callDetails },
                leads:      { target: leadsTarget, achieved: leadsAchieved, percent: safePct(leadsAchieved, leadsTarget), details: leadsDetails },
                lead_count: lc,
                lead_details: details,
                demos:      { achieved: s.demos_achieved },
                proposals:  { submitted: s.proposals },
            };
        };

        // ── Build one section per active Lead Source Type ──────────────────────
        // A BDE restricted to specific Lead Source Types (Manage Privileges → Lead
        // Source Types) is left out of every other type's rows entirely, rather
        // than showing up with zeroed metrics. And when NO in-scope BDE is
        // applicable to a type (e.g. Selvam selected alone, restricted to Direct +
        // Reference only), that type's table is dropped from the response
        // entirely — not shown empty — for both the single-BDE view and the "All
        // BDEs" aggregate view.
        const leadSourceTypeSections = leadSourceTypes.flatMap(t => {
            const typeUserIds = userIds.filter(id => isUserAllowedForType(id, t.id));
            if (!typeUserIds.length) return []; // no in-scope BDE applies to this type — drop the table

            const leadsSubset = leadsByType.get(t.id) ?? [];
            const callsSubset = callsByType.get(t.id) ?? [];
            const isDigitalSection = digitalType?.id === t.id;
            const weeklyRows  = typeUserIds.map(id => buildRow(id, weekStart,  weekEnd,  leadsSubset, callsSubset, isDigitalSection));
            const monthlyRows = typeUserIds.map(id => buildRow(id, monthStart, monthEnd, leadsSubset, callsSubset, isDigitalSection));
            return [{
                id: t.id, name: t.name,
                sources: t.lead_sources.map(s => s.name),
                weekly:  { bde_rows: weeklyRows,  total: sumMetrics(weeklyRows)  },
                monthly: { bde_rows: monthlyRows, total: sumMetrics(monthlyRows) },
            }];
        });

        // ── Product name (for display) ────────────────────────────────────────
        const product = isProductMode
            ? await prisma.product.findUnique({ where: { id: pid! }, select: { name: true } })
            : null;

        // Actual date-range label for the selected week, e.g. "01 Aug – 07 Aug" (per leadgensum.md)
        const weekLabel = `${dayjs.utc(weekStart).format('DD MMM')} – ${dayjs.utc(weekEnd).format('DD MMM')}`;

        return res.json({
            product_name:    product?.name ?? null,
            service_dept:    svcDept,
            is_product_mode: isProductMode,
            sel_month:       selMonth,
            sel_year:        selYear,
            sel_week:        selWeek,
            total_weeks:     totalWeeks,
            week_day_start:  weekDayStart,
            week_day_end:    weekDayEnd,
            week_label:      weekLabel,
            lead_source_types: leadSourceTypeSections,
        });

    } catch (err: any) {
        console.error('[LeadGen] getLeadGenSummary error:', err);
        return res.status(500).json({ message: 'Internal server error', details: err.message });
    }
};

// ── GET /api/lead-gen/bdes ───────────────────────────────────────────────────

export const getLeadGenBdes = async (req: Request, res: Response) => {
    try {
        const { product_id, service_department, company_ids, company_id, lead_source_type_id } = req.query;
        const authUser = (req as any).user;

        const isProductMode = !!(product_id && product_id !== 'null' && product_id !== 'undefined' && product_id !== '');
        const isServiceMode = !!(service_department && service_department !== 'null' && service_department !== '');
        const isCompanyMode = !isProductMode && !isServiceMode && !!(company_id && company_id !== 'null' && company_id !== '');

        const pid     = isProductMode ? parseInt(product_id as string) : null;
        const svcDept = isServiceMode ? (service_department as string) : null;
        const cid     = isCompanyMode ? parseInt(company_id as string) : null;
        const targetTypeId = (lead_source_type_id && lead_source_type_id !== 'null' && lead_source_type_id !== '') ? parseInt(lead_source_type_id as string) : null;

        // BDE dropdown = actual BDEs only (SalesPerson / SalesManager) — CEO/admin
        // accounts aren't BDEs and shouldn't clutter this list.
        let userScopeFilter: any = { status: 'ACTIVE', role: { not: 'CEO' } };
        if (authUser.role === 'SalesPerson') {
            userScopeFilter = { id: authUser.id, status: 'ACTIVE' };
        } else if (authUser.role === 'SalesManager') {
            userScopeFilter = { id: { in: await getTeamIds(authUser) }, status: 'ACTIVE' };
        }

        // Cashflow Report Management Access: opt-in override — when the caller passes
        // company_ids, scope BDEs to users belonging to those companies instead of the
        // normal role hierarchy. Only honored when the requesting user actually has
        // cashflow_management_access, to prevent an arbitrary caller from widening scope.
        if (company_ids && authUser.cashflow_management_access) {
            const ids = String(company_ids).split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
            if (ids.length) userScopeFilter = { company_id: { in: ids }, status: 'ACTIVE', role: { not: 'CEO' } };
        }

        // BDE dropdown must only list users actually granted the LeadGenSummary
        // privilege (Manage Privileges → Lead Gen Summary → View) — access is
        // deny-by-default per user, so an unprivileged BDE shouldn't be selectable here.
        userScopeFilter = {
            AND: [
                userScopeFilter,
                { privileges: { some: { module_name: 'LeadGenSummary', can_view: true } } },
            ],
        };

        let users: { id: number; first_name: string; last_name: string | null }[];

        if (!isProductMode && !isServiceMode && !isCompanyMode) {
            // No filter — return all active BDEs in scope
            users = await prisma.user.findMany({
                where: userScopeFilter,
                select: { id: true, first_name: true, last_name: true },
                orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
            });
        } else {
            let userIds: number[] = [];
            if (isProductMode) {
                const recs = await prisma.userProductTarget.findMany({
                    where: { product_id: pid!, user: userScopeFilter },
                    select: { user_id: true }
                });
                userIds = recs.map(r => r.user_id);
            } else if (isServiceMode) {
                const proxyProduct = await prisma.product.findFirst({ where: { name: svcDept! } });
                const proxyRecs = proxyProduct
                    ? await prisma.userProductTarget.findMany({ where: { product_id: proxyProduct.id, user: userScopeFilter }, select: { user_id: true } })
                    : [];
                userIds = [...new Set(proxyRecs.map(r => r.user_id))];
            } else {
                // Company filter (no specific Product picked yet) — scope to BDEs
                // mapped, via UserProductTarget, to any active product under that company.
                const recs = await prisma.userProductTarget.findMany({
                    where: { product: { company_id: cid!, is_active: true }, user: userScopeFilter },
                    select: { user_id: true }
                });
                userIds = [...new Set(recs.map(r => r.user_id))];
            }

            users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, first_name: true, last_name: true }
            });
        }

        // Lead Source Type filter — narrow to BDEs actually applicable to that type:
        // unrestricted BDEs (no userleadsourcetype rows = see every type) plus BDEs
        // explicitly assigned this type (Manage Privileges → Lead Source Types) —
        // i.e. the "mapped BDEs" list for the selected Lead Source Type.
        if (targetTypeId) {
            const restrictionRows = await prisma.userLeadSourceType.findMany({
                where: { user_id: { in: users.map(u => u.id) } },
                select: { user_id: true, lead_source_type_id: true },
            });
            const allowedTypesByUser = new Map<number, Set<number>>();
            restrictionRows.forEach(r => {
                if (!allowedTypesByUser.has(r.user_id)) allowedTypesByUser.set(r.user_id, new Set());
                allowedTypesByUser.get(r.user_id)!.add(r.lead_source_type_id);
            });
            users = users.filter(u => {
                const allowed = allowedTypesByUser.get(u.id);
                return !allowed || allowed.has(targetTypeId);
            });
        }

        return res.json(users);
    } catch (err: any) {
        console.error('[LeadGen] getLeadGenBdes error:', err);
        return res.status(500).json({ message: 'Internal server error', details: err.message });
    }
};

// ── GET /api/lead-gen/products ───────────────────────────────────────────────
// Product dropdown always stays enabled: with no bde_id, returns all active
// products; once a BDE is selected, returns only the products mapped to that
// BDE via UserProductTarget (per leadgensum.md).

export const getLeadGenProducts = async (req: Request, res: Response) => {
    try {
        const { bde_id, company_id } = req.query;
        const authUser = (req as any).user;
        const cid = (company_id && company_id !== 'null' && company_id !== '') ? parseInt(company_id as string) : null;

        if (!bde_id || bde_id === 'null' || bde_id === '') {
            const products = await prisma.product.findMany({
                where: { is_active: true, ...(cid ? { company_id: cid } : {}) },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            });
            return res.json(products);
        }

        const targetBdeId = parseInt(bde_id as string);

        if (authUser.role === 'SalesPerson' && targetBdeId !== authUser.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (authUser.role === 'SalesManager' && targetBdeId !== authUser.id) {
            if (!(await isInTeam(authUser.id, targetBdeId))) return res.status(403).json({ message: 'Access denied' });
        }

        const recs = await prisma.userProductTarget.findMany({
            where: { user_id: targetBdeId, product: { is_active: true, ...(cid ? { company_id: cid } : {}) } },
            include: { product: { select: { id: true, name: true } } },
        });

        const items = recs
            .filter(r => r.product)
            .map(r => ({ id: r.product!.id, name: r.product!.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return res.json(items);
    } catch (err: any) {
        console.error('[LeadGen] getLeadGenProducts error:', err);
        return res.status(500).json({ message: 'Internal server error', details: err.message });
    }
};
