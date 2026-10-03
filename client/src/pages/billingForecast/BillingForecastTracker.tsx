import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
    Wallet, Building2, Package, UserCircle, Layers, RefreshCw,
    Pencil, X, Save, ClipboardList, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { SearchableSelect } from '../../components/FilterDropdown';
import { ActivePill, EdcStatusSelect, DurationSelect, DateRangeFields, normalizeEdcStatus } from '../../components/CashflowFilterFields';
import TablePagination from '../../components/TablePagination';
import DateOverlay from '../../components/DateOverlay';

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function StatusBadge({ status }: { status: string }) {
    return status === 'Achieved'
        ? <span className="badge badge-green">Achieved</span>
        : <span className="badge badge-amber">Pending</span>;
}

export default function BillingForecastTracker() {
    const queryClient = useQueryClient();
    const { filters, setFilters, resetFilters } = usePersistentFilters('billing-forecast-tracker', {
        client_company_id: '', product_id: '', our_company_id: '', vertical_id: '', bde_id: '',
        edc_status: 'all', quick_filter: '', quarter: '', from_date: '', to_date: '',
    });
    const [editing, setEditing] = useState<{ id: number; client: string; milestone: string } | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [edcCollection, setEdcCollection] = useState('');

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
        queryKey: ['billing-forecast-tracker', params],
        queryFn: () => api.get('/billing-forecast/tracker', { params }).then(r => r.data),
    });

    const rows: any[] = data?.rows || [];
    const total = data?.total_forecast_amount || 0;

    const activeFilterCount = Object.entries(filters)
        .filter(([k, v]) => k === 'edc_status' ? normalizeEdcStatus(v) !== 'all' : Boolean(v))
        .length;

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    useEffect(() => { setPage(1); }, [JSON.stringify(params), pageSize, rows.length]);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

    const openEdit = (r: any) => {
        setEditing({ id: r.billing_forecast_id, client: r.client, milestone: r.milestone });
        setInvoiceNumber(r.invoice_number || '');
        setInvoiceDate(r.invoice_date ? dayjs(r.invoice_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
        setEdcCollection(r.edc_payment_collection ? dayjs(r.edc_payment_collection).format('YYYY-MM-DD') : '');
    };

    const saveMutation = useMutation({
        mutationFn: () => api.put(`/billing-forecast/${editing!.id}/invoice`, {
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            edc_payment_collection: edcCollection,
        }).then(r => r.data),
        onSuccess: (resp) => {
            toast.success(resp.message || 'Invoice details saved.');
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['billing-forecast-tracker'] });
            queryClient.invalidateQueries({ queryKey: ['billing-forecast-achieved'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save invoice details.'),
    });

    const handleSave = () => {
        if (!invoiceNumber.trim()) return toast.error('Invoice Number is required.');
        if (!invoiceDate) return toast.error('Invoice Date is required.');
        if (!edcCollection) return toast.error('EDC for Payment Collection is required.');
        saveMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 lg:p-4 space-y-3">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                        <Wallet size={17} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">Billing Forecast Tracker</h1>
                        <p className="text-[11px] text-slate-400 leading-tight">Track forecasted milestones through to invoicing.</p>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
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
            </div>

            {isLoading && <div className="py-14 text-center text-sm text-slate-400">Loading…</div>}

            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle size={16} /> <span className="flex-1">Failed to load the tracker.</span>
                    <button onClick={() => refetch()} className="text-xs font-semibold px-3 py-1 rounded-lg border border-rose-300 hover:bg-rose-100">Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                        <span className="text-[12px] font-bold text-slate-900">{rows.length} milestone{rows.length === 1 ? '' : 's'}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Rows:</span>
                            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="form-select py-1 text-xs" style={{ width: 64 }}>
                                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-auto max-h-[65vh]">
                        <table className="w-full min-w-[1000px] text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="text-[11px] font-semibold uppercase tracking-wide text-white bg-blue-700">
                                    <th className="px-3 py-2.5 text-left">Client / Project</th>
                                    <th className="px-3 py-2.5 text-left">Vertical / Product</th>
                                    <th className="px-3 py-2.5 text-left">Milestone</th>
                                    <th className="px-3 py-2.5 text-right">Amount</th>
                                    <th className="px-3 py-2.5 text-center">Milestone EDC</th>
                                    <th className="px-3 py-2.5 text-center">Invoice EDC</th>
                                    <th className="px-3 py-2.5 text-center">Invoice Details</th>
                                    <th className="px-3 py-2.5 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={8} className="py-14 text-center text-sm text-slate-400">
                                        <ClipboardList size={22} className="text-slate-200 mx-auto mb-2" />
                                        No forecasted milestones for the selected filters.
                                    </td></tr>
                                ) : pagedRows.map((r, idx) => (
                                    <tr key={r.billing_forecast_id} className={clsx('border-b border-slate-100 hover:bg-slate-50 transition-colors', idx % 2 === 1 && 'bg-slate-50/40')}>
                                        <td className="px-3 py-2.5">
                                            <p className="font-semibold text-slate-700 truncate max-w-[200px]" title={r.project}>{r.project}</p>
                                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]" title={r.client}>{r.client}</p>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <p className="text-slate-700">{r.vertical}</p>
                                            <p className="text-[11px] text-slate-400">{r.product}</p>
                                        </td>
                                        <td className="px-3 py-2.5">{r.milestone}</td>
                                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">{fmt(r.amount)}</td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap text-[12px] text-slate-600">
                                            {r.edc ? dayjs(r.edc).format('DD-MMM-YY') : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap text-[12px] text-slate-600">
                                            {r.edc_payment_collection ? dayjs(r.edc_payment_collection).format('DD-MMM-YY') : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {r.status === 'Achieved' ? (
                                                <div className="text-[11px] text-slate-500">
                                                    <p className="font-semibold text-slate-700">{r.invoice_number}</p>
                                                    <p>{r.invoice_date ? dayjs(r.invoice_date).format('DD-MMM-YY') : '—'}</p>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openEdit(r)}
                                                    className="inline-flex items-center gap-1 text-[10.5px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-2.5 py-1 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={11} /> Edit
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center"><StatusBadge status={r.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            {rows.length > 0 && (
                                <tfoot className="sticky bottom-0">
                                    <tr className="bg-slate-900 text-white">
                                        <td colSpan={3} className="px-3 py-2.5 text-[12px] font-bold uppercase tracking-wide">Total Forecast Amount</td>
                                        <td className="px-3 py-2.5 text-right text-[13px] font-bold tabular-nums">{fmt(total)}</td>
                                        <td colSpan={4} />
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
            )}

            {/* ── Edit Invoice Details modal ── */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Invoice Details</h2>
                                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{editing.client} — {editing.milestone}</p>
                            </div>
                            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <div className="px-4 py-3.5 space-y-3">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Invoice Number</label>
                                <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="form-input" placeholder="INV-001" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Invoice Date</label>
                                <DateOverlay value={invoiceDate}>
                                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="form-input" />
                                </DateOverlay>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">EDC for Payment Collection</label>
                                <DateOverlay value={edcCollection}>
                                    <input type="date" value={edcCollection} onChange={e => setEdcCollection(e.target.value)} className="form-input" />
                                </DateOverlay>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100">
                            <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary inline-flex items-center gap-1.5">
                                <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
