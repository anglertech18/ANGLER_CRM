import React from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Eye, Edit, Trash2, X, Save,
    UserPlus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    Layers, RefreshCw, LayoutGrid, MapPin, AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import LeadScoreCard from '../components/LeadScoreCard';
import { SearchableMultiSelect, SearchableSelect } from '../components/FilterDropdown';
import clsx from 'clsx';

/* ── Quadrant badge colours ── */
const QUADRANT_STYLES: Record<string, string> = {
    Q1: 'badge-blue', Q2: 'badge-amber', Q3: 'badge-orange',
    Q4: 'badge-green', Nurturing: 'badge-purple', 'Order Won': 'badge-emerald','Order Lost': 'badge-red',
};
const qBadge = (q: string) => QUADRANT_STYLES[q] ?? 'badge-gray';

/* ── Lead type helpers ── */
const getProductName = (lead: any) => lead.product?.name || null;

/* ── Avatar colour — consistent per name ── */
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

/* ── BANT vertical with portal tooltip ── */
const BANT_KEYS = ['budget_yes_no', 'authority_yes_no', 'need_yes_no', 'timeline_yes_no'] as const;
const BANT_LABELS = ['B', 'A', 'N', 'T'];
const BANT_TITLES = ['Budget', 'Authority', 'Need', 'Timeline'];

const getBantTooltip = (lead: any, i: number): string => {
    const yes = lead[BANT_KEYS[i]];
    let text = `${BANT_TITLES[i]}: ${yes ? 'Yes' : 'No'}`;
    if (i === 0) {
        if (lead.budget_allocated) text += `\nAllocated: ${lead.budget_allocated}`;
        if (lead.approval_stage)   text += `\nApproval: ${lead.approval_stage}`;
    }
    if (i === 1 && lead.decision_maker)    text += `\nDecision Maker: ${lead.decision_maker}`;
    if (i === 2 && lead.pain_points_desc)  text += `\nPain Points: ${lead.pain_points_desc}`;
    if (i === 3 && lead.expected_closure_date)
        text += `\nExpected Closure: ${new Date(lead.expected_closure_date).toLocaleDateString('en-GB')}`;
    return text;
};

const BantVertical = ({ lead }: { lead: any }) => {
    const [tip, setTip] = React.useState<{ text: string; x: number; y: number } | null>(null);
    return (
        <>
            <div className="flex flex-col gap-0.5">
                {BANT_KEYS.map((k, i) => (
                    <span
                        key={k}
                        className={clsx(
                            'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border cursor-default select-none',
                            lead[k]
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-300 border-slate-200'
                        )}
                        onMouseEnter={e => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setTip({ text: getBantTooltip(lead, i), x: r.right + 8, y: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTip(null)}
                    >
                        {BANT_LABELS[i]}
                    </span>
                ))}
            </div>
            {tip && createPortal(
                <div style={{
                    position: 'fixed', top: tip.y, left: tip.x,
                    transform: 'translateY(-50%)', zIndex: 99999,
                    pointerEvents: 'none', maxWidth: '220px',
                    background: '#1e293b', color: '#fff', fontSize: '11px',
                    borderRadius: '6px', padding: '8px 10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6',
                }}>
                    {tip.text}
                </div>,
                document.body
            )}
        </>
    );
};

/* ── Dynamic BANT badges (from lead_bant_answers + Section 6 qualification) ── */
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
        answers.forEach((a) => {
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
        const dynItems = byCategory[code] || [];
        return (
            <div style={{ minWidth: '160px' }}>
                {/* Section 6 — qualification flag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '5px' }}>
                    <span>{name}</span>
                    <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
                        background: qualified ? '#10b981' : '#6b7280', color: '#fff', letterSpacing: '0.04em'
                    }}>
                        {qualified ? 'YES' : 'NO'}
                    </span>
                </div>
                {/* Section 6 — detail fields */}
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
                {/* Dynamic Q&A answers */}
                {/* {dynItems.length > 0 && (
                    <>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', margin: '6px 0 4px' }} />
                        {dynItems.map((a) => (
                            <div key={a.question_id} style={{ marginBottom: '4px' }}>
                                <div style={{ opacity: 0.7, fontSize: '10px' }}>Q: {a.question?.question}</div>
                                <div>A: {a.answer || '—'}</div>
                            </div>
                        ))}
                    </>
                )} */}
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
                                    : 'bg-slate-50 text-slate-300 border-slate-200'
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
                document.body
            )}
        </>
    );
};

/* ── Sort icon helper ── */
const SortIcon = ({ field, sort }: { field: string; sort: any }) => {
    if (sort.field !== field) return null;
    return sort.order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
};

/* ════════════════════════════════════════════════════════════ */
export default function Leads() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    /* ── Persistent filter / pagination / sort state ── */
    const LEADS_DEFAULTS = {
        quadrant: '', company_name: '',
        product_id: '',
        startDate: '', endDate: '', ownerId: '',
        minValue: '', maxValue: '', lead_source_id: '',
        page: 1, sort_field: 'created_at', sort_order: 'desc',
    };
    const { filters: pf, setFilters: setPf, resetFilters: resetAllFilters } =
        usePersistentFilters('leads', LEADS_DEFAULTS);

    // Convenience aliases that match existing code shape
    const filters = {
        quadrant: String(pf.quadrant),
        company_name: String(pf.company_name),
        product_id: String(pf.product_id), startDate: String(pf.startDate),
        endDate: String(pf.endDate),
        ownerId: String(pf.ownerId), minValue: String(pf.minValue),
        maxValue: String(pf.maxValue), lead_source_id: String(pf.lead_source_id),
    };
    const page = typeof pf.page === 'number' ? pf.page : Number(pf.page) || 1;
    const sort = { field: String(pf.sort_field), order: String(pf.sort_order) };
    const limit = 10;

    // Wrapper — accepts functional or object updates, always resets page
    type FilterState = typeof filters;
    const setFilters = (updates: Partial<FilterState> | ((prev: FilterState) => FilterState)) => {
        const resolved = typeof updates === 'function' ? updates(filters) : updates;
        setPf({ ...resolved, page: 1 } as any);
    };
    const setPage = (p: number | ((prev: number) => number)) => {
        const next = typeof p === 'function' ? p(page) : p;
        setPf({ page: Math.max(1, next) });
    };
    const handleSort = (field: string) =>
        setPf({ sort_field: field, sort_order: pf.sort_field === field && pf.sort_order === 'asc' ? 'desc' : 'asc', page: 1 });

    /* ── Score modal state ── */
    const [editingScoreLead, setEditingScoreLead] = React.useState<any>(null);
    /* ── Sales Engagement view modal ── */
    const [viewEngagementLead, setViewEngagementLead] = React.useState<any>(null);
    /* ── Kebab menu state ── */
    const [openMenuId, setOpenMenuId] = React.useState<number | null>(null);
    const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [scores, setScores] = React.useState({
        reduce_cost_score: 0, efficiency_score: 0, automation_score: 0,
        compliance_score: 0, established_need_score: 0, urgency_score: 0,
        budget_allocated_score: 0, decision_maker_score: 0, competition_score: 0,
        champion_score: 0, influencer_score: 0, lead_source_quality: 0,
        decision_contact_score: 0, others_score: 0, others_score_label: ''
    });
    const [scoreBant, setScoreBant] = React.useState({
        budget_yes_no: false, budget_allocated: '', approval_stage: '',
        authority_yes_no: false, decision_maker: '',
        need_yes_no: false, pain_points_desc: '',
        timeline_yes_no: false, expected_closure_date: ''
    });

    /* ── Queries ── */
    const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/masters/product').then(r => r.data) });
    const { data: leadSources } = useQuery({ queryKey: ['leadSources'], queryFn: () => api.get('/masters/leadsource').then(r => r.data) });
    const { data: avatars } = useQuery({ queryKey: ['masters', 'avatar'], queryFn: () => api.get('/masters/avatar').then(r => r.data) });

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ['leads', filters, page, sort],
        queryFn: async () => {
            const params = new URLSearchParams();
            filters.quadrant.split(',').filter(Boolean).forEach(q => params.append('quadrant', q));
            if (filters.company_name) params.append('company_name', filters.company_name);
            filters.product_id.split(',').filter(Boolean).forEach(p => params.append('product_id', p));
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            // Default to logged-in user's records when no owner filter is explicitly selected;
            // 'all' means show all accessible records (backend RBAC applies)
            const ownerIds = filters.ownerId.split(',').filter(Boolean);
            if (ownerIds.includes('all')) {
                // no ownerId param — backend returns full RBAC-scoped records
            } else if (ownerIds.length > 0) {
                ownerIds.forEach(o => params.append('ownerId', o));
            } else {
                params.append('ownerId', String(user!.id));
            }
            if (filters.minValue) params.append('minValue', filters.minValue);
            if (filters.maxValue) params.append('maxValue', filters.maxValue);
            if (filters.lead_source_id) params.append('lead_source_id', filters.lead_source_id);
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            params.append('sortBy', sort.field);
            params.append('sortOrder', sort.order);
            return api.get(`/leads?${params.toString()}`).then(r => r.data);
        },
        enabled: !!user,
    });

    const leads = data?.data || [];
    const totalCount = data?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);


    /* ── Mutations ── */
    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/leads/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    });

    const updateScoreMutation = useMutation({
        mutationFn: ({ id, scores }: { id: number; scores: any }) => api.put(`/leads/${id}/score`, scores),
        onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['leads'] }); setEditingScoreLead(null); },
        onError: (err: any) => alert(`Failed to update score: ${err.response?.data?.message || err.message}`),
    });

    /* ── Kebab menu handler ── */
    const openMenu = (e: React.MouseEvent, leadId: number) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuPos({ x: rect.right, y: rect.bottom + 4 });
        setOpenMenuId(prev => (prev === leadId ? null : leadId));
    };

    /* ── Handlers ── */
    const handleScoreClick = (lead: any) => {
        setScores({
            reduce_cost_score: lead.reduce_cost_score || 0,
            efficiency_score: lead.efficiency_score || 0,
            automation_score: lead.automation_score || 0,
            compliance_score: lead.compliance_score || 0,
            established_need_score: lead.established_need_score || 0,
            urgency_score: lead.urgency_score || 0,
            budget_allocated_score: lead.budget_allocated_score || 0,
            decision_maker_score: lead.decision_maker_score || 0,
            competition_score: lead.competition_score || 0,
            champion_score: lead.champion_score || 0,
            influencer_score: lead.influencer_score || 0,
            lead_source_quality: lead.lead_source_quality || 0,
            decision_contact_score: lead.decision_contact_score || 0,
            others_score: lead.others_score || 0,
            others_score_label: lead.others_score_label || '',
        });
        setScoreBant({
            budget_yes_no: !!lead.budget_yes_no,
            budget_allocated: lead.budget_allocated || '',
            approval_stage: lead.approval_stage || '',
            authority_yes_no: !!lead.authority_yes_no,
            decision_maker: lead.decision_maker || '',
            need_yes_no: !!lead.need_yes_no,
            pain_points_desc: lead.pain_points_desc || '',
            timeline_yes_no: !!lead.timeline_yes_no,
            expected_closure_date: lead.expected_closure_date ? lead.expected_closure_date.slice(0, 10) : '',
        });
        setEditingScoreLead(lead);
    };

    // Mirrors LeadForm.tsx's contactOptions memo so the Decision Maker dropdown
    // in the Score popup shows the exact same options as the Lead Form.
    const scoreContactOptions = React.useMemo(() => {
        if (!editingScoreLead) return [];
        const lead = editingScoreLead;
        const options: string[] = [];
        const getAvatarName = (id: any) => {
            if (!id || !avatars) return '';
            const avatar = avatars.find((a: any) => a.id.toString() === id.toString());
            return avatar ? `--${avatar.name}` : '';
        };
        if (lead.first_name || lead.last_name) {
            const fullName = `${lead.salutation ? lead.salutation + ' ' : ''}${lead.first_name || ''} ${lead.last_name || ''}`.trim();
            const designationStr = lead.job_title?.name ? ` - ${lead.job_title.name}` : '';
            if (fullName) options.push(`${fullName}${designationStr}${getAvatarName(lead.avatar_id)}`);
        }
        (lead.contacts || []).forEach((c: any) => {
            if (c.name && c.name.trim()) {
                const designationStr = c.designation ? ` - ${c.designation}` : '';
                options.push(`${c.name.trim()}${designationStr}${getAvatarName(c.avatar_id)}`);
            }
        });
        return Array.from(new Set(options));
    }, [editingScoreLead, avatars]);

    const handleScoreBantChange = (field: string, value: any) => {
        setScoreBant(prev => ({ ...prev, [field]: value }));
        // Auto-reset the related score when its checkbox is unchecked
        if (field === 'budget_yes_no' && !value) setScores(prev => ({ ...prev, budget_allocated_score: 0 }));
        if (field === 'authority_yes_no' && !value) setScores(prev => ({ ...prev, decision_maker_score: 0 }));
        if (field === 'need_yes_no' && !value) setScores(prev => ({ ...prev, established_need_score: 0 }));
        if (field === 'timeline_yes_no' && !value) setScores(prev => ({ ...prev, urgency_score: 0 }));
    };

    const calculateAgeInDays = (date: any) =>
        Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);

    const resetFilters = () => {
        resetAllFilters();
    };

    if (isError) return (
        <div className="page-wrapper">
            <div className="card p-4 text-red-600 text-sm border-red-200">
                {(error as any)?.response?.data?.message || (error as any)?.message}
            </div>
        </div>
    );

    const pageNums = [...Array(totalPages)].map((_, i) => i + 1)
        .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2));

    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Layers size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="page-title">Sales Pipeline</h1>
                        <p className="page-subtitle">Track and manage your opportunities</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
                        className="btn-ghost btn-icon"
                    >
                        <RefreshCw size={16} className={clsx(isFetching && 'animate-spin')} />
                    </button>
                    <Link to="/leads/new" className="btn btn-primary">
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add Lead</span>
                    </Link>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="px-6 md:px-8 py-3 bg-white border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Company — reduced width */}
                    <div className="relative w-44">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search companies…"
                            value={filters.company_name}
                            onChange={e => setFilters(p => ({ ...p, company_name: e.target.value }))}
                            className="form-input pl-9 py-2"
                        />
                    </div>

                    {/* Quadrant multi-select */}
                    <SearchableMultiSelect
                        options={['Q1', 'Q2', 'Q3', 'Q4', 'Nurturing', 'Order Won', 'Order Lost'].map(q => ({ value: q, label: q }))}
                        values={filters.quadrant.split(',').filter(Boolean)}
                        onChange={vals => setFilters(p => ({ ...p, quadrant: vals.join(',') }))}
                        placeholder="All Quadrants"
                        allLabel="All Quadrants"
                        className="w-36"
                    />

                    {/* Owner multi-select */}
                    {user?.role !== 'SalesPerson' && (
                        <SearchableMultiSelect
                            options={[
                                { value: 'all', label: 'All Users' },
                                ...(usersData || []).map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name}` }))
                            ]}
                            values={filters.ownerId.split(',').filter(Boolean)}
                            onChange={vals => {
                                const prev = filters.ownerId.split(',').filter(Boolean);
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
                                setFilters(p => ({ ...p, ownerId: next.join(',') }));
                            }}
                            placeholder="Me (Default)"
                            className="w-36"
                        />
                    )}

                    {/* Product multi-select */}
                    <SearchableMultiSelect
                        options={(products || []).map((p: any) => ({ value: String(p.id), label: p.name }))}
                        values={filters.product_id.split(',').filter(Boolean)}
                        onChange={vals => setFilters(p => ({ ...p, product_id: vals.join(',') }))}
                        placeholder="All Products"
                        allLabel="All Products"
                        className="w-36"
                    />

                    {/* Date range */}
                    <input type="date" value={filters.startDate}
                        onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
                        onClick={e => (e.target as any).showPicker?.()}
                        className="form-input py-2 w-36" title="From Date"
                    />
                    <input type="date" value={filters.endDate}
                        onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
                        onClick={e => (e.target as any).showPicker?.()}
                        className="form-input py-2 w-36" title="To Date"
                    />

                    {/* Lead Source */}
                    <SearchableSelect
                        options={(leadSources || []).map((s: any) => ({ value: String(s.id), label: s.name }))}
                        value={filters.lead_source_id}
                        onChange={val => setFilters(p => ({ ...p, lead_source_id: val }))}
                        placeholder="All Sources"
                        className="w-32"
                    />

                    {/* Value range */}
                    <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none">₹</span>
                        <input type="number" min={0} value={filters.minValue}
                            onChange={e => setFilters(p => ({ ...p, minValue: e.target.value }))}
                            placeholder="Min" className="form-input py-2 pl-6 w-full"
                        />
                    </div>
                    <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none">₹</span>
                        <input type="number" min={0} value={filters.maxValue}
                            onChange={e => setFilters(p => ({ ...p, maxValue: e.target.value }))}
                            placeholder="Max" className="form-input py-2 pl-6 w-full"
                        />
                    </div>

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
                <div className="flex-1 overflow-auto">
                    <table className="table-base">
                        <thead className="table-head">
                            <tr>
                                {/* ① Account Manager */}
                                <th className="table-th w-32">Account Manager</th>
                                {/* ② Company / Contact / Location — combined */}
                                <th className="table-th min-w-[200px]">Company / Contact</th>
                                {/* Remaining columns unchanged */}
                                <th className="table-th-sortable min-w-[160px]" onClick={() => handleSort('order_value')}>
                                    <span className="flex items-center gap-1">Opportunity <SortIcon field="order_value" sort={sort} /></span>
                                </th>
                                <th className="table-th w-16">Source</th>
                                {/* <th className="table-th-sortable" onClick={() => handleSort('created_at')}>
                                    <span className="flex items-center gap-1">Lead Date <SortIcon field="created_at" sort={sort} /></span>
                                </th> */}
                                {/* <th className="table-th-sortable" onClick={() => handleSort('ageing')}>
                                    <span className="flex items-center gap-1">Age <SortIcon field="ageing" sort={sort} /></span>
                                </th> */}
                                {/* <th className="table-th text-center">CP Score</th>
                                <th className="table-th-sortable text-center" onClick={() => handleSort('lead_score')}>
                                    <span className="flex items-center gap-1 justify-center">Score <SortIcon field="lead_score" sort={sort} /></span>
                                </th> */}
                                <th className="table-th-sortable" onClick={() => handleSort('quadrant')}>
                                    <span className="flex items-center gap-1  min-w-[20px]">Quadrant & Age <SortIcon field="quadrant" sort={sort} /></span>
                                </th>
                                {/* <th className="table-th text-center min-w-[20px]">Q. Age</th> */}
                                <th className="table-th text-center">BANT</th>
                                <th className="table-th">BANT Focus Area </th>
                                {/* <th className="table-th text-center">View</th> */}
                                <th className="table-th text-right sticky right-0 bg-slate-50">Actions</th>
                            </tr>
                        </thead>

                        <tbody className={clsx('divide-y divide-slate-50', (isLoading || isFetching) && 'opacity-60')}>
                            {isLoading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="table-tr">
                                        {[...Array(9)].map((_, j) => (
                                            <td key={j} className="table-td">
                                                <div className="skeleton h-4 rounded w-20" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="empty-state">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                                <Layers size={22} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-600">No leads found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or add a new lead.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : leads.map((lead: any) => {
                                const isWon = lead.sales_stage?.name === 'Order Won';
                                const age = calculateAgeInDays(lead.enquiry_date || lead.created_at);
                                const qAge = calculateAgeInDays(lead.quadrant_changed_at || lead.created_at);
                                const ownerName = `${lead.owner?.first_name ?? ''}${lead.owner?.last_name ?? ''}`;
                                const contactName = [lead.first_name, lead.last_name].
                                      filter(Boolean).join(' ');
                                     
                                const location = lead.city?.name || lead.company_master?.city || lead.state?.name;
                                const productName = getProductName(lead);

                                return (
                                    <tr key={lead.id} className="table-tr group">

                                        {/* ① Account Manager — avatar + name */}
                                        <td className="table-td">
                                            <div className="flex items-center gap-2.5">
                                                <div className={clsx(
                                                    'w-7 h-7 rounded-full flex items-center justify-center',
                                                    'text-[10px] font-bold shrink-0 select-none',
                                                    avatarColor(ownerName)
                                                )}>
                                                    {lead.owner?.first_name?.[0]?.toUpperCase()}
                                                    {lead.owner?.last_name?.[0]?.toUpperCase()}
                                                </div>
                                                <span className="text-xs font-medium text-slate-700 leading-tight">
                                                    {lead.owner?.first_name} {lead.owner?.last_name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ② Company / Contact / Location — stacked */}
                                        <td className="table-td whitespace-normal py-3">
                                            <button
                                                onClick={() => navigate(`/leads/${lead.id}`)}
                                                className="text-left"
                                            >
                                                <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors leading-snug">
                                                    {lead.company_name || lead.company_master?.name || '—'}
                                                </p>
                                                {contactName && (
                                                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                                                        {contactName}
                                                    </p>
                                                )}
                                                {lead.job_title?.name && (
                                                    <p className="text-[11px] text-slate-400 leading-snug">
                                                        {lead.job_title.name}
                                                    </p>
                                                )}
                                                {location && (
                                                    <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 leading-snug">
                                                        <MapPin size={9} className="shrink-0" />
                                                        {location}
                                                    </p>
                                                )}
                                            </button>
                                        </td>

                                        {/* Type / Opp. Value — type badge + product + ₹ stacked */}
                                        <td className="table-td whitespace-normal py-3">
                                            <div className="flex flex-col gap-1">
                                                {/* {typeLabel && (
                                                    <span className={clsx('badge w-fit', getTypeBadge(lead))}>
                                                        {typeLabel}
                                                    </span>
                                                )} */}

                                                {productName && (
                                                    <>
                                                        <p className="text-[11px] text-slate-500 leading-snug">{productName}</p>
                                                        {(lead.license_count || lead.device_count || lead.employee_count || lead.vendor_count) && (
                                                            <p className="text-[10px] text-slate-400 leading-snug">
                                                                {lead.license_count || lead.device_count || lead.employee_count || lead.vendor_count}
                                                                {' '}
                                                                {lead.product?.count_type || ''}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                                <p className="text-sm font-semibold text-primary-700 leading-snug">
                                                    {lead.opportunities_values
                                                        ? `₹${Number(lead.opportunities_values).toLocaleString('en-IN')}`
                                                        : '—'}
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-snug"> AGE  :  <AgeBadge days={age} />
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-snug"> CP Score   :
                                                    <span className={clsx('badge', (lead.cp_score || 0) > 6 ? 'badge-green' : 'badge-red')}>
                                                        {lead.cp_score || 0}/10
                                                    </span>
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-snug"> BANT Score  <button
                                                onClick={() => {
                                                    if (isWon) { alert('This lead is frozen (Order Won).'); return; }
                                                    handleScoreClick(lead);
                                                }}
                                                className={clsx(
                                                    'inline-flex items-baseline gap-0.5 px-2 py-1 rounded-lg transition-colors',
                                                    isWon
                                                        ? 'text-slate-400 cursor-not-allowed'
                                                        : 'hover:bg-primary-50 hover:text-primary-700'
                                                )}
                                            >
                                                <span className="text-sm font-bold text-primary-600">{lead.lead_score || 0}</span>
                                                <span className="text-[10px] text-slate-400">/28</span>
                                            </button></p>
                                            </div>
                                        </td>


                                        {/* Lead Source */}
                                        <td className="table-td text-slate-500 text-xs">
                                            {lead.lead_source?.name || '—'}
                                        </td>

                                        {/* Lead Date */}
                                        {/* <td className="table-td text-slate-500 text-xs">
                                            {new Date(lead.created_at).toLocaleDateString('en-GB')}
                                        </td> */}

                                        {/* Ageing */}
                                        {/* <td className="table-td text-center">
                                            <AgeBadge days={age} />
                                        </td> */}


                                        {/* CP Score */}
                                        {/* <td className="table-td text-center">
                                            <span className="badge badge-blue">
                                                {lead.cp_score || 0}/10
                                            </span>
                                        </td> */}

                                        {/* Lead Score */}
                                        {/* <td className="table-td text-center">
                                            <button
                                                onClick={() => {
                                                    if (isWon) { alert('This lead is frozen (Order Won).'); return; }
                                                    handleScoreClick(lead);
                                                }}
                                                className={clsx(
                                                    'inline-flex items-baseline gap-0.5 px-2 py-1 rounded-lg transition-colors',
                                                    isWon
                                                        ? 'text-slate-400 cursor-not-allowed'
                                                        : 'hover:bg-primary-50 hover:text-primary-700'
                                                )}
                                            >
                                                <span className="text-sm font-bold text-primary-600">{lead.lead_score || 0}</span>
                                                <span className="text-[10px] text-slate-400">/28</span>
                                            </button>
                                        </td> */}

                                        {/* Quadrant (read-only) */}
                                        <td className="table-td text-center">
                                            <span className={clsx(qBadge(lead.quadrant || ''), 'badge')}>
                                                {lead.quadrant || 'N/A'}
                                            </span>
                                            <p className="mt-2">
                                                <AgeBadge days={qAge} />
                                            </p>
                                            {lead.requires_requalification && (
                                                <p className="mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/leads/${lead.id}/edit?focus=scorecard`);
                                                        }}
                                                        className="badge badge-orange flex items-center gap-1 w-fit mx-auto hover:brightness-95 cursor-pointer"
                                                        title="Click to Requalify"
                                                    >
                                                        <AlertCircle size={10} />
                                                        {lead.quadrant === 'Nurturing' ? 'Requalification Required' : 'Auto Degraded – Click to Requalify'}
                                                    </button>
                                                </p>
                                            )}
                                        </td>

                                        {/* Quadrant Ageing */}
                                        {/* <td className="table-td text-center">
                                            <AgeBadge days={qAge} />
                                        </td> */}

                                        {/* BANT */}
                                        <td className="table-td">
                                            <DynamicBantBadges lead={lead} />
                                        </td>

                                        {/* BANT Focus Area */}
                                        {/* <td className="table-td text-xs text-slate-600 max-w-[120px] truncate" title={lead.bant_focus_area || ''}>
                                            {lead.bant_focus_area || '—'}
                                        </td> */}

                                        {/* Sales Engagement View */}
                                        <td className="table-td text-center">
                                            <button
                                                onClick={() => setViewEngagementLead(lead)}
                                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                title="View Sales Engagement"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>

                                        {/* Actions — kebab menu */}
                                        <td className="table-td text-right sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                            <button
                                                onClick={e => openMenu(e, lead.id)}
                                                className="btn btn-icon btn-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                                title="Actions"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                    <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-500">
                        {totalCount > 0
                            ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount} leads`
                            : 'No leads'}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="btn btn-icon btn-sm bg-white border border-slate-200 disabled:opacity-40"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {pageNums.map(n => (
                            <button
                                key={n}
                                onClick={() => setPage(n)}
                                className={clsx(
                                    'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                                    page === n
                                        ? 'bg-primary-600 text-white shadow-sm'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                )}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || totalPages === 0 || isLoading}
                            className="btn btn-icon btn-sm bg-white border border-slate-200 disabled:opacity-40"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
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
                            {/* Core fields */}
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

                            {/* BANT Pillar Questions */}
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

            {/* ── Score Edit Modal ── */}
            {editingScoreLead && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-4xl">
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                                    <LayoutGrid size={18} className="text-primary-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">Qualification Score</h2>
                                    <p className="text-xs text-slate-400">
                                        {editingScoreLead.company_name || `${editingScoreLead.first_name} ${editingScoreLead.last_name}`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setEditingScoreLead(null)} className="btn btn-ghost btn-icon">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <LeadScoreCard
                                scores={scores}
                                onChange={(f: string, v: number) => setScores(p => ({ ...p, [f]: v }))}
                                bant={scoreBant}
                                onBantChange={handleScoreBantChange}
                                contactOptions={scoreContactOptions}
                                readOnly={false}
                            />
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setEditingScoreLead(null)} className="btn btn-secondary">Cancel</button>
                            <button
                                onClick={() => updateScoreMutation.mutate({ id: editingScoreLead.id, scores: { ...scores, ...scoreBant } })}
                                disabled={updateScoreMutation.isPending}
                                className="btn btn-primary"
                            >
                                <Save size={15} />
                                {updateScoreMutation.isPending ? 'Saving…' : 'Save Scores'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Kebab dropdown menu (portal) ── */}
            {openMenuId !== null && createPortal(
                <>
                    {/* Backdrop to close on click-outside */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99990 }}
                        onClick={() => setOpenMenuId(null)}
                    />
                    <div style={{
                        position: 'fixed',
                        top: menuPos.y,
                        left: menuPos.x - 160,
                        zIndex: 99999,
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        minWidth: '160px',
                        overflow: 'hidden',
                    }}>
                        {(() => {
                            const lead = leads.find((l: any) => l.id === openMenuId);
                            if (!lead) return null;
                            const won = lead.sales_stage?.name === 'Order Won';
                            const btnBase: React.CSSProperties = {
                                display: 'flex', alignItems: 'center', gap: '10px',
                                width: '100%', padding: '9px 14px', background: 'none',
                                border: 'none', cursor: 'pointer', fontSize: '13px',
                                textAlign: 'left', color: '#334155',
                            };
                            return (
                                <>
                                    <button style={btnBase}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        onClick={() => { navigate(`/leads/${lead.id}`); setOpenMenuId(null); }}
                                    >
                                        <Eye size={14} color="#6366f1" /> View
                                    </button>
                                    <button style={{ ...btnBase, color: won ? '#94a3b8' : '#334155', cursor: won ? 'not-allowed' : 'pointer' }}
                                        onMouseEnter={e => { if (!won) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        onClick={() => { if (!won) { navigate(`/leads/${lead.id}/edit`); setOpenMenuId(null); } }}
                                    >
                                        <Edit size={14} color={won ? '#94a3b8' : '#10b981'} /> {won ? 'Frozen' : 'Edit'}
                                    </button>
                                    <button style={btnBase}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        onClick={() => { navigate(`/leads/new?sourceLeadId=${lead.id}`); setOpenMenuId(null); }}
                                    >
                                        <UserPlus size={14} color="#0ea5e9" /> Add Opportunity
                                    </button>
                                    <div style={{ borderTop: '1px solid #f1f5f9' }} />
                                    <button style={{ ...btnBase, color: '#ef4444' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        onClick={() => { if (window.confirm('Delete this lead?')) { deleteMutation.mutate(lead.id); setOpenMenuId(null); } }}
                                    >
                                        <Trash2 size={14} color="#ef4444" /> Delete
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
