import React from 'react';
import clsx from 'clsx';
import { ChevronDown, CalendarDays, CalendarRange } from 'lucide-react';

// Shared filter option lists + control components for the Cashflow Tracker,
// Cashflow Report and Cashflow Forecast modules (md files/cashflow/filter.md)
// — kept in one place so the three modules never diverge in filter UI/behavior.
// Plain native <select> elements are used (rather than the SearchableSelect
// popover) since these option lists are short and fixed — matching the
// existing "Vertical" filter's markup/spacing so nothing overlaps at small
// widths.

// EDC filter options (md files/cashflow/edcfilter.md). The first two read the Original
// EDC only and ignore Revised EDC completely; the third reads Revised EDC only. All
// three compare against the start of today, so a date falling today is "upcoming",
// never past due — the day it was promised for has not finished yet.
// The two past-due options are labelled "Existing", but their values stay `due` /
// `due_revised`: that is the API contract and what users already have persisted.
export const EDC_STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming EDC' },
    { value: 'due', label: 'Existing EDC' },
    { value: 'due_revised', label: 'Existing R.EDC' },
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
// (the retired overdue / existing / existing_revised set). An unrecognised value would
// leave the select blank and still be sent to the API, so it is read back as "All".
export function normalizeEdcStatus(value: string | undefined | null): string {
    return EDC_STATUS_OPTIONS.some(o => o.value === value) ? (value as string) : 'all';
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

export function EdcStatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg pl-2.5 pr-1.5 h-8 bg-white relative shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">EDC</span>
            <select
                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none pr-4 cursor-pointer appearance-none"
                value={value || 'all'}
                onChange={e => onChange(e.target.value)}
            >
                {EDC_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>
    );
}

export function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg pl-2.5 pr-1.5 h-8 bg-white relative shrink-0">
            <CalendarDays size={13} className="text-slate-400 shrink-0" />
            <select
                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none pr-4 cursor-pointer appearance-none"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
            >
                {PERIOD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>
    );
}

export function QuarterSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg pl-2.5 pr-1.5 h-8 bg-white relative shrink-0">
            <CalendarRange size={13} className="text-slate-400 shrink-0" />
            <select
                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none pr-4 cursor-pointer appearance-none"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
            >
                {QUARTER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>
    );
}

export function DateRangeFields({
    fromDate, toDate, onFromChange, onToChange,
}: { fromDate: string; toDate: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 h-8 bg-white shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">From</span>
            <input
                type="date"
                value={fromDate}
                onChange={e => onFromChange(e.target.value)}
                onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-[100px]"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">To</span>
            <input
                type="date"
                value={toDate}
                onChange={e => onToChange(e.target.value)}
                onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-[100px]"
            />
        </div>
    );
}
