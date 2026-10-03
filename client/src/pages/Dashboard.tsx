import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Users, Phone, Clock, Activity, TrendingUp, ArrowUpRight,
    AlertCircle, CalendarClock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

/* ── Quadrant colours ── */
const QUADRANT_COLORS: Record<string, string> = {
    Q1: '#2563EB', Q2: '#F59E0B', Q3: '#F97316',
    Q4: '#16A34A', 'Order Won': '#10B981', Nurturing: '#8B5CF6',
    Negotiation: '#EF4444',
};
const qColor = (name: string) => QUADRANT_COLORS[name] ?? '#64748B';

/* ── KPI Card ── */
interface KpiProps {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; onClick?: () => void;
    alert?: boolean;
}
const KpiCard = ({ label, value, sub, icon: Icon, color, onClick, alert }: KpiProps) => (
    <div
        onClick={onClick}
        className={clsx(
            'card-hover p-5 flex items-start gap-4',
            alert && Number(value) > 0 && 'ring-1 ring-red-200'
        )}
    >
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
            <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className={clsx('text-2xl font-bold tracking-tight', alert && Number(value) > 0 ? 'text-red-600' : 'text-slate-900')}>
                {value ?? '—'}
            </p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <ArrowUpRight size={14} className="text-slate-300 shrink-0 mt-1" />
    </div>
);

/* ── KPI Skeleton ── */
const KpiSkeleton = () => (
    <div className="card p-5 flex items-start gap-4">
        <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="skeleton h-2.5 w-20 rounded" />
            <div className="skeleton h-7 w-14 rounded" />
        </div>
    </div>
);

/* ── Quadrant bar entry ── */
const QUADRANT_BADGE: Record<string, string> = { Nurturing: 'NU', 'Order Won': 'OW', Negotiation: 'NG' };
const qBadge = (name: string) => QUADRANT_BADGE[name] ?? name;

const QuadrantRow = ({ name, count, total, onClick }: any) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onClick}>
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: qColor(name) }}
            >
                {qBadge(name)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 group-hover:text-primary-600 transition-colors">
                        {name} &middot; {count} leads
                    </span>
                    <span className="text-xs text-slate-400">{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: qColor(name) }}
                    />
                </div>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: stats, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => api.get('/reports/dashboard').then(r => r.data),
    });

    const quadrantData = ['Q4', 'Q3', 'Q2', 'Q1', 'Nurturing'].map(name => {
        const q = stats?.quadrantStats?.find((qs: any) => qs.quadrant === name);
        const companies: string[] = q?.companies || [];
        return {
            name,
            count: q?._count?.id || 0,
            leads: companies.map(c => ({ company: c, owner: '' })),
        };
    });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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

    const quadrantTotal = quadrantData
        .filter(d => d.name !== 'Nurturing')
        .reduce((s, d) => s + d.count, 0);

    return (
        <div className="page-wrapper">

            {/* ── Header ── */}
            <div className="mb-8">
                <p className="text-sm text-slate-400 mb-1">{greeting},</p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Here's your pipeline at a glance.</p>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
                {isLoading ? (
                    <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
                ) : (
                    <>
                        <KpiCard
                            label="Total Leads"  value={stats?.totalLeads ?? '—'}
                            sub={`Nurturing: ${stats?.nurturingLeadsCount ?? 0}`}
                            icon={Users}         color="bg-primary-600"
                            onClick={() => navigate('/leads')}
                        />
                        <KpiCard
                            label="Calls Today"  value={stats?.todayCalls ?? '—'}
                            icon={Phone}         color="bg-emerald-600"
                            onClick={() => navigate('/call-management/tracker')}
                        />
                        <KpiCard
                            label="Follow-ups"   value={stats?.pendingFollowUps ?? '—'}
                            sub="Due today (Calls + Leads)"
                            icon={Clock}         color="bg-amber-500"
                            onClick={() => navigate('/leads')}
                        />
                        <KpiCard
                            label="Sales Activities"  value={stats?.salesActivitiesCount ?? '—'}
                            sub="LinkedIn + Email"
                            icon={Activity}           color="bg-violet-600"
                            onClick={() => navigate('/call-management/tracker')}
                        />
                        <KpiCard
                            label="Requires Requalification"  value={stats?.requiresRequalificationCount ?? '—'}
                            sub="Nurturing / auto-degraded leads"
                            icon={AlertCircle}                color="bg-orange-500"
                            alert
                            onClick={() => navigate('/leads')}
                        />
                        <KpiCard
                            label="Existing EDC Milestones"  value={stats?.existingEdcMilestonesCount ?? '—'}
                            sub="Original EDC, pending & not stuck"
                            icon={CalendarClock}            color="bg-teal-600"
                            onClick={() => navigate(`/cashflow/tracker?${new URLSearchParams({
                                collection_status: 'Pending,Partial Paid',
                                not_overdue: '1',
                            }).toString()}`)}
                        />
                    </>
                )}
            </div>

            {/* ── Lead Pipeline ── */}
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
                <div className="card xl:col-span-3">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-primary-600" />
                            <h2 className="text-sm font-semibold text-slate-800">Pipeline Breakdown</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="skeleton h-2 w-14 rounded" />
                                            <div className="skeleton h-1.5 w-full rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {quadrantData.map(q => (
                                    <QuadrantRow
                                        key={q.name}
                                        name={q.name} count={q.count} total={quadrantTotal}
                                        onClick={() => navigate(`/leads?quadrant=${encodeURIComponent(q.name)}`)}
                                    />
                                ))}
                                <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-500">Total Pipeline</span>
                                    <span className="text-base font-bold text-slate-900">{quadrantTotal} leads</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
