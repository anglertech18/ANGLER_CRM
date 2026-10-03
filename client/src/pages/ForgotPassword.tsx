import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { BarChart2, ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

const schema = z.object({
    email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            setMessage('');
            await api.post('/auth/forgot-password', data);
            setMessage('If that email exists, a reset link has been sent to your inbox.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-10 justify-center">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                        <BarChart2 size={15} className="text-white" />
                    </div>
                    <span className="font-semibold text-slate-900">Angler CRM</span>
                </div>

                <div className="card p-8">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Reset your password</h1>
                        <p className="text-sm text-slate-500">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    {message && (
                        <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                            <CheckCircle size={15} className="shrink-0 mt-0.5" />
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    {...register('email')}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                    className="form-input pl-9"
                                />
                            </div>
                            {errors.email && <p className="form-error">{errors.email.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary w-full py-3 text-sm disabled:opacity-60"
                        >
                            {isSubmitting ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ArrowLeft size={13} />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
