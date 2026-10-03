import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, Building2, User, Package, TrendingUp, DollarSign, Layers,
    CalendarClock, PieChart, ListChecks, Milestone,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import api from '../../services/api';
import { fmt } from './CashflowTracker';

const STATUS_TONE: Record<string, string> = {
    'High Probability': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Medium Probability': 'bg-amber-50 text-amber-700 border-amber-200',
    'Low Probability': 'bg-slate-50 text-slate-600 border-slate-200',
    'Delayed': 'bg-red-50 text-red-700 border-red-200',
    'Forecast': 'bg-blue-50 text-blue-700 border-blue-200',
    'Upcoming': 'bg-blue-50 text-blue-700 border-blue-200',
};

const ReadField = ({ icon: Icon, label, children }: { icon?: any; label: string; children: React.ReactNode }) => (
    <div className="group">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            {Icon && <Icon size={11} className="text-slate-300" />}
            {label}
        </p>
        <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 min-h-[38px] flex items-center transition-colors group-hover:border-slate-300 group-hover:bg-slate-100/60">
            {children || <span className="text-slate-400">—</span>}
        </div>
    </div>
);

type StatTone = { card: string; icon: string; label: string; value: string };

const StatTile = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: React.ReactNode; tone: StatTone }) => (
    <div className={clsx('rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-3.5', tone.card)}>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/70', tone.icon)}>
            <Icon size={18} />
        </div>
        <div className="min-w-0">
            <p className={clsx('text-[11px] font-semibold uppercase tracking-wider truncate', tone.label)}>{label}</p>
            <p className={clsx('text-lg font-bold leading-tight truncate', tone.value)}>{value}</p>
        </div>
    </div>
);

export default function CashflowForecastView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['cashflow-forecast', id],
        queryFn: () => api.get(`/cashflow-forecast/${id}`).then(r => r.data?.data),
        enabled: !!id,
    });

    if (isLoading) return (
        <div className="min-h-screen bg-slate-50 animate-pulse p-8 space-y-4">
            <div className="h-8 w-48 bg-slate-100 rounded" />
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
    );

    if (isError || !data) return (
        <div className="min-h-screen bg-slate-50 p-8">
            <p className="text-red-600 text-sm">Failed to load forecast.</p>
        </div>
    );

    const leadName = [data.lead?.first_name, data.lead?.last_name].filter(Boolean).join(' ') || '—';
    const company = data.company?.name || data.lead?.company_name || '—';

    const milestones = data.milestones || [];
    const totalPercentage = milestones.reduce((s: number, m: any) => s + (Number(m.percentage) || 0), 0);
    const nextMilestone = milestones
        .filter((m: any) => m.expected_collection_date)
        .sort((a: any, b: any) => dayjs(a.expected_collection_date).valueOf() - dayjs(b.expected_collection_date).valueOf())[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-100">
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 sticky top-0 z-20 px-6 md:px-10 xl:px-16 py-4 shadow-lg shadow-slate-900/10">
                <div className="flex items-center justify-between gap-4 max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors shrink-0"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                            <Building2 size={18} className="text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-bold text-white leading-tight truncate">{company}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border', STATUS_TONE[data.status] || STATUS_TONE.Forecast)}>
                                    {data.status}
                                </span>
                                {leadName !== '—' && <span className="text-xs text-slate-400 truncate">{leadName}</span>}
                            </div>
                        </div>
                    </div>
                    <Link
                        to={`/leads/${data.lead_id}/edit`}
                        className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg transition-colors shadow-sm shadow-amber-950/40 shrink-0"
                    >
                        Edit on Lead
                    </Link>
                </div>
            </div>

            <div className="px-6 md:px-10 xl:px-16 py-8 space-y-6 max-w-[1600px] mx-auto">

                {/* Stat overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile
                        icon={DollarSign}
                        label="Expected Order Value"
                        value={fmt(data.expected_order_value)}
                        tone={{ card: 'bg-emerald-50 border-emerald-100', icon: 'text-emerald-600', label: 'text-emerald-700/70', value: 'text-emerald-900' }}
                    />
                    <StatTile
                        icon={ListChecks}
                        label="Milestones Planned"
                        value={milestones.length}
                        tone={{ card: 'bg-blue-50 border-blue-100', icon: 'text-blue-600', label: 'text-blue-700/70', value: 'text-blue-900' }}
                    />
                    <StatTile
                        icon={PieChart}
                        label="Allocated Percentage"
                        value={`${totalPercentage.toFixed(2)}%`}
                        tone={{ card: 'bg-amber-50 border-amber-100', icon: 'text-amber-600', label: 'text-amber-700/70', value: 'text-amber-900' }}
                    />
                    <StatTile
                        icon={CalendarClock}
                        label="Next Collection"
                        value={nextMilestone ? dayjs(nextMilestone.expected_collection_date).format('DD/MM/YYYY') : '—'}
                        tone={{ card: 'bg-slate-100 border-slate-200', icon: 'text-slate-600', label: 'text-slate-500', value: 'text-slate-900' }}
                    />
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-transparent">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Building2 size={14} className="text-amber-700" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Lead Information</h2>
                        <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Read Only</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        <ReadField icon={User} label="Lead Name">{leadName}</ReadField>
                        <ReadField icon={Building2} label="Company">{company}</ReadField>
                        <ReadField icon={Package} label="Product">{data.product?.name || '—'}</ReadField>
                        <ReadField icon={User} label="Sales Person">
                            {data.user ? `${data.user.first_name} ${data.user.last_name || ''}` : '—'}
                        </ReadField>
                        <ReadField icon={TrendingUp} label="Vertical">{data.vertical?.name || '—'}</ReadField>
                        <ReadField label="Current Quadrant">{data.lead?.quadrant || '—'}</ReadField>
                        <ReadField icon={Layers} label="Device Count">{data.device_count}</ReadField>
                        <ReadField icon={DollarSign} label="Expected Order Value">
                            <span className="text-emerald-700 font-semibold">{fmt(data.expected_order_value)}</span>
                        </ReadField>
                        <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5">
                            <ReadField label="Forecast Remarks">{data.remarks}</ReadField>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-transparent">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <TrendingUp size={14} className="text-amber-700" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Forecast Milestones</h2>
                        {milestones.length > 0 && (
                            <span className="ml-auto text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{milestones.length} milestone{milestones.length > 1 ? 's' : ''}</span>
                        )}
                    </div>
                    <div className="p-6">
                        {milestones.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
                                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                    <Milestone size={18} className="text-slate-300" />
                                </div>
                                <p className="text-sm text-slate-400">No milestones planned.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-amber-50 text-[11px] font-bold uppercase tracking-wider">
                                            <th className="px-4 py-3 text-left">Milestone</th>
                                            <th className="px-4 py-3 text-left">Expected Amount</th>
                                            <th className="px-4 py-3 text-left">Percentage</th>
                                            <th className="px-4 py-3 text-left">Expected Collection Date</th>
                                            <th className="px-4 py-3 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {milestones.map((m: any, idx: number) => (
                                            <tr key={m.id} className={clsx('transition-colors hover:bg-amber-50/30', idx % 2 === 1 && 'bg-slate-50/40')}>
                                                <td className="px-4 py-2.5 border-t border-slate-100 font-medium text-slate-700">{m.milestone_master?.name || '—'}</td>
                                                <td className="px-4 py-2.5 border-t border-slate-100 font-medium text-slate-700">{fmt(m.expected_amount)}</td>
                                                <td className="px-4 py-2.5 border-t border-slate-100 text-slate-600">{Number(m.percentage).toFixed(2)}%</td>
                                                <td className="px-4 py-2.5 border-t border-slate-100 text-slate-600">{m.expected_collection_date ? dayjs(m.expected_collection_date).format('DD/MM/YYYY') : '—'}</td>
                                                <td className="px-4 py-2.5 border-t border-slate-100">
                                                    <span className={clsx('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border', STATUS_TONE[m.status] || STATUS_TONE.Upcoming)}>
                                                        {m.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 text-xs font-semibold text-slate-600">
                                            <td className="px-4 py-2.5 border-t border-slate-200">Total</td>
                                            <td className="px-4 py-2.5 border-t border-slate-200">
                                                {fmt(milestones.reduce((s: number, m: any) => s + (Number(m.expected_amount) || 0), 0))}
                                            </td>
                                            <td className="px-4 py-2.5 border-t border-slate-200">{totalPercentage.toFixed(2)}%</td>
                                            <td className="px-4 py-2.5 border-t border-slate-200" colSpan={2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
