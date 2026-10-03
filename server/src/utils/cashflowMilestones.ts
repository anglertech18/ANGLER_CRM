import { prisma } from '../lib/prisma';
import { DateWindow, OpenDateRange } from './dateFilters';

// Single source of truth for "which milestones count, and what did they collect"
// shared by the Cashflow Tracker and Cashflow Report modules so the two never
// diverge in their numbers.
//
// - Effective due date = Revised EDC, falling back to EDC (used for Aging).
// - Milestone inclusion is gated by edc_status (all/upcoming/expired,
//   md files/cashflow/edcfilter.md) always, and additionally by the selected date window
//   when filterByEdc is true (This Week/Next Week/Month/Month-selector filters,
//   shared by the Cashflow Tracker and Cashflow Report). CR10: a milestone stays visible in BOTH its Original
//   EDC month and its Revised EDC month — the window match is an OR over EDC
//   and Revised EDC, not just the single effective due date — so postponed
//   collections are never hidden from the month they were originally promised.
// - Upcoming and Expired EDC/REDC additionally drop any milestone that's
//   already fully collected — both buckets mean "money still owed" (overdue
//   for Expired, due for Upcoming), and a fully paid milestone isn't
//   outstanding just because its date is in the past or coming up. Only "all"
//   shows every milestone regardless of collection status.
// - allTimeCollectedByMilestone: cumulative SUM(collected_amount) from
//   lead_milestone_payment_history, all-time, never affected by dateWindow — the
//   permanent "Already Received" figure, used for the milestone progress ratio
//   (Total Collected / Total Expected) and the is_fully_collected read-only gate.
// - periodCollectedByMilestone: SUM(collected_amount) restricted to collection_date
//   falling inside dateWindow — only populated when dateWindow is set. This is the
//   "Period Collected" figure.
// - collectedBeforeWindowByMilestone: SUM(collected_amount) with collection_date
//   strictly before dateWindow.start — only populated when dateWindow is set. Used
//   to derive "Period Expected" as the balance carried forward into the period
//   (Total Expected minus everything collected before the period began), per CR9.
export interface FilteredMilestones {
    allMilestones: any[];
    milestones: any[];
    allTimeCollectedByMilestone: Map<number, number>;
    periodCollectedByMilestone: Map<number, number>;
    collectedBeforeWindowByMilestone: Map<number, number>;
    lastCollectionDateByMilestone: Map<number, Date>;
    useWindow: boolean;
}

export interface MilestonePeriodAmounts {
    already_received: number;
    period_expected: number;
    period_collected: number;
    period_pending: number;
    is_fully_collected: boolean;
    last_collection_date: Date | null;
}

// Derives the CR9 period-ledger figures for a single milestone from the maps
// returned by getFilteredMilestonesForLeads. Shared by Cashflow Tracker and
// Cashflow Report so the two never diverge on the Period Expected/Collected/
// Pending formula or the "Fully Paid" read-only gate.
export function computeMilestonePeriodAmounts(
    milestoneId: number,
    expectedAmount: number,
    filtered: Pick<FilteredMilestones, 'allTimeCollectedByMilestone' | 'periodCollectedByMilestone' | 'collectedBeforeWindowByMilestone' | 'lastCollectionDateByMilestone' | 'useWindow'>
): MilestonePeriodAmounts {
    const alreadyReceived = filtered.allTimeCollectedByMilestone.get(milestoneId) || 0;
    const collectedBeforeWindow = filtered.collectedBeforeWindowByMilestone.get(milestoneId) || 0;
    const periodExpected = filtered.useWindow ? Math.max(expectedAmount - collectedBeforeWindow, 0) : expectedAmount;
    const periodCollected = filtered.useWindow
        ? (filtered.periodCollectedByMilestone.get(milestoneId) || 0)
        : alreadyReceived;
    const periodPending = periodExpected - periodCollected;
    const isFullyCollected = expectedAmount > 0 && alreadyReceived >= expectedAmount - 0.01;

    return {
        already_received: alreadyReceived,
        period_expected: periodExpected,
        period_collected: periodCollected,
        period_pending: periodPending,
        is_fully_collected: isFullyCollected,
        last_collection_date: filtered.lastCollectionDateByMilestone.get(milestoneId) || null,
    };
}

// Parses a comma-separated multi-select filter query param (e.g.
// "Pending,Stuck") into a Set, or null when no filter was supplied (meaning
// "All" — no filtering). Shared by the Cashflow Tracker and Cashflow Report
// so the two never diverge on filter parsing.
export function parseStatusFilter(raw: unknown): Set<string> | null {
    if (!raw || typeof raw !== 'string') return null;
    const values = raw.split(',').map(v => v.trim()).filter(Boolean);
    return values.length ? new Set(values) : null;
}

// A Stuck milestone never contributes to Total Expected or Total Pending/Balance
// — the outstanding amount is not expected to be collected, regardless of the
// selected date window. Its already-collected money still counts toward Total
// Collected (money already received is never un-received). Shared by the
// Cashflow Tracker and Cashflow Report so the two never diverge on this.

// Effective Collection Status for a milestone once its period amounts are known —
// Fully Paid always wins once is_fully_collected, exactly mirroring the
// precedence already used when persisting collection_status in updateMilestone
// (milestoneController.ts) and when building Cashflow Report rows.
export function effectiveCollectionStatus(rawCollectionStatus: string | null | undefined, isFullyCollected: boolean): string {
    return isFullyCollected ? 'Fully Paid' : (rawCollectionStatus || 'Pending');
}

// Shared Collection Status / POA Status multi-select filter predicate, used by
// both the Cashflow Tracker (getOrderWonLeadsWithMilestones) and the Cashflow
// Report (getCashflowReport) so the two modules never diverge on filter
// semantics.
export function matchesStatusFilters(
    collectionStatus: string,
    poaStatus: string | null | undefined,
    collectionStatusFilter: Set<string> | null,
    poaStatusFilter: Set<string> | null
): boolean {
    if (collectionStatusFilter && !collectionStatusFilter.has(collectionStatus)) return false;
    if (poaStatusFilter && !poaStatusFilter.has(poaStatus || 'Pending')) return false;
    return true;
}

export async function getFilteredMilestonesForLeads(
    leadIds: number[],
    edcStatus: string,
    dateWindows: DateWindow[],
    filterByEdc: boolean = false,
    quarterWindows: DateWindow[] = [],
    dateRange: OpenDateRange | null = null,
    // POA EDC From/To filter — gates on the milestone's own POA EDC
    // (lead_milestone.bant_poa_edc), independently of every EDC filter above. A
    // milestone with no POA EDC never matches, the same way the EDC range behaves.
    poaDateRange: OpenDateRange | null = null
): Promise<FilteredMilestones> {
    if (!leadIds.length) {
        return {
            allMilestones: [],
            milestones: [],
            allTimeCollectedByMilestone: new Map(),
            periodCollectedByMilestone: new Map(),
            collectedBeforeWindowByMilestone: new Map(),
            lastCollectionDateByMilestone: new Map(),
            useWindow: false,
        };
    }

    const allMilestones: any[] = await prisma.$queryRawUnsafe(
        `SELECT lm.*, pt.name AS pt_name FROM lead_milestone lm
         LEFT JOIN paymenttype pt ON lm.payment_type_id = pt.id
         WHERE lm.lead_id IN (${leadIds.join(',')}) ORDER BY lm.id ASC`
    );

    const useWindow = dateWindows.length > 0;
    // Money collected before the earliest checked window is still "carried forward" —
    // the balance the period began with — same as the single-window case; a gap
    // between two disjoint checked windows is simply outside every period and
    // affects neither the carried-forward balance nor the period-collected total.
    const earliestWindowStart = useWindow
        ? new Date(Math.min(...dateWindows.map(w => w.start.getTime())))
        : null;

    // Midnight today — the single reference every EDC comparison below uses. Computed
    // once per request so a filter cannot straddle a date change mid-loop.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const milestones = allMilestones.filter((m: any) => {
        const effectiveEdc = m.revised_edc || m.edc;

        // EDC filter (md files/cashflow/edcfilter.md). Both options key off the
        // Effective EDC — Revised EDC, falling back to Original EDC — so whichever
        // date is the current commitment decides Upcoming vs Expired:
        //   Upcoming EDC/REDC → Effective EDC >= today
        //   Expired EDC/REDC  → Effective EDC <  today (no Effective EDC never matches)
        //
        // Every comparison is against the START of today, never the current instant: an
        // EDC is stored at midnight, so comparing it to Date.now() would make a date
        // falling today expired from 00:01 onwards, when the day it was promised for has
        // not finished yet. A date falling today is Upcoming, never expired.
        if (edcStatus !== 'all') {
            if (!effectiveEdc) return false;
            const overdue = new Date(effectiveEdc).getTime() < startOfTodayMs;
            if (edcStatus === 'upcoming' && overdue) return false;
            if (edcStatus === 'expired' && !overdue) return false;
        }

        if (filterByEdc && useWindow) {
            const inAnyWindow = (d: any) => {
                if (!d) return false;
                const t = new Date(d).getTime();
                return dateWindows.some(w => t >= w.start.getTime() && t <= w.end.getTime());
            };
            // CR10: match if EITHER the Original EDC or the Revised EDC falls in ANY of
            // the checked windows — never gate on the effective (revised-first) date alone.
            if (!inAnyWindow(m.edc) && !inAnyWindow(m.revised_edc)) return false;
        }

        // Quarter and From/To Date filters (filter.md) gate on the single Effective
        // EDC (Revised EDC, falling back to EDC) — unlike the Period filter above,
        // there is no OR-match against the original EDC. A milestone with no
        // Effective EDC never matches either filter.
        if (quarterWindows.length) {
            if (!effectiveEdc) return false;
            const t = new Date(effectiveEdc).getTime();
            if (!quarterWindows.some(w => t >= w.start.getTime() && t <= w.end.getTime())) return false;
        }

        if (dateRange) {
            if (!effectiveEdc) return false;
            const t = new Date(effectiveEdc).getTime();
            if (dateRange.from && t < dateRange.from.getTime()) return false;
            if (dateRange.to && t > dateRange.to.getTime()) return false;
        }

        if (poaDateRange) {
            if (!m.bant_poa_edc) return false;
            const t = new Date(m.bant_poa_edc).getTime();
            if (poaDateRange.from && t < poaDateRange.from.getTime()) return false;
            if (poaDateRange.to && t > poaDateRange.to.getTime()) return false;
        }

        return true;
    });

    if (!milestones.length) {
        return {
            allMilestones, milestones,
            allTimeCollectedByMilestone: new Map(),
            periodCollectedByMilestone: new Map(),
            collectedBeforeWindowByMilestone: new Map(),
            lastCollectionDateByMilestone: new Map(),
            useWindow,
        };
    }

    let milestoneIds = milestones.map((m: any) => Number(m.id));

    const allTimeCollectedByMilestone = new Map<number, number>();
    const allTimeRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT lead_milestone_id, SUM(collected_amount) AS total FROM lead_milestone_payment_history
         WHERE lead_milestone_id IN (${milestoneIds.join(',')}) GROUP BY lead_milestone_id`
    );
    for (const r of allTimeRows) {
        allTimeCollectedByMilestone.set(Number(r.lead_milestone_id), Number(r.total || 0));
    }

    // Both EDC/REDC buckets are meant to surface outstanding money still to be
    // collected — Expired means "overdue and still owed," Upcoming means "due
    // and still owed." A milestone that's already been fully collected isn't
    // outstanding any more regardless of which bucket its date falls into, so
    // it's dropped from both. Mirrors the is_fully_collected test in
    // computeMilestonePeriodAmounts.
    if (edcStatus === 'expired' || edcStatus === 'upcoming') {
        const before = milestones.length;
        for (let i = milestones.length - 1; i >= 0; i--) {
            const m = milestones[i];
            const expectedAmount = Number(m.expected_amount || 0);
            const alreadyReceived = allTimeCollectedByMilestone.get(Number(m.id)) || 0;
            const isFullyCollected = expectedAmount > 0 && alreadyReceived >= expectedAmount - 0.01;
            if (isFullyCollected) milestones.splice(i, 1);
        }
        if (milestones.length !== before) {
            milestoneIds = milestones.map((m: any) => Number(m.id));
            if (!milestoneIds.length) {
                return {
                    allMilestones, milestones,
                    allTimeCollectedByMilestone: new Map(),
                    periodCollectedByMilestone: new Map(),
                    collectedBeforeWindowByMilestone: new Map(),
                    lastCollectionDateByMilestone: new Map(),
                    useWindow,
                };
            }
        }
    }

    // Last Collection Date shown in the Cashflow Tracker table below the period
    // collected amount (collectamt.md) — the most recent payment history entry
    // for the milestone, all-time, independent of the selected date window.
    const lastCollectionDateByMilestone = new Map<number, Date>();
    const lastDateRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT lead_milestone_id, MAX(collection_date) AS last_date FROM lead_milestone_payment_history
         WHERE lead_milestone_id IN (${milestoneIds.join(',')}) GROUP BY lead_milestone_id`
    );
    for (const r of lastDateRows) {
        if (r.last_date) lastCollectionDateByMilestone.set(Number(r.lead_milestone_id), r.last_date);
    }

    const periodCollectedByMilestone = new Map<number, number>();
    if (useWindow) {
        // OR across every checked window — a payment counts as "period collected" if its
        // collection_date falls inside ANY of them, matching the strict OR used for the
        // inclusion filter above.
        const windowClause = dateWindows.map(() => '(collection_date >= ? AND collection_date <= ?)').join(' OR ');
        const windowParams = dateWindows.flatMap(w => [w.start, w.end]);
        const periodRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT lead_milestone_id, SUM(collected_amount) AS total FROM lead_milestone_payment_history
             WHERE lead_milestone_id IN (${milestoneIds.join(',')}) AND (${windowClause})
             GROUP BY lead_milestone_id`,
            ...windowParams
        );
        for (const r of periodRows) {
            periodCollectedByMilestone.set(Number(r.lead_milestone_id), Number(r.total || 0));
        }
    }

    const collectedBeforeWindowByMilestone = new Map<number, number>();
    if (useWindow) {
        const beforeRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT lead_milestone_id, SUM(collected_amount) AS total FROM lead_milestone_payment_history
             WHERE lead_milestone_id IN (${milestoneIds.join(',')}) AND collection_date < ?
             GROUP BY lead_milestone_id`,
            earliestWindowStart
        );
        for (const r of beforeRows) {
            collectedBeforeWindowByMilestone.set(Number(r.lead_milestone_id), Number(r.total || 0));
        }
    }

    return { allMilestones, milestones, allTimeCollectedByMilestone, periodCollectedByMilestone, collectedBeforeWindowByMilestone, lastCollectionDateByMilestone, useWindow };
}
