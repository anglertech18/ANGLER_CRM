import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import {
    User, Mail, Shield, Building2, Layers, UserCheck,
    Target, Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle2,
    Phone, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

export default function MyProfile() {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { data: profile, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn: () => api.get('/auth/me').then(r => r.data),
    });

    // Actual targets live per-product on UserProductTarget (set via "Edit Performance Targets"),
    // not on the User row — sum across the user's assigned products for the overview tiles.
    const { data: productTargets } = useQuery({
        queryKey: ['my-product-targets', profile?.id],
        queryFn: () => api.get(`/users/${profile.id}/targets`).then(r => r.data.productTargets || []),
        enabled: !!profile?.id,
    });

    const TARGET_METRICS = [
        { key: 'revenue_target',      label: 'Revenue Target', icon: TrendingUp, color: 'text-primary-600 bg-primary-50' },
        { key: 'device_target',       label: 'Device Target',  icon: Target,     color: 'text-emerald-600 bg-emerald-50' },
        { key: 'leads_target',        label: 'Leads Target',   icon: Target,     color: 'text-violet-600 bg-violet-50' },
        { key: 'calls_target',        label: 'Calls / Day',    icon: Phone,      color: 'text-amber-600 bg-amber-50' },
        { key: 'linkedin_target',     label: 'LinkedIn / Day', icon: User,       color: 'text-indigo-600 bg-indigo-50' },
        { key: 'direct_visit_target', label: 'Visits / Day',   icon: TrendingUp, color: 'text-rose-600 bg-rose-50' },
    ] as const;

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/auth/change-password', data),
        onSuccess: () => {
            setMsg({ type: 'success', text: 'Password updated successfully!' });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setMsg(null), 5000);
        },
        onError: (error: any) => {
            setMsg({ type: 'error', text: error.response?.data?.message || 'Failed to update password' });
            setTimeout(() => setMsg(null), 5000);
        }
    });

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (passwords.newPassword !== passwords.confirmPassword) {
            setMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (passwords.newPassword.length < 6) {
            setMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        mutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
    };

    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-4 mb-8">
                <div className="skeleton w-16 h-16 rounded-2xl" />
                <div className="space-y-2">
                    <div className="skeleton h-5 w-40 rounded" />
                    <div className="skeleton h-3 w-56 rounded" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6 space-y-4">
                        {[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-card-hover shrink-0">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        {profile?.first_name} {profile?.last_name}
                    </h1>
                    <p className="text-sm text-slate-500">{profile?.role} · {profile?.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Main column ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* User Details */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <User size={15} className="text-primary-600" />
                                <h2 className="text-sm font-semibold text-slate-800">User Details</h2>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[
                                { icon: User,       label: 'Full Name',          value: `${profile?.first_name} ${profile?.last_name || ''}` },
                                { icon: Mail,       label: 'Email Address',      value: profile?.email },
                                { icon: Shield,     label: 'Role',               value: profile?.role },
                                { icon: UserCheck,  label: 'Reporting Manager',  value: profile?.reporting_manager ? `${profile.reporting_manager.first_name} ${profile.reporting_manager.last_name}` : 'N/A' },
                                { icon: Layers,     label: 'Department',         value: profile?.department_rel?.name || profile?.department || 'N/A' },
                                { icon: Building2,  label: 'Company',            value: profile?.company?.name || 'N/A' },
                                { icon: Building2,  label: 'SBU',                value: profile?.sbu?.name || 'N/A' },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Icon size={14} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                                        <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Targets */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Target size={15} className="text-primary-600" />
                                <h2 className="text-sm font-semibold text-slate-800">My Targets</h2>
                            </div>
                        </div>
                        {(productTargets || []).length === 0 ? (
                            <div className="p-6 text-sm text-slate-400">No targets have been assigned yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {productTargets.map((pt: any) => (
                                    <div key={pt.id ?? pt.product_id} className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                                                <Layers size={14} className="text-primary-600" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800">{pt.product?.name || 'Unassigned Product'}</h3>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {TARGET_METRICS.map(({ key, label, icon: Icon, color }) => (
                                                <div key={key} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2', color)}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                                                    <p className="text-xl font-bold text-slate-800">{pt[key] ?? 0}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Security sidebar ── */}
                <div className="lg:col-span-1">
                    <div className="card sticky top-6">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Lock size={15} className="text-primary-600" />
                                <h2 className="text-sm font-semibold text-slate-800">Security Settings</h2>
                            </div>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                            {msg && (
                                <div className={clsx(
                                    'flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm border',
                                    msg.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                )}>
                                    {msg.type === 'success'
                                        ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                                        : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                                    {msg.text}
                                </div>
                            )}

                            {(['current', 'new', 'confirm'] as const).map((field) => {
                                const labels = { current: 'Current Password', new: 'New Password', confirm: 'Confirm New Password' };
                                const keys = { current: 'currentPassword', new: 'newPassword', confirm: 'confirmPassword' } as const;
                                const placeholders = { current: 'Enter current password', new: 'At least 6 characters', confirm: 'Match new password' };
                                return (
                                    <div key={field} className="form-group">
                                        <label className="form-label">{labels[field]}</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords[field] ? 'text' : 'password'}
                                                value={passwords[keys[field]]}
                                                onChange={(e) => setPasswords(prev => ({ ...prev, [keys[field]]: e.target.value }))}
                                                placeholder={placeholders[field]}
                                                className="form-input pr-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPasswords[field] ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="btn btn-primary w-full disabled:opacity-50"
                            >
                                <Save size={14} />
                                {mutation.isPending ? 'Updating…' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
