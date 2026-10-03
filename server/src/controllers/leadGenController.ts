import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

// ── helpers ─────────────────────────────────────────────────────────────────

function safePct(achieved: number, target: number): number {
    if (!target) return 0;
    return Math.round((achieved / target) * 100);
}

function emptyMetrics() {
    return {
        calls:      { target: 0, achieved: 0, percent: 0 },
        // Lead Achievement is a UI placeholder per spec (leadgensum.md) — achieved is not computed.
        leads:      { target: 0, achieved: 0, percent: 0 },
        lead_count: { order_won: 0, q4: 0, q3: 0, q2: 0, q1: 0, nurturing: 0, order_lost: 0, total: 0 },
        demos:      { achieved: 0 },
        proposals:  { submitted: 0 },
    };
}

function sumMetrics(rows: any[]): ReturnType<typeof emptyMetrics> {
    const callsTgt  = rows.reduce((s, r) => s + r.calls.target, 0);
    const callsAch  = rows.reduce((s, r) => s + r.calls.achieved, 0);
    const leadsTgt  = rows.reduce((s, r) => s + r.leads.target, 0);
    const leadsAch  = rows.reduce((s, r) => s + r.leads.achieved, 0);
    return {
        calls:      { target: callsTgt, achieved: callsAch, percent: safePct(callsAch, callsTgt) },
        leads:      { target: leadsTgt, achieved: leadsAch, percent: safePct(leadsAch, leadsTgt) },
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
        const { product_id, service_department, bde_id, month, year, week } = req.query;
        const authUser = (req as any).user;

        const isProductMode = !!(product_id && product_id !== 'null' && product_id !== 'undefined' && product_id !== '');
        const isServiceMode = !!(service_department && service_department !== 'null' && service_department !== '');

        if (!isProductMode && !isServiceMode) {
            return res.status(400).json({ message: 'product_id or service_department is required' });
        }

        const pid     = isProductMode ? parseInt(product_id as string) : null;
        const svcDept = isServiceMode ? (service_department as string) : null;
        const targetBdeId = (bde_id && bde_id !== 'null' && bde_id !== '') ? parseInt(bde_id as string) : null;

        // ── RBAC: resolve which user IDs are in scope ────────────────────────
        let userIds: number[] = [];

        if (authUser.role === 'SalesPerson') {
            userIds = [authUser.id];
        } else if (targetBdeId) {
            if (authUser.role === 'SalesManager' && targetBdeId !== authUser.id) {
                const isSub = await prisma.user.findFirst({ where: { id: targetBdeId, reporting_manager_id: authUser.id } });
                if (!isSub) return res.status(403).json({ message: 'Access denied' });
            }
            userIds = [targetBdeId];
        } else {
            // Aggregate view — scope by role
            let userScopeFilter: any = { status: 'ACTIVE' };
            if (authUser.role === 'SalesManager') {
                userScopeFilter = { OR: [{ id: authUser.id }, { reporting_manager_id: authUser.id }], status: 'ACTIVE' };
            }

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

        if (!userIds.length) {
            return res.json({
                product_name: null, service_dept: svcDept, is_product_mode: isProductMode,
                weekly:  { bde_rows: [], total: emptyMetrics() },
                monthly: { bde_rows: [], total: emptyMetrics() },
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
        const activeProductId = isProductMode ? pid! : (proxyProduct?.id ?? null);
        const q1Multiplier = activeProductId
            ? ((await prisma.product.findUnique({ where: { id: activeProductId }, select: { lead_q1_multiplier: true } }))?.lead_q1_multiplier ?? 1.0)
            : 1.0;

        if (activeProductId) {
            const tgts = await prisma.userProductTarget.findMany({
                where: { product_id: activeProductId, user_id: { in: userIds } },
                select: { user_id: true, calls_target: true, leads_target: true },
            });
            tgts.forEach(t => {
                targetCallsMap.set(t.user_id, t.calls_target ?? 0);
                targetLeadsMap.set(t.user_id, Math.round(((t.leads_target ?? 0) * q1Multiplier) / 22));
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
        };
        if (isProductMode) {
            callTrackerBaseWhere.product_id = pid!;
        } else {
            Object.assign(callTrackerBaseWhere, buildSwatServiceFilter(svcDept!, proxyProduct?.id ?? null));
        }

        const callTrackerRecords = await prisma.callTracker.findMany({
            where: callTrackerBaseWhere,
            select: { user_id: true, date: true },
        });

        // ── Lead count filtered to batchStart–batchEnd (covers week + selected month) ─
        const leadWhere: any = {
            lead_owner_id: { in: userIds },
            created_at: { gte: batchStart, lte: batchEnd },
            ...buildLeadWhere(isProductMode, pid, svcDept),
        };
        const allLeads = await prisma.lead.findMany({
            where: leadWhere,
            select: { lead_owner_id: true, quadrant: true, created_at: true }
        });

        // ── Fetch user display names ──────────────────────────────────────────
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, first_name: true, last_name: true }
        });
        const userMap = new Map(users.map(u => [u.id, `${u.first_name} ${u.last_name ?? ''}`.trim()]));

        // ── Helper: count call tracker records (call_status IS NOT NULL) for a user
        const countCalls = (userId: number, from: Date, to: Date) => {
            return callTrackerRecords.filter(r => {
                if (r.user_id !== userId) return false;
                const d = r.date.getTime();
                return d >= from.getTime() && d <= to.getTime();
            }).length;
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

        // ── Helper: sales-pipeline count per stage for one user within a date range ───
        // Stage order per leadgensum.md: Order Won, Q4, Q3, Q2, Q1, Nurturing, Order Lost.
        const leadCount = (userId: number, from: Date, to: Date) => {
            const leads = allLeads.filter(l => {
                if (l.lead_owner_id !== userId) return false;
                const d = l.created_at.getTime();
                return d >= from.getTime() && d <= to.getTime();
            });
            const order_won  = leads.filter(l => l.quadrant === 'Order Won').length;
            const q4         = leads.filter(l => l.quadrant === 'Q4').length;
            const q3         = leads.filter(l => l.quadrant === 'Q3').length;
            const q2         = leads.filter(l => l.quadrant === 'Q2').length;
            const q1         = leads.filter(l => l.quadrant === 'Q1').length;
            const nurturing  = leads.filter(l => l.quadrant === 'Nurturing').length;
            const order_lost = leads.filter(l => l.quadrant === 'Order Lost').length;
            return {
                order_won, q4, q3, q2, q1, nurturing, order_lost,
                total: order_won + q4 + q3 + q2 + q1 + nurturing + order_lost,
            };
        };

        // ── Build one row per BDE ─────────────────────────────────────────────
        // calls_target / leads_target (daily) scaled by actual Mon–Fri working days in [from, to]
        const buildRow = (userId: number, from: Date, to: Date) => {
            const s  = aggSwat(userId, from, to);
            const lc = leadCount(userId, from, to);
            const workingDays    = countWorkingDays(from, to);
            const cfgCallsTarget  = (targetCallsMap.get(userId) ?? 0) * workingDays;
            const cfgLeadsTarget  = (targetLeadsMap.get(userId) ?? 0) * workingDays;
            const callsAchieved   = countCalls(userId, from, to);
            // Lead Achievement = count of leads created within the selected range (per achivement.md).
            // Always equals the Sales Pipeline stage total for the same leads.
            const leadsAchieved   = lc.total;
            return {
                bde_id:   userId,
                bde_name: userMap.get(userId) ?? `User ${userId}`,
                calls:      { target: cfgCallsTarget, achieved: callsAchieved, percent: safePct(callsAchieved, cfgCallsTarget) },
                leads:      { target: cfgLeadsTarget, achieved: leadsAchieved, percent: safePct(leadsAchieved, cfgLeadsTarget) },
                lead_count: lc,
                demos:      { achieved: s.demos_achieved },
                proposals:  { submitted: s.proposals },
            };
        };

        const weeklyRows  = userIds.map(id => buildRow(id, weekStart,  weekEnd));
        const monthlyRows = userIds.map(id => buildRow(id, monthStart, monthEnd));

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
            weekly:  { bde_rows: weeklyRows,  total: sumMetrics(weeklyRows)  },
            monthly: { bde_rows: monthlyRows, total: sumMetrics(monthlyRows) },
        });

    } catch (err: any) {
        console.error('[LeadGen] getLeadGenSummary error:', err);
        return res.status(500).json({ message: 'Internal server error', details: err.message });
    }
};

// ── GET /api/lead-gen/bdes ───────────────────────────────────────────────────

export const getLeadGenBdes = async (req: Request, res: Response) => {
    try {
        const { product_id, service_department, company_ids } = req.query;
        const authUser = (req as any).user;

        const isProductMode = !!(product_id && product_id !== 'null' && product_id !== 'undefined' && product_id !== '');
        const isServiceMode = !!(service_department && service_department !== 'null' && service_department !== '');

        const pid     = isProductMode ? parseInt(product_id as string) : null;
        const svcDept = isServiceMode ? (service_department as string) : null;

        let userScopeFilter: any = { status: 'ACTIVE' };
        if (authUser.role === 'SalesPerson') {
            userScopeFilter = { id: authUser.id, status: 'ACTIVE' };
        } else if (authUser.role === 'SalesManager') {
            userScopeFilter = { OR: [{ id: authUser.id }, { reporting_manager_id: authUser.id }], status: 'ACTIVE' };
        }

        // Cashflow Report Management Access: opt-in override — when the caller passes
        // company_ids, scope BDEs to users belonging to those companies instead of the
        // normal role hierarchy. Only honored when the requesting user actually has
        // cashflow_management_access, to prevent an arbitrary caller from widening scope.
        if (company_ids && authUser.cashflow_management_access) {
            const ids = String(company_ids).split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
            if (ids.length) userScopeFilter = { company_id: { in: ids }, status: 'ACTIVE' };
        }

        let users: { id: number; first_name: string; last_name: string | null }[];

        if (!isProductMode && !isServiceMode) {
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
            } else {
                const proxyProduct = await prisma.product.findFirst({ where: { name: svcDept! } });
                const proxyRecs = proxyProduct
                    ? await prisma.userProductTarget.findMany({ where: { product_id: proxyProduct.id, user: userScopeFilter }, select: { user_id: true } })
                    : [];
                userIds = [...new Set(proxyRecs.map(r => r.user_id))];
            }

            users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, first_name: true, last_name: true }
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
        const { bde_id } = req.query;
        const authUser = (req as any).user;

        if (!bde_id || bde_id === 'null' || bde_id === '') {
            const products = await prisma.product.findMany({
                where: { is_active: true },
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
            const isSub = await prisma.user.findFirst({ where: { id: targetBdeId, reporting_manager_id: authUser.id } });
            if (!isSub) return res.status(403).json({ message: 'Access denied' });
        }

        const recs = await prisma.userProductTarget.findMany({
            where: { user_id: targetBdeId, product: { is_active: true } },
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
