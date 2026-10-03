import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { TrendingUp, CheckCircle2, Percent, RefreshCw, ClipboardList, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { SearchableSelect } from '../../components/FilterDropdown';
import { ActivePill, EdcStatusSelect, DurationSelect, DateRangeFields, normalizeEdcStatus } from '../../components/CashflowFilterFields';
import TablePagination from '../../components/TablePagination';
import { FROZEN_EDGE } from '../../components/CashflowHierarchy';

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SUMMARY_TONES: Record<string, { grad: string; text: string }> = {
    blue: { grad: 'from-blue-500 to-blue-600', text: 'text-blue-600' },
    emerald: { grad: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600' },
    amber: { grad: 'from-amber-500 to-amber-600', text: 'text-amber-600' },
    violet: { grad: 'from-violet-500 to-violet-600', text: 'text-violet-600' },
};

function MilestoneTable({ rows, totalAmount, totalInvoiceAmount }: { rows: any[]; totalAmount: number; totalInvoiceAmount: number }) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    useEffect(() => { setPage(1); }, [rows, pageSize]);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
    const emptyText = 'No milestones for the selected filters.';
    const totalLabel = 'Total Amount';

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-slate-900">{rows.length} milestone{rows.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Rows:</span>
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="form-select py-1 text-xs" style={{ width: 64 }}>
                        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div className="overflow-auto max-h-[60vh] overscroll-x-contain">
                <table className="w-full min-w-[1080px] text-sm border-collapse">
                    <thead className="sticky top-0 z-20">
                        <tr className="text-[10px] font-semibold uppercase tracking-wider text-blue-100 bg-gradient-to-r from-blue-700 to-blue-800" style={{ height: 46 }}>
                            <th className={clsx('px-3 py-2.5 text-left align-middle sticky left-0 z-30 bg-blue-700', FROZEN_EDGE)}>Client /<br />Project</th>
                            <th className="px-3 py-2.5 text-left align-middle">Vertical /<br />Product</th>
                            <th className="px-3 py-2.5 text-left align-middle">Milestone</th>
                            <th className="px-3 py-2.5 text-center align-middle">Milestone<br />Amount</th>
                            <th className="px-3 py-2.5 text-center align-middle">Invoice<br />Amount</th>
                            <th className="px-3 py-2.5 text-left align-middle">Invoice<br />No. / Date</th>
                            <th className="px-3 py-2.5 text-center align-middle">Milestone<br />EDC</th>
                            <th className="px-3 py-2.5 text-center align-middle">Invoice<br />EDC</th>
                            <th className="px-3 py-2.5 text-center align-middle">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-400 bg-white">
                                <ClipboardList size={22} className="text-slate-200 mx-auto mb-2" />
                                {emptyText}
                            </td></tr>
                        ) : pagedRows.map((r, idx) => (
                            <tr key={r.billing_forecast_id} className={clsx('border-b border-slate-100 transition-colors', idx % 2 === 1 ? 'bg-slate-50' : 'bg-white', 'hover:bg-blue-50/40')}>
                                <td className={clsx('px-3 py-2.5 sticky left-0 z-10 bg-inherit', FROZEN_EDGE)}>
                                    <p className="font-semibold text-slate-700 truncate max-w-[200px]" title={r.project}>{r.project}</p>
                                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]" title={r.client}>{r.client}</p>
                                </td>
                                <td className="px-3 py-2.5">
                                    <p className="text-slate-700">{r.vertical}</p>
                                    <p className="text-[11px] text-slate-400">{r.product}</p>
                                </td>
                                <td className="px-3 py-2.5">{r.milestone}</td>
                                <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-800">{fmt(r.amount)}</td>
                                <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-800">{r._status === 'Achieved' ? fmt(r.amount) : '—'}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <p className="font-semibold text-slate-700">{r.invoice_number || '—'}</p>
                                    <p className="text-[11px] text-slate-400">{r.invoice_date ? dayjs(r.invoice_date).format('DD-MMM-YY') : '—'}</p>
                                </td>
                                <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.edc ? dayjs(r.edc).format('DD-MMM-YY') : '—'}</td>
                                <td className="px-3 py-2.5 text-center whitespace-nowrap">{r.edc_payment_collection ? dayjs(r.edc_payment_collection).format('DD-MMM-YY') : '—'}</td>
                                <td className="px-3 py-2.5 text-center">
                                    <span className={clsx('badge', r._status === 'Achieved' ? 'badge-green' : 'badge-amber')}>{r._status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot className="sticky bottom-0 z-10">
                            <tr className="border-t-2 border-blue-400 shadow-[0_-4px_12px_-6px_rgba(16,24,40,0.25)]" style={{ height: 48 }}>
                                <td colSpan={3} className={clsx('px-3 py-1.5 align-middle sticky left-0 z-20 bg-blue-100', FROZEN_EDGE)}>
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-blue-950 leading-tight">{totalLabel}</span>
                                    <span className="block text-[11px] text-blue-900 leading-tight">{rows.length} {rows.length === 1 ? 'Milestone' : 'Milestones'}</span>
                                </td>
                                <td className="px-3 py-1.5 text-center align-middle bg-blue-100 text-[13px] font-bold tabular-nums text-blue-950 whitespace-nowrap">{fmt(totalAmount)}</td>
                                <td className="px-3 py-1.5 text-center align-middle bg-blue-100 text-[13px] font-bold tabular-nums text-blue-950 whitespace-nowrap">{fmt(totalInvoiceAmount)}</td>
                                <td colSpan={4} className="bg-blue-100" />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            {rows.length > 0 && (
                <TablePagination
                    page={safePage}
                    totalPages={totalPages}
                    totalCount={rows.length}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    itemLabel="milestones"
                />
            )}
        </div>
    );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
    const { grad, text } = SUMMARY_TONES[tone];
    return (
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm px-3.5 py-3 flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm', grad)}>
                <Icon size={16} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">{label}</p>
                <p className={clsx('text-lg font-bold leading-tight truncate', text)}>{value}</p>
            </div>
        </div>
    );
}

export default function BillingAchievedReport() {
    const { filters, setFilters, resetFilters } = usePersistentFilters('billing-achieved-report', {
        client_company_id: '', product_id: '', our_company_id: '', vertical_id: '', bde_id: '', edc_status: 'all',
        quick_filter: '', quarter: '', from_date: '', to_date: '', status: '',
    });
    const set = (patch: Partial<typeof filters>) => setFilters(patch);

    const { data: companies = [] } = useQuery({ queryKey: ['masters', 'company'], queryFn: () => api.get('/masters/company').then(r => r.data) });
    // Product dropdown is scoped to the selected Our Company (product.company_id).
    const { data: products = [] } = useQuery({
        queryKey: ['masters', 'product', filters.our_company_id || 'all'],
        queryFn: () => api.get('/masters/product', { params: filters.our_company_id ? { company_id: filters.our_company_id } : undefined }).then(r => r.data),
    });
    const { data: verticals = [] } = useQuery({ queryKey: ['masters', 'vertical'], queryFn: () => api.get('/masters/vertical').then(r => r.data) });
    const { data: bdes = [] } = useQuery({ queryKey: ['billing-forecast-bdes'], queryFn: () => api.get('/billing-forecast/bdes').then(r => r.data) });
    const { data: clientCompanies = [] } = useQuery({ queryKey: ['billing-forecast-client-companies'], queryFn: () => api.get('/billing-forecast/client-companies').then(r => r.data) });

    const params = {
        client_company_id: filters.client_company_id || undefined,
        product_id: filters.product_id || undefined,
        our_company_id: filters.our_company_id || undefined,
        vertical_id: filters.vertical_id || undefined,
        bde_id: filters.bde_id || undefined,
        edc_status: normalizeEdcStatus(filters.edc_status) !== 'all' ? normalizeEdcStatus(filters.edc_status) : undefined,
        quick_filter: filters.quick_filter || undefined,
        quarter: filters.quarter || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
    };

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['billing-forecast-achieved', params],
        queryFn: () => api.get('/billing-forecast/achieved', { params }).then(r => r.data),
    });

    const summary = data?.summary || { billing_forecast: 0, billing_achieved: 0, billing_pending: 0, balance: 0, achievement_percent: 0 };
    const achievedRows: any[] = data?.achieved || data?.rows || [];
    const pendingRows: any[] = data?.pending || [];

    // Achieved and Pending milestones in one table, each row tagged with its
    // status; the Status filter narrows that single list client-side.
    const combinedRows = useMemo(() => {
        const all = [
            ...achievedRows.map(r => ({ ...r, _status: 'Achieved' })),
            ...pendingRows.map(r => ({ ...r, _status: 'Pending' })),
        ];
        if (filters.status === 'Achieved') return all.filter(r => r._status === 'Achieved');
        if (filters.status === 'Pending') return all.filter(r => r._status === 'Pending');
        return all;
    }, [achievedRows, pendingRows, filters.status]);
    const combinedTotal = combinedRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const combinedInvoiceTotal = combinedRows.reduce((s, r) => s + (r._status === 'Achieved' ? Number(r.amount || 0) : 0), 0);
    const activeFilterCount = Object.entries(filters)
        .filter(([k, v]) => k === 'edc_status' ? normalizeEdcStatus(v) !== 'all' : Boolean(v))
        .length;

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 lg:p-4 space-y-3">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={17} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">Billing Achieved Report</h1>
                        <p className="text-[11px] text-slate-400 leading-tight">All forecast milestones — Pending and Achieved in one list.</p>
                    </div>
                </div>
            </div>

            {/* ── Forecast vs Achieved summary ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <SummaryCard label="Billing Forecast" value={fmt(summary.billing_forecast)} icon={TrendingUp} tone="blue" />
                <SummaryCard label="Billing Achieved" value={fmt(summary.billing_achieved)} icon={CheckCircle2} tone="emerald" />
                <SummaryCard label="Billing Pending" value={fmt(summary.billing_pending)} icon={ClipboardList} tone="amber" />
                <SummaryCard label="Achievement %" value={`${summary.achievement_percent}%`} icon={Percent} tone="violet" />
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-1.5">
                {/* ── Period ── */}
                <ActivePill active={normalizeEdcStatus(filters.edc_status) !== 'all'}>
                    <EdcStatusSelect value={normalizeEdcStatus(filters.edc_status)} onChange={v => set({ edc_status: v })} />
                </ActivePill>
                <ActivePill active={!!filters.quick_filter || !!filters.quarter}>
                    <DurationSelect
                        quickFilter={filters.quick_filter}
                        quarter={filters.quarter}
                        onChange={({ quick_filter, quarter }) => set({ quick_filter, quarter })}
                    />
                </ActivePill>

                {/* ── Entity ── */}
                <div className="w-[150px]">
                    <SearchableSelect options={(clientCompanies as any[]).map(c => ({ value: String(c.id), label: c.name }))}
                        value={filters.client_company_id} onChange={v => set({ client_company_id: v })}
                        placeholder="All Companies" searchPlaceholder="Search company…" />
                </div>
                <div className="w-[150px]">
                    <SearchableSelect options={(companies as any[]).map(c => ({ value: String(c.id), label: c.name }))}
                        value={filters.our_company_id} onChange={v => set({ our_company_id: v, product_id: '' })}
                        placeholder="Our Company" searchPlaceholder="Search company…" />
                </div>
                <div className="w-[140px]">
                    <SearchableSelect options={(products as any[]).map(p => ({ value: String(p.id), label: p.name }))}
                        value={filters.product_id} onChange={v => set({ product_id: v })}
                        placeholder="All Products" searchPlaceholder="Search product…" />
                </div>
                <div className="w-[130px]">
                    <SearchableSelect options={(verticals as any[]).map(v => ({ value: String(v.id), label: v.name }))}
                        value={filters.vertical_id} onChange={v => set({ vertical_id: v })}
                        placeholder="All Verticals" searchPlaceholder="Search vertical…" />
                </div>
                <div className="w-[130px]">
                    <SearchableSelect options={(bdes as any[]).map(u => ({ value: String(u.id), label: u.name }))}
                        value={filters.bde_id} onChange={v => set({ bde_id: v })}
                        placeholder="All BDEs" searchPlaceholder="Search BDE…" />
                </div>

                {/* ── Status ── */}
                <div className="w-[130px]">
                    <SearchableSelect options={[{ value: 'Achieved', label: 'Achieved' }, { value: 'Pending', label: 'Pending' }]}
                        value={filters.status} onChange={v => set({ status: v })}
                        placeholder="All Status" searchPlaceholder="Search status…" />
                </div>

                {/* ── EDC date range ── */}
                <ActivePill active={!!filters.from_date || !!filters.to_date}>
                    <DateRangeFields label="EDC"
                        fromDate={filters.from_date} toDate={filters.to_date}
                        onFromChange={v => set({ from_date: v })} onToChange={v => set({ to_date: v })} />
                </ActivePill>
                <button onClick={() => resetFilters()} disabled={activeFilterCount === 0}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <RefreshCw size={12} /> Reset
                    {activeFilterCount > 0 && <span className="text-[10px] font-bold text-indigo-600">{activeFilterCount}</span>}
                </button>
            </div>

            {isLoading && <div className="py-14 text-center text-sm text-slate-400">Loading…</div>}

            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle size={16} /> <span className="flex-1">Failed to load the report.</span>
                    <button onClick={() => refetch()} className="text-xs font-semibold px-3 py-1 rounded-lg border border-rose-300 hover:bg-rose-100">Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <MilestoneTable rows={combinedRows} totalAmount={combinedTotal} totalInvoiceAmount={combinedInvoiceTotal} />
            )}
        </div>
    );
}
