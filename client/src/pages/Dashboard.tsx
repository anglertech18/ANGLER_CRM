import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Phone, Activity, TrendingUp, ArrowUpRight,
    AlertCircle, PieChart as PieChartIcon, IndianRupee,
    Wallet, ClipboardList, Siren,
    PhoneCall, History, CalendarDays, CalendarRange, CalendarPlus,
    ChevronDown, UserCircle, Building2, Package,
    Target, Award
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SearchableSelect } from '../components/FilterDropdown';
import { usePersistentFilters } from '../hooks/usePersistentFilters';

dayjs.extend(utc);

/* ── Quadrant colours ── */
const QUADRANT_COLORS: Record<string, string> = {
    Q1: '#2563EB', Q2: '#F59E0B', Q3: '#F97316',
    Q4: '#16A34A', 'Order Won': '#10B981', Nurturing: '#8B5CF6',
    Negotiation: '#EF4444',
};
const qColor = (name: string) => QUADRANT_COLORS[name] ?? '#64748B';

const inr = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const CHART_TOOLTIP_STYLE: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    fontSize: 12,
    padding: '10px 12px',
};

/* ── KPI Card ── */
interface KpiProps {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; onClick?: () => void;
    alert?: boolean;
}
/* Cards sit in a stretched grid track, so the body is centred vertically —
   otherwise the content pins to the top and leaves a hollow card. */
const KpiCard = ({ label, value, sub, icon: Icon, color, onClick, alert }: KpiProps) => (
    <div
        onClick={onClick}
        className={clsx(
            'card-hover h-full p-3.5 flex items-center gap-3',
            alert && Number(value) > 0 && 'ring-1 ring-red-200'
        )}
    >
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
            <Icon size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={clsx('text-xl font-bold tracking-tight leading-7', alert && Number(value) > 0 ? 'text-red-600' : 'text-slate-900')}>
                {value ?? '—'}
            </p>
            {sub && <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>}
        </div>
        <ArrowUpRight size={12} className="text-slate-300 shrink-0" />
    </div>
);

/* ── KPI Skeleton ── */
const KpiSkeleton = () => (
    <div className="card h-full p-3.5 flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
            <div className="skeleton h-2 w-16 rounded" />
            <div className="skeleton h-5 w-12 rounded" />
        </div>
    </div>
);

/* ── SEAL summary card — a KpiCard with a hover/tap detail panel listing the
   per-BDE breakdown behind the total, same interaction as ActivityCard below. ── */
interface SealMetricCardProps {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; onClick: () => void;
    rows: { name: string; value: string }[];
}
const SealMetricCard = ({ label, value, sub, icon: Icon, color, onClick, rows }: SealMetricCardProps) => {
    const [open, setOpen] = React.useState(false);
    return (
        <div className="relative group">
            <div onClick={onClick} className="card-hover h-full p-3.5 flex items-center gap-3 cursor-pointer">
                <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
                    <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold tracking-tight leading-7 text-slate-900">{value}</p>
                    {sub && <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>}
                </div>
                {rows.length > 0 ? (
                    <button
                        type="button"
                        aria-label={open ? 'Hide details' : 'Show details'}
                        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                        className="text-slate-300 hover:text-slate-500 shrink-0 p-0.5 -m-0.5"
                    >
                        <ChevronDown size={13} className={clsx('transition-transform', open && 'rotate-180')} />
                    </button>
                ) : (
                    <ArrowUpRight size={12} className="text-slate-300 shrink-0" />
                )}
            </div>

            {/* Hover detail on desktop, tap-to-toggle on touch (chevron button above)
                — the BDEs that made up this total. Suppressed when there's nobody to list. */}
            {rows.length > 0 && (
                <div className={clsx(
                    'absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-[280px] max-w-[90vw]',
                    open ? 'block' : 'hidden group-hover:block'
                )}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 p-3">
                        <p className="text-[11px] font-bold text-slate-800 mb-2">{label} &middot; by BDE</p>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {rows.map(r => (
                                <div key={r.name} className="flex items-baseline justify-between gap-3 text-[11px]">
                                    <span className="text-slate-600 truncate">{r.name}</span>
                                    <span className="font-semibold text-slate-800 shrink-0">{r.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Section heading ── */
/* Collapse state persisted to localStorage under a caller-supplied key.
   Reads/writes are guarded so a locked-down browser just stays expanded. */
type CollapseControl = { collapsed: boolean; toggle: () => void };
const usePersistedCollapse = (storageKey: string): CollapseControl => {
    const [collapsed, setCollapsed] = React.useState<boolean>(() => {
        try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
    });
    const toggle = React.useCallback(() => setCollapsed(c => {
        const next = !c;
        try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* ignore */ }
        return next;
    }), [storageKey]);
    return { collapsed, toggle };
};

/* Section header with a collapse toggle. By default each header owns its own
   state (keyed by title). Pass `collapseControl` to have several headers in
   the same dashboard row share one control — clicking any of their chevrons
   then collapses/expands the whole row together. Wrap the section body as
   children — it's what gets shown/hidden. */
const SectionHeading = ({ title, subtitle, children, collapseControl }: { title: string; subtitle: string; children?: React.ReactNode; collapseControl?: CollapseControl }) => {
    const own = usePersistedCollapse(`dashboard:section-collapsed:${title}`);
    const { collapsed, toggle } = collapseControl ?? own;
    return (
        <>
            <div className="mb-4 pb-2.5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
                    aria-expanded={!collapsed}
                    className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 -m-0.5"
                >
                    <ChevronDown size={15} className={clsx('transition-transform', collapsed && '-rotate-90')} />
                </button>
            </div>
            {!collapsed && children}
        </>
    );
};

/* ── Chart empty / loading states ── */
const ChartSkeleton = ({ height }: { height: number }) => (
    <div className="p-6"><div className="skeleton rounded-xl" style={{ height }} /></div>
);

const ChartEmpty = ({ message }: { message: string }) => (
    <div className="p-10 text-center">
        <p className="text-sm text-slate-400">{message}</p>
    </div>
);

/* ── Quadrant bar entry ── */
const QUADRANT_BADGE: Record<string, string> = { Nurturing: 'NU', 'Order Won': 'OW', Negotiation: 'NG' };
const qBadge = (name: string) => QUADRANT_BADGE[name] ?? name;

/* `caption` names what the percentage is a share of — Nurturing is measured
   against all leads, the active quadrants against the pipeline. */
const QuadrantRow = ({ name, count, total, caption, onClick }: any) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
            <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: qColor(name) }}
            >
                {qBadge(name)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1 gap-3">
                    <span className="text-[11px] font-medium text-slate-700 group-hover:text-primary-600 transition-colors">
                        {name} &middot; <span className="font-semibold text-slate-900">{count}</span> {count === 1 ? 'lead' : 'leads'}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                        {pct}%{caption && <span className="text-slate-300"> {caption}</span>}
                    </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: qColor(name) }}
                    />
                </div>
            </div>
        </div>
    );
};

/* ── Quadrants plotted on the product / opportunity charts (Categories 4 & 5) ── */
const DASHBOARD_QUADRANTS = ['Q4', 'Q3', 'Q2', 'Q1', 'Nurturing'];

/* Tooltip on a slice: product, quadrant, count, share, and the full split */
const ProductQuadrantTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const slice = payload[0].payload;
    const { product, quadrant, value, row } = slice;
    const pct = row.total > 0 ? Math.round((value / row.total) * 100) : 0;
    return (
        <div style={CHART_TOOLTIP_STYLE}>
            <p className="text-xs font-bold text-slate-800">{product}</p>
            <p className="text-[11px] font-semibold mb-1.5" style={{ color: qColor(quadrant) }}>
                {quadrant} &middot; {value} {value === 1 ? 'lead' : 'leads'} ({pct}%)
            </p>
            {DASHBOARD_QUADRANTS.map(q => (
                <div key={q} className="flex items-center justify-between gap-6 text-[11px] text-slate-600 leading-5">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: qColor(q) }} />
                        {q}
                    </span>
                    <span className="font-semibold text-slate-800">{row[q] ?? 0}</span>
                </div>
            ))}
            <div className="flex items-center justify-between gap-6 text-[11px] mt-1.5 pt-1.5 border-t border-slate-100">
                <span className="font-medium text-slate-500">Total Leads</span>
                <span className="font-bold text-slate-900">{row.total}</span>
            </div>
        </div>
    );
};

/* Quadrant name + share printed inside each slice; slivers keep the tooltip only */
const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, quadrant }: any) => {
    if (!percent || percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    // Nurturing is too wide for a small slice — abbreviate it
    const label = quadrant === 'Nurturing' ? 'NU' : quadrant;
    return (
        <text
            x={x} y={y}
            fill="#FFFFFF" fontWeight={700}
            textAnchor="middle" dominantBaseline="central"
        >
            <tspan x={x} dy="-0.4em" fontSize={10}>{label}</tspan>
            <tspan x={x} dy="1.1em" fontSize={10}>{value}</tspan>
        </text>
    );
};

/* Opportunity pie labels print the lead count instead of the share */
const renderOpportunitySliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, quadrant }: any) => {
    if (!percent || percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    // Nurturing is too wide for a small slice — abbreviate it
    const label = quadrant === 'Nurturing' ? 'NU' : quadrant;
    return (
        <text
            x={x} y={y}
            fill="#FFFFFF" fontWeight={700}
            textAnchor="middle" dominantBaseline="central"
        >
            <tspan x={x} dy="-0.4em" fontSize={10}>{label}</tspan>
            <tspan x={x} dy="1.1em" fontSize={10}>{value}</tspan>
        </text>
    );
};

/* One pie per product — e.g. "Aura" split across Q4/Q3/Q2/Q1/Nurturing */
const ProductQuadrantPie = ({ row, onSliceClick }: { row: any; onSliceClick: (quadrant: string) => void }) => {
    const slices = DASHBOARD_QUADRANTS
        .map(q => ({ product: row.product, quadrant: q, value: row[q] ?? 0, row }))
        .filter(s => s.value > 0);

    return (
        <div className="border border-slate-100 rounded-xl p-3">
            <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[11px] font-bold text-slate-800">{row.product}</h4>
                <span className="text-[10px] text-slate-400 shrink-0">{row.total}</span>
            </div>
            <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={slices}
                            dataKey="value"
                            nameKey="quadrant"
                            cx="50%"
                            cy="50%"
                            outerRadius={58}
                            labelLine={false}
                            label={renderSliceLabel}
                            isAnimationActive={false}
                            onClick={(slice: any) => onSliceClick(slice?.quadrant)}
                            className="cursor-pointer"
                        >
                            {slices.map(s => (
                                <Cell key={`${row.product}-${s.quadrant}`} fill={qColor(s.quadrant)} />
                            ))}
                        </Pie>
                        <Tooltip content={<ProductQuadrantTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

/* One pie per opportunity value range — e.g. "Above ₹10 Lakhs" split across Q4/Q3/Q2/Q1/Nurturing */
const OpportunityQuadrantPie = ({ row, onSliceClick }: { row: any; onSliceClick: (quadrant: string) => void }) => {
    const slices = DASHBOARD_QUADRANTS
        .map(q => ({ range: row.range, quadrant: q, value: row[q] ?? 0, row }))
        .filter(s => s.value > 0);

    return (
        <div className="border border-slate-100 rounded-xl p-3">
            <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[11px] font-bold text-slate-800">{row.range}</h4>
                <span className="text-[10px] text-slate-400 shrink-0">{row.total}</span>
            </div>
            <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={slices}
                            dataKey="value"
                            nameKey="quadrant"
                            cx="50%"
                            cy="50%"
                            outerRadius={58}
                            labelLine={false}
                            label={renderOpportunitySliceLabel}
                            isAnimationActive={false}
                            onClick={(slice: any) => onSliceClick(slice?.quadrant)}
                            className="cursor-pointer"
                        >
                            {slices.map(s => (
                                <Cell key={`${row.range}-${s.quadrant}`} fill={qColor(s.quadrant)} />
                            ))}
                        </Pie>
                        <Tooltip content={<OpportunityQuadrantTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1">{inr(row.totalOpportunityValue)}</p>
        </div>
    );
};

/* ── Category 5 tooltip: a user-facing report of one opportunity range —
   grouped by quadrant (header carries the abbreviated badge, e.g. Nurturing
   -> NU, and its lead count), with each lead's name and opportunity value
   listed underneath, the same way a product card heads its own leads. ── */
const OpportunityQuadrantTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const slice = payload[0].payload;
    const { range, quadrant, value, row } = slice;
    const pct = row.total > 0 ? Math.round((value / row.total) * 100) : 0;
    const leads: any[] = row.leads ?? [];
    const hiddenLeads = Math.max((row.leadCount ?? row.total ?? leads.length) - leads.length, 0);
    const groups = DASHBOARD_QUADRANTS
        .map(q => ({ quadrant: q, count: row[q] ?? 0, leads: leads.filter(l => l.quadrant === q) }))
        .filter(g => g.count > 0);

    return (
        <div style={{ ...CHART_TOOLTIP_STYLE, minWidth: 230, maxWidth: 270 }}>
            <p className="text-xs font-bold text-slate-800">{range}</p>
            <p className="text-[11px] font-semibold mb-1.5" style={{ color: qColor(quadrant) }}>
                {qBadge(quadrant)} &middot; {value} {value === 1 ? 'lead' : 'leads'} ({pct}%)
            </p>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
                {groups.map(g => (
                    <div key={g.quadrant}>
                        <div
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-0.5"
                            style={{ color: qColor(g.quadrant) }}
                        >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: qColor(g.quadrant) }} />
                            {qBadge(g.quadrant)} &middot; {g.count} {g.count === 1 ? 'lead' : 'leads'}
                        </div>
                        <div className="space-y-1 pl-3.5">
                            {g.leads.map((l: any, i: number) => (
                                <div key={i} className="flex items-baseline justify-between gap-2 text-[11px] leading-4">
                                    <span className="min-w-0">
                                        <span className="block text-slate-600">{l.company}</span>
                                        {l.product && (
                                            <span className="block text-[10px] text-slate-400">{l.product}</span>
                                        )}
                                    </span>
                                    <span className="font-semibold text-slate-800 shrink-0">
                                        {l.amount > 0 ? inr(l.amount) : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {hiddenLeads > 0 && (
                    <p className="text-[10px] text-slate-400">+{hiddenLeads} more</p>
                )}
            </div>

            <div className="flex items-center justify-between gap-6 text-[11px] mt-1.5 pt-1.5 border-t border-slate-100">
                <span className="font-medium text-slate-500">Total &middot; {row.total} {row.total === 1 ? 'lead' : 'leads'}</span>
                <span className="font-bold text-slate-900">{inr(row.totalOpportunityValue)}</span>
            </div>
        </div>
    );
};

/* ── Category 3: Cash Flow Activities ──────────────────────────────────────
   Four consolidated cards — collections and POA activities due today or already
   overdue (md files/Dashboard/cashflowSection.md). Hovering a card lists the
   records behind it; clicking one opens the Cash Flow Tracker with the same
   filters the card counted by, so the number and the Tracker always agree —
   and the BDE lands where the record can actually be updated, not just viewed. */

// The Cash Flow Report's Collection / POA Status filters are multi-selects, so
// "not Fully Paid" and "not Completed" are expressed as the statuses that remain.
const COLLECTION_NOT_PAID = 'Pending,Partial Paid,Stuck';
const POA_NOT_COMPLETED = 'Pending,In Progress';

const cashflowTrackerLink = (params: Record<string, string>) =>
    `/cashflow/tracker?${new URLSearchParams(params).toString()}`;

const shortDate = (d: any) => (d ? dayjs(d).format('DD MMM YYYY') : '—');

// "3 days" / "1 day" — an overdue count reads as a duration, not a bare number.
const overdueLabel = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

// A Lead's Sales Engagement Date & Time (and its Activity Log entries) is
// stored tagged as UTC — see LeadForm.tsx — so the picked wall-clock value
// never drifts across save/reload. It must be read back via its UTC
// components too, or the display shifts by the viewer's local timezone.
const engagementDate = (d: any) => (d ? dayjs.utc(d).format('DD MMM YYYY') : '—');
const engagementDateTime = (d: any) => (d ? dayjs.utc(d).format('DD MMM YYYY, h:mm A') : '—');

interface ActivityCardProps {
    label: string;
    bucket: { count: number; pendingAmount: number; items: any[] } | undefined;
    sub: React.ReactNode;
    icon: React.ElementType;
    color: string;
    alert?: boolean;
    /* Which detail rows the tooltip prints — collections carry money and an EDC,
       POA activities carry their own date and status. */
    kind: 'collection' | 'poa';
    onClick: () => void;
}

const ActivityCard = ({ label, bucket, sub, icon: Icon, color, alert, kind, onClick }: ActivityCardProps) => {
    const navigate = useNavigate();
    // Hover shows the detail panel on desktop; touch devices have no hover, so
    // the chevron button gives mobile users an explicit way to open the same panel.
    const [open, setOpen] = React.useState(false);
    const count = bucket?.count ?? 0;
    const items = bucket?.items ?? [];
    const hidden = Math.max(count - items.length, 0);

    return (
        <div className="relative group">
            <div
                onClick={onClick}
                className={clsx(
                    'card-hover h-full p-3 flex items-start gap-2.5 cursor-pointer',
                    alert && count > 0 && 'ring-1 ring-red-200'
                )}
            >
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', color)}>
                    <Icon size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight" title={label}>{label}</p>
                    <p className={clsx(
                        'text-xl font-bold tracking-tight leading-6',
                        alert && count > 0 ? 'text-red-600' : 'text-slate-900'
                    )} title={label}>
                    {count}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>
                </div>
                {count > 0 ? (
                    <button
                        type="button"
                        aria-label={open ? 'Hide details' : 'Show details'}
                        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                        className="text-slate-300 hover:text-slate-500 shrink-0 mt-0.5 p-0.5 -m-0.5"
                    >
                        <ChevronDown size={13} className={clsx('transition-transform', open && 'rotate-180')} />
                    </button>
                ) : (
                    <ArrowUpRight size={12} className="text-slate-300 shrink-0 mt-0.5" />
                )}
            </div>

            {/* Hover detail on desktop, tap-to-toggle on touch (chevron button above)
                — the same records the card counted. Suppressed when the bucket is
                empty; there is nothing to list. */}
            {count > 0 && (
                <div className={clsx(
                    'absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-[380px] max-w-[90vw]',
                    open ? 'block' : 'hidden group-hover:block'
                )}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 p-3">
                        <p className="text-[11px] font-bold text-slate-800 mb-2">{label} &middot; {count}</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {items.map((it: any) => (
                                <div
                                    key={it.milestone_id}
                                    onClick={() => navigate(`/cashflow/tracker?lead_id=${it.lead_id}&highlight_milestone=${it.milestone_id}`)}
                                    className="pb-2 border-b border-slate-100 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 rounded-md -mx-1 px-1"
                                >
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="text-[11px] font-semibold text-slate-800 truncate">{it.customer}</span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{it.product}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">{it.milestone}</p>
                                    {kind === 'collection' ? (
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-medium text-slate-600">{it.owner_name}</span>
                                            <span className="font-semibold text-slate-700">{inr(it.expected_amount)}</span>
                                            <span>EDC {shortDate(it.edc)}</span>
                                            {it.revised_edc && <span>R.EDC {shortDate(it.revised_edc)}</span>}
                                            {it.overdue_days !== undefined && (
                                                <span className="font-semibold text-red-600">Overdue {overdueLabel(it.overdue_days)}</span>
                                            )}
                                            <span className="font-medium text-slate-600">{it.collection_status}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                                            <span className="font-medium text-slate-600">{it.owner_name}</span>
                                            <span>POA EDC {shortDate(it.poa_edc)}</span>
                                            {it.overdue_days !== undefined && (
                                                <span className="font-semibold text-red-600">Overdue {overdueLabel(it.overdue_days)}</span>
                                            )}
                                            <span className="font-medium text-slate-600">{it.poa_status}</span>
                                        </div>
                                    )}
                                    {kind === 'poa' && it.poa && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2" title={it.poa}>
                                            {it.poa}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                        {hidden > 0 && (
                            <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                                +{hidden} more — click to open the Cash Flow Tracker
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Category 2: Sales Activities ──────────────────────────────────────────
   Eight consolidated cards — follow-up calls still outside the pipeline, and
   leads by Sales Engagement Date (md files/Dashboard/salesactivities.md).
   Hovering a card lists the records behind it; clicking one opens the list it
   was counted from with the same conditions applied. */

// ownerId — defaults to 'all' so Call Tracker/Leads (which default to "me only")
// show everything the dashboard card counted; when the BDE filter is set,
// narrowed to that one BDE instead so the drill-through matches the card.
const callTrackerLink = (params: Record<string, string>, ownerId: string = 'all') =>
    `/call-management/tracker?${new URLSearchParams({ ...params, salespersonId: ownerId }).toString()}`;

const leadReportLink = (params: Record<string, string>, ownerId: string = 'all') =>
    `/leads?${new URLSearchParams({ ...params, ownerId }).toString()}`;

interface SalesActivityCardProps {
    label: string;
    bucket: { count: number; items: any[] } | undefined;
    sub: string;
    icon: React.ElementType;
    color: string;
    /* Call rows carry a follow-up date and a lead status; lead rows carry a
       Sales Engagement Date, and only Today's Lead Activities shows the stage. */
    kind: 'call' | 'lead';
    showStage?: boolean;
    /* Overdue-style cards get the same red highlight ActivityCard uses. */
    alert?: boolean;
    onClick: () => void;
}

const SalesActivityCard = ({ label, bucket, sub, icon: Icon, color, kind, showStage, alert, onClick }: SalesActivityCardProps) => {
    const navigate = useNavigate();
    // Hover shows the detail panel on desktop; touch devices have no hover, so
    // the chevron button gives mobile users an explicit way to open the same panel.
    const [open, setOpen] = React.useState(false);
    const count = bucket?.count ?? 0;
    const items = bucket?.items ?? [];
    const hidden = Math.max(count - items.length, 0);

    return (
        <div className="relative group">
            <div
                onClick={onClick}
                className={clsx(
                    'card-hover h-full p-3 flex items-start gap-2.5 cursor-pointer',
                    alert && count > 0 && 'ring-1 ring-red-200'
                )}
            >
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', color)}>
                    <Icon size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight" title={label}>{label}</p>
                    <p className={clsx(
                        'text-lg font-bold tracking-tight leading-6',
                        alert && count > 0 ? 'text-red-600' : 'text-slate-900'
                    )}>
                        {count}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>
                </div>
                {count > 0 ? (
                    <button
                        type="button"
                        aria-label={open ? 'Hide details' : 'Show details'}
                        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                        className="text-slate-300 hover:text-slate-500 shrink-0 mt-0.5 p-0.5 -m-0.5"
                    >
                        <ChevronDown size={13} className={clsx('transition-transform', open && 'rotate-180')} />
                    </button>
                ) : (
                    <ArrowUpRight size={12} className="text-slate-300 shrink-0 mt-0.5" />
                )}
            </div>

            {/* Hover detail on desktop, tap-to-toggle on touch (chevron button above)
                — the same records the card counted */}
            {count > 0 && (
                <div className={clsx(
                    'absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-[380px] max-w-[90vw]',
                    open ? 'block' : 'hidden group-hover:block'
                )}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 p-3">
                        <p className="text-[11px] font-bold text-slate-800 mb-2">{label} &middot; {count}</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {items.map((it: any) => (
                                <div
                                    key={it.id}
                                    onClick={
                                        kind === 'lead' ? () => navigate(`/leads/${it.id}`)
                                            : kind === 'call' ? () => navigate(`/calls/${it.id}/view`)
                                                : undefined
                                    }
                                    className={clsx(
                                        'pb-2 border-b border-slate-100 last:border-0 last:pb-0',
                                        (kind === 'lead' || kind === 'call') && 'cursor-pointer hover:bg-slate-50 rounded-md -mx-1 px-1'
                                    )}
                                >
                                    {/* Company name leads the row; quadrant sits opposite it */}
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="text-[11px] font-semibold text-slate-800 truncate" title={it.company}>
                                            {it.company}
                                        </span>
                                        {it.quadrant && (
                                            <span
                                                className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded shrink-0"
                                                style={{ backgroundColor: qColor(it.quadrant) }}
                                            >
                                                {it.quadrant}
                                            </span>
                                        )}
                                    </div>
                                    {it.project_name && (
                                        <p className="text-[10px] text-slate-500 truncate" title={it.project_name}>{it.project_name}</p>
                                    )}
                                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                                        <span className="font-medium text-slate-600">{it.contact_person}</span>
                                        <span>{it.product}</span>
                                    </div>
                                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                                        <span className="font-medium text-slate-600">{it.lead_owner}</span>
                                        <span>{kind === 'call' ? 'Follow-up' : 'Engagement'} {kind === 'call' ? shortDate(it.engagement_date) : engagementDate(it.engagement_date)}</span>
                                        {kind === 'call' && <span className="font-medium text-slate-600">{it.lead_status}</span>}
                                        {kind === 'lead' && showStage && <span className="font-medium text-slate-600">{it.sales_stage}</span>}
                                        {kind === 'call' && it.follow_up_status && (
                                            <span
                                                className={clsx(
                                                    'px-1.5 py-0.5 rounded text-[9px] font-bold',
                                                    it.follow_up_status === 'Closed' ? 'bg-green-50 text-green-700'
                                                        : it.follow_up_status === 'InProgress' ? 'bg-blue-50 text-blue-700'
                                                            : 'bg-amber-50 text-amber-700'
                                                )}
                                            >
                                                {it.follow_up_status === 'InProgress' ? 'In Progress' : it.follow_up_status}
                                            </span>
                                        )}
                                    </div>
                                    {kind === 'call' && it.engagement_note && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2" title={it.engagement_note}>
                                            {it.engagement_note}
                                        </p>
                                    )}
                                    {kind === 'call' && it.follow_up_note && (
                                        <p className="text-[10px] text-amber-600 mt-0.5 line-clamp-2" title={it.follow_up_note}>
                                            Follow-up: {it.follow_up_note}
                                        </p>
                                    )}

                                    {/* Full Activity Log history for this lead, most recent first */}
                                    {kind === 'lead' && it.activity_logs?.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-slate-50 space-y-1">
                                            {it.activity_logs.map((log: any, i: number) => (
                                                <div key={i} className="text-[10px]">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium text-slate-600">
                                                            {engagementDateTime(log.date)}
                                                            {log.activity && <> &middot; {log.activity}</>}
                                                        </span>
                                                        <span
                                                            className={clsx(
                                                                'px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0',
                                                                log.status === 'Completed' ? 'bg-green-50 text-green-700'
                                                                    : log.status === 'In Progress' ? 'bg-blue-50 text-blue-700'
                                                                        : 'bg-amber-50 text-amber-700'
                                                            )}
                                                        >
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    {log.notes && (
                                                        <p className="text-slate-400 line-clamp-2" title={log.notes}>{log.notes}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {hidden > 0 && (
                            <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                                +{hidden} more — click to open the full list
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════ */
/* BDE filter — CEO/SalesManager only, per md files/Dashboard. Narrows every
   section (Pipeline, Sales Activities, Cash Flow Activities) down to one BDE's
   own records; a Sales Manager's dropdown only ever lists their own team, and
   the backend independently re-validates that (buildRoleScope / buildLeadScope). */
const BdeFilter = ({ value, onChange, bdes }: { value: number | null; onChange: (v: number | null) => void; bdes: { id: number; first_name: string; last_name: string | null }[] }) => (
    <div className="flex items-center gap-2 border rounded-xl px-2.5 py-1 shadow-sm bg-emerald-50 border-emerald-200">
        <UserCircle size={14} className="text-emerald-500 shrink-0" />
        <SearchableSelect
            options={bdes.map(b => ({ value: String(b.id), label: [b.first_name, b.last_name].filter(Boolean).join(' ') }))}
            value={value ? String(value) : ''}
            onChange={v => onChange(v ? Number(v) : null)}
            placeholder="All BDEs"
            searchPlaceholder="Search BDE…"
            className="!border-none !p-0 !bg-transparent !py-0 w-40 [&>span]:!text-xs [&>span]:font-semibold text-slate-700"
        />
    </div>
);

/* Company filter — narrows every section (Categories 1-5) down to one BU
   Company (lead.company_id / product.company_id, the same field the Cash
   Flow Report's Company filter uses). Visible to everyone — unlike the BDE
   filter, it doesn't widen anyone's scope, only narrows it further. */
const CompanyFilter = ({ value, onChange, companies }: { value: number | null; onChange: (v: number | null) => void; companies: { id: number; name: string }[] }) => (
    <div className="flex items-center gap-2 border rounded-xl px-2.5 py-1 shadow-sm bg-blue-50 border-blue-200">
        <Building2 size={14} className="text-blue-500 shrink-0" />
        <SearchableSelect
            options={companies.map(c => ({ value: String(c.id), label: c.name }))}
            value={value ? String(value) : ''}
            onChange={v => onChange(v ? Number(v) : null)}
            placeholder="All Companies"
            searchPlaceholder="Search Company…"
            className="!border-none !p-0 !bg-transparent !py-0 w-40 [&>span]:!text-xs [&>span]:font-semibold text-slate-700"
        />
    </div>
);

/* Product filter — same scope as CompanyFilter, narrowed to one Product;
   the dropdown itself is narrowed to the selected Company's products. */
const ProductFilter = ({ value, onChange, products }: { value: number | null; onChange: (v: number | null) => void; products: { id: number; name: string }[] }) => (
    <div className="flex items-center gap-2 border rounded-xl px-2.5 py-1 shadow-sm bg-amber-50 border-amber-200">
        <Package size={14} className="text-amber-500 shrink-0" />
        <SearchableSelect
            options={products.map(p => ({ value: String(p.id), label: p.name }))}
            value={value ? String(value) : ''}
            onChange={v => onChange(v ? Number(v) : null)}
            placeholder="All Products"
            searchPlaceholder="Search Product…"
            className="!border-none !p-0 !bg-transparent !py-0 w-40 [&>span]:!text-xs [&>span]:font-semibold text-slate-700"
        />
    </div>
);

export default function Dashboard() {
    const { user, hasPrivilege } = useAuth();
    const navigate = useNavigate();

    // BDE dropdown — visible only to CEO/SalesManager, who can see more than
    // their own records in the first place. Persisted in the URL (and mirrored
    // to localStorage by the hook) so navigating away to another module and
    // back to the Dashboard keeps the selection instead of resetting to "All".
    const canFilterByBde = user?.role === 'CEO' || user?.role === 'SalesManager';
    const { filters: dashboardFilters, setFilters: setDashboardFilters, resetFilters: resetDashboardFilters } = usePersistentFilters('dashboard', { bde_id: '', company_id: '', product_id: '' });
    const selectedBdeId = dashboardFilters.bde_id ? Number(dashboardFilters.bde_id) : null;
    const setSelectedBdeId = (v: number | null) => setDashboardFilters({ bde_id: v ? String(v) : '' });
    const selectedCompanyId = dashboardFilters.company_id ? Number(dashboardFilters.company_id) : null;
    // Picking a new Company drops whatever Product was selected — it may not
    // belong to the new company (mirrors the Cash Flow Report's Company filter).
    const setSelectedCompanyId = (v: number | null) => setDashboardFilters({ company_id: v ? String(v) : '', product_id: '' });
    const selectedProductId = dashboardFilters.product_id ? Number(dashboardFilters.product_id) : null;
    const setSelectedProductId = (v: number | null) => setDashboardFilters({ product_id: v ? String(v) : '' });
    const dashboardParams = {
        ...(selectedBdeId ? { bde_id: selectedBdeId } : {}),
        ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
        ...(selectedProductId ? { product_id: selectedProductId } : {}),
    };

    // Dropdown lists only BDEs (Sales Person / Sales Manager) with at least one
    // lead or call tracker entry matching the current Company/Product selection
    // — not every BDE the role scope would otherwise allow — so re-fetches
    // whenever either changes.
    const { data: bdes = [], isSuccess: bdesLoaded } = useQuery({
        queryKey: ['dashboard-bdes', selectedCompanyId, selectedProductId],
        queryFn: () => api.get('/reports/dashboard-bdes', {
            params: {
                ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
                ...(selectedProductId ? { product_id: selectedProductId } : {}),
            },
        }).then(r => r.data),
        enabled: canFilterByBde,
    });
    // A Company/Product change can drop the currently selected BDE out of the
    // narrowed list (they have no matching records) — clear it rather than
    // silently keep a selection the dropdown no longer offers. Gated on
    // bdesLoaded so the very first load doesn't wipe a persisted selection
    // before its matching fetch has come back.
    React.useEffect(() => {
        if (!bdesLoaded || !selectedBdeId) return;
        if (!(bdes as any[]).some(b => b.id === selectedBdeId)) setSelectedBdeId(null);
    }, [bdesLoaded, bdes, selectedBdeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Company filter — the full BU Company master, same list the Cash Flow
    // Report's Company filter uses. Visible to every role.
    const { data: companies = [] } = useQuery({
        queryKey: ['dashboard-companies'],
        queryFn: () => api.get('/masters/company').then(r => r.data),
    });
    const activeCompanies = (companies as any[]).filter(c => c.is_active !== false);

    // Product filter — narrowed to the selected Company's products, or the
    // full active list when no Company is selected. When a BDE is also
    // selected it narrows further to that BDE's mapped products (the ones
    // they hold a target for) so the Product dropdown matches the BDE picked
    // just above it.
    const { data: dashboardProducts = [], isSuccess: productsLoaded } = useQuery({
        queryKey: ['dashboard-products', selectedCompanyId, selectedBdeId],
        queryFn: () => api.get('/reports/dashboard-products', {
            params: {
                ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
                ...(selectedBdeId ? { bde_id: selectedBdeId } : {}),
            },
        }).then(r => r.data),
    });
    const activeProducts = (dashboardProducts as any[]).filter(p => p.is_active !== false);
    // A Company/BDE change can drop the selected Product out of the narrowed
    // list — clear it rather than keep a selection the dropdown no longer
    // offers (mirrors the BDE-clear effect above). Gated on productsLoaded so
    // the first load doesn't wipe a persisted selection before its fetch returns.
    React.useEffect(() => {
        if (!productsLoaded || !selectedProductId) return;
        if (!(dashboardProducts as any[]).some(p => p.id === selectedProductId)) setSelectedProductId(null);
    }, [productsLoaded, dashboardProducts, selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data: stats, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard-stats', selectedBdeId, selectedCompanyId, selectedProductId],
        queryFn: () => api.get('/reports/dashboard', { params: dashboardParams }).then(r => r.data),
    });

    /* Category 3 — Cash Flow Activities. Only fetched for users who can open the
       Cash Flow Report; the section is theirs alone, since every card links into it. */
    const canViewCashflow = hasPrivilege('CashflowReport', 'can_view');
    const { data: cashflow, isLoading: cashflowLoading } = useQuery({
        queryKey: ['dashboard-cashflow-activities', selectedBdeId, selectedCompanyId, selectedProductId],
        queryFn: () => api.get('/cashflow-report/dashboard-activities', { params: dashboardParams }).then(r => r.data),
        enabled: canViewCashflow,
    });

    /* Category 1b — SEAL Performance Summary. Aggregated across every product the
       caller is mapped to (see /seal/summary), gated on the same SealDashboard
       privilege the sidebar link and /seal/dashboard route use. */
    const canViewSeal = hasPrivilege('SealDashboard', 'can_view');
    const { data: sealSummary, isLoading: sealSummaryLoading } = useQuery({
        queryKey: ['dashboard-seal-summary', selectedBdeId, selectedCompanyId, selectedProductId],
        queryFn: () => api.get('/seal/summary', { params: dashboardParams }).then(r => r.data),
        enabled: canViewSeal,
    });
    // Per-BDE hover rows for each SEAL card — sorted by whichever figure that
    // card is about, so the top contributor/gap always shows first. A BDE with
    // no target for that metric (sales/license) has nothing meaningful to show
    // there, so they're dropped rather than padding the list with zeroes.
    const sealBdeRows = (metric: 'target' | 'actual' | 'license' | 'leads') => {
        const list: any[] = sealSummary?.byBde ?? [];
        const sortKey = metric === 'target' ? 'salesTarget' : metric === 'actual' ? 'salesActual' : metric === 'license' ? 'licenseAchieved' : 'leads';
        const filtered = metric === 'target' || metric === 'actual' ? list.filter(b => b.salesTarget > 0)
            : metric === 'license' ? list.filter(b => b.licenseTarget > 0)
                : list.filter(b => b.leads > 0);
        return [...filtered]
            .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0))
            .map(b => ({
                name: b.name,
                value: metric === 'target' ? inr(b.salesTarget)
                    : metric === 'actual' ? `${inr(b.salesActual)} (${b.salesPct}%)`
                        : metric === 'license' ? `${b.licenseAchieved}/${b.licenseTarget} (${b.licensePct}%)`
                            : String(b.leads),
            }));
    };

    /* Category 2 — Sales Activities. The six lead cards open the Lead Report and
       the two call cards open the Call Tracker, so the section belongs to users
       who can open a report. */
    const canViewReports = hasPrivilege('Reports', 'can_view');
    const canViewCalls = hasPrivilege('Calls', 'can_view');
    const {
        data: salesActivities,
        isLoading: salesActivitiesLoading,
        isError: salesActivitiesError,
    } = useQuery({
        queryKey: ['dashboard-sales-activities', selectedBdeId, selectedCompanyId, selectedProductId],
        queryFn: () => api.get('/reports/sales-activities', { params: dashboardParams }).then(r => r.data),
        enabled: canViewReports,
        retry: false,
    });

    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    /* Activity windows — the same boundaries the backend counted by (dayjs weeks
       start on Sunday on both sides). */
    const day = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
    const lastWeekStart = day(dayjs().subtract(1, 'week').startOf('week'));
    const lastWeekEnd = day(dayjs().subtract(1, 'week').endOf('week'));
    const weekStart = day(dayjs().startOf('week'));
    const weekEnd = day(dayjs().endOf('week'));
    const nextWeekStart = day(dayjs().add(1, 'week').startOf('week'));
    const nextWeekEnd = day(dayjs().add(1, 'week').endOf('week'));
    const monthStart = day(dayjs().startOf('month'));
    const monthEnd = day(dayjs().endOf('month'));
    const nextMonthStart = day(dayjs().add(1, 'month').startOf('month'));
    const nextMonthEnd = day(dayjs().add(1, 'month').endOf('month'));

    const quadrantData = ['Q4', 'Q3', 'Q2', 'Q1', 'Nurturing'].map(name => {
        const q = stats?.quadrantStats?.find((qs: any) => qs.quadrant === name);
        const companies: string[] = q?.companies || [];
        return {
            name,
            count: q?._count?.id || 0,
            leads: companies.map(c => ({ company: c, owner: '' })),
        };
    });

    /* Requalification leads (Nurturing / auto-degraded), split the same way as
       the pipeline — one row per quadrant instead of a single card. */
    const requalQuadrantData = ['Q4', 'Q3', 'Q2', 'Q1', 'Nurturing'].map(name => {
        const q = stats?.requalificationQuadrantStats?.find((qs: any) => qs.quadrant === name);
        return { name, count: q?._count?.id || 0 };
    });

    /* Category 4 — product-wise quadrant count. Unaffected by the BDE filter,
       but narrowed by Company/Product like every other section when set. */
    const productQuadrantData: any[] = (stats?.productQuadrantStats ?? []).filter((p: any) => p.total > 0);

    /* Category 5 — opportunity value-wise quadrant count (stacked by quadrant) */
    const opportunityData: any[] = (stats?.opportunityQuadrantStats ?? []).filter((r: any) => r.total > 0);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (isError) return (
        <div className="page-wrapper">
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">
                    {(error as any)?.response?.data?.message || (error as any)?.message}
                </span>
            </div>
        </div>
    );

    /* Nurturing sits outside the active pipeline, so it is measured against all
       leads instead of the Q1–Q4 total — dividing it by the pipeline produced
       shares above 100%. */
    const activeQuadrants = quadrantData.filter(d => d.name !== 'Nurturing');
    const nurturingRow = quadrantData.find(d => d.name === 'Nurturing');
    const quadrantTotal = activeQuadrants.reduce((s, d) => s + d.count, 0);
    const allLeadsTotal = quadrantTotal + (nurturingRow?.count ?? 0);

    const requalTotal = requalQuadrantData.reduce((s, d) => s + d.count, 0);

    // Drill-through links carry the same BDE/Company/Product scope the cards
    // were counted by — 'all' (everything RBAC allows) when no BDE is
    // selected, otherwise that one BDE, so the report a card opens always
    // matches what it counted. The Leads and Call Tracker pages have no
    // Company filter of their own, so only Product (and BDE) carry across
    // to them; the Cash Flow Report supports both.
    const ownerIdStr = selectedBdeId ? String(selectedBdeId) : 'all';
    const productIdStr = selectedProductId ? String(selectedProductId) : '';
    const ctLink = (params: Record<string, string>) => callTrackerLink(productIdStr ? { ...params, productId: productIdStr } : params, ownerIdStr);
    const lrLink = (params: Record<string, string>) => leadReportLink(productIdStr ? { ...params, product_id: productIdStr } : params, ownerIdStr);
    // Tracker's product/BDE filters are keyed differently (sel_id, bde_id) and it
    // has no BU-company filter at all (only a client/customer-company one, a
    // different concept than the Dashboard's Company filter) — so only product
    // and BDE carry across.
    const ctLinkCashflow = (params: Record<string, string>) => cashflowTrackerLink({
        ...params,
        ...(selectedBdeId ? { bde_id: ownerIdStr } : {}),
        ...(productIdStr ? { sel_id: productIdStr } : {}),
    });

    // Row-level collapse — the two multi-column rows collapse as a unit
    // (either column's chevron toggles both), rather than each column on its own.
    const callPipelineRowCollapse = usePersistedCollapse('dashboard:section-collapsed:row-call-pipeline');
    const activitiesRowCollapse = usePersistedCollapse('dashboard:section-collapsed:row-lead-cashflow-activities');

    return (
        <div className="page-wrapper">

            {/* ── Header ── */}
            <div className="mb-7 flex items-start justify-between flex-wrap gap-3">
                <div>
                    <p className="text-xs text-slate-400">{greeting},</p>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        {user?.first_name} {user?.last_name}
                    </h1>
                    {/* <p className="text-xs text-slate-500">Here's your pipeline at a glance.</p> */}
                </div>
                {/* Company / Product filters — every role, narrows every section below;
                    BDE filter — CEO/SalesManager only, narrows every section below to one BDE */}
                <div className="flex items-center flex-wrap gap-2">
                    <CompanyFilter value={selectedCompanyId} onChange={setSelectedCompanyId} companies={activeCompanies} />
                    {canFilterByBde && (
                        <BdeFilter value={selectedBdeId} onChange={setSelectedBdeId} bdes={bdes} />
                    )}
                    <ProductFilter value={selectedProductId} onChange={setSelectedProductId} products={activeProducts} />
                    {(selectedBdeId || selectedCompanyId || selectedProductId) && (
                        <button
                            type="button"
                            onClick={() => resetDashboardFilters()}
                            className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ══ Category 1b — Sales Performance Summary ══
                Aggregated across every product the caller is mapped to — click any
                card to open the full Sales Dashboard. */}
            {canViewSeal && (
                <section className="mb-12">
                    <SectionHeading
                        title="Sales Performance"
                        subtitle="Aggregated across all mapped products for the current fiscal year — click to open the Sales Dashboard"
                    >
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sealSummaryLoading ? (
                            <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
                        ) : (
                            <>
                                <SealMetricCard
                                    label="Sales Target To Date"
                                    value={inr(sealSummary?.targetToDate ?? 0)}
                                    sub={sealSummary?.fiscalYear ? `FY ${sealSummary.fiscalYear}` : undefined}
                                    icon={Target}
                                    color="bg-blue-600"
                                    onClick={() => navigate('/seal/dashboard')}
                                    rows={sealBdeRows('target')}
                                />
                                <SealMetricCard
                                    label="Sales Actual To Date"
                                    value={inr(sealSummary?.actualToDate ?? 0)}
                                    sub={`${sealSummary?.perfPct ?? 0}% achieved`}
                                    icon={TrendingUp}
                                    color={
                                        (sealSummary?.perfPct ?? 0) >= 90 ? 'bg-emerald-600'
                                            : (sealSummary?.perfPct ?? 0) >= 60 ? 'bg-amber-500'
                                                : 'bg-red-600'
                                    }
                                    onClick={() => navigate('/seal/dashboard')}
                                    rows={sealBdeRows('actual')}
                                />
                                <SealMetricCard
                                    label="Sales Licenses/Devices"
                                    value={`${sealSummary?.totals?.licenseAchieved ?? 0}/${sealSummary?.totals?.licenseTarget ?? 0}`}
                                    sub={`${sealSummary?.totals?.licensesPct ?? 0}% achieved`}
                                    icon={Award}
                                    color="bg-purple-600"
                                    onClick={() => navigate('/seal/dashboard')}
                                    rows={sealBdeRows('license')}
                                />
                            </>
                        )}
                    </div>
                    </SectionHeading>
                </section>
            )}

            {/* ══ Category 1 — Call Activities (left) + Lead Pipeline Overview (right) ══
                Hidden outright when the endpoint refuses the user — a wall of
                zeros would read as "no activity" rather than "not yours to see". */}
            <section className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-8 items-start">

                    {/* Left — Call Activities */}
                    {canViewReports && canViewCalls && !salesActivitiesError && (
                        <div>
                            <SectionHeading
                                title="Call  Activities"
                                subtitle="Follow-up calls still outside the pipeline — hover for details, click to open the Call Tracker"
                                collapseControl={callPipelineRowCollapse}
                            >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                                {isLoading || salesActivitiesLoading ? (
                                    <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
                                ) : (
                                    <>
                                        <KpiCard
                                            label="Calls Made Today"  value={stats?.todayCalls ?? '—'}
                                            icon={Phone}         color="bg-emerald-600"
                                            onClick={() => navigate('/call-management/tracker')}
                                        />
                                        <SalesActivityCard
                                            label="Today Pending Calls"
                                            bucket={salesActivities?.todayCalls}
                                            sub="Follow-up today, not in pipeline"
                                            icon={PhoneCall}
                                            color="bg-emerald-600"
                                            kind="call"
                                            onClick={() => navigate(ctLink({
                                                nextFollowUpFrom: today,
                                                nextFollowUpTo: today,
                                                notMovedToPipeline: '1',
                                            }))}
                                        />
                                        <SalesActivityCard
                                            label="Last Week Pending"
                                            bucket={salesActivities?.lastWeekCalls}
                                            sub="Follow-up last week, not in pipeline"
                                            icon={History}
                                            color="bg-slate-500"
                                            kind="call"
                                            onClick={() => navigate(ctLink({
                                                nextFollowUpFrom: lastWeekStart,
                                                nextFollowUpTo: lastWeekEnd,
                                                notMovedToPipeline: '1',
                                            }))}
                                        />
                                        <SalesActivityCard
                                            label="This Week Pending"
                                            bucket={salesActivities?.thisWeekCalls}
                                            sub="Follow-up this week, not in pipeline"
                                            icon={Phone}
                                            color="bg-blue-600"
                                            kind="call"
                                            onClick={() => navigate(ctLink({
                                                nextFollowUpFrom: weekStart,
                                                nextFollowUpTo: weekEnd,
                                                notMovedToPipeline: '1',
                                            }))}
                                        />
                                        <SalesActivityCard
                                            label="Next Week Calls"
                                            bucket={salesActivities?.nextWeekCalls}
                                            sub="Follow-up next week, not in pipeline"
                                            icon={CalendarPlus}
                                            color="bg-indigo-500"
                                            kind="call"
                                            onClick={() => navigate(ctLink({
                                                nextFollowUpFrom: nextWeekStart,
                                                nextFollowUpTo: nextWeekEnd,
                                                notMovedToPipeline: '1',
                                            }))}
                                        />
                                        <SalesActivityCard
                                            label="Overdue Calls"
                                            bucket={salesActivities?.overdueCalls}
                                            sub="Follow-up date passed, not in pipeline"
                                            icon={Siren}
                                            color="bg-red-600"
                                            alert
                                            kind="call"
                                            onClick={() => navigate(ctLink({
                                                nextFollowUpTo: yesterday,
                                                notMovedToPipeline: '1',
                                            }))}
                                        />
                                    </>
                                )}
                            </div>
                            </SectionHeading>
                        </div>
                    )}

                    {/* Right — Lead Pipeline Overview: Pipeline Breakdown + Requalification Breakdown */}
                    <div className="lg:col-span-2">
                        <SectionHeading
                            title="Lead Pipeline Overview"
                            subtitle="Overall lead data across all products and users"
                            collapseControl={callPipelineRowCollapse}
                        >

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            {/* Pipeline Breakdown */}
                            <div className="card">
                                <div className="card-header flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={14} className="text-primary-600" />
                                        <h3 className="text-xs font-semibold text-slate-800">Pipeline Breakdown</h3>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Share of active pipeline</span>
                                </div>
                                <div className="p-4">
                                    {isLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="flex items-center gap-2.5">
                                                    <div className="skeleton w-7 h-7 rounded-md shrink-0" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="skeleton h-2 w-14 rounded" />
                                                        <div className="skeleton h-1.5 w-full rounded-full" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activeQuadrants.map(q => (
                                                <QuadrantRow
                                                    key={q.name}
                                                    name={q.name} count={q.count} total={quadrantTotal}
                                                    onClick={() => navigate(lrLink({ quadrant: q.name }))}
                                                />
                                            ))}

                                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <span className="text-[11px] font-medium text-slate-500">Total Pipeline</span>
                                                <span className="text-sm font-bold text-slate-900">{quadrantTotal} leads</span>
                                            </div>

                                            {/* Nurturing is not part of the active pipeline, so it is
                                                listed apart and measured against all leads */}
                                            {nurturingRow && nurturingRow.count > 0 && (
                                                <div className="pt-3 border-t border-slate-100">
                                                    <QuadrantRow
                                                        name={nurturingRow.name} count={nurturingRow.count}
                                                        total={allLeadsTotal} caption="of all leads"
                                                        onClick={() => navigate(lrLink({ quadrant: nurturingRow.name }))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Requalification Breakdown — Nurturing / auto-degraded leads,
                                split by quadrant like the Pipeline Breakdown card */}
                            <div className="card">
                                <div className="card-header flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-orange-500" />
                                        <h3 className="text-xs font-semibold text-slate-800">Requalification Breakdown</h3>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Nurturing / auto-degraded leads</span>
                                </div>
                                <div className="p-4">
                                    {isLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="flex items-center gap-2.5">
                                                    <div className="skeleton w-7 h-7 rounded-md shrink-0" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="skeleton h-2 w-14 rounded" />
                                                        <div className="skeleton h-1.5 w-full rounded-full" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : requalTotal === 0 ? (
                                        <ChartEmpty message="No leads currently need requalification." />
                                    ) : (
                                        <div className="space-y-3">
                                            {requalQuadrantData.filter(q => q.count > 0).map(q => (
                                                <QuadrantRow
                                                    key={q.name}
                                                    name={q.name} count={q.count} total={requalTotal}
                                                    onClick={() => navigate(lrLink({ quadrant: q.name, requiresRequalification: '1' }))}
                                                />
                                            ))}

                                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <span className="text-[11px] font-medium text-slate-500">Total</span>
                                                <span className="text-sm font-bold text-slate-900">{requalTotal} leads</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        </SectionHeading>
                    </div>
                </div>
            </section>

            {/* ══ Category 3 — Lead Sales Activities (left) + Cash Flow Activities (right) ══ */}
            {((canViewReports && !salesActivitiesError) || canViewCashflow) && (
                <section className="mb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-12">

                        {/* Left — Lead Sales Activities */}
                        {canViewReports && !salesActivitiesError && (
                            <div>
                                <SectionHeading
                                    title="Lead Sales Activities"
                                    subtitle="Lead engagements by Sales Engagement Date — hover for details, click to open the full list"
                                    collapseControl={activitiesRowCollapse}
                                >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {salesActivitiesLoading ? (
                                        <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
                                    ) : (
                                        <>
                                            <SalesActivityCard
                                                label="Today's Lead Activities"
                                                bucket={salesActivities?.todayLeads}
                                                sub="Engagement today, still open"
                                                icon={Activity}
                                                color="bg-violet-600"
                                                kind="lead"
                                                showStage
                                                onClick={() => navigate(lrLink({
                                                    engagementFrom: today,
                                                    engagementTo: today,
                                                    excludeClosed: '1',
                                                }))}
                                            />
                                              <SalesActivityCard
                                                label="Over Due Activities"
                                                bucket={salesActivities?.dateExitLeads}
                                                sub="Engagement date already passed, still open"
                                                icon={Siren}
                                                color="bg-red-600"
                                                alert
                                                kind="lead"
                                                onClick={() => navigate(lrLink({
                                                    engagementTo: yesterday,
                                                    excludeClosed: '1',
                                                }))}
                                            />
                                            
                                            <SalesActivityCard
                                                label="This Week's Lead Activities"
                                                bucket={salesActivities?.thisWeekLeads}
                                                sub="Engagement this week, still open"
                                                icon={CalendarRange}
                                                color="bg-indigo-600"
                                                kind="lead"
                                                onClick={() => navigate(lrLink({
                                                    engagementFrom: weekStart,
                                                    engagementTo: weekEnd,
                                                    excludeClosed: '1',
                                                }))}
                                            />
                                          
                                            <SalesActivityCard
                                                label="Next Week's Lead Activities"
                                                bucket={salesActivities?.nextWeekLeads}
                                                sub="Engagement next week, still open"
                                                icon={History}
                                                color="bg-slate-600"
                                                kind="lead"
                                                onClick={() => navigate(lrLink({
                                                    engagementFrom: nextWeekStart,
                                                    engagementTo: nextWeekEnd,
                                                    excludeClosed: '1',
                                                }))}
                                            />
                                            <SalesActivityCard
                                                label="This Month's Lead Activities"
                                                bucket={salesActivities?.thisMonthLeads}
                                                sub="Engagement this month, still open"
                                                icon={CalendarDays}
                                                color="bg-amber-500"
                                                kind="lead"
                                                onClick={() => navigate(lrLink({
                                                    engagementFrom: monthStart,
                                                    engagementTo: monthEnd,
                                                    excludeClosed: '1',
                                                }))}
                                            />
                                            <SalesActivityCard
                                                label="Next Month's Lead Activities"
                                                bucket={salesActivities?.nextMonthLeads}
                                                sub="Engagement next month, still open"
                                                icon={CalendarPlus}
                                                color="bg-cyan-600"
                                                kind="lead"
                                                onClick={() => navigate(lrLink({
                                                    engagementFrom: nextMonthStart,
                                                    engagementTo: nextMonthEnd,
                                                    excludeClosed: '1',
                                                }))}
                                            />
                                        </>
                                    )}
                                </div>
                                </SectionHeading>
                            </div>
                        )}

                        {/* Right — Cash Flow Activities */}
                        {canViewCashflow && (
                            <div>
                                <SectionHeading
                                    title="Cash Flow Activities"
                                    subtitle="Cash Flow and POA activities due this week or overdue — hover for details, click to open the Cash Flow Tracker"
                                    collapseControl={activitiesRowCollapse}
                                >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {cashflowLoading ? (
                                        <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
                                    ) : (
                                        <>
                                            {/* Cash Flow side */}
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Wallet size={12} className="text-blue-500" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cash Flow</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                                                    <ActivityCard
                                                        label="Cash Flow Due This Week"
                                                        bucket={cashflow?.dueThisWeek}
                                                        sub={<>Pending <span className="text-sm font-bold text-slate-700">{inr(cashflow?.dueThisWeek?.pendingAmount ?? 0)}</span></>}
                                                        icon={Wallet}
                                                        color="bg-blue-600"
                                                        kind="collection"
                                                        onClick={() => navigate(ctLinkCashflow({
                                                            from_date: today,
                                                            to_date: weekEnd,
                                                            collection_status: COLLECTION_NOT_PAID,
                                                        }))}
                                                    />
                                                    <ActivityCard
                                                        label="Cashflow Expired EDC/REDC Milestones"
                                                        bucket={cashflow?.overdueCollections}
                                                        sub={<>Pending <span className="text-sm font-bold text-slate-700">{inr(cashflow?.overdueCollections?.pendingAmount ?? 0)}</span></>}
                                                        icon={Siren}
                                                        color="bg-red-600"
                                                        alert
                                                        kind="collection"
                                                        onClick={() => navigate(ctLinkCashflow({
                                                            to_date: yesterday,
                                                            collection_status: COLLECTION_NOT_PAID,
                                                        }))}
                                                    />
                                                    <ActivityCard
                                                        label="Cashflow Overall"
                                                        bucket={cashflow?.overallCashflow}
                                                        sub={<>Pending <span className="text-sm font-bold text-slate-700">{inr(cashflow?.overallCashflow?.pendingAmount ?? 0)}</span></>}
                                                        icon={Wallet}
                                                        color="bg-blue-700"
                                                        kind="collection"
                                                        onClick={() => navigate(ctLinkCashflow({
                                                            collection_status: COLLECTION_NOT_PAID,
                                                        }))}
                                                    />
                                                </div>
                                            </div>
                                            {/* POA side */}
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <ClipboardList size={12} className="text-teal-500" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">POA</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                                                    <ActivityCard
                                                        label="POA Due Today"
                                                        bucket={cashflow?.poaDueToday}
                                                        sub="POA activities not completed"
                                                        icon={ClipboardList}
                                                        color="bg-teal-600"
                                                        kind="poa"
                                                        onClick={() => navigate(ctLinkCashflow({
                                                            poa_from_date: today,
                                                            poa_to_date: today,
                                                            poa_status: POA_NOT_COMPLETED,
                                                        }))}
                                                    />
                                                    <ActivityCard
                                                        label="POA Due This Week"
                                                        bucket={cashflow?.poaDueThisWeek}
                                                        sub="POA activities not completed"
                                                        icon={ClipboardList}
                                                        color="bg-cyan-600"
                                                        kind="poa"
                                                        onClick={() => navigate(ctLinkCashflow({
                                                            poa_from_date: today,
                                                            poa_to_date: weekEnd,
                                                            poa_status: POA_NOT_COMPLETED,
                                                        }))}
                                                    />
                                                    <ActivityCard
                                                        label="Overdue POA Activities"
                                                        bucket={cashflow?.overduePoa}
                                                        sub="POA EDC already passed"
                                                        icon={Siren}
                                                        color="bg-red-600"
                                                        alert
                                                        kind="poa"
                                                        onClick={() => navigate(ctLinkCashflow({
                                                            poa_to_date: yesterday,
                                                            poa_status: POA_NOT_COMPLETED,
                                                        }))}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                </SectionHeading>
                            </div>
                        )}

                    </div>
                </section>
            )}

            {/* ══ Category 4 — Product-wise Quadrant Count ══ */}
            <section className="mb-12">
                <SectionHeading
                    title="Product-wise Quadrant Count"
                    subtitle="A pie chart per product, split by quadrant — hover for counts"
                >
                <div className="card">
                    <div className="card-header flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <PieChartIcon size={16} className="text-primary-600" />
                            <h3 className="text-sm font-semibold text-slate-800">Quadrant Split by Product</h3>
                        </div>
                        {/* Shared legend — every product pie uses the same quadrant colours */}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                            {DASHBOARD_QUADRANTS.map(q => (
                                <span key={q} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: qColor(q) }} />
                                    {q}
                                </span>
                            ))}
                        </div>
                    </div>
                    {isLoading ? (
                        <ChartSkeleton height={288} />
                    ) : productQuadrantData.length === 0 ? (
                        <ChartEmpty message="No lead data available." />
                    ) : (
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {productQuadrantData.map((row: any) => (
                                <ProductQuadrantPie
                                    key={row.product}
                                    row={row}
                                    onSliceClick={(quadrant) =>
                                        quadrant && navigate(lrLink({ quadrant }))
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
                </SectionHeading>
            </section>

            {/* ══ Category 5 — Opportunity Value-wise Quadrant Count ══ */}
            <section className="mb-6">
                <SectionHeading
                    title="Opportunity Value-wise Quadrant Count"
                    subtitle="A pie chart per opportunity value range, split by quadrant — hover for the product breakdown"
                >
                <div className="card">
                    <div className="card-header flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <IndianRupee size={16} className="text-primary-600" />
                            <h3 className="text-sm font-semibold text-slate-800">Quadrant Split by Opportunity Value</h3>
                        </div>
                        {/* Same quadrant colours as Category 4 so both charts read together */}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                            {DASHBOARD_QUADRANTS.map(q => (
                                <span key={q} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: qColor(q) }} />
                                    {q}
                                </span>
                            ))}
                        </div>
                    </div>
                    {isLoading ? (
                        <ChartSkeleton height={288} />
                    ) : opportunityData.length === 0 ? (
                        <ChartEmpty message="No opportunity values captured yet." />
                    ) : (
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {opportunityData.map((row: any) => (
                                <OpportunityQuadrantPie
                                    key={row.range}
                                    row={row}
                                    onSliceClick={(quadrant) =>
                                        quadrant && navigate(lrLink({ quadrant }))
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
                </SectionHeading>
            </section>

        </div>
    );
}
