import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Activity, BarChart3, UserCircle, ChevronDown, RefreshCw, CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { usePersistentFilters } from '../hooks/usePersistentFilters';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const getToken    = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ── colour helpers ────────────────────────────────────────────────────────────

const pctColor = (p: number) => {
    if (p >= 90) return { badge: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200', bar: 'bg-emerald-500' };
    if (p >= 60) return { badge: 'text-amber-700  bg-amber-50  ring-1 ring-amber-200',  bar: 'bg-amber-400'  };
    return             { badge: 'text-red-700    bg-red-50    ring-1 ring-red-200',    bar: 'bg-red-400'    };
};

const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

// ── types ─────────────────────────────────────────────────────────────────────

interface Metrics {
    calls:      { target: number; achieved: number; percent: number };
    leads:      { target: number; achieved: number; percent: number };
    lead_count: { order_won: number; q4: number; q3: number; q2: number; q1: number; nurturing: number; order_lost: number; total: number };
    demos:      { achieved: number };
    proposals:  { submitted: number };
}
interface BdeRow extends Metrics { bde_id: number; bde_name: string; }

// ── PctBadge ─────────────────────────────────────────────────────────────────

function PctBadge({ value, showBar }: { value: number; showBar?: boolean }) {
    const c = pctColor(value);
    return (
        <div className="flex flex-col items-center gap-0.5">
            <span className={clsx('inline-block text-[10px] font-bold px-2 py-0.5 rounded-full', c.badge)}>
                {value}%
            </span>
            {showBar && (
                <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all', c.bar)} style={{ width: `${Math.min(value, 100)}%` }} />
                </div>
            )}
        </div>
    );
}

// ── Period section ─────────────────────────────────────────────────────────────

function PeriodSection({
    label, rows, total, accentColor,
}: {
    label: string; rows: BdeRow[]; total: Metrics; accentColor: string;
}) {
    const rowCount = rows.length + 1;

    const Num = ({ v, bold }: { v: number | string; bold?: boolean }) => (
        <span className={clsx('tabular-nums', bold && 'font-bold')}>{v}</span>
    );

    const dataCells = (row: Metrics | BdeRow, isTotal = false) => {
        const base = isTotal ? 'text-slate-700' : 'text-slate-700';
        return (
            <>
                {/* ── Calls ───────── */}
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.calls.target || '—'} bold={isTotal} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.calls.achieved} bold={isTotal} />
                </td>
                <td className="px-3 py-2.5 text-center border-r border-slate-200">
                    {row.calls.target > 0
                        ? <PctBadge value={row.calls.percent} showBar />
                        : <span className="text-slate-300 text-[10px]">—</span>}
                </td>

                {/* ── Lead Achievement (leads created within the selected range) ─ */}
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.leads.target || '—'} bold={isTotal} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.leads.achieved} bold={isTotal} />
                </td>
                <td className="px-3 py-2.5 text-center border-r border-slate-200">
                    {row.leads.target > 0
                        ? <PctBadge value={row.leads.percent} showBar />
                        : <span className="text-slate-300 text-[10px]">—</span>}
                </td>

                {/* ── Sales Pipeline ──── */}
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.order_won} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.q4} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.q3} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.q2} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.q1} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.nurturing} />
                </td>
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-100">
                    <Num v={row.lead_count.order_lost} />
                </td>
                <td className="px-3 py-2.5 text-center border-r border-slate-200">
                    <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                        {row.lead_count.total}
                    </span>
                </td>

                {/* ── Demos ───────── */}
                <td className="px-3 py-2.5 text-center text-[12px] border-r border-slate-200">
                    <Num v={row.demos.achieved} bold={isTotal} />
                </td>

                {/* ── Proposals ───── */}
                <td className="px-3 py-2.5 text-center text-[12px]">
                    <Num v={row.proposals.submitted} bold={isTotal} />
                </td>
            </>
        );
    };

    return (
        <>
            {rows.map((row, i) => (
                <tr key={row.bde_id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
                    {/* Period label — spans BDE rows + total row */}
                    {i === 0 && (
                        <td
                            rowSpan={rowCount}
                            className="text-center align-middle border-r border-slate-200 bg-slate-50/60 w-[90px]"
                        >
                            <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-2">
                                <span className={clsx('w-1 h-8 rounded-full', accentColor)} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 writing-vertical"
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                                    {label}
                                </span>
                            </div>
                        </td>
                    )}

                    {/* BDE name with avatar */}
                    <td className="px-3 py-2.5 border-r border-slate-200 min-w-[140px]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-white">{initials(row.bde_name)}</span>
                            </div>
                            <span className="text-[12px] font-medium text-slate-700 truncate">{row.bde_name}</span>
                        </div>
                    </td>

                    {dataCells(row)}
                </tr>
            ))}

            {/* Total row */}
            <tr className="border-b-2 border-slate-200 bg-gradient-to-r from-amber-50/80 to-yellow-50/50">
                {rows.length === 0 && (
                    <td className="text-center align-middle border-r border-slate-200 bg-slate-50/60 w-[90px]">
                        <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-2">
                            <span className={clsx('w-1 h-8 rounded-full', accentColor)} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
                                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                                {label}
                            </span>
                        </div>
                    </td>
                )}
                <td className="px-3 py-2.5 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-white">∑</span>
                        </div>
                        <span className="text-[12px] font-bold text-amber-800">Total</span>
                    </div>
                </td>
                
                {dataCells(total, true)}
            </tr>
        </>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="animate-pulse space-y-3 p-6">
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
            </div>
            <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function LeadGenSummary() {
    const { user: authUser } = useAuth();
    const { filters: lgf, setFilters: setLgf } = usePersistentFilters('leadgen', {
        sel_type: '', sel_id: '', bde_id: '',
        sel_month: String(dayjs().month() + 1), sel_year: String(dayjs().year()),
        sel_week: String(Math.ceil(dayjs().date() / 7)),
    });

    // BDE is the primary filter (per leadgensum.md) — defaults to the logged-in user.
    const [selectedBdeId,       setSelectedBdeIdState]       = useState<number | null>(lgf.bde_id ? Number(lgf.bde_id) : (authUser?.id ?? null));
    const [selectedProductId,   setSelectedProductIdState]   = useState<number | null>(lgf.sel_id ? Number(lgf.sel_id) || null : null);
    const [selectionKey,        setSelectionKey]             = useState(lgf.sel_id ? String(lgf.sel_id) : '');
    const [selectedMonth,       setSelectedMonthState]       = useState<number>(lgf.sel_month ? Number(lgf.sel_month) : dayjs().month() + 1);
    const [selectedYear,        setSelectedYearState]        = useState<number>(lgf.sel_year  ? Number(lgf.sel_year)  : dayjs().year());
    const [selectedWeek,        setSelectedWeekState]        = useState<number>(lgf.sel_week  ? Number(lgf.sel_week)  : Math.ceil(dayjs().date() / 7));

    // Available months: January up to and including the current month
    const nowJs        = dayjs();
    const currentMonth = nowJs.month() + 1; // 1-12
    const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const availableMonths = MONTH_NAMES.slice(0, currentMonth).map((name, i) => ({ value: i + 1, label: name }));

    const setSelectedMonth = (m: number) => {
        setSelectedMonthState(m);
        // Reset week to 1 when month changes
        setSelectedWeekState(1);
        setLgf({ sel_month: String(m), sel_year: String(selectedYear), sel_week: '1' });
    };

    const setSelectedWeek = (w: number) => {
        setSelectedWeekState(w);
        setLgf({ sel_week: String(w) });
    };

    // Compute available weeks for the selected month — real calendar weeks (Mon–Sun),
    // clipped to the month so no week spans into another month (first/last may be partial).
    const monthBaseForWeeks   = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
    const daysInSelectedMonth = monthBaseForWeeks.daysInMonth();
    const calendarWeeksList: { start: number; end: number }[] = [];
    {
        let cursor = 1;
        while (cursor <= daysInSelectedMonth) {
            const dow = monthBaseForWeeks.date(cursor).day(); // 0=Sun .. 6=Sat
            const daysUntilSunday = dow === 0 ? 0 : (7 - dow);
            const end = Math.min(cursor + daysUntilSunday, daysInSelectedMonth);
            calendarWeeksList.push({ start: cursor, end });
            cursor = end + 1;
        }
    }
    const availableWeeks = calendarWeeksList.map((w, i) => ({
        value: i + 1,
        label: `${monthBaseForWeeks.date(w.start).format('DD MMM')} – ${monthBaseForWeeks.date(w.end).format('DD MMM')}`,
    }));

    const setSelectedProductId = (v: number | null) => {
        setSelectedProductIdState(v);
        setSelectionKey(v !== null ? String(v) : '');
        setLgf({ sel_type: v !== null ? 'product' : '', sel_id: v !== null ? String(v) : '' });
    };
    const setSelectedBdeId = (v: number | null) => {
        setSelectedBdeIdState(v);
        setLgf({ bde_id: v !== null ? String(v) : '' });
    };

    const hasSelection = !!selectedProductId;

    const handleReset = () => {
        setSelectedBdeId(authUser?.id ?? null);
        setSelectedProductId(null);
    };

    // BDE list — all active BDEs the caller is allowed to see (primary filter, independent of product)
    const { data: bdes = [] } = useQuery({
        queryKey: ['lg-bdes', authUser?.id],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/lead-gen/bdes`, { headers: authHeaders() });
            return res.data as { id: number; first_name: string; last_name: string | null }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Products mapped to the selected BDE — dropdown always stays enabled; with no
    // BDE selected it shows all active products (per leadgensum.md).
    const { data: products = [], isSuccess: productsLoaded } = useQuery({
        queryKey: ['lg-products', selectedBdeId],
        queryFn: async () => {
            const params: any = {};
            if (selectedBdeId) params.bde_id = selectedBdeId;
            const res = await axios.get(`${API_BASE}/lead-gen/products`, { headers: authHeaders(), params });
            return res.data as { id: number; name: string }[];
        },
        staleTime: 60 * 1000,
    });

    // Reconcile the selected product whenever the mapped-product list changes (i.e. the
    // BDE changed): clear it if no longer mapped, or auto-pick the first mapped product.
    // Gated on `productsLoaded` so a persisted selection isn't wiped by the empty
    // placeholder array present before the query resolves.
    useEffect(() => {
        if (!productsLoaded) return;
        const ids = products.map(p => Number(p.id));
        if (selectedProductId !== null && ids.includes(selectedProductId)) return; // still valid
        setSelectedProductId(products.length > 0 ? Number(products[0].id) : null);
    }, [products, productsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['lead-gen', selectedProductId, selectedBdeId, selectedMonth, selectedYear, selectedWeek],
        enabled: hasSelection,
        queryFn: async () => {
            const params: any = {};
            if (selectedProductId) params.product_id = selectedProductId;
            if (selectedBdeId)     params.bde_id     = selectedBdeId;
            params.month = selectedMonth;
            params.year  = selectedYear;
            params.week  = selectedWeek;
            const res = await axios.get(`${API_BASE}/lead-gen`, { headers: authHeaders(), params });
            return res.data;
        },
    });

    const selectionLabel = data ? (data.product_name ?? '') : '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 p-6 space-y-5">

            {/* ── Page header ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Lead Gen Summary</h1>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {selectionLabel ? `${selectionLabel} — Direct Marketing Performance` : 'Direct Marketing Performance'}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">

                    {/* BDE — primary filter */}
                    <div className="flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all duration-200 relative bg-emerald-50 border-emerald-200">
                        <UserCircle size={14} className="text-emerald-500 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[140px]"
                            value={selectedBdeId ?? ''}
                            onChange={e => setSelectedBdeId(Number(e.target.value) || null)}
                        >
                            <option value="">All BDEs</option>
                            {bdes.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    {/* Product — always enabled; reloads based on the selected BDE */}
                    <div className={clsx(
                        'flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all relative',
                        hasSelection ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/10'
                    )}>
                        <BarChart3 size={14} className={clsx('text-indigo-500 shrink-0', !hasSelection && 'animate-pulse')} />
                        <select
                            className="text-xs font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[160px]"
                            value={selectionKey}
                            onChange={e => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">{products.length > 0 ? 'Select Product' : 'No Products Available'}</option>
                            {products.map(p => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    {/* Month */}
                    <div className={clsx(
                        'flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all relative',
                        !hasSelection ? 'bg-slate-50 border-slate-100 opacity-40 pointer-events-none' : 'bg-white border-slate-200'
                    )}>
                        <CalendarDays size={14} className="text-rose-500 shrink-0" />
                        <select
                            disabled={!hasSelection}
                            className="text-xs font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                        >
                            {availableMonths.map(m => (
                                <option key={m.value} value={m.value}>{m.label} {selectedYear}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    {/* Week */}
                    <div className={clsx(
                        'flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all relative',
                        !hasSelection ? 'bg-slate-50 border-slate-100 opacity-40 pointer-events-none' : 'bg-white border-slate-200'
                    )}>
                        <CalendarDays size={14} className="text-violet-500 shrink-0" />
                        <select
                            disabled={!hasSelection}
                            className="text-xs font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer"
                            value={selectedWeek}
                            onChange={e => setSelectedWeek(Number(e.target.value))}
                        >
                            {availableWeeks.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    {/* Reset */}
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={11} />
                        Reset
                    </button>
                </div>
            </div>

            {/* ── Empty state ──────────────────────────────────────────────────── */}
            {!hasSelection && (
                <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-6">
                        <BarChart3 size={36} className="text-white -rotate-6" />
                    </div>
                    <div className="text-center space-y-1.5">
                        <h2 className="text-lg font-bold text-slate-700">Select a Product</h2>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                            Choose from the filter above to load direct marketing performance data.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Loading ───────────────────────────────────────────────────────── */}
            {isLoading && <Skeleton />}

            {/* ── Error ─────────────────────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <span className="flex-1">Failed to load data. Please try again.</span>
                    <button onClick={() => refetch()} className="text-xs px-3 py-1 rounded-lg border border-red-300 hover:bg-red-100 transition-colors">
                        Retry
                    </button>
                </div>
            )}

            {/* ── Dashboard content ─────────────────────────────────────────────── */}
            {data && !isLoading && (
                <>
                    {/* ── Performance table ────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden m-4">

                        {/* Card title bar */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Direct Marketing Detail — {selectionLabel}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-blue-100 border border-blue-200 inline-block" />Current Week
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-indigo-100 border border-indigo-200 inline-block" />Current Month
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ minWidth: 980 }}>
                                <thead>
                                    {/* Group row */}
                                    <tr className="text-[10px] font-bold uppercase tracking-wider">
                                        <th rowSpan={2} className="w-[90px] border-b border-r border-slate-200 bg-slate-50" />
                                        <th rowSpan={2} className="px-4 py-2.5 text-left font-semibold text-slate-500 border-b border-r border-slate-200 bg-slate-50 min-w-[140px]">
                                            BDE
                                        </th>
                                        <th colSpan={3} className="px-3 py-2.5 text-center text-blue-800 border-b border-r border-slate-200"
                                            style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
                                            Direct Marketing Calls
                                        </th>
                                        <th colSpan={3} className="px-3 py-2.5 text-center text-emerald-800 border-b border-r border-slate-200"
                                            style={{ background: 'linear-gradient(135deg,#f0fdf4,#d1fae5)' }}>
                                            Lead Target
                                        </th>
                                        <th colSpan={8} className="px-3 py-2.5 text-center text-orange-800 border-b border-r border-slate-200"
                                            style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)' }}>
                                            Sales Pipeline
                                        </th>
                                        <th colSpan={1} className="px-3 py-2.5 text-center text-purple-800 border-b border-r border-slate-200"
                                            style={{ background: 'linear-gradient(135deg,#faf5ff,#ede9fe)' }}>
                                            Demo Given
                                        </th>
                                        <th colSpan={1} className="px-3 py-2.5 text-center text-rose-800 border-b border-slate-200"
                                            style={{ background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)' }}>
                                            Proposals
                                        </th>
                                    </tr>

                                    {/* Sub-column row */}
                                    <tr className="text-[10px] font-semibold">
                                        {[
                                            { l: 'Target',   bg: 'bg-blue-50',    c: 'text-blue-600',    br: false },
                                            { l: 'Achieved', bg: 'bg-blue-50',    c: 'text-blue-600',    br: false },
                                            { l: '%',        bg: 'bg-blue-50',    c: 'text-blue-600',    br: true  },
                                            { l: 'Target',    bg: 'bg-emerald-50', c: 'text-emerald-600', br: false },
                                            { l: 'Achieved',  bg: 'bg-emerald-50', c: 'text-emerald-600', br: false },
                                            { l: '%',         bg: 'bg-emerald-50', c: 'text-emerald-600', br: true  },
                                            { l: 'Order Won', bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Q4',        bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Q3',        bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Q2',        bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Q1',        bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Nurturing', bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Order Lost',bg: 'bg-orange-50',  c: 'text-orange-600',  br: false },
                                            { l: 'Total',     bg: 'bg-orange-50',  c: 'text-orange-700',  br: true  },
                                            { l: 'Achieved',  bg: 'bg-purple-50',  c: 'text-purple-600',  br: true  },
                                            { l: 'Submitted', bg: 'bg-rose-50',    c: 'text-rose-600',    br: false },
                                        ].map(({ l, bg, c, br }, idx) => (
                                            <th key={idx} className={clsx(
                                                'px-3 py-2 text-center border-b',
                                                bg, c,
                                                br ? 'border-r border-slate-200' : 'border-r border-slate-100'
                                            )}>
                                                {l}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    <PeriodSection
                                        label={data.week_label ?? `Week ${data.sel_week ?? selectedWeek}`}
                                        rows={data.weekly.bde_rows}
                                        total={data.weekly.total}
                                        accentColor="bg-blue-400"
                                    />
                                    <tr><td colSpan={18} className="h-6 bg-slate-100/60" /></tr>
                                    <PeriodSection
                                        label={MONTH_NAMES[(data.sel_month ?? selectedMonth) - 1] ?? 'Month'}
                                        rows={data.monthly.bde_rows}
                                        total={data.monthly.total}
                                        accentColor="bg-indigo-500"
                                    />
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-slate-400">
                            <span>Lead Count filtered by Lead Created Date within the selected period.</span>
                            <span>Calls Achieved sourced from Call Tracker (non-null status only).</span>
                            <span className="ml-auto flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live data
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
