import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
    ArrowLeft, Phone, Mail, FileText, Calculator,
    ChevronDown, ChevronUp, Save, Edit2, Sprout,
    Lock, AlertCircle, CheckCircle, XCircle, Building2,
    Globe, User, Users, ExternalLink, Plus, Clock,
    Activity, MapPin, TrendingUp, Award,
    ShieldCheck, Target, Calendar, Briefcase, Tag,
    Hash, Package, Info, Flag, Download,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import DateOverlay from '../components/DateOverlay';
import * as XLSX from 'xlsx';
import LeadScoreCard from '../components/LeadScoreCard';

dayjs.extend(utc);
import clsx from 'clsx';

type TabId = 'overview' | 'companyInfo' | 'oppLeadMgmt' | 'scorecard' | 'activities' | 'documents' | 'contacts';

const QUADRANT_CLASSES: Record<string, string> = {
    Q1: 'badge-blue',
    Q2: 'badge-amber',
    Q3: 'badge-orange',
    Q4: 'badge-green',
    'Order Won': 'badge-green',
    'Order Lost': 'badge-red',
};

const AVATAR_PALETTES = [
    'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
    'bg-fuchsia-100 text-fuchsia-700', 'bg-teal-100 text-teal-700',
];
const avatarColor = (name: string) =>
    AVATAR_PALETTES[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTES.length];

/* ── Field: label + value ── */
const Field = ({ label, icon: Icon, children, span2 }: {
    label: string; icon?: any; children: React.ReactNode; span2?: boolean;
}) => (
    <div className={span2 ? 'md:col-span-2' : undefined}>
        <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {Icon && <Icon size={10} className="text-slate-300" />}
            {label}
        </p>
        <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
);

/* ── Section accent colors ── */
type SectionColor = 'blue' | 'sky' | 'violet' | 'amber' | 'emerald' | 'indigo' | 'rose';
const SECTION_COLORS: Record<SectionColor, { header: string; iconBg: string; iconBorder: string; iconText: string; border: string }> = {
    blue:    { header: 'from-blue-50 to-transparent',    iconBg: 'bg-blue-50',    iconBorder: 'border-blue-100',    iconText: 'text-blue-600',    border: 'border-t-blue-200' },
    sky:     { header: 'from-sky-50 to-transparent',     iconBg: 'bg-sky-50',     iconBorder: 'border-sky-100',     iconText: 'text-sky-600',     border: 'border-t-sky-200' },
    violet:  { header: 'from-violet-50 to-transparent',  iconBg: 'bg-violet-50',  iconBorder: 'border-violet-100',  iconText: 'text-violet-600',  border: 'border-t-violet-200' },
    amber:   { header: 'from-amber-50 to-transparent',   iconBg: 'bg-amber-50',   iconBorder: 'border-amber-100',   iconText: 'text-amber-600',   border: 'border-t-amber-200' },
    emerald: { header: 'from-emerald-50 to-transparent', iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-100', iconText: 'text-emerald-600', border: 'border-t-emerald-200' },
    indigo:  { header: 'from-indigo-50 to-transparent',  iconBg: 'bg-indigo-50',  iconBorder: 'border-indigo-100',  iconText: 'text-indigo-600',  border: 'border-t-indigo-200' },
    rose:    { header: 'from-rose-50 to-transparent',    iconBg: 'bg-rose-50',    iconBorder: 'border-rose-100',    iconText: 'text-rose-600',    border: 'border-t-rose-200' },
};

/* ── Card section heading ── */
const SectionHead = ({ icon: Icon, title, action, color = 'blue' }: { icon: any; title: string; action?: React.ReactNode; color?: SectionColor }) => {
    const c = SECTION_COLORS[color];
    return (
        <div className={clsx('card-header bg-gradient-to-r rounded-t-2xl', c.header)}>
            <div className="flex items-center gap-2.5">
                <div className={clsx('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0', c.iconBg, c.iconBorder)}>
                    <Icon size={14} className={c.iconText} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h2>
            </div>
            {action}
        </div>
    );
};

/* ── Divider heading inside a card ── */
const Divider = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 my-5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{children}</span>
        <div className="flex-1 h-px bg-slate-100" />
    </div>
);

/* ── Print a set of {heading, rows} tables as a PDF via the browser's own
   print dialog (Save as PDF) — the same window.print() mechanism already used
   for CashflowReport/DailyReportPreview, just built as a standalone document
   instead of a print stylesheet over the live page. ── */
const printAsPdf = (title: string, sections: { heading: string; rows: Record<string, any>[] }[]) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow pop-ups for this site to export as PDF.'); return; }

    const escapeHtml = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c] as string));

    const tablesHtml = sections.map(({ heading, rows }) => {
        if (!rows.length) return '';
        const cols = Object.keys(rows[0]);
        return `
            <h2>${escapeHtml(heading)}</h2>
            <table>
                <thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>`;
    }).join('');

    win.document.write(`
        <html>
        <head>
            <title>${escapeHtml(title)}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #1e293b; padding: 24px; }
                h1 { font-size: 18px; margin-bottom: 4px; }
                h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 24px 0 8px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; font-size: 12px; vertical-align: top; }
                th { background: #f1f5f9; font-weight: 600; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(title)}</h1>
            ${tablesHtml}
        </body>
        </html>
    `);
    win.document.close();
    win.focus();
    win.print();
};

/* ── BANT card ── */
const BantCard = ({ label, ok, positiveText, negativeText, detail }: {
    label: string; ok: boolean; positiveText: string; negativeText: string; detail?: string;
}) => (
    <div className={clsx('p-4 rounded-xl border', ok ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center justify-between mb-2">
            <span className={clsx('text-[11px] font-bold uppercase tracking-wider', ok ? 'text-emerald-700' : 'text-slate-500')}>
                {label}
            </span>
            <span className={clsx(
                'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'
            )}>
                {ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
                {ok ? positiveText : negativeText}
            </span>
        </div>
        {detail && <p className="text-xs text-slate-500 leading-snug mt-1">{detail}</p>}
    </div>
);

/* ════════════════════════════════════════════════════════════ */
export default function LeadDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightMilestoneId = searchParams.get('milestone');
    const [showScoreCard, setShowScoreCard] = useState(false);
    const [scoreCardHidden, setScoreCardHidden] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const queryClient = useQueryClient();

    const [scores, setScores] = useState({
        reduce_cost_score: 0,
        efficiency_score: 0,
        automation_score: 0,
        others_score: 0,
        others_score_label: '',
        compliance_score: 0,
        established_need_score: 0,
        urgency_score: 0,
        budget_allocated_score: 0,
        decision_maker_score: 0,
        competition_score: 0,
        champion_score: 0,
        influencer_score: 0,
        lead_source_quality: 0,
        decision_contact_score: 0,
    });
    const [bant, setBant] = useState({
        budget_yes_no: false, budget_allocated: '', approval_stage: '',
        authority_yes_no: false, decision_maker: '',
        need_yes_no: false, pain_points_desc: '',
        timeline_yes_no: false, expected_closure_date: ''
    });
    const [docDescription, setDocDescription] = useState('');
    const [negotiation, setNegotiation] = useState({ details: '', date: '' });

    // Tracks which lead id's data has already been loaded into the local score/BANT state.
    // Without this guard, React Query's default background refetch (e.g. on window focus)
    // re-runs this queryFn and silently overwrites any in-progress, unsaved Score Card edits
    // with the last-saved server values.
    const hydratedScoreLeadIdRef = useRef<number | null>(null);

    const { data: lead, isLoading, isError, error } = useQuery({
        queryKey: ['leads', id],
        queryFn: async () => {
            const res = await api.get(`/leads/${id}`);
            if (res.data && hydratedScoreLeadIdRef.current !== res.data.id) {
                hydratedScoreLeadIdRef.current = res.data.id;
                setScores({
                    reduce_cost_score: res.data.reduce_cost_score || 0,
                    efficiency_score: res.data.efficiency_score || 0,
                    automation_score: res.data.automation_score || 0,
                    others_score: res.data.others_score || 0,
                    others_score_label: res.data.others_score_label || '',
                    compliance_score: res.data.compliance_score || 0,
                    established_need_score: res.data.established_need_score || 0,
                    urgency_score: res.data.urgency_score || 0,
                    budget_allocated_score: res.data.budget_allocated_score || 0,
                    decision_maker_score: res.data.decision_maker_score || 0,
                    competition_score: res.data.competition_score || 0,
                    champion_score: res.data.champion_score || 0,
                    influencer_score: res.data.influencer_score || 0,
                    lead_source_quality: res.data.lead_source_quality || 0,
                    decision_contact_score: res.data.decision_contact_score || 0,
                });
                setBant({
                    budget_yes_no: res.data.budget_yes_no === true || res.data.budget_yes_no === 'true',
                    budget_allocated: res.data.budget_allocated || '',
                    approval_stage: res.data.approval_stage || '',
                    authority_yes_no: res.data.authority_yes_no === true || res.data.authority_yes_no === 'true',
                    decision_maker: res.data.decision_maker || '',
                    need_yes_no: res.data.need_yes_no === true || res.data.need_yes_no === 'true',
                    pain_points_desc: res.data.pain_points_desc || '',
                    timeline_yes_no: res.data.timeline_yes_no === true || res.data.timeline_yes_no === 'true',
                    expected_closure_date: res.data.expected_closure_date ? res.data.expected_closure_date.slice(0, 10) : '',
                });
            }
            return res.data;
        },
    });

    // Deep-linked from the Dashboard's Cash Flow Activities tooltip (?milestone=<id>) —
    // jump to the Opportunity & Lead Management tab and scroll the matching milestone
    // row into view once the lead (and its milestones table) has rendered.
    useEffect(() => {
        if (!highlightMilestoneId || !lead) return;
        setActiveTab('oppLeadMgmt');
        const timer = setTimeout(() => {
            document.getElementById(`milestone-row-${highlightMilestoneId}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return () => clearTimeout(timer);
    }, [highlightMilestoneId, lead]);

    // Full BANT question master (all categories, active questions) — the lead's own
    // bant_answers only carries rows that were actually answered, which used to make
    // the export silently drop every unanswered question instead of listing it.
    const { data: bantCategories } = useQuery({
        queryKey: ['masters', 'bant-categories'],
        queryFn: () => api.get('/masters/bant-categories').then(r => r.data),
    });
    const { data: allBantQuestions } = useQuery({
        queryKey: ['masters', 'bant-questions', 'all', (bantCategories as any[] | undefined)?.map((c: any) => c.id).join(',')],
        queryFn: async () => {
            const lists = await Promise.all(
                (bantCategories as any[]).map((c: any) =>
                    api.get(`/masters/bant-questions?category_id=${c.id}`).then(r => (r.data as any[]).map((q: any) => ({ ...q, category: c })))
                )
            );
            return lists.flat();
        },
        enabled: !!bantCategories && (bantCategories as any[]).length > 0,
    });

    const saveScoreMutation = useMutation({
        mutationFn: async (scoreData: any) => { await api.put(`/leads/${id}/score`, scoreData); },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['leads', id] });
            await queryClient.invalidateQueries({ queryKey: ['leads'] });
            alert('Score updated successfully!');
        },
        onError: (error: any) => {
            console.error('Score update failed:', error);
            alert('Failed to update score. Please try again.');
        },
    });

    const moveToFarmingMutation = useMutation({
        mutationFn: async () => { await api.put(`/leads/${id}`, { is_farming: !lead.is_farming }); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads', id] });
            alert('Lead farming status updated!');
        },
    });

    const addLogMutation = useMutation({
        mutationFn: async () => {
            if (!negotiation.details) return;
            await api.post(`/leads/${id}/pricing-negotiations`, negotiation);
        },
        onSuccess: () => {
            setNegotiation({ details: '', date: '' });
            queryClient.invalidateQueries({ queryKey: ['leads', id] });
        },
    });

    const handleScoreChange = (field: string, value: any) => setScores(prev => ({ ...prev, [field]: value }));
    const handleBantChange = (field: string, value: any) => {
        setBant(prev => ({ ...prev, [field]: value }));
        // Auto-reset the related score when its checkbox is unchecked
        if (field === 'budget_yes_no' && !value) setScores(prev => ({ ...prev, budget_allocated_score: 0 }));
        if (field === 'authority_yes_no' && !value) setScores(prev => ({ ...prev, decision_maker_score: 0 }));
        if (field === 'need_yes_no' && !value) setScores(prev => ({ ...prev, established_need_score: 0 }));
        if (field === 'timeline_yes_no' && !value) setScores(prev => ({ ...prev, urgency_score: 0 }));
    };
    const handleSaveScores = () => saveScoreMutation.mutate({ ...scores, ...bant });

    const getMultiplier = (type: 'device' | 'lead') => {
        if (!lead?.product || !lead.quadrant) return 1.0;
        const q = lead.quadrant.toLowerCase();
        const field = `${type}_${q}_multiplier`;
        return lead.product[field] || 1.0;
    };

    const calculateTarget = (baseCount: number, multiplier: number) => {
        if (!baseCount) return 0;
        return Number((baseCount * multiplier).toFixed(2));
    };

    const isFrozen = lead?.sales_stage?.name === 'Order Won' || lead?.sales_stage?.name === 'Lost';
    const frozenLabel = lead?.sales_stage?.name === 'Lost' ? 'Order Lost' : 'Order Won';

    /* ── Loading ── */
    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-3 mb-8">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card p-6 space-y-4">
                            <div className="skeleton h-4 w-40 rounded" />
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="space-y-2">
                                        <div className="skeleton h-2.5 w-20 rounded" />
                                        <div className="skeleton h-4 w-32 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-6">
                    <div className="card p-6 space-y-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
                    </div>
                </div>
            </div>
        </div>
    );

    /* ── Error ── */
    if (isError) return (
        <div className="page-wrapper">
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">
                    {(error as any)?.response?.data?.message || (error as any)?.message}
                </span>
            </div>
        </div>
    );

    const quadrantClass = QUADRANT_CLASSES[lead.quadrant] || 'badge-gray';
    const bantCount = [lead.budget_yes_no, lead.authority_yes_no, lead.need_yes_no, lead.timeline_yes_no].filter(Boolean).length;
    const bantScore =
        (lead.budget_allocated_score || 0) +
        (lead.decision_maker_score || 0) +
        (lead.established_need_score || 0) +
        (lead.urgency_score || 0);
    const ownerName = `${lead.owner?.first_name ?? ''} ${lead.owner?.last_name ?? ''}`.trim();
    const contactName = [lead.salutation, lead.first_name, lead.last_name].filter(Boolean).join(' ');
    const location = [lead.city?.name, lead.state?.name, lead.country?.name].filter(Boolean).join(', ');

    const exportFileBase = (contactName || lead.company_name || 'Lead').replace(/\s+/g, '_');

    const buildBantSummary = () => [{
        'Lead': contactName || lead.company_name,
        'Company': lead.company_name || lead.company_master?.name || '-',
        'BANT Qualified': `${bantCount}/4`,
        'BANT Score': bantScore,
        'Budget': lead.budget_yes_no ? 'Confirmed' : 'Not Confirmed',
        'Budget Amount': lead.budget_allocated || '',
        'Approval Stage': lead.approval_stage || '',
        'Authority': lead.authority_yes_no ? 'Identified' : 'Not Identified',
        'Decision Maker': lead.decision_maker || '',
        'Need': lead.need_yes_no ? 'Established' : 'Not Established',
        'Pain Points': lead.pain_points_desc || '',
        'Timeline': lead.timeline_yes_no ? 'Defined' : 'Not Defined',
        'Expected Closure Date': lead.expected_closure_date ? dayjs(lead.expected_closure_date).format('DD-MMM-YYYY') : '',
    }];

    // All master questions, not just the ones with a saved answer — an unanswered
    // question used to be silently missing from the export instead of showing up
    // with "No answer".
    const buildBantPillarRows = () => {
        if (!allBantQuestions || (allBantQuestions as any[]).length === 0) return [];
        const answerByQuestionId: Record<number, string> = {};
        ((lead as any).bant_answers || []).forEach((ans: any) => {
            answerByQuestionId[ans.question_id ?? ans.question?.id] = ans.answer || '';
        });
        const pillarOrder = ['B', 'A', 'N', 'T'];
        const sortedQuestions = [...(allBantQuestions as any[])].sort((a, b) => {
            const ai = pillarOrder.indexOf((a.category?.code || '').toUpperCase());
            const bi = pillarOrder.indexOf((b.category?.code || '').toUpperCase());
            if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
        return sortedQuestions.map((q: any) => ({
            'Pillar': q.category?.name || q.category?.code || '-',
            'Question': q.question || '-',
            'Answer': answerByQuestionId[q.id] || 'No answer',
        }));
    };

    const exportBantExcel = () => {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildBantSummary()), 'BANT Summary');
        const pillarRows = buildBantPillarRows();
        if (pillarRows.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pillarRows), 'Pillar Questions');
        }
        XLSX.writeFile(wb, `BANT_${exportFileBase}_${lead.id}.xlsx`);
    };

    const exportBantPdf = () => {
        const pillarRows = buildBantPillarRows();
        printAsPdf(`BANT Score — ${contactName || lead.company_name}`, [
            { heading: 'BANT Summary', rows: buildBantSummary() },
            ...(pillarRows.length > 0 ? [{ heading: 'Pillar Questions', rows: pillarRows }] : []),
        ]);
    };

    // Mirrors LeadScoreCard's own section/criteria layout and totals.
    const buildScoreCardRows = () => {
        const rows = [
            { Section: 'A. Lead Source Details', Criterion: 'Lead Source Quality', Score: scores.lead_source_quality },
            { Section: 'A. Lead Source Details', Criterion: 'Decision Maker Contact', Score: scores.decision_contact_score },
            { Section: 'B. Organization Needs', Criterion: 'Reduce Cost', Score: scores.reduce_cost_score },
            { Section: 'B. Organization Needs', Criterion: 'Efficiency', Score: scores.efficiency_score },
            { Section: 'B. Organization Needs', Criterion: 'Automation', Score: scores.automation_score },
            { Section: 'B. Organization Needs', Criterion: 'Compliance', Score: scores.compliance_score },
            { Section: 'B. Organization Needs', Criterion: scores.others_score_label ? `Others (${scores.others_score_label})` : 'Others', Score: scores.others_score },
            { Section: 'C. BANT / Critical Qualification Factors', Criterion: 'Allocated Budget', Score: scores.budget_allocated_score },
            { Section: 'C. BANT / Critical Qualification Factors', Criterion: 'Decision Maker', Score: scores.decision_maker_score },
            { Section: 'C. BANT / Critical Qualification Factors', Criterion: 'Established Need', Score: scores.established_need_score },
            { Section: 'C. BANT / Critical Qualification Factors', Criterion: 'Prioritized Urgency', Score: scores.urgency_score },
            { Section: 'D. Other Key Info', Criterion: 'Competition Presence', Score: scores.competition_score },
            { Section: 'D. Other Key Info', Criterion: 'Champion Within', Score: scores.champion_score },
            { Section: 'D. Other Key Info', Criterion: 'Influencer Identified', Score: scores.influencer_score },
        ];
        const overallTotal = rows.reduce((s, r) => s + (r.Score || 0), 0);
        rows.push({ Section: '', Criterion: 'Overall Score (/ 28)', Score: overallTotal });
        return rows;
    };

    const exportScoreCardExcel = () => {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildScoreCardRows()), 'Score Card');
        XLSX.writeFile(wb, `ScoreCard_${exportFileBase}_${lead.id}.xlsx`);
    };

    const exportScoreCardPdf = () => {
        printAsPdf(`Score Card — ${contactName || lead.company_name}`, [
            { heading: 'Score Card', rows: buildScoreCardRows() },
        ]);
    };

    const TABS: { id: TabId; label: string; icon: any; badge?: number }[] = [
        { id: 'overview',      label: 'Overview',       icon: Building2 },
        { id: 'companyInfo',   label: 'Company Info',   icon: Briefcase },
        { id: 'oppLeadMgmt',   label: 'Opportunity & Lead Mgmt', icon: Target },
        { id: 'scorecard',    label: 'Score Card',      icon: Calculator },
        { id: 'activities',   label: 'Commercials & Activity', icon: Activity,  badge: lead.follow_up_logs?.length || 0 },
        { id: 'documents',    label: 'Documents',       icon: FileText,  badge: lead.documents?.length || 0 },
        { id: 'contacts',     label: 'Contacts',        icon: Users,     badge: (lead.contacts?.length || 0) + 1 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-50">
            {/* ════════ Sticky Header ════════ */}
            <div className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-20">
                <div className="px-6 md:px-8 pt-6 pb-0 max-w-[1440px] mx-auto">

                    <div className="flex items-start gap-4 mb-5">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0 mt-0.5"
                        >
                            <ArrowLeft size={16} />
                        </button>

                        <div className="flex-1 min-w-0">
                            {/* Company + status badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                                    {lead.company_name || lead.company_master?.name || '—'}
                                </h1>
                                {lead.quadrant && <span className={clsx('badge', quadrantClass)}>{lead.quadrant}</span>}
                                {isFrozen && (
                                    <span className={`badge ${frozenLabel === 'Order Lost' ? 'badge-red' : 'badge-green'} flex items-center gap-1`}>
                                        <Lock size={10} /> {frozenLabel}
                                    </span>
                                )}
                                {lead.is_farming && (
                                    <span className="badge badge-purple flex items-center gap-1">
                                        <Sprout size={10} /> Farming
                                    </span>
                                )}
                                {lead.requires_requalification && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/leads/${lead.id}/edit?focus=scorecard`)}
                                        className="badge badge-orange flex items-center gap-1 hover:brightness-95 cursor-pointer"
                                        title="Click to Requalify"
                                    >
                                        <AlertCircle size={10} />
                                        {lead.quadrant === 'Nurturing' ? 'Requalification Required' : 'Auto Degraded – Click to Requalify'}
                                    </button>
                                )}
                            </div>

                            {/* Contact + location */}
                            <div className="flex items-center gap-3 flex-wrap mt-1.5">
                                {contactName && (
                                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <User size={12} className="text-slate-400" />
                                        {contactName}
                                        {lead.job_title?.name && (
                                            <span className="text-slate-400">· {lead.job_title.name}</span>
                                        )}
                                    </span>
                                )}
                                {location && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <MapPin size={11} /> {location}
                                    </span>
                                )}
                            </div>

                            {/* KPI chips */}
                            <div className="flex items-center gap-2 flex-wrap mt-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 border border-primary-100 rounded-full">
                                    <Award size={11} className="text-primary-600" />
                                    <span className="text-[11px] font-bold text-primary-700">Score {lead.lead_score || 0}/28</span>
                                </div>
                                <div className={clsx(
                                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
                                    bantCount === 4 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                                )}>
                                    <ShieldCheck size={11} className={bantCount === 4 ? 'text-emerald-600' : 'text-slate-400'} />
                                    <span className={clsx('text-[11px] font-bold', bantCount === 4 ? 'text-emerald-700' : 'text-slate-500')}>
                                        BANT {bantCount}/4
                                    </span>
                                </div>
                                {ownerName && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">
                                        <User size={11} className="text-slate-400" />
                                        <span className="text-[11px] font-medium text-slate-600">{ownerName}</span>
                                    </div>
                                )}
                                {lead.opportunities_values && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full">
                                        <TrendingUp size={11} className="text-violet-600" />
                                        <span className="text-[11px] font-bold text-violet-700">
                                            ₹{Number(lead.opportunities_values).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                )}
                                {lead.sales_stage?.name && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
                                        <Target size={11} className="text-amber-600" />
                                        <span className="text-[11px] font-medium text-amber-700">{lead.sales_stage.name}</span>
                                    </div>
                                )}
                                {(lead as any).forecast_header?.expected_order_closure_date && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-full">
                                        <Clock size={11} className="text-sky-600" />
                                        <span className="text-[11px] font-medium text-sky-700">
                                            Expected Order Closure Date: {dayjs((lead as any).forecast_header.expected_order_closure_date).format('DD/MM/YYYY')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            <button
                                onClick={() => {
                                    if (isFrozen) { alert(`This lead is frozen (${frozenLabel}) and cannot be moved to farming.`); return; }
                                    moveToFarmingMutation.mutate();
                                }}
                                disabled={moveToFarmingMutation.isPending}
                                className={clsx(
                                    'btn btn-sm',
                                    lead.is_farming ? 'btn-secondary text-emerald-600 border-emerald-200' : 'btn-secondary',
                                    isFrozen && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                <Sprout size={14} />
                                {lead.is_farming ? 'Farming Active' : 'Move to Farming'}
                                {isFrozen && <Lock size={11} />}
                            </button>
                            {lead.is_editable && (
                                <Link
                                    to={isFrozen ? '#' : `/leads/${id}/edit`}
                                    onClick={(e) => { if (isFrozen) { e.preventDefault(); alert(`This lead is frozen (${frozenLabel}) and cannot be edited.`); } }}
                                    className={clsx('btn btn-sm btn-secondary', isFrozen && 'opacity-50 pointer-events-none')}
                                >
                                    <Edit2 size={14} />
                                    {isFrozen ? 'View / Review' : 'Edit Lead'}
                                </Link>
                            )}
                            <button disabled={isFrozen} className="btn btn-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                <Phone size={14} />
                                Log Call
                            </button>
                        </div>
                    </div>

                    {lead.requires_requalification && (
                        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-4 flex items-start gap-3">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">This lead has been automatically degraded.</p>
                                <p className="text-sm">Lead Score and BANT values have been reset. Please requalify the lead to continue the sales process.</p>
                            </div>
                        </div>
                    )}

                    {/* Tab nav */}
                    <div className="flex items-center gap-1 p-1.5 mb-4 rounded-xl bg-slate-100/80 overflow-x-auto w-fit max-w-full">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                                        active
                                            ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                                    )}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                    {tab.badge !== undefined && tab.badge > 0 && (
                                        <span className={clsx(
                                            'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none',
                                            active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                                        )}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ════════ Tab Content ════════ */}
            <div className="px-6 md:px-8 py-6 max-w-[1440px] mx-auto">

                {/* ══ OVERVIEW ══ */}
                {activeTab === 'overview' && (
                    <div className="space-y-5">
  {/* Lead Meta Strip */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 divide-x divide-slate-100">
                                <div className="px-3 first:pl-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lead Owner</p>
                                    <div className="flex items-center gap-2">
                                        {ownerName && (
                                            <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', avatarColor(ownerName))}>
                                                {lead.owner?.first_name?.[0]?.toUpperCase()}{lead.owner?.last_name?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold text-slate-800 truncate">{ownerName || '—'}</span>
                                    </div>
                                </div>
                                <div className="px-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Created By</p>
                                    <p className="text-sm font-medium text-slate-700">
                                        {lead.creator ? `${lead.creator.first_name} ${lead.creator.last_name || ''}`.trim() : '—'}
                                    </p>
                                </div>
                                <div className="px-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sales SBU</p>
                                    <p className="text-sm font-medium text-slate-700">{lead.sbu?.name || '—'}</p>
                                </div>
                                <div className="px-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lead Source</p>
                                    <p className="text-sm font-medium text-slate-700">{lead.lead_source?.name || '—'}</p>
                                </div>
                                <div className="px-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Created On</p>
                                    <p className="text-sm font-medium text-slate-700">
                                        {lead.created_at ? dayjs(lead.created_at).format('DD/MM/YYYY') : '—'}
                                    </p>
                                </div>
                                <div className="px-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tele Qualified</p>
                                    <span className={clsx(
                                        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                        lead.telecalling_qualified
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-500'
                                    )}>
                                        {lead.telecalling_qualified ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                        {lead.telecalling_qualified ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Lead Summary */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead icon={Info} title="Lead Summary" />
                            <div className="p-5">
                                <div className="flex items-start gap-4 mb-5">
                                    {contactName ? (
                                        <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor(contactName))}>
                                            {lead.first_name?.[0]?.toUpperCase()}{lead.last_name?.[0]?.toUpperCase()}
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <User size={20} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-base font-bold text-slate-900 truncate">{contactName || '—'}</p>
                                        <p className="text-sm text-slate-500">{lead.persona?.name || 'Customer persona not specified'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                    <Field label="Company Name" icon={Building2}>
                                        {lead.company_name || lead.company_master?.name || '—'}
                                    </Field>
                                    <Field label="Mobile Number" icon={Phone}>
                                        {lead.mobile_number || '—'}
                                    </Field>
                                    <Field label="Email" icon={Mail}>
                                        {lead.email ? (
                                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-primary-600 hover:underline truncate">
                                                <Mail size={13} />{lead.email}
                                            </a>
                                        ) : '—'}
                                    </Field>
                                    <Field label="Location" icon={MapPin}>
                                        {location || '—'}
                                    </Field>
                                    <Field label="Industry" icon={Briefcase}>
                                        {lead.industry?.name || '—'}
                                    </Field>
                                    <Field label="Product" icon={Package}>
                                        {lead.product?.name || '—'}
                                    </Field>
                                    <Field label="Project Name / Order Name" icon={Package}>
                                        {lead.project_name || '—'}
                                    </Field>
                                    <Field label="Quadrant" icon={Target}>
                                        {lead.quadrant ? <span className={clsx('badge', quadrantClass)}>{lead.quadrant}</span> : '—'}
                                    </Field>
                                    <Field label="CP Score" icon={CheckCircle}>
                                        {(lead as any).cp_score ?? 0}
                                    </Field>
                                    <Field label="BANT Score" icon={ShieldCheck}>
                                        {bantScore}
                                    </Field>
                                    <Field label={isFrozen && lead.order_value ? 'Order Value' : 'Opportunity Value'} icon={TrendingUp}>
                                        {isFrozen && lead.order_value
                                            ? `₹${Number(lead.order_value).toLocaleString('en-IN')}`
                                            : lead.opportunities_values
                                                ? `₹${Number(lead.opportunities_values).toLocaleString('en-IN')}`
                                                : '—'}
                                    </Field>
                                </div>
                            </div>
                        </div>

                      

                        {/* BANT Summary */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead
                                icon={ShieldCheck}
                                title="BANT Summary"
                                action={
                                    <button onClick={() => setActiveTab('scorecard')} className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold">
                                        View full →
                                    </button>
                                }
                            />
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <BantCard label="Budget" ok={lead.budget_yes_no} positiveText="Confirmed" negativeText="Unconfirmed"
                                    detail={lead.budget_allocated || lead.approval_stage || undefined} />
                                <BantCard label="Authority" ok={lead.authority_yes_no} positiveText="Identified" negativeText="Unknown"
                                    detail={lead.decision_maker || undefined} />
                                <BantCard label="Need" ok={lead.need_yes_no} positiveText="Established" negativeText="Unclear"
                                    detail={lead.pain_points_desc || undefined} />
                                <BantCard label="Timeline" ok={lead.timeline_yes_no} positiveText="Defined" negativeText="Undefined"
                                    detail={lead.expected_closure_date ? dayjs(lead.expected_closure_date).format('DD/MM/YYYY') : undefined} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ OPPORTUNITY & LEAD MANAGEMENT ══ */}
                {activeTab === 'oppLeadMgmt' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Left 2/3 */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Opportunity Details */}
                            <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <SectionHead icon={Package} title="Opportunity Details" color="violet" />
                                <div className="p-5">
                                    {/* Product / Service */}
                                    <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <Field label="Type" icon={Tag}>
                                                {lead.product_or_service === 'Product' ? 'Product'
                                                    : lead.product_or_service === 'EitService' ? 'EIT Services'
                                                    : lead.product_or_service === 'ImService' ? 'IM Services'
                                                    : '—'}
                                            </Field>
                                            {lead.product_or_service === 'Product' && (
                                                <>
                                                    <Field label="Product" icon={Package}>{lead.product?.name || '—'}</Field>
                                                    <Field label="Project Name / Order Name" icon={Package}>{lead.project_name || '—'}</Field>
                                                    <Field label="Customer Persona" icon={User}>{lead.persona?.name || '—'}</Field>
                                                </>
                                            )}
                                            {lead.product_or_service === 'EitService' && (
                                                <Field label="EIT Service" icon={Package}>{lead.eitService?.name || 'EIT Services'}</Field>
                                            )}
                                            {lead.product_or_service === 'ImService' && (
                                                <Field label="IM Service" icon={Package}>{lead.imService?.name || 'IM Services'}</Field>
                                            )}
                                        </div>
                                    </div>

                                    {/* License / Count */}
                                    {(() => {
                                        const countType = lead.product?.count_type || lead.service?.count_type;
                                        if (!countType) return null;
                                        let baseValue = lead.license_count;
                                        if (!baseValue) {
                                            const t = countType.toLowerCase();
                                            if (t.includes('device')) baseValue = lead.device_count;
                                            else if (t.includes('employee')) baseValue = lead.employee_count;
                                            else if (t.includes('vendor')) baseValue = lead.vendor_count;
                                            else if (t.includes('branch') || t.includes('unit')) baseValue = lead.branch_unit;
                                        }
                                        if (!baseValue) return null;
                                        const type = countType.toLowerCase().includes('device') ? 'device' : 'lead';
                                        const mult = getMultiplier(type);
                                        calculateTarget(Number(baseValue), mult);
                                        return (
                                            <div className="mb-5 inline-flex items-center gap-4 bg-primary-50 border border-primary-100 px-5 py-3 rounded-xl">
                                                <div>
                                                    <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wider mb-0.5">{countType}</p>
                                                    <p className="text-2xl font-bold text-primary-700">{baseValue}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Descriptions */}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Info size={10} className="text-slate-300" /> Requirement Description
                                            </p>
                                            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed border border-slate-100">
                                                {lead.requirement_desc || <span className="text-slate-400 italic">No description provided.</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Info size={10} className="text-slate-300" /> Pain Points
                                            </p>
                                            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed border border-slate-100">
                                                {lead.pain_points || <span className="text-slate-400 italic">No pain points listed.</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Info size={10} className="text-slate-300" /> Competitor Details
                                            </p>
                                            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed border border-slate-100">
                                                {lead.competitor_details || <span className="text-slate-400 italic">No competitor details.</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Collaterals + Demo/Pilot */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Collaterals Shared</p>
                                            {lead.collaterals && lead.collaterals.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {lead.collaterals.map((c: any) => (
                                                        <span key={c.id} className="badge badge-blue">{c.name}</span>
                                                    ))}
                                                </div>
                                            ) : <p className="text-sm text-slate-400">None shared</p>}
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Demo Completed</span>
                                                <span className={clsx(
                                                    'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                                    lead.demo_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                )}>
                                                    {lead.demo_completed ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                    {lead.demo_completed ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pilot Provided</span>
                                                <span className={clsx(
                                                    'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                                    lead.pilot_provided ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                )}>
                                                    {lead.pilot_provided ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                    {lead.pilot_provided ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right 1/3 */}
                        <div className="space-y-5">
                            {/* Opportunity Value */}
                            <div className="rounded-2xl p-5 shadow-lg shadow-blue-900/10" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)' }}>
                                <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1.5">Opportunity Value</p>
                                <p className="text-3xl font-bold text-white leading-tight">
                                    {lead.opportunities_values
                                        ? `₹${Number(lead.opportunities_values).toLocaleString('en-IN')}`
                                        : '—'}
                                </p>
                                {isFrozen && lead.order_value && (
                                    <div className="mt-3 pt-3 border-t border-blue-700">
                                        {(lead as any).order_won_at && (
                                            <p className="text-[11px] font-semibold text-emerald-200 mb-1">
                                                Won on {dayjs((lead as any).order_won_at).format('DD/MM/YYYY')}
                                            </p>
                                        )}
                                        <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-0.5">Order Value (Won)</p>
                                        <p className="text-xl font-bold text-emerald-300">₹{Number(lead.order_value).toLocaleString('en-IN')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Key Dates & Stage */}
                            <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <SectionHead icon={Calendar} title="Key Dates & Stage" color="violet" />
                                <div className="p-4 space-y-3">
                                    {(lead as any).enquiry_date && (
                                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={13} />
                                                <span className="text-xs font-medium">Enquiry Date</span>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-800">
                                                {dayjs((lead as any).enquiry_date).format('DD/MM/YYYY')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={13} />
                                            <span className="text-xs font-medium">Expected Closure</span>
                                        </div>
                                        <span className={clsx(
                                            'text-sm font-semibold',
                                            lead.expected_closure_date
                                                ? (dayjs(lead.expected_closure_date).isBefore(dayjs()) ? 'text-red-600' : 'text-slate-800')
                                                : 'text-slate-400'
                                        )}>
                                            {lead.expected_closure_date
                                                ? dayjs(lead.expected_closure_date).format('DD/MM/YYYY')
                                                : '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={13} />
                                            <span className="text-xs font-medium">Expected Order Closure Date</span>
                                        </div>
                                        <span className={clsx(
                                            'text-sm font-semibold',
                                            (lead as any).forecast_header?.expected_order_closure_date ? 'text-slate-800' : 'text-slate-400'
                                        )}>
                                            {(lead as any).forecast_header?.expected_order_closure_date
                                                ? dayjs((lead as any).forecast_header.expected_order_closure_date).format('DD/MM/YYYY')
                                                : '—'}
                                        </span>
                                    </div>
                                    {(lead as any).order_won_at && (
                                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <CheckCircle size={13} />
                                                <span className="text-xs font-medium">Order Won Date</span>
                                            </div>
                                            <span className="text-sm font-semibold text-emerald-600">
                                                {dayjs((lead as any).order_won_at).format('DD/MM/YYYY')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Activity size={13} />
                                            <span className="text-xs font-medium">Next Activity</span>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-800">
                                            {lead.next_activity?.name || '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Target size={13} />
                                            <span className="text-xs font-medium">Sales Stage</span>
                                        </div>
                                        {lead.sales_stage?.name ? (
                                            <span className="badge badge-amber">{lead.sales_stage.name}</span>
                                        ) : (
                                            <span className="text-sm text-slate-400">—</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {lead.is_farming && (
                                <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <div className="p-4 flex items-center gap-2 text-purple-700">
                                        <Sprout size={16} />
                                        <span className="text-sm font-semibold">This lead is in Farming</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ COMPANY INFO ══ */}
                {activeTab === 'companyInfo' && (
                    <div className="space-y-5">
                        {/* Company header strip */}
                        <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-sky-50/60 to-transparent shadow-sm">
                            <div className="p-5 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white border border-sky-200 flex items-center justify-center shrink-0 shadow-sm">
                                    <Building2 size={24} className="text-sky-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-lg font-bold text-slate-900 truncate">
                                        {lead.company_name || lead.company_master?.name || '—'}
                                    </p>
                                    <p className="text-sm text-slate-500">{lead.industry?.name || 'Industry not specified'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-2 space-y-5">
                                {/* Company Details */}
                                <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <SectionHead icon={Building2} title="Company Details" color="sky" />
                                    <div className="p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                            <Field label="Company" icon={Building2}>
                                                {lead.company_name || lead.company_master?.name || '—'}
                                            </Field>
                                            <Field label="Industry" icon={Briefcase}>
                                                {lead.industry?.name || '—'}
                                            </Field>
                                            <Field label="Annual Turnover" icon={TrendingUp}>
                                                {lead.annual_turnover || '—'}
                                            </Field>
                                            <Field label="Lead Source" icon={Tag}>
                                                {lead.lead_source?.name || '—'}
                                            </Field>
                                            <Field label="Sales SBU" icon={Briefcase}>
                                                {lead.sbu?.name || '—'}
                                            </Field>
                                            <Field label="Website" icon={Globe}>
                                                {lead.website ? (
                                                    <a href={lead.website} target="_blank" rel="noreferrer"
                                                        className="flex items-center gap-1.5 text-primary-600 hover:underline">
                                                        <Globe size={13} />{lead.website}<ExternalLink size={11} />
                                                    </a>
                                                ) : '—'}
                                            </Field>
                                        </div>

                                        <Divider>Address</Divider>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            <Field label="Country" icon={MapPin}>{lead.country?.name || '—'}</Field>
                                            <Field label="State">{lead.state?.name || '—'}</Field>
                                            <Field label="City">{lead.city?.name || '—'}</Field>
                                            <Field label="Pin Code" icon={Hash}>{lead.pin_code || '—'}</Field>
                                            <Field label="Street Address" icon={MapPin} span2>
                                                {lead.address || '—'}
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: quick facts */}
                            <div className="space-y-5">
                                <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <SectionHead icon={Info} title="Quick Facts" color="sky" />
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <User size={13} />
                                                <span className="text-xs font-medium">Created By</span>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-800">
                                                {lead.creator ? `${lead.creator.first_name} ${lead.creator.last_name || ''}`.trim() : '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={13} />
                                                <span className="text-xs font-medium">Created On</span>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-800">
                                                {lead.created_at ? dayjs(lead.created_at).format('DD/MM/YYYY') : '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <CheckCircle size={13} />
                                                <span className="text-xs font-medium">Tele Qualified</span>
                                            </div>
                                            <span className={clsx(
                                                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                                lead.telecalling_qualified
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            )}>
                                                {lead.telecalling_qualified ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                {lead.telecalling_qualified ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ QUALIFICATION ══ */}
                {/* ══ SCORE CARD ══ */}
                {activeTab === 'scorecard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3 space-y-6">
                        {/* BANT Detail */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead
                                icon={ShieldCheck}
                                title="BANT Qualification"
                                color="amber"
                                action={
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            'text-[11px] font-bold px-2.5 py-1 rounded-full',
                                            bantCount === 4 ? 'bg-emerald-100 text-emerald-700' :
                                            bantCount >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-500'
                                        )}>
                                            {bantCount}/4 Qualified
                                        </span>
                                        <button
                                            onClick={exportBantExcel}
                                            title="Export BANT Score to Excel"
                                            className="flex items-center gap-1 text-[11px] font-semibold text-white bg-slate-700 hover:bg-slate-800 px-2.5 py-1 rounded-full transition-colors"
                                        >
                                            <Download size={11} /> Excel
                                        </button>
                                        <button
                                            onClick={exportBantPdf}
                                            title="Export BANT Score to PDF"
                                            className="flex items-center gap-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-full transition-colors"
                                        >
                                            <Download size={11} /> PDF
                                        </button>
                                    </div>
                                }
                            />
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={clsx('p-4 rounded-xl border', lead.budget_yes_no ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={clsx('text-[11px] font-bold uppercase tracking-wider', lead.budget_yes_no ? 'text-emerald-700' : 'text-slate-500')}>Budget</span>
                                        <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', lead.budget_yes_no ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500')}>
                                            {lead.budget_yes_no ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                            {lead.budget_yes_no ? 'Confirmed' : 'Not Confirmed'}
                                        </span>
                                    </div>
                                    {lead.budget_allocated && <p className="text-xs text-slate-600 mb-1">Amount: {lead.budget_allocated}</p>}
                                    {lead.approval_stage && <p className="text-xs text-slate-500">Approval: {lead.approval_stage}</p>}
                                </div>
                                <div className={clsx('p-4 rounded-xl border', lead.authority_yes_no ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={clsx('text-[11px] font-bold uppercase tracking-wider', lead.authority_yes_no ? 'text-emerald-700' : 'text-slate-500')}>Authority</span>
                                        <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', lead.authority_yes_no ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500')}>
                                            {lead.authority_yes_no ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                            {lead.authority_yes_no ? 'Identified' : 'Not Identified'}
                                        </span>
                                    </div>
                                    {lead.decision_maker && <p className="text-xs text-slate-600">DM: {lead.decision_maker}</p>}
                                </div>
                                <div className={clsx('p-4 rounded-xl border', lead.need_yes_no ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={clsx('text-[11px] font-bold uppercase tracking-wider', lead.need_yes_no ? 'text-emerald-700' : 'text-slate-500')}>Need</span>
                                        <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', lead.need_yes_no ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500')}>
                                            {lead.need_yes_no ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                            {lead.need_yes_no ? 'Established' : 'Not Established'}
                                        </span>
                                    </div>
                                    {lead.pain_points_desc && <p className="text-xs text-slate-600">Notes: {lead.pain_points_desc}</p>}
                                </div>
                                <div className={clsx('p-4 rounded-xl border', lead.timeline_yes_no ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={clsx('text-[11px] font-bold uppercase tracking-wider', lead.timeline_yes_no ? 'text-emerald-700' : 'text-slate-500')}>Timeline</span>
                                        <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', lead.timeline_yes_no ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500')}>
                                            {lead.timeline_yes_no ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                            {lead.timeline_yes_no ? 'Defined' : 'Not Defined'}
                                        </span>
                                    </div>
                                    {lead.expected_closure_date && (
                                        <p className="text-xs text-slate-600 flex items-center gap-1">
                                            <Clock size={10} />
                                            Target: {dayjs(lead.expected_closure_date).format('DD/MM/YYYY')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BANT Pillar Questions */}
                        {(lead as any).bant_answers && (lead as any).bant_answers.length > 0 && (() => {
                            const grouped: Record<string, { code: string; name: string; answers: any[] }> = {};
                            for (const ans of (lead as any).bant_answers) {
                                const key = ans.category?.code || 'other';
                                if (!grouped[key]) grouped[key] = { code: key, name: ans.category?.name || key, answers: [] };
                                grouped[key].answers.push(ans);
                            }
                            const pillarOrder = ['B', 'A', 'N', 'T'];
                            const sorted = [...Object.values(grouped)].sort((a, b) => {
                                const ai = pillarOrder.indexOf(a.code.toUpperCase());
                                const bi = pillarOrder.indexOf(b.code.toUpperCase());
                                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                            });
                            return (
                                <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <SectionHead icon={ShieldCheck} title="BANT Pillar Questions" color="amber" />
                                    <div className="p-5 space-y-5">
                                        {sorted.map(group => (
                                            <div key={group.code}>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary-100 text-primary-700 text-[10px] font-bold">{group.code.charAt(0).toUpperCase()}</span>
                                                    {group.name}
                                                </p>
                                                <div className="space-y-2">
                                                    {group.answers.map((ans: any) => (
                                                        <div key={ans.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="text-xs font-medium text-slate-600 mb-1">{ans.question?.question || '—'}</p>
                                                            <p className="text-sm text-slate-800 font-semibold">
                                                                {ans.answer
                                                                    ? <span className="text-emerald-700">{ans.answer}</span>
                                                                    : <span className="text-slate-400 italic">No answer</span>
                                                                }
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* CP Score checklist */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead
                                icon={CheckCircle}
                                title="Demo, Pilot & Authority Engagement (CP Score)"
                                color="amber"
                                action={
                                    <span className={clsx(
                                        'text-[11px] font-bold px-2.5 py-1 rounded-full',
                                        ((lead as any).cp_score || 0) > 6 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'
                                    )}>
                                        CP Score {(lead as any).cp_score || 0}/10
                                    </span>
                                }
                            />
                            <div className="divide-y divide-slate-50">
                                {[
                                    { label: 'Clearly identified Authority/Decision maker along with Champion and influencer? (Mandatory for Q3)', value: lead.authority_champion_influencer_identified },
                                    { label: 'Demo to the Authority/Decision maker done?', value: lead.demo_done_authority },
                                    { label: 'Probing Discussion with Authority?', value: lead.probing_discussion_authority },
                                    { label: 'Direct Visit with Authority?', value: lead.direct_visit_authority },
                                    { label: 'Post Demo Feedback Sent?', value: lead.post_demo_feedback_sent },
                                    { label: 'Post Demo Feedback Received?', value: lead.post_demo_feedback_received },
                                    { label: 'Pilot Given?', value: lead.pilot_given },
                                    { label: 'Post Pilot/Post Demo Management call completed for Products Lead?', value: lead.mgmt_call_completed },
                                    { label: 'Utilized Management for validating urgency/Budget?', value: lead.utilized_mgmt_urgency },
                                    { label: 'Utilized Tech Presales for validating timeline?', value: lead.utilized_presales_timeline },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-center justify-between px-6 py-3.5 gap-4">
                                        <span className="text-sm text-slate-600 leading-snug">{label}</span>
                                        {value ? (
                                            <span className="badge badge-green shrink-0 flex items-center gap-1"><CheckCircle size={10} /> Yes</span>
                                        ) : (
                                            <span className="badge badge-gray shrink-0 flex items-center gap-1"><XCircle size={10} /> No</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Score Card panel — sticky on the right */}
                    <div className="lg:col-span-2 lg:sticky lg:top-6">
                        <div className="rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white">
                            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
                                        <FileText size={14} className="text-blue-600" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-slate-800 tracking-tight truncate">Score Card</h2>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={exportScoreCardExcel}
                                        title="Export Score Card to Excel"
                                        className="btn btn-primary btn-sm gap-1"
                                    >
                                        <Download size={12} /> Excel
                                    </button>
                                    <button
                                        onClick={exportScoreCardPdf}
                                        title="Export Score Card to PDF"
                                        className="btn btn-sm gap-1 bg-red-600 text-white hover:bg-red-700"
                                    >
                                        <Download size={12} /> PDF
                                    </button>
                                    {!scoreCardHidden && showScoreCard && (
                                        <button
                                            onClick={handleSaveScores}
                                            disabled={saveScoreMutation.isPending}
                                            className="btn btn-primary btn-sm disabled:opacity-50"
                                        >
                                            <Save size={12} />
                                            {saveScoreMutation.isPending ? 'Saving…' : 'Save'}
                                        </button>
                                    )}
                                    {!scoreCardHidden && (
                                        <button
                                            onClick={() => {
                                                if (isFrozen) { alert(`This lead is frozen (${frozenLabel}) and its score cannot be edited.`); return; }
                                                setShowScoreCard(!showScoreCard);
                                            }}
                                            className={clsx('btn btn-secondary btn-sm gap-1', isFrozen && 'opacity-50 cursor-not-allowed')}
                                        >
                                            <Edit2 size={12} />
                                            {showScoreCard ? 'Done' : isFrozen ? 'View Only' : 'Edit'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setScoreCardHidden(!scoreCardHidden)}
                                        className="btn btn-secondary btn-sm gap-1"
                                    >
                                        {scoreCardHidden ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                        {scoreCardHidden ? 'Show' : 'Hide'}
                                    </button>
                                </div>
                            </div>
                            {!scoreCardHidden && (
                                <LeadScoreCard
                                    scores={scores}
                                    onChange={handleScoreChange}
                                    bant={bant}
                                    onBantChange={handleBantChange}
                                    readOnly={!showScoreCard}
                                />
                            )}
                        </div>
                    </div>
                    </div>
                )}

                {/* ══ ACTIVITIES ══ */}
                {activeTab === 'activities' && (
                    <div className="space-y-6">
                        {/* Sales Stage banner */}
                        <div className="rounded-2xl p-5 text-white shadow-lg shadow-slate-900/15" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1">Sales Stage</p>
                                    <p className="text-lg font-bold text-white">{lead.sales_stage?.name || 'New'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1">Next Activity</p>
                                    <p className="text-lg font-bold text-white">{lead.next_activity?.name || '—'}</p>
                                </div>
                                {isFrozen && (lead as any).order_won_at && (
                                    <div>
                                        <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Order Won Date</p>
                                        <p className="text-lg font-bold text-emerald-300">{dayjs((lead as any).order_won_at).format('DD/MM/YYYY')}</p>
                                    </div>
                                )}
                                {isFrozen && lead.order_value && (
                                    <div>
                                        <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Order Value</p>
                                        <p className="text-lg font-bold text-emerald-300">₹{Number(lead.order_value).toLocaleString('en-IN')}</p>
                                    </div>
                                )}
                                {isFrozen && lead.sales_device !== null && lead.sales_device !== undefined && (
                                    <div>
                                        <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1">Sales Device/License</p>
                                        <p className="text-lg font-bold text-white">{lead.sales_device}</p>
                                    </div>
                                )}
                                {isFrozen && lead.vertical?.name && (
                                    <div>
                                        <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1">Vertical</p>
                                        <p className="text-lg font-bold text-white">{lead.vertical.name}</p>
                                    </div>
                                )}
                            </div>
                            {lead.order_won_attachment && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <a
                                        href={`${import.meta.env.VITE_UPLOAD_URL}${lead.order_won_attachment}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                                    >
                                        <FileText size={14} />
                                        Order Won Attachment
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Activity Log */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead
                                icon={Activity}
                                title="Sales Engagement & Activity Log"
                                color="emerald"
                                action={
                                    <span className="text-xs text-slate-400">
                                        {(lead.follow_up_logs?.length || 0) + 1} entries
                                    </span>
                                }
                            />
                            <div className="overflow-x-auto">
                                <table className="table-base">
                                    <thead className="table-head">
                                        <tr>
                                            <th className="table-th">Date & Time</th>
                                            <th className="table-th">Activity Type</th>
                                            <th className="table-th">Sales Stage</th>
                                            <th className="table-th">Notes / Remarks</th>
                                            <th className="table-th">Status</th>
                                            <th className="table-th">Created By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {lead.follow_up_logs?.map((log: any) => (
                                            <tr key={log.id} className="table-tr">
                                                <td className="table-td text-slate-500">
                                                    {log.follow_up_datetime || log.date
                                                        // Sales Engagement Date & Time is stored tagged as UTC so the picked
                                                        // wall-clock value never drifts across save/reload — it must be read
                                                        // back via its UTC components too, or the display shifts by the
                                                        // viewer's local timezone offset.
                                                        ? dayjs.utc(log.follow_up_datetime || log.date).format('DD/MM/YYYY HH:mm')
                                                        : '—'}
                                                </td>
                                                <td className="table-td">
                                                    <span className="text-sm font-medium text-primary-600">
                                                        {log.activity?.name || 'Log Entry'}
                                                    </span>
                                                </td>
                                                <td className="table-td">
                                                    <span className="badge badge-amber">{log.sales_stage?.name || '—'}</span>
                                                </td>
                                                <td className="table-td text-slate-600 whitespace-pre-wrap break-words min-w-[200px]">
                                                    {log.notes || '—'}
                                                </td>
                                                <td className="table-td">
                                                    <span className={`badge ${
                                                        log.status === 'Completed' ? 'badge-green'
                                                            : log.status === 'In Progress' ? 'badge-blue'
                                                            : 'badge-amber'
                                                    }`}>
                                                        {log.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="table-td text-slate-500">
                                                    {log.creator ? `${log.creator.first_name} ${log.creator.last_name || ''}` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50/60">
                                            <td className="table-td text-slate-400">
                                                {dayjs(lead.created_at).format('DD/MM/YYYY HH:mm')}
                                            </td>
                                            <td colSpan={4} className="table-td text-center">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Lead Created</span>
                                            </td>
                                            <td className="table-td text-slate-400">
                                                {lead.created_by_user
                                                    ? `${lead.created_by_user.first_name} ${lead.created_by_user.last_name || ''}`
                                                    : 'System'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pricing Negotiation Log */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead icon={TrendingUp} title="Pricing Negotiation Log" color="emerald" />
                            <div className="p-5">
                                <div className="space-y-3 mb-4 max-h-32 overflow-y-auto">
                                    {lead.pricing_negotiations?.map((log: any) => (
                                        <div key={log.id} className="flex gap-3 p-3.5 bg-slate-50 rounded-xl border-l-4 border-primary-400">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-700">
                                                        {dayjs(log.date).format('DD/MM/YYYY')}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {log.user ? `${log.user.first_name} ${log.user.last_name || ''}` : 'System'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-snug">{log.details}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!lead.pricing_negotiations || lead.pricing_negotiations.length === 0) && (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                                <Activity size={18} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">No negotiation history</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Add the first pricing negotiation log below</p>
                                        </div>
                                    )}
                                </div>
                                {isFrozen ? (
                                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                                        <Lock size={12} />
                                        Negotiation logs are frozen for won leads.
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Negotiation details..."
                                            value={negotiation.details}
                                            onChange={(e) => setNegotiation(prev => ({ ...prev, details: e.target.value }))}
                                            className="form-input flex-1"
                                        />
                                        <DateOverlay value={negotiation.date}>
                                            <input
                                                type="date"
                                                value={negotiation.date}
                                                onChange={(e) => setNegotiation(prev => ({ ...prev, date: e.target.value }))}
                                                onClick={(e) => (e.target as any).showPicker?.()}
                                                className="form-input w-36"
                                            />
                                        </DateOverlay>
                                        <button
                                            onClick={() => addLogMutation.mutate()}
                                            disabled={!negotiation.details || addLogMutation.isPending}
                                            className="btn btn-primary btn-sm disabled:opacity-50 shrink-0"
                                        >
                                            <Plus size={14} />
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Milestones */}
                        {lead.milestones && lead.milestones.length > 0 && (
                            <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <SectionHead
                                    icon={Flag}
                                    title="Payment Milestones"
                                    color="emerald"
                                    action={
                                        <span className="text-xs text-slate-400">
                                            {lead.milestones.length} milestone{lead.milestones.length === 1 ? '' : 's'}
                                        </span>
                                    }
                                />
                                <div className="overflow-x-auto">
                                    <table className="table-base">
                                        <thead className="table-head">
                                            <tr>
                                                <th className="table-th">Milestone Type</th>
                                                <th className="table-th">Percentage</th>
                                                <th className="table-th">Expected Amount</th>
                                                <th className="table-th">EDC</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {lead.milestones.map((m: any) => (
                                                <tr
                                                    key={m.id}
                                                    id={`milestone-row-${m.id}`}
                                                    className={clsx(
                                                        'table-tr',
                                                        highlightMilestoneId === String(m.id) && 'bg-amber-50 ring-1 ring-inset ring-amber-300'
                                                    )}
                                                >
                                                    <td className="table-td font-medium text-slate-700">
                                                        {m.payment_type?.name || '—'}
                                                    </td>
                                                    <td className="table-td text-slate-600">
                                                        {m.percentage != null ? `${Number(m.percentage)}%` : '—'}
                                                    </td>
                                                    <td className="table-td text-slate-600">
                                                        {m.expected_amount != null ? `₹${Number(m.expected_amount).toLocaleString('en-IN')}` : '—'}
                                                    </td>
                                                    <td className="table-td text-slate-500">
                                                        {m.edc ? dayjs(m.edc).format('DD-MMM-YYYY') : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {(!lead.milestones || lead.milestones.length === 0) && (
                            <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <SectionHead icon={Flag} title="Payment Milestones" color="emerald" />
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                        <Flag size={18} className="text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">No milestones added for this lead</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ DOCUMENTS ══ */}
                {activeTab === 'documents' && (
                    <div className="max-w-3xl space-y-6">
                        {/* Pain Points Attachments */}
                        {lead.pain_points_files && (() => {
                            let files: string[] = [];
                            try { files = JSON.parse(lead.pain_points_files); } catch { files = lead.pain_points_files.split(','); }
                            if (!Array.isArray(files)) files = [files];
                            files = files.filter((f: any) => typeof f === 'string' && f.trim() !== '');
                            if (files.length === 0) return null;
                            return (
                                <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <SectionHead icon={FileText} title="Pain Point Attachments" color="indigo" />
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {files.map((file: string, idx: number) => (
                                            <a
                                                key={`pp-${idx}`}
                                                href={`${import.meta.env.VITE_UPLOAD_URL}${file.startsWith('/') ? '' : '/'}${file}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                                            >
                                                <FileText size={12} />
                                                <span className="truncate max-w-[150px]">{file.split('/').pop()}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Proposals & Estimations */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead
                                icon={FileText}
                                title="Proposals & Estimations"
                                color="indigo"
                                action={
                                    <span className="text-xs text-slate-400">
                                        {lead.documents?.length || 0} file{(lead.documents?.length || 0) !== 1 ? 's' : ''}
                                    </span>
                                }
                            />
                            <div className="p-5 space-y-3">
                                {lead.documents?.map((doc: any) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                                                <FileText size={15} className="text-primary-600" />
                                            </div>
                                            <div>
                                                <a
                                                    href={`${import.meta.env.VITE_UPLOAD_URL}${doc.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1"
                                                >
                                                    {doc.name}<ExternalLink size={11} />
                                                </a>
                                                {doc.description && <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>}
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400 shrink-0">{dayjs(doc.uploaded_at).format('DD/MM/YYYY')}</span>
                                    </div>
                                ))}
                                {(!lead.documents || lead.documents.length === 0) && (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                            <FileText size={20} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500">No documents uploaded yet</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Upload a proposal or estimation below</p>
                                    </div>
                                )}

                                <div className="mt-2 pt-4 border-t border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Upload New Document</p>
                                    {isFrozen ? (
                                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                                            <Lock size={12} />
                                            New documents cannot be added to a won lead.
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Description"
                                                value={docDescription}
                                                onChange={(e) => setDocDescription(e.target.value)}
                                                className="form-input flex-1"
                                            />
                                            <input
                                                type="file"
                                                onChange={async (e) => {
                                                    if (e.target.files?.[0]) {
                                                        const formData = new FormData();
                                                        formData.append('file', e.target.files[0]);
                                                        formData.append('description', docDescription || 'Uploaded via UI');
                                                        try {
                                                            await api.post(`/leads/${id}/documents`, formData, {
                                                                headers: { 'Content-Type': 'multipart/form-data' },
                                                            });
                                                            setDocDescription('');
                                                            queryClient.invalidateQueries({ queryKey: ['leads', id] });
                                                        } catch (err) {
                                                            console.error('Upload failed:', err);
                                                            alert('Upload failed. Please try again.');
                                                        }
                                                    }
                                                }}
                                                className="text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-600"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ CONTACTS ══ */}
                {activeTab === 'contacts' && (
                    <div className="max-w-3xl space-y-4">
                        {/* Primary Contact — full detail */}
                        <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <SectionHead icon={User} title="Primary Contact" color="rose" action={<span className="badge badge-blue">Primary</span>} />
                            <div className="p-5">
                                <div className="flex items-start gap-4 mb-5">
                                    {(() => {
                                        const name = `${lead.first_name || ''}${lead.last_name || ''}`;
                                        return name ? (
                                            <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-base font-bold shrink-0', avatarColor(name))}>
                                                {lead.first_name?.[0]?.toUpperCase()}{lead.last_name?.[0]?.toUpperCase()}
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <User size={24} className="text-slate-400" />
                                            </div>
                                        );
                                    })()}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold text-slate-900">
                                            {[lead.salutation, lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-0.5">{lead.job_title?.name || lead.job_title_name || '—'}</p>
                                        {lead.avatar?.name && (
                                            <span className="badge badge-indigo mt-1.5 inline-flex">Avatar: {lead.avatar.name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                                    <Field label="Email" icon={Mail}>
                                        {lead.email ? (
                                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-primary-600 hover:underline truncate">
                                                <Mail size={13} />{lead.email}
                                            </a>
                                        ) : '—'}
                                    </Field>
                                    <Field label="Mobile" icon={Phone}>
                                        {lead.mobile_number ? (
                                            <span className="flex items-center gap-1.5">
                                                <Phone size={13} className="text-slate-400" />{lead.mobile_number}
                                            </span>
                                        ) : '—'}
                                    </Field>
                                    <Field label="WhatsApp" icon={Phone}>
                                        {lead.whatsapp_number ? (
                                            <span className="flex items-center gap-1.5 text-emerald-600">
                                                <Phone size={13} />{lead.whatsapp_number}
                                            </span>
                                        ) : '—'}
                                    </Field>
                                </div>
                            </div>
                        </div>

                        {/* Additional Contacts */}
                        {lead.contacts && lead.contacts.length > 0 ? (
                            lead.contacts.map((contact: any, idx: number) => (
                                <div key={contact.id || idx} className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <div className="p-5">
                                        <div className="flex items-start gap-4">
                                            {(() => {
                                                const name = contact.name || '';
                                                return name ? (
                                                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor(name))}>
                                                        {name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                        <User size={16} className="text-slate-400" />
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{contact.designation}</p>
                                                {contact.avatar?.name && (
                                                    <span className="badge badge-blue mt-1.5 inline-flex">Avatar: {contact.avatar.name}</span>
                                                )}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                                                        <p className="text-xs text-slate-600">{contact.email || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Mobile</p>
                                                        <p className="text-xs text-slate-600">{contact.contact_mobile || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">WhatsApp</p>
                                                        <p className="text-xs text-emerald-600">{contact.whatsapp_number || '—'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="card rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <Users size={20} className="text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">No additional contacts</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Add contacts when editing this lead</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
