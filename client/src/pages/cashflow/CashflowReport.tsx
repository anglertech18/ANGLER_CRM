import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    TrendingUp, Wallet, Clock, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ArrowUpDown,
    Package, UserCircle, RefreshCw, Download, Layers,
    Building2, FileSpreadsheet, FileText,
    History, X, ClipboardList, SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { AgingBadge } from '../../components/AgingBadge';
import { PoaStatusBadge, CollectionStatusBadge } from '../../components/StatusBadge';
import MultiSelect from '../../components/MultiSelect';
import { SearchableSelect } from '../../components/FilterDropdown';
import { EdcStatusSelect, PeriodSelect, QuarterSelect, DateRangeFields, PERIOD_OPTIONS, normalizeEdcStatus, EntityFilter, ActivePill } from '../../components/CashflowFilterFields';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Collection % — collected against what was expected in the period, matching the
// "40% Collected" figure in repoUI.md (₹20,000 of ₹50,000).
const collectionPct = (collected: number, expected: number) =>
    expected > 0 ? Math.round((collected / expected) * 100) : 0;

// The report is a flat table — one row per milestone, every attribute in its own
// column. The header band and the Grand Total render as their own <table>s, so the
// column geometry lives in one place: identical table-fixed colgroups, plus a shared
// min-width on the single scroll container, keep every column aligned down the page.
const REPORT_MIN_WIDTH = 1425; // 1285 fixed columns + ≥140 for Cashflow POA
// Column-header height, shared by the header row itself and the sticky offset of the
// Company band that parks beneath it.
const HEAD_ROW_H = 46;

function ReportColgroup() {
    return (
        <colgroup>
            {/* Company and BDE are band rows above their own rows rather than columns —
                they are the levels that would otherwise repeat down the whole page. The
                rest hold real columns, each printing its value only on the first row of
                its run. */}
            <col style={{ width: 200 }} />{/* Client — carries the project name beneath it */}
            <col style={{ width: 95 }} />{/* Vertical / Product */}
            <col style={{ width: 160 }} />{/* Milestone */}
            <col style={{ width: 78 }} />{/* % — collection progress */}
            <col style={{ width: 106 }} />{/* Expected */}
            <col style={{ width: 122 }} />{/* Collected — carries the collection-history icon */}
            <col style={{ width: 106 }} />{/* Pending */}
            <col style={{ width: 100 }} />{/* EDC & Aging — aging pill over the date */}
            <col style={{ width: 92 }} />{/* Revised EDC */}
            <col />{/* Cashflow POA — absorbs remaining width */}
            <col style={{ width: 122 }} />{/* POA Status / EDC */}
            <col style={{ width: 104 }} />{/* Collection Status */}
        </colgroup>
    );
}

// Columns up to and including Pending stay put while the rest scroll sideways: the
// money you are reading has to keep its labels next to it. Each frozen cell needs its
// own left offset, and those offsets are the running sum of the colgroup widths above
// — 200 + 95 + 160 + 78 + 106 + 122, freezing 867px in total. The band and subtotal
// rows span the first three columns in one cell, which is why `label` is the offset
// they use.
const FREEZE_LEFT = {
    label: 0,        // Client / Project — also the colSpan-3 band label
    vertical: 200,   // Vertical / Product
    milestone: 295,
    pct: 455,
    expected: 533,
    collected: 639,
    pending: 761,
};

// A frozen cell must be opaque or the scrolling columns show through it. Rows that
// set their fill on the <tr> (milestone rows, BDE band, subtotals) pass `bg-inherit`
// so the cell picks up the row's own tint — including on hover; rows that fill their
// cells directly (Company band, Grand Total) pass that fill instead.
// Stacking is set inline rather than with a z-* class: two arbitrary Tailwind z values
// resolve by stylesheet order, not by which class is listed last, and the Company band
// has to win over the frozen cells of every row that scrolls beneath it.
const FROZEN = 'sticky';
const Z_FROZEN = 5;        // ordinary frozen cell
const Z_FROZEN_BAND = 15;  // Company band — frozen sideways *and* stuck to the top
const Z_FROZEN_HEAD = 25;  // column header, above both
// The last frozen column carries the seam, drawn inside the cell so it cannot shift
// the fixed column geometry.
const FROZEN_EDGE = 'shadow-[inset_-1px_0_0_0_rgb(148_163_184)]';

// Grand Total closes the page in a light step of the header's own blue — the bar and
// the column header are the two frames around the report, so they share a family.
// Light enough that the figures keep the same measure inks (sky/emerald/amber-700/800)
// they wear everywhere else, so the bar reads as the last row of the table rather
// than as a separate object.
const GRAND_TOTAL_TD = 'bg-blue-100';

// The Company band parks under the column header while its own rows are on screen,
// so you always know which company you are reading. `top-[46px]` must equal
// HEAD_ROW_H, and the fill lives on the cells because a sticky <tr> is not reliable
// across browsers — cells are. It carries the header's own blue, several steps
// lighter: tinted enough to tie it to the header, light enough to keep dark ink.
const COMPANY_CELL = 'sticky top-[46px] bg-blue-100';

// One hue per level, so depth is read by colour instead of by counting indents:
// Company blue → BDE indigo → Client sky → Project amber, each a light fill with a
// saturated left bar of the same family. The four are far enough apart on the wheel
// to stay distinct, and all keep dark ink at these tints. Milestone rows stay white
// and zebra — the leaves are the one level that must not compete for attention, and
// their own rose / emerald status tints have to remain visible on top.
const LEVEL_BAR = {
    company: 'shadow-[inset_4px_0_0_0_#1d4ed8]',  // blue-700
    bde: 'shadow-[inset_4px_0_0_0_#4f46e5]',      // indigo-600
    client: 'shadow-[inset_4px_0_0_0_#0284c7]',   // sky-600
    project: 'shadow-[inset_4px_0_0_0_#f59e0b]',  // amber-500
};

// Keyboard users must be able to see which band they are on: the bands are
// focusable toggles, so they get a visible focus ring rather than a bare outline-none.
const ROW_FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400';

// "Show" control — how far the two band levels are opened. One control covers
// everything the old Expand all / Collapse all pair did and the step in between.
const DEPTH_STEPS = [
    { depth: 1, label: 'Company', hint: 'Company bands only' },
    { depth: 2, label: 'BDE', hint: 'Open to BDE' },
    { depth: 3, label: 'Client', hint: 'Open to client company' },
    { depth: 4, label: 'Project', hint: 'Open to project, milestones closed' },
    { depth: 5, label: 'All', hint: 'Open every milestone' },
];

// The POA columns are grouped by fill rather than by a header span: teal-700 inside
// the blue header band, exactly as in the Cashflow Tracker. Print falls back to the
// header's light fill so the labels stay readable on paper.
const POA_TH = 'bg-teal-700 print:bg-transparent print:text-slate-700';

// Money identity lives in the column header dot, not in the numbers. The three
// amount columns are the only place a hue is spent on "which measure is this",
// which is what lets every figure in the table sit in plain ink and still be read
// unambiguously. The dots only ever appear in the header, so they are tuned for its
// blue fill — the 500/600 shades disappeared against it — and inverted for print.
const MEASURE_DOT: Record<'expected' | 'collected' | 'pending', string> = {
    expected: 'bg-sky-300 print:bg-blue-600',
    collected: 'bg-emerald-300 print:bg-emerald-600',
    pending: 'bg-amber-300 print:bg-amber-600',
};

function MeasureLabel({ measure, label }: { measure: keyof typeof MEASURE_DOT; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', MEASURE_DOT[measure])} />
            {label}
        </span>
    );
}

// Each amount carries its measure's hue, matching the dot on its column header — so
// a figure still says which measure it belongs to after the header has scrolled away.
// The 700/800 shades are dark enough to stay AA on every fill the table uses (white,
// zebra, and the four band tints).
const MEASURE_INK: Record<'expected' | 'collected' | 'pending', string> = {
    expected: 'text-sky-800',
    collected: 'text-emerald-700',
    pending: 'text-amber-700',
};

// The same three measures on the navy Grand Total bar. Dark surfaces need the light
// end of each family — the 700/800 inks above disappear against slate-900 — so these
// are the header-dot shades, which is exactly what the bar sits under.
const MEASURE_INK_DARK: Record<'expected' | 'collected' | 'pending', string> = {
    expected: 'text-sky-300',
    collected: 'text-emerald-300',
    pending: 'text-amber-300',
};

// A zero drops to muted ink rather than its measure hue — it is information, but it
// is not a figure worth colouring, and a column of coloured zeros reads as noise.
function Amount({
    value, weight = 'semibold', tone = 'light', measure, className,
}: {
    value: any; weight?: 'semibold' | 'bold'; tone?: 'light' | 'dark';
    measure?: keyof typeof MEASURE_INK; className?: string;
}) {
    const zero = !Number(value || 0);
    return (
        <span
            className={clsx(
                'text-[12px] tabular-nums',
                weight === 'bold' ? 'font-bold' : 'font-semibold',
                // Muted still has to be *readable* — a zero is information, so it drops to
                // secondary ink (AA against its surface) rather than near-invisible.
                tone === 'dark'
                    ? zero
                        ? 'text-slate-400'
                        : measure ? MEASURE_INK_DARK[measure] : 'text-white'
                    : zero
                        ? 'text-slate-500'
                        : measure ? MEASURE_INK[measure] : 'text-slate-800',
                className
            )}
        >
            {fmt(value)}
        </span>
    );
}

// Stuck money is a status, not a measure: it keeps its reserved colour and always
// travels with an icon and a label, never colour alone.
function StuckTag({ amount, tone = 'light' }: { amount: number; tone?: 'light' | 'dark' }) {
    if (!amount) return null;
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums',
                tone === 'dark' ? 'text-rose-300' : 'text-rose-600'
            )}
            title={`${fmt(amount)} stuck`}
        >
            <AlertTriangle size={10} className="shrink-0" />
            Stuck {fmt(amount)}
        </span>
    );
}

// Collection % — a recessive track with a single accent fill, sized to the row it
// sits in. It now owns a column of its own, so every level shows the same shape.
// The light track is a translucent ink wash rather than a fixed slate, so it stays
// visible on both the white rows and the tinted Company band.
function CollectionBar({ percent, tone = 'light' }: { percent: number; tone?: 'light' | 'dark' }) {
    return (
        <div className={clsx('h-1 w-full rounded-full overflow-hidden', tone === 'dark' ? 'bg-white/20' : 'bg-slate-900/10')}>
            <div
                className={clsx('h-full rounded-full transition-all duration-300', tone === 'dark' ? 'bg-emerald-300' : 'bg-emerald-500')}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
        </div>
    );
}

// The money cells the Grand Total bar shares with the column geometry — % progress,
// the three amounts, then a tail cell that carries Stuck across the remaining five
// columns.
function GroupMoneyCells({
    percent, expected, collected, pending, stuck, tone = 'light', weight = 'bold', cellClass, frozenZ = Z_FROZEN,
}: {
    percent: number; expected: number; collected: number; pending: number; stuck: number;
    tone?: 'light' | 'dark'; weight?: 'semibold' | 'bold'; cellClass?: string; frozenZ?: number;
}) {
    // % and the three amounts are inside the frozen block, so they carry their own
    // offsets. A row that fills its cells (the bands, Grand Total) passes cellClass;
    // one that fills its <tr> falls back to bg-inherit so the cell is still opaque.
    const fill = cellClass || 'bg-inherit';
    return (
        <>
            <td className={clsx('px-2 py-1 align-middle', FROZEN, fill)} style={{ left: FREEZE_LEFT.pct, zIndex: frozenZ }}>
                <div className="flex items-center gap-1.5">
                    <CollectionBar percent={percent} tone={tone} />
                    <span className={clsx('text-[10px] font-semibold tabular-nums shrink-0', tone === 'dark' ? 'text-white/90' : 'text-slate-600')}>
                        {percent}%
                    </span>
                </div>
            </td>
            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap', FROZEN, fill)} style={{ left: FREEZE_LEFT.expected, zIndex: frozenZ }}><Amount value={expected} weight={weight} tone={tone} measure="expected" /></td>
            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap', FROZEN, fill)} style={{ left: FREEZE_LEFT.collected, zIndex: frozenZ }}><Amount value={collected} weight={weight} tone={tone} measure="collected" /></td>
            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap', FROZEN, FROZEN_EDGE, fill)} style={{ left: FREEZE_LEFT.pending, zIndex: frozenZ }}><Amount value={pending} weight={weight} tone={tone} measure="pending" /></td>
            {/* The tail is not frozen sideways, but on the Company band it is still stuck
                to the top, so it needs the same z as the rest of that band. */}
            <td colSpan={5} className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap', cellClass)} style={{ zIndex: frozenZ }}>
                <StuckTag amount={stuck} tone={tone} />
            </td>
        </>
    );
}

// A hierarchy cell — Company, BDE, Client or Project. The value prints only on the
// first row of its run; every following row of the same group leaves the cell empty
// rather than repeating "ANGLER TECHNOLOGIES" forty times down the column. The empty
// cells are what make a run read as one block, so the repetition is not needed to
// tell where a group starts and ends.
function GroupCell({
    show, title, meta, className, titleClass, left,
}: {
    show: boolean; title?: React.ReactNode; meta?: React.ReactNode; className?: string; titleClass?: string;
    left?: number;
}) {
    return (
        <td
            className={clsx('px-2 py-1 align-middle leading-tight text-center', left !== undefined && [FROZEN, 'bg-inherit'], className)}
            style={left !== undefined ? { left, zIndex: Z_FROZEN } : undefined}
        >
            {show && (
                <div className="min-w-0">
                    <div className={clsx('flex items-center justify-center gap-1 min-w-0', titleClass)}>{title}</div>
                    {meta && <div className="text-[10.5px] text-slate-500 leading-tight truncate mt-px">{meta}</div>}
                </div>
            )}
        </td>
    );
}

// Client and Project close with a ∑ subtotal rather than opening with a band: their
// names sit inside the row, so a closing row is the only place their money can roll
// up. It is deliberately quiet — thin, tinted, and marked with a ∑ — so it reads as
// an arithmetic line rather than competing with the detail above it.
function SubtotalRow({
    label, meta, group, tint, accent, indent, labelClass, accentBar, onToggle, collapsed, toggleLabel,
}: {
    label: string; meta?: string; tint: string; accent: string; indent: number;
    labelClass?: string; accentBar: string;
    onToggle?: () => void; collapsed?: boolean; toggleLabel?: string;
    group: { expected: number; collected: number; pending: number; stuck: number };
}) {
    return (
        // Ruled above and below and filled a full step darker than the detail rows, so
        // a ∑ line is found by scanning rather than by reading. The left accent bar is
        // an inset shadow, not a border — a border would shift the fixed column widths.
        <tr
            className={clsx('border-y', tint, onToggle && 'cursor-pointer select-none', onToggle && ROW_FOCUS)}
            style={{ height: 42 }}
            {...(onToggle
                ? {
                    role: 'button', tabIndex: 0, onClick: onToggle,
                    onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
                    },
                    title: `${collapsed ? 'Expand' : 'Collapse'} ${toggleLabel || label}`,
                }
                : {})}
        >
            <td
                colSpan={3}
                className={clsx('py-0.5 pr-2 align-middle leading-tight bg-inherit', FROZEN, accentBar)}
                style={{ paddingLeft: indent, left: FREEZE_LEFT.label, zIndex: Z_FROZEN }}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    {onToggle && (
                        <ChevronRight
                            size={12}
                            className={clsx('shrink-0 transition-transform duration-200', accent, !collapsed && 'rotate-90')}
                        />
                    )}
                    <span className={clsx('text-[12px] font-bold shrink-0', accent)}>∑</span>
                    <span className={clsx('text-[12.5px] font-bold uppercase tracking-wider truncate', labelClass)} title={label}>
                        {label}
                    </span>
                    {meta && <span className="text-[11px] text-slate-600 truncate shrink-0">{meta}</span>}
                </div>
            </td>
            <GroupMoneyCells
                percent={collectionPct(group.collected, group.expected)}
                expected={group.expected} collected={group.collected}
                pending={group.pending} stuck={group.stuck}
            />
        </tr>
    );
}

type SortConfig = { key: string; dir: 'asc' | 'desc' } | null;

function SortArrow({ sortKey, sortConfig }: { sortKey: string; sortConfig: SortConfig }) {
    if (sortConfig?.key !== sortKey) return <ArrowUpDown size={11} className="opacity-40" />;
    return sortConfig.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

function SortTh({
    label, sortKey, align = 'left', style, className, sortConfig, onSort,
}: {
    label: React.ReactNode; sortKey: string; align?: 'left' | 'right' | 'center';
    style?: React.CSSProperties; className?: string; sortConfig: SortConfig; onSort: (key: string) => void;
}) {
    const active = sortConfig?.key === sortKey;
    return (
        <th
            className={clsx(
                'px-2 py-2.5 cursor-pointer select-none hover:text-white transition-colors leading-tight',
                active ? 'text-white print:text-blue-800' : 'text-blue-100 print:text-slate-700',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                className
            )}
            style={style}
            onClick={() => onSort(sortKey)}
            title={`Sort by ${typeof label === 'string' ? label : sortKey}`}
        >
            <span className={clsx('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse', align === 'center' && 'justify-center')}>
                {label}
                <SortArrow sortKey={sortKey} sortConfig={sortConfig} />
            </span>
        </th>
    );
}

// One scope count in the toolbar: the figure leads in dark ink, the noun follows.
function ScopeCount({ value, singular, plural }: { value: number; singular: string; plural: string }) {
    return (
        <div className="flex items-baseline gap-1 text-[11.5px] leading-[1.45] whitespace-nowrap">
            <span className="font-bold tabular-nums text-slate-800">{value}</span>
            <span className="text-slate-500">{value === 1 ? singular : plural}</span>
        </div>
    );
}

// The single column header for the whole report. Every column sorts, including the
// four hierarchy levels — sorting one of them reorders the runs beneath it.
function ReportHeadRow({ sortConfig, onSort }: { sortConfig: SortConfig; onSort: (key: string) => void }) {
    return (
        // Labels sit on the blue gradient: resting ink is blue-100 and the active sort
        // steps up to white, so the sorted column is legible without a second hue.
        <tr className="text-[10px] font-semibold uppercase tracking-wider text-blue-100 print:text-slate-700" style={{ height: HEAD_ROW_H }}>
            {/* Company and BDE have no headers: they name the bands above their rows.
                Client / Project stays left — it is the only column holding names that
                have to line up with their indent. Everything else is centred. */}
            {/* The frozen block needs its own solid fill — the header's gradient lives on
                the wrapper, which a sticky cell would let the scrolling columns show
                through. blue-700 is the gradient's own left end, so the seam is invisible
                until you actually scroll. */}
            <SortTh label={<>Client /<br />Project</>} sortKey="client" sortConfig={sortConfig} onSort={onSort}
                className={clsx(FROZEN, 'bg-blue-700 print:bg-transparent')} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<>Vertical /<br />Product</>} sortKey="vertical" align="center" sortConfig={sortConfig} onSort={onSort}
                className={clsx(FROZEN, 'bg-blue-700 print:bg-transparent')} style={{ left: FREEZE_LEFT.vertical, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label="Milestone" sortKey="milestone" align="center" sortConfig={sortConfig} onSort={onSort}
                className={clsx(FROZEN, 'bg-blue-700 print:bg-transparent')} style={{ left: FREEZE_LEFT.milestone, zIndex: Z_FROZEN_HEAD }} />
            <th className={clsx('px-2 py-2.5 text-center leading-tight bg-blue-700 print:bg-transparent', FROZEN)} style={{ left: FREEZE_LEFT.pct, zIndex: Z_FROZEN_HEAD }}>%</th>
            <SortTh label={<MeasureLabel measure="expected" label="Expected" />} sortKey="period_expected" align="center" sortConfig={sortConfig} onSort={onSort}
                className={clsx(FROZEN, 'bg-blue-700 print:bg-transparent')} style={{ left: FREEZE_LEFT.expected, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<MeasureLabel measure="collected" label="Collected" />} sortKey="period_collected" align="center" sortConfig={sortConfig} onSort={onSort}
                className={clsx(FROZEN, 'bg-blue-700 print:bg-transparent')} style={{ left: FREEZE_LEFT.collected, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<MeasureLabel measure="pending" label="Pending" />} sortKey="period_pending" align="center" sortConfig={sortConfig} onSort={onSort}
                className={clsx(FROZEN, FROZEN_EDGE, 'bg-blue-700 print:bg-transparent')} style={{ left: FREEZE_LEFT.pending, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<>EDC /<br />Aging</>} sortKey="edc" align="center" sortConfig={sortConfig} onSort={onSort} />
            <SortTh label={<>Revised<br />EDC</>} sortKey="revised_edc" align="center" sortConfig={sortConfig} onSort={onSort} />
            {/* The POA columns are a teal block inside the blue band — same carve-out
                the Cashflow Tracker header uses to group them. */}
            <th className={clsx('px-2 py-2.5 text-center leading-tight text-white', POA_TH)}>Cashflow POA</th>
            <th className={clsx('px-2 py-2.5 text-center leading-tight text-white', POA_TH)}>POA EDC /<br />Status</th>
            <SortTh label={<>Collection<br />Status</>} sortKey="collection_status" align="center" sortConfig={sortConfig} onSort={onSort} />
        </tr>
    );
}

// Stat tile: the figure is the hero and wears text ink; the tinted icon plate and
// the top rule carry the measure's identity. Flat tints rather than saturated
// gradients — four loud gradients in a row is what made the header feel cheap.
function KpiCard({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: React.ReactNode; icon: any; tone: string }) {
    const tones: Record<string, [string, string, string]> = {
        // [icon plate bg, icon ink, top rule]
        blue: ['bg-blue-50', 'text-blue-600', 'bg-blue-500'],
        emerald: ['bg-emerald-50', 'text-emerald-600', 'bg-emerald-500'],
        amber: ['bg-amber-50', 'text-amber-600', 'bg-amber-500'],
        violet: ['bg-violet-50', 'text-violet-600', 'bg-violet-500'],
        rose: ['bg-rose-50', 'text-rose-600', 'bg-rose-500'],
    };
    const [plate, ink, rule] = tones[tone] || tones.blue;
    return (
        <div className="relative bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(16,24,40,0.12)] hover:border-slate-300/80 transition-all overflow-hidden h-full">
            <span className={clsx('absolute inset-x-0 top-0 h-0.5', rule)} />
            {/* Compact: the figure is still the hero, but the card is trimmed to the
                height of its three lines of text — this strip sits above the report and
                every pixel it takes is a row the table loses. */}
            <div className="px-3 py-2 flex items-center gap-2.5">
                <span className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', plate)}>
                    <Icon size={15} className={ink} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 leading-tight truncate">{label}</p>
                    <p className="text-[16px] font-bold leading-tight text-slate-900 truncate tabular-nums" title={value}>{value}</p>
                    {sub && <p className="text-[9.5px] text-slate-400 leading-tight truncate">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

// Five-level hierarchy (reportTableUI.md): Company (Company Master) → BDE → Client
// Company → Project/Order → Milestone. Every group header carries its own rollup
// (counts + Expected / Collected / Pending / Stuck) in the same columns as the
// milestone rows beneath it, so a level can be read without expanding it, and every
// level closes with a matching summary row.
//
// Rollup fields shared by all four group levels.
interface Rollup {
    expected: number;
    collected: number;
    pending: number;
    stuck: number;
}

// Level 4 — one project/order, i.e. one lead.
interface ProjectGroup extends Rollup {
    key: string;
    project: string;
    vertical: string;
    product: string;
    rows: any[];
}

// Level 3 — a client company under one executive.
interface ClientGroup extends Rollup {
    key: string;
    client: string;
    city: string | null;
    projects: ProjectGroup[];
    milestones: number;
}

// Level 2 — the executive who owns the client companies beneath. Stretch target
// belongs here rather than on the project rows: the server reports one monthly
// revenue target per BDE, repeated on all of their rows.
interface BdeGroup extends Rollup {
    key: string;
    bde: string;
    stretchTarget: number;
    clients: ClientGroup[];
    // Distinct client companies — a separate field from `clients.length` only at the
    // company level, but kept explicit here so the two are never confused.
    clientCount: number;
    projects: number;
    milestones: number;
}

// Level 1 — a master company (Company Master): one table per company, with each
// executive working that company nested inside it.
interface CompanyGroup extends Rollup {
    key: string;
    company: string;
    bdes: BdeGroup[];
    clients: number;
    projects: number;
    milestones: number;
}

const POA_STATUS_MULTI_OPTIONS = ['Pending', 'In Progress', 'Completed'].map(s => ({ value: s, label: s }));
const COLLECTION_STATUS_MULTI_OPTIONS = ['Pending', 'Partial Paid', 'Fully Paid', 'Stuck'].map(s => ({ value: s, label: s }));

// ── Filter bar building blocks ──
// The twelve filters fall into three groups — Period, Entity, Status — so the bar
// reads as three short lists instead of a flat wall of pills, and each group wraps
// as its own unit on narrow screens.

// EntityFilter / ActivePill now live in components/CashflowFilterFields alongside the
// selects they wrap, so the Tracker renders an identical filter bar.

export default function CashflowReport() {
    const { user: authUser, hasPrivilege } = useAuth();
    // Namespace bumped to v2: the old key may hold a bde_id written by the removed
    // "auto-select logged-in user" default, which would otherwise keep re-applying
    // itself and defeat the All-by-default behavior below.
    const { filters, setFilters } = usePersistentFilters('cashflow-report-v2', {
        month: '', company_id: '', product_id: '', vertical_id: '', bde_id: '', client_company_id: '',
        edc_status: 'all', quick_filter: '', quarter: '', from_date: '', to_date: '',
        collection_status: '', poa_status: '',
    });

    // Every filter defaults to "All" — no date window, no BDE, no company. Nothing
    // is pre-selected on a first visit; only the user's own explicit selections are
    // restored from the persisted state above.
    const [month, setMonth] = useState(filters.month || '');
    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [clientCompanyId, setClientCompanyIdState] = useState(filters.client_company_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [verticalId, setVerticalId] = useState(filters.vertical_id || '');
    const [bdeId, setBdeIdState] = useState(filters.bde_id || '');
    const [edcStatus, setEdcStatusState] = useState(normalizeEdcStatus(filters.edc_status));
    const [quickFilter, setQuickFilterState] = useState(filters.quick_filter || '');
    const [quarter, setQuarterState] = useState(filters.quarter || '');
    const [fromDate, setFromDateState] = useState(filters.from_date || '');
    const [toDate, setToDateState] = useState(filters.to_date || '');
    const [collectionStatus, setCollectionStatusState] = useState(filters.collection_status || '');
    const [poaStatus, setPoaStatusState] = useState(filters.poa_status || '');
    const [showExportMenu, setShowExportMenu] = useState(false);
    // Filters stay always-visible from lg up; below that they collapse behind a
    // toggle so the 12 controls don't push the table off the first screen.
    // The filter section is its own block below the header, open by default and
    // toggled by the Filters button on every screen size — not just small ones.
    const [showFilters, setShowFilters] = useState(true);
    const [paymentHistoryModal, setPaymentHistoryModal] = useState<{ mid: number; leadId: number } | null>(null);
    const [poaHistoryModal, setPoaHistoryModal] = useState<{ mid: number; leadId: number } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
    // Expand/collapse state is keyed by group key (not index) so it survives
    // filtering, sorting and pagination (repoUI.md). Each of the four group levels
    // collapses independently. The default — companies, executives, client companies
    // and projects open, milestones closed — falls out of the polarity of the sets:
    // the first four track what is *closed*, the last what is *opened*.
    // Both band levels track what is *closed*, so the report opens fully by default
    // and a collapsed band is the exception the user chose.
    const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());
    const [collapsedBdes, setCollapsedBdes] = useState<Set<string>>(new Set());
    const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
    const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
    // Which "Show" step is currently in effect, for highlighting the control. Any
    // manual toggle clears it — the report is then in a mixed state that no single
    // step describes, and a stuck highlight would be a lie.
    const [depthHint, setDepthHint] = useState<number | null>(2);
    // Opening a band reveals its children *closed*, so a click walks the hierarchy one
    // level at a time: a company opens to its BDEs, a BDE to its client companies, a
    // client to its projects, a project to its milestones. Without this, opening one
    // company would drop every milestone it owns onto the page at once.
    const toggleKey = (
        setter: React.Dispatch<React.SetStateAction<Set<string>>>,
        childSetter?: React.Dispatch<React.SetStateAction<Set<string>>>,
        childKeysOf?: (key: string) => string[],
    ) => (key: string) => {
        setDepthHint(null);
        setter(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
                // Expanding: close the level below so only the next one is revealed.
                if (childSetter && childKeysOf) {
                    const children = childKeysOf(key);
                    childSetter(prevChildren => {
                        const nextChildren = new Set(prevChildren);
                        for (const child of children) nextChildren.add(child);
                        return nextChildren;
                    });
                }
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 3; // master companies per page — a company table spans many rows
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close export menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const syncFilters = (patch: Partial<typeof filters>) =>
        setFilters({ ...filters, month, company_id: companyId, product_id: productId, vertical_id: verticalId, bde_id: bdeId, client_company_id: clientCompanyId, edc_status: edcStatus, quick_filter: quickFilter, quarter, from_date: fromDate, to_date: toDate, collection_status: collectionStatus, poa_status: poaStatus, ...patch });

    const setClientCompanyId = (v: string) => { setClientCompanyIdState(v); syncFilters({ client_company_id: v }); };
    const setBdeId = (v: string) => { setBdeIdState(v); syncFilters({ bde_id: v }); };
    const setEdcStatus = (v: string) => { setEdcStatusState(v); syncFilters({ edc_status: v }); };
    const setCollectionStatusFilter = (v: string) => { setCollectionStatusState(v); syncFilters({ collection_status: v }); };
    const setPoaStatusFilter = (v: string) => { setPoaStatusState(v); syncFilters({ poa_status: v }); };
    const setQuickFilter = (v: string) => {
        setQuickFilterState(v);
        setMonth('');
        syncFilters({ quick_filter: v, month: '' });
    };
    const setQuarterFilter = (v: string) => { setQuarterState(v); syncFilters({ quarter: v }); };
    const setFromDate = (v: string) => { setFromDateState(v); syncFilters({ from_date: v }); };
    const setToDate = (v: string) => { setToDateState(v); syncFilters({ to_date: v }); };

    // Assigned Management Access company ids — used to scope products/BDEs when no
    // explicit company is selected, mirroring the company-filter scoping below.
    const managementCompanyIds = useMemo(
        () => (authUser?.cashflow_management_access ? (authUser.cashflow_management_companies || []).map(c => c.company_id) : []),
        [authUser?.cashflow_management_access, authUser?.cashflow_management_companies]
    );

    // Companies — scoped to the assigned management companies when the user has
    // Cashflow "Management Access" (Cashflow Privileges), otherwise the full list.
    const { data: companies = [] } = useQuery({
        queryKey: ['cfr-companies', authUser?.cashflow_management_access, authUser?.cashflow_management_companies],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/masters/company`, { headers: authHeaders() });
            let list = (res.data as any[]).filter((c: any) => c.is_active !== false);
            if (authUser?.cashflow_management_access) {
                const allowedIds = new Set((authUser.cashflow_management_companies || []).map(c => c.company_id));
                list = list.filter((c: any) => allowedIds.has(c.id));
            }
            return list;
        },
        enabled: !!authUser,
        staleTime: 10 * 60 * 1000,
    });

    // Products — filtered by selected company, or by the full set of assigned
    // Management Access companies when no company is explicitly selected.
    const { data: products = [] } = useQuery({
        queryKey: ['cfr-products', companyId, managementCompanyIds],
        queryFn: async () => {
            const params: any = {};
            if (companyId) params.company_id = companyId;
            else if (managementCompanyIds.length) params.company_id = managementCompanyIds.join(',');
            const res = await axios.get(`${API_BASE}/masters/product`, { headers: authHeaders(), params });
            return res.data as { id: number | string; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Verticals
    const { data: verticals = [] } = useQuery({
        queryKey: ['cfr-verticals'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/masters/vertical`, { headers: authHeaders() });
            return (res.data as any[]).filter((v: any) => v.is_active !== false);
        },
        staleTime: 10 * 60 * 1000,
    });

    // BDEs — only those with at least one cashflow milestone matching the current
    // Company/Product/Vertical selection (bde.md: BDE Filter Optimization), scoped
    // server-side by the normal role hierarchy or Cashflow Management Access.
    const { data: bdes = [] } = useQuery({
        queryKey: ['cfr-bdes', productId, companyId, verticalId],
        queryFn: async () => {
            const params: any = {};
            if (productId) params.product_id = productId;
            if (companyId) params.company_id = companyId;
            if (verticalId) params.vertical_id = verticalId;
            const res = await axios.get(`${API_BASE}/cashflow-report/bdes`, {
                headers: authHeaders(),
                params,
            });
            return res.data as any[];
        },
    });

    // Client Company filter (clientcomFilter.md) — only client companies with at
    // least one milestone matching the current Company/Product/Vertical/BDE
    // selection, refreshed dynamically as those filters change.
    const { data: clientCompanies = [] } = useQuery({
        queryKey: ['cfr-client-companies', companyId, productId, verticalId, bdeId],
        queryFn: async () => {
            const params: any = {};
            if (companyId) params.company_id = companyId;
            if (productId) params.product_id = productId;
            if (verticalId) params.vertical_id = verticalId;
            if (bdeId) params.bde_id = bdeId;
            const res = await axios.get(`${API_BASE}/cashflow-report/client-companies`, { headers: authHeaders(), params });
            return res.data as { id: number; name: string }[];
        },
    });

    // Report data — loads with any combination of filters (all optional)
    const { data: report, isLoading, error, refetch } = useQuery({
        queryKey: ['cashflow-report', month, companyId, productId, verticalId, bdeId, clientCompanyId, edcStatus, quickFilter, quarter, fromDate, toDate, collectionStatus, poaStatus],
        queryFn: async () => {
            const params: any = {};
            if (quickFilter) params.quick_filter = quickFilter;
            else if (month) params.month = month;
            if (quarter) params.quarter = quarter;
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;
            if (companyId) params.company_id = companyId;
            if (productId) params.product_id = productId;
            if (verticalId) params.vertical_id = verticalId;
            if (bdeId) params.bde_id = bdeId;
            if (clientCompanyId) params.client_company_id = clientCompanyId;
            if (edcStatus && edcStatus !== 'all') params.edc_status = edcStatus;
            if (collectionStatus) params.collection_status = collectionStatus;
            if (poaStatus) params.poa_status = poaStatus;
            const res = await axios.get(`${API_BASE}/cashflow-report`, { headers: authHeaders(), params });
            return res.data;
        },
        enabled: hasPrivilege('CashflowReport', 'can_view'),
    });

    const summary = report?.summary || { totalExpected: 0, totalCollected: 0, totalBalance: 0, totalStuck: 0 };
    const rows: any[] = report?.rows || [];

    const SORT_ACCESSORS: Record<string, (r: any) => any> = {
        bde: r => (r.bde_name || '').toLowerCase(),
        // Level 1 is the master company (Company Master); the lead's own company_name
        // is the Level-3 client company.
        company: r => (r.bu_company_name || '').toLowerCase(),
        client: r => (r.company || '').toLowerCase(),
        project: r => (r.project_name || r.product || '').toLowerCase(),
        milestone: r => (r.milestone || '').toLowerCase(),
        period_expected: r => Number(r.period_expected || 0),
        period_collected: r => Number(r.period_collected || 0),
        period_pending: r => Number(r.period_pending || 0),
        edc: r => (r.edc ? new Date(r.edc).getTime() : null),
        aging: r => (r.aging ?? null),
        revised_edc: r => (r.revised_edc ? new Date(r.revised_edc).getTime() : null),
        collection_status: r => (r.collection_status || '').toLowerCase(),
        vertical: r => (r.vertical || '').toLowerCase(),
        product: r => (r.product || '').toLowerCase(),
    };

    // Sorted rows — sorting runs before grouping so the chosen sort drives both
    // the order of Company/Project groups and the milestones inside them.
    const sortedRows = useMemo(() => {
        if (!sortConfig) return rows;
        const accessor = SORT_ACCESSORS[sortConfig.key];
        if (!accessor) return rows;
        const dir = sortConfig.dir === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
            if (bv === null || bv === undefined) return -1;
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [rows, sortConfig]); // eslint-disable-line react-hooks/exhaustive-deps

    // Nothing is narrowed client-side: the rows on screen are exactly what the API
    // returned for the current filters, so the server summary describes them directly.
    const viewRows = sortedRows;
    const viewSummary = summary;

    // Company (Company Master) → BDE → Client Company → Project → Milestone hierarchy
    // (reportTableUI.md). Rollups are computed over the full filtered result set, not
    // just the current page, so they stay correct regardless of pagination. Follows the
    // same Stuck business rule as the dashboard cards (companysummary.md): a Stuck
    // milestone's Collected amount always counts, but its Expected/Pending are
    // excluded — its outstanding amount is surfaced separately as Stuck.
    const companyGroups = useMemo(() => {
        const list: CompanyGroup[] = [];
        const companyByKey = new Map<string, CompanyGroup>();
        const bdeByKey = new Map<string, BdeGroup>();
        const clientByKey = new Map<string, ClientGroup>();
        const projectByKey = new Map<string, ProjectGroup>();
        // Distinct client companies per master company and per BDE — the same client
        // can be worked by two executives, so the counts are sets rather than sums.
        const companyClients = new Map<string, Set<string>>();
        const bdeClients = new Map<string, Set<string>>();

        for (const r of viewRows) {
            const company = r.bu_company_name && r.bu_company_name !== '—' ? r.bu_company_name : '—';
            const bde = r.bde_name || '—';
            const client = r.company || '—';
            const project = r.project_name || r.product || '—';
            // Master company is keyed by id where available so two companies sharing a
            // name never collapse. BDE is keyed by id as well as name for the same
            // reason. A project/order *is* a lead, so the project key is the lead id —
            // keying it by name instead merged two separate orders whenever they shared
            // a project name, or had none and fell back to the same product name.
            const companyKey = `${r.bu_company_id ?? '0'}||${company}`;
            const bdeKey = `${companyKey}||${r.bde_id ?? '0'}||${bde}`;
            const clientKey = `${bdeKey}||${client}`;
            const projectKey = `${clientKey}||${r.lead_id}`;

            let cg = companyByKey.get(companyKey);
            if (!cg) {
                cg = {
                    key: companyKey, company,
                    bdes: [], clients: 0, projects: 0, milestones: 0,
                    expected: 0, collected: 0, pending: 0, stuck: 0,
                };
                companyByKey.set(companyKey, cg);
                companyClients.set(companyKey, new Set());
                list.push(cg);
            }

            let bg = bdeByKey.get(bdeKey);
            if (!bg) {
                bg = {
                    key: bdeKey, bde,
                    stretchTarget: Number(r.monthly_stretch_target || 0),
                    clients: [], clientCount: 0, projects: 0, milestones: 0,
                    expected: 0, collected: 0, pending: 0, stuck: 0,
                };
                bdeByKey.set(bdeKey, bg);
                bdeClients.set(bdeKey, new Set());
                cg.bdes.push(bg);
            }

            let clg = clientByKey.get(clientKey);
            if (!clg) {
                clg = {
                    key: clientKey, client,
                    city: r.city || null,
                    projects: [], milestones: 0,
                    expected: 0, collected: 0, pending: 0, stuck: 0,
                };
                clientByKey.set(clientKey, clg);
                bg.clients.push(clg);
            }
            companyClients.get(companyKey)!.add(client);
            bdeClients.get(bdeKey)!.add(client);

            let pg = projectByKey.get(projectKey);
            if (!pg) {
                pg = {
                    key: projectKey, project,
                    vertical: r.vertical || '—',
                    product: r.product || '—',
                    rows: [], expected: 0, collected: 0, pending: 0, stuck: 0,
                };
                projectByKey.set(projectKey, pg);
                clg.projects.push(pg);
                bg.projects += 1;
                cg.projects += 1;
            }
            pg.rows.push(r);

            const isStuck = r.collection_status === 'Stuck';
            const expected = isStuck ? 0 : Number(r.period_expected || 0);
            const pending = isStuck ? 0 : Number(r.period_pending || 0);
            const collected = Number(r.period_collected || 0);
            const stuck = isStuck ? Number(r.period_pending || 0) : 0;

            for (const g of [pg as Rollup, clg as Rollup, bg as Rollup, cg as Rollup]) {
                g.expected += expected;
                g.collected += collected;
                g.pending += pending;
                g.stuck += stuck;
            }
            clg.milestones += 1;
            bg.milestones += 1;
            cg.milestones += 1;
        }

        for (const [key, set] of companyClients) companyByKey.get(key)!.clients = set.size;
        for (const [key, set] of bdeClients) bdeByKey.get(key)!.clientCount = set.size;

        // Companies read alphabetically by default. Once a column sort is active it
        // drives the block order instead — the groups are built in the sorted row
        // order, so first appearance already reflects the chosen sort.
        return sortConfig ? list : list.sort((a, b) => a.company.localeCompare(b.company));
    }, [viewRows, sortConfig]);

    const allProjectKeys = useMemo(
        () => companyGroups.flatMap(c => c.bdes.flatMap(b => b.clients.flatMap(cl => cl.projects.map(p => p.key)))),
        [companyGroups]
    );
    const allCompanyKeys = useMemo(() => companyGroups.map(c => c.key), [companyGroups]);
    const allBdeKeys = useMemo(() => companyGroups.flatMap(c => c.bdes.map(b => b.key)), [companyGroups]);
    const allClientKeys = useMemo(
        () => companyGroups.flatMap(c => c.bdes.flatMap(b => b.clients.map(cl => cl.key))),
        [companyGroups]
    );

    // Parent → child key lists, so expanding a band knows which children to close.
    const childKeys = useMemo(() => {
        const bdesOf = new Map<string, string[]>();
        const clientsOf = new Map<string, string[]>();
        const projectsOf = new Map<string, string[]>();
        for (const cg of companyGroups) {
            bdesOf.set(cg.key, cg.bdes.map(b => b.key));
            for (const bg of cg.bdes) {
                clientsOf.set(bg.key, bg.clients.map(cl => cl.key));
                for (const clg of bg.clients) {
                    projectsOf.set(clg.key, clg.projects.map(p => p.key));
                }
            }
        }
        return { bdesOf, clientsOf, projectsOf };
    }, [companyGroups]);

    const toggleCompany = toggleKey(setCollapsedCompanies, setCollapsedBdes, k => childKeys.bdesOf.get(k) || []);
    const toggleBde = toggleKey(setCollapsedBdes, setCollapsedClients, k => childKeys.clientsOf.get(k) || []);
    const toggleClient = toggleKey(setCollapsedClients, setCollapsedProjects, k => childKeys.projectsOf.get(k) || []);
    const toggleProject = toggleKey(setCollapsedProjects);
    const companyCount = companyGroups.length;
    const clientCount = useMemo(
        () => new Set(viewRows.map((r: any) => r.company || '—')).size,
        [viewRows]
    );
    const bdeCount = useMemo(
        () => new Set(viewRows.map((r: any) => r.bde_id ?? r.bde_name)).size,
        [viewRows]
    );
    const projectCount = allProjectKeys.length;

    // Pagination runs over master companies so a company table — its executives,
    // clients, projects and milestones — is never split across two pages.
    const totalPages = Math.max(1, Math.ceil(companyGroups.length / PAGE_SIZE));
    const pagedCompanies = useMemo(
        () => companyGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [companyGroups, page]
    );

    useEffect(() => { setPage(1); }, [rows, sortConfig]);

    // The report opens on the BDE bands: companies expanded, everything below closed.
    // From there each click walks down one level, so the page only ever grows by the
    // branch the user asked for. Held in refs so a new result set re-applies the
    // default without the effect firing on a re-sort or a search keystroke.
    const keyRefs = useRef({ bdes: [] as string[], clients: [] as string[], projects: [] as string[] });
    keyRefs.current = { bdes: allBdeKeys, clients: allClientKeys, projects: allProjectKeys };
    useEffect(() => {
        setDepthHint(2);
        setCollapsedCompanies(new Set());
        setCollapsedBdes(new Set(keyRefs.current.bdes));
        setCollapsedClients(new Set(keyRefs.current.clients));
        setCollapsedProjects(new Set(keyRefs.current.projects));
    }, [rows]);

    // Open the report to a given number of levels. Both levels track what is closed,
    // so a depth maps onto either a full set of keys or an empty one.
    const expandToDepth = (depth: number) => {
        setDepthHint(depth);
        setCollapsedCompanies(depth >= 2 ? new Set() : new Set(allCompanyKeys));
        setCollapsedBdes(depth >= 3 ? new Set() : new Set(allBdeKeys));
        setCollapsedClients(depth >= 4 ? new Set() : new Set(allClientKeys));
        setCollapsedProjects(depth >= 5 ? new Set() : new Set(allProjectKeys));
    };

    // Company and BDE get a band row each; Client and Project get a ∑ line that opens
    // their run — naming the group, carrying its totals and acting as its toggle in one
    // row. Everything under a project is flattened into one row per milestone.
    type DisplayItem =
        | {
            kind: 'row'; r: any; key: string; zebra: boolean;
            vertical: string; product: string; firstOfProject: boolean;
        }
        | { kind: 'projectTotal'; key: string; groupKey: string; label: string; meta: string; group: Rollup; collapsed: boolean }
        | { kind: 'clientTotal'; key: string; groupKey: string; label: string; meta: string; group: Rollup; collapsed: boolean };

    const displayBlocks = useMemo(() => {
        return pagedCompanies.map(cg => ({
            cg,
            collapsed: collapsedCompanies.has(cg.key),
            bdeBlocks: cg.bdes.map(bg => {
                const out: DisplayItem[] = [];
                let zebraIndex = 0;
                for (const clg of bg.clients) {
                    // The client total opens its run rather than closing it, so it reads
                    // as the heading for the rows beneath — and it names the client, so
                    // the rows themselves never repeat the name. Every client gets one,
                    // including a client with a single project: a report is read by
                    // comparing these lines, and a missing one is a gap in that scan.
                    const clientCollapsed = collapsedClients.has(clg.key);
                    out.push({
                        kind: 'clientTotal', key: `${clg.key}||total`, groupKey: clg.key,
                        label: `${clg.client}${clg.city ? ` · ${clg.city}` : ''}`,
                        meta: `${clg.projects.length} ${clg.projects.length === 1 ? 'Project' : 'Projects'} · ${clg.milestones} ${clg.milestones === 1 ? 'Milestone' : 'Milestones'}`,
                        group: clg, collapsed: clientCollapsed,
                    });
                    if (clientCollapsed) continue;
                    for (const pg of clg.projects) {
                        // Like the client, the project's ∑ line opens its run rather than
                        // closing it: it names the project, carries its totals and is the
                        // toggle for its milestones, all in one row.
                        const projectCollapsed = collapsedProjects.has(pg.key);
                        out.push({
                            kind: 'projectTotal', key: `${pg.key}||total`, groupKey: pg.key,
                            label: pg.project,
                            meta: `${pg.rows.length} ${pg.rows.length === 1 ? 'Milestone' : 'Milestones'}`,
                            group: pg, collapsed: projectCollapsed,
                        });
                        if (!projectCollapsed) {
                            let firstOfProject = true;
                            for (const r of pg.rows) {
                                out.push({
                                    kind: 'row',
                                    r, key: `${pg.key}||${r.milestone_id}`, zebra: zebraIndex++ % 2 === 1,
                                    vertical: pg.vertical, product: pg.product, firstOfProject,
                                });
                                firstOfProject = false;
                            }
                        }
                    }
                }
                return { bg, rows: out, collapsed: collapsedBdes.has(bg.key) };
            }),
        }));
    }, [pagedCompanies, collapsedCompanies, collapsedBdes, collapsedClients, collapsedProjects]);

    const handleSort = (key: string) => {
        setSortConfig(prev => (prev && prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    };

    // Payment collection history for the milestone shown in the history popup
    const { data: paymentHistory = [], isLoading: paymentHistoryLoading } = useQuery({
        queryKey: ['cfr-milestone-payment-history', paymentHistoryModal?.mid],
        enabled: !!paymentHistoryModal,
        queryFn: async () => {
            const res = await axios.get(
                `${API_BASE}/leads/${paymentHistoryModal!.leadId}/milestones/${paymentHistoryModal!.mid}/payment-history`,
                { headers: authHeaders() }
            );
            return res.data.data as any[];
        },
    });

    // BANT POA update history for the milestone shown in the POA history popup
    const { data: poaHistory = [], isLoading: poaHistoryLoading } = useQuery({
        queryKey: ['cfr-milestone-bant-poa-history', poaHistoryModal?.mid],
        enabled: !!poaHistoryModal,
        queryFn: async () => {
            const res = await axios.get(
                `${API_BASE}/leads/${poaHistoryModal!.leadId}/milestones/${poaHistoryModal!.mid}/bant-poa-history`,
                { headers: authHeaders() }
            );
            return res.data.data as any[];
        },
    });

    const collectedLabel = quickFilter
        ? `Collected (${PERIOD_OPTIONS.find(q => q.value === quickFilter)?.label})`
        : month
            ? `Collected (${dayjs(month).format('MMM YYYY')})`
            : 'Collected (All Time)';

    // Flatten rows for export — uses the current sort order so exports match what's on screen
    const flatRows = useMemo(() => viewRows.map((r: any) => ({
        'Company': r.bu_company_name || '',
        'BDE': r.bde_name,
        'Monthly Stretch Target': r.monthly_stretch_target,
        'Client Company': r.company,
        'City': r.city || '',
        'Project Name': r.project_name || '',
        'Product': r.product,
        'Vertical': r.vertical,
        'Milestone': r.milestone,
        'Expected Amount': r.expected_amount,
        'Already Received': r.already_received,
        'Expected': r.period_expected,
        'Collected': r.period_collected,
        'Pending': Math.max(0, r.period_pending),
        'EDC': r.edc ? dayjs(r.edc).format('DD-MMM-YYYY') : '',
        'Aging (days)': r.aging ?? '',
        'Revised EDC': r.revised_edc ? dayjs(r.revised_edc).format('DD-MMM-YYYY') : '',
        'Cashflow POA': r.cashflow_poa || '',
        'POA Status': r.poa_status || '',
        'POA EDC': r.poa_edc ? dayjs(r.poa_edc).format('DD-MMM-YYYY') : '',
        'Collection Status': r.collection_status || '',
    })), [viewRows]);

    const exportLabel = quickFilter || month || 'AllTime';

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(flatRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cashflow Report');
        XLSX.writeFile(wb, `CashflowReport_${exportLabel}.xlsx`);
        setShowExportMenu(false);
    };

    const exportCSV = () => {
        const ws = XLSX.utils.json_to_sheet(flatRows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CashflowReport_${exportLabel}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const exportPDF = () => {
        window.print();
        setShowExportMenu(false);
    };

    // Drives the filter-count badge and hides Clear entirely when nothing is applied —
    // the toolbar stays quiet on a first visit, where every filter defaults to "All".
    const activeFilterCount =
        [month, companyId, clientCompanyId, productId, verticalId, bdeId, quickFilter, quarter, fromDate, toDate, collectionStatus, poaStatus]
            .filter(Boolean).length + (edcStatus && edcStatus !== 'all' ? 1 : 0);

    const handleReset = () => {
        setMonth('');
        setCompanyId('');
        setProductId('');
        setVerticalId('');
        setBdeIdState('');
        setClientCompanyIdState('');
        setEdcStatusState('all');
        setQuickFilterState('');
        setQuarterState('');
        setFromDateState('');
        setToDateState('');
        setCollectionStatusState('');
        setPoaStatusState('');
        setFilters({
            month: '', company_id: '', product_id: '', vertical_id: '', bde_id: '', client_company_id: '', edc_status: 'all',
            quick_filter: '', quarter: '', from_date: '', to_date: '', collection_status: '', poa_status: '',
        });
    };

    if (!hasPrivilege('CashflowReport', 'can_view')) {
        return (
            <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-8 py-10 text-center max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Access Restricted</h1>
                    <p className="text-sm text-slate-500 mt-2">You do not have permission to view the Cash Flow Report. Contact your administrator for access.</p>
                </div>
            </div>
        );
    }

    return (
        // A flex column that owns the viewport: the table section takes whatever height
        // the sections above it leave, so hiding the filters grows the table instead of
        // leaving a gap under it. Below lg the page scrolls normally — there the sections
        // stack too tall to share one screen.
        <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-slate-50/70 p-3 lg:p-4 space-y-3 print:h-auto print:overflow-visible print:p-2 print:space-y-2">

            {/* ── Section 1 · Header — page title, Filters toggle and Export ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden print:shadow-none print:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 print:hidden">
                            <TrendingUp size={17} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">Cash Flow Report</h1>
                            <p className="text-[11px] text-slate-400 leading-tight truncate">
                                Milestone collections — {quickFilter ? PERIOD_OPTIONS.find(q => q.value === quickFilter)?.label : (month ? dayjs(month).format('MMMM YYYY') : 'All Time')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 print:hidden">
                        {/* Filters toggle — shows and hides Section 2 on every screen size */}
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            title={showFilters ? 'Hide filters' : 'Show filters'}
                            className={clsx(
                                'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 h-8 rounded-lg border transition-colors',
                                showFilters
                                    ? 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                                    : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
                            )}
                        >
                            <SlidersHorizontal size={13} className={showFilters ? 'text-indigo-500' : 'text-slate-400'} />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown size={12} className={clsx('transition-transform', showFilters && 'rotate-180')} />
                        </button>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 px-2.5 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                title="Clear all filters"
                            >
                                <RefreshCw size={12} />
                                Clear
                                <span className="min-w-[16px] h-4 px-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            </button>
                        )}

                        {rows.length > 0 && (
                            <div className="relative" ref={exportMenuRef}>
                                <button
                                    onClick={() => setShowExportMenu(v => !v)}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 h-8 rounded-lg transition-colors"
                                >
                                    <Download size={13} /> Export
                                    <ChevronDown size={11} className={clsx('transition-transform', showExportMenu && 'rotate-180')} />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 z-30 overflow-hidden min-w-[150px] py-1">
                                        <button onClick={exportExcel} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                                            <FileSpreadsheet size={14} className="text-emerald-600" /> Excel
                                        </button>
                                        <button onClick={exportCSV} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                                            <FileText size={14} className="text-blue-600" /> CSV
                                        </button>
                                        <button onClick={exportPDF} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                                            <FileText size={14} className="text-rose-600" /> PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Section 2 · Filters — its own block, opened and closed by the Filters
                button above. Open by default; hidden entirely when closed, so the report
                moves up rather than leaving an empty bar behind. ── */}
            {showFilters && (
                <div className={clsx(
                    // One wrapping row for every filter — two lines at most on a laptop.
                    // The controls name themselves ("All Companies", "All POA Status"), so the
                    // Period / Entity / Status labels that cost a row each are gone.
                    'bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)]',
                    'px-3 py-2 flex flex-wrap items-center gap-1.5 print:hidden'
                )}>
                    {/* ── Period ── */}
                        <ActivePill active={edcStatus !== 'all'}>
                            <EdcStatusSelect value={edcStatus} onChange={setEdcStatus} />
                        </ActivePill>
                        <ActivePill active={!!quickFilter}>
                            <PeriodSelect value={quickFilter} onChange={setQuickFilter} />
                        </ActivePill>
                        <ActivePill active={!!quarter}>
                            <QuarterSelect value={quarter} onChange={setQuarterFilter} />
                        </ActivePill>

                    {/* ── Entity ── */}
                        <EntityFilter icon={Building2} active={!!companyId}>
                            <SearchableSelect
                                options={(companies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                                value={companyId}
                                onChange={val => {
                                    setCompanyId(val);
                                    setProductId('');
                                    setBdeId('');
                                    syncFilters({ company_id: val, product_id: '', bde_id: '' });
                                }}
                                placeholder="All Companies"
                                searchPlaceholder="Search company…"
                                className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                            />
                        </EntityFilter>

                        {/* Client Company — searchable dropdown, limited to companies with milestone data (clientcomFilter.md) */}
                        <EntityFilter icon={Building2} active={!!clientCompanyId}>
                            <SearchableSelect
                                options={(clientCompanies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                                value={clientCompanyId}
                                onChange={setClientCompanyId}
                                placeholder="All Client Companies"
                                searchPlaceholder="Search client company…"
                                className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                            />
                        </EntityFilter>

                        <EntityFilter icon={Package} active={!!productId}>
                            <SearchableSelect
                                options={(products as any[]).map((p: any) => ({ value: String(p.id), label: p.name }))}
                                value={productId}
                                onChange={val => {
                                    setProductId(val);
                                    setBdeId('');
                                    syncFilters({ product_id: val, bde_id: '' });
                                }}
                                placeholder="All Products"
                                searchPlaceholder="Search product…"
                                className="!border-none !p-0 !bg-transparent !py-0 h-full w-[118px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                            />
                        </EntityFilter>

                        <EntityFilter icon={Layers} active={!!verticalId}>
                            <select
                                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer appearance-none w-[104px]"
                                value={verticalId}
                                onChange={e => { setVerticalId(e.target.value); syncFilters({ vertical_id: e.target.value }); }}
                            >
                                <option value="">All Verticals</option>
                                {(verticals as any[]).map((v: any) => (
                                    <option key={v.id} value={String(v.id)}>{v.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                        </EntityFilter>

                        {/* BDE — hidden for SalesPerson */}
                        {authUser?.role !== 'SalesPerson' && (
                            <EntityFilter icon={UserCircle} active={!!bdeId}>
                                <SearchableSelect
                                    options={(bdes as any[]).map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name || ''}`.trim() }))}
                                    value={bdeId}
                                    onChange={setBdeId}
                                    placeholder="All BDEs"
                                    searchPlaceholder="Search BDE…"
                                    className="!border-none !p-0 !bg-transparent !py-0 h-full w-[112px] [&>span]:!text-[11px] [&>span]:font-medium text-slate-700"
                                />
                            </EntityFilter>
                        )}

                    {/* ── Status ── */}
                    <div className={clsx('w-[172px] shrink-0 rounded-lg transition-all', collectionStatus && 'ring-2 ring-indigo-200')}>
                        <MultiSelect
                            compact
                            options={COLLECTION_STATUS_MULTI_OPTIONS}
                            value={collectionStatus}
                            onChange={setCollectionStatusFilter}
                            placeholder="All Collection Status"
                        />
                    </div>
                    <div className={clsx('w-[140px] shrink-0 rounded-lg transition-all', poaStatus && 'ring-2 ring-indigo-200')}>
                        <MultiSelect
                            compact
                            options={POA_STATUS_MULTI_OPTIONS}
                            value={poaStatus}
                            onChange={setPoaStatusFilter}
                            placeholder="All POA Status"
                        />
                    </div>

                    {/* ── Date range — last, because it is the widest control and the one
                        reached for least often; the dropdowns before it keep their
                        positions from wrapping around it. ── */}
                    <ActivePill active={!!fromDate || !!toDate}>
                        <DateRangeFields fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />
                    </ActivePill>
                </div>
            )}

            {/* Loading skeleton — mirrors the real layout: four tiles, then company cards */}
            {isLoading && (
                <div className="animate-pulse space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-[62px] bg-white rounded-xl border border-slate-200/80" />)}
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                        <div className="h-10 border-b border-slate-100" />
                        <div className="h-11 bg-gradient-to-r from-blue-700 to-blue-800 border-b-2 border-blue-900/40" />
                        {[...Array(3)].map((_, i) => (
                            <React.Fragment key={i}>
                                <div className="h-11 bg-slate-200/80" />
                                <div className="h-10 bg-slate-50 border-b border-slate-200" />
                                <div className="h-11 border-b border-slate-100" />
                            </React.Fragment>
                        ))}
                        <div className="h-11 bg-slate-200/60" />
                    </div>
                </div>
            )}

            {/* Error */}
            {!isLoading && error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span className="flex-1 font-medium">Failed to load report data.</span>
                    <button onClick={() => refetch()} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 transition-colors">Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <>
                    {/* ── Section 3 · Dashboard counts ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 items-stretch shrink-0">
                        <KpiCard label="Total Expected" value={fmt(viewSummary.totalExpected)} sub={`${projectCount} projects · ${viewRows.length} milestones`} icon={TrendingUp} tone="blue" />
                        <KpiCard
                            label="Total Collected"
                            value={fmt(viewSummary.totalCollected)}
                            sub={<>{collectionPct(viewSummary.totalCollected, viewSummary.totalExpected)}% of expected · {collectedLabel}</>}
                            icon={Wallet}
                            tone="emerald"
                        />
                        <KpiCard label="Total Balance" value={fmt(viewSummary.totalBalance)} sub="Pending against expected" icon={Clock} tone="amber" />
                        <KpiCard label="Stuck Amount" value={fmt(viewSummary.totalStuck)} sub="Excluded from expected & balance" icon={AlertTriangle} tone="rose" />
                    </div>

                    {/* ── Section 4 · Report table — takes the height the sections above
                        leave over, so the scroll area ends at the bottom of the screen
                        whether the filters are open or hidden. ── */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden flex flex-col lg:flex-1 lg:min-h-0 print:block">
                        {/* One line: the title, the scope counts and the depth control. The
                            counts are self-describing, so they no longer need a caps label over
                            them — dropping it is what lets the whole strip sit on a single row
                            and gives the table back two rows of height. */}
                        <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
                            <span className="text-[12px] font-bold text-slate-900 tracking-tight shrink-0">Milestone Detail</span>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                                <ScopeCount value={companyCount} singular="Company" plural="Companies" />
                                <ScopeCount value={bdeCount} singular="BDE" plural="BDEs" />
                                <ScopeCount value={clientCount} singular="Client" plural="Clients" />
                                <ScopeCount value={projectCount} singular="Project" plural="Projects" />
                                <ScopeCount value={viewRows.length} singular="Milestone" plural="Milestones" />
                            </div>

                            <span className="xl:hidden text-[10px] text-slate-400 whitespace-nowrap print:hidden">
                                — scroll sideways for more columns
                            </span>

                            {/* One control instead of an Expand all / Collapse all pair: pick how
                                far the bands open. "Company" closes everything down to the company
                                bands, "All" reaches every milestone. */}
                            {companyGroups.length > 0 && (
                                <div className="flex items-center gap-1.5 ml-auto shrink-0 print:hidden">
                                    <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Show</span>
                                    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                                        {DEPTH_STEPS.map((step, i) => (
                                            <React.Fragment key={step.depth}>
                                                {i > 0 && <span className="w-px bg-slate-200" />}
                                                <button
                                                    onClick={() => expandToDepth(step.depth)}
                                                    title={step.hint}
                                                    className={clsx(
                                                        'text-[11px] font-semibold px-2.5 h-7 transition-colors',
                                                        depthHint === step.depth
                                                            ? 'bg-indigo-50 text-indigo-700'
                                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                    )}
                                                >
                                                    {step.label}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewRows.length === 0 ? (
                            <div className="py-14 text-center">
                                <span className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <Building2 size={20} className="text-slate-300" />
                                </span>
                                <p className="text-[13px] font-semibold text-slate-700">No milestones for the selected filters</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {activeFilterCount > 0 ? 'Try widening the date range or clearing a filter.' : 'Nothing has been recorded for this scope yet.'}
                                </p>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={handleReset}
                                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 px-3 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                    >
                                        <RefreshCw size={12} /> Clear all filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-auto flex-1 min-h-[240px] overscroll-x-contain print:overflow-visible print:min-h-0">
                                {/* One scroll container for the whole report. Every block inside is its
                                    own table sharing ReportColgroup and this min-width, so a single
                                    horizontal scrollbar moves all columns in step and the money columns
                                    stay aligned across company tables. Print must not clip. */}
                                {/* A tinted canvas so the gap between company blocks reads as a
                                    deliberate separator rather than a rendering seam. */}
                                <div className="bg-slate-100/70" style={{ minWidth: REPORT_MIN_WIDTH }}>

                                    {/* Column header — once for the whole report, pinned to the top of the
                                        scroll area. It carries its own solid fill so the rows scrolling
                                        beneath it never show through. */}
                                    {/* Exactly the Cashflow Tracker's header fill (CashflowTracker.tsx) so
                                        the two cashflow screens read as one system: blue gradient with the
                                        POA columns carved out in teal. Print drops backgrounds by default,
                                        so the print variant goes back to a light fill — white labels on
                                        white paper would vanish. */}
                                    <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-700 to-blue-800 border-b-2 border-blue-900/40 shadow-sm print:static print:bg-none print:bg-slate-100 print:border-slate-300">
                                        <table className="w-full border-collapse table-fixed">
                                            <ReportColgroup />
                                            <thead>
                                                <ReportHeadRow sortConfig={sortConfig} onSort={handleSort} />
                                            </thead>
                                        </table>
                                    </div>

                                    {/* One block per company: a band naming the company, then a band per
                                        BDE inside it, then that BDE's milestones one row each. The
                                        remaining hierarchy columns print a name only on the first row
                                        of their run. */}
                                    {displayBlocks.map(({ cg, bdeBlocks, collapsed: companyCollapsed }) => (
                                        <div key={cg.key} className="bg-white mb-2 last:mb-0 print:break-inside-auto">
                                            <table className="w-full border-collapse table-fixed">
                                                <ReportColgroup />
                                                <tbody>
                                                    {/* ── Company band — the level that would otherwise repeat on
                                                        every row. It sticks beneath the column header so the
                                                        company stays named while its rows scroll, and toggles
                                                        its whole block open or closed. ── */}
                                                    <tr
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => toggleCompany(cg.key)}
                                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCompany(cg.key); } }}
                                                        className={clsx('cursor-pointer select-none', ROW_FOCUS)}
                                                        style={{ height: 54 }}
                                                        title={`${companyCollapsed ? 'Expand' : 'Collapse'} ${cg.company}`}
                                                    >
                                                        <td colSpan={3} className={clsx('px-2 py-1.5 align-middle leading-tight', FROZEN, COMPANY_CELL, LEVEL_BAR.company)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN_BAND }}>
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <ChevronRight
                                                                    size={13}
                                                                    className={clsx('shrink-0 text-blue-600 transition-transform duration-200', !companyCollapsed && 'rotate-90')}
                                                                />
                                                                <Building2 size={13} className="text-blue-700 shrink-0" />
                                                                <span className="text-[13.5px] font-bold uppercase tracking-tight text-blue-950 truncate" title={cg.company}>
                                                                    {cg.company}
                                                                </span>
                                                            </div>
                                                            <span className="block text-[12px] text-blue-900 truncate mt-px">
                                                                {cg.bdes.length} {cg.bdes.length === 1 ? 'BDE' : 'BDEs'} · {cg.clients} {cg.clients === 1 ? 'Client' : 'Clients'} · {cg.projects} {cg.projects === 1 ? 'Project' : 'Projects'} · {cg.milestones} {cg.milestones === 1 ? 'Milestone' : 'Milestones'}
                                                            </span>
                                                        </td>
                                                        <GroupMoneyCells
                                                            percent={collectionPct(cg.collected, cg.expected)}
                                                            expected={cg.expected} collected={cg.collected}
                                                            pending={cg.pending} stuck={cg.stuck}
                                                            cellClass={COMPANY_CELL}
                                                            frozenZ={Z_FROZEN_BAND}
                                                        />
                                                    </tr>

                                                    {!companyCollapsed && bdeBlocks.map(({ bg, rows: blockRows, collapsed: bdeCollapsed }) => (
                                                        <React.Fragment key={bg.key}>
                                                            {/* ── BDE band — the executive who owns the rows beneath it,
                                                                and the toggle for them. A left accent rather than a
                                                                border, so the fixed column geometry cannot shift. ── */}
                                                            <tr
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => toggleBde(bg.key)}
                                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBde(bg.key); } }}
                                                                style={{ height: 50 }}
                                                                className={clsx('cursor-pointer select-none bg-indigo-100 hover:bg-indigo-200 border-y border-indigo-200 transition-colors', ROW_FOCUS)}
                                                                title={`${bdeCollapsed ? 'Expand' : 'Collapse'} ${bg.bde}`}
                                                            >
                                                                <td colSpan={3} className={clsx('px-2 py-1 align-middle leading-tight bg-inherit', FROZEN, LEVEL_BAR.bde)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN }}>
                                                                    <span className="flex items-center gap-1.5 min-w-0">
                                                                        <ChevronRight
                                                                            size={12}
                                                                            className={clsx('shrink-0 text-indigo-500 transition-transform duration-200', !bdeCollapsed && 'rotate-90')}
                                                                        />
                                                                        <span className="text-[13px] font-bold uppercase tracking-wide text-slate-800 truncate" title={bg.bde}>
                                                                            {bg.bde}
                                                                        </span>
                                                                    </span>
                                                                    <span className="block text-[12px] text-slate-700 truncate mt-px">
                                                                        {bg.clientCount} {bg.clientCount === 1 ? 'Client' : 'Clients'} · {bg.projects} {bg.projects === 1 ? 'Project' : 'Projects'} · {bg.milestones} {bg.milestones === 1 ? 'Milestone' : 'Milestones'}
                                                                        {bg.stretchTarget > 0 && <> · Stretch {fmt(bg.stretchTarget)}</>}
                                                                    </span>
                                                                </td>
                                                                <GroupMoneyCells
                                                                    percent={collectionPct(bg.collected, bg.expected)}
                                                                    expected={bg.expected} collected={bg.collected}
                                                                    pending={bg.pending} stuck={bg.stuck}
                                                                />
                                                            </tr>

                                                            {!bdeCollapsed && blockRows.map((item) => {
                                                    // Client and project runs each open with their ∑ line,
                                                    // which is also the toggle for what sits under it.
                                                    if (item.kind === 'projectTotal') {
                                                        return (
                                                            <SubtotalRow
                                                                key={item.key}
                                                                label={item.label}
                                                                meta={item.meta}
                                                                group={item.group}
                                                                tint="bg-amber-50 hover:bg-amber-100 border-amber-200 transition-colors"
                                                                accent="text-amber-600"
                                                                labelClass="text-amber-900"
                                                                accentBar={LEVEL_BAR.project}
                                                                indent={30}
                                                                onToggle={() => toggleProject(item.groupKey)}
                                                                collapsed={item.collapsed}
                                                            />
                                                        );
                                                    }
                                                    if (item.kind === 'clientTotal') {
                                                        return (
                                                            <SubtotalRow
                                                                key={item.key}
                                                                label={item.label}
                                                                meta={item.meta}
                                                                group={item.group}
                                                                tint="bg-sky-100 hover:bg-sky-200 border-sky-300 transition-colors"
                                                                accent="text-sky-700"
                                                                labelClass="text-sky-950"
                                                                accentBar={LEVEL_BAR.client}
                                                                indent={8}
                                                                onToggle={() => toggleClient(item.groupKey)}
                                                                collapsed={item.collapsed}
                                                            />
                                                        );
                                                    }
                                                    const d = item;
                                                    const r = d.r;
                                                    const periodPending = Number(r.period_pending || 0);
                                                    const isFullyCollected = !!r.is_fully_collected;
                                                    const isStuck = r.collection_status === 'Stuck';
                                                    const rowPct = collectionPct(Number(r.period_collected || 0), Number(r.period_expected || 0));
                                                    return (
                                                        <tr
                                                            key={d.key}
                                                            style={{ height: 50 }}
                                                            className={clsx(
                                                                'border-b border-slate-100 transition-colors duration-150',
                                                                // A row's own tint is reserved for the two states that need
                                                                // attention at a glance; everything else gets a subtle zebra
                                                                // stripe so a long run stays scannable across empty cells.
                                                                isStuck
                                                                    ? 'bg-rose-50 hover:bg-rose-100'
                                                                    : isFullyCollected
                                                                        ? 'bg-emerald-50 hover:bg-emerald-100'
                                                                        : d.zebra
                                                                            ? 'bg-slate-50 hover:bg-slate-100'
                                                                            : 'bg-white hover:bg-slate-50'
                                                            )}
                                                        >
                                                            {/* Client and Project both name themselves in the lines that
                                                                open their runs, so a milestone row leaves this column
                                                                empty — the run it belongs to is already stated above it. */}
                                                            <td className={clsx('px-2 py-1 align-middle bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN }} />
                                                            {/* Vertical and Product describe the project, so they repeat
                                                                on the same run as the project name. */}
                                                            <GroupCell
                                                                show={d.firstOfProject}
                                                                title={
                                                                    <span className="text-[11.5px] text-slate-700 truncate" title={d.vertical}>
                                                                        {d.vertical}
                                                                    </span>
                                                                }
                                                                meta={d.product}
                                                                left={FREEZE_LEFT.vertical}
                                                            />
                                                            {/* Milestone is the row itself — always printed. */}
                                                            <td className={clsx('px-2 py-1 align-middle leading-tight text-center bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.milestone, zIndex: Z_FROZEN }}>
                                                                <span className="block text-[12.5px] font-medium text-slate-700 truncate" title={r.milestone}>
                                                                    {r.milestone}
                                                                </span>
                                                                <span className="block text-[11px] text-slate-500 tabular-nums truncate mt-px">
                                                                    {fmt(r.already_received)} <span className="text-slate-400">/</span> {fmt(r.expected_amount)}
                                                                </span>
                                                            </td>
                                                            <td className={clsx('px-2 py-1 align-middle bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.pct, zIndex: Z_FROZEN }}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <CollectionBar percent={rowPct} />
                                                                    <span className="text-[10px] font-semibold tabular-nums text-slate-600 shrink-0">{rowPct}%</span>
                                                                </div>
                                                            </td>
                                                            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.expected, zIndex: Z_FROZEN }}><Amount value={r.period_expected} measure="expected" /></td>
                                                            {/* Collection history sits on the figure it explains, rather
                                                                than in a column of its own. */}
                                                            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.collected, zIndex: Z_FROZEN }}>
                                                                <span className="inline-flex items-center justify-center gap-1">
                                                                    <Amount value={r.period_collected} measure="collected" />
                                                                    <button
                                                                        onClick={() => setPaymentHistoryModal({ mid: r.milestone_id, leadId: r.lead_id })}
                                                                        title="View collection history"
                                                                        className="shrink-0 p-0.5 rounded text-slate-900 hover:bg-slate-200 transition-colors print:hidden"
                                                                    >
                                                                        <History size={12} />
                                                                    </button>
                                                                </span>
                                                            </td>
                                                            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap bg-inherit', FROZEN, FROZEN_EDGE)} style={{ left: FREEZE_LEFT.pending, zIndex: Z_FROZEN }}><Amount value={periodPending} measure="pending" /></td>
                                                            {/* EDC date on top with the aging badge beneath — same stacked
                                                                shape as the POA EDC / Status cell beside it. */}
                                                            <td className="px-2 py-1 whitespace-nowrap align-middle leading-tight text-center">
                                                                <span className="block text-[11px] text-slate-600 tabular-nums mb-0.5">
                                                                    {r.edc ? dayjs(r.edc).format('DD-MMM-YY') : <span className="text-slate-300">—</span>}
                                                                </span>
                                                                <AgingBadge days={r.aging} pendingAmount={periodPending} />
                                                            </td>
                                                            <td className="px-2 py-1 text-[11px] text-slate-500 whitespace-nowrap align-middle text-center">
                                                                {r.revised_edc ? dayjs(r.revised_edc).format('DD-MMM-YY') : <span className="text-slate-300">—</span>}
                                                            </td>
                                                            {/* POA history sits beside the POA text for the same reason —
                                                                the icon reads as "history of this cell". */}
                                                            <td className="px-2 py-1 align-middle">
                                                                <div className="flex items-center justify-center gap-1 min-w-0">
                                                                    {r.cashflow_poa ? (
                                                                        <span className="text-[11px] text-slate-600 truncate leading-tight" title={r.cashflow_poa}>{r.cashflow_poa}</span>
                                                                    ) : (
                                                                        <span className="text-slate-300 text-[11px]">—</span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setPoaHistoryModal({ mid: r.milestone_id, leadId: r.lead_id })}
                                                                        title="View POA history"
                                                                        className="shrink-0 p-0.5 rounded text-slate-900 hover:bg-slate-200 transition-colors print:hidden"
                                                                    >
                                                                        <ClipboardList size={12} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            {/* POA EDC leads, with the status badge under it — the date is
                                                                what this column is scanned for, and a badge sitting first
                                                                pushed it into second place. */}
                                                            <td className="px-2 py-1 align-middle whitespace-nowrap leading-tight text-center">
                                                                <span className="block text-[11px] text-slate-600 tabular-nums mb-0.5">
                                                                    {r.poa_edc ? dayjs(r.poa_edc).format('DD-MMM-YY') : <span className="text-slate-300">—</span>}
                                                                </span>
                                                                <PoaStatusBadge status={r.poa_status} />
                                                            </td>
                                                            <td className="px-1.5 py-1 text-center align-middle whitespace-nowrap">
                                                                <CollectionStatusBadge status={r.collection_status} />
                                                            </td>
                                                        </tr>
                                                    );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}

                                    {/* Grand Total — dark navy bar pinned to the bottom of the scroll area
                                        (repoUI.md): every client company on this page's parent set rolled
                                        up, with BDE / Company / Project / Milestone counts and Stuck. */}
                                    <div className="sticky bottom-0 z-10 print:static">
                                        <div className="border-t-2 border-blue-400 shadow-[0_-4px_12px_-6px_rgba(16,24,40,0.25)]">
                                            <table className="w-full border-collapse table-fixed">
                                                <ReportColgroup />
                                                <tbody>
                                                    <tr style={{ height: 52 }}>
                                                        <td colSpan={3} className={clsx('px-2 py-1.5 align-middle', FROZEN, GRAND_TOTAL_TD)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN }}>
                                                            <span className="block text-[12px] font-bold uppercase tracking-wider text-blue-950 leading-tight">
                                                                Grand Total
                                                            </span>
                                                            <span className="block text-[11px] text-blue-900 leading-tight truncate">
                                                                {companyCount} {companyCount === 1 ? 'Company' : 'Companies'} · {bdeCount} {bdeCount === 1 ? 'BDE' : 'BDEs'} · {clientCount} {clientCount === 1 ? 'Client' : 'Clients'} · {projectCount} {projectCount === 1 ? 'Project' : 'Projects'} · {viewRows.length} {viewRows.length === 1 ? 'Milestone' : 'Milestones'}
                                                            </span>
                                                        </td>
                                                        <GroupMoneyCells
                                                            percent={collectionPct(viewSummary.totalCollected, viewSummary.totalExpected)}
                                                            expected={viewSummary.totalExpected}
                                                            collected={viewSummary.totalCollected}
                                                            pending={viewSummary.totalBalance}
                                                            stuck={viewSummary.totalStuck}
                                                            cellClass={GRAND_TOTAL_TD}
                                                        />
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewRows.length > 0 && totalPages > 1 && (
                            <div className="px-3 sm:px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
                                <p className="text-[11px] text-slate-500">
                                    Showing companies {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, companyGroups.length)} of {companyGroups.length}
                                    <span className="text-slate-400"> · {bdeCount} BDEs · {clientCount} clients · {projectCount} projects · {viewRows.length} milestones total</span>
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 disabled:hover:bg-white hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-xs font-semibold text-slate-600 px-2">Page {page} of {totalPages}</span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 disabled:hover:bg-white hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Collection History Modal */}
            {paymentHistoryModal && (() => {
                const r = rows.find((row: any) => row.milestone_id === paymentHistoryModal.mid);
                return (
                    <div className="modal-overlay" onClick={() => setPaymentHistoryModal(null)}>
                        <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="text-sm font-bold text-slate-800">Collection History</h3>
                                <button
                                    onClick={() => setPaymentHistoryModal(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="px-6 py-4">
                                {r && (
                                    <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expected Amount</p>
                                            <p className="text-sm font-bold text-blue-700 tabular-nums">{fmt(r.expected_amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Already Received</p>
                                            <p className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(r.already_received)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Amount</p>
                                            <p className="text-sm font-bold text-amber-700 tabular-nums">{fmt(Number(r.expected_amount || 0) - Number(r.already_received || 0))}</p>
                                        </div>
                                    </div>
                                )}
                                {paymentHistoryLoading ? (
                                    <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-[11px] uppercase text-slate-500">
                                                <th className="text-left px-2 py-1.5">Collection Date</th>
                                                <th className="text-right px-2 py-1.5">Collected Amount</th>
                                                <th className="text-left px-2 py-1.5">Collected By</th>
                                                <th className="text-left px-2 py-1.5">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {paymentHistory.map((h: any) => (
                                                <tr key={h.id}>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{dayjs(h.collection_date).format('DD-MMM-YYYY')}</td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(h.collected_amount)}</td>
                                                    <td className="px-2 py-1.5">{h.collected_by || '—'}</td>
                                                    <td className="px-2 py-1.5 max-w-[160px] truncate" title={h.remarks || ''}>{h.remarks || '—'}</td>
                                                </tr>
                                            ))}
                                            {paymentHistory.length === 0 && (
                                                <tr><td colSpan={4} className="text-center text-slate-400 py-6">No payments recorded yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* POA History Modal */}
            {poaHistoryModal && (
                <div className="modal-overlay" onClick={() => setPoaHistoryModal(null)}>
                    <div className="modal-box max-w-3xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-sm font-bold text-slate-800">
                                POA History
                                {poaHistory.length > 0 && (
                                    <span className="ml-2 text-[11px] font-medium text-slate-400">
                                        {poaHistory.length} {poaHistory.length === 1 ? 'update' : 'updates'}
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={() => setPoaHistoryModal(null)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {/* The POA text is the point of this popup, so it gets the room: it
                            wraps in full instead of truncating, and the four short fields
                            around it are pinned to their content width. */}
                        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
                            {poaHistoryLoading ? (
                                <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
                            ) : poaHistory.length === 0 ? (
                                <p className="text-[13px] text-slate-400 text-center py-8">No updates recorded yet.</p>
                            ) : (
                                <table className="w-full text-[12.5px] table-fixed">
                                    <colgroup>
                                        <col style={{ width: 108 }} />{/* Date */}
                                        <col />{/* POA — takes the rest */}
                                        <col style={{ width: 104 }} />{/* Status */}
                                        <col style={{ width: 96 }} />{/* POA EDC */}
                                        <col style={{ width: 104 }} />{/* Updated By */}
                                    </colgroup>
                                    <thead>
                                        <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                                            <th className="text-left px-2 pb-2">Date</th>
                                            <th className="text-left px-2 pb-2">POA</th>
                                            <th className="text-left px-2 pb-2">Status</th>
                                            <th className="text-left px-2 pb-2">POA EDC</th>
                                            <th className="text-left px-2 pb-2">Updated By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {poaHistory.map((h: any) => (
                                            <tr key={h.id} className="align-top hover:bg-slate-50/70 transition-colors">
                                                <td className="px-2 py-2.5 leading-tight">
                                                    <span className="block font-medium text-slate-700 tabular-nums whitespace-nowrap">
                                                        {dayjs(h.updated_on).format('DD-MMM-YYYY')}
                                                    </span>
                                                    <span className="block text-[11px] text-slate-400 tabular-nums">
                                                        {dayjs(h.updated_on).format('HH:mm')}
                                                    </span>
                                                </td>
                                                {/* whitespace-pre-line keeps any line breaks the user typed */}
                                                <td className="px-2 py-2.5 text-slate-700 leading-snug whitespace-pre-line break-words">
                                                    {h.bant_poa || <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <PoaStatusBadge status={h.poa_status} />
                                                </td>
                                                <td className="px-2 py-2.5 text-slate-600 tabular-nums whitespace-nowrap">
                                                    {h.bant_poa_edc ? dayjs(h.bant_poa_edc).format('DD-MMM-YYYY') : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-2 py-2.5 text-slate-600 break-words">{h.updated_by || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
