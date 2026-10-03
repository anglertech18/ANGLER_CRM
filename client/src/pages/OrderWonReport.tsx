import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    Trophy, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ArrowUpDown,
    Package, UserCircle, RefreshCw, Download, Search,
    CalendarDays, Building2, IndianRupee, HardDrive, Layers, Tag,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import DateOverlay from '../components/DateOverlay';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

function currentFiscalYearStart() {
    const now = dayjs();
    return now.month() + 1 < 4 ? now.year() - 1 : now.year();
}

function formatCurrency(v: number) {
    if (!v) return '₹0';
    return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

type ReportRow = {
    lead_id: number;
    company_name: string;
    product_company_id: number | null;
    product_company_name: string;
    product_name: string;
    account_manager: string;
    sbu: string;
    source: string;
    devices: number;
    order_value: number;
    order_won_at: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function SortTh({
    label, sortKey, align = 'left', sortConfig, onSort,
}: {
    label: string; sortKey: string; align?: 'left' | 'right' | 'center';
    sortConfig: { key: string; dir: 'asc' | 'desc' } | null; onSort: (key: string) => void;
}) {
    const active = sortConfig?.key === sortKey;
    return (
        <th
            className={clsx(
                'px-3 py-3 cursor-pointer select-none hover:bg-emerald-800/60 transition-colors sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-teal-700',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
            )}
            onClick={() => onSort(sortKey)}
        >
            <span className={clsx('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse', align === 'center' && 'justify-center')}>
                {label}
                {active ? (
                    sortConfig!.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                )}
            </span>
        </th>
    );
}

const SUMMARY_CARDS = [
    { key: 'totalOrders', label: 'Total Orders Won', icon: Trophy, from: 'from-amber-500', to: 'to-orange-600', format: (v: number) => String(v) },
    { key: 'totalOrderValue', label: 'Total Order Value', icon: IndianRupee, from: 'from-rose-500', to: 'to-pink-600', format: formatCurrency },
    { key: 'totalDeviceCount', label: 'Total Device Count', icon: HardDrive, from: 'from-violet-500', to: 'to-purple-600', format: (v: number) => String(v) },
    // { key: 'averageOrderValue', label: 'Average Order Value', icon: Layers, from: 'from-sky-500', to: 'to-blue-600', format: formatCurrency },
] as const;

export default function OrderWonReport() {
    const { user: authUser } = useAuth();
    const { filters, setFilters } = usePersistentFilters('order-won-report', {
        company_id: '', product_id: '', bde_id: '', sbu_id: '', source_id: '',
        fiscal_year: String(currentFiscalYearStart()), month: '', from_date: '', to_date: '',
    });

    const [companyId, setCompanyIdState] = useState(filters.company_id || '');
    const [productId, setProductIdState] = useState(filters.product_id || '');
    const [bdeId, setBdeIdState] = useState(filters.bde_id || '');
    const [sbuId, setSbuIdState] = useState(filters.sbu_id || '');
    const [sourceId, setSourceIdState] = useState(filters.source_id || '');
    const [fiscalYear, setFiscalYearState] = useState(filters.fiscal_year || String(currentFiscalYearStart()));
    const [month, setMonthState] = useState(filters.month || '');
    const [fromDate, setFromDateState] = useState(filters.from_date || '');
    const [toDate, setToDateState] = useState(filters.to_date || '');

    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
    const [groupPages, setGroupPages] = useState<Record<string, number>>({});
    const [pageSize, setPageSize] = useState(25);

    const syncFilters = (patch: Partial<typeof filters>) =>
        setFilters({
            ...filters, company_id: companyId, product_id: productId, bde_id: bdeId,
            sbu_id: sbuId, source_id: sourceId, fiscal_year: fiscalYear, month, from_date: fromDate, to_date: toDate,
            ...patch,
        });

    const setCompanyId = (v: string) => { setCompanyIdState(v); setProductIdState(''); syncFilters({ company_id: v, product_id: '' }); };
    const setProductId = (v: string) => { setProductIdState(v); syncFilters({ product_id: v }); };
    const setBdeId = (v: string) => { setBdeIdState(v); syncFilters({ bde_id: v }); };
    const setSbuId = (v: string) => { setSbuIdState(v); syncFilters({ sbu_id: v }); };
    const setSourceId = (v: string) => { setSourceIdState(v); syncFilters({ source_id: v }); };
    const setFiscalYear = (v: string) => { setFiscalYearState(v); syncFilters({ fiscal_year: v, month: '', from_date: '', to_date: '' }); setMonthState(''); setFromDateState(''); setToDateState(''); };
    const handleMonthChange = (v: string) => { setMonthState(v); syncFilters({ month: v, from_date: '', to_date: '' }); setFromDateState(''); setToDateState(''); };
    const handleFromDateChange = (v: string) => { setFromDateState(v); syncFilters({ from_date: v, month: '' }); setMonthState(''); };
    const handleToDateChange = (v: string) => { setToDateState(v); syncFilters({ to_date: v, month: '' }); setMonthState(''); };

    const { data: companies = [] } = useQuery({
        queryKey: ['owr-companies'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/masters/company`, { headers: authHeaders() });
            return (res.data as any[]).filter((c: any) => c.is_active !== false);
        },
        staleTime: 10 * 60 * 1000,
    });

    const { data: products = [] } = useQuery({
        queryKey: ['owr-products', companyId],
        queryFn: async () => {
            const params: any = {};
            if (companyId) params.company_id = companyId;
            const res = await axios.get(`${API_BASE}/masters/product`, { headers: authHeaders(), params });
            return res.data as { id: number | string; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: bdes = [] } = useQuery({
        queryKey: ['owr-bdes'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/lead-gen/bdes`, { headers: authHeaders() });
            return res.data as any[];
        },
    });

    const { data: sbus = [] } = useQuery({
        queryKey: ['owr-sbus'],
        queryFn: async () => (await axios.get(`${API_BASE}/masters/sbu`, { headers: authHeaders() })).data,
        staleTime: 10 * 60 * 1000,
    });

    const { data: sources = [] } = useQuery({
        queryKey: ['owr-sources'],
        queryFn: async () => (await axios.get(`${API_BASE}/masters/leadsource`, { headers: authHeaders() })).data,
        staleTime: 10 * 60 * 1000,
    });

    const { data: report, isLoading, error, refetch } = useQuery({
        queryKey: ['order-won-report', companyId, productId, bdeId, sbuId, sourceId, fiscalYear, month, fromDate, toDate],
        queryFn: async () => {
            const params: any = {};
            if (fromDate || toDate) {
                if (fromDate) params.from_date = fromDate;
                if (toDate) params.to_date = toDate;
            } else if (month) {
                params.month = month;
            } else {
                params.fiscal_year = fiscalYear;
            }
            if (companyId) params.company_id = companyId;
            if (productId) params.product_id = productId;
            if (bdeId) params.bde_id = bdeId;
            if (sbuId) params.sbu_id = sbuId;
            if (sourceId) params.source_id = sourceId;
            const res = await axios.get(`${API_BASE}/order-won-report`, { headers: authHeaders(), params });
            return res.data;
        },
    });

    const rows: ReportRow[] = report?.rows || [];
    const summary = report?.summary || { totalOrders: 0, totalOrderValue: 0, totalDeviceCount: 0, averageOrderValue: 0 };

    const fyOptions = (() => {
        const cur = currentFiscalYearStart();
        const out: { value: number; label: string }[] = [];
        for (let y = cur + 1; y >= cur - 3; y--) out.push({ value: y, label: `${y}-${String(y + 1).slice(2)}` });
        return out;
    })();

    const handleReset = () => {
        setCompanyIdState(''); setProductIdState(''); setBdeIdState('');
        setSbuIdState(''); setSourceIdState(''); setMonthState('');
        setFromDateState(''); setToDateState(''); setSearch('');
        const fy = String(currentFiscalYearStart());
        setFiscalYearState(fy);
        setFilters({ company_id: '', product_id: '', bde_id: '', sbu_id: '', source_id: '', fiscal_year: fy, month: '', from_date: '', to_date: '' });
    };

    const searchedRows = useMemo(() => {
        if (!search.trim()) return rows;
        const q = search.trim().toLowerCase();
        return rows.filter(r =>
            r.company_name.toLowerCase().includes(q) ||
            r.product_company_name.toLowerCase().includes(q) ||
            r.product_name.toLowerCase().includes(q) ||
            r.account_manager.toLowerCase().includes(q) ||
            r.sbu.toLowerCase().includes(q) ||
            r.source.toLowerCase().includes(q)
        );
    }, [rows, search]);

    const SORT_ACCESSORS: Record<string, (r: ReportRow) => any> = {
        company_name: r => r.company_name.toLowerCase(),
        product_name: r => r.product_name.toLowerCase(),
        account_manager: r => r.account_manager.toLowerCase(),
        sbu: r => r.sbu.toLowerCase(),
        source: r => r.source.toLowerCase(),
        devices: r => r.devices,
        order_value: r => r.order_value,
        order_won_at: r => (r.order_won_at ? new Date(r.order_won_at).getTime() : 0),
    };

    const sortedRows = useMemo(() => {
        if (!sortConfig) return searchedRows;
        const accessor = SORT_ACCESSORS[sortConfig.key];
        if (!accessor) return searchedRows;
        const dir = sortConfig.dir === 'asc' ? 1 : -1;
        return [...searchedRows].sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [searchedRows, sortConfig]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSort = (key: string) => {
        setSortConfig(prev => (prev && prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    };

    type CompanyGroup = { key: string; companyName: string; rows: ReportRow[]; totalValue: number; totalDevices: number };

    const groupedRows = useMemo(() => {
        const map = new Map<string, CompanyGroup>();
        for (const r of sortedRows) {
            const key = r.product_company_name || 'Unassigned';
            if (!map.has(key)) map.set(key, { key, companyName: key, rows: [], totalValue: 0, totalDevices: 0 });
            const grp = map.get(key)!;
            grp.rows.push(r);
            grp.totalValue += r.order_value;
            grp.totalDevices += r.devices;
        }
        return Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
    }, [sortedRows]);

    const getGroupPage = (key: string) => groupPages[key] || 1;
    const setGroupPage = (key: string, p: number) => setGroupPages(prev => ({ ...prev, [key]: p }));

    useEffect(() => { setGroupPages({}); }, [rows, sortConfig, search, pageSize]);

    const exportExcel = () => {
        const flat = sortedRows.map(r => ({
            'Product Company': r.product_company_name,
            'Company Name': r.company_name,
            'Product': r.product_name,
            'Account Manager': r.account_manager,
            'SBU': r.sbu,
            'Lead Source': r.source,
            'Device Count': r.devices,
            'Order Value': r.order_value,
            'Order Won Date': r.order_won_at ? dayjs(r.order_won_at).format('DD-MMM-YYYY') : '',
        }));
        const ws = XLSX.utils.json_to_sheet(flat);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Order Won Report');
        XLSX.writeFile(wb, `OrderWonReport_${month || report?.fiscalYear || fiscalYear}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50/70 p-5 lg:p-6 space-y-5 print:p-4 print:space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-5 py-4 print:shadow-none print:border-slate-300">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 print:hidden">
                            <Trophy size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 leading-tight">Order Won Report</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {fromDate || toDate
                                    ? `Custom Range — ${fromDate ? dayjs(fromDate).format('DD-MMM-YYYY') : 'Start'} to ${toDate ? dayjs(toDate).format('DD-MMM-YYYY') : 'Today'}`
                                    : month
                                        ? dayjs(`${month}-01`).format('MMMM YYYY')
                                        : `FY ${report?.fiscalYear || `${fiscalYear}-${String(Number(fiscalYear) + 1).slice(2)}`}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter card */}
                <div className="flex flex-wrap items-center gap-2 mt-4 print:hidden">
                    <div className={clsx('flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white relative', (month || fromDate || toDate) && 'opacity-50')}>
                        <CalendarDays size={14} className="text-emerald-600 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer"
                            value={fiscalYear}
                            onChange={e => setFiscalYear(e.target.value)}
                            disabled={!!(month || fromDate || toDate)}
                        >
                            {fyOptions.map(fy => (
                                <option key={fy.value} value={String(fy.value)}>{fy.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    <div className={clsx('flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white', (fromDate || toDate) && 'opacity-50')}>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Month</span>
                        <input
                            type="month"
                            value={month}
                            onChange={e => handleMonthChange(e.target.value)}
                            disabled={!!(fromDate || toDate)}
                            className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
                        />
                    </div>

                    <div className={clsx('flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white', month && 'opacity-50')}>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">From</span>
                        <DateOverlay value={fromDate} textClassName="pl-0 text-xs font-medium text-slate-700">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={e => handleFromDateChange(e.target.value)}
                                disabled={!!month}
                                className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
                            />
                        </DateOverlay>
                    </div>
                    <div className={clsx('flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white', month && 'opacity-50')}>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">To</span>
                        <DateOverlay value={toDate} textClassName="pl-0 text-xs font-medium text-slate-700">
                            <input
                                type="date"
                                value={toDate}
                                onChange={e => handleToDateChange(e.target.value)}
                                disabled={!!month}
                                className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
                            />
                        </DateOverlay>
                    </div>

                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white relative">
                        <Building2 size={14} className="text-emerald-600 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[150px]"
                            value={companyId}
                            onChange={e => setCompanyId(e.target.value)}
                        >
                            <option value="">All Companies</option>
                            {(companies as any[]).map((c: any) => (
                                <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white relative">
                        <Package size={14} className="text-emerald-600 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[140px]"
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                        >
                            <option value="">All Products</option>
                            {(products as any[]).map((p: any) => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white relative">
                        <Tag size={14} className="text-emerald-600 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[120px]"
                            value={sbuId}
                            onChange={e => setSbuId(e.target.value)}
                        >
                            <option value="">All SBU</option>
                            {(sbus as any[]).map((s: any) => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white relative">
                        <Tag size={14} className="text-emerald-600 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[130px]"
                            value={sourceId}
                            onChange={e => setSourceId(e.target.value)}
                        >
                            <option value="">All Lead Sources</option>
                            {(sources as any[]).map((s: any) => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    {authUser?.role !== 'SalesPerson' && (
                        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white relative">
                            <UserCircle size={14} className="text-emerald-600 shrink-0" />
                            <select
                                className="text-xs font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[140px]"
                                value={bdeId}
                                onChange={e => setBdeId(e.target.value)}
                            >
                                <option value="">All Account Managers</option>
                                {(bdes as any[]).map((u: any) => (
                                    <option key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                        </div>
                    )}

                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl transition-colors"
                    >
                        <Search size={13} /> Search
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={12} /> Reset
                    </button>

                    {rows.length > 0 && (
                        <button
                            onClick={exportExcel}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors"
                        >
                            <Download size={13} /> Export to Excel
                        </button>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            {!isLoading && !error && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
                    {SUMMARY_CARDS.map(card => {
                        const Icon = card.icon;
                        const value = (summary as any)[card.key] ?? 0;
                        return (
                            <div key={card.key} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-3.5 flex items-center gap-3">
                                <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 print:hidden', card.from, card.to)}>
                                    <Icon size={18} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-400 truncate">{card.label}</p>
                                    <p className="text-base font-bold text-slate-800 truncate">{card.format(value)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isLoading && (
                <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-[68px] bg-white rounded-2xl border border-slate-100" />
                        ))}
                    </div>
                    <div className="h-96 bg-white rounded-2xl border border-slate-100" />
                </div>
            )}

            {!isLoading && error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <span className="flex-1">Failed to load report data.</span>
                    <button onClick={() => refetch()} className="text-xs px-3 py-1 rounded-lg border border-red-300 hover:bg-red-100 transition-colors">Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 print:hidden">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Orders</span>
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {sortedRows.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white">
                                <Search size={13} className="text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search company, product, manager..."
                                    className="text-xs text-slate-700 bg-transparent outline-none w-52"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                                <span className="text-[11px] text-slate-500 font-medium">Show</span>
                                <select
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                    className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                                >
                                    {PAGE_SIZE_OPTIONS.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {sortedRows.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm py-16 flex flex-col items-center justify-center text-center gap-2">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Trophy size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-500">No Order Won Records Found</p>
                            <p className="text-xs text-slate-400">Try changing the filters.</p>
                        </div>
                    ) : (
                        groupedRows.map(group => {
                            const groupPage = getGroupPage(group.key);
                            const groupTotalPages = Math.max(1, Math.ceil(group.rows.length / pageSize));
                            const pagedGroupRows = group.rows.slice((groupPage - 1) * pageSize, groupPage * pageSize);
                            return (
                                <div key={group.key} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50/60">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={15} className="text-emerald-600" />
                                            <span className="text-sm font-bold text-slate-800">{group.companyName}</span>
                                            <span className="text-[11px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                                {group.rows.length} Orders
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-700 tabular-nums">{formatCurrency(group.totalValue)}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="text-[11px] font-bold uppercase tracking-wider text-white">
                                                    <SortTh label="Company Name" sortKey="company_name" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="Product" sortKey="product_name" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="Account Manager" sortKey="account_manager" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="SBU" sortKey="sbu" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="Lead Source" sortKey="source" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="Device Count" sortKey="devices" align="right" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="Order Value" sortKey="order_value" align="right" sortConfig={sortConfig} onSort={handleSort} />
                                                    <SortTh label="Order Won Date" sortKey="order_won_at" sortConfig={sortConfig} onSort={handleSort} />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {pagedGroupRows.map((r, idx) => (
                                                    <tr key={r.lead_id} className={clsx('transition-colors hover:bg-emerald-50/60', idx % 2 === 1 && 'bg-slate-50/40')}>
                                                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-700">{r.company_name}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.product_name}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.account_manager}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.sbu}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.source}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 text-right tabular-nums">{r.devices || '—'}</td>
                                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-800 text-right tabular-nums">{formatCurrency(r.order_value)}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.order_won_at ? dayjs(r.order_won_at).format('DD/MM/YYYY') : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                                                    <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                                        Showing {group.rows.length} Orders
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-xs text-slate-500">Total</td>
                                                    <td className="px-3 py-3 text-right text-sm font-bold text-emerald-700 tabular-nums">{formatCurrency(group.totalValue)}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {group.rows.length > 0 && groupTotalPages > 1 && (
                                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 print:hidden">
                                            <p className="text-xs text-slate-500">
                                                Showing {(groupPage - 1) * pageSize + 1}–{Math.min(groupPage * pageSize, group.rows.length)} of {group.rows.length} orders
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setGroupPage(group.key, Math.max(1, groupPage - 1))}
                                                    disabled={groupPage === 1}
                                                    className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="text-xs font-semibold text-slate-600 px-2">Page {groupPage} of {groupTotalPages}</span>
                                                <button
                                                    onClick={() => setGroupPage(group.key, Math.min(groupTotalPages, groupPage + 1))}
                                                    disabled={groupPage >= groupTotalPages}
                                                    className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
