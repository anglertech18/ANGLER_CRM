import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import {
    BarChart2, AlertCircle, Eye, EyeOff, Mail, Lock,
    ArrowRight, Shield, TrendingUp, Zap, Users,
} from 'lucide-react';

const schema = z.object({
    email:    z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
    { icon: TrendingUp, label: 'Pipeline Tracking', desc: 'BANT-scored leads'       },
    { icon: Zap,        label: 'Real-time Calls',   desc: 'Live call logging'        },
    { icon: Users,      label: 'Team Performance',  desc: 'SWAT & Seal modules'     },
];

export default function Login() {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });
    const { login }   = useAuth();
    const navigate    = useNavigate();
    const [error, setError]       = useState('');
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('expired') === 'true') {
            setError('Your session has expired. Please log in again.');
        }
    }, []);

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            const res = await api.post('/auth/login', data);
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen flex">

            {/* ── Left branding panel ───────────────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-[54%] flex-col relative overflow-hidden"
                style={{ background: 'linear-gradient(150deg, #060D1F 0%, #0F172A 50%, #0D1525 100%)' }}
            >
                {/* Subtle grid overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),' +
                            'linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
                        backgroundSize: '44px 44px',
                    }}
                />
                {/* Ambient glow spots */}
                <div
                    className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)' }}
                />
                <div
                    className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)' }}
                />

                <div className="relative z-10 flex flex-col h-full p-12">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg"
                             style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.40)' }}>
                            <BarChart2 size={19} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight">Angler & Trinetra CRM</span>
                    </div>

                    {/* Hero content */}
                    <div className="flex-1 flex flex-col justify-center py-14">
                        {/* Pill badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full w-fit mb-7"
                             style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                            <span className="text-[11px] font-semibold text-primary-300 tracking-wide uppercase">
                                Sales Intelligence Platform
                            </span>
                        </div>

                        {/* Headline */}
                        <h2 className="text-[2.7rem] font-bold text-white leading-[1.14] tracking-tight mb-5">
                            Your sales pipeline,<br />
                            <span style={{
                                background: 'linear-gradient(130deg, #60A5FA 0%, #818CF8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                beautifully organised.
                            </span>
                        </h2>
                        <p className="text-[15px] leading-relaxed max-w-[380px] mb-10" style={{ color: '#64748B' }}>
                            Track leads, manage calls, monitor team performance — all in one place.
                            Built for modern enterprise sales teams.
                        </p>

                        {/* Feature cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {FEATURES.map(({ icon: Icon, label, desc }) => (
                                <div
                                    key={label}
                                    className="rounded-xl p-4 transition-colors"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                                         style={{ background: 'rgba(59,130,246,0.15)' }}>
                                        <Icon size={15} className="text-primary-400" />
                                    </div>
                                    <p className="text-xs font-semibold text-white mb-0.5 leading-tight">{label}</p>
                                    <p className="text-[11px]" style={{ color: '#475569' }}>{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: '#334155' }}>
                            © {new Date().getFullYear()} Angler iTech. All rights reserved.
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#334155' }}>
                            <Shield size={11} />
                            Enterprise Grade Security
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right login panel ─────────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
                <div className="w-full max-w-[400px]">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2.5 mb-10">
                        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                            <BarChart2 size={16} className="text-white" />
                        </div>
                        <span className="font-bold text-slate-900 text-lg tracking-tight">Angler CRM</span>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-[1.8rem] font-bold text-slate-900 tracking-tight leading-tight">
                            Welcome back
                        </h1>
                        <p className="text-[15px] text-slate-500 mt-2 leading-relaxed">
                            Sign in to your workspace to continue.
                        </p>
                    </div>

                    {/* Session-expired / error banner */}
                    {error && (
                        <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm
                                        bg-red-50 border border-red-200 text-red-700">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    {...register('email')}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                    className="form-input pl-10"
                                />
                            </div>
                            {errors.email && (
                                <p className="form-error">
                                    <AlertCircle size={12} />{errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <div className="flex items-center justify-between mb-2">
                                <label className="form-label mb-0">Password</label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    {...register('password')}
                                    type={showPass ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="form-input pl-10 pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                                               hover:text-slate-700 transition-colors p-0.5"
                                >
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="form-error">
                                    <AlertCircle size={12} />{errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary w-full py-3 mt-1 group text-[15px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Trust bar */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                            <Shield size={11} />
                            SSL Encrypted
                        </div>
                        <div className="w-px h-3 bg-slate-200" />
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            All systems operational
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
