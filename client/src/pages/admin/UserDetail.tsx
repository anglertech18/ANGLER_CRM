import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
    ArrowLeft, CheckCircle, XCircle, Clock, Check, Shield,
    Mail, Building2, Layers, Briefcase, UserCog, CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const MODULE_GROUPS: { group: string; modules: string[] }[] = [
    { group: 'Administration', modules: ['Masters', 'UserMaster', 'PrivilegeMaster'] },
    { group: 'Sales', modules: ['Leads', 'Calls', 'SwatMeeting', 'Reports'] },
    { group: 'SEAL', modules: ['SealDashboard', 'WeeklySummary', 'LeadGenSummary', 'POAs', 'EnquiryTracker', 'PartnerSignup'] },
    { group: 'Finance & Reporting', modules: ['CashflowReport', 'DailyReport', 'CashflowForecast', 'BillingForecast'] },
];
const MODULES = MODULE_GROUPS.flatMap(g => g.modules);

const PERMS = [
    { key: 'can_view', label: 'View', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
    { key: 'can_add', label: 'Add', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    { key: 'can_edit', label: 'Edit', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { key: 'can_delete', label: 'Delete', tone: 'bg-red-50 text-red-700 ring-red-200' },
] as const;

function initialsOf(user: any) {
    const a = (user.first_name || '').charAt(0);
    const b = (user.last_name || '').charAt(0);
    return (a + b).toUpperCase() || '?';
}

const AVATAR_COLORS = [
    'bg-primary-100 text-primary-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
];
function avatarColor(id: number) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'ACTIVE':
            return <span className="badge-emerald"><CheckCircle size={11} /> Active</span>;
        case 'INACTIVE':
            return <span className="badge-red"><XCircle size={11} /> Inactive</span>;
        case 'INVITED':
        default:
            return <span className="badge-amber"><Clock size={11} /> Pending</span>;
    }
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-slate-500" />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                <div className="text-sm text-slate-800 truncate">{value}</div>
            </div>
        </div>
    );
}

export default function UserDetail() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'CEO';

    const { data: user, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: async () => {
            const res = await api.get('/users');
            return (res.data as any[]).find((u: any) => u.id === parseInt(userId!));
        },
        enabled: !!userId,
    });

    const { data: privileges } = useQuery({
        queryKey: ['privileges', userId],
        queryFn: async () => {
            const res = await api.get(`/privileges/${userId}`);
            return res.data as any[];
        },
        enabled: !!userId,
    });

    const privByModule = (m: string) => (privileges || []).find((p: any) => p.module_name === m);
    const grantedCount = MODULES.filter(m => {
        const p = privByModule(m);
        return p && (p.can_view || p.can_add || p.can_edit || p.can_delete);
    }).length;

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn btn-secondary btn-icon btn-sm">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="page-title">User Details</h1>
                        <p className="page-subtitle">View user information, access, and status</p>
                    </div>
                </div>
                {isAdmin && user && (
                    <button onClick={() => navigate(`/admin/privileges/${user.id}`)} className="btn btn-primary">
                        <Shield size={16} />
                        Manage Privileges
                    </button>
                )}
            </div>

            {isLoading && (
                <div className="card p-16 flex items-center justify-center text-slate-400 text-sm">Loading user…</div>
            )}

            {!isLoading && !user && (
                <div className="card p-16 flex items-center justify-center text-slate-400 text-sm">User not found.</div>
            )}

            {user && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left column — identity + organization */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="card overflow-hidden">
                            <div className="h-16 bg-gradient-to-r from-primary-500 to-indigo-500" />
                            <div className="px-6 pb-6 -mt-8">
                                <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold ring-4 ring-white shadow-sm', avatarColor(user.id))}>
                                    {initialsOf(user)}
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-bold text-slate-900">{user.first_name} {user.last_name}</h2>
                                    {getStatusBadge(user.status)}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                    <Mail size={13} /> <span className="truncate">{user.email}</span>
                                </div>
                                <div className="mt-3">
                                    <span className="badge-indigo">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">Organization</span>
                            </div>
                            <div className="px-6 py-2 divide-y divide-slate-50">
                                <InfoRow icon={Briefcase} label="Department" value={user.department || '—'} />
                                <InfoRow icon={Building2} label="Company" value={user.company?.name || '—'} />
                                <InfoRow icon={Layers} label="SBU" value={user.sbu?.name || '—'} />
                                <InfoRow
                                    icon={UserCog}
                                    label="Reporting Manager"
                                    value={user.reporting_manager ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}` : '—'}
                                />
                                <InfoRow
                                    icon={CalendarDays}
                                    label="Joined On"
                                    value={user.joining_date ? new Date(user.joining_date).toLocaleDateString() : '—'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right column — privileges */}
                    <div className="lg:col-span-2">
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <Shield size={15} className="text-primary-600" />
                                    <span className="card-title">Assigned Privileges</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-400">
                                        {PERMS.map(perm => (
                                            <span key={perm.key} className="flex items-center gap-1">
                                                <span className={clsx('w-2 h-2 rounded-full ring-1', perm.tone)} />
                                                {perm.label}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="badge bg-primary-50 text-primary-700 ring-1 ring-primary-200">
                                        {grantedCount} / {MODULES.length}
                                    </span>
                                </div>
                            </div>
                            <div className="card-body space-y-6 max-h-[68vh] overflow-y-auto">
                                {MODULE_GROUPS.map(({ group, modules }) => (
                                    <div key={group}>
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{group}</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {modules.map(m => {
                                                const p = privByModule(m);
                                                const has = !!p && (p.can_view || p.can_add || p.can_edit || p.can_delete);
                                                return (
                                                    <div
                                                        key={m}
                                                        className={clsx(
                                                            'rounded-xl border p-3 transition-colors',
                                                            has ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/60'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0', has ? 'bg-emerald-500' : 'bg-slate-300')} />
                                                            <span className={clsx('text-sm font-semibold truncate', has ? 'text-slate-800' : 'text-slate-400')}>{m}</span>
                                                        </div>
                                                        {has ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {PERMS.map(perm => (
                                                                    p?.[perm.key] ? (
                                                                        <span key={perm.key} className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ring-1', perm.tone)}>
                                                                            <Check size={11} /> {perm.label}
                                                                        </span>
                                                                    ) : null
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] font-medium text-slate-400 italic">No access</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
