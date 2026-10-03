import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import MultiSelect from './MultiSelect';
import DateOverlay from './DateOverlay';

// Shared filter option lists + control components for the Cashflow Tracker,
// Cashflow Report and Cashflow Forecast modules (md files/cashflow/filter.md)
// — kept in one place so the three modules never diverge in filter UI/behavior.
// Plain native <select> elements are used (rather than the SearchableSelect
// popover) since these option lists are short and fixed — matching the
// existing "Vertical" filter's markup/spacing so nothing overlaps at small
// widths.

// EDC filter options (md files/cashflow/edcfilter.md). Used by the Cashflow Tracker
// and Cashflow Report, which both key off the Effective EDC — Revised EDC, falling
// back to Original EDC when there is no Revised EDC — so a single "Upcoming" /
// "Expired" split covers whichever date is the current commitment, instead of
// splitting the view by which date was postponed. Compared against the start of
// today, so a date falling today is "upcoming", never expired — the day it was
// promised for has not finished yet.
export const EDC_STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming EDC/REDC' },
    { value: 'expired', label: 'Expired EDC/REDC' },
];

// The Cashflow Forecast has no Revised EDC concept — a forecast milestone only ever
// has the one date — so it keeps its own plainly-labelled Upcoming/Expired pair
// rather than the EDC/REDC wording above. Kept separate from EDC_STATUS_OPTIONS so
// the Tracker/Report wording never leaks onto a screen where "REDC" means nothing.
// The value stays `due` (not `expired`): that is the Forecast API's contract and
// what users already have persisted.
export const FORECAST_EDC_STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming EDC' },
    { value: 'due', label: 'Expired EDC' },
];

export const PERIOD_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'this_week', label: 'This Week' },
    { value: 'next_week', label: 'Next Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'next_month', label: 'Next Month' },
];

export const QUARTER_OPTIONS = [
    { value: '', label: 'All Quarters' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'next_quarter', label: 'Next Quarter' },
];

// Filters are persisted per user, so a saved value can predate the option list above
// (the retired due / due_revised / due_no_revised set). An unrecognised value would
// leave the select blank and still be sent to the API, so it is read back as "All".
// `options` defaults to the Tracker/Report set; the Forecast passes
// FORECAST_EDC_STATUS_OPTIONS so its own persisted `due` stays valid.
export function normalizeEdcStatus(
    value: string | undefined | null,
    options: { value: string }[] = EDC_STATUS_OPTIONS
): string {
    return options.some(o => o.value === value) ? (value as string) : 'all';
}

// Wrapper for an entity dropdown (Company / Product / BDE / Vertical) so each one renders
// as a consistent pill: icon + control, with an indigo accent once a value is chosen so
// "which filters are live" is visible at a glance.
export function EntityFilter({
    icon: Icon, active = false, children,
}: { icon: any; active?: boolean; children: React.ReactNode }) {
    return (
        <div className={clsx(
            // Fixed height rather than padding: every entity pill then lines up with the
            // period and status controls beside it instead of sizing to its own content.
            'flex items-center gap-1.5 border rounded-lg pl-2 pr-1 h-8 bg-white relative shrink-0 transition-colors',
            active ? 'border-indigo-300 ring-1 ring-indigo-100 bg-indigo-50/40' : 'border-slate-200 hover:border-slate-300'
        )}>
            <Icon size={14} className={clsx('shrink-0 transition-colors', active ? 'text-indigo-600' : 'text-slate-400')} />
            {children}
        </div>
    );
}

// The shared period selects keep their own pill; an outer ring appears once a value
// is set (dates count when either endpoint is filled).
export function ActivePill({ active, children }: { active: boolean; children: React.ReactNode }) {
    return <div className={clsx('rounded-xl transition-all', active && 'ring-2 ring-indigo-200')}>{children}</div>;
}

// `excludeRevised` is for screens with no Revised EDC concept — a forecast milestone
// only ever has the one date — and swaps in FORECAST_EDC_STATUS_OPTIONS' plain
// Upcoming/Expired EDC wording instead of the Tracker/Report's EDC/REDC pair.
export function EdcStatusSelect({ value, onChange, excludeRevised = false }: {
    value: string; onChange: (v: string) => void; excludeRevised?: boolean;
}) {
    const options = excludeRevised ? FORECAST_EDC_STATUS_OPTIONS : EDC_STATUS_OPTIONS;
    return (
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg pl-2.5 pr-1.5 h-8 bg-white relative shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">EDC</span>
            <select
                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none pr-4 cursor-pointer appearance-none"
                value={value || 'all'}
                onChange={e => onChange(e.target.value)}
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>
    );
}

// Week / month and quarter are the same question — "over what stretch of time?" — so
// they read better as one control than as two dropdowns that silently combine. The API
// still takes them as separate `quick_filter` and `quarter` params (each a comma-separated
// list, letting a user check any combination — e.g. This Week + This Quarter together),
// so the combined value is namespaced (`quarter:this_quarter`) and split back apart by the
// caller.
export const DURATION_QUARTER_PREFIX = 'quarter:';

export const DURATION_OPTIONS = [
    ...PERIOD_OPTIONS.filter(o => o.value),
    ...QUARTER_OPTIONS.filter(o => o.value).map(o => ({ value: DURATION_QUARTER_PREFIX + o.value, label: o.label })),
];

// `quickFilter`/`quarter` are each comma-separated lists of checked options — combines
// them into the single namespaced CSV the underlying MultiSelect operates on.
export function durationValue(quickFilter: string, quarter: string): string {
    const week = quickFilter ? quickFilter.split(',').map(v => v.trim()).filter(Boolean) : [];
    const qtr = quarter ? quarter.split(',').map(v => v.trim()).filter(Boolean).map(v => DURATION_QUARTER_PREFIX + v) : [];
    return [...week, ...qtr].join(',');
}

// Splits a picked duration CSV back into the two API params, each still a CSV.
export function parseDuration(value: string): { quick_filter: string; quarter: string } {
    const values = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];
    const quick_filter = values.filter(v => !v.startsWith(DURATION_QUARTER_PREFIX)).join(',');
    const quarter = values.filter(v => v.startsWith(DURATION_QUARTER_PREFIX)).map(v => v.slice(DURATION_QUARTER_PREFIX.length)).join(',');
    return { quick_filter, quarter };
}

// Human-readable label for whatever combination of week/month/quarter options is
// currently checked — e.g. "This Week, This Quarter" — used by the Cashflow Report
// and Forecast pages for their KPI/subtitle text and export filenames.
export function durationLabel(quickFilter: string, quarter: string): string {
    const week = quickFilter ? quickFilter.split(',').map(v => v.trim()).filter(Boolean) : [];
    const qtr = quarter ? quarter.split(',').map(v => v.trim()).filter(Boolean) : [];
    const labels = [
        ...week.map(v => PERIOD_OPTIONS.find(o => o.value === v)?.label).filter(Boolean),
        ...qtr.map(v => QUARTER_OPTIONS.find(o => o.value === v)?.label).filter(Boolean),
    ];
    return labels.join(', ');
}

export function DurationSelect({
    quickFilter, quarter, onChange,
}: { quickFilter: string; quarter: string; onChange: (next: { quick_filter: string; quarter: string }) => void }) {
    return (
        <div className="w-[190px] shrink-0">
            <MultiSelect
                compact
                options={DURATION_OPTIONS}
                value={durationValue(quickFilter, quarter)}
                onChange={v => onChange(parseDuration(v))}
                placeholder="All Durations"
            />
        </div>
    );
}

// `label` names which date the range applies to — omitted it reads as the EDC
// range it has always been; the Cashflow Report also uses it for a second,
// independent POA EDC range, and the two would otherwise be indistinguishable.
export function DateRangeFields({
    fromDate, toDate, onFromChange, onToChange, label,
}: { fromDate: string; toDate: string; onFromChange: (v: string) => void; onToChange: (v: string) => void; label?: string }) {
    return (
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 h-8 bg-white shrink-0">
            {label && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">{label}</span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">From</span>
            <DateOverlay value={fromDate} textClassName="pl-0 text-[11px] font-medium text-slate-700">
                <input
                    type="date"
                    value={fromDate}
                    onChange={e => onFromChange(e.target.value)}
                    onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                    className="text-[11px] font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-[100px]"
                />
            </DateOverlay>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">To</span>
            <DateOverlay value={toDate} textClassName="pl-0 text-[11px] font-medium text-slate-700">
                <input
                    type="date"
                    value={toDate}
                    onChange={e => onToChange(e.target.value)}
                    onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                    className="text-[11px] font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-[100px]"
                />
            </DateOverlay>
        </div>
    );
}
