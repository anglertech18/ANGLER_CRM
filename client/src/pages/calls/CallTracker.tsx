import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { useAuth } from '../../context/AuthContext';
import {
    Search, Plus, Linkedin, MapPin, ExternalLink, Eye,
    User, Phone, RefreshCw, Trash2, ChevronDown,
    Calendar, Mail, Pencil, MoreVertical
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

/* ── Inline multi-select for filter bar ── */
interface MSOption { value: string; label: string; }
const FilterMultiSelect = ({ options, values, onChange, placeholder, className }: {
    options: MSOption[]; values: string[]; onChange: (vals: string[]) => void;
    placeholder: string; className?: string;
}) => {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

    const openDrop = () => {
        if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 4, left: r.left, width: r.width });
        }
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggle = (val: string) => {
        const next = values.includes(val) ? values.filter(v => v !== val) : [...values, val];
        onChange(next);
    };

    const labels = values.map(v => options.find(o => o.value === v)?.label).filter(Boolean);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={openDrop}
                className={clsx('form-select py-2 text-left flex items-center gap-1 cursor-pointer', className)}
            >
                <span className="truncate text-sm flex-1 text-left">
                    {values.length === 0
                        ? <span className="text-slate-400">{placeholder}</span>
                        : values.length <= 2 ? labels.join(', ')
                        : `${values.length} selected`}
                </span>
                <ChevronDown size={11} className="text-slate-400 shrink-0" />
            </button>
            {open && createPortal(
                <div
                    style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 160), zIndex: 99999 }}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-auto max-h-52"
                    onMouseDown={e => e.stopPropagation()}
                >
                    {options.map(opt => (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                        >
                            <input
                                type="checkbox"
                                checked={values.includes(opt.value)}
                                onChange={() => toggle(opt.value)}
                                className="rounded border-slate-300 text-primary-600"
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

/* ── Row action kebab menu ── */
const ActionMenu = ({ call, onDelete, navigate }: { call: any; onDelete: (id: number) => void; navigate: (path: string) => void }) => {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const openMenu = () => {
        if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 4, left: r.right - 160 });
        }
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
        <button
            key={label}
            type="button"
            onClick={() => { setOpen(false); onClick(); }}
            className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left',
                danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'
            )}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={openMenu}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Actions"
            >
                <MoreVertical size={15} />
            </button>
            {open && createPortal(
                <div
                    style={{ position: 'fixed', top: pos.top, left: pos.left, width: 160, zIndex: 99999 }}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1"
                    onMouseDown={e => e.stopPropagation()}
                >
                    {item(<Eye size={14} />, 'View', () => navigate(`/calls/${call.id}/view`))}
                    {item(<Pencil size={14} />, 'Edit', () => navigate(`/calls/${call.id}/edit`))}
                    {item(<RefreshCw size={14} />, 'Follow Up', () => navigate(`/calls/${call.id}/update`))}
                    {!call.is_converted && (
                        <div className="border-t border-slate-100 mt-1 pt-1">
                            {item(<Trash2 size={14} />, 'Delete', () => onDelete(call.id), true)}
                        </div>
                    )}
                    {call.is_converted && (
                        <div className="px-3 py-2 flex items-center gap-2 text-xs text-emerald-600 font-medium border-t border-slate-100 mt-1">
                            <ExternalLink size={12} /> In Pipeline
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
};

/* ── Call status badge colour ── */
const callStatusClass = (name: string) => {
    switch (name) {
        case 'Converted to Lead': return 'badge-green';
        case 'Connected':         return 'badge-blue';
        case 'Interested':        return 'badge-purple';
        default:                  return 'badge-gray';
    }
};

/* ════════════════════════════════════════════════════════════ */
export default function CallTracker() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { filters, setFilters, resetFilters } = usePersistentFilters('calltracker', {
        dateFrom: '',
        dateTo: '',
        productId: '',
        industryId: '',
        callStatusId: '',
        salespersonId: '',
        nextFollowUpDate: '',
        company_name: '',
        page: 1,
        pageSize: 10,
    });

    const currentPage = (filters.page as number) || 1;
    const pageSize = (filters.pageSize as number) || 10;

    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/call-tracker/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['call-tracker'] });
            setDeleteConfirmId(null);
        },
        onError: (err: any) => {
            alert(err?.response?.data?.message || 'Failed to delete call');
            setDeleteConfirmId(null);
        }
    });

    /* ── Current user ── */
    const { data: currentUser } = useQuery<any>({
        queryKey: ['current-user'],
        queryFn: () => api.get('/auth/me').then(res => res.data),
        staleTime: Infinity
    });
    const userRole: string = currentUser?.role ?? '';

    /* ── Accessible users for owner filter ── */
    const { data: accessibleUsers } = useQuery<any[]>({
        queryKey: ['accessible-users'],
        queryFn: () => api.get('/users').then(res => res.data),
        enabled: userRole === 'CEO' || userRole === 'SalesManager',
        staleTime: 5 * 60 * 1000
    });

    const ownerOptions = useMemo<any[]>(() => {
        if (!currentUser) return [];
        const me = currentUser;
        if (userRole === 'CEO') {
            const others = (accessibleUsers ?? []).filter((u: any) =>
                (u.role === 'SalesManager' || u.role === 'SalesPerson') && u.id !== me.id
            );
            return [me, ...others];
        }
        if (userRole === 'SalesManager') {
            const subordinates = (accessibleUsers ?? []).filter((u: any) =>
                u.role === 'SalesPerson' && u.reporting_manager_id === me.id
            );
            return [me, ...subordinates];
        }
        return [];
    }, [accessibleUsers, userRole, currentUser]);

    /* ── Masters ── */
    const { data: products }     = useQuery({ queryKey: ['masters', 'product'],     queryFn: () => api.get('/masters/product').then(r => r.data) });
    const { data: industries }   = useQuery({ queryKey: ['masters', 'industry'],    queryFn: () => api.get('/masters/industry').then(r => r.data) });
    const { data: callStatuses } = useQuery({ queryKey: ['masters', 'callstatus'],  queryFn: () => api.get('/masters/callstatus').then(r => r.data) });

    /* ── Call data (paginated) ── */
    const { data: callsData, isLoading } = useQuery({
        queryKey: ['call-tracker', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => {
                if (k === 'salespersonId' || k === 'page' || k === 'pageSize') return;
                if (v) params.append(k, String(v));
            });
            const spIds = String(filters.salespersonId).split(',').filter(Boolean);
            if (spIds.includes('all')) {
                // no salespersonId param → backend returns full RBAC scope
            } else if (spIds.length > 0) {
                spIds.forEach(id => params.append('salespersonId', id));
            } else {
                params.append('salespersonId', String(user!.id));
            }
            params.append('page', String(currentPage));
            params.append('pageSize', String(pageSize));
            const res = await api.get(`/call-tracker?${params.toString()}`);
            return res.data as { data: any[]; total: number; page: number; pageSize: number; totalPages: number };
        },
        enabled: !!user,
        placeholderData: (prev) => prev
    });

    const calls = callsData?.data ?? [];
    const total = callsData?.total ?? 0;
    const totalPages = callsData?.totalPages ?? 1;

    const handleFilterChange = (field: string, value: string) => {
        setFilters({ [field]: value, page: 1 } as any);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        setFilters({ page: newPage } as any);
    };

    const handlePageSizeChange = (newSize: number) => {
        setFilters({ pageSize: newSize, page: 1 } as any);
    };

    const handleReset = () => resetFilters();

    const showOwnerFilter = userRole === 'CEO' || userRole === 'SalesManager';


    const startRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, total);

    const callColumns: TableColumn<any>[] = [
        { key: 'sno', header: 'S.No', render: (_c, idx) => <span className="text-gray-400 text-xs">{startRecord + idx}</span> },
        {
            key: 'date', header: 'Enquiry Date', render: call => (
                <span className="font-medium text-gray-900 text-xs">{dayjs(call.date).format('DD/MM/YYYY')}</span>
            ),
        },
        {
            key: 'created_at', header: 'Created', render: call => (
                <>
                    <span className="text-xs text-gray-400 block">{dayjs(call.created_at).format('DD/MM/YYYY')}</span>
                    <span className="flex items-center gap-1 text-gray-600 mt-0.5">
                        <User size={11} className="text-gray-400 shrink-0" />
                        <span className="text-xs truncate max-w-[80px]">
                            {call.user ? `${call.user.first_name} ${call.user.last_name || ''}`.trim() : '—'}
                        </span>
                    </span>
                </>
            ),
        },
        {
            key: 'company', header: 'Company / Contact Person', width: 'min-w-[180px]', className: 'whitespace-normal', render: call => (
                <div className="space-y-1 overflow-hidden">
                    {call.product?.name && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                            {call.product.name}
                        </span>
                    )}
                    <p className="font-bold text-gray-900 text-sm leading-snug truncate" title={call.company_name}>
                        {call.company_name || '—'}
                    </p>
                    {call.location && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin size={9} className="shrink-0" />
                            <span className="truncate">{call.location}</span>
                        </span>
                    )}
                    {(call.contact_person_name || call.designation) && (
                        <div className="pt-1 border-t border-gray-100">
                            {call.contact_person_name && <p className="text-xs font-medium text-gray-700 truncate">{call.contact_person_name}</p>}
                            {call.designation && <p className="text-[11px] text-gray-400 truncate">{call.designation}</p>}
                        </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                        {call.email_address && (
                            <a href={`mailto:${call.email_address}`} className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline truncate">
                                <Mail size={9} className="shrink-0" />
                                <span className="truncate">{call.email_address}</span>
                            </a>
                        )}
                        {call.mobile_no && (
                            <a href={`tel:${call.mobile_no}`} className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                                <Phone size={9} className="shrink-0" />
                                {call.mobile_no}
                            </a>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'industry', header: 'Industry', className: 'whitespace-normal', render: call => (
                <span className="text-xs text-gray-600 leading-snug line-clamp-2" title={call.industry?.name || '—'}>
                    {call.industry?.name || '—'}
                </span>
            ),
        },
        {
            key: 'source_of_db', header: 'Source DB', render: call => (
                <span className="text-xs text-gray-600 truncate block max-w-[80px]" title={call.source_of_db?.name || '—'}>
                    {call.source_of_db?.name || '—'}
                </span>
            ),
        },
        {
            key: 'business_potential', header: 'Business Potential', align: 'center', render: call => (
                call.business_potential
                    ? <span className="badge badge-amber">{call.business_potential}</span>
                    : <span className="text-gray-300 text-xs">—</span>
            ),
        },
        {
            key: 'status', header: 'Email / LinkedIn / Call Status', width: 'min-w-[140px]', className: 'whitespace-normal', render: call => (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 w-11">Email</span>
                        <span className="text-xs text-gray-600 truncate">{call.email_status?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 w-11">LinkedIn</span>
                        {call.linkedin_sent ? <Linkedin size={13} className="text-[#0A66C2]" /> : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 w-11">Status</span>
                        {call.call_status?.name
                            ? <span className={`badge ${callStatusClass(call.call_status.name)}`} style={{ fontSize: 10 }}>{call.call_status.name}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                </div>
            ),
        },
        {
            key: 'remarks', header: 'Remarks / Next Follow-up', width: 'min-w-[160px]', className: 'whitespace-normal', render: call => (
                <div className="space-y-1.5 overflow-hidden">
                    {call.remarks ? (
                        <p className="text-xs text-gray-600 line-clamp-2 cursor-default" title={call.remarks}>{call.remarks}</p>
                    ) : (
                        <span className="text-gray-300 text-xs">—</span>
                    )}
                    {call.next_follow_up_date && (
                        <div className="flex items-center gap-1">
                            <Calendar size={10} className="text-amber-500 shrink-0" />
                            <span className="text-[11px] font-semibold text-amber-600">
                                {dayjs(call.next_follow_up_date).format('DD/MM/YYYY')}
                            </span>
                        </div>
                    )}
                    {call.pipeline_action && (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>Move to {call.pipeline_action}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions', header: 'Actions', render: call => (
                <ActionMenu call={call} onDelete={setDeleteConfirmId} navigate={navigate} />
            ),
        },
    ];

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Call Tracker</h1>
                    <p className="text-sm text-gray-500">Track outbound/inbound sales calls and prospect engagement</p>
                </div>
                <button
                    onClick={() => navigate('/calls/new')}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors shadow-sm font-bold"
                >
                    <Plus size={18} /><span>Add Call Entry</span>
                </button>
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
                    {/* Company search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search company..."
                            value={filters.company_name as string}
                            onChange={(e) => handleFilterChange('company_name', e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>

                    {/* Date range */}
                    <input
                        type="date"
                        value={filters.dateFrom as string}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        title="From Date"
                        className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                        type="date"
                        value={filters.dateTo as string}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        title="To Date"
                        className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    {/* Product */}
                    <select
                        value={filters.productId as string}
                        onChange={(e) => handleFilterChange('productId', e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Products</option>
                        {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    {/* Industry */}
                    <select
                        value={filters.industryId as string}
                        onChange={(e) => handleFilterChange('industryId', e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Industries</option>
                        {industries?.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>

                    {/* Call status */}
                    <select
                        value={filters.callStatusId as string}
                        onChange={(e) => handleFilterChange('callStatusId', e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Statuses</option>
                        {callStatuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    {/* Owner */}
                    {showOwnerFilter && (
                        <FilterMultiSelect
                            options={[
                                { value: 'all', label: 'All Users' },
                                ...ownerOptions.map((u: any) => ({
                                    value: String(u.id),
                                    label: `${u.first_name} ${u.last_name || ''}${u.id === currentUser?.id ? ' (You)' : u.role === 'SalesManager' ? ' (SM)' : ''}`
                                }))
                            ]}
                            values={(filters.salespersonId as string).split(',').filter(Boolean)}
                            onChange={vals => {
                                const prev = (filters.salespersonId as string).split(',').filter(Boolean);
                                const addingAll = vals.includes('all') && !prev.includes('all');
                                const hadAll = prev.includes('all');
                                let next: string[];
                                if (addingAll) {
                                    next = ['all'];
                                } else if (hadAll) {
                                    next = vals.filter(v => v !== 'all');
                                } else {
                                    next = vals;
                                }
                                handleFilterChange('salespersonId', next.join(','));
                            }}
                            placeholder="Me (Default)"
                            className="p-2 border border-gray-200 rounded-lg text-sm"
                        />
                    )}
                </div>
                <div className="mt-2 text-right">
                    <button
                        onClick={handleReset}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className={clsx('bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-opacity duration-200', isLoading && 'opacity-60')}>
                <div className="flex items-center justify-end gap-1.5 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-xs text-slate-400">Rows:</span>
                    <select
                        value={pageSize}
                        onChange={e => handlePageSizeChange(Number(e.target.value))}
                        className="form-select py-1 text-xs"
                        style={{ width: 64 }}
                    >
                        {[5, 10, 25, 50].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <Table
                    columns={callColumns}
                    data={calls || []}
                    getRowKey={call => call.id}
                    isLoading={isLoading}
                    skeletonRows={6}
                    maxHeight="max-h-[65vh]"
                    emptyTitle="No call records found"
                    emptySubtitle="Try adjusting the filters above."
                />

                <TablePagination
                    page={currentPage}
                    totalPages={totalPages}
                    totalCount={total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    isLoading={isLoading}
                    itemLabel="records"
                />
            </div>

            {/* ── Delete confirmation dialog ── */}
            {deleteConfirmId !== null && createPortal(
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(0,0,0,0.4)' }}
                        onClick={() => setDeleteConfirmId(null)}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 99999,
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                        padding: '24px',
                        minWidth: 320,
                        maxWidth: 400,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={16} color="#dc2626" />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Delete Call Record</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                            Are you sure you want to delete this call record? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                                disabled={deleteMutation.isPending}
                                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: deleteMutation.isPending ? 0.7 : 1 }}
                            >
                                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

        </div>
    );
}
