"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyReportsForUser = generateDailyReportsForUser;
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const prisma_1 = require("../lib/prisma");
const cashflowMilestones_1 = require("../utils/cashflowMilestones");
dayjs_1.default.extend(utc_1.default);
// Mirrors the local constants in cashflowReportController.ts's
// getCashflowDashboardActivities (not exported from there, so duplicated here
// rather than reaching into a controller file) — keep in sync if those values
// ever change.
const FULLY_PAID_STATUS = 'Fully Paid';
const COMPLETED_POA_STATUS = 'Completed';
// Mirrors reportController.ts's CLOSED_SALES_STAGES — a lead on either of
// these sales stages isn't an open sales activity anymore, same rule the
// Dashboard's Sales Activities cards apply.
const CLOSED_SALES_STAGES = ['Order Won', 'Order Lost'];
// Same metric set/order as the SWAT Performance report page
// (SwatPerformanceIndex.tsx) — kept in sync so the daily report doesn't show a
// narrower slice of SWAT than the module itself.
const SWAT_METRICS = [
    { key: 'calls', label: 'Calls' },
    { key: 'activities', label: 'Activities' },
    { key: 'email_campaign', label: 'Email Campaign' },
    { key: 'linkedin_connection', label: 'LinkedIn Conn Sent' },
    { key: 'q1_lead_gen', label: 'Q1 Lead Gen' },
    { key: 'linkedin', label: 'LinkedIn Acceptance' },
    { key: 'demos', label: 'Demo' },
    { key: 'proposals', label: 'Proposal' },
    { key: 'direct_visit', label: 'Direct Visit' },
    { key: 'sales_order_won', label: 'Sales Order Won' },
    { key: 'revenue_collected', label: 'Revenue Collected' },
];
// Fallback target source when no SwatPerformance row exists yet for the day
// (swatCron hasn't run, or a manual re-run for a past date): map each SWAT
// metric to its UserProductTarget column so the report still shows "0 / target"
// rather than "0 / 0". Same columns saveSwatPerformance/swatCron sync from.
// q1_lead_gen has no dedicated UserProductTarget column — swatController
// derives its per-day target from leads_target via a monthly-working-days
// formula (leads_target * multiplier / 22); falling back to the raw
// leads_target here is an approximation for days a SwatPerformance row wasn't
// saved yet, not the exact prorated figure.
const SWAT_METRIC_TARGET_COLUMN = {
    calls: 'calls_target',
    activities: 'activities_target',
    email_campaign: 'email_target',
    linkedin_connection: 'linkedin_connection_target',
    q1_lead_gen: 'leads_target',
    linkedin: 'linkedin_target',
    demos: 'demos_target',
    proposals: 'proposals_target',
    direct_visit: 'direct_visit_target',
    sales_order_won: 'sales_target',
    revenue_collected: 'revenue_target',
};
// Consolidated Lead Count block — Q1-Q4 plus Nurturing, per Modules/reportstructure.md
// (confirmed with the user: Nurturing is shown alongside Q1-Q4, not instead of
// them, and is otherwise still never used to *filter* the Q1-Q4 sections above).
const LEAD_COUNT_CATEGORIES = ['Q4', 'Q3', 'Q2', 'Q1', 'Nurturing'];
// Every Q1-Q4 section (lead counts, activity filters) only ever considers a
// lead's *current* quadrant — Nurturing/Order Won/Order Lost/no-quadrant leads
// are excluded regardless of status (Modules/dailyreport.md section 12).
const REPORTABLE_QUADRANTS = ['Q1', 'Q2', 'Q3', 'Q4'];
// Builds one Company -> Product report (SWAT, Today's/Expired Sales
// Activities, This Week/Expired Cashflow Milestone+POA, Consolidated Lead
// Count, Q4 Lead Activities) per company the user's active products map to.
// Pure — does not write to the database. See Modules/dailyreport.md.
//
// A BDE can carry products for more than one company (Product -> Company
// mapping, not user.company_id — a user can be tied to several products
// across companies), so this returns one report per company rather than one
// report per user.
async function generateDailyReportsForUser(user, date // 'YYYY-MM-DD'
) {
    // Used for Cashflow Milestone/POA (edc/revised_edc/bant_poa_edc) — those are
    // written from plain date pickers via `new Date('YYYY-MM-DD')`, a genuine
    // UTC-midnight instant, so this server's local (IST) day/week boundaries
    // bucket them correctly.
    const startOfDay = (0, dayjs_1.default)(date).startOf('day').toDate();
    const endOfDay = (0, dayjs_1.default)(date).endOf('day').toDate();
    const endOfWeek = (0, dayjs_1.default)(date).endOf('week').toDate();
    const dbDate = dayjs_1.default.utc(date).startOf('day').toDate();
    const startOfDayMs = startOfDay.getTime();
    const endOfDayMs = endOfDay.getTime();
    const endOfWeekMs = endOfWeek.getTime();
    // Lead.follow_up_datetime (and the FollowUpLog.date copied from it) is a
    // literal wall-clock value tagged "Z" by LeadForm.tsx, not a true UTC
    // instant ("the picked date/time is a plain wall-clock value with no
    // timezone concept... tagged Z so `new Date(...)` reads it as that literal
    // value"). Bucketing it against this server's local (IST) day boundary
    // silently drops any evening engagement into "tomorrow" — e.g. a BDE
    // picking "9:00 PM" today is stored as `...T21:00:00.000Z`, which falls
    // after IST's local day boundary (18:30 UTC). Today's/Overdue Sales
    // Activities below must instead use the UTC-calendar day, matching how the
    // value was written — same fix as reportController.ts's getSalesActivities.
    const engagementDayStartMs = dayjs_1.default.utc(date).startOf('day').valueOf();
    const engagementDayEndMs = dayjs_1.default.utc(date).endOf('day').valueOf();
    const productTargets = await prisma_1.prisma.userProductTarget.findMany({
        where: { user_id: user.id },
        include: { product: { select: { id: true, name: true, is_active: true, company_id: true, company: { select: { id: true, name: true } } } } },
    });
    // Only products mapped to a company can be routed to a recipient — resolve
    // the company from the existing Product -> Company mapping, never from
    // user.company_id (one BDE can handle multiple companies' products).
    const activeProducts = productTargets.filter((pt) => pt.product.is_active && pt.product.company_id);
    if (activeProducts.length === 0)
        return [];
    const companyGroups = new Map();
    for (const pt of activeProducts) {
        const companyId = pt.product.company_id;
        if (!companyGroups.has(companyId)) {
            companyGroups.set(companyId, { company_name: pt.product.company?.name || '', productTargets: [] });
        }
        companyGroups.get(companyId).productTargets.push(pt);
    }
    const employeeName = `${user.first_name} ${user.last_name || ''}`.trim();
    const subjectDate = (0, dayjs_1.default)(date).format('DD/MM/YYYY');
    const subject = `${subjectDate} Day Report - ${employeeName}`;
    const reports = [];
    for (const [companyId, group] of companyGroups) {
        const products = [];
        for (const pt of group.productTargets) {
            const productId = pt.product_id;
            // Every lead this BDE owns for this product, any quadrant/status —
            // Cashflow Milestones/POA live on leads that have already moved past
            // the pipeline (Order Won), so the quadrant filter used for the lead
            // count/activity sections cannot be applied here.
            const [allLeads, swatPerformance] = await Promise.all([
                prisma_1.prisma.lead.findMany({
                    where: { lead_owner_id: user.id, product_id: productId },
                    select: {
                        id: true,
                        company_name: true,
                        quadrant: true,
                        follow_up_datetime: true,
                        product_or_service: true,
                        sales_stage: { select: { name: true } },
                        company_master: { select: { name: true } },
                        follow_up_logs: {
                            orderBy: { created_at: 'desc' },
                            take: 1,
                            select: { status: true, notes: true, activity: { select: { name: true } }, next_activity: { select: { name: true } } },
                        },
                    },
                }),
                prisma_1.prisma.swatPerformance.findFirst({
                    where: { user_id: user.id, date: dbDate, product_id: productId },
                }),
            ]);
            const leadName = (l) => l.company_name || l.company_master?.name || `Lead #${l.id}`;
            const engagementLabel = (l) => {
                const latest = l.follow_up_logs?.[0];
                return latest?.activity?.name || latest?.next_activity?.name || latest?.notes?.trim() || 'Follow-up';
            };
            const engagementStatus = (l) => l.follow_up_logs?.[0]?.status || 'Pending';
            const toActivityRow = (l) => ({
                lead_id: l.id,
                lead_name: leadName(l),
                quadrant: l.quadrant || null,
                engagement: engagementLabel(l),
                engagement_date: l.follow_up_datetime,
                status: engagementStatus(l),
            });
            // Today's/Overdue Sales Activities are scoped the same way as the
            // Dashboard's own Sales Activities cards (reportController.ts
            // getSalesActivities: PRODUCT_CATEGORY_CONDITION + CLOSED_SALES_STAGES)
            // so the two numbers never disagree — a lead on a closed stage
            // (Order Won/Order Lost) or outside the "Product" category doesn't
            // count as an open sales activity here either. Cashflow/Consolidated
            // Lead Count/Q4 List below are unaffected — they have their own,
            // deliberately different, scoping.
            const isSalesActivityEligible = (l) => {
                const isProductCategory = l.product_or_service === 'Product' || l.product_or_service == null;
                const isClosedStage = CLOSED_SALES_STAGES.includes(l.sales_stage?.name);
                return isProductCategory && !isClosedStage;
            };
            // Today's Sales Activities: engagement scheduled today, Achieved =
            // latest Sales Engagement log already Completed.
            const todayLeads = allLeads.filter((l) => {
                if (!isSalesActivityEligible(l))
                    return false;
                if (!l.follow_up_datetime)
                    return false;
                const t = new Date(l.follow_up_datetime).getTime();
                return t >= engagementDayStartMs && t <= engagementDayEndMs;
            });
            const todayTotal = todayLeads.length;
            const todayAchieved = todayLeads.filter((l) => engagementStatus(l) === 'Completed').length;
            // Overdue — engagement date already passed and the latest log is
            // still not Completed — same "still outstanding" rule as the Cash
            // Flow overdue buckets. Rolled into the sales activities summary
            // row's Overdue column rather than its own section/list.
            const expiredCount = allLeads.filter((l) => {
                if (!isSalesActivityEligible(l))
                    return false;
                if (!l.follow_up_datetime)
                    return false;
                if (engagementStatus(l) === 'Completed')
                    return false;
                return new Date(l.follow_up_datetime).getTime() < engagementDayStartMs;
            }).length;
            // Consolidated Lead Count — Q1-Q4 + Nurturing, status is never the filter.
            const leadCounts = { Q4: 0, Q3: 0, Q2: 0, Q1: 0, Nurturing: 0 };
            for (const l of allLeads) {
                if (l.quadrant && LEAD_COUNT_CATEGORIES.includes(l.quadrant))
                    leadCounts[l.quadrant]++;
            }
            // Q4 Lead Activities — every Q4 lead's latest Sales Engagement.
            const q4Activities = allLeads
                .filter((l) => l.quadrant === 'Q4')
                .map(toActivityRow);
            const swat = SWAT_METRICS.map(({ key, label }) => ({
                category: label,
                target: swatPerformance?.[`${key}_target`]
                    ?? pt[SWAT_METRIC_TARGET_COLUMN[key]]
                    ?? 0,
                achieved: swatPerformance?.[`${key}_achieved`] ?? 0,
            }));
            // Cashflow Milestone/POA — same due-window/overdue rules as the Cash
            // Flow Report dashboard's activity cards (getCashflowDashboardActivities),
            // scoped to this product's leads, rolled up into counts only. Milestone
            // stays a "due this week" window; POA is "due today" (confirmed with
            // the user — a same-day next-action cadence rather than weekly).
            const leadIds = allLeads.map((l) => l.id);
            const filtered = await (0, cashflowMilestones_1.getFilteredMilestonesForLeads)(leadIds, 'all', []);
            let milestoneDueThisWeek = 0, milestoneDueThisWeekAmount = 0;
            let milestoneAchieved = 0, milestoneAchievedAmount = 0;
            let milestoneExpired = 0, milestoneExpiredAmount = 0;
            let milestoneOverall = 0, milestoneOverallAmount = 0;
            let poaDueToday = 0, poaAchieved = 0, poaExpired = 0;
            for (const m of filtered.milestones) {
                const expected = Number(m.expected_amount || 0);
                const amounts = (0, cashflowMilestones_1.computeMilestonePeriodAmounts)(Number(m.id), expected, filtered);
                const collectionStatus = (0, cashflowMilestones_1.effectiveCollectionStatus)(m.collection_status, amounts.is_fully_collected);
                const poaStatus = m.poa_status || 'Pending';
                const effectiveEdc = m.revised_edc || m.edc;
                const isOutstanding = collectionStatus !== FULLY_PAID_STATUS && collectionStatus !== 'Stuck';
                // Overall — same "every pending collection" bucket as the Dashboard's
                // Cashflow Overall card: not yet Fully Paid/Stuck, regardless of
                // whether it even has an EDC/REDC to place it in a due/expired bucket.
                if (isOutstanding) {
                    milestoneOverall++;
                    milestoneOverallAmount += Math.max(expected - amounts.already_received, 0);
                }
                if (effectiveEdc) {
                    const due = new Date(effectiveEdc).getTime();
                    if (due >= startOfDayMs && due <= endOfWeekMs) {
                        milestoneDueThisWeek++;
                        milestoneDueThisWeekAmount += expected;
                        if (amounts.is_fully_collected) {
                            milestoneAchieved++;
                            milestoneAchievedAmount += amounts.already_received;
                        }
                    }
                    else if (due < startOfDayMs && isOutstanding) {
                        milestoneExpired++;
                        milestoneExpiredAmount += Math.max(expected - amounts.already_received, 0);
                    }
                }
                if (m.bant_poa_edc) {
                    const poaDue = new Date(m.bant_poa_edc).getTime();
                    if (poaDue >= startOfDayMs && poaDue <= endOfDayMs) {
                        poaDueToday++;
                        if (poaStatus === COMPLETED_POA_STATUS)
                            poaAchieved++;
                    }
                    else if (poaDue < startOfDayMs && poaStatus !== COMPLETED_POA_STATUS) {
                        poaExpired++;
                    }
                }
            }
            products.push({
                product_id: productId,
                product_name: pt.product.name,
                swat,
                swat_performance_percentage: swatPerformance?.performance_percentage ?? 0,
                sales_activities: { total: todayTotal, achieved: todayAchieved, pending: todayTotal - todayAchieved, overdue: expiredCount },
                cashflow_milestone: {
                    due_this_week: milestoneDueThisWeek, due_this_week_amount: milestoneDueThisWeekAmount,
                    achieved: milestoneAchieved, achieved_amount: milestoneAchievedAmount,
                    pending: milestoneDueThisWeek - milestoneAchieved, pending_amount: milestoneDueThisWeekAmount - milestoneAchievedAmount,
                    expired: milestoneExpired, expired_amount: milestoneExpiredAmount,
                    overall: milestoneOverall, overall_amount: milestoneOverallAmount,
                },
                cashflow_poa: { due_today: poaDueToday, achieved: poaAchieved, pending: poaDueToday - poaAchieved, overdue: poaExpired },
                lead_counts: leadCounts,
                q4_activities: q4Activities,
            });
        }
        const html = renderReportHtml(employeeName, group.company_name || null, (0, dayjs_1.default)(date).format('DD-MMM-YYYY'), products);
        reports.push({ company_id: companyId, company_name: group.company_name, subject, html, products });
    }
    return reports;
}
// Colors for the quadrant chip shown next to each lead — purely visual grouping,
// darker/warmer as a lead nears the bottom of the funnel (Q4 = newest/coolest).
// Same quadrant/status palette as the app's own lead badges (Leads.tsx,
// LeadReport.tsx, LeadDetail.tsx, CashflowForecast.tsx use badge-blue/amber/
// orange/green for Q1-Q4, badge-emerald/red for Order Won/Lost).
const QUADRANT_COLORS = {
    Q1: '#1e40af', // blue-800
    Q2: '#92400e', // amber-800
    Q3: '#9a3412', // orange-800
    Q4: '#166534', // green-800
    Nurturing: '#0f766e', // teal-700 — not a quadrant, kept visually distinct from Q1-Q4
};
// FollowUpLog.status / collection_status / poa_status colors — mirrors the
// badge-green/badge-blue/badge-amber/badge-red mapping used for the same
// fields elsewhere in the app (LeadDetail follow-up history, Cashflow Tracker).
const STATUS_COLORS = {
    Completed: '#065f46', // emerald-800 (badge-green)
    'In Progress': '#1e40af', // blue-800 (badge-blue)
    Pending: '#92400e', // amber-800 (badge-amber)
    'Fully Paid': '#065f46',
    Stuck: '#b91c1c',
    Overdue: '#b91c1c',
};
const statusColor = (status) => STATUS_COLORS[status] || '#475569';
// Green for what's been achieved, red/danger for what's overdue — one
// consistent success/danger vocabulary throughout the report.
const ACHIEVEMENT_COLOR = '#166534'; // green-800
const AMBER_COLOR = '#92400e'; // amber-800
const DANGER_COLOR = '#b91c1c'; // red-700
// SWAT % achievement traffic-light: 100-75% green, 75-30% amber, below 30% red.
function percentColor(pct) {
    if (pct >= 75)
        return ACHIEVEMENT_COLOR;
    if (pct >= 30)
        return AMBER_COLOR;
    return DANGER_COLOR;
}
// Outlook's Word rendering engine only inherits font-family one level deep, so
// setting it once on the outer wrapper isn't enough — every element carrying
// text below sets this explicitly. Segoe UI/Calibri is the standard Microsoft
// Office corporate-email stack.
const FONT_FAMILY = "'Segoe UI', Calibri, Arial, Helvetica, sans-serif";
// The whole report body is sized to sit inside an A4 portrait page (210mm ≈
// 794px at 96dpi) minus the preview page's ~10mm print margins — so the
// on-screen email and the printed/exported PDF are the same width and every
// section table's right edge lines up under the next. Outlook's Word engine
// ignores max-width / %, so every table is a fixed-px child of this width.
const PAGE_WIDTH = 680;
// Plain colored/bold text rather than a background "pill" — Outlook's Word
// rendering engine drops span background-color/padding/border-radius, so a pill
// there degrades to unstyled text with stray padding; colored bold text renders
// identically across Outlook, Gmail and Apple Mail.
function chip(text, color) {
    return `<span style="font-family:${FONT_FAMILY};font-weight:700;color:${color || '#475569'};white-space:nowrap;">${escapeHtml(text)}</span>`;
}
// Same ₹ + Indian-digit-grouping format used by the Dashboard's Cashflow cards
// (Dashboard.tsx's `inr` helper).
const inr = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
// Value/count columns are centered — only the leading label column (Product /
// Lead Name) stays left-aligned. Widths are applied via both the HTML width
// attribute and inline style on every th/td (Outlook's Word engine otherwise
// auto-sizes each table from its own content).
const th = (label, widthPx, align = 'left') => `<th width="${widthPx}" style="font-family:${FONT_FAMILY};width:${widthPx}px;padding:6px 8px;text-align:${align};font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.03em;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0;word-wrap:break-word;overflow-wrap:break-word;">${label}</th>`;
const td = (content, widthPx, align = 'left', shaded = false, rowspan = 1, colspan = 1) => `<td width="${widthPx}"${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${colspan > 1 ? ` colspan="${colspan}"` : ''} style="font-family:${FONT_FAMILY};width:${widthPx}px;padding:6px 8px;text-align:${align};font-size:12px;color:#1e293b;border-bottom:1px solid #eef2f7;background:${shaded ? '#f8fafc' : '#ffffff'};vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;">${content}</td>`;
// Highlighted banner (tinted background + left accent bar) rather than plain
// text — background-color on a <td> is what actually survives Outlook's Word
// rendering engine. No margin here — several webmail clients drop margin on
// <table>; spacing is applied by sectionBlock() via <td> padding instead.
function sectionHeading(label) {
    const accent = '#074388';
    return `<table style="width:100%;border-collapse:collapse;"><tr>
        <td style="font-family:${FONT_FAMILY};background:#eef4fc;border:1px solid #c7ddf5;border-left:4px solid ${accent};border-radius:3px;padding:9px 12px;">
            <span style="font-family:${FONT_FAMILY};color:${accent};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">${label}</span>
        </td>
    </tr></table>`;
}
// Wraps one heading + its content table as a single table row, using <td>
// padding (not table margin) for both the gap above the heading and the gap
// between the heading banner and its content — the only spacing mechanism that
// survives every mail client.
function sectionBlock(headingHtml, contentHtml, spaceBefore = 26) {
    return `<tr><td style="font-family:${FONT_FAMILY};padding-top:${spaceBefore}px;">
        ${headingHtml}
        <table style="width:100%;border-collapse:collapse;"><tr><td style="padding-top:10px;">${contentHtml}</td></tr></table>
    </td></tr>`;
}
// Every section below is one consolidated table: a header row plus one body row
// per product (Modules/dailyreport.md — the report groups Company → Product, and
// a BDE can carry several products for one company).
function wrapTable(headerCells, bodyRows) {
    return `<table width="${PAGE_WIDTH}" style="width:${PAGE_WIDTH}px;table-layout:fixed;border-collapse:collapse;border:1px solid #eef2f7;">
        <thead><tr>${headerCells.join('')}</tr></thead>
        <tbody>${bodyRows}</tbody>
    </table>`;
}
// SWAT Performance — one row per product, one column per metric (Modules/
// dailyreport.md 7.1), colored by % achievement. Stays a fixed PAGE_WIDTH
// table here (Outlook-safe, matches every other section) even though 11
// metric columns makes each one fairly narrow in the actual emailed HTML —
// the `data-report-table="swat"` wrapper lets the app's own view page (which
// isn't constrained by Outlook's rendering engine) override just this table's
// column widths to something wider/more readable on screen, without changing
// what's actually mailed (see DailyReportPreview.tsx's screen-only override).
function swatSection(products) {
    // 11 metric columns + a trailing overall "%" column.
    const colCount = SWAT_METRICS.length + 1;
    const metricCol = Math.floor((PAGE_WIDTH - 130) / colCount);
    const prodCol = PAGE_WIDTH - metricCol * colCount;
    const headers = [
        th('Product', prodCol),
        ...SWAT_METRICS.map(m => th(m.label, metricCol, 'center')),
        th('%', metricCol, 'center'),
    ];
    const rows = products.map((p, idx) => {
        const shaded = idx % 2 === 1;
        const cells = [td(escapeHtml(p.product_name), prodCol, 'left', shaded)];
        for (const m of SWAT_METRICS) {
            const row = p.swat.find(s => s.category === m.label);
            const target = row?.target ?? 0;
            const achieved = row?.achieved ?? 0;
            const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
            // Two lines per cell: achieved/target on top, % achievement below,
            // colored by the traffic-light band.
            const pctLine = target > 0
                ? `<span style="font-family:${FONT_FAMILY};font-size:11px;font-weight:700;color:${percentColor(pct)};">${pct}%</span>`
                : `<span style="font-family:${FONT_FAMILY};font-size:11px;color:#94a3b8;">—</span>`;
            cells.push(td(`<span style="font-family:${FONT_FAMILY};font-size:12px;color:#1e293b;">${achieved}/${target}</span><br/>${pctLine}`, metricCol, 'center', shaded));
        }
        // Overall SWAT % — the same performance_percentage saved on the
        // SwatPerformance row (swatController.ts), not a re-derived sum, so
        // this always agrees with the SWAT Performance report page.
        const overallPct = Math.round(p.swat_performance_percentage);
        cells.push(td(chip(`${overallPct}%`, percentColor(overallPct)), metricCol, 'center', shaded));
        return `<tr>${cells.join('')}</tr>`;
    }).join('');
    return `<div data-report-table="swat">${wrapTable(headers, rows)}</div>`;
}
// Lead Sales Activities — Today's total/achieved/pending plus the Overdue
// (expired) count, one row per product (Modules/dailyreport.md 8-9, rolled into
// a single count-only summary row per the current report structure).
function leadSalesActivitySection(products) {
    const prodCol = 160;
    const c = (PAGE_WIDTH - prodCol) / 4;
    const headers = [th('Product', prodCol), th('Total', c, 'center'), th('Achieved', c, 'center'), th('Pending', c, 'center'), th('Overdue', c, 'center')];
    const rows = products.map((p, idx) => {
        const shaded = idx % 2 === 1;
        const s = p.sales_activities;
        return `<tr>
            ${td(escapeHtml(p.product_name), prodCol, 'left', shaded)}
            ${td(`<b>${s.total}</b>`, c, 'center', shaded)}
            ${td(chip(String(s.achieved), ACHIEVEMENT_COLOR), c, 'center', shaded)}
            ${td(`<b>${s.pending}</b>`, c, 'center', shaded)}
            ${td(chip(String(s.overdue), s.overdue > 0 ? DANGER_COLOR : undefined), c, 'center', shaded)}
        </tr>`;
    }).join('');
    return wrapTable(headers, rows);
}
// Cashflow Milestone Activities — two rows per product (Count, then the Amount
// behind each count), with the product name cell spanning both
// (Modules/dailyreport.md 10.1). Overall reuses the Dashboard's "every pending
// collection" figure (see DailyReportMilestoneSummary).
function milestoneSection(products) {
    const prodCol = 110;
    const typeCol = 60;
    const c = (PAGE_WIDTH - prodCol - typeCol) / 5;
    const labels = ['Due This Week', 'Achieved', 'Pending', 'Expired', 'Overall'];
    const headers = [th('Product', prodCol), th('', typeCol, 'center'), ...labels.map(l => th(l, c, 'center'))];
    const rows = products.map((p, idx) => {
        const shaded = idx % 2 === 1;
        const m = p.cashflow_milestone;
        const expiredColor = m.expired > 0 ? DANGER_COLOR : undefined;
        const countCells = [
            td(`<b>${m.due_this_week}</b>`, c, 'center', shaded),
            td(chip(String(m.achieved), ACHIEVEMENT_COLOR), c, 'center', shaded),
            td(`<b>${m.pending}</b>`, c, 'center', shaded),
            td(chip(String(m.expired), expiredColor), c, 'center', shaded),
            td(`<b>${m.overall}</b>`, c, 'center', shaded),
        ].join('');
        const amountCells = [
            td(inr(m.due_this_week_amount), c, 'center', true),
            td(chip(inr(m.achieved_amount), ACHIEVEMENT_COLOR), c, 'center', true),
            td(inr(m.pending_amount), c, 'center', true),
            td(chip(inr(m.expired_amount), expiredColor), c, 'center', true),
            td(inr(m.overall_amount), c, 'center', true),
        ].join('');
        return `<tr>
            ${td(escapeHtml(p.product_name), prodCol, 'left', shaded, 2)}
            ${td('Count', typeCol, 'left', shaded)}${countCells}
        </tr>
        <tr>${td('Amount', typeCol, 'left', true)}${amountCells}</tr>`;
    }).join('');
    return wrapTable(headers, rows);
}
// Cashflow POA Activities — one row per product, "due today" cadence
// (Modules/dailyreport.md 10.2).
function poaSection(products) {
    const prodCol = 200;
    const c = (PAGE_WIDTH - prodCol) / 4;
    const headers = [th('Product', prodCol), th('Due Today', c, 'center'), th('Achieved', c, 'center'), th('Pending', c, 'center'), th('Overdue', c, 'center')];
    const rows = products.map((p, idx) => {
        const shaded = idx % 2 === 1;
        const q = p.cashflow_poa;
        return `<tr>
            ${td(escapeHtml(p.product_name), prodCol, 'left', shaded)}
            ${td(`<b>${q.due_today}</b>`, c, 'center', shaded)}
            ${td(chip(String(q.achieved), ACHIEVEMENT_COLOR), c, 'center', shaded)}
            ${td(`<b>${q.pending}</b>`, c, 'center', shaded)}
            ${td(chip(String(q.overdue), q.overdue > 0 ? DANGER_COLOR : undefined), c, 'center', shaded)}
        </tr>`;
    }).join('');
    return wrapTable(headers, rows);
}
// Consolidated Lead Count — one row per product, one column per category
// (Modules/dailyreport.md 12: Q1-Q4 plus Nurturing, quadrant is the only filter).
function leadCountSection(products) {
    const prodCol = 140;
    const c = (PAGE_WIDTH - prodCol) / LEAD_COUNT_CATEGORIES.length;
    const headers = [th('Product', prodCol), ...LEAD_COUNT_CATEGORIES.map(q => th(q, c, 'center'))];
    const rows = products.map((p, idx) => {
        const shaded = idx % 2 === 1;
        const cells = [td(escapeHtml(p.product_name), prodCol, 'left', shaded)];
        for (const q of LEAD_COUNT_CATEGORIES) {
            cells.push(td(chip(String(p.lead_counts[q] || 0), QUADRANT_COLORS[q]), c, 'center', shaded));
        }
        return `<tr>${cells.join('')}</tr>`;
    }).join('');
    return wrapTable(headers, rows);
}
// Q4 Lead Activities — the one per-lead detail list (Modules/dailyreport.md 13),
// grouped by product with the product name cell spanning that product's rows.
function q4Section(products) {
    const prodCol = 110;
    const nameCol = 190;
    const engCol = 190;
    const dateCol = 90;
    const statusCol = 100;
    const headers = [
        th('Product', prodCol),
        th('Lead Name', nameCol),
        th('Sales Engagement', engCol),
        th('Sales Engagement Date', dateCol, 'center'),
        th('Status', statusCol, 'center'),
    ];
    const rows = products.map((p, idx) => {
        const shaded = idx % 2 === 1;
        const items = p.q4_activities;
        if (items.length === 0) {
            return `<tr>
                ${td(escapeHtml(p.product_name), prodCol, 'left', shaded)}
                ${td('No Q4 activities found.', nameCol + engCol + dateCol + statusCol, 'left', shaded, 1, 4)}
            </tr>`;
        }
        return items.map((r, i) => `<tr>
            ${i === 0 ? td(escapeHtml(p.product_name), prodCol, 'left', shaded, items.length) : ''}
            ${td(escapeHtml(r.lead_name), nameCol, 'left', shaded)}
            ${td(escapeHtml(r.engagement), engCol, 'left', shaded)}
            ${td(r.engagement_date ? (0, dayjs_1.default)(r.engagement_date).format('DD/MM/YYYY') : '—', dateCol, 'center', shaded)}
            ${td(chip(r.status, statusColor(r.status)), statusCol, 'center', shaded)}
        </tr>`).join('');
    }).join('');
    return wrapTable(headers, rows);
}
function renderReportHtml(employeeName, companyName, dateStr, products) {
    const body = [
        sectionBlock(sectionHeading('SWAT Performance'), swatSection(products), 18),
        sectionBlock(sectionHeading('Lead Sales Activities'), leadSalesActivitySection(products)),
        sectionBlock(sectionHeading('Cashflow Milestone Activities'), milestoneSection(products)),
        sectionBlock(sectionHeading('Cashflow POA Activities'), poaSection(products)),
        sectionBlock(sectionHeading('Consolidated Lead Count'), leadCountSection(products)),
        sectionBlock(sectionHeading('Q4 Lead Activities'), q4Section(products)),
    ].join('');
    // Outlook's Word rendering engine doesn't support CSS max-width, so a real
    // width attr + fixed px style keeps the card pinned to the A4 content width
    // in every client (same pattern as every table inside it).
    const cardWidth = PAGE_WIDTH + 40;
    return `
<table cellpadding="0" cellspacing="0" style="width:100%;background:#ffffff;border-collapse:collapse;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" width="${cardWidth}" style="width:${cardWidth}px;background:#ffffff;border-collapse:collapse;font-family:${FONT_FAMILY};">
    <tr><td style="font-family:${FONT_FAMILY};padding:22px 20px 20px;">
        <p style="font-family:${FONT_FAMILY};margin:0 0 14px;font-size:15px;color:#334155;">Good Evening Sir,</p>
        ${companyName ? `<h3 style="font-family:${FONT_FAMILY};color:#074388;font-size:14px;margin:0;">${escapeHtml(companyName)}</h3>` : ''}
        <table style="width:100%;border-collapse:collapse;">
            ${body}
        </table>
        <p style="font-family:${FONT_FAMILY};margin:26px 0 0;font-size:13px;color:#64748b;">Regards,<br/><span style="font-family:${FONT_FAMILY};color:#334155;font-weight:600;">CRM System</span></p>
    </td></tr>
    <tr><td style="font-family:${FONT_FAMILY};padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="font-family:${FONT_FAMILY};margin:0;font-size:11px;color:#94a3b8;">This is an automated daily activity report. Please do not reply to this email.</p>
    </td></tr>
</table>
</td></tr>
</table>`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
