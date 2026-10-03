import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ClipboardList, Layers, Wallet, Building2, Package, UserCircle,
    RefreshCw, Search, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import api from '../../services/api';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { SearchableSelect } from '../../components/FilterDropdown';
import { EdcStatusSelect, PeriodSelect, QuarterSelect, DateRangeFields, normalizeEdcStatus } from '../../components/CashflowFilterFields';
import { fmt } from './CashflowTracker';

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
    const tones: Record<string, [string, string, string]> = {
        blue: ['from-blue-700 to-blue-900', 'text-slate-900', 'bg-blue-100'],
        emerald: ['from-emerald-700 to-emerald-900', 'text-slate-900', 'bg-emerald-100'],
    };
    const [grad, text, bg] = tones[tone] || tones.blue;
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow px-3 py-2 flex items-center gap-2.5">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm', grad)}>
                <Icon size={15} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
                <p className={clsx('text-base font-extrabold tracking-tight leading-tight truncate', text)}>{value}</p>
            </div>
            <div className={clsx('ml-auto hidden xl:block w-1.5 h-7 rounded-full', bg)} />
        </div>
    );
}

function Skeleton() {
    return (
        <div className="animate-pulse space-y-3 p-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
        </div>
    );
}

export default function CashflowForecast() {
    const { filters, setFilters } = usePersistentFilters('cashflow-forecast', {
        company_id: '', product_id: '', bde_id: '', client_company_id: '', edc_status: 'all', quick_filter: '', month: '',
        quarter: '', from_date: '', to_date: '', search: '',
    });

    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [bdeId, setBdeId] = useState(filters.bde_id || '');
    const [clientCompanyId, setClientCompanyId] = useState(filters.client_company_id || '');
    const [edcStatus, setEdcStatus] = useState(normalizeEdcStatus(filters.edc_status));
    const [quickFilter, setQuickFilter] = useState(filters.quick_filter || '');
    const [month, setMonth] = useState(filters.month || '');
    const [quarter, setQuarter] = useState(filters.quarter || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [search, setSearch] = useState(filters.search || '');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const syncFilters = (patch: Partial<typeof filters>) =>
        setFilters({ company_id: companyId, product_id: productId, bde_id: bdeId, client_company_id: clientCompanyId, edc_status: edcStatus, quick_filter: quickFilter, month, quarter, from_date: fromDate, to_date: toDate, search, ...patch });

    const { data: companies = [] } = useQuery({ queryKey: ['masters', 'company'], queryFn: () => api.get('/masters/company').then(r => r.data) });
    // Client Company filter (clientcomFilter.md) — only client companies with at
    // least one forecasted milestone matching the current Company/Product/BDE
    // selection, refreshed dynamically as those filters change.
    const { data: clientCompanies = [] } = useQuery({
        queryKey: ['cashflow-forecast-client-companies', companyId, productId, bdeId],
        queryFn: () => api.get('/cashflow-forecast/client-companies', { params: { company_id: companyId || undefined, product_id: productId || undefined, bde_id: bdeId || undefined } }).then(r => r.data),
    });
    const { data: products = [] } = useQuery({
        queryKey: ['masters', 'product', companyId],
        queryFn: () => api.get('/masters/product', { params: companyId ? { company_id: companyId } : undefined }).then(r => r.data),
    });
    const { data: bdes = [] } = useQuery({
        queryKey: ['cashflow-forecast-bdes', companyId, productId],
        queryFn: () => api.get('/cashflow-forecast/bdes', { params: { company_id: companyId || undefined, product_id: productId || undefined } }).then(r => r.data),
    });

    const params = {
        company_id: companyId || undefined,
        product_id: productId || undefined,
        bde_id: bdeId || undefined,
        client_company_id: clientCompanyId || undefined,
        edc_status: edcStatus !== 'all' ? edcStatus : undefined,
        quick_filter: quickFilter || undefined,
        month: !quickFilter && month ? month : undefined,
        quarter: quarter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search || undefined,
    };

    const { data: dashboard } = useQuery({
        queryKey: ['cashflow-forecast-dashboard', params],
        queryFn: () => api.get('/cashflow-forecast/dashboard', { params }).then(r => r.data?.data),
    });

    const { data: listData, isLoading, error, refetch } = useQuery({
        queryKey: ['cashflow-forecast-list', params],
        queryFn: () => api.get('/cashflow-forecast', { params }).then(r => r.data),
    });

    const rows: any[] = listData?.data || [];

    const handleCompanyChange = (val: string) => {
        setCompanyId(val);
        setProductId('');
        setBdeId('');
        syncFilters({ company_id: val, product_id: '', bde_id: '' });
    };
    const handleProductChange = (val: string) => {
        setProductId(val);
        setBdeId('');
        syncFilters({ product_id: val, bde_id: '' });
    };
    const handleBdeChange = (val: string) => { setBdeId(val); syncFilters({ bde_id: val }); };
    const handleClientCompanyChange = (val: string) => { setClientCompanyId(val); syncFilters({ client_company_id: val }); };
    const handleEdcStatusChange = (val: string) => { setEdcStatus(val); syncFilters({ edc_status: val }); };
    const handleQuickFilter = (val: string) => {
        setQuickFilter(val);
        setMonth('');
        syncFilters({ quick_filter: val, month: '' });
    };
    const handleQuarterChange = (val: string) => { setQuarter(val); syncFilters({ quarter: val }); };
    const handleFromDateChange = (val: string) => { setFromDate(val); syncFilters({ from_date: val }); };
    const handleToDateChange = (val: string) => { setToDate(val); syncFilters({ to_date: val }); };
    const handleSearchChange = (val: string) => { setSearch(val); syncFilters({ search: val }); };

    const handleReset = () => {
        setCompanyId(''); setProductId(''); setBdeId(''); setClientCompanyId(''); setEdcStatus('all');
        setQuickFilter(''); setMonth(''); setQuarter(''); setFromDate(''); setToDate(''); setSearch('');
        setFilters({
            company_id: '', product_id: '', bde_id: '', client_company_id: '', edc_status: 'all', quick_filter: '', month: '',
            quarter: '', from_date: '', to_date: '', search: '',
        });
    };

    const hasActiveFilters = !!(companyId || productId || bdeId || clientCompanyId || edcStatus !== 'all' || quickFilter || month || quarter || fromDate || toDate || search);

    // Group milestone rows by company (in server-sorted order) and compute
    // per-company + grand totals — mirrors the Cashflow Report grouped view.
    const { groups: allGroups, grandTotal } = useMemo(() => {
        const map = new Map<string, { name: string; rows: any[]; total: number }>();
        for (const r of rows) {
            const key = String(r.company_id ?? r.company);
            if (!map.has(key)) map.set(key, { name: r.company, rows: [], total: 0 });
            const g = map.get(key)!;
            g.rows.push(r);
            g.total += Number(r.expected_amount) || 0;
        }
        const grandTotal = rows.reduce((s, r) => s + (Number(r.expected_amount) || 0), 0);
        return { groups: [...map.values()], grandTotal };
    }, [rows]);

    // Paged by company, not by milestone: a company's rows and its total have to stay
    // together, and slicing mid-company would print a "— Total" that only covered the
    // part of it that landed on this page.
    const totalPages = Math.max(1, Math.ceil(allGroups.length / pageSize));
    const groups = useMemo(
        () => allGroups.slice((page - 1) * pageSize, page * pageSize),
        [allGroups, page, pageSize]
    );
    const pagedRowCount = groups.reduce((s, g) => s + g.rows.length, 0);

    // Any filter change or a smaller page size can leave the current page out of range.
    useEffect(() => { setPage(1); }, [pageSize, params.company_id, params.product_id, params.bde_id, params.client_company_id, params.edc_status, params.quick_filter, params.month, params.quarter, params.from_date, params.to_date, params.search]);

    return (
        <div className="min-h-screen bg-slate-50/70 p-5 lg:p-6 space-y-5">

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 rounded-2xl shadow-lg shadow-slate-900/10 px-5 py-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
                        <ClipboardList size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold text-white leading-tight uppercase tracking-wide">Cashflow Forecast</h1>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Expected order milestones — management visibility</p>
                    </div>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                    <EdcStatusSelect value={edcStatus} onChange={handleEdcStatusChange} />
                    <PeriodSelect value={quickFilter} onChange={handleQuickFilter} />
                    <QuarterSelect value={quarter} onChange={handleQuarterChange} />
                    <DateRangeFields fromDate={fromDate} toDate={toDate} onFromChange={handleFromDateChange} onToChange={handleToDateChange} />

                    {/* Company */}
                    <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white relative">
                        <Building2 size={14} className="text-amber-600 shrink-0" />
                        <SearchableSelect
                            options={(companies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            value={companyId}
                            onChange={handleCompanyChange}
                            placeholder="All Companies"
                            searchPlaceholder="Search company…"
                            className="!border-none !p-0 !bg-transparent text-xs font-bold text-slate-800 max-w-[160px]"
                        />
                    </div>

                    {/* Client Company — searchable dropdown, limited to companies with milestone data (clientcomFilter.md) */}
                    <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white relative">
                        <Building2 size={14} className="text-amber-600 shrink-0" />
                        <SearchableSelect
                            options={(clientCompanies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            value={clientCompanyId}
                            onChange={handleClientCompanyChange}
                            placeholder="All Client Companies"
                            searchPlaceholder="Search client company…"
                            className="!border-none !p-0 !bg-transparent text-xs font-bold text-slate-800 max-w-[160px]"
                        />
                    </div>

                    {/* Product */}
                    <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white relative">
                        <Package size={14} className="text-amber-600 shrink-0" />
                        <SearchableSelect
                            options={(products as any[]).map((p: any) => ({ value: String(p.id), label: p.name }))}
                            value={productId}
                            onChange={handleProductChange}
                            placeholder="All Products"
                            searchPlaceholder="Search product…"
                            className="!border-none !p-0 !bg-transparent text-xs font-bold text-slate-800 max-w-[150px]"
                        />
                    </div>

                    {/* BDE */}
                    <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white relative">
                        <UserCircle size={14} className="text-amber-600 shrink-0" />
                        <SearchableSelect
                            options={(bdes as any[]).map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name || ''}`.trim() }))}
                            value={bdeId}
                            onChange={handleBdeChange}
                            placeholder="All BDE"
                            searchPlaceholder="Search BDE…"
                            className="!border-none !p-0 !bg-transparent text-xs font-semibold text-slate-800 max-w-[140px]"
                        />
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white">
                        <Search size={14} className="text-slate-500 shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Search company / product…"
                            className="text-xs font-semibold text-slate-800 bg-transparent outline-none w-40"
                        />
                    </div>

                    <button
                        onClick={handleReset}
                        disabled={!hasActiveFilters}
                        className={clsx(
                            'flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors',
                            hasActiveFilters
                                ? 'text-white bg-slate-800 border-slate-800 hover:bg-slate-900'
                                : 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                        )}
                    >
                        <RefreshCw size={12} /> Clear Filters
                    </button>
                </div>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <KpiCard label="Total Forecast Leads" value={String(dashboard?.total_forecast_leads ?? 0)} icon={Layers} tone="blue" />
                <KpiCard label="Expected Amount" value={fmt(dashboard?.expected_amount)} icon={Wallet} tone="emerald" />
            </div>

            {/* Forecast Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Forecast Milestones</span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">{rows.length}</span>
                    </div>
                    {allGroups.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Companies per page</span>
                            <select
                                value={pageSize}
                                onChange={e => setPageSize(Number(e.target.value))}
                                className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-amber-400"
                            >
                                {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {isLoading && <Skeleton />}
                {error && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm m-4">
                        <span className="flex-1">Failed to load forecast report.</span>
                        <button onClick={() => refetch()} className="text-xs px-3 py-1 rounded-lg border border-red-300 hover:bg-red-100 transition-colors">Retry</button>
                    </div>
                )}
                {/* The table renders even with no rows, so the columns stay visible and the
                    page keeps its shape while filters are being changed. */}
                {!isLoading && !error && (
                    <div className="overflow-auto max-h-[65vh]">
                        {/* The scroll box needs its own height for a sticky header to have
                            anything to stick to — inside a container that only ever grows,
                            `top-0` never engages. */}
                        <table className="w-full border-separate border-spacing-0" style={{ minWidth: 1020 }}>
                            <thead className="sticky top-0 z-20">
                                {/* Background on the cells, not the row: a transparent sticky th
                                    lets the rows passing underneath show through. */}
                                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-white [&>th]:bg-slate-900 [&>th]:border-b [&>th]:border-slate-700">
                                    <th className="px-4 py-3 text-left">Company</th>
                                    <th className="px-4 py-3 text-left">Project Name</th>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-left">Vertical</th>
                                    <th className="px-4 py-3 text-left">Milestone Type</th>
                                    <th className="px-2 py-2 text-right">Device Count</th>
                                    <th className="px-4 py-3 text-right">Expected Amount</th>
                                    <th className="px-4 py-3 text-center">EDC</th>
                                    <th className="px-4 py-3 text-left">Remarks</th>
                                    <th className="px-4 py-3 text-center">View</th>
                                </tr>
                            </thead>
                            {/* Row rules are drawn per cell — a separated table does not paint
                                borders declared on the <tr>. */}
                            <tbody>
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-14">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                    <ClipboardList size={20} className="text-slate-400" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-500">No forecasted milestones for the selected filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {groups.map(group => (
                                    <React.Fragment key={group.name}>
                                        <tr className="bg-amber-100/70">
                                            <td colSpan={10} className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-amber-900 border-y border-amber-200">
                                                {group.name}
                                            </td>
                                        </tr>
                                        {group.rows.map((r: any) => (
                                            <tr key={r.milestone_id} className="hover:bg-slate-50 transition-colors [&>td]:border-b [&>td]:border-slate-100">
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.lead_company}</td>
                                                {/* Project moved out of the Company cell into its own column */}
                                                <td className="px-4 py-3 text-xs font-medium text-slate-700 max-w-[180px] truncate" title={r.lead_project_name || ''}>
                                                    {r.lead_project_name || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-slate-700">{r.product}</td>
                                                <td className="px-4 py-3 text-xs font-medium text-slate-700">{r.vertical}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.milestone_type}</td>
                                                <td className="px-2 py-3 text-right text-xs font-medium text-slate-700">{r.device_count ?? '—'}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums">{fmt(r.expected_amount)}</td>
                                                <td className="px-4 py-3 text-center text-xs font-medium text-slate-600 whitespace-nowrap">
                                                    {r.edc ? dayjs(r.edc).format('DD-MMM-YYYY') : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-slate-700 max-w-[220px] truncate" title={r.remarks || ''}>
                                                    {r.remarks || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link
                                                        to={`/cashflow/forecast/${r.forecast_id}`}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-2.5 py-1 rounded-lg transition-colors"
                                                    >
                                                        <Eye size={11} /> View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-amber-50 font-bold [&>td]:border-y [&>td]:border-amber-200">
                                            <td colSpan={6} className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-amber-900">
                                                {group.name} — Total
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm font-extrabold text-emerald-800 tabular-nums">{fmt(group.total)}</td>
                                            <td colSpan={3} />
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                            {/* No grand total row when there is nothing to total */}
                            {rows.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-100 font-bold [&>td]:border-t-2 [&>td]:border-slate-300">
                                        <td colSpan={6} className="px-4 py-3 text-xs font-extrabold uppercase text-slate-700 tracking-wider">Grand Total Expected Amount</td>
                                        <td className="px-4 py-3 text-right text-sm font-extrabold text-emerald-800 tabular-nums">{fmt(grandTotal)}</td>
                                        <td colSpan={3} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {!isLoading && !error && allGroups.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, allGroups.length)} of {allGroups.length} companies
                            <span className="text-slate-400"> ({pagedRowCount} of {rows.length} milestones)</span>
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                title="First page"
                                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                            >
                                First
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                title="Previous page"
                                className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-slate-600 px-2">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                title="Next page"
                                className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page >= totalPages}
                                title="Last page"
                                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
