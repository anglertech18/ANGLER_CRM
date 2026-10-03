import React, { useState, useEffect, useMemo } from 'react';
import {
    Upload, Download, AlertCircle, CheckCircle, Loader2, ArrowLeft,
    Trash2, X, Search, MapPin, Pencil, Info, Briefcase, Calendar,
    Phone, Mail, Linkedin, Save, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { useAuth } from '../../context/AuthContext';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';
import DateOverlay from '../../components/DateOverlay';

interface ResultSummary {
    totalRows: number;
    imported: number;
    failed: number;
    duplicates: number;
    errorReportUrl?: string;
}

interface StagedRecord {
    id: number;
    user_id: number;
    user?: { id: number; first_name: string; last_name: string | null };
    file_name: string | null;
    has_validation_error: boolean;
    error_message: string | null;
    created_at: string;
    date: string | null;
    product_id: number | null;
    industry_id: number | null;
    source_of_db_id: number | null;
    company_name: string | null;
    location: string | null;
    contact_person_name: string | null;
    designation: string | null;
    email_address: string | null;
    personal_email: string | null;
    mobile_no: string | null;
    alternate_mobile_number: string | null;
    business_potential: string | null;
    email_status_id: number | null;
    linkedin_sent: boolean;
    call_status_id: number | null;
    next_follow_up_date: string | null;
    moved_to_quad: string | null;
    remarks: string | null;
}

interface StagedResponse {
    data: StagedRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="card-header">
        <div className="flex items-center gap-2">
            <Icon size={15} className="text-primary-600" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h2>
        </div>
    </div>
);

export default function BulkUploads() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { filters, setFilters, resetFilters } = usePersistentFilters('bulkuploads', {
        search:       '',
        location:     '',
        dateFrom:     '',
        dateTo:       '',
        productId:    '',
        industryId:   '',
        uploadedById: '',
        page:         1,
        pageSize:     10,
    });

    const currentPage = (filters.page as number) || 1;
    const pageSize    = (filters.pageSize as number) || 10;

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [file, setFile]                           = useState<File | null>(null);
    const [isUploading, setIsUploading]             = useState(false);
    const [uploadResult, setUploadResult]           = useState<ResultSummary | null>(null);
    const [uploadError, setUploadError]             = useState<string | null>(null);

    const [selectedIds, setSelectedIds]         = useState<Set<number>>(new Set());
    const [isActionInProgress, setIsActionInProgress] = useState(false);

    const [editRecord, setEditRecord] = useState<StagedRecord | null>(null);
    const [editForm, setEditForm]     = useState<any>(null);
    const [editErrors, setEditErrors] = useState<any>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Clear selection when filters/page changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [filters]);

    /* ── Masters ── */
    const { data: products }      = useQuery({ queryKey: ['masters', 'product'],     queryFn: () => api.get('/masters/product').then(r => r.data) });
    const { data: industries }    = useQuery({ queryKey: ['masters', 'industry'],    queryFn: () => api.get('/masters/industry').then(r => r.data) });
    const { data: dbSources }     = useQuery({ queryKey: ['masters', 'sourceofdb'],  queryFn: () => api.get('/masters/sourceofdb').then(r => r.data) });
    const { data: callStatuses }  = useQuery({ queryKey: ['masters', 'callstatus'],  queryFn: () => api.get('/masters/callstatus').then(r => r.data) });
    const { data: emailStatuses } = useQuery({ queryKey: ['masters', 'emailstatus'], queryFn: () => api.get('/masters/emailstatus').then(r => r.data) });

    /* ── Current user & accessible users ── */
    const { data: currentUser } = useQuery<any>({
        queryKey: ['current-user'],
        queryFn:  () => api.get('/auth/me').then(r => r.data),
        staleTime: Infinity,
    });
    const userRole: string = currentUser?.role ?? '';

    const { data: accessibleUsers } = useQuery<any[]>({
        queryKey: ['accessible-users'],
        queryFn:  () => api.get('/users').then(r => r.data),
        enabled:  userRole === 'CEO' || userRole === 'SalesManager',
        staleTime: 5 * 60 * 1000,
    });

    const showUploaderFilter = userRole === 'CEO' || userRole === 'SalesManager';

    const uploaderOptions = useMemo(() => {
        if (!currentUser) return [];
        const me = currentUser;
        if (userRole === 'CEO') {
            return [
                { value: '',    label: 'All Users' },
                { value: String(me.id), label: `${me.first_name} ${me.last_name ?? ''} (You)`.trim() },
                ...(accessibleUsers ?? [])
                    .filter((u: any) => (u.role === 'SalesManager' || u.role === 'SalesPerson') && u.id !== me.id)
                    .map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name ?? ''}`.trim() })),
            ];
        }
        if (userRole === 'SalesManager') {
            const subs = (accessibleUsers ?? []).filter((u: any) => u.reporting_manager_id === me.id);
            return [
                { value: '',    label: 'Me (Default)' },
                { value: 'all', label: 'All Team' },
                ...subs.map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name ?? ''}`.trim() })),
            ];
        }
        return [];
    }, [currentUser, accessibleUsers, userRole]);

    /* ── Staged records (server-side, paginated) ── */
    const { data: stagedData, isLoading: isFetchingStaged } = useQuery<StagedResponse>({
        queryKey: ['bulk-uploads-staged', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search)       params.append('search',       String(filters.search));
            if (filters.location)     params.append('location',     String(filters.location));
            if (filters.dateFrom)     params.append('dateFrom',     String(filters.dateFrom));
            if (filters.dateTo)       params.append('dateTo',       String(filters.dateTo));
            if (filters.productId)    params.append('productId',    String(filters.productId));
            if (filters.industryId)   params.append('industryId',   String(filters.industryId));
            if (filters.uploadedById !== '') params.append('uploadedById', String(filters.uploadedById));
            params.append('page',     String(currentPage));
            params.append('pageSize', String(pageSize));
            const res = await api.get(`/call-tracker/staged?${params.toString()}`);
            return res.data;
        },
        refetchInterval: 30000,
        placeholderData: (prev) => prev,
    });

    const stagedRecords = stagedData?.data ?? [];
    const total         = stagedData?.total ?? 0;
    const totalPages    = stagedData?.totalPages ?? 1;
    const startRecord   = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord     = Math.min(currentPage * pageSize, total);

    const invalidateStaged = () => queryClient.invalidateQueries({ queryKey: ['bulk-uploads-staged'] });

    const handleFilterChange = (field: string, value: string) =>
        setFilters({ [field]: value, page: 1 } as any);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        setFilters({ page: newPage } as any);
    };

    const handlePageSizeChange = (newSize: number) => {
        setFilters({ pageSize: newSize, page: 1 } as any);
    };

    /* ── Upload ── */
    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/call-tracker/template', { responseType: 'blob' });
            const url  = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'CallTracker_Template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch { toast.error('Failed to download template'); }
    };

    const handleUpload = async () => {
        if (!file) { setUploadError('Please select a file first.'); return; }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('File size is too large. Please upload a file smaller than or equal to 10 MB.');
            return;
        }
        setIsUploading(true); setUploadError(null); setUploadResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/call-tracker/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploadResult(res.data);
            await invalidateStaged();
            toast.success('Upload validated and staged successfully!');
        } catch (err: any) {
            setUploadError(err.response?.data?.message || 'DB upload failed. Please check the file format.');
        } finally { setIsUploading(false); }
    };

    /* ── Delete / discard ── */
    const handleDeleteStaged = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm('Are you sure you want to discard the selected records?')) return;
        setIsActionInProgress(true);
        try {
            await api.delete('/call-tracker/staged', { data: { ids: Array.from(selectedIds) } });
            toast.success('Records discarded successfully');
            setSelectedIds(new Set());
            await invalidateStaged();
        } catch { toast.error('Failed to discard records'); }
        finally { setIsActionInProgress(false); }
    };

    const handleDeleteSingle = async (id: number) => {
        if (!window.confirm('Are you sure you want to discard this record?')) return;
        setIsActionInProgress(true);
        try {
            await api.delete('/call-tracker/staged', { data: { ids: [id] } });
            toast.success('Record discarded');
            const next = new Set(selectedIds); next.delete(id); setSelectedIds(next);
            await invalidateStaged();
        } catch { toast.error('Failed to discard record'); }
        finally { setIsActionInProgress(false); }
    };

    /* ── Edit ── */
    const openEditModal = (record: StagedRecord) => {
        setEditRecord(record);
        setEditErrors({});
        setEditForm({
            date:                record.date ? dayjs(record.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            product_id:          record.product_id?.toString() || '',
            industry_id:         record.industry_id?.toString() || '',
            source_of_db_id:     record.source_of_db_id?.toString() || '',
            company_name:        record.company_name || '',
            location:            record.location || '',
            contact_person_name: record.contact_person_name || '',
            designation:         record.designation || '',
            email_address:       record.email_address || '',
            personal_email:      record.personal_email || '',
            mobile_no:           record.mobile_no || '',
            business_potential:  record.business_potential || '',
            email_status_id:     record.email_status_id?.toString() || '',
            linkedin_sent:       !!record.linkedin_sent,
            call_status_id:      record.call_status_id?.toString() || '',
            remarks:             record.remarks || '',
            next_follow_up_date: record.next_follow_up_date ? dayjs(record.next_follow_up_date).format('YYYY-MM-DD') : '',
            moved_to_quad:       record.moved_to_quad ? 'yes' : '',
        });
    };

    const handleEditChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setEditForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (editErrors[name]) setEditErrors((prev: any) => ({ ...prev, [name]: null }));
    };

    const handleSaveEdit = async () => {
        if (!editRecord || !editForm) return;
        const newErrors: any = {};
        if (!editForm.company_name?.trim()) newErrors.company_name = 'Company Name is required';
        if (Object.keys(newErrors).length > 0) { setEditErrors(newErrors); return; }

        setIsSavingEdit(true);
        try {
            const res = await api.put(`/call-tracker/staged/${editRecord.id}`, editForm);
            if (res.data.converted) {
                toast.success('Lead created successfully. Record moved to your Call Tracker.');
            } else if (res.data.moved) {
                toast.success('Record claimed and moved to your Call Tracker.');
            } else {
                toast.success('Record updated successfully.');
            }
            setEditRecord(null); setEditForm(null);
            await invalidateStaged();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update record');
        } finally { setIsSavingEdit(false); }
    };

    /* ── Selection ── */
    const validRecordsCount = stagedRecords.filter(r => !r.has_validation_error).length;

    const toggleSelection = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        const valid = stagedRecords.filter(r => !r.has_validation_error);
        if (selectedIds.size === valid.length && valid.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(valid.map(r => r.id)));
    };

    const downloadErrorReport = () => {
        if (uploadResult?.errorReportUrl) {
            const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
            window.open(`${baseUrl}${uploadResult.errorReportUrl}`, '_blank');
        }
    };

    const callStatusName    = callStatuses?.find((s: any) => s.id === parseInt(editForm?.call_status_id))?.name;
    const isFollowUpRequired = callStatusName === 'Follow Up Required';

    const stagedColumns: TableColumn<StagedRecord>[] = [
        {
            key: 'select', width: 'w-10',
            header: (
                <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={selectedIds.size > 0 && selectedIds.size === validRecordsCount}
                    onChange={toggleAll}
                    disabled={validRecordsCount === 0}
                />
            ),
            render: record => (
                <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleSelection(record.id)}
                    disabled={record.has_validation_error}
                />
            ),
        },
        { key: 'date', header: 'Date', className: 'text-gray-900 text-xs', render: record => record.date ? dayjs(record.date).format('DD/MM/YYYY') : '-' },
        {
            key: 'product', header: 'Product / Service', render: record => (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    {products?.find((p: any) => p.id === record.product_id)?.name || '-'}
                </span>
            ),
        },
        { key: 'industry', header: 'Industry', className: 'text-gray-600 text-xs', render: record => industries?.find((i: any) => i.id === record.industry_id)?.name || '-' },
        { key: 'company', header: 'Company', className: 'font-bold text-gray-900 text-sm', render: record => record.company_name || '-' },
        {
            key: 'location', header: 'Location', className: 'text-gray-600', render: record => (
                <span className="flex items-center space-x-1"><MapPin size={10} className="text-gray-400" /><span className="text-xs">{record.location || '-'}</span></span>
            ),
        },
        { key: 'contact', header: 'Contact Person', className: 'font-medium text-gray-900 text-xs', render: record => record.contact_person_name || '-' },
        {
            key: 'email_mobile', header: 'Email / Mobile', render: record => (
                <div className="flex flex-col text-[10px]">
                    <span className="text-blue-600 font-medium truncate max-w-[120px]">{record.email_address || ''}</span>
                    <span className="text-gray-500">{record.mobile_no || ''}</span>
                </div>
            ),
        },
        {
            key: 'uploaded_by', header: 'Uploaded By', render: record => {
                const uploaderName = record.user ? `${record.user.first_name} ${record.user.last_name ?? ''}`.trim() : '—';
                return (
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                        <User size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate max-w-[90px]" title={uploaderName}>{uploaderName}</span>
                    </div>
                );
            },
        },
        {
            key: 'actions', header: 'Actions', align: 'center', render: record => (
                <div className="flex items-center justify-center space-x-1">
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(record); }} disabled={isActionInProgress}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50" title="Edit record">
                        <Pencil size={15} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSingle(record.id); }} disabled={isActionInProgress}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Discard record">
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Link to="/call-management/tracker" className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500 hover:text-gray-700 transition-all">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">DB Uploads</h1>
                        <p className="text-sm text-gray-500">Manage and review staged records</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setIsUploadModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors shadow-sm font-bold">
                        <Upload size={20} /><span>DB Upload</span>
                    </button>
                    <button onClick={handleDownloadTemplate} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors shadow-sm font-bold">
                        <Download size={18} /><span>Template</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-3">
                    <div className="relative lg:flex-[1.3] lg:min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="text" placeholder="Search company..." value={filters.search as string}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div className="relative lg:flex-1 lg:min-w-0">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="text" placeholder="Location..." value={filters.location as string}
                            onChange={(e) => handleFilterChange('location', e.target.value)}
                            className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <DateOverlay value={filters.dateFrom as string} wrapperClassName="lg:flex-1 lg:min-w-0">
                        <input type="date" value={filters.dateFrom as string}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)} title="From Date"
                            className="w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </DateOverlay>
                    <DateOverlay value={filters.dateTo as string} wrapperClassName="lg:flex-1 lg:min-w-0">
                        <input type="date" value={filters.dateTo as string}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)} title="To Date"
                            className="w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </DateOverlay>
                    <select value={filters.productId as string} onChange={(e) => handleFilterChange('productId', e.target.value)}
                        className="w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:flex-1 lg:min-w-0">
                        <option value="">All Products</option>
                        {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={filters.industryId as string} onChange={(e) => handleFilterChange('industryId', e.target.value)}
                        className="w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:flex-1 lg:min-w-0">
                        <option value="">All Industries</option>
                        {industries?.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    {showUploaderFilter && (
                        <select value={filters.uploadedById as string} onChange={(e) => handleFilterChange('uploadedById', e.target.value)}
                            className="w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:flex-1 lg:min-w-0">
                            {uploaderOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-right">
                    <button onClick={resetFilters} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Reset Filters</button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500 font-medium">
                        {total === 0
                            ? <><span className="font-bold text-gray-800">0</span> records</>
                            : <><span className="font-bold text-gray-800">{startRecord}–{endRecord}</span> of <span className="font-bold text-gray-800">{total}</span> records</>}
                    </p>
                    <div className="flex items-center gap-1.5 pl-4 border-l border-gray-100">
                        <span className="text-xs text-gray-400">Rows:</span>
                        <select value={pageSize} onChange={e => handlePageSizeChange(Number(e.target.value))}
                            className="form-select py-1 text-xs" style={{ width: 64 }}>
                            {[5, 10, 25, 50].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={handleDeleteStaged} disabled={selectedIds.size === 0 || isActionInProgress}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 text-xs font-bold transition-all">
                        <Trash2 size={14} /><span>Delete Selected ({selectedIds.size})</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <Table
                    columns={stagedColumns}
                    data={stagedRecords}
                    getRowKey={record => record.id}
                    isLoading={isFetchingStaged}
                    rowClassName={record => clsx(selectedIds.has(record.id) && 'bg-blue-50')}
                    maxHeight="max-h-[65vh]"
                    emptyTitle="No staged records found"
                    className="[&_.table-head]:bg-primary-900 [&_.table-th]:text-white/90"
                />
                <TablePagination
                    page={currentPage}
                    totalPages={totalPages}
                    totalCount={total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    isLoading={isFetchingStaged}
                    itemLabel="records"
                />
            </div>

            {/* ── Upload Modal ── */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Upload size={20} /></div>
                                <h2 className="text-xl font-bold text-gray-900">Upload Call Records</h2>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start space-x-3">
                                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                <div className="text-sm">
                                    <p className="font-bold text-blue-900 mb-1 text-xs">Upload Instructions:</p>
                                    <ul className="list-disc list-inside text-blue-700 space-y-0.5 text-xs font-medium">
                                        <li>Standard Excel template is required.</li>
                                        <li>Master names must match exactly (spelling/case).</li>
                                        <li>Date format: DD/MM/YYYY.</li>
                                        <li>Company and Mobile No are mandatory fields.</li>
                                        <li>Records with Call Status go directly to Call Tracker.</li>
                                    </ul>
                                </div>
                            </div>
                            <div className={clsx('relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all', file ? 'border-green-300 bg-green-50/30' : 'border-gray-200 hover:border-blue-400 bg-white')}>
                                <input type="file" accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setUploadError(null); } }} />
                                <div className={clsx('p-3 rounded-full mb-3', file ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400')}>
                                    {isUploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                                </div>
                                <p className="text-sm font-bold text-gray-700 text-center">{file ? file.name : 'Click or drag your Excel file here'}</p>
                                <p className="text-xs text-gray-400 mt-1">Accepts .xlsx and .xls formats</p>
                            </div>
                            {uploadError && (
                                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-xs font-bold leading-relaxed shadow-sm">
                                    <AlertCircle size={16} className="shrink-0" /><span>{uploadError}</span>
                                </div>
                            )}
                            {uploadResult && (
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Total Rows Processed:</span>
                                        <span className="font-bold text-gray-900">{uploadResult.totalRows}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-green-600 font-medium">Successfully Imported:</span>
                                        <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{uploadResult.imported}</span>
                                    </div>
                                    {uploadResult.failed > 0 && (
                                        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                                            <span className="text-red-600 font-medium">Validation Errors:</span>
                                            <button onClick={(e) => { e.stopPropagation(); downloadErrorReport(); }} className="flex items-center space-x-1 font-bold text-red-600 hover:underline bg-red-50 px-2 py-0.5 rounded group">
                                                <span>{uploadResult.failed} (Download Report)</span>
                                                <Download size={10} className="group-hover:translate-y-0.5 transition-transform" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex space-x-3">
                            <button onClick={() => { setIsUploadModalOpen(false); setUploadResult(null); setUploadError(null); setFile(null); }}
                                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm">Close</button>
                            {!uploadResult && (
                                <button onClick={handleUpload} disabled={!file || isUploading}
                                    className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center space-x-2">
                                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    <span>Validate & Stage</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {editRecord && editForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-50 w-full max-w-4xl my-6 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500">
                                    <Pencil size={16} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-slate-900">Edit Staged Record</h1>
                                    <p className="text-xs text-slate-500">Update prospect details before final import</p>
                                </div>
                            </div>
                            <button onClick={() => { setEditRecord(null); setEditForm(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Classification */}
                            <div className="card">
                                <SectionHeader icon={Info} title="Classification" />
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="form-group">
                                        <label className="form-label flex items-center gap-1"><Calendar size={11} />Call Date</label>
                                        <DateOverlay value={editForm.date}>
                                            <input type="date" name="date" value={editForm.date} onChange={handleEditChange}
                                                onClick={(e) => (e.target as any).showPicker?.()}
                                                className="form-input" />
                                        </DateOverlay>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Product</label>
                                        <select name="product_id" value={editForm.product_id} onChange={handleEditChange} className="form-select">
                                            <option value="">Select Product</option>
                                            {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Industry</label>
                                        <select name="industry_id" value={editForm.industry_id} onChange={handleEditChange} className="form-select">
                                            <option value="">Select Industry</option>
                                            {industries?.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Source of Database</label>
                                        <select name="source_of_db_id" value={editForm.source_of_db_id} onChange={handleEditChange} className="form-select">
                                            <option value="">Select Source</option>
                                            {dbSources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Company & Contact */}
                            <div className="card">
                                <SectionHeader icon={Briefcase} title="Company & Contact Details" />
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="form-group">
                                            <label className="form-label">Company Name <span className="text-danger">*</span></label>
                                            <input type="text" name="company_name" value={editForm.company_name} onChange={handleEditChange}
                                                placeholder="Enter company name"
                                                className={clsx('form-input', editErrors.company_name && 'form-input-error')} />
                                            {editErrors.company_name && <p className="form-error">{editErrors.company_name}</p>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label flex items-center gap-1"><MapPin size={11} />Location</label>
                                            <input type="text" name="location" value={editForm.location} onChange={handleEditChange} placeholder="City / Region" className="form-input" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="form-group">
                                            <label className="form-label">Contact Person Name</label>
                                            <input type="text" name="contact_person_name" value={editForm.contact_person_name} onChange={handleEditChange} placeholder="Full Name" className="form-input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Designation</label>
                                            <input type="text" name="designation" value={editForm.designation} onChange={handleEditChange} placeholder="Position" className="form-input" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="form-group">
                                            <label className="form-label flex items-center gap-1"><Mail size={11} />Company Email</label>
                                            <input type="text" name="email_address" value={editForm.email_address} onChange={handleEditChange} placeholder="company@example.com" className="form-input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label flex items-center gap-1"><Mail size={11} />Personal Email</label>
                                            <input type="text" name="personal_email" value={editForm.personal_email} onChange={handleEditChange} placeholder="personal@example.com" className="form-input" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="form-group">
                                            <label className="form-label flex items-center gap-1"><Phone size={11} />Mobile No</label>
                                            <input type="text" name="mobile_no" value={editForm.mobile_no} onChange={handleEditChange} placeholder="Mobile Number" className="form-input" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Engagement & Outcome */}
                            <div className="card">
                                <SectionHeader icon={Calendar} title="Engagement & Outcome" />
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="form-group">
                                            <label className="form-label">Business Potential</label>
                                            <input type="text" name="business_potential" value={editForm.business_potential} onChange={handleEditChange} placeholder="Count / Value" className="form-input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Email Status</label>
                                            <select name="email_status_id" value={editForm.email_status_id} onChange={handleEditChange} className="form-select">
                                                <option value="">Select Status</option>
                                                {emailStatuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                                        <label className={clsx('flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors',
                                            editForm.linkedin_sent ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}>
                                            <div className="flex items-center gap-3">
                                                <Linkedin size={18} className={editForm.linkedin_sent ? 'text-[#0A66C2]' : 'text-slate-400'} />
                                                <span className="text-sm font-medium text-slate-700">LinkedIn Connection Sent</span>
                                            </div>
                                            <input type="checkbox" name="linkedin_sent" checked={editForm.linkedin_sent} onChange={handleEditChange}
                                                className="w-4 h-4 rounded text-primary-600 border-slate-300" />
                                        </label>
                                        <div className="form-group">
                                            <label className="form-label">Call Status</label>
                                            <select name="call_status_id" value={editForm.call_status_id} onChange={handleEditChange} className="form-select">
                                                <option value="">Select Call Status</option>
                                                {callStatuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Remarks</label>
                                        <textarea name="remarks" value={editForm.remarks} onChange={handleEditChange} rows={3}
                                            placeholder="Call summary, key points discussed..." className="form-textarea" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                                        <div className="form-group">
                                            <label className="form-label text-amber-600">
                                                Next Follow Up Date {isFollowUpRequired && <span className="text-danger">*</span>}
                                            </label>
                                            <DateOverlay value={editForm.next_follow_up_date}>
                                                <input type="date" name="next_follow_up_date" value={editForm.next_follow_up_date} onChange={handleEditChange}
                                                    onClick={(e) => (e.currentTarget as any).showPicker?.()}
                                                    min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
                                                    className="form-input border-amber-200 focus:ring-amber-200 focus:border-amber-400" />
                                            </DateOverlay>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label text-primary-600">Moved to Quadrant</label>
                                            <select name="moved_to_quad" value={editForm.moved_to_quad} onChange={handleEditChange}
                                                className="form-select border-primary-200 focus:ring-primary-200">
                                                <option value="">No</option>
                                                <option value="yes">Yes</option>
                                            </select>
                                            {editForm.moved_to_quad === 'yes' && (
                                                <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1.5">
                                                    <CheckCircle size={11} />
                                                    Lead will be created automatically upon saving.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                            {editForm?.call_status_id ? (
                                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                                    <Info size={12} />
                                    Saving will claim this record and move it to your Call Tracker.
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <Info size={12} />
                                    Record will remain in DB Upload. Set a Call Status to move it to Call Tracker.
                                </p>
                            )}
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setEditRecord(null); setEditForm(null); }} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button onClick={handleSaveEdit} disabled={isSavingEdit} className="btn btn-primary disabled:opacity-50">
                                    {isSavingEdit ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    {isSavingEdit
                                        ? (editForm?.call_status_id ? 'Claiming…' : 'Saving…')
                                        : (editForm?.call_status_id ? 'Claim & Save' : 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
