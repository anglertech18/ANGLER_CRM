import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, Edit, Trash2, UserCircle, FileText,
    Package, ChevronDown, ShieldCheck, SlidersHorizontal,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import POAModal from '../../components/POAModal';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { useSealFilters } from '../../context/SealFilterContext';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';
import DateOverlay from '../../components/DateOverlay';

/* ── Mapped product item ── */
interface MappedItem {
    id: number | string;
    name: string;
}

export default function POAs() {
    const { user: authUser } = useAuth();
    const queryClient = useQueryClient();
    const { companyId: selectedCompanyIdNum, productId: selectedProductIdNum, bdeId: selectedBdeIdNum, setCompanyId, setProductId, setBdeId } = useSealFilters();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPOA, setEditingPOA] = useState<any>(null);
    const { filters: pf, setFilters: setPf } = usePersistentFilters('poas', {
        fromDate: '', toDate: '', responsibility: '', status: '',
        page: 1, pageSize: 10,
    });

    const currentPage = Number(pf.page) || 1;
    const pageSize = Number(pf.pageSize) || 10;

    const selectedBdeId = selectedBdeIdNum ? String(selectedBdeIdNum) : '';
    const setSelectedBdeId = (v: string) => { setBdeId(v ? Number(v) : null); setPf({ page: 1 }); };

    const filters = {
        fromDate: String(pf.fromDate), toDate: String(pf.toDate),
        responsibility: String(pf.responsibility), status: String(pf.status),
    };
    const setFilters = (updates: Partial<typeof filters>) => setPf({ ...updates, page: 1 } as any);

    const setPage = (p: number) => setPf({ page: p });
    const setPageSize = (s: number) => setPf({ pageSize: s, page: 1 });

    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    const isAdminOrManager = authUser?.role === 'CEO' || authUser?.role === 'SalesManager';
    const isSelected = !!selectedProductIdNum;
    const selectedProductId = selectedProductIdNum ? String(selectedProductIdNum) : '';

    const setSelection = (item: MappedItem | null) => {
        setProductId(item ? Number(item.id) : null);
        setBdeId(null);
        setFilters({ fromDate: '', toDate: '', responsibility: '', status: '' });
    };
    const selectedCompanyId = selectedCompanyIdNum ? String(selectedCompanyIdNum) : '';
    // Company is the SEAL global BU-company filter — clears Product + BDE (batched
    // in the context) and the local POA filters.
    const setSelectedCompany = (v: string) => {
        setCompanyId(v ? Number(v) : null);
        setFilters({ fromDate: '', toDate: '', responsibility: '', status: '' });
    };

    /* ── BU Company options (Global Company filter — narrows the Product list) ── */
    const { data: companies = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['seal-companies'],
        queryFn: () => api.get('/masters/company').then(r => (r.data as any[]).filter(c => c.is_active !== false)),
        staleTime: 5 * 60 * 1000,
    });

    /* ── Mapped products for current user (Global Product filter options) ── */
    const { data: mappedItems = [], isLoading: loadingItems } = useQuery<MappedItem[]>({
        queryKey: ['seal-mapped-products', authUser?.id, selectedCompanyIdNum],
        queryFn: () => api.get('/seal/poas/mapped-products', {
            params: selectedCompanyIdNum ? { company_id: selectedCompanyIdNum } : {},
        }).then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const selection = mappedItems.find(m => String(m.id) === selectedProductId) ?? null;

    /* ── BDE list — scoped to the selected product (admin/manager only) ── */
    const mappedBdeParams = selectedProductId
        ? { productId: selectedProductId }
        : null;

    /* ── Auto-select first mapped product only when no product is persisted globally ── */
    useEffect(() => {
        if (mappedItems.length > 0 && !selectedProductIdNum) {
            setProductId(Number(mappedItems[0].id));
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data: bdes = [] } = useQuery({
        queryKey: ['poas', 'mapped-bdes', authUser?.id, selectedProductId],
        queryFn: () =>
            api.get('/seal/poas/mapped-bdes', { params: mappedBdeParams! }).then(r => r.data),
        enabled: isAdminOrManager && isSelected && mappedBdeParams !== null,
    });

    /* ── All users — for the Responsibility dropdown in the POA form ── */
    const { data: allUsers = [] } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => api.get('/users', { params: { all: 'true' } }).then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    /* ── API params derived from current selection ── */
    const apiParams = {
        ...(selectedProductId && { productId: selectedProductId }),
        ...(selectedBdeId     && { userId:    selectedBdeId }),
        ...(selectedCompanyId && { companyId: selectedCompanyId }),
    };

    const { data: summaryData } = useQuery({
        queryKey: ['poas', 'summary', authUser?.id, selectedProductId, selectedBdeId, selectedCompanyId],
        queryFn: () => api.get('/seal/poas/summary', { params: apiParams }).then(r => r.data),
        enabled: isSelected,
    });

    const { data: weeklySummaryData } = useQuery({
        queryKey: ['poas', 'weekly-summary', authUser?.id, selectedProductId, selectedBdeId, selectedCompanyId],
        queryFn: () => api.get('/seal/poas/weekly-summary', { params: apiParams }).then(r => r.data),
        enabled: isSelected,
    });

    const { data: poas = [], isLoading: loadingPOAs } = useQuery({
        queryKey: ['poas', 'list', authUser?.id, selectedProductId, selectedBdeId, selectedCompanyId],
        queryFn: () => api.get('/seal/poas', { params: apiParams }).then(r => r.data),
        enabled: isSelected,
    });

    /* ── Mutations ── */
    const mutation = useMutation({
        mutationFn: (data: any) => editingPOA
            ? api.put(`/seal/poas/${editingPOA.id}`, data)
            : api.post('/seal/poas', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['poas'] });
            setIsModalOpen(false);
            setEditingPOA(null);
        },
        onError: (err: any) => alert('Error saving POA: ' + (err.response?.data?.message || err.message)),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/seal/poas/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['poas'] }),
    });

    /* ── Handlers ── */
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) {
            setSelection(null);
            return;
        }

        const item = mappedItems.find(m => String(m.id) === val);
        if (item) setSelection(item);
    };

    const selectedDropdownValue = selection ? String(selection.id) : '';

    const handleCreateClick = () => { setEditingPOA(null); setIsModalOpen(true); };
    const handleEditClick = (poa: any) => { setEditingPOA(poa); setIsModalOpen(true); };
    const handleDeleteClick = (id: number) => {
        if (window.confirm('Are you sure you want to delete this action item?')) deleteMutation.mutate(id);
    };

    const handleFormSubmit = (data: any) => {
        mutation.mutate({
            ...data,
            product_id: selectedProductIdNum,
        });
    };

    const formatDate = (date: any) => date ? dayjs(date).format('DD/MM/YYYY') : '—';

    const filteredPOAs = (poas as any[]).filter(p => {
        const matchStatus = !filters.status || p.status === filters.status;
        const matchResp = !filters.responsibility || p.responsibility === filters.responsibility;
        const d = dayjs(p.date_of_meeting);
        const matchFrom = !filters.fromDate || d.isAfter(dayjs(filters.fromDate).subtract(1, 'day'), 'day');
        const matchTo   = !filters.toDate   || d.isBefore(dayjs(filters.toDate).add(1, 'day'), 'day');
        return matchStatus && matchResp && matchFrom && matchTo;
    });

    const dayOfMonth = dayjs().date();
    const currentWeekNum = dayOfMonth <= 7 ? 1 : dayOfMonth <= 14 ? 2 : dayOfMonth <= 21 ? 3 : dayOfMonth <= 28 ? 4 : 5;
    const currentWeekData = (weeklySummaryData as any[])?.find((w: any) => w.week === `Week ${currentWeekNum}`);

    const statusBadge = (status: string) =>
        status === 'Completed' ? 'badge-green' : status === 'In Progress' ? 'badge-blue' : 'badge-amber';

    /* ── Pagination (client-side, applied after filtering) ── */
    const totalRecords = filteredPOAs.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startRecord = totalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const endRecord = Math.min(safePage * pageSize, totalRecords);
    const paginatedPOAs = filteredPOAs.slice((safePage - 1) * pageSize, safePage * pageSize);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
    };

    const poaColumns: TableColumn<any>[] = [
        { key: 'date_of_meeting', header: 'Date', align: 'center', render: record => <span className="text-slate-500">{formatDate(record.date_of_meeting)}</span> },
        {
            key: 'poa_description', header: 'Description', width: 'min-w-[320px]', className: 'font-medium max-w-[360px]', render: record => (
                <span
                    onMouseEnter={(e) => {
                        if (record.poa_description && record.poa_description.length > 50) {
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ text: record.poa_description, x: r.left, y: r.top });
                        }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                >
                    <button
                        type="button"
                        onClick={() => handleEditClick(record)}
                        className="truncate leading-relaxed text-primary-600 hover:text-primary-800 hover:underline text-left w-full block"
                    >
                        {record.poa_description}
                    </button>
                </span>
            ),
        },
        { key: 'responsibility', header: 'Responsibility', align: 'center', render: record => <span className="text-xs font-semibold text-primary-600">{record.responsibility}</span> },
        { key: 'edc', header: 'EDC', align: 'center', render: record => <span className="text-slate-500">{formatDate(record.edc)}</span> },
        { key: 'revised_edc', header: 'Revised EDC', align: 'center', render: record => <span className="text-slate-400">{formatDate(record.revised_edc)}</span> },
        { key: 'status', header: 'Status', align: 'center', render: record => <span className={clsx('badge', statusBadge(record.status))}>{record.status}</span> },
        { key: 'adc', header: 'ADC', align: 'center', render: record => <span className="text-slate-400 italic">{formatDate(record.adc)}</span> },
        {
            key: 'actions', header: 'Actions', align: 'right', sticky: true, render: record => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEditClick(record)} className="btn btn-ghost btn-sm btn-icon text-primary-600">
                        <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteClick(record.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
        {tooltip && createPortal(
            <div
                style={{
                    position: 'fixed',
                    top: tooltip.y - 12,
                    left: tooltip.x,
                    transform: 'translateY(-100%)',
                    zIndex: 99999,
                    pointerEvents: 'none',
                    maxWidth: '320px',
                    background: '#1e293b',
                    color: '#fff',
                    fontSize: '12px',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.6',
                }}
            >
                {tooltip.text}
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
        <div className="page-wrapper">
            {/* ── Page header ── */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Plans of Action (POAs)</h1>
                        <p className="page-subtitle">Select a product to view or create action items</p>
                    </div>
                </div>
                {isSelected && (
                    <button onClick={handleCreateClick} className="btn btn-primary">
                        <Plus size={15} />
                        Create New POA
                    </button>
                )}
            </div>

            {/* ── Filters — Global (SEAL-wide) vs Local (this page) ── */}
            <div className="card p-0 mb-5 overflow-hidden">
              <div className="flex flex-col">
                <div className="bg-primary-50/40 p-4 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 mb-3">
                        <ShieldCheck size={12} className="text-primary-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600">SEAL Filters</span>
                        <span className="text-[10px] text-slate-400 normal-case font-medium">· apply across all SEAL pages</span>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">

                    {/* Company dropdown (BU company — narrows the Product list) */}
                    <div className="form-group min-w-[180px]">
                        <label className="form-label flex items-center gap-1">
                            <FileText size={10} />
                            Company
                        </label>
                        <select
                            value={selectedCompanyId}
                            onChange={e => setSelectedCompany(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All Companies</option>
                            {companies.map(c => (
                                <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Product dropdown */}
                    <div className="form-group min-w-[200px]">
                        <label className="form-label flex items-center gap-1">
                            <Package size={10} />
                            Product *
                        </label>
                        {loadingItems ? (
                            <div className="form-input flex items-center gap-2 text-slate-400 text-sm">
                                <div className="w-3 h-3 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                                Loading…
                            </div>
                        ) : mappedItems.length === 0 ? (
                            <div className="form-input flex items-center gap-2 text-slate-400 text-sm bg-slate-50 cursor-not-allowed">
                                No products mapped to your account
                            </div>
                        ) : (
                            <select
                                value={selectedDropdownValue}
                                onChange={handleSelectChange}
                                className="form-select"
                            >
                                <option value="">— Choose product —</option>
                                {mappedItems.map(item => (
                                    <option key={item.id} value={String(item.id)}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* BDE filter (admin/manager only) */}
                    {isAdminOrManager && (
                        <div className="form-group min-w-[180px]">
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

                    </div>
                </div>

                {isSelected && (
                    <div className="p-4 flex-1">
                        <div className="flex items-center gap-1.5 mb-3">
                            <SlidersHorizontal size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Page Filters</span>
                            <span className="text-[10px] text-slate-400 normal-case font-medium">· this page only</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="form-group">
                                <label className="form-label">From</label>
                                <DateOverlay value={filters.fromDate}>
                                    <input
                                        type="date"
                                        value={filters.fromDate}
                                        onClick={e => e.currentTarget.showPicker?.()}
                                        onChange={e => setFilters({ fromDate: e.target.value })}
                                        className="form-input w-36"
                                    />
                                </DateOverlay>
                            </div>
                            <div className="form-group">
                                <label className="form-label">To</label>
                                <DateOverlay value={filters.toDate}>
                                    <input
                                        type="date"
                                        value={filters.toDate}
                                        onClick={e => e.currentTarget.showPicker?.()}
                                        onChange={e => setFilters({ toDate: e.target.value })}
                                        className="form-input w-36"
                                    />
                                </DateOverlay>
                            </div>
                            <div className="form-group min-w-[160px]">
                                <label className="form-label">Responsibility</label>
                                <select
                                    value={filters.responsibility}
                                    onChange={e => setFilters({ responsibility: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">All</option>
                                    {(allUsers as any[]).map((u: any) => {
                                        const name = `${u.first_name}${u.last_name ? ' ' + u.last_name : ''}`;
                                        return (
                                            <option key={u.id} value={name}>{name}</option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={e => setFilters({ status: e.target.value })}
                                    className="form-select w-32"
                                >
                                    <option value="">All</option>
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            {(filters.fromDate || filters.toDate || filters.responsibility || filters.status) && (
                                <button
                                    onClick={() => setFilters({ fromDate: '', toDate: '', responsibility: '', status: '' })}
                                    className="btn btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                )}
              </div>
            </div>

            {/* ── Empty state — no selection ── */}
            {!isSelected && (
                <div className="card">
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 border border-primary-100">
                            <Package size={28} className="text-primary-500" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 mb-1">
                            {mappedItems.length === 0 && !loadingItems
                                ? 'No Products Assigned'
                                : 'Select a Product'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            {mappedItems.length === 0 && !loadingItems
                                ? 'Contact your manager to get a product assigned to your account.'
                                : 'Choose a product from the dropdown above to view existing POA records or create new action items.'}
                        </p>
                        {mappedItems.length > 0 && (
                            <div className="flex items-center gap-2 mt-4 text-xs text-primary-600 font-medium animate-bounce">
                                <ChevronDown size={14} />
                                Select above to continue
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Content (shown only when selection is made) ── */}
            {isSelected && (
                <>
                    {/* Context pill + count */}
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold bg-primary-50 border-primary-100 text-primary-700">
                            <Package size={13} />
                            {selection?.name}
                        </div>
                        <span className="text-xs text-slate-400">
                            {filteredPOAs.length} action item{filteredPOAs.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                        <div className="card overflow-hidden">
                            <div className="card-header">
                                <h2 className="text-sm font-semibold text-slate-800">Overall POA Summary</h2>
                                <span className={clsx(
                                    'badge',
                                    'badge-blue'
                                )}>
                                    {selection?.name}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-base">
                                    <thead className="table-head">
                                        <tr>
                                            <th className="table-th text-center">Generated</th>
                                            <th className="table-th text-center">Completed</th>
                                            <th className="table-th text-center text-amber-600">Pending</th>
                                            <th className="table-th text-center">In Progress</th>
                                            <th className="table-th text-center text-primary-600">Completed %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="table-tr">
                                            <td className="table-td text-center font-bold text-lg text-slate-800">{(summaryData as any)?.totallyGenerated ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-emerald-600">{(summaryData as any)?.totallyCompleted ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-amber-500">{(summaryData as any)?.pending ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-blue-500">{(summaryData as any)?.inProgress ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-primary-600">{(summaryData as any)?.completionPct ?? '0%'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card overflow-hidden">
                            <div className="card-header">
                                <h2 className="text-sm font-semibold text-slate-800">Current Week Summary (Week {currentWeekNum})</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-base">
                                    <thead className="table-head">
                                        <tr>
                                            <th className="table-th text-center">Week</th>
                                            <th className="table-th text-center">Generated</th>
                                            <th className="table-th text-center">Completed</th>
                                            <th className="table-th text-center text-amber-600">Pending</th>
                                            <th className="table-th text-center">In Progress</th>
                                            <th className="table-th text-center text-primary-600">Completed %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="table-tr">
                                            <td className="table-td text-center">
                                                <span className="badge badge-gray">Week {currentWeekNum}</span>
                                            </td>
                                            <td className="table-td text-center font-bold text-lg text-slate-800">{currentWeekData?.totalGenerated ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-emerald-600">{currentWeekData?.totalCompleted ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-amber-500">{currentWeekData?.pending ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-blue-500">{currentWeekData?.inProgress ?? 0}</td>
                                            <td className="table-td text-center font-bold text-lg text-primary-600">{currentWeekData?.completionPct ?? '0%'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Action items table */}
                    <div className="card overflow-hidden">
                        <div className="card-header flex-col sm:flex-row items-start sm:items-center gap-3">
                            <h2 className="text-sm font-semibold text-slate-800">Detailed Meeting Outcomes & Action Items</h2>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <span className="text-xs text-slate-400">Scroll to see all columns</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-400">Rows:</span>
                                    <select
                                        value={pageSize}
                                        onChange={e => setPageSize(Number(e.target.value))}
                                        className="form-select py-1 text-xs"
                                        style={{ width: 64 }}
                                    >
                                        {[10, 25, 50, 100].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                               {/* <button onClick={handleCreateClick} className="btn btn-primary btn-sm">
                                    <Plus size={13} />
                                    Add POA
                                </button> */}
                            </div>
                        </div>

                        <Table
                            columns={poaColumns}
                            data={paginatedPOAs}
                            getRowKey={record => record.id}
                            isLoading={loadingPOAs}
                            skeletonRows={5}
                            className="min-w-[900px]"
                            maxHeight="max-h-[65vh]"
                            emptyIcon={<FileText size={20} className="text-slate-400" />}
                            emptyTitle={`No POA records for ${selection?.name}`}
                            emptySubtitle="Create the first action item using the button above."
                        />

                        <TablePagination
                            page={safePage}
                            totalPages={totalPages}
                            totalCount={totalRecords}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                            isLoading={loadingPOAs}
                            itemLabel="records"
                        />
                    </div>
                </>
            )}

            <POAModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingPOA(null); }}
                onSubmit={handleFormSubmit}
                initialData={editingPOA}
                isSubmitting={mutation.isPending}
                productId={selectedProductIdNum ?? undefined}
                productName={selection?.name}
                responsibilityOptions={allUsers as any[]}
                currentUserName={authUser ? `${authUser.first_name}${authUser.last_name ? ' ' + authUser.last_name : ''}` : undefined}
            />
        </div>
        </>
    );
}
