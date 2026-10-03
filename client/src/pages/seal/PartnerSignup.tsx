import { useState, useEffect } from 'react';
import { Plus, Search, User, Edit, Trash2, TrendingUp, MapPin, Briefcase, Eye, X, Filter, Package, ArrowLeft, UserCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';
import DateOverlay from '../../components/DateOverlay';

const QUADRANT_BADGE: Record<string, string> = {
    Q4: 'badge-red', Q3: 'badge-orange', Q2: 'badge-blue', Q1: 'badge-gray',
};

export default function PartnerSignup() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();

    const { filters: pf, setFilters: setPf, resetFilters } = usePersistentFilters('partners', {
        sel_product_id: 0,
        searchQuery: '',
        selectedExecutive: '',
        selectedQuadrant: '',
        searchCompany: '',
        searchName: '',
        fromDate: '',
        toDate: '',
    });

    const selectedProductId = pf.sel_product_id || null;
    const isSelected = !!selectedProductId;
    const isAdminOrManager = authUser?.role === 'CEO' || authUser?.role === 'SalesManager';

    const searchQuery          = pf.searchQuery;
    const setSearchQuery       = (v: string) => setPf({ searchQuery: v });
    const selectedExecutive    = pf.selectedExecutive;
    const setSelectedExecutive = (v: string) => setPf({ selectedExecutive: v });
    const selectedQuadrant     = pf.selectedQuadrant;
    const setSelectedQuadrant  = (v: string) => setPf({ selectedQuadrant: v });
    const searchCompany        = pf.searchCompany;
    const setSearchCompany     = (v: string) => setPf({ searchCompany: v });
    const searchName           = pf.searchName;
    const setSearchName        = (v: string) => setPf({ searchName: v });
    const fromDate             = pf.fromDate;
    const setFromDate          = (v: string) => setPf({ fromDate: v });
    const toDate               = pf.toDate;
    const setToDate            = (v: string) => setPf({ toDate: v });

    const [viewPartner, setViewPartner] = useState<any>(null);
    const [page, setPage] = useState(1);
    const pageSize = 20;

    /* ── Mapped products from Product Master ── */
    const { data: mappedItems = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['poas', 'mapped-products', authUser?.id],
        queryFn: () => api.get('/seal/poas/mapped-products').then(r => r.data),
        staleTime: 5 * 60 * 1000,
        enabled: !!authUser?.id,
    });

    /* ── Auto-select first mapped product on load ── */
    useEffect(() => {
        if (mappedItems.length > 0 && !pf.sel_product_id) {
            setPf({ sel_product_id: Number(mappedItems[0].id) });
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Task 8: Auto-default BDE filter to logged-in user on every page open ── */
    useEffect(() => {
        if (isAdminOrManager && authUser?.id && !pf.selectedExecutive) {
            setPf({ selectedExecutive: String(authUser.id) });
        }
    }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── BDE list scoped to selected product (admin/manager only) ── */
    const { data: bdes = [] } = useQuery({
        queryKey: ['partners', 'mapped-bdes', authUser?.id, pf.sel_product_id],
        queryFn: () => api.get('/seal/poas/mapped-bdes', {
            params: { productId: String(pf.sel_product_id) }
        }).then(r => r.data),
        enabled: isAdminOrManager && isSelected,
    });

    /* ── Partners — gated on product selection ── */
    const { data: partners, isLoading } = useQuery({
        queryKey: ['partners', pf.sel_product_id],
        queryFn: () => api.get('/seal/partners', {
            params: { product_id: pf.sel_product_id }
        }).then(res => res.data),
        enabled: isSelected,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/seal/partners/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners'] })
    });

    const handleEditClick = (partner: any) => navigate(`/partner-signup/${partner.id}/edit`);

    const handleDeleteClick = (id: number) => {
        if (window.confirm('Are you sure you want to delete this partner record?')) deleteMutation.mutate(id);
    };

    const calculateAge = (startDate: any) => {
        if (!startDate) return '—';
        return `${dayjs().diff(dayjs(startDate), 'day')} days`;
    };

    const formatDate = (date: any) => date ? dayjs(date).format('DD/MM/YYYY') : '—';

    const selectedProductName = mappedItems.find(m => String(m.id) === String(pf.sel_product_id))?.name || '';

    const filteredPartners = partners?.filter((p: any) => {
        const matchesGlobal = !searchQuery ||
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.partner_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.region?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesExecutive = !selectedExecutive || String(p.user_id) == String(selectedExecutive);
        const matchesQuadrant  = !selectedQuadrant || p.quadrant === selectedQuadrant;
        const matchesCompany   = !searchCompany || p.partner_company?.toLowerCase().includes(searchCompany.toLowerCase());
        const matchesName      = !searchName || p.name?.toLowerCase().includes(searchName.toLowerCase());
        const partnerDate = p.enquiry_interest_date ? dayjs(p.enquiry_interest_date) : null;
        const matchesFromDate = !fromDate || !partnerDate || !partnerDate.isValid() || partnerDate.isSame(dayjs(fromDate), 'day') || partnerDate.isAfter(dayjs(fromDate));
        const matchesToDate   = !toDate   || !partnerDate || !partnerDate.isValid() || partnerDate.isSame(dayjs(toDate),   'day') || partnerDate.isBefore(dayjs(toDate));
        return matchesGlobal && matchesExecutive && matchesQuadrant && matchesCompany && matchesName && matchesFromDate && matchesToDate;
    }) || [];

    useEffect(() => { setPage(1); }, [searchQuery, selectedExecutive, selectedQuadrant, searchCompany, searchName, fromDate, toDate, pf.sel_product_id]);

    const totalCount = filteredPartners.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedPartners = filteredPartners.slice((safePage - 1) * pageSize, safePage * pageSize);

    const columns: TableColumn<any>[] = [
        { key: 'idx', header: '#', align: 'center', render: (_p, i) => <span className="text-slate-400">{(safePage - 1) * pageSize + i + 1}</span> },
        {
            key: 'executive', header: 'Executive', render: partner => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {partner.user?.first_name?.[0]}{partner.user?.last_name?.[0]}
                    </div>
                    <span className="text-xs text-slate-700">{partner.user?.first_name} {partner.user?.last_name}</span>
                </div>
            ),
        },
        {
            key: 'partner_company', header: 'Partner Company', render: partner => (
                <div className="flex items-center gap-1.5">
                    <Briefcase size={13} className="text-slate-300 shrink-0" />
                    <span className="font-semibold text-slate-900">{partner.partner_company || '—'}</span>
                </div>
            ),
        },
        { key: 'name', header: 'Partner Name', className: 'font-medium text-primary-700', render: partner => partner.name },
        {
            key: 'region', header: 'Region', align: 'center', render: partner => (
                <div className="flex items-center justify-center gap-1 text-slate-500">
                    <MapPin size={11} className="text-slate-300" />
                    <span className="text-xs">{partner.region || '—'}</span>
                </div>
            ),
        },
        {
            key: 'quadrant', header: 'Quadrant', align: 'center', render: partner => (
                <span className={clsx('badge', QUADRANT_BADGE[partner.quadrant] || 'badge-gray')}>{partner.quadrant || 'Q1'}</span>
            ),
        },
        {
            key: 'lead_score', header: 'Lead Score', align: 'center', render: partner => (
                <div className="flex items-center justify-center gap-1">
                    <span className="font-bold text-slate-900">{partner.current_lead_score || 0}</span>
                    <TrendingUp size={12} className="text-emerald-500" />
                </div>
            ),
        },
        {
            key: 'age', header: 'Age of Enquiry', align: 'center', render: partner => (
                <span className="text-xs font-semibold text-primary-600">{calculateAge(partner.enquiry_interest_date)}</span>
            ),
        },
        { key: 'active_leads', header: 'Active Leads', align: 'center', className: 'font-semibold text-slate-700', render: partner => partner.active_leads_moved_to_quadrant || 0 },
        {
            key: 'actions', header: 'Actions', align: 'right', render: partner => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setViewPartner(partner)} className="btn btn-ghost btn-sm btn-icon text-emerald-600 hover:bg-emerald-50" title="Quick View">
                        <Eye size={14} />
                    </button>
                    <button onClick={() => handleEditClick(partner)} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Edit">
                        <Edit size={14} />
                    </button>
                    {(String(authUser?.role).toUpperCase() === 'CEO' || String(authUser?.role).toUpperCase() === 'ADMIN') && (
                        <button onClick={() => handleDeleteClick(partner.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="page-wrapper">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <User size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Partner Sign-up Module</h1>
                        <p className="page-subtitle">End-to-end partner onboarding, engagement, and performance lifecycle</p>
                    </div>
                </div>
                {isSelected && (
                    <button
                        onClick={() => {
                            const params = new URLSearchParams();
                            params.set('product_id', String(pf.sel_product_id));
                            params.set('context_name', selectedProductName);
                            navigate(`/partner-signup/new?${params.toString()}`);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={15} />
                        New Partner
                    </button>
                )}
            </div>

            {/* Product Selection Bar */}
            <div className="card p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="form-group min-w-[240px]">
                        <label className="form-label flex items-center gap-1">
                            <Package size={10} />
                            Product *
                        </label>
                        <select
                            value={pf.sel_product_id ? String(pf.sel_product_id) : ''}
                            onChange={e => setPf({
                                sel_product_id: Number(e.target.value) || 0,
                                selectedExecutive: '',
                                searchQuery: '',
                                searchCompany: '',
                                searchName: '',
                                selectedQuadrant: '',
                                fromDate: '',
                                toDate: '',
                            })}
                            className="form-select font-semibold text-primary-700"
                        >
                            <option value="">— Select Product —</option>
                            {mappedItems.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* BDE filter — Admin/Manager only, after product selected */}
                    {isAdminOrManager && isSelected && (
                        <div className="form-group min-w-[200px]">
                            <label className="form-label flex items-center gap-1">
                                <UserCircle size={10} />
                                BDE Filter
                            </label>
                            <select
                                value={selectedExecutive}
                                onChange={e => setSelectedExecutive(e.target.value)}
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
                    {isSelected && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold bg-primary-50 border-primary-100 text-primary-700 mb-0.5">
                            <Package size={13} />
                            {selectedProductName}
                        </div>
                    )}
                </div>
            </div>

            {/* Empty state when no product selected */}
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
                                : 'Choose a product from the dropdown above to view partner records or create new ones.'}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Filters */}
                    <div className="card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Filter size={14} className="text-primary-600" />
                                Advanced Filters
                            </div>
                            <button onClick={resetFilters} className="text-xs font-semibold text-primary-600 hover:text-primary-700">Reset All</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Global search..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="form-input pl-8"
                                />
                            </div>
                            <select value={selectedQuadrant} onChange={e => setSelectedQuadrant(e.target.value)} className="form-select">
                                <option value="">All Quadrants</option>
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                            </select>
                            <input type="text" placeholder="Partner company..." value={searchCompany} onChange={e => setSearchCompany(e.target.value)} className="form-input" />
                            <input type="text" placeholder="Partner name..." value={searchName} onChange={e => setSearchName(e.target.value)} className="form-input" />
                            <div className="flex items-center gap-1.5">
                                <DateOverlay value={fromDate} wrapperClassName="flex-1 min-w-0" textClassName="pl-3 text-xs text-slate-900">
                                    <input type="date" value={fromDate} title="From Date" onChange={e => setFromDate(e.target.value)} className="form-input text-xs w-full" />
                                </DateOverlay>
                                <span className="text-slate-400 text-xs shrink-0">—</span>
                                <DateOverlay value={toDate} wrapperClassName="flex-1 min-w-0" textClassName="pl-3 text-xs text-slate-900">
                                    <input type="date" value={toDate} title="To Date" onChange={e => setToDate(e.target.value)} className="form-input text-xs w-full" />
                                </DateOverlay>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card overflow-hidden">
                        <Table
                            columns={columns}
                            data={pagedPartners}
                            getRowKey={partner => partner.id}
                            isLoading={isLoading}
                            skeletonRows={5}
                            maxHeight="max-h-[65vh]"
                            emptyIcon={<TrendingUp size={22} className="text-slate-400" />}
                            emptyTitle="No partners match your filters"
                            emptySubtitle="Clear all filters to see all partners."
                        />
                        {filteredPartners.length > 0 && (
                            <>
                                <TablePagination
                                    page={safePage}
                                    totalPages={totalPages}
                                    totalCount={totalCount}
                                    pageSize={pageSize}
                                    onPageChange={setPage}
                                    isLoading={isLoading}
                                    itemLabel="partners"
                                />
                                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <TrendingUp size={13} className="text-primary-600" />
                                        <span>Total: <strong>{filteredPartners.length}</strong> partners</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Q4: Hot</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Q3: Warm</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Q2: Progressing</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400" /> Q1: Interested</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* View Modal */}
            {viewPartner && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-4xl">
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0">
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">{viewPartner.partner_company}</h2>
                                    <p className="text-xs text-slate-500">{viewPartner.name} • {viewPartner.region}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewPartner(null)} className="btn btn-ghost btn-icon">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6 max-h-[60vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider border-b border-primary-50 pb-2">Engagement Lifecycle</h4>
                                    <DetailItem label="Enquiry Date" value={formatDate(viewPartner.enquiry_interest_date)} />
                                    <DetailItem label="Quadrant Date" value={formatDate(viewPartner.quadrant_allotted_date)} />
                                    <DetailItem label="Age of Enquiry" value={calculateAge(viewPartner.enquiry_interest_date)} highlight />
                                    <DetailItem label="Age in Quadrant" value={calculateAge(viewPartner.quadrant_allotted_date)} highlight />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Performance & Scoring</h4>
                                    <DetailItem label="Quadrant" value={viewPartner.quadrant} badge />
                                    <DetailItem label="Lead Score" value={viewPartner.current_lead_score} />
                                    <DetailItem label="Partner Type" value={viewPartner.partner_type} />
                                    <DetailItem label="Active Leads" value={viewPartner.active_leads_moved_to_quadrant} />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider border-b border-emerald-50 pb-2">Milestone Status</h4>
                                    <BooleanItem label="RFI Received" value={viewPartner.is_rfi_received} />
                                    <BooleanItem label="BP Submitted" value={viewPartner.is_business_plan_submitted} />
                                    <BooleanItem label="BP Target Agreed" value={viewPartner.is_business_plan_target_agreed} />
                                    {viewPartner.is_business_plan_target_agreed && (
                                        <DetailItem label="Target Value" value={`$${viewPartner.business_plan_target_value}`} />
                                    )}
                                    <BooleanItem label="Training Provided" value={viewPartner.is_training_provided} />
                                    <BooleanItem label="Engagement Started" value={viewPartner.is_monthly_engagement_started} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Partner Action PoA</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {viewPartner.partner_action_poa || 'No plan of action documented.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setViewPartner(null)} className="btn btn-secondary">Close</button>
                            <button
                                onClick={() => { handleEditClick(viewPartner); setViewPartner(null); }}
                                className="btn btn-primary"
                            >
                                <Edit size={14} />
                                Edit Full Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value, highlight, badge }: { label: string; value: any; highlight?: boolean; badge?: boolean }) {
    return (
        <div>
            <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
            <span className={clsx(
                'block text-sm font-semibold',
                highlight ? 'text-primary-600' : 'text-slate-800',
                badge && 'inline-block badge badge-blue'
            )}>
                {value || '—'}
            </span>
        </div>
    );
}

function BooleanItem({ label, value }: { label: string; value: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{label}</span>
            <span className={clsx('badge', value ? 'badge-green' : 'badge-gray')}>
                {value ? 'Done' : 'Pending'}
            </span>
        </div>
    );
}
