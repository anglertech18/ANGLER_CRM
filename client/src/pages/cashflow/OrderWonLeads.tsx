import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    DollarSign, BarChart3, UserCircle, ChevronDown, RefreshCw,
    Search, Eye, Building2, MapPin, User, TrendingUp, Package,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const AVATAR_PALETTES = [
    'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
];
const avatarColor = (name: string) =>
    AVATAR_PALETTES[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTES.length];

function Skeleton() {
    return (
        <div className="animate-pulse space-y-3 p-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
        </div>
    );
}

export default function OrderWonLeads() {
    const { user: authUser } = useAuth();
    const { filters, setFilters } = usePersistentFilters('cashflow-orderwon', {
        sel_id: '', bde_id: '', search: '',
    });

    const [selectedProductId, setSelectedProductIdState] = useState<number | null>(
        filters.sel_id ? Number(filters.sel_id) || null : null
    );
    const [selectedBdeId, setSelectedBdeIdState] = useState<number | null>(
        filters.bde_id ? Number(filters.bde_id) : null
    );
    const [selectionKey, setSelectionKey] = useState(filters.sel_id || '');
    const [search, setSearch] = useState(filters.search || '');
    const bdeDefaultApplied = useRef<number | null>(null);

    const setSelectedProductId = (v: number | null) => { setSelectedProductIdState(v); };
    const setSelectedBdeId = (v: number | null) => {
        setSelectedBdeIdState(v);
        setFilters({ bde_id: v !== null ? String(v) : '' });
    };

    const handleSelectionChange = (val: string) => {
        if (!val) {
            setSelectedProductIdState(null);
            setSelectedBdeIdState(null);
            setSelectionKey('');
            setFilters({ sel_id: '', bde_id: '' });
            return;
        }
        bdeDefaultApplied.current = null;
        setSelectedProductIdState(Number(val));
        setSelectedBdeIdState(null);
        setSelectionKey(val);
        setFilters({ sel_id: val, bde_id: '' });
    };

    const { data: mappedItems = [] } = useQuery({
        queryKey: ['cf-mapped-products', authUser?.id],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/seal/poas/mapped-products`, { headers: authHeaders() });
            return res.data as { id: number | string; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (mappedItems.length > 0 && !selectedProductId) {
            const first = mappedItems[0];
            const id = Number(first.id);
            if (id) {
                setSelectedProductIdState(id);
                setSelectionKey(String(id));
                setFilters({ sel_id: String(id) });
            }
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data: bdes = [] } = useQuery({
        queryKey: ['cf-bdes', selectedProductId],
        enabled: !!selectedProductId,
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/lead-gen/bdes`, {
                headers: authHeaders(),
                params: { product_id: selectedProductId }
            });
            return res.data;
        },
    });

    useEffect(() => {
        if (bdes.length === 0 || !authUser?.id) return;
        if (bdeDefaultApplied.current === selectedProductId) return;
        bdeDefaultApplied.current = selectedProductId;
        if (selectedBdeId !== null) return;
        const match = bdes.find((b: any) => b.id === authUser.id);
        if (match) setSelectedBdeId(match.id);
    }, [bdes.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data: leadsData, isLoading, error, refetch } = useQuery({
        queryKey: ['cashflow-leads', selectedProductId, selectedBdeId, search],
        enabled: !!selectedProductId,
        queryFn: async () => {
            const params: any = { quadrant: 'Order Won', limit: 200 };
            if (selectedProductId) params.product_id = selectedProductId;
            if (selectedBdeId) params.ownerId = selectedBdeId;
            if (search.trim()) params.search = search.trim();
            const res = await axios.get(`${API_BASE}/leads`, { headers: authHeaders(), params });
            return res.data;
        },
    });

    const leads: any[] = leadsData?.data || leadsData?.leads || [];
    const hasSelection = !!selectedProductId;

    const [page, setPage] = useState(1);
    const pageSize = 20;
    useEffect(() => { setPage(1); }, [selectedProductId, selectedBdeId, search]);
    const totalCount = leads.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedLeads = leads.slice((safePage - 1) * pageSize, safePage * pageSize);

    const columns: TableColumn<any>[] = [
        {
            key: 'company', header: 'Company', render: lead => {
                const company = lead.company_name || lead.company_master?.name || '—';
                const location = [lead.city?.name, lead.state?.name].filter(Boolean).join(', ');
                return (
                    <div className="flex items-center gap-2.5">
                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0', avatarColor(company))}>
                            {company.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{company}</p>
                            {location && (
                                <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                    <MapPin size={9} />{location}
                                </p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'contact', header: 'Contact', render: lead => {
                const contactName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
                return (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <User size={12} className="text-slate-300 shrink-0" />
                        {contactName || '—'}
                    </div>
                );
            },
        },
        {
            key: 'product', header: 'Product', render: lead => (
                <span className="text-xs font-medium text-slate-600">
                    {lead.product?.name || lead.eitService?.name || lead.imService?.name || '—'}
                </span>
            ),
        },
        {
            key: 'owner', header: 'Owner', render: lead => {
                const ownerName = [lead.owner?.first_name, lead.owner?.last_name].filter(Boolean).join(' ');
                return ownerName ? (
                    <div className="flex items-center gap-1.5">
                        <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', avatarColor(ownerName))}>
                            {lead.owner?.first_name?.[0]}{lead.owner?.last_name?.[0]}
                        </div>
                        <span className="text-xs text-slate-600">{ownerName}</span>
                    </div>
                ) : <>—</>;
            },
        },
        {
            key: 'order_value', header: 'Order Value', align: 'right', render: lead => (
                lead.order_value ? (
                    <div className="flex items-center justify-end gap-1 text-emerald-700 font-semibold text-sm">
                        <TrendingUp size={12} />
                        ₹{Number(lead.order_value).toLocaleString('en-IN')}
                    </div>
                ) : <span className="text-slate-400 text-sm">—</span>
            ),
        },
        {
            key: 'won_date', header: 'Won Date', className: 'text-slate-500', render: lead => (
                lead.updated_at ? dayjs(lead.updated_at).format('DD/MM/YYYY') : '—'
            ),
        },
        {
            key: 'actions', header: 'Actions', align: 'center', render: lead => (
                <Link
                    to={`/cashflow/order-won/${lead.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Eye size={12} />
                    View / Edit
                </Link>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 p-6 space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <DollarSign size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Order Won Leads</h1>
                        <p className="text-xs text-slate-400 mt-0.5">Cash Flow — Manage won orders</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Product */}
                    <div className={clsx(
                        'flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all relative',
                        hasSelection ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/10'
                    )}>
                        <BarChart3 size={14} className="text-emerald-500 shrink-0" />
                        <select
                            className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[160px]"
                            value={selectionKey}
                            onChange={e => handleSelectionChange(e.target.value)}
                        >
                            <option value="">Select Product</option>
                            {mappedItems.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>

                    {/* BDE */}
                    <div className={clsx(
                        'flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-all relative',
                        !hasSelection ? 'bg-slate-50 border-slate-100 opacity-40 pointer-events-none' : 'bg-white border-slate-200'
                    )}>
                        <UserCircle size={14} className="text-emerald-500 shrink-0" />
                        <select
                            disabled={!hasSelection}
                            className="text-xs font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer max-w-[140px]"
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

                    {/* Search */}
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search company..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setFilters({ search: e.target.value }); }}
                            className="text-xs bg-transparent outline-none text-slate-700 w-32"
                        />
                    </div>

                    {hasSelection && (
                        <button
                            onClick={() => handleSelectionChange('')}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCw size={11} />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {!hasSelection && (
                <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-6">
                        <DollarSign size={36} className="text-white -rotate-6" />
                    </div>
                    <div className="text-center space-y-1.5">
                        <h2 className="text-lg font-bold text-slate-700">Select a Product</h2>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                            Choose a product to view Order Won leads.
                        </p>
                    </div>
                </div>
            )}

            {isLoading && <Skeleton />}

            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <span className="flex-1">Failed to load data.</span>
                    <button onClick={() => refetch()} className="text-xs px-3 py-1 rounded-lg border border-red-300 hover:bg-red-100 transition-colors">Retry</button>
                </div>
            )}

            {hasSelection && !isLoading && !error && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Order Won Leads ({leads.length})
                            </span>
                        </div>
                    </div>

                    {leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <Package size={20} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">No Order Won leads found</p>
                        </div>
                    ) : (
                        <>
                            <Table
                                columns={columns}
                                data={pagedLeads}
                                getRowKey={lead => lead.id}
                                className="min-w-[700px]"
                                maxHeight="max-h-[65vh]"
                            />
                            <TablePagination
                                page={safePage}
                                totalPages={totalPages}
                                totalCount={totalCount}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                itemLabel="leads"
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
