import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, RefreshCcw, Eye, PencilLine, Plus, CalendarRange, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { useSealFilters } from '../../context/SealFilterContext';
import api from '../../services/api';
import dayjs from 'dayjs';
import WeeklyReportForm from './WeeklyReportForm';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import DateOverlay from '../../components/DateOverlay';

interface MappedItem {
    id: number | string;
    name: string;
}

export default function WeeklySummary() {
    const { user: authUser } = useAuth();
    const { companyId: selectedCompanyId, productId: selectedProductId, bdeId: selectedBdeId, setCompanyId, setProductId, setBdeId } = useSealFilters();

    const { filters: sf, setFilters: setSf } = usePersistentFilters('weekly', {
        from_date: '',
        to_date: '',
    });

    const userId   = selectedBdeId ? String(selectedBdeId) : '';
    const fromDate = String(sf.from_date);
    const toDate   = String(sf.to_date);

    const [isFormOpen, setIsFormOpen]       = useState(false);
    const [modalMode, setModalMode]         = useState<'add' | 'edit' | 'view'>('add');
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [notesTooltip, setNotesTooltip]   = useState<{ text: string; x: number; y: number } | null>(null);

    const isSelected = !!selectedProductId;

    /* ── BU Company options (Global Company filter — narrows the Product list) ── */
    const { data: companies = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['seal-companies'],
        queryFn: () => api.get('/masters/company').then(r => (r.data as any[]).filter(c => c.is_active !== false)),
        staleTime: 5 * 60 * 1000,
    });

    /* ── Mapped products for current user (Global Product filter options) ── */
    const { data: mappedItems = [] } = useQuery<MappedItem[]>({
        queryKey: ['seal-mapped-products', authUser?.id, selectedCompanyId],
        queryFn: () => api.get('/seal/poas/mapped-products', {
            params: selectedCompanyId ? { company_id: selectedCompanyId } : {},
        }).then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    // Auto-select first mapped product only when no product is persisted globally
    useEffect(() => {
        if (mappedItems.length > 0 && !selectedProductId) {
            setProductId(Number(mappedItems[0].id));
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedProduct = mappedItems.find(m => String(m.id) === String(selectedProductId));

    /* ── BDEs mapped to the selected product (Global BDE filter options) ── */
    const { data: bdes = [] } = useQuery({
        queryKey: ['seal-bdes', selectedProductId, selectedCompanyId],
        enabled: isSelected,
        queryFn: () => api.get('/seal/bdes', {
            params: { product_id: selectedProductId, ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}) },
        }).then(r => r.data),
    });

    const { data: reports = [], isLoading, refetch, isFetching } = useQuery({
        queryKey: ['weekly-reports', userId, fromDate, toDate, selectedProductId, selectedCompanyId],
        queryFn: () => api.get('/seal/weekly-reports', {
            params: {
                user_id: userId,
                from_date: fromDate,
                to_date: toDate,
                product_id: selectedProductId,
                ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
            }
        }).then(res => res.data),
        enabled: isSelected
    });

    const handleFilterChange = (key: string, value: string) => {
        setSf({ [key]: value } as any);
    };

    const handleAdd = () => { setModalMode('add'); setSelectedReport(null); setIsFormOpen(true); };
    const handleView = (report: any) => { setModalMode('view'); setSelectedReport(report); setIsFormOpen(true); };
    const handleEdit = (report: any) => { setModalMode('edit'); setSelectedReport(report); setIsFormOpen(true); };

    // Maps a PREVIOUS-week metric to the quadrant a lead should be in if the move was completed
    const targetQuadrantMap: Record<string, string> = {
        Q3_TO_Q4: 'Q4',
        Q2_TO_Q3: 'Q3',
        Q1_TO_Q2: 'Q2',
    };

    const leadName = (l: any) =>
        l.company_master?.name || l.company_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || `Lead #${l.id}`;

    // For PREVIOUS week cells: returns colored JSX spans based on movement completion
    const getPrevDetailJSX = (report: any, metric: string) => {
        if (!report.details || !Array.isArray(report.details)) return <span className="text-slate-400">—</span>;
        const items = report.details.filter((d: any) => d.type === 'PREVIOUS' && d.metric === metric);
        if (metric === 'NOTES') return <span className="italic text-slate-500">{items[0]?.value || '—'}</span>;
        if (items.length === 0) return <span className="text-slate-400">—</span>;

        const targetQ = targetQuadrantMap[metric]; // e.g. 'Q4' for Q3_TO_Q4

        return (
            <span className="flex flex-col gap-0.5">
                {items.map((d: any, i: number) => {
                    const l = d.lead;
                    const name = l ? leadName(l) : `Lead #${d.lead_id}`;

                    let moved = false;
                    if (l) {
                        if (metric === 'Q4_TO_ORDER') {
                            // Converted to order if order_value is non-zero
                            moved = !!(l.order_value && Number(l.order_value) > 0);
                        } else if (targetQ) {
                            moved = l.quadrant === targetQ;
                        }
                    }

                    return (
                        <span
                            key={i}
                            className={clsx(
                                'font-semibold text-xs',
                                moved ? 'text-emerald-600' : 'text-red-500'
                            )}
                            title={moved ? 'Movement completed' : 'Movement not yet completed'}
                        >
                            {name}
                        </span>
                    );
                })}
            </span>
        );
    };

    // For CURRENT week cells: plain display, no status coloring
    const getCurrDetailDisplay = (report: any, metric: string) => {
        if (!report.details || !Array.isArray(report.details)) return '—';
        const items = report.details.filter((d: any) => d.type === 'CURRENT' && d.metric === metric);
        if (metric === 'NOTES') return items[0]?.value || '—';
        if (items.length === 0) return '—';
        return items.map((d: any) => {
            const l = d.lead;
            if (!l) return 'Lead #' + d.lead_id;
            return leadName(l);
        }).join(', ');
    };


    return (
        <div className="page-wrapper">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <CalendarRange size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Weekly Progress Summary</h1>
                        <p className="page-subtitle">Monitor and plan vendor lead funnel quadrant transitions</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="btn btn-ghost btn-icon"
                    >
                        <RefreshCcw size={15} className={clsx(isFetching && 'animate-spin')} />
                    </button>
                    {isSelected && (
                        <button onClick={handleAdd} className="btn btn-primary">
                            <Plus size={15} />
                            Add Weekly Report
                        </button>
                    )}
                </div>
            </div>

            {/* Filters — Global (SEAL-wide) vs Local (this page) */}
            <div className="card p-0 overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                    {/* ── Global: Company / Product / BDE — shared by every SEAL page ── */}
                    <div className="bg-primary-50/40 p-4 border-b lg:border-b-0 lg:border-r border-slate-200">
                        <div className="flex items-center gap-1.5 mb-3">
                            <ShieldCheck size={12} className="text-primary-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600">SEAL Filters</span>
                            <span className="text-[10px] text-slate-400 normal-case font-medium">· apply across all SEAL pages</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="form-label mb-0">Company:</label>
                                <select
                                    value={selectedCompanyId ? String(selectedCompanyId) : ''}
                                    onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
                                    className="form-select w-52"
                                >
                                    <option value="">All Companies</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="form-label mb-0">Product:</label>
                                <select
                                    value={selectedProductId ? String(selectedProductId) : ''}
                                    onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
                                    className="form-select w-64 font-semibold text-primary-600"
                                >
                                    <option value="">— Select Product —</option>
                                    {mappedItems.map(m => (
                                        <option key={m.id} value={String(m.id)}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            {isSelected && (
                                <div className="flex items-center gap-2">
                                    <label className="form-label mb-0">Executive:</label>
                                    <select
                                        value={userId}
                                        onChange={e => setBdeId(e.target.value ? Number(e.target.value) : null)}
                                        className="form-select w-44"
                                    >
                                        <option value="">All</option>
                                        {bdes.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Local: date range — this page only ── */}
                    {isSelected && (
                        <div className="p-4 flex-1">
                            <div className="flex items-center gap-1.5 mb-3">
                                <SlidersHorizontal size={12} className="text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Page Filters</span>
                                <span className="text-[10px] text-slate-400 normal-case font-medium">· this page only</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="form-label mb-0">From:</label>
                                    <DateOverlay value={fromDate}>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={e => handleFilterChange('from_date', e.target.value)}
                                            onClick={e => (e.target as any).showPicker?.()}
                                            className="form-input w-36"
                                        />
                                    </DateOverlay>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="form-label mb-0">To:</label>
                                    <DateOverlay value={toDate}>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={e => handleFilterChange('to_date', e.target.value)}
                                            onClick={e => (e.target as any).showPicker?.()}
                                            className="form-input w-36"
                                        />
                                    </DateOverlay>
                                </div>
                                {(fromDate || toDate) && (
                                    <button
                                        onClick={() => setSf({ from_date: '', to_date: '' })}
                                        className="text-xs font-semibold text-primary-600 hover:text-red-500 transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!isSelected ? (
                <div className="card p-12 text-center bg-slate-50/50 border-dashed">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <CalendarRange size={24} className="text-primary-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Select a Product</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Please choose a product from the dropdown above to view the weekly progress summary.
                    </p>
                </div>
            ) : (
                /* Table and content remains but now wrapped in isSelected check */
                <div className="card overflow-hidden">
                    {/* ... existing table code ... */}
                <div className="card-header flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-800"> Lead Funnel Quadrant Progress Summary</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            Previous week movement completed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                            Movement not yet completed
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th rowSpan={2} className="w-14 border-r border-slate-200 py-3 px-3 font-semibold text-center">#</th>
                                <th rowSpan={2} className="w-28 border-r border-slate-200 py-3 px-3 font-semibold text-center">Date</th>
                                <th rowSpan={2} className="w-40 border-r border-slate-200 py-3 px-4 font-semibold text-left">Sales Executive</th>
                                <th rowSpan={2} className="w-40 border-r border-slate-200 py-3 px-4 font-semibold text-left">Product</th>
                                <th colSpan={5} className="border-r border-slate-200 py-2 px-4 font-semibold text-emerald-700 bg-emerald-50 text-center border-b border-emerald-100">PREVIOUS WEEK</th>
                                <th colSpan={5} className="border-r border-slate-200 py-2 px-4 font-semibold text-amber-700 bg-amber-50 text-center border-b border-amber-100">CURRENT WEEK PLAN</th>
                                <th rowSpan={2} className="w-20 py-3 px-4 font-semibold text-center">Actions</th>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400">
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q4 to Order</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q3 to Q4</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q2 to Q3</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q1 to Q2</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center">Weekly Summary</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q4 to Order</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q3 to Q4</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q2 to Q3</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center w-24">Q1 to Q2</th>
                                <th className="border-r border-slate-200 py-2 px-3 font-semibold text-center">Weekly Summary</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={15} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                                            <p className="text-sm text-slate-400">Loading reports...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={15}>
                                        <div className="empty-state">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                                <Calendar size={16} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">No weekly reports found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or add a new report.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                [...reports].sort((a: any, b: any) => b.id - a.id).map((row: any, index: number) => (
                                    <tr key={row.id} className="table-tr">
                                        <td className="border-r border-slate-100 py-4 px-3 text-center text-slate-400 font-medium">{index + 1}</td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center font-medium text-slate-800">
                                            {dayjs(row.date).format('DD/MM/YYYY')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                                    {row.user?.first_name?.[0]}{row.user?.last_name?.[0]}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-800">{row.user?.first_name} {row.user?.last_name}</span>
                                            </div>
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-4">
                                            <span className="text-xs font-medium text-slate-600">
                                                {selectedProduct?.name || '—'}
                                            </span>
                                        </td>

                                        {/* Previous Week — colored by movement completion */}
                                        <td className="border-r border-slate-100 py-4 px-3 text-center bg-emerald-50/30">
                                            {getPrevDetailJSX(row, 'Q4_TO_ORDER')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center bg-emerald-50/30">
                                            {getPrevDetailJSX(row, 'Q3_TO_Q4')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center bg-emerald-50/30">
                                            {getPrevDetailJSX(row, 'Q2_TO_Q3')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center bg-emerald-50/30">
                                            {getPrevDetailJSX(row, 'Q1_TO_Q2')}
                                        </td>
                                        <td
                                            className="border-r border-slate-100 py-4 px-3 bg-emerald-50/30 max-w-[140px] cursor-default"
                                            onMouseEnter={e => {
                                                const val = row.details?.find((d: any) => d.type === 'PREVIOUS' && d.metric === 'NOTES')?.value;
                                                if (val && val.length > 40) {
                                                    const r = e.currentTarget.getBoundingClientRect();
                                                    setNotesTooltip({ text: val, x: r.left, y: r.top });
                                                }
                                            }}
                                            onMouseLeave={() => setNotesTooltip(null)}
                                        >
                                            <span className="italic text-slate-500 text-xs line-clamp-2 block">
                                                {row.details?.find((d: any) => d.type === 'PREVIOUS' && d.metric === 'NOTES')?.value || '—'}
                                            </span>
                                        </td>

                                        {/* Current Week — plain display */}
                                        <td className="border-r border-slate-100 py-4 px-3 text-center font-medium text-slate-800 bg-amber-50/30">
                                            {getCurrDetailDisplay(row, 'Q4_TO_ORDER')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center font-medium text-slate-800 bg-amber-50/30">
                                            {getCurrDetailDisplay(row, 'Q3_TO_Q4')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center font-medium text-slate-800 bg-amber-50/30">
                                            {getCurrDetailDisplay(row, 'Q2_TO_Q3')}
                                        </td>
                                        <td className="border-r border-slate-100 py-4 px-3 text-center font-medium text-slate-800 bg-amber-50/30">
                                            {getCurrDetailDisplay(row, 'Q1_TO_Q2')}
                                        </td>
                                        <td
                                            className="border-r border-slate-100 py-4 px-3 text-slate-700 bg-amber-50/30 max-w-[140px] cursor-default"
                                            onMouseEnter={e => {
                                                const val = row.details?.find((d: any) => d.type === 'CURRENT' && d.metric === 'NOTES')?.value;
                                                if (val && val.length > 40) {
                                                    const r = e.currentTarget.getBoundingClientRect();
                                                    setNotesTooltip({ text: val, x: r.left, y: r.top });
                                                }
                                            }}
                                            onMouseLeave={() => setNotesTooltip(null)}
                                        >
                                            <span className="text-xs line-clamp-2 block">
                                                {getCurrDetailDisplay(row, 'NOTES')}
                                            </span>
                                        </td>

                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleView(row)}
                                                    className="btn btn-ghost btn-sm btn-icon text-primary-600"
                                                    title="View Full Report"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(row)}
                                                    className="btn btn-ghost btn-sm btn-icon text-amber-600 hover:bg-amber-50"
                                                    title="Edit Plan"
                                                >
                                                    <PencilLine size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

            <WeeklyReportForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                mode={modalMode}
                report={selectedReport}
                productId={selectedProductId ? String(selectedProductId) : undefined}
            />

            {notesTooltip && createPortal(
                <div style={{
                    position: 'fixed', top: notesTooltip.y - 12, left: notesTooltip.x,
                    transform: 'translateY(-100%)', zIndex: 99999,
                    pointerEvents: 'none', maxWidth: '300px',
                    background: '#1e293b', color: '#fff', fontSize: '12px',
                    borderRadius: '8px', padding: '10px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6',
                }}>
                    {notesTooltip.text}
                    <div style={{
                        position: 'absolute', top: '100%', left: '16px',
                        width: 0, height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #1e293b',
                    }} />
                </div>,
                document.body
            )}
        </div>
    );
}
