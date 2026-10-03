import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowLeft, Sprout, RotateCcw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-sm font-medium text-slate-800">{children || '—'}</div>
    </div>
);

const BantRow = ({ label, ok }: { label: string; ok: boolean }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
        <span className="text-sm text-slate-600">{label}</span>
        {ok
            ? <span className="badge badge-green"><CheckCircle size={10} /> Yes</span>
            : <span className="badge badge-gray"><XCircle size={10} /> No</span>}
    </div>
);

export default function FarmingDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: lead, isLoading, isError, error } = useQuery({
        queryKey: ['farming-lead', id],
        queryFn: () => api.get(`/leads/${id}`).then(r => r.data),
    });

    const moveBackMutation = useMutation({
        mutationFn: () => api.put(`/leads/${id}`, { is_farming: false, farming_moved_at: null }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['farming-leads'] });
            navigate('/farming');
        }
    });

    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-3 mb-8">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="card p-6 space-y-4">
                    {[1,2,3].map(j => <div key={j} className="skeleton h-10 rounded-lg" />)}
                </div>)}
            </div>
        </div>
    );

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

    if (!lead) return (
        <div className="page-wrapper">
            <p className="text-sm text-slate-500">Lead not found.</p>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-4">
                    <Link
                        to="/farming"
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Sprout size={18} className="text-emerald-600 shrink-0" />
                        <h1 className="page-title">{lead.first_name} {lead.last_name}</h1>
                        <span className="badge badge-green">Farming</span>
                    </div>
                </div>
                <button
                    onClick={() => moveBackMutation.mutate()}
                    disabled={moveBackMutation.isPending}
                    className="btn btn-secondary gap-2 disabled:opacity-50"
                >
                    <RotateCcw size={15} />
                    {moveBackMutation.isPending ? 'Moving…' : 'Move Back to Pipeline'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Info */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-sm font-semibold text-slate-800">Lead Information</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Company">{lead.company_name || lead.company_master?.name}</Field>
                        <Field label="Industry">{lead.industry?.name}</Field>
                        <Field label="Email">{lead.email}</Field>
                        <Field label="Mobile">{lead.mobile_number}</Field>
                        <Field label="Lead Source">{lead.lead_source?.name}</Field>
                        <Field label="Lead Owner">
                            {lead.owner ? `${lead.owner.first_name} ${lead.owner.last_name}` : null}
                        </Field>
                    </div>
                </div>

                {/* Qualification */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-sm font-semibold text-slate-800">Qualification (BANT)</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-bold text-primary-600">{lead.lead_score ?? 0}</span>
                            <span className="text-xs text-slate-400">/ 26</span>
                        </div>
                    </div>
                    <div className="px-6 pb-4">
                        <div className="mb-4 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-center">
                            <p className="text-3xl font-bold text-primary-700">{lead.lead_score ?? 0}</p>
                            <p className="text-xs text-primary-500 mt-0.5">Lead Qualification Score / 26</p>
                        </div>
                        <BantRow label="Budget"    ok={lead.budget_yes_no} />
                        <BantRow label="Authority" ok={lead.authority_yes_no} />
                        <BantRow label="Need"      ok={lead.need_yes_no} />
                        <BantRow label="Timeline"  ok={lead.timeline_yes_no} />
                    </div>
                </div>

                {/* Farming Details */}
                <div className="card lg:col-span-2">
                    <div className="card-header">
                        <h2 className="text-sm font-semibold text-slate-800">Farming Details</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                            <Field label="Farming Since">
                                {lead.farming_moved_at ? dayjs(lead.farming_moved_at).format('DD/MM/YYYY') : null}
                            </Field>
                            <Field label="Quadrant">
                                <span className={clsx('badge', {
                                    'badge-blue': lead.quadrant === 'Q1',
                                    'badge-amber': lead.quadrant === 'Q2',
                                    'badge-orange': lead.quadrant === 'Q3',
                                    'badge-green': lead.quadrant === 'Q4',
                                    'badge-gray': !lead.quadrant,
                                })}>
                                    {lead.quadrant || '—'}
                                </span>
                            </Field>
                            <Field label="Sales Stage">{lead.sales_stage?.name}</Field>
                        </div>

                        {lead.requirement_desc && (
                            <div className="mb-4">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Requirements</p>
                                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 leading-relaxed">{lead.requirement_desc}</p>
                            </div>
                        )}
                        {lead.pain_points && (
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pain Points</p>
                                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 leading-relaxed">{lead.pain_points}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
