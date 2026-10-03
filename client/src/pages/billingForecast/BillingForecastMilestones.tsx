import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Search, Building2, Package, Layers, UserCircle, ClipboardList, CheckSquare, Square, PlusCircle, ArrowRight, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { CollectionStatusBadge } from '../../components/StatusBadge';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { SearchableSelect } from '../../components/FilterDropdown';
import { EntityFilter, ActivePill, EdcStatusSelect, DurationSelect, DateRangeFields, normalizeEdcStatus } from '../../components/CashflowFilterFields';
import TablePagination from '../../components/TablePagination';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d: any) => (d ? dayjs(d).format('DD-MMM-YYYY') : '-');

export default function BillingForecastMilestones() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isManagement = user?.role === 'CEO' || !!user?.cashflow_management_access;
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<{ id: number; name: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const boxRef = useRef<HTMLDivElement>(null);

    // Same entity/status filter bar as the Cashflow Tracker, adapted to this
    // screen's data (Order Won milestones not yet added to the forecast).
    const { filters, setFilters, resetFilters } = usePersistentFilters('billing-forecast-milestones', {
        product_id: '', vertical_id: '', our_company_id: '', bde_id: '', edc_status: 'all',
        quick_filter: '', quarter: '', from_date: '', to_date: '',
    });
    const set = (patch: Partial<typeof filters>) => setFilters(patch);

    const { data: companiesMaster = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['masters', 'company'], queryFn: () => api.get('/masters/company').then(r => r.data), enabled: isManagement,
    });
    const { data: verticals = [] } = useQuery({ queryKey: ['masters', 'vertical'], queryFn: () => api.get('/masters/vertical').then(r => r.data) });
    const { data: bdes = [] } = useQuery({ queryKey: ['billing-forecast-milestone-bdes'], queryFn: () => api.get('/billing-forecast/milestone-bdes').then(r => r.data) });

    // "Our companies" the user actually has milestones under. For a regular BDE
    // the filter is only worth showing when there's more than one to choose
    // between — mapped to a single company, it's hidden and scoped automatically.
    // Management (CEO / cashflow management access) always gets the filter with
    // the full company master list.
    const { data: ourCompanies = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['billing-forecast-milestone-companies'],
        queryFn: () => api.get('/billing-forecast/milestone-companies').then(r => r.data),
        enabled: !isManagement,
    });
    const ourCompanyOptions = isManagement ? companiesMaster : ourCompanies;
    const showOurCompanyFilter = isManagement || ourCompanies.length > 1;
    const forcedOurCompanyId = !isManagement && ourCompanies.length === 1 ? String(ourCompanies[0].id) : '';
    const effectiveOurCompanyId = showOurCompanyFilter ? filters.our_company_id : forcedOurCompanyId;

    // Product dropdown is scoped to the selected Our Company (product.company_id) —
    // with no company chosen it lists every product.
    const { data: products = [] } = useQuery({
        queryKey: ['masters', 'product', effectiveOurCompanyId || 'all'],
        queryFn: () => api.get('/masters/product', { params: effectiveOurCompanyId ? { company_id: effectiveOurCompanyId } : undefined }).then(r => r.data),
    });

    const activeFilterCount = [
        !!filters.product_id, !!filters.vertical_id, showOurCompanyFilter && !!filters.our_company_id, !!filters.bde_id,
        normalizeEdcStatus(filters.edc_status) !== 'all',
        !!filters.quick_filter || !!filters.quarter, !!filters.from_date || !!filters.to_date,
    ].filter(Boolean).length;

    // Minimum 3 characters before searching, debounced so every keystroke
    // doesn't fire a request.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const { data: companies = [], isFetching: searching } = useQuery({
        queryKey: ['billing-forecast-companies', debouncedQuery],
        queryFn: () => api.get('/billing-forecast/companies', { params: { q: debouncedQuery } }).then(r => r.data),
        enabled: debouncedQuery.length >= 3,
    });

    // With no company picked, this loads every not-yet-added ("incomplete")
    // milestone in scope; picking a company narrows the same list down.
    const milestoneParams = {
        ...(selectedCompany ? { client_company_id: selectedCompany.id } : {}),
        product_id: filters.product_id || undefined,
        vertical_id: filters.vertical_id || undefined,
        our_company_id: effectiveOurCompanyId || undefined,
        bde_id: filters.bde_id || undefined,
        edc_status: normalizeEdcStatus(filters.edc_status) !== 'all' ? normalizeEdcStatus(filters.edc_status) : undefined,
        quick_filter: filters.quick_filter || undefined,
        quarter: filters.quarter || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
    };
    const { data: milestones = [], isLoading: loadingMilestones, refetch } = useQuery({
        queryKey: ['billing-forecast-milestones', selectedCompany?.id ?? 'all', milestoneParams],
        queryFn: () => api.get('/billing-forecast/milestones', { params: milestoneParams }).then(r => r.data),
    });

    // Reset to the first page whenever the result set changes (new filters,
    // company, or page size).
    useEffect(() => { setPage(1); }, [JSON.stringify(milestoneParams), pageSize]);

    const totalCount = (milestones as any[]).length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedMilestones = (milestones as any[]).slice((safePage - 1) * pageSize, safePage * pageSize);

    const pickCompany = (c: { id: number; name: string }) => {
        setSelectedCompany(c);
        setQuery(c.name);
        setShowDropdown(false);
        setSelectedIds([]);
    };

    const selectableIds: number[] = (milestones as any[]).filter(m => !m.already_added).map(m => m.milestone_id);
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id));

    const toggleOne = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleAll = () => {
        setSelectedIds(allSelected ? [] : selectableIds);
    };

    const addMutation = useMutation({
        mutationFn: () => api.post('/billing-forecast', { milestone_ids: selectedIds }).then(r => r.data),
        onSuccess: (resp) => {
            toast.success(resp.message || 'Added to Billing Forecast');
            setSelectedIds([]);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['billing-forecast-tracker'] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to add milestones to the Billing Forecast.');
        },
    });

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 lg:p-4 space-y-3">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                        <ClipboardList size={17} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">Billing Forecast Milestones Planning</h1>
                        <p className="text-[11px] text-slate-400 leading-tight">All pending milestones, or search a customer to narrow the list.</p>
                    </div>
                </div>
                <Link to="/billing-forecast/tracker" className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                    Go to Tracker <ArrowRight size={13} />
                </Link>
            </div>

            {/* ── Filters — company search on the same row as the entity/status bar ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="relative w-[240px] shrink-0" ref={boxRef}>
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setShowDropdown(true); if (selectedCompany && e.target.value !== selectedCompany.name) setSelectedCompany(null); }}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Company / Client — type 3+ chars…"
                            className="form-input pl-8"
                        />
                        {showDropdown && debouncedQuery.length >= 3 && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                                {searching ? (
                                    <p className="px-3 py-3 text-xs text-slate-400 text-center">Searching…</p>
                                ) : companies.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-slate-400 text-center">No matching companies.</p>
                                ) : (companies as any[]).map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => pickCompany(c)}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
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
                    {showOurCompanyFilter && (
                        <EntityFilter icon={Building2} active={!!filters.our_company_id}>
                            <SearchableSelect
                                options={ourCompanyOptions.map(c => ({ value: String(c.id), label: c.name }))}
                                value={filters.our_company_id} onChange={v => set({ our_company_id: v, product_id: '' })}
                                placeholder="Our Company" searchPlaceholder="Search company…"
                                className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                            />
                        </EntityFilter>
                    )}
                    <EntityFilter icon={Package} active={!!filters.product_id}>
                        <SearchableSelect
                            options={(products as any[]).map(p => ({ value: String(p.id), label: p.name }))}
                            value={filters.product_id} onChange={v => set({ product_id: v })}
                            placeholder="All Products" searchPlaceholder="Search product…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>
                    <EntityFilter icon={Layers} active={!!filters.vertical_id}>
                        <SearchableSelect
                            options={(verticals as any[]).map(v => ({ value: String(v.id), label: v.name }))}
                            value={filters.vertical_id} onChange={v => set({ vertical_id: v })}
                            placeholder="All Verticals" searchPlaceholder="Search vertical…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>
                    <EntityFilter icon={UserCircle} active={!!filters.bde_id}>
                        <SearchableSelect
                            options={(bdes as any[]).map(u => ({ value: String(u.id), label: u.name }))}
                            value={filters.bde_id} onChange={v => set({ bde_id: v })}
                            placeholder="All BDEs" searchPlaceholder="Search BDE…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[118px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>
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

            {/* ── Milestone list ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-slate-900">{selectedCompany ? selectedCompany.name : 'All Pending Milestones'}</span>
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {selectedIds.length} selected
                            </span>
                            <div className="flex items-center gap-1.5 ml-1">
                                <span className="text-[11px] text-slate-400">Rows:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                    className="form-select py-1 text-xs"
                                    style={{ width: 64 }}
                                >
                                    {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={() => addMutation.mutate()}
                            disabled={selectedIds.length === 0 || addMutation.isPending}
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-lg transition-colors"
                        >
                            <PlusCircle size={14} /> {addMutation.isPending ? 'Adding…' : 'Add to Billing Forecast'}
                        </button>
                    </div>

                    {loadingMilestones ? (
                        <div className="py-14 text-center text-sm text-slate-400">Loading milestones…</div>
                    ) : milestones.length === 0 ? (
                        <div className="py-14 text-center">
                            <ClipboardList size={24} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">
                                {selectedCompany ? 'No pending billing milestones found for this customer.' : 'No pending milestones — everything is added to the Billing Forecast.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[65vh]">
                            <table className="w-full min-w-[860px] text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border-b border-slate-200 [&>th]:bg-slate-100">
                                        <th className="px-4 py-2.5 text-left w-10">
                                            <button onClick={toggleAll} disabled={selectableIds.length === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-30">
                                                {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2.5 text-left">Client / Project</th>
                                        <th className="px-3 py-2.5 text-left">Vertical / Product</th>
                                        <th className="px-3 py-2.5 text-left">Milestone</th>
                                        <th className="px-3 py-2.5 text-right">Amount</th>
                                        <th className="px-3 py-2.5 text-left">EDC</th>
                                        <th className="px-3 py-2.5 text-left">Revised EDC</th>
                                        <th className="px-3 py-2.5 text-left">Collection Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedMilestones.map((m, idx) => (
                                        <tr
                                            key={m.milestone_id}
                                            className={clsx(
                                                'border-b border-slate-100 transition-colors',
                                                m.already_added ? 'bg-slate-50/70 text-slate-400' : idx % 2 === 1 ? 'bg-slate-50/40 hover:bg-slate-50' : 'hover:bg-slate-50'
                                            )}
                                        >
                                            <td className="px-4 py-2.5">
                                                <button
                                                    onClick={() => !m.already_added && toggleOne(m.milestone_id)}
                                                    disabled={m.already_added}
                                                    className={clsx('text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed', selectedIds.includes(m.milestone_id) && 'text-blue-600')}
                                                >
                                                    {selectedIds.includes(m.milestone_id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </button>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="font-semibold text-slate-700 truncate max-w-[220px]" title={m.project}>{m.project}</p>
                                                <p className="text-[11px] text-slate-400 truncate max-w-[220px]" title={m.client}>{m.client}</p>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="text-slate-700">{m.vertical}</p>
                                                <p className="text-[11px] text-slate-400">{m.product}</p>
                                            </td>
                                            <td className="px-3 py-2.5">{m.milestone}</td>
                                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                                                {fmt(m.amount)}
                                                {m.already_added && (
                                                    <span className="block text-[10px] font-semibold text-emerald-600 mt-0.5">Already Added</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(m.edc)}</td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(m.revised_edc)}</td>
                                            <td className="px-3 py-2.5">
                                                <CollectionStatusBadge status={m.collection_status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loadingMilestones && totalCount > 0 && (
                        <TablePagination
                            page={safePage}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            isLoading={loadingMilestones}
                            itemLabel="milestones"
                        />
                    )}
            </div>
        </div>
    );
}
