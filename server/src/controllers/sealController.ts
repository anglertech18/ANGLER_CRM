import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(utc);
dayjs.extend(isoWeek);

/**
 * GET /api/seal?product_id=X&fiscal_year=2025&user_id=Y
 * Returns full SEAL dashboard data for a product in a fiscal year (Apr→Mar)
 */
export const getSealData = async (req: Request, res: Response) => {
    try {
        const { product_id, fiscal_year, user_id } = req.query;
        const authUser = (req as any).user;

        const isProductMode = !!(product_id && product_id !== 'null' && product_id !== 'undefined' && product_id !== '');

        if (!isProductMode) {
            return res.status(400).json({ message: 'product_id is required' });
        }

        const pid = parseInt(product_id as string);

        // Sanitize user_id to handle stringified nulls
        const validUserId = (user_id && user_id !== 'null' && user_id !== 'undefined' && user_id !== '') ? user_id : null;

        // Determine fiscal year start (default: current fiscal year)
        let fyStart = parseInt(fiscal_year as string) || dayjs().year();
        // If current month is Jan-Mar, fiscal year started previous year
        if (!fiscal_year) {
            const currentMonth = dayjs().month() + 1;
            if (currentMonth < 4) fyStart = dayjs().year() - 1;
        }

        // RBAC & Target Aggregation Setup
        let targetUserId: number | null = validUserId ? parseInt(validUserId as string) : null;
        let isAggregated = targetUserId === null;

        // Security / Scope Definition
        let userScopeFilter: any = { status: 'ACTIVE' };

        if (authUser.role === 'SalesPerson') {
            targetUserId = authUser.id;
            isAggregated = false; // SalesPerson always views themselves
            userScopeFilter = { id: authUser.id, status: 'ACTIVE' };
        } else if (authUser.role === 'SalesManager') {
            if (targetUserId) {
                // Ensure target is self or subordinate
                if (targetUserId !== authUser.id) {
                    const isSubordinate = await prisma.user.findFirst({
                        where: { id: targetUserId, reporting_manager_id: authUser.id }
                    });
                    if (!isSubordinate) {
                        return res.status(403).json({ message: 'Access denied: You can only view your own or your team\'s data' });
                    }
                }
            } else {
                // Aggregate view for Manager MUST be limited to self + subordinates
                userScopeFilter = {
                    OR: [
                        { id: authUser.id },
                        { reporting_manager_id: authUser.id }
                    ],
                    status: 'ACTIVE'
                };
            }
        }

        // Fiscal year months: Apr fyStart → Mar fyStart+1
        const fiscalMonths = Array.from({ length: 12 }, (_, i) => {
            const d = dayjs.utc(`${fyStart}-04-01`).add(i, 'month');
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
        // Start of previous fiscal year — used to bound the Order Won leads query
        const prevFyStart = dayjs.utc(`${fyStart - 1}-04-01`).startOf('month').toDate();

        // Fetch product info
        const product = await prisma.product.findUnique({ where: { id: pid }, select: { id: true, name: true } });

        // Fetch target user info (or set to Aggregate)
        const targetUser = isAggregated 
            ? { first_name: 'All', last_name: 'Mapped BDEs', role: 'Group' }
            : await prisma.user.findUnique({
                where: { id: targetUserId! },
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
        let userIds: number[] = [];

        const targetQuery: any = isAggregated
            ? { product_id: pid, user: userScopeFilter, OR: activeTargetOR }
            : { user_id: targetUserId!, product_id: pid };
        const recs = await prisma.userProductTarget.findMany({ where: targetQuery });
        const allRecs = recs;
        if (isAggregated) {
            userIds = [...new Set(allRecs.map((t: any) => t.user_id))];
        } else {
            userIds = [targetUserId!];
        }
        monthlySalesTarget = allRecs.reduce((s, t) => s + (t.sales_target || 0), 0);
        monthlyLicenseTarget = allRecs.reduce((s, t) => s + (t.device_target || 0), 0);
        monthlyPartnerTarget = allRecs.reduce((s, t) => s + ((t as any).partner_target || 0), 0);

        // Order Won leads (for license/device count)
        // Use full RBAC scope for lead owner filter (not just users with targets),
        // so BDEs without a target assigned still have their sales_device counted.
        const orderWonLeads: any[] = [];
        const salesStageWon = await prisma.salesStage.findFirst({ where: { name: 'Order Won' } });
        if (salesStageWon) {
            let leadOwnerFilter: any;
            if (isAggregated) {
                const scopedUsers = await prisma.user.findMany({
                    where: userScopeFilter,
                    select: { id: true }
                });
                leadOwnerFilter = { in: scopedUsers.map(u => u.id) };
            } else {
                leadOwnerFilter = targetUserId;
            }
            const leads = await prisma.lead.findMany({
                where: {
                    lead_owner_id: leadOwnerFilter,
                    product_id: pid,
                    sales_stage_id: salesStageWon.id,
                    order_won_at: { gte: prevFyStart, lte: fiscalEnd },
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
        let partnerUserFilter: any;
        if (isAggregated) {
            const scopedUsers = await prisma.user.findMany({
                where: userScopeFilter,
                select: { id: true }
            });
            partnerUserFilter = { in: scopedUsers.map(u => u.id) };
        } else {
            partnerUserFilter = targetUserId;
        }

        const partnerSignUps = await prisma.partner.findMany({
            where: {
                product_id: pid,
                user_id: partnerUserFilter,
                created_at: { gte: fiscalStart, lte: fiscalEnd }
            },
            select: { created_at: true }
        });

        // All leads for this product (for quadrant snapshot)
        const leadWhere: any = {
            lead_owner_id: isAggregated ? { in: userIds } : targetUserId,
            product_id: pid,
        };
        const allLeads = await prisma.lead.findMany({
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

        // Pre-compute: Order Won leads whose order_won_at is BEFORE the fiscal year start
        // These are carries from previous FYs — bucket them into April (first fiscal month)
        const preFyLeads = orderWonLeads.filter(l => dayjs.utc(l.order_won_at).isBefore(dayjs.utc(fiscalStart)));
        const preFyActual = preFyLeads.reduce((s, l) => s + (Number(l.order_value) || 0), 0);
        const preFyLicenseAchieved = preFyLeads.reduce((s, l) => {
            return s + ((l.sales_device && l.sales_device > 0) ? l.sales_device : 1);
        }, 0);

        // Build monthly data rows
        let monthlyData = fiscalMonths.map((m, mIdx) => {
            const wonLeadsInMonth = orderWonLeads.filter(l => {
                const d = dayjs.utc(l.order_won_at);
                return d.year() === m.year && (d.month() + 1) === m.month;
            });

            // For April (index 0): also include pre-FY Order Won leads as carry-forward
            const carryInActual = mIdx === 0 ? preFyActual : 0;
            const carryInLicense = mIdx === 0 ? preFyLicenseAchieved : 0;

            // Actual Value = SUM of order_value from Order Won leads
            const salesActual = carryInActual + wonLeadsInMonth.reduce((s, l) => s + (Number(l.order_value) || 0), 0);
            const variancePct = monthlySalesTarget > 0 ? Math.round((salesActual / monthlySalesTarget) * 100) : 0;

            // Achievement = sales_device if > 0, else count the lead as 1
            const licenseAchieved = carryInLicense + wonLeadsInMonth.reduce((s, l) => {
                return s + ((l.sales_device && l.sales_device > 0) ? l.sales_device : 1);
            }, 0);
            const licensePct = monthlyLicenseTarget > 0 ? Math.round((licenseAchieved / monthlyLicenseTarget) * 100) : 0;

            const partnersInMonth = partnerSignUps.filter(p => {
                const d = dayjs.utc(p.created_at);
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
        const now = dayjs.utc();
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
                        salesTarget: null as any,
                        actual: null as any,
                        variancePct: null as any,
                        licenseTarget: null as any,
                        licenseAchieved: null as any,
                        licensePct: null as any,
                        partnerTarget: null as any,
                        partnerAchieved: null as any,
                        partnerPct: null as any
                    };
                }
                return m;
            });
        } else if (fyStart > currentYearFY) {
            // Future FY
            monthlyData = monthlyData.map(m => ({
                ...m,
                salesTarget: null as any,
                actual: null as any,
                variancePct: null as any,
                licenseTarget: null as any,
                licenseAchieved: null as any,
                licensePct: null as any,
                partnerTarget: null as any,
                partnerAchieved: null as any,
                partnerPct: null as any
            }));
        } else {
            console.log(`Past FY, showing all 12 months.`);
        }
        console.log(`Final monthlyData length: ${monthlyData.length}`);
        console.log('----------------------------');

        // ── Quadrant snapshot ─────────────────────────────────────────────────
        // Actual Leads in Quadrant: group by quadrant, include names for tooltip
        type QuadrantLead = { id: number; name: string; company: string };
        const quadrantLeadsMap: Record<string, QuadrantLead[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
        for (const l of allLeads) {
            const q = l.quadrant as string;
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

        const weeklyReportWhere: any = {
            date: { gte: weekStart, lte: weekEnd },
            product_id: pid
        };
        if (!isAggregated) {
            weeklyReportWhere.user_id = targetUserId;
        } else if (userIds.length > 0) {
            weeklyReportWhere.user_id = { in: userIds };
        }

        const currentWeekReports = await prisma.weeklyReport.findMany({
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
        const seenMovementLeads = new Set<string>(); // "<metric>-<lead_id>"
        type MovementLead = { id: number; name: string; company: string };
        const movementMap: Record<string, MovementLead[]> = {
            Q1_TO_Q2: [], Q2_TO_Q3: [], Q3_TO_Q4: [], Q4_TO_ORDER: []
        };

        for (const report of currentWeekReports) {
            for (const d of report.details) {
                if (!d.lead_id || !d.lead) continue;
                const key = `${d.metric}-${d.lead_id}`;
                if (seenMovementLeads.has(key)) continue;
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
            let movementLeads: MovementLead[] = [];
            if (q === 'Q1') movementLeads = movementMap['Q1_TO_Q2'];
            else if (q === 'Q2') movementLeads = movementMap['Q2_TO_Q3'];
            else if (q === 'Q3') movementLeads = movementMap['Q3_TO_Q4'];
            else if (q === 'Q4') movementLeads = movementMap['Q4_TO_ORDER'];
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
        const weekByDay = (day: number) => {
            if (day <= 7) return 1;
            if (day <= 14) return 2;
            if (day <= 21) return 3;
            return 4;
        };

        // Mirror monthly performance logic: filter orderWonLeads by wm year+month (same as monthly),
        // then partition by week-of-month using day count.
        const weeklyOrderWonLeads = orderWonLeads.filter(l => {
            const d = dayjs.utc(l.order_won_at);
            return d.year() === wm.year && (d.month() + 1) === wm.month;
        });

        // If wm is the first fiscal month (April), carry-forward pre-FY leads into Week 1 —
        // exactly as monthly adds preFyActual into April's salesActual.
        const isFirstFiscalMonth = wm.year === fiscalMonths[0].year && wm.month === fiscalMonths[0].month;

        const weeklyData = [1, 2, 3, 4].map(w => {
            const weekLeads = weeklyOrderWonLeads.filter(
                l => weekByDay(dayjs.utc(l.order_won_at).date()) === w
            );
            const carry = (isFirstFiscalMonth && w === 1) ? preFyActual : 0;
            return {
                week: `Week ${w}`,
                salesTarget: Math.round(monthlySalesTarget / 4),
                salesAchieved: carry + weekLeads.reduce((s, l) => s + (Number(l.order_value) || 0), 0),
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


    } catch (error) {
        console.error('Error fetching SEAL data:', error);
        res.status(500).json({ message: 'Error fetching SEAL data' });
    }
};

/**
 * GET /api/seal/bdes?product_id=X
 * Returns list of allowed BDEs for the dropdown based on role and product targets
 */
export const getBdes = async (req: Request, res: Response) => {
    try {
        const { product_id } = req.query;
        const authUser = (req as any).user;

        if (!product_id || product_id === 'null' || product_id === 'undefined' || product_id === '') {
            return res.status(400).json({ message: 'product_id is required' });
        }

        const activeTargetOR = [
            { sales_target: { gt: 0 } },
            { device_target: { gt: 0 } },
            { leads_target: { gt: 0 } },
            { calls_target: { gt: 0 } }
        ];

        // Build RBAC scope
        let rbacFilter: any = {};
        if (authUser.role === 'SalesManager') {
            rbacFilter = { OR: [{ reporting_manager_id: authUser.id }, { id: authUser.id }] };
        } else if (authUser.role === 'SalesPerson') {
            rbacFilter = { id: authUser.id };
        }

        const pid = parseInt(product_id as string);
        const recs = await prisma.userProductTarget.findMany({
            where: {
                product_id: pid,
                OR: activeTargetOR,
                user: { status: 'ACTIVE', ...rbacFilter }
            },
            select: { user_id: true }
        });
        const userIds = recs.map(r => r.user_id);

        if (userIds.length === 0) return res.json([]);

        const bdes = await prisma.user.findMany({
            where: { id: { in: userIds }, status: 'ACTIVE' },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' }
        });

        res.json(bdes);
    } catch (error) {
        console.error('Error fetching allowed BDEs:', error);
        res.status(500).json({ message: 'Error fetching BDEs' });
    }
};

/**
 * GET /api/seal/weekly-reports
 * Returns all weekly reports with RBAC
 */
export const getWeeklyReports = async (req: Request, res: Response) => {
    try {
        const { user_id, from_date, to_date, product_id } = req.query;
        const authUser = (req as any).user;

        let whereClause: any = {};

        if (user_id && user_id !== '' && user_id !== 'null' && user_id !== 'undefined') {
            const uid = parseInt(user_id as string);
            // RBAC for specific user
            if (authUser.role === 'SalesPerson') {
                whereClause.user_id = authUser.id;
            } else if (authUser.role === 'SalesManager') {
                if (uid !== authUser.id) {
                    const isSubordinate = await prisma.user.findFirst({
                        where: { id: uid, reporting_manager_id: authUser.id }
                    });
                    if (!isSubordinate) {
                        return res.status(403).json({ message: 'Access denied' });
                    }
                }
                whereClause.user_id = uid;
            } else {
                whereClause.user_id = uid;
            }
        } else {
            // Aggregate/Consolidated view RBAC
            if (authUser.role === 'SalesPerson') {
                whereClause.user_id = authUser.id;
            } else if (authUser.role === 'SalesManager') {
                // Fetch self + subordinates first to avoid complex relation filters that might fail
                const subordinates = await prisma.user.findMany({
                    where: {
                        OR: [
                            { id: authUser.id },
                            { reporting_manager_id: authUser.id }
                        ]
                    },
                    select: { id: true }
                });
                const ids = subordinates.map(s => s.id);
                whereClause.user_id = { in: ids };
            } else {
                // Admin/CEO - no user filter
            }
        }

        // Date range filtering
        if (from_date || to_date) {
            whereClause.date = {};
            if (from_date && from_date !== '') {
                whereClause.date.gte = dayjs(from_date as string).startOf('day').toDate();
            }
            if (to_date && to_date !== '') {
                whereClause.date.lte = dayjs(to_date as string).endOf('day').toDate();
            }
        }

        // Product filtering — use product_id directly on WeeklyReport for all roles
        const isProductMode = !!(product_id && product_id !== '' && product_id !== 'null');
        if (isProductMode) {
            whereClause.product_id = parseInt(product_id as string);
        }

        const reports = await prisma.weeklyReport.findMany({
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
    } catch (error: any) {
        console.error('Error fetching weekly reports:', error);
        // Emergency logging to file for debugging
        try {
            require('fs').appendFileSync('scratch/error_log.txt', `[${new Date().toISOString()}] WeeklyReports Error: ${error.message}\nStack: ${error.stack}\n`);
        } catch (e) {}
        res.status(500).json({ message: 'Error fetching weekly reports' });
    }
};

/**
 * GET /api/seal/weekly-reports/latest
 * Returns the most recent report for auto-filling
 */
export const getLatestWeeklyReport = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { user_id, before_date, product_id } = req.query;
        let targetUserId = user_id ? parseInt(user_id as string) : authUser.id;

        // Simple RBAC: allow viewing own or subordinate's latest report
        if (authUser.role === 'SalesPerson') targetUserId = authUser.id;

        const where: any = { user_id: targetUserId };
        if (before_date && before_date !== '' && before_date !== 'null') {
            const d = dayjs(before_date as string);
            if (d.isValid()) {
                where.date = { lt: d.toDate() };
            }
        }
        // Filter by product context so each product's form shows its own previous data
        if (product_id && product_id !== '' && product_id !== 'null') {
            where.product_id = parseInt(product_id as string);
        }

        const latestReport = await prisma.weeklyReport.findFirst({
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
    } catch (error) {
        console.error('Error fetching latest report:', error);
        res.status(500).json({ message: 'Error fetching latest report' });
    }
};

/**
 * GET /api/seal/weekly-reports/leads
 * Returns leads scoped to the selected product for the weekly report form dropdowns.
 */
export const getWeeklyReportLeads = async (req: Request, res: Response) => {
    try {
        const authUser = (req as any).user;
        const { user_id, product_id } = req.query;

        // For SalesPerson: always use their own ID, ignore user_id param
        // For other roles: allow viewing a subordinate's leads via user_id
        let targetUserId: number = Number(authUser.id);
        if (user_id && authUser.role !== 'SalesPerson') {
            targetUserId = parseInt(user_id as string);
        }

        const pid = (product_id && product_id !== '') ? parseInt(product_id as string) : null;

        // Ownership: mirror the Leads page — leads owned by OR created by the target user.
        let whereClause: any = {
            OR: [
                { lead_owner_id: targetUserId },
                { created_by_id: targetUserId },
            ]
        };

        if (pid) {
            // Filter by product for all roles so the dropdown only shows leads for the selected product
            whereClause = { AND: [whereClause, { product_id: pid }] };
        }

        const leads = await prisma.lead.findMany({
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
    } catch (error) {
        console.error('[getWeeklyReportLeads] ERROR:', error);
        res.status(500).json({ message: 'Error fetching leads', error: String(error) });
    }
};

/**
 * POST /api/seal/weekly-reports
 * Creates a new weekly report
 */
export const createWeeklyReport = async (req: Request, res: Response) => {
    try {
        console.log('--- CREATE WEEKLY REPORT START ---');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        const authUser = (req as any).user;
        const {
            date,
            user_id, // Optional user_id for managers
            product_id,
            prev_q4_to_order,
            prev_q3_to_q4,
            prev_q2_to_q3,
            prev_q1_to_q2,
            prev_notes,
            curr_q4_to_order,
            curr_q3_to_q4,
            curr_q2_to_q3,
            curr_q1_to_q2,
            curr_notes
        } = req.body;


        let targetUserId = authUser.id;
        if (user_id && authUser.role === 'SalesManager') {
            const uid = parseInt(user_id as string);
            if (uid !== authUser.id) {
                const isSubordinate = await prisma.user.findFirst({
                    where: { id: uid, reporting_manager_id: authUser.id }
                });
                if (!isSubordinate) {
                    return res.status(403).json({ message: 'Access denied: You can only file reports for yourself or your subordinates' });
                }
            }
            targetUserId = uid;
        } else if (user_id && authUser.role === 'Admin') {
            targetUserId = parseInt(user_id as string);
        }

        // Validation removed to allow backdated reports

        const detailsData: any[] = [];
        const parseIds = (str: string | null | undefined): number[] => {
            if (!str) return [];
            return str.split(/[,\n]/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        };

        // Current Plan
        parseIds(curr_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q4_TO_ORDER' }));
        parseIds(curr_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q3_TO_Q4' }));
        parseIds(curr_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q2_TO_Q3' }));
        parseIds(curr_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q1_TO_Q2' }));
        if (curr_notes) detailsData.push({ value: curr_notes, type: 'CURRENT', metric: 'NOTES' });

        // Previous Data
        parseIds(prev_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q4_TO_ORDER' }));
        parseIds(prev_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q3_TO_Q4' }));
        parseIds(prev_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q2_TO_Q3' }));
        parseIds(prev_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q1_TO_Q2' }));
        if (prev_notes) detailsData.push({ value: prev_notes, type: 'PREVIOUS', metric: 'NOTES' });

        const report = await prisma.weeklyReport.create({
            data: {
                date: new Date(date + 'T00:00:00.000Z'),
                user_id: targetUserId,
                product_id: product_id ? parseInt(product_id) : null,
                details: { create: detailsData }
            }
        });

        res.status(201).json(report);
    } catch (error: any) {
        console.error('Error creating weekly report:', error);
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'A weekly report already exists for this user, date, and product. Please edit the existing report instead.' });
        }
        res.status(500).json({ message: 'Error creating weekly report' });
    }
};

/**
 * PUT /api/seal/weekly-reports/:id
 * Updates an existing weekly report
 */
export const updateWeeklyReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUser = (req as any).user;
        const {
            curr_q4_to_order,
            curr_q3_to_q4,
            curr_q2_to_q3,
            curr_q1_to_q2,
            curr_notes,
            prev_q4_to_order,
            prev_q3_to_q4,
            prev_q2_to_q3,
            prev_q1_to_q2,
            prev_notes
        } = req.body;

        const reportId = parseInt(id);

        // Fetch existing report
        const existingReport = await prisma.weeklyReport.findUnique({
            where: { id: reportId }
        });

        if (!existingReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // RBAC: Only owner or manager
        if (existingReport.user_id !== authUser.id && authUser.role !== 'Admin') {
            // Check reporting manager
            const targetUser = await prisma.user.findFirst({
                where: { id: existingReport.user_id, reporting_manager_id: authUser.id }
            });
            if (!targetUser) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        const parseIds = (str: string | null | undefined): number[] => {
            if (!str) return [];
            return str.split(/[,\n]/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        };

        const detailsData: any[] = [];
        // Current Plan
        parseIds(curr_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q4_TO_ORDER' }));
        parseIds(curr_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q3_TO_Q4' }));
        parseIds(curr_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q2_TO_Q3' }));
        parseIds(curr_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'CURRENT', metric: 'Q1_TO_Q2' }));
        if (curr_notes) detailsData.push({ value: curr_notes, type: 'CURRENT', metric: 'NOTES' });

        // Previous Data (Must persist during update as well)
        parseIds(prev_q4_to_order).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q4_TO_ORDER' }));
        parseIds(prev_q3_to_q4).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q3_TO_Q4' }));
        parseIds(prev_q2_to_q3).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q2_TO_Q3' }));
        parseIds(prev_q1_to_q2).forEach(id => detailsData.push({ lead_id: id, type: 'PREVIOUS', metric: 'Q1_TO_Q2' }));
        if (prev_notes) detailsData.push({ value: prev_notes, type: 'PREVIOUS', metric: 'NOTES' });

        const updatedReport = await prisma.weeklyReport.update({
            where: { id: reportId },
            data: {
                details: {
                    deleteMany: {}, // Clean slate and recreate all details
                    create: detailsData
                }
            }
        });

        res.json(updatedReport);
    } catch (error) {
        console.error('Error updating weekly report:', error);
        res.status(500).json({ message: 'Error updating weekly report' });
    }
};
