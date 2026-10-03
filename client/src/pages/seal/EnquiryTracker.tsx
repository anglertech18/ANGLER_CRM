import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Filter, Edit2, Trash2, User, Calendar, CheckCircle2, Search, ClipboardList, ArrowLeft, UserCircle, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

interface MappedItem {
    id: number | string;
    name: string;
}

interface Selection {
    item: MappedItem;
    productId?: string;
}

const decodeSelection = (item: MappedItem): Selection => ({
    item,
    productId: String(item.id),
});

export default function EnquiryTracker() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const { user: authUser } = useAuth();
    const [selection, setSelection] = useState<Selection | null>(null);
    const { filters: ef, setFilters: setEf, resetFilters: resetEf } = usePersistentFilters('enquiry', {
        activeTab: 'active',
        selectedBdeId: '',
        startDate: '', endDate: '', lead_source_id: '',
        company_name: '', sales_stage_id: '', lead_qualification: '',
    });

    const activeTab = ef.activeTab as 'active' | 'converted' | 'allocated';
    const setActiveTab = (v: 'active' | 'converted' | 'allocated') => setEf({ activeTab: v });
    const selectedBdeId = String(ef.selectedBdeId);
    const setSelectedBdeId = (v: string) => setEf({ selectedBdeId: v });

    const filters = {
        startDate: String(ef.startDate), endDate: String(ef.endDate),
        lead_source_id: String(ef.lead_source_id), company_name: String(ef.company_name),
        sales_stage_id: String(ef.sales_stage_id), lead_qualification: String(ef.lead_qualification),
    };
    const setFilters = (updates: Partial<typeof filters> | ((prev: typeof filters) => typeof filters)) => {
        const resolved = typeof updates === 'function' ? updates(filters) : updates;
        setEf(resolved as any);
    };

    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const isSelected = !!selection;
    const isAdminOrManager = authUser?.role === 'CEO' || authUser?.role === 'SalesManager';

    /* ── Mapped products for current user ── */
    const { data: mappedItems = [] } = useQuery<MappedItem[]>({
        queryKey: ['poas', 'mapped-products', authUser?.id],
        queryFn: () => api.get('/seal/poas/mapped-products').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    /* ── BDE list scoped to selected product (admin/manager only) ── */
    const mappedBdeParams = selection?.productId
        ? { productId: selection.productId }
        : null;

    const { data: bdes = [] } = useQuery({
        queryKey: ['enquiries', 'mapped-bdes', authUser?.id, selection?.item.id],
        queryFn: () =>
            api.get('/seal/poas/mapped-bdes', { params: mappedBdeParams! }).then(r => r.data),
        enabled: isAdminOrManager && isSelected && mappedBdeParams !== null,
    });

    const { data: leadSources = [] } = useQuery({ queryKey: ['masters', 'leadsource'], queryFn: () => api.get('/masters/leadsource').then(res => res.data) });
    const { data: salesStages = [] }  = useQuery({ queryKey: ['masters', 'salesstage'],  queryFn: () => api.get('/masters/salesstage').then(res => res.data) });

    /* ── Restore from URL params, or auto-select first mapped product ── */
    useEffect(() => {
        if (mappedItems.length > 0 && !selection) {
            const urlPid = searchParams.get('product_id');
            let initialItem: MappedItem | undefined;
            if (urlPid) initialItem = mappedItems.find(i => String(i.id) === urlPid);
            if (!initialItem) initialItem = mappedItems[0]; // auto-select first product
            if (initialItem) setSelection(decodeSelection(initialItem));
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSelectionChange = (val: string) => {
        if (!val) {
            setSelection(null);
            setEf({ selectedBdeId: '', startDate: '', endDate: '', lead_source_id: '', company_name: '', sales_stage_id: '', lead_qualification: '' });
            return;
        }
        const item = mappedItems.find(m => String(m.id) === val);
        if (item) {
            const newSel = decodeSelection(item);
            setSelection(newSel);
            setSelectedBdeId('');
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('product_id');
            if (newSel.productId) newParams.set('product_id', newSel.productId);
            setSearchParams(newParams);
        }
    };

    /* ── Enquiries — gated on selection, includes BDE scope filter ── */
    const { data: enquiries = [], isLoading, isFetching, isError, error: enquiryError } = useQuery({
        queryKey: ['enquiries', activeTab, filters, selection?.item.id, selectedBdeId],
        queryFn: () => {
            const params: any = {
                product_id: selection?.productId,
            };
            if (activeTab === 'converted') params.is_converted = 'true';
            if (activeTab === 'allocated') params.view = 'allocated';
            if (selectedBdeId)          params.allocated_to_id  = selectedBdeId;
            if (filters.startDate)      params.startDate        = filters.startDate;
            if (filters.endDate)        params.endDate          = filters.endDate;
            if (filters.lead_source_id)    params.lead_source_id    = filters.lead_source_id;
            if (filters.company_name)      params.company_name      = filters.company_name;
            if (filters.sales_stage_id)    params.sales_stage_id    = filters.sales_stage_id;
            if (filters.lead_qualification) params.lead_qualification = filters.lead_qualification;
            return api.get('/enquiries', { params }).then(res => res.data);
        },
        enabled: isSelected,
        retry: 1,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/enquiries/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enquiries'] }),
    });

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this enquiry?')) deleteMutation.mutate(id);
    };

    const handleFilterChange = (e: any) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => resetEf();

    useEffect(() => { setPage(1); }, [activeTab, filters, selection?.item.id, selectedBdeId]);

    const totalCount = enquiries.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const pagedEnquiries = enquiries.slice((page - 1) * pageSize, page * pageSize);

    const selectedBdeName = selectedBdeId
        ? (bdes as any[]).find((b: any) => String(b.id) === selectedBdeId)
        : null;

    const columns: TableColumn<any>[] = [
        { key: 'id', header: 'Enq #', align: 'center', className: 'px-3 font-mono font-semibold', render: enq => <span className="text-slate-500">#{enq.id}</span> },
        {
            key: 'company', header: 'Company Name', className: 'max-w-[200px]', render: enq => (
                <>
                    <div className="font-semibold text-slate-900 truncate">{enq.company_name}</div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                        <User size={9} /> {enq.contact_name}
                    </div>
                </>
            ),
        },
        { key: 'product', header: 'Product', render: enq => <span className="badge badge-blue">{enq.product?.name || '—'}</span> },
        {
            key: 'created_by', header: 'Created By', render: enq => (
                enq.created_by ? (
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {enq.created_by.first_name?.[0]}
                        </div>
                        <span className="text-xs text-slate-700">{enq.created_by.first_name} {enq.created_by.last_name}</span>
                    </div>
                ) : <span className="text-[10px] text-slate-300 italic">—</span>
            ),
        },
        {
            key: 'allocated_to', header: 'Enquiry Allocated To', render: enq => (
                enq.enquiry_allocated_to_user ? (
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {enq.enquiry_allocated_to_user.first_name?.[0]}
                        </div>
                        <span className="text-xs font-semibold text-blue-800">{enq.enquiry_allocated_to_user.first_name} {enq.enquiry_allocated_to_user.last_name}</span>
                    </div>
                ) : <span className="text-[10px] text-slate-300 italic">Unassigned</span>
            ),
        },
        activeTab === 'converted' ? {
            key: 'converted_to', header: 'Converted To', thClassName: 'text-emerald-700', render: enq => (
                <>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={clsx('badge', enq.converted_to === 'CallTracker' ? 'badge-blue' : 'badge-green')}>
                            {enq.converted_to === 'CallTracker' ? 'Call Tracker' : 'Lead'}
                        </span>
                    </div>
                    {(() => {
                        const owner = enq.allocated_to || enq.enquiry_allocated_to_user;
                        return owner ? (
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                                    {owner.first_name?.[0]}
                                </div>
                                <span className="text-xs font-semibold text-emerald-800">{owner.first_name} {owner.last_name}</span>
                            </div>
                        ) : null;
                    })()}
                </>
            ),
        } : {
            key: 'status', header: 'Status', render: enq => (
                <>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-amber-700 uppercase">{enq.sales_stage?.name || 'Initial'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">{enq.lead_qualification || 'Pending'}</div>
                </>
            ),
        },
        ...(activeTab === 'converted' ? [{
            key: 'converted_at', header: 'Converted Date', thClassName: 'text-emerald-700', render: (enq: any) => (
                enq.converted_at
                    ? <span className="text-xs text-emerald-700 font-semibold">{dayjs(enq.converted_at).format('DD MMM YYYY')}</span>
                    : <span className="text-[10px] text-slate-400 italic">—</span>
            ),
        }] : []),
        {
            key: 'created_date', header: 'Created Date', render: enq => (
                <>
                    <div className="font-semibold text-slate-700">{dayjs(enq.date).format('DD MMM YYYY')}</div>
                    <div className="text-[10px] text-slate-400">{dayjs(enq.date).format('h:mm A')}</div>
                </>
            ),
        },
        {
            key: 'actions', header: 'Actions', align: 'right', render: enq => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`${enq.id}/edit`)} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Edit Enquiry">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(enq.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete Enquiry">
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="page-wrapper">
            {/* ── Page header ── */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <ClipboardList size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Enquiry Tracker</h1>
                        <p className="page-subtitle">Manage and track your lead conversion pipeline</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSelected && (
                        <>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={clsx('btn', showFilters ? 'btn-secondary' : 'btn-ghost')}
                            >
                                <Filter size={15} />
                                Filters
                            </button>
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    if (selection.productId) params.set('product_id', selection.productId);
                                    params.set('context_name', selection.item.name);
                                    navigate(`new?${params.toString()}`);
                                }}
                                className="btn btn-primary"
                            >
                                <Plus size={15} />
                                Add Enquiry
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Selection bar — always visible ── */}
            <div className="card p-5 mb-6">
                <div className="flex flex-wrap items-end gap-4">

                    {/* Product dropdown */}
                    <div className="form-group min-w-[240px]">
                        <label className="form-label flex items-center gap-1">
                            <Package size={10} />
                            Product *
                        </label>
                        <select
                            value={selection ? String(selection.item.id) : ''}
                            onChange={(e) => handleSelectionChange(e.target.value)}
                            className="form-select font-semibold text-primary-700"
                        >
                            <option value="">— Select Product —</option>
                            {mappedItems.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* BDE filter — Admin/Manager only, appears after product/service selected */}
                    {isAdminOrManager && isSelected && (
                        <div className="form-group min-w-[200px]">
                            <label className="form-label flex items-center gap-1">
                                <UserCircle size={10} />
                                BDE Filter
                            </label>
                            <select
                                value={selectedBdeId}
                                onChange={e => setSelectedBdeId(e.target.value)}
                                className="form-select"
                            >
                                <option value="">All BDEs</option>
                                {(bdes as any[]).map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {u.first_name} {u.last_name} ({u.role === 'CEO' ? 'Admin' : u.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isSelected && (
                        <div className="flex items-center gap-2 text-primary-600 animate-pulse mb-0.5">
                            <ArrowLeft size={14} className="rotate-90" />
                            <span className="text-xs font-bold uppercase tracking-tight">Select a product to begin</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Empty state ── */}
            {!isSelected ? (
                <div className="card">
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 border border-primary-100">
                            <Package size={28} className="text-primary-500" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 mb-1">
                            {mappedItems.length === 0 ? 'No Products Assigned' : 'Select a Product'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            {mappedItems.length === 0
                                ? 'Contact your manager to get products assigned to your account.'
                                : 'Choose a product from the dropdown above to view enquiries or create new records.'}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Context pill */}
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold bg-primary-50 border-primary-100 text-primary-700">
                            <Package size={13} />
                            {selection.item.name}
                        </div>
                        {selectedBdeName && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                                <UserCircle size={13} />
                                {selectedBdeName.first_name} {selectedBdeName.last_name}
                            </div>
                        )}
                        <span className="text-xs text-slate-400">
                            {enquiries.length} {activeTab === 'allocated' ? 'allocated' : activeTab === 'converted' ? 'converted' : ''} enquir{enquiries.length !== 1 ? 'ies' : 'y'}
                        </span>
                        {activeTab === 'converted' && enquiries.length > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                Total Converted: {enquiries.length}
                            </span>
                        )}
                    </div>

                    {/* ── Advanced filters panel ── */}
                    {showFilters && (
                        <div className="card p-5 mb-0">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search Filters</span>
                                <button onClick={resetFilters} className="text-xs font-semibold text-primary-600 hover:text-primary-700">Reset All</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                <div className="form-group">
                                    <label className="form-label flex items-center gap-1"><Calendar size={10} />From Date</label>
                                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label flex items-center gap-1"><Calendar size={10} />To Date</label>
                                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Source</label>
                                    <select name="lead_source_id" value={filters.lead_source_id} onChange={handleFilterChange} className="form-select">
                                        <option value="">All Sources</option>
                                        {leadSources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sales Stage</label>
                                    <select name="sales_stage_id" value={filters.sales_stage_id} onChange={handleFilterChange} className="form-select">
                                        <option value="">All Stages</option>
                                        {salesStages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lead Qualification</label>
                                    <select name="lead_qualification" value={filters.lead_qualification} onChange={handleFilterChange} className="form-select">
                                        <option value="">All</option>
                                        <option value="Lead Qualification In Progress">In Progress</option>
                                        <option value="Quadrant">Quadrant</option>
                                        <option value="Nurturing">Nurturing</option>
                                        <option value="Invalid">Invalid</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label flex items-center gap-1"><Search size={10} />Company</label>
                                    <input type="text" name="company_name" value={filters.company_name} onChange={handleFilterChange} placeholder="Search company..." className="form-input" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tabs ── */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={clsx(
                                'px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <Filter size={13} />
                            All Enquiries
                        </button>
                       
                        <button
                            onClick={() => setActiveTab('allocated')}
                            className={clsx(
                                'px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                activeTab === 'allocated' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <UserCircle size={13} />
                            Allocated Enquiries
                        </button>
                         <button
                            onClick={() => setActiveTab('converted')}
                            className={clsx(
                                'px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                activeTab === 'converted' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <CheckCircle2 size={13} />
                            Converted Leads
                        </button>
                    </div>

                    {/* ── Query error banner ── */}
                    {isError && (
                        <div className="card p-4 border border-red-200 bg-red-50 text-sm text-red-700">
                            <strong>Failed to load enquiries:</strong>{' '}
                            {(enquiryError as any)?.response?.data?.details || (enquiryError as any)?.response?.data?.message || (enquiryError as any)?.message || 'Unknown error'}
                        </div>
                    )}

                    {/* ── Enquiries table ── */}
                    <div className={clsx('card overflow-hidden relative transition-opacity duration-200', isFetching && 'opacity-70')}>
                        {isFetching && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary-100 overflow-hidden">
                                <div className="h-full bg-primary-600 w-1/3 animate-pulse" />
                            </div>
                        )}
                        <Table
                            columns={columns}
                            data={pagedEnquiries}
                            getRowKey={enq => enq.id}
                            isLoading={isLoading}
                            skeletonRows={5}
                            className="min-w-[900px] text-xs"
                            maxHeight="max-h-[65vh]"
                            emptyIcon={<Search size={20} className="text-slate-400" />}
                            emptyTitle={`No ${activeTab === 'allocated' ? 'allocated' : activeTab === 'converted' ? 'converted' : ''} enquiries for ${selection.item.name}`}
                            emptySubtitle={Object.values(filters).some(v => v !== '') ? 'Try clearing the filters.' : 'Add a new enquiry to get started.'}
                        />
                        <TablePagination
                            page={page}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            isLoading={isLoading}
                            itemLabel="enquiries"
                        />
                    </div>
                </>
            )}
        </div>
    );
}
