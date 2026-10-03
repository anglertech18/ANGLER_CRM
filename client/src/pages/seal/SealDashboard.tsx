import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Target, Users, Award, ChevronDown, BarChart3, ShieldCheck, UserCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';

const fmt = (n: number | null | undefined) => {
    if (n == null) return '—';
    return n.toLocaleString('en-IN');
};

const _defaultFiscalYear = (() => {
    const now = new Date();
    return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
})();

const SEAL_DASH_DEFAULTS = {
    product_id: 0,
    bde_id: 0,
    fiscal_year: _defaultFiscalYear,
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';

const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ── helpers ───────────────────────────────────────────────────────────────────
const pctColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600 bg-emerald-50';
    if (pct >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
};

const zoneColors: Record<string, { bg: string; text: string; border: string }> = {
    DANGER:     { bg: 'bg-red-500',    text: 'text-white', border: 'border-red-600' },
    REASONABLE: { bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-500' },
    EXCELLENT:  { bg: 'bg-emerald-500',text: 'text-white', border: 'border-emerald-600' },
};

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            {children}
        </h3>
    );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon size={22} className="text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── main component ────────────────────────────────────────────────────────────
export default function SealDashboard() {
    const { user: authUser } = useAuth();
    const { filters: pf, setFilters: setPf } = usePersistentFilters('seal-dashboard', SEAL_DASH_DEFAULTS);

    const selectedProductId = pf.product_id || null;
    const selectedBdeId = pf.bde_id || null;
    const fiscalYear = pf.fiscal_year;
    const selectionKey = pf.product_id ? String(pf.product_id) : '';

    // Auto-default BDE to logged-in user only when no BDE is currently persisted
    useEffect(() => {
        if (authUser?.id && !pf.bde_id) {
            setPf({ bde_id: authUser.id });
        }
    }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Derived: is anything selected?
    const hasSelection = !!selectedProductId;

    // Handler for the Product dropdown
    const handleSelectionChange = (val: string) => {
        if (!val) {
            setPf({ product_id: 0, bde_id: 0 });
            return;
        }
        setPf({ product_id: Number(val), bde_id: 0 });
    };

    // Fetch mapped Product options (RBAC-aware: CEO = all, Manager/Person = own mapped)
    const { data: mappedItems = [] } = useQuery({
        queryKey: ['seal-mapped-items', authUser?.id],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/seal/poas/mapped-products`, { headers: authHeaders() });
            return res.data as { id: number | string; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Auto-select first mapped product on load only when no product is persisted
    useEffect(() => {
        if (mappedItems.length > 0 && !pf.product_id) {
            const first = mappedItems[0];
            setPf({ product_id: Number(first.id) });
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch BDEs — filtered by product
    const { data: bdes = [] } = useQuery({
        queryKey: ['seal-bdes', selectedProductId],
        enabled: hasSelection,
        queryFn: async () => {
            const params: any = {};
            if (selectedProductId) params.product_id = selectedProductId;
            const res = await axios.get(`${API_BASE}/seal/bdes`, { headers: authHeaders(), params });
            return res.data;
        }
    });

    // Fetch SEAL data when product is selected
    const { data: sealData, isLoading, error } = useQuery({
        queryKey: ['seal', selectedProductId, fiscalYear, selectedBdeId],
        enabled: hasSelection,
        queryFn: async () => {
            const params: any = { fiscal_year: fiscalYear, user_id: selectedBdeId };
            if (selectedProductId) params.product_id = selectedProductId;
            const res = await axios.get(`${API_BASE}/seal`, { headers: authHeaders(), params });
            return res.data;
        }
    });

    const fyLabel = `${fiscalYear}-${String(fiscalYear + 1).slice(2)}`;
    const currentYear = new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear();

    // Tooltip state for quadrant lead lists
    const [quadTooltip, setQuadTooltip] = useState<{
        text: string; x: number; y: number;
    } | null>(null);

    // Chart data: monthly sales + license
    const chartData = sealData?.monthlyData?.map((m: any) => ({
        month: m.month,
        'Sales Actual': m.actual,
        'Sales Target': m.salesTarget,
        'License Achieved': m.licenseAchieved,
        'License Target': m.licenseTarget,
    })) ?? [];

    const selectionLabel = sealData
        ? `${sealData.user?.first_name ?? ''} ${sealData.user?.last_name ?? ''} — ${sealData.product?.name ?? ''}`
        : 'Sales, Engagement & Activity Ledger';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-6">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">SEAL Module</h1>
                        <p className="text-sm text-slate-500">{selectionLabel}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* 1. Product Dropdown (RBAC-filtered) */}
                    <div className="relative">
                        <div className={clsx(
                            "flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all",
                            hasSelection
                                ? "bg-blue-50 border-blue-300"
                                : "bg-blue-50 border-blue-200 ring-4 ring-blue-500/5 scale-105"
                        )}>
                            <BarChart3 size={16} className={hasSelection ? "text-blue-600" : "text-blue-600 animate-pulse"} />
                            <select
                                id="seal-product-select"
                                className="text-sm font-bold text-slate-700 bg-transparent outline-none pr-6 cursor-pointer"
                                value={selectionKey}
                                onChange={e => handleSelectionChange(e.target.value)}
                            >
                                <option value="">Select Product</option>
                                {mappedItems.map(m => (
                                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                    </div>

                    {/* 2. BDE Dropdown (Enabled only if product is selected) */}
                    <div className="relative">
                        <div className={clsx(
                            "flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all",
                            !hasSelection ? "bg-slate-50 border-slate-100 opacity-50 grayscale" : "bg-white border-slate-200"
                        )}>
                            <UserCircle size={16} className="text-emerald-500" />
                            <select
                                id="seal-bde-select"
                                disabled={!hasSelection}
                                className="text-sm font-medium text-slate-700 bg-transparent outline-none pr-6 cursor-pointer disabled:cursor-not-allowed"
                                value={selectedBdeId ?? ''}
                                onChange={e => setPf({ bde_id: Number(e.target.value) || 0 })}
                            >
                                <option value="">{hasSelection ? 'All BDEs' : 'Pick Product First'}</option>
                                {bdes.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                    </div>

                    {/* 4. Fiscal Year Selector */}
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                            <Target size={16} className="text-indigo-500" />
                            <select
                                id="seal-fy-select"
                                className="text-sm font-medium text-slate-700 bg-transparent outline-none pr-6 cursor-pointer"
                                value={fiscalYear}
                                onChange={e => setPf({ fiscal_year: Number(e.target.value) })}
                            >
                                {[-1, 0, 1].map(offset => {
                                    const y = currentYear + offset;
                                    return (
                                        <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>
                                    );
                                })}
                            </select>
                            <ChevronDown size={14} className="text-slate-400 absolute right-3 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Empty state ─────────────────────────────────────── */}
            {!hasSelection && (
                <div className="flex flex-col items-center justify-center mt-32 gap-6 p-8 bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-blue-200 max-w-2xl mx-auto shadow-2xl shadow-blue-500/5">
                    <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-12">
                        <BarChart3 size={44} className="text-white -rotate-12" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Select a Product to Begin</h2>
                        <p className="text-slate-500 font-medium max-w-md mx-auto">Choose a <strong>Product</strong> from the filters above to load performance metrics and BDE targets.</p>
                    </div>
                </div>
            )}

            {/* ── Loading ─────────────────────────────────────────── */}
            {isLoading && (
                <div className="flex items-center justify-center mt-32">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
            )}

            {/* ── Error ───────────────────────────────────────────── */}
            {error && (
                <div className="mt-8 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                    Failed to load SEAL data. Please try again.
                </div>
            )}

            {/* ── Dashboard Content ────────────────────────────────── */}
            {sealData && !isLoading && (
                <div className="space-y-6">

                    {/* ── Summary Cards ─────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Target to Date"
                            value={fmt(sealData.summary.targetToDate)}
                            sub={`FY ${fyLabel}`}
                            icon={Target}
                            color="bg-blue-500"
                        />
                        <StatCard
                            label="Actual to Date"
                            value={fmt(sealData.summary.actualToDate)}
                            sub={`${sealData.summary.perfPct}% achieved`}
                            icon={TrendingUp}
                            color={sealData.summary.perfPct >= 90 ? 'bg-emerald-500' : sealData.summary.perfPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                        />
                        <StatCard
                            label="Total Licenses"
                            value={fmt(sealData.totals.licenseAchieved)}
                            sub={`Target: ${fmt(sealData.totals.licenseTarget)}`}
                            icon={Award}
                            color="bg-purple-500"
                        />
                        <StatCard
                            label="Total Leads"
                            value={fmt(sealData.totalLeads ?? sealData.quadrantData.reduce((s: number, q: any) => s + q.currentLeads, 0))}
                            sub="Across all quadrants"
                            icon={Users}
                            color="bg-teal-500"
                        />
                    </div>

                    {/* ── Zone of Performance ────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex flex-wrap items-center justify-between gap-6">
                            {/* Target to Date */}
                            <div className="text-center">
                                <p className="text-4xl font-bold text-slate-800">{fmt(sealData.summary.targetToDate)}</p>
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">Target To Date</p>
                            </div>
                            {/* Actual to Date */}
                            <div className="text-center">
                                <div className={clsx('text-4xl font-bold px-6 py-2 rounded-lg', sealData.summary.perfPct >= 90 ? 'bg-emerald-500 text-white' : sealData.summary.perfPct >= 60 ? 'bg-yellow-400 text-gray-900' : 'bg-red-600 text-white')}>
                                    {sealData.summary.perfPct}%
                                </div>
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">Actual To Date</p>
                            </div>
                            {/* Zone label */}
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Zone Of Performance</p>
                            </div>
                            {/* Zone gauge */}
                            <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-slate-200 text-xs font-bold">
                                <div className="bg-red-600 text-white px-4 py-3 flex flex-col items-center justify-center">
                                    <span>DANGER</span>
                                    <span className="font-normal">&lt; 60%</span>
                                </div>
                                <div className="bg-sky-400 text-white px-4 py-3 flex flex-col items-center justify-center">
                                    <span>REASONABLE</span>
                                    <span className="font-normal">60 to 90%</span>
                                </div>
                                <div className="bg-emerald-500 text-white px-4 py-3 flex flex-col items-center justify-center">
                                    <span>Excellent</span>
                                    <span className="font-normal">&gt; 90%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Three performance tables — single row ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        {/* Monthly Performance */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-4 pt-3 pb-1.5 border-b border-slate-100 bg-slate-50/60">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                                    Monthly Performance — FY {fyLabel}
                                </p>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400">Month</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-yellow-700 bg-yellow-50">Target</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-500">Actual</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-400">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sealData.monthlyData.map((m: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                <td className="px-3 py-1 text-[11px] font-medium text-slate-600">{m.month}</td>
                                                <td className="px-2 py-1 text-center text-[11px] font-semibold bg-yellow-50 text-yellow-800">{m.salesTarget != null ? fmt(m.salesTarget) : '—'}</td>
                                                <td className="px-2 py-1 text-center text-[11px] font-semibold text-slate-700">{m.actual != null ? fmt(m.actual) : '—'}</td>
                                                <td className="px-2 py-1 text-center">
                                                    {m.variancePct !== null
                                                        ? <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', pctColor(m.variancePct))}>{m.variancePct}%</span>
                                                        : <span className="text-slate-300 text-[10px]">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                                            <td className="px-3 py-1 text-[11px] text-slate-700">Total</td>
                                            <td className="px-2 py-1 text-center text-[11px] bg-yellow-100 text-yellow-800">{fmt(sealData.totals.salesTarget)}</td>
                                            <td className="px-2 py-1 text-center text-[11px] text-slate-700">{fmt(sealData.totals.actual)}</td>
                                            <td className="px-2 py-1 text-center">
                                                {sealData.totals.salesTarget > 0
                                                    ? <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', pctColor(Math.round((sealData.totals.actual / sealData.totals.salesTarget) * 100)))}>{Math.round((sealData.totals.actual / sealData.totals.salesTarget) * 100)}%</span>
                                                    : '—'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Licence Performance */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-4 pt-3 pb-1.5 border-b border-slate-100 bg-slate-50/60">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                    Device|Licence|New Clients Performance — FY {fyLabel}
                                </p>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400">Month</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-blue-700 bg-blue-50">Target</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-blue-600 bg-blue-50">Achieved</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-400 bg-blue-50">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sealData.monthlyData.map((m: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                <td className="px-3 py-1 text-[11px] font-medium text-slate-600">{m.month}</td>
                                                <td className="px-2 py-1 text-center text-[11px] bg-blue-50 text-blue-700">{m.licenseTarget ?? '—'}</td>
                                                <td className="px-2 py-1 text-center text-[11px] font-semibold bg-blue-50 text-blue-800">{m.licenseAchieved ?? '—'}</td>
                                                <td className="px-2 py-1 text-center bg-blue-50">
                                                    {m.licensePct !== null
                                                        ? <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', pctColor(m.licensePct))}>{m.licensePct}%</span>
                                                        : <span className="text-slate-300 text-[10px]">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                                            <td className="px-3 py-1 text-[11px] text-slate-700">Total</td>
                                            <td className="px-2 py-1 text-center text-[11px] bg-blue-100 text-blue-700">{sealData.totals.licenseTarget}</td>
                                            <td className="px-2 py-1 text-center text-[11px] bg-blue-100 text-blue-800">{sealData.totals.licenseAchieved}</td>
                                            <td className="px-2 py-1 text-center bg-blue-100">
                                                <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', pctColor(sealData.totals.licensesPct ?? 0))}>{sealData.totals.licensesPct ?? 0}%</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Partner Sign-Up */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-4 pt-3 pb-1.5 border-b border-slate-100 bg-slate-50/60">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    Partner Sign-Up — FY {fyLabel}
                                </p>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400">Month</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-700 bg-emerald-50">Target</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-600 bg-emerald-50">Achieved</th>
                                            <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-400 bg-emerald-50">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sealData.monthlyData.map((m: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                <td className="px-3 py-1 text-[11px] font-medium text-slate-600">{m.month}</td>
                                                <td className="px-2 py-1 text-center text-[11px] bg-emerald-50 text-emerald-700">{m.partnerTarget ?? '—'}</td>
                                                <td className="px-2 py-1 text-center text-[11px] font-semibold bg-emerald-50 text-emerald-800">{m.partnerAchieved ?? '—'}</td>
                                                <td className="px-2 py-1 text-center bg-emerald-50">
                                                    {m.partnerPct !== null
                                                        ? <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', pctColor(m.partnerPct))}>{m.partnerPct}%</span>
                                                        : <span className="text-slate-300 text-[10px]">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                                            <td className="px-3 py-1 text-[11px] text-slate-700">Total</td>
                                            <td className="px-2 py-1 text-center text-[11px] bg-emerald-100 text-emerald-700">{sealData.totals.partnerTarget}</td>
                                            <td className="px-2 py-1 text-center text-[11px] bg-emerald-100 text-emerald-800">{sealData.totals.partnerAchieved}</td>
                                            <td className="px-2 py-1 text-center bg-emerald-100">
                                                <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', pctColor(sealData.totals.partnersPct ?? 0))}>{sealData.totals.partnersPct ?? 0}%</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── Row 2: Weekly Table (left) + Quadrant Table (right) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Weekly Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-2">
                                <SectionHeading>Weekly Breakdown</SectionHeading>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-emerald-50 border-b border-slate-100">
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Week</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700">Weekly Target</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Achievement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <td colSpan={3} className="px-4 py-1.5 text-xs font-bold text-slate-600">{sealData.weeklyMonth}</td>
                                    </tr>
                                    {sealData.weeklyData.map((w: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-2 text-slate-600 font-medium">{w.week}</td>
                                            <td className="px-3 py-2 text-center bg-emerald-50 text-emerald-700 font-semibold">{fmt(w.salesTarget)}</td>
                                            <td className="px-3 py-2 text-center font-semibold text-slate-700">{fmt(w.salesAchieved)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Quadrant Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-2">
                                <SectionHeading>Quadrant Leads Snapshot</SectionHeading>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-indigo-50 border-b border-slate-100">
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Quadrant</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-indigo-700">Actual Leads</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700">Upcoming Week</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sealData.quadrantData.map((q: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-2 font-semibold text-slate-700">{q.quadrant}</td>
                                            {/* Actual leads count — hover shows lead names */}
                                            <td className="px-3 py-2 text-center bg-indigo-50">
                                                <span
                                                    className="inline-block text-indigo-700 font-bold text-sm cursor-default select-none"
                                                    onMouseEnter={e => {
                                                        if (!q.leads?.length) return;
                                                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                        const lines = q.leads.map((l: any) =>
                                                            l.company ? `${l.name} (${l.company})` : l.name
                                                        ).join('\n');
                                                        setQuadTooltip({ text: lines, x: r.left, y: r.top });
                                                    }}
                                                    onMouseLeave={() => setQuadTooltip(null)}
                                                >
                                                    {q.currentLeads}
                                                </span>
                                            </td>
                                            {/* Movement count — hover shows planned lead names */}
                                            <td className="px-3 py-2 text-center">
                                                <span
                                                    className={clsx(
                                                        'inline-block text-xs font-bold cursor-default select-none',
                                                        q.quadrantMovement > 0 ? 'text-emerald-600' : 'text-slate-400'
                                                    )}
                                                    onMouseEnter={e => {
                                                        if (!q.movementLeads?.length) return;
                                                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                        const lines = q.movementLeads.map((l: any) =>
                                                            l.company ? `${l.name} (${l.company})` : l.name
                                                        ).join('\n');
                                                        setQuadTooltip({ text: lines, x: r.left, y: r.top });
                                                    }}
                                                    onMouseLeave={() => setQuadTooltip(null)}
                                                >
                                                    {q.quadrantMovement > 0 ? `+${q.quadrantMovement}` : q.quadrantMovement}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Charts Row ─────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sales Performance Chart */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h3 className="text-center text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Sales Performance Chart</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Line type="monotone" dataKey="Sales Target" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                                    <Line type="monotone" dataKey="Sales Actual" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Licence Performance Chart — always shown */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h3 className="text-center text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Licence Performance Chart</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Line type="monotone" dataKey="License Target" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                                    <Line type="monotone" dataKey="License Achieved" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            )}

            {/* Portal tooltip for quadrant lead lists */}
            {quadTooltip && createPortal(
                <div style={{
                    position: 'fixed',
                    top: quadTooltip.y - 12,
                    left: quadTooltip.x,
                    transform: 'translateY(-100%)',
                    zIndex: 99999,
                    pointerEvents: 'none',
                    maxWidth: '280px',
                    background: '#1e293b',
                    color: '#fff',
                    fontSize: '12px',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.7',
                }}>
                    {quadTooltip.text}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '16px',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #1e293b',
                    }} />
                </div>,
                document.body
            )}
        </div>
    );
}
