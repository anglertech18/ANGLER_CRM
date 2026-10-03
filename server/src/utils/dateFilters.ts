import dayjs from 'dayjs';

export type QuickFilter = 'this_week' | 'next_week' | 'this_month' | 'next_month';

export interface DateWindow {
    start: Date;
    end: Date;
}

// Resolves the "Quick Date Filter" / "Month Filter" pair used by the Cashflow
// Tracker and Cashflow Report modules into a single [start, end] window.
// quick_filter takes precedence over month when both are supplied, since the
// two controls are mutually exclusive in the UI.
export const resolveDateWindow = (quick_filter?: string, month?: string): DateWindow | null => {
    if (quick_filter) {
        const now = dayjs();
        switch (quick_filter as QuickFilter) {
            case 'this_week':
                return { start: now.startOf('week').toDate(), end: now.endOf('week').toDate() };
            case 'next_week': {
                const next = now.add(1, 'week');
                return { start: next.startOf('week').toDate(), end: next.endOf('week').toDate() };
            }
            case 'this_month':
                return { start: now.startOf('month').toDate(), end: now.endOf('month').toDate() };
            case 'next_month': {
                const next = now.add(1, 'month');
                return { start: next.startOf('month').toDate(), end: next.endOf('month').toDate() };
            }
            default:
                break;
        }
    }

    if (month) {
        const [yr, mo] = month.split('-').map(Number);
        if (yr && mo) {
            return {
                start: new Date(yr, mo - 1, 1),
                end: new Date(yr, mo, 0, 23, 59, 59),
            };
        }
    }

    return null;
};

// Multi-select variant of the pair above — the Duration filter (md files/cashflow/filter.md)
// now lets a user check any combination of Week/Month and Quarter options together, so the
// API accepts each as a comma-separated list and every checked option contributes its own
// window; a milestone matches if it falls in ANY of them (a strict OR, not the span between
// the earliest and latest window — two non-adjacent picks must not sweep in the gap between
// them). `month` has no multi-select UI of its own, so it stays a single fallback value used
// only when no quick_filter option was checked, exactly as resolveDateWindow already did.
export const resolveDateWindows = (quick_filter?: string, month?: string): DateWindow[] => {
    const values = (quick_filter || '').split(',').map(v => v.trim()).filter(Boolean);
    if (values.length) {
        return values
            .map(v => resolveDateWindow(v))
            .filter((w): w is DateWindow => w !== null);
    }
    const fallback = resolveDateWindow(undefined, month);
    return fallback ? [fallback] : [];
};

export type QuarterFilter = 'this_quarter' | 'next_quarter';

// Financial-year quarter (Apr–Mar), used by the "Quarter" cashflow filter
// (Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar) — shared by the Cashflow
// Tracker, Cashflow Report and Cashflow Forecast so they never diverge.
export const resolveQuarterWindow = (quarter?: string): DateWindow | null => {
    if (!quarter) return null;
    const now = dayjs();
    // Financial quarter index (0-3) for the given month (0-11), where FQ0 = Apr-Jun.
    const fqIndexOf = (month: number) => Math.floor(((month + 12 - 3) % 12) / 3);
    const fqIndex = fqIndexOf(now.month());
    // Start month (0-11) of financial quarter 0 (Apr) for the financial year
    // containing `now` — the FY starts in April, so months Jan-Mar belong to the
    // FY that started the previous calendar year.
    const fyStartYear = now.month() >= 3 ? now.year() : now.year() - 1;
    const currentQStartMonth = 3 + fqIndex * 3; // 3,6,9,12
    let qStart = dayjs(new Date(fyStartYear, 0, 1)).month(currentQStartMonth % 12).year(currentQStartMonth >= 12 ? fyStartYear + 1 : fyStartYear).startOf('month');

    if (quarter === 'next_quarter') {
        qStart = qStart.add(3, 'month');
    } else if (quarter !== 'this_quarter') {
        return null;
    }

    const qEnd = qStart.add(2, 'month').endOf('month');
    return { start: qStart.toDate(), end: qEnd.toDate() };
};

// Multi-select variant of resolveQuarterWindow — see resolveDateWindows above for why this
// is a strict per-option OR rather than a single spanning window.
export const resolveQuarterWindows = (quarter?: string): DateWindow[] => {
    const values = (quarter || '').split(',').map(v => v.trim()).filter(Boolean);
    return values
        .map(v => resolveQuarterWindow(v))
        .filter((w): w is DateWindow => w !== null);
};

export interface OpenDateRange {
    from?: Date;
    to?: Date;
}

// From Date / To Date filter — either bound may be omitted, in which case that
// side is unconstrained. Shared by the Cashflow Tracker, Cashflow Report and
// Cashflow Forecast.
export const resolveDateRange = (from?: string, to?: string): OpenDateRange | null => {
    if (!from && !to) return null;
    const range: OpenDateRange = {};
    if (from) range.from = dayjs(from).startOf('day').toDate();
    if (to) range.to = dayjs(to).endOf('day').toDate();
    return range;
};
