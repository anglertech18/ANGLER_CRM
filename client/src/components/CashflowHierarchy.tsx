import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowUpDown, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

// Shared building blocks for the banded, four-level cashflow tables — the Cashflow
// Report and the Cashflow Forecast. Both render Company → BDE → Client → Project →
// milestone rows with the same colours, frozen-column mechanics, ∑ subtotal lines and
// Show-depth control; only their columns and their measures differ. Everything that
// is column-agnostic lives here so the two screens cannot drift apart visually.
//
// What deliberately stays in the pages: the <colgroup>, the freeze offsets (both are
// per-page column geometry) and the money cells (each page totals different measures).

// Column-header height, shared by the header row itself and the sticky offset of the
// Company band that parks beneath it.
export const HEAD_ROW_H = 46;

// A frozen cell must be opaque or the scrolling columns show through it. Rows that
// set their fill on the <tr> pass `bg-inherit` so the cell picks up the row's own
// tint — including on hover; rows that fill their cells directly (Company band,
// Grand Total) pass that fill instead.
// Stacking is set inline rather than with a z-* class: two arbitrary Tailwind z values
// resolve by stylesheet order, not by which class is listed last, and the Company band
// has to win over the frozen cells of every row that scrolls beneath it.
export const FROZEN = 'sticky';
export const Z_FROZEN = 5;        // ordinary frozen cell
export const Z_FROZEN_BAND = 15;  // Company band — frozen sideways *and* stuck to the top
export const Z_FROZEN_HEAD = 25;  // column header, above both
// The last frozen column carries the seam, drawn inside the cell so it cannot shift
// the fixed column geometry.
export const FROZEN_EDGE = 'shadow-[inset_-1px_0_0_0_rgb(148_163_184)]';

// Grand Total closes the page in a light step of the header's own blue — the bar and
// the column header are the two frames around the table, so they share a family.
export const GRAND_TOTAL_TD = 'bg-blue-100';

// The Company band parks under the column header while its own rows are on screen, so
// you always know which company you are reading. `top-[46px]` must equal HEAD_ROW_H,
// and the fill lives on the cells because a sticky <tr> is not reliable across
// browsers — cells are.
export const COMPANY_CELL = 'sticky top-[46px] bg-blue-100';

// One hue per level, so depth is read by colour instead of by counting indents:
// Company blue → BDE indigo → Client sky → Project amber, each a light fill with a
// saturated left bar of the same family.
export const LEVEL_BAR = {
    company: 'shadow-[inset_4px_0_0_0_#1d4ed8]',  // blue-700
    bde: 'shadow-[inset_4px_0_0_0_#4f46e5]',      // indigo-600
    client: 'shadow-[inset_4px_0_0_0_#0284c7]',   // sky-600
    project: 'shadow-[inset_4px_0_0_0_#f59e0b]',  // amber-500
};

// Keyboard users must be able to see which band they are on: the bands are focusable
// toggles, so they get a visible focus ring rather than a bare outline-none.
export const ROW_FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400';

// "Show" control — how far the two band levels are opened. One control covers
// everything the old Expand all / Collapse all pair did and the steps in between.
export const DEPTH_STEPS = [
    { depth: 1, label: 'Company', hint: 'Company bands only' },
    { depth: 2, label: 'BDE', hint: 'Open to BDE' },
    { depth: 3, label: 'Client', hint: 'Open to client company' },
    { depth: 4, label: 'Project', hint: 'Open to project, milestones closed' },
    { depth: 5, label: 'All', hint: 'Open every milestone' },
];

export function DepthControl({ depthHint, onPick }: { depthHint: number | null; onPick: (depth: number) => void }) {
    return (
        <div className="flex items-center gap-1.5 ml-auto shrink-0 print:hidden">
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Show</span>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                {DEPTH_STEPS.map((step, i) => (
                    <React.Fragment key={step.depth}>
                        {i > 0 && <span className="w-px bg-slate-200" />}
                        <button
                            onClick={() => onPick(step.depth)}
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
    );
}

export type SortConfig = { key: string; dir: 'asc' | 'desc' } | null;

function SortArrow({ sortKey, sortConfig }: { sortKey: string; sortConfig: SortConfig }) {
    if (sortConfig?.key !== sortKey) return <ArrowUpDown size={11} className="opacity-40" />;
    return sortConfig.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

export function SortTh({
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
export function ScopeCount({ value, singular, plural }: { value: number; singular: string; plural: string }) {
    return (
        <div className="flex items-baseline gap-1 text-[11.5px] leading-[1.45] whitespace-nowrap">
            <span className="font-bold tabular-nums text-slate-800">{value}</span>
            <span className="text-slate-500">{value === 1 ? singular : plural}</span>
        </div>
    );
}

// Stat tile: the figure is the hero and wears text ink; the tinted icon plate and the
// top rule carry the measure's identity. Flat tints rather than saturated gradients —
// four loud gradients in a row is what made the header feel cheap.
export function KpiCard({ label, value, sub, icon: Icon, tone }: {
    label: string; value: string; sub?: React.ReactNode; icon: any; tone: string;
}) {
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
                height of its three lines of text — this strip sits above the table and
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

// A hierarchy cell — the value prints only on the first row of its run; every
// following row of the same group leaves the cell empty rather than repeating the
// same name down the column. The empty cells are what make a run read as one block.
export function GroupCell({
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
// The trailing cells are passed as children: each page totals its own measures.
export function SubtotalRow({
    label, meta, tint, accent, indent, labelClass, accentBar, onToggle, collapsed, toggleLabel,
    labelColSpan = 3, labelLeft = 0, children,
}: {
    label: string; meta?: string; tint: string; accent: string; indent: number;
    labelClass?: string; accentBar: string;
    onToggle?: () => void; collapsed?: boolean; toggleLabel?: string;
    labelColSpan?: number; labelLeft?: number; children: React.ReactNode;
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
                colSpan={labelColSpan}
                className={clsx('py-0.5 pr-2 align-middle leading-tight bg-inherit', FROZEN, accentBar)}
                style={{ paddingLeft: indent, left: labelLeft, zIndex: Z_FROZEN }}
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
            {children}
        </tr>
    );
}

export interface HierarchyKeys {
    companies: string[];
    bdes: string[];
    clients: string[];
    projects: string[];
}

export interface HierarchyChildKeys {
    bdesOf: Map<string, string[]>;
    clientsOf: Map<string, string[]>;
    projectsOf: Map<string, string[]>;
}

// Expand/collapse state for the four band levels, keyed by group key (not index) so it
// survives filtering, sorting and pagination. All four sets track what is *closed*, so
// a depth maps onto either a full set of keys or an empty one.
export function useHierarchyCollapse(allKeys: HierarchyKeys, childKeys: HierarchyChildKeys, resetOn: unknown) {
    const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());
    const [collapsedBdes, setCollapsedBdes] = useState<Set<string>>(new Set());
    const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
    const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
    // Which "Show" step is currently in effect, for highlighting the control. Any
    // manual toggle clears it — the table is then in a mixed state that no single step
    // describes, and a stuck highlight would be a lie.
    const [depthHint, setDepthHint] = useState<number | null>(2);

    // Opening a band reveals its children *closed*, so a click walks the hierarchy one
    // level at a time. Without this, opening one company would drop every milestone it
    // owns onto the page at once.
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

    // The table opens on the BDE bands: companies expanded, everything below closed.
    // Held in a ref so a new result set re-applies the default without the effect
    // firing on a re-sort or a search keystroke.
    const keyRefs = useRef(allKeys);
    keyRefs.current = allKeys;
    useEffect(() => {
        setDepthHint(2);
        setCollapsedCompanies(new Set());
        setCollapsedBdes(new Set(keyRefs.current.bdes));
        setCollapsedClients(new Set(keyRefs.current.clients));
        setCollapsedProjects(new Set(keyRefs.current.projects));
    }, [resetOn]);

    const expandToDepth = (depth: number) => {
        setDepthHint(depth);
        setCollapsedCompanies(depth >= 2 ? new Set() : new Set(allKeys.companies));
        setCollapsedBdes(depth >= 3 ? new Set() : new Set(allKeys.bdes));
        setCollapsedClients(depth >= 4 ? new Set() : new Set(allKeys.clients));
        setCollapsedProjects(depth >= 5 ? new Set() : new Set(allKeys.projects));
    };

    return {
        collapsedCompanies, collapsedBdes, collapsedClients, collapsedProjects,
        toggleCompany: useMemo(() => toggleKey(setCollapsedCompanies, setCollapsedBdes, k => childKeys.bdesOf.get(k) || []), [childKeys]),
        toggleBde: useMemo(() => toggleKey(setCollapsedBdes, setCollapsedClients, k => childKeys.clientsOf.get(k) || []), [childKeys]),
        toggleClient: useMemo(() => toggleKey(setCollapsedClients, setCollapsedProjects, k => childKeys.projectsOf.get(k) || []), [childKeys]),
        toggleProject: useMemo(() => toggleKey(setCollapsedProjects), []),
        depthHint, expandToDepth,
    };
}
