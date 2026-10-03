import React from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import api from '../services/api';
import {
    Search,
    FileSpreadsheet, TrendingUp, BarChart2, DollarSign,
    X, RefreshCw, Eye, Edit, MapPin,
} from 'lucide-react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { SearchableMultiSelect } from '../components/FilterDropdown';
import clsx from 'clsx';
import Table, { type TableColumn } from '../components/Table';
import TablePagination from '../components/TablePagination';
import DateOverlay from '../components/DateOverlay';

interface LeadReportProps {
    category: 'Product';
    title: string;
}

const QUADRANT_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4', 'Nurturing', 'Order Won', 'Order Lost'].map(q => ({ value: q, label: q }));

/* ── Quadrant badge colours ── */
const QUADRANT_STYLES: Record<string, string> = {
    Q1: 'badge-blue', Q2: 'badge-amber', Q3: 'badge-orange',
    Q4: 'badge-green', Nurturing: 'badge-purple', 'Order Won': 'badge-emerald', 'Order Lost': 'badge-red',
};
const qBadge = (q: string) => QUADRANT_STYLES[q] ?? 'badge-gray';

/* ── Avatar colour ── */
const AVATAR_PALETTES = [
    'bg-blue-100   text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100  text-amber-700',
    'bg-rose-100   text-rose-700',
    'bg-cyan-100   text-cyan-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-teal-100   text-teal-700',
];
const avatarColor = (name: string) =>
    AVATAR_PALETTES[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTES.length];

/* ── Age badge ── */
const AgeBadge = ({ days }: { days: number }) => (
    <span className={clsx('badge', days > 15 ? 'badge-red' : days > 7 ? 'badge-orange' : 'badge-green')}>
        {days}d
    </span>
);

const calculateAgeInDays = (date: any) =>
    Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);

/* ── Dynamic BANT badges ── */
const BANT_CODES = ['B', 'A', 'N', 'T'];
const BANT_NAMES = ['Budget', 'Authority', 'Need', 'Timeline'];
const BANT_YES_NO_KEYS = ['budget_yes_no', 'authority_yes_no', 'need_yes_no', 'timeline_yes_no'];
const BANT_DETAIL_FIELDS: Record<string, { label: string; key: string }[]> = {
    B: [{ label: 'Allocated', key: 'budget_allocated' }, { label: 'Approval Stage', key: 'approval_stage' }],
    A: [{ label: 'Decision Maker', key: 'decision_maker' }],
    N: [{ label: 'Pain Points', key: 'pain_points_desc' }],
    T: [{ label: 'Expected Closure', key: 'expected_closure_date' }],
};

const DynamicBantBadges = ({ lead }: { lead: any }) => {
    const [tip, setTip] = React.useState<{ content: React.ReactNode; x: number; y: number } | null>(null);
    const answers: any[] = lead.bant_answers || [];

    const byCategory = React.useMemo(() => {
        const map: Record<string, any[]> = {};
        answers.forEach(a => {
            const raw = (a.category?.code || '').trim();
            const key = raw.toUpperCase().charAt(0);
            if (!key) return;
            if (!map[key]) map[key] = [];
            map[key].push(a);
        });
        return map;
    }, [answers]);

    const buildTooltip = (code: string, name: string, idx: number) => {
        const qualified: boolean = !!lead[BANT_YES_NO_KEYS[idx]];
        const details = BANT_DETAIL_FIELDS[code] || [];
        return (
            <div style={{ minWidth: '160px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '5px' }}>
                    <span>{name}</span>
                    <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
                        background: qualified ? '#10b981' : '#6b7280', color: '#fff', letterSpacing: '0.04em',
                    }}>
                        {qualified ? 'YES' : 'NO'}
                    </span>
                </div>
                {details.map(d => {
                    let val = lead[d.key];
                    if (!val) return null;
                    if (d.key === 'expected_closure_date') val = new Date(val).toLocaleDateString('en-GB');
                    return (
                        <div key={d.key} style={{ fontSize: '10px', marginBottom: '3px' }}>
                            <span style={{ opacity: 0.65 }}>{d.label}: </span>{val}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div className="flex flex-col gap-0.5">
                {BANT_CODES.map((code, i) => {
                    const qualified = !!lead[BANT_YES_NO_KEYS[i]];
                    return (
                        <span
                            key={code}
                            className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border cursor-default select-none',
                                qualified
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-300 border-slate-200',
                            )}
                            onMouseEnter={e => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setTip({ content: buildTooltip(code, BANT_NAMES[i], i), x: r.right + 8, y: r.top + r.height / 2 });
                            }}
                            onMouseLeave={() => setTip(null)}
                        >
                            {code}
                        </span>
                    );
                })}
            </div>
            {tip && createPortal(
                <div style={{
                    position: 'fixed', top: tip.y, left: tip.x,
                    transform: 'translateY(-50%)', zIndex: 99999,
                    pointerEvents: 'none', maxWidth: '280px',
                    background: '#1e293b', color: '#fff', fontSize: '11px',
                    borderRadius: '6px', padding: '8px 10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    lineHeight: '1.6',
                }}>
                    {tip.content}
                </div>,
                document.body,
            )}
        </>
    );
};

/* ════════════════════════════════════════════════════════════ */
export default function LeadReport({ category, title }: LeadReportProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    /* engagement* / excludeClosed drive the dashboard's Sales Activities cards —
       they arrive as query params and stay visible in the filter bar below. */
    const DEFAULTS = {
        startDate: '', endDate: '', ownerIds: '', quadrants: '', productIds: '', company: '',
        engagementFrom: '', engagementTo: '', engagementNotNull: '', excludeClosed: '', page: 1,
    };
    const { filters: pf, setFilters: setPf, resetFilters: resetAllFilters } =
        usePersistentFilters(`report-${category.toLowerCase()}-v2`, DEFAULTS);

    const filters = {
        startDate:  String(pf.startDate),
        endDate:    String(pf.endDate),
        ownerIds:   String(pf.ownerIds),
        quadrants:  String(pf.quadrants),
        productIds: String(pf.productIds),
        company:    String(pf.company),
        engagementFrom:    String(pf.engagementFrom),
        engagementTo:      String(pf.engagementTo),
        engagementNotNull: String(pf.engagementNotNull),
        excludeClosed:     String(pf.excludeClosed),
    };
    const page  = typeof pf.page === 'number' ? pf.page : Number(pf.page) || 1;
    const limit = 10;

    const setFilters = (updates: Partial<typeof filters>) => setPf({ ...updates, page: 1 } as any);
    const setPage    = (p: number | ((prev: number) => number)) => {
        const next = typeof p === 'function' ? p(page) : p;
        setPf({ page: Math.max(1, next) });
    };
    const resetFilters = () => resetAllFilters();

    /* ── Sales Engagement modal ── */
    const [viewEngagementLead, setViewEngagementLead] = React.useState<any>(null);

    /* ── Queries ── */
    const { data: users }    = useQuery({ queryKey: ['report-users-all'],   queryFn: async () => (await api.get('/users?all=true')).data });
    const { data: products } = useQuery({ queryKey: ['masters', 'product'], queryFn: async () => (await api.get('/masters/product')).data });

    const { data: reportData, isLoading, isFetching } = useQuery({
        queryKey: ['report-leads', category, filters, page],
        queryFn: async () => {
            const params = new URLSearchParams({ category });
            if (filters.startDate)  params.set('startDate',  filters.startDate);
            if (filters.endDate)    params.set('endDate',    filters.endDate);
            if (filters.ownerIds)   params.set('ownerIds',   filters.ownerIds.replace(/\s/g, ''));
            if (filters.quadrants)  params.set('quadrants',  filters.quadrants.replace(/\s/g, ''));
            if (filters.productIds) params.set('productIds', filters.productIds.replace(/\s/g, ''));
            if (filters.company)    params.set('company',    filters.company);
            if (filters.engagementFrom)    params.set('engagementFrom',    filters.engagementFrom);
            if (filters.engagementTo)      params.set('engagementTo',      filters.engagementTo);
            if (filters.engagementNotNull) params.set('engagementNotNull', filters.engagementNotNull);
            if (filters.excludeClosed)     params.set('excludeClosed',     filters.excludeClosed);
            params.set('page',  page.toString());
            params.set('limit', limit.toString());
            return (await api.get(`/reports/leads?${params.toString()}`)).data;
        },
    });

    const stats      = reportData?.stats || { totalLeads: 0, convertedLeads: 0, lostLeads: 0, totalExpectedRevenue: 0 };
    const leads: any[] = reportData?.leads || [];
    const totalCount   = reportData?.total ?? leads.length;
    const totalPages   = Math.ceil(totalCount / limit);

    const ownerVals   = filters.ownerIds.replace(/\s/g, '').split(',').filter(Boolean);
    const quadVals    = filters.quadrants.replace(/\s/g, '').split(',').filter(Boolean);
    const productVals = filters.productIds.replace(/\s/g, '').split(',').filter(Boolean);

    const activeCount = [filters.company, filters.ownerIds, filters.quadrants, filters.productIds,
        filters.startDate, filters.endDate, filters.engagementFrom, filters.engagementTo,
        filters.engagementNotNull, filters.excludeClosed].filter(Boolean).length;

    const exportToExcel = () => {
        if (!leads.length) return;
        const rows = leads.map((l: any) => ({
            'Created Date':      dayjs(l.created_at).format('DD/MM/YYYY'),
            'Enquiry Date':      l.enquiry_date ? dayjs(l.enquiry_date).format('DD/MM/YYYY') : 'N/A',
            'Lead Name':         l.company_name || l.company_master?.name || 'N/A',
            'Contact Name':      `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'N/A',
            'Contact Mobile':    l.mobile_number || 'N/A',
            'Contact Email':     l.email || 'N/A',
            'Product':           l.product?.name || 'N/A',
            'Project Name / Order Name': l.project_name || 'N/A',
            'Owner':             `${l.owner?.first_name} ${l.owner?.last_name || ''}`.trim(),
            'Stage':             l.sales_stage?.name || 'N/A',
            'Quadrant':          l.quadrant || 'N/A',
            'Source':            l.lead_source?.name || 'N/A',
            'Opportunity Value (INR)': l.opportunities_values || l.order_value || 0,
            'Order Value (INR)': l.opportunities_values || l.order_value || 0,
            'BANT Score':        l.lead_score || 0,
            'CP Score':          l.cp_score || 0,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const columns: TableColumn<any>[] = [
        {
            key: 'owner', header: 'Account Manager', width: 'w-32', render: lead => {
                const ownerName = `${lead.owner?.first_name ?? ''}${lead.owner?.last_name ?? ''}`;
                return (
                    <div className="flex items-center gap-2.5">
                        <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 select-none', avatarColor(ownerName))}>
                            {lead.owner?.first_name?.[0]?.toUpperCase()}
                            {lead.owner?.last_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-700 leading-tight">
                            {lead.owner?.first_name} {lead.owner?.last_name}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'company', header: 'Company / Contact', width: 'min-w-[200px]', className: 'whitespace-normal py-3', render: lead => {
                const contactName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
                const location = lead.city?.name || lead.company_master?.city || lead.state?.name;
                return (
                    <button onClick={() => navigate(`/leads/${lead.id}`)} className="text-left">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors leading-snug">
                            {lead.company_name || lead.company_master?.name || '—'}
                        </p>
                        {contactName && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{contactName}</p>}
                        {lead.job_title?.name && <p className="text-[11px] text-slate-400 leading-snug">{lead.job_title.name}</p>}
                        {location && (
                            <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 leading-snug">
                                <MapPin size={9} className="shrink-0" />
                                {location}
                            </p>
                        )}
                    </button>
                );
            },
        },
        {
            key: 'opportunity', header: 'Opportunity', width: 'min-w-[160px]', className: 'whitespace-normal py-3', render: lead => {
                const age = calculateAgeInDays(lead.enquiry_date || lead.created_at);
                const productName = lead.product?.name || null;
                return (
                    <div className="flex flex-col gap-1">
                        {productName && (
                            <>
                                <p className="text-[11px] text-slate-500 leading-snug">{productName}</p>
                                {(lead.license_count || lead.device_count || lead.employee_count || lead.vendor_count) && (
                                    <p className="text-[10px] text-slate-400 leading-snug">
                                        {lead.license_count || lead.device_count || lead.employee_count || lead.vendor_count}
                                        {' '}{lead.product?.count_type || ''}
                                    </p>
                                )}
                            </>
                        )}
                        <p className="text-sm font-semibold text-primary-700 leading-snug">
                            {(lead.opportunities_values || lead.order_value)
                                ? `₹${Number(lead.opportunities_values || lead.order_value).toLocaleString('en-IN')}`
                                : '—'}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug">AGE : <AgeBadge days={age} /></p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                            CP Score :
                            <span className={clsx('badge ml-1', (lead.cp_score || 0) > 6 ? 'badge-green' : 'badge-red')}>
                                {lead.cp_score || 0}/10
                            </span>
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                            BANT Score
                            <span className="inline-flex items-baseline gap-0.5 px-2 py-1 rounded-lg">
                                <span className="text-sm font-bold text-primary-600">{lead.lead_score || 0}</span>
                                <span className="text-[10px] text-slate-400">/28</span>
                            </span>
                        </p>
                    </div>
                );
            },
        },
        { key: 'source', header: 'Source', width: 'w-16', render: lead => <span className="text-slate-500 text-xs">{lead.lead_source?.name || '—'}</span> },
        {
            key: 'quadrant', header: 'Quadrant & Age', width: 'min-w-[120px]', align: 'center', render: lead => {
                const qAge = calculateAgeInDays(lead.quadrant_changed_at || lead.created_at);
                return (
                    <>
                        <span className={clsx(qBadge(lead.quadrant || ''), 'badge')}>{lead.quadrant || 'N/A'}</span>
                        <p className="mt-2"><AgeBadge days={qAge} /></p>
                    </>
                );
            },
        },
        { key: 'bant', header: 'BANT', align: 'center', render: lead => <DynamicBantBadges lead={lead} /> },
        {
            key: 'focusArea', header: 'BANT Focus Area', align: 'center', render: lead => (
                <button
                    onClick={() => setViewEngagementLead(lead)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="View Sales Engagement"
                >
                    <Eye size={14} />
                </button>
            ),
        },
        {
            key: 'actions', header: 'Actions', align: 'right', sticky: true, render: lead => (
                <div className="flex items-center justify-end gap-0.5">
                    <button
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="View Lead"
                    >
                        <Eye size={14} />
                    </button>
                    {lead.is_editable && (
                        <button
                            onClick={() => navigate(`/leads/${lead.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                            title="Edit Lead"
                        >
                            <Edit size={14} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                        <BarChart2 size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="page-title">{title}</h1>
                        <p className="page-subtitle">
                            {isLoading ? 'Loading…' : `${totalCount} lead${totalCount !== 1 ? 's' : ''}`}
                            {activeCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px] font-bold">
                                    {activeCount} filter{activeCount !== 1 ? 's' : ''} active
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['report-leads'] })}
                        className="btn-ghost btn-icon"
                    >
                        <RefreshCw size={16} className={clsx(isFetching && 'animate-spin')} />
                    </button>
                    <button
                        onClick={exportToExcel}
                        disabled={leads.length === 0}
                        className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FileSpreadsheet size={15} />
                        <span className="hidden sm:inline">Export Excel</span>
                    </button>
                </div>
            </div>

            {/* ── Stats Strip ── */}
            <div className="px-6 md:px-8 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={<TrendingUp size={16} className="text-primary-600" />} bg="bg-primary-50"  label="Total Leads"   value={stats.totalLeads} />
                    <StatCard icon={<BarChart2  size={16} className="text-emerald-600" />} bg="bg-emerald-50"  label="Order Won"     value={stats.convertedLeads} />
                    <StatCard icon={<X          size={16} className="text-red-500"     />} bg="bg-red-50"      label="Lost"          value={stats.lostLeads} />
                    <StatCard icon={<DollarSign size={16} className="text-violet-600"  />} bg="bg-violet-50"   label="Total Revenue" value={`₹${(stats.totalExpectedRevenue || 0).toLocaleString('en-IN')}`} />
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="px-6 md:px-8 py-3 bg-white border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Company */}
                    <div className="relative w-44">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search companies…"
                            value={filters.company}
                            onChange={e => setFilters({ company: e.target.value })}
                            className="form-input pl-9 py-2"
                        />
                    </div>

                    {/* Quadrant */}
                    <SearchableMultiSelect
                        options={QUADRANT_OPTIONS}
                        values={quadVals}
                        onChange={vals => setFilters({ quadrants: vals.join(',') })}
                        placeholder="All Quadrants"
                        allLabel="All Quadrants"
                        className="w-36"
                    />

                    {/* Owner */}
                    <SearchableMultiSelect
                        options={(users || []).map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name || ''}`.trim() }))}
                        values={ownerVals}
                        onChange={vals => setFilters({ ownerIds: vals.join(',') })}
                        placeholder="All Owners"
                        allLabel="All Owners"
                        className="w-36"
                    />

                    {/* Product */}
                    <SearchableMultiSelect
                        options={(products || []).map((p: any) => ({ value: String(p.id), label: p.name }))}
                        values={productVals}
                        onChange={vals => setFilters({ productIds: vals.join(',') })}
                        placeholder="All Products"
                        allLabel="All Products"
                        className="w-36"
                    />

                    {/* Date range */}
                    <DateOverlay value={filters.startDate}>
                        <input type="date" value={filters.startDate}
                            onChange={e => setFilters({ startDate: e.target.value })}
                            onClick={e => (e.target as any).showPicker?.()}
                            className="form-input py-2 w-36" title="From Date"
                        />
                    </DateOverlay>
                    <DateOverlay value={filters.endDate}>
                        <input type="date" value={filters.endDate}
                            onChange={e => setFilters({ endDate: e.target.value })}
                            onClick={e => (e.target as any).showPicker?.()}
                            className="form-input py-2 w-36" title="To Date"
                        />
                    </DateOverlay>

                    {/* Sales Engagement Date window — how the dashboard's Sales
                        Activities cards arrive */}
                    <DateOverlay value={filters.engagementFrom}>
                        <input type="date" value={filters.engagementFrom}
                            onChange={e => setFilters({ engagementFrom: e.target.value })}
                            onClick={e => (e.target as any).showPicker?.()}
                            className="form-input py-2 w-40" title="Sales Engagement From"
                        />
                    </DateOverlay>
                    <DateOverlay value={filters.engagementTo}>
                        <input type="date" value={filters.engagementTo}
                            onChange={e => setFilters({ engagementTo: e.target.value })}
                            onClick={e => (e.target as any).showPicker?.()}
                            className="form-input py-2 w-40" title="Sales Engagement To"
                        />
                    </DateOverlay>

                    <label
                        className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer px-1"
                        title="Only leads that carry a Sales Engagement Date"
                    >
                        <input
                            type="checkbox"
                            checked={filters.engagementNotNull === '1'}
                            onChange={e => setFilters({ engagementNotNull: e.target.checked ? '1' : '' })}
                            className="rounded border-slate-300 text-primary-600"
                        />
                        Has Engagement Date
                    </label>

                    <label
                        className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer px-1"
                        title="Exclude leads whose sales stage is Order Won or Order Lost"
                    >
                        <input
                            type="checkbox"
                            checked={filters.excludeClosed === '1'}
                            onChange={e => setFilters({ excludeClosed: e.target.checked ? '1' : '' })}
                            className="rounded border-slate-300 text-primary-600"
                        />
                        Exclude Won / Lost
                    </label>

                    <button
                        onClick={resetFilters}
                        className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors px-1"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col mx-6 md:mx-8 my-4 card">
                <Table
                    columns={columns}
                    data={leads}
                    getRowKey={lead => lead.id}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    skeletonRows={6}
                    maxHeight="flex-1"
                    emptyIcon={<BarChart2 size={22} className="text-slate-400" />}
                    emptyTitle="No leads found"
                    emptySubtitle="Try adjusting your filters."
                />

                <TablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={limit}
                    onPageChange={setPage}
                    isLoading={isLoading}
                    itemLabel="leads"
                />
            </div>

            {/* ── Sales Engagement View Modal ── */}
            {viewEngagementLead && (
                <div className="modal-overlay" onClick={() => setViewEngagementLead(null)}>
                    <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Sales & Engagement</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {viewEngagementLead.company_name || `${viewEngagementLead.first_name || ''} ${viewEngagementLead.last_name || ''}`.trim() || '—'}
                                </p>
                            </div>
                            <button onClick={() => setViewEngagementLead(null)} className="btn btn-ghost btn-icon">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                            {[
                                { label: 'Sales Stage', value: viewEngagementLead.sales_stage?.name },
                                { label: 'Next Activity', value: viewEngagementLead.next_activity?.name },
                                {
                                    label: 'Engagement Date & Time',
                                    value: viewEngagementLead.follow_up_datetime
                                        ? new Date(viewEngagementLead.follow_up_datetime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                                        : null,
                                },
                                { label: 'Notes / Remarks', value: viewEngagementLead.follow_up_notes !== '-' ? viewEngagementLead.follow_up_notes : null },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex gap-3">
                                    <span className="text-xs font-semibold text-slate-500 w-44 shrink-0 pt-0.5">{label}</span>
                                    <span className="text-sm text-slate-800 break-words">{value || '—'}</span>
                                </div>
                            ))}

                            {(() => {
                                const answers: any[] = viewEngagementLead.bant_answers || [];
                                if (answers.length === 0) return null;
                                const grouped: Record<string, any[]> = {};
                                answers.forEach(a => {
                                    const key = a.category?.code || 'Other';
                                    if (!grouped[key]) grouped[key] = [];
                                    grouped[key].push(a);
                                });
                                const ORDER = ['B', 'A', 'N', 'T'];
                                const keys = [...ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !ORDER.includes(k))];
                                return (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-3">BANT Pillar Questions</p>
                                        <div className="space-y-3">
                                            {keys.map(code => (
                                                <div key={code} className="rounded-lg border border-slate-100 bg-slate-50/60 overflow-hidden">
                                                    <div className="px-3 py-1.5 bg-slate-100 flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            {code}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            {grouped[code][0]?.category?.name || code}
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {grouped[code].map((a: any) => (
                                                            <div key={a.id} className="px-3 py-2 flex gap-3">
                                                                <span className="text-xs text-slate-500 flex-1">{a.question?.question || '—'}</span>
                                                                <span className="text-xs font-medium text-slate-800 shrink-0 max-w-[45%] text-right break-words">
                                                                    {a.answer || '—'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Stat card ── */
function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string | number }) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-2.5">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
                <p className="text-lg font-black text-slate-900 mt-0.5 leading-none">{value}</p>
            </div>
        </div>
    );
}
