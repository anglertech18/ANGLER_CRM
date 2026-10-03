import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    ArrowLeft, Edit2, DollarSign, Calendar, User, Building2,
    Layers, CreditCard, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import Table, { type TableColumn } from '../../components/Table';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-sm font-medium text-slate-800">{children || <span className="text-slate-400">—</span>}</div>
    </div>
);

const agingDays = (edc: string | null) => {
    if (!edc) return null;
    return dayjs().diff(dayjs(edc), 'day');
};

const AgingHeatBar = ({ days }: { days: number | null }) => {
    if (days === null) return null;
    const pct = Math.min(100, (days / 30) * 100);
    const color = days <= 5 ? 'bg-emerald-500' : days <= 15 ? 'bg-amber-400' : 'bg-red-500';
    return (
        <div className="mt-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
            </div>
            <p className={clsx('text-xs font-semibold mt-1', days <= 5 ? 'text-emerald-700' : days <= 15 ? 'text-amber-700' : 'text-red-700')}>
                {days <= 0 ? 'Not overdue' : `${days} days overdue`}
            </p>
        </div>
    );
};

export default function CashflowTrackerView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: tracker, isLoading, isError } = useQuery({
        queryKey: ['cashflow-tracker', id],
        queryFn: () => axios.get(`${API_BASE}/cashflow-tracker/${id}`, { headers: authHeaders() }).then(r => r.data),
    });

    if (isLoading) return (
        <div className="animate-pulse space-y-4 p-8">
            <div className="h-8 w-48 bg-slate-100 rounded" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>
    );

    if (isError || !tracker) return (
        <div className="p-8 text-red-600 text-sm">Failed to load record.</div>
    );

    const execName = `${tracker.executive?.first_name || ''} ${tracker.executive?.last_name || ''}`.trim();
    const expected = Number(tracker.expected_cashflow || 0);
    const received = Number(tracker.actual_received || 0);
    const pending = expected - received;
    const stretchTarget = tracker.monthly_stretch_target != null ? Number(tracker.monthly_stretch_target) : null;
    const edcDate = tracker.revised_edc || tracker.edc;
    const aging = agingDays(edcDate);

    const paymentStatus = received >= expected && expected > 0 ? 'Paid' : received > 0 ? 'Partial' : 'Pending';
    const statusColors = {
        Paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        Partial: 'bg-amber-100 text-amber-700 border-amber-200',
        Pending: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">
                                {tracker.client_company?.name || 'Cashflow Record'}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', statusColors[paymentStatus as keyof typeof statusColors])}>
                                    {paymentStatus}
                                </span>
                                {tracker.vertical && (
                                    <span className="text-[11px] font-medium text-blue-600">{tracker.vertical.name}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Link
                        to={`/cashflow/tracker/${id}/edit`}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Edit2 size={14} /> Edit
                    </Link>
                </div>
            </div>

            <div className="px-6 py-6 space-y-5">

                {/* Financial Banner */}
                <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Expected Cashflow</p>
                            <p className="text-xl font-bold">{fmt(expected)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Actual Received</p>
                            <p className="text-xl font-bold text-emerald-300">{fmt(received)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Pending Amount</p>
                            <p className="text-xl font-bold text-amber-300">{fmt(pending)}</p>
                        </div>
                        {tracker.monthly_stretch_target != null && (
                            <div>
                                <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Monthly Stretch Target</p>
                                <p className="text-xl font-bold text-purple-300">{fmt(tracker.monthly_stretch_target)}</p>
                            </div>
                        )}
                    </div>
                    {expected > 0 && (
                        <div className="mt-4">
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (received / expected) * 100)}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-blue-200 mt-1">{Math.round((received / expected) * 100)}% collected</p>
                        </div>
                    )}
                </div>

                {/* Client Overview */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <Building2 size={15} className="text-blue-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Client Overview</h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
                        <Field label="Client Name">{tracker.client_company?.name}</Field>
                        <Field label="Executive">
                            <span className="flex items-center gap-1.5"><User size={13} className="text-slate-300" />{execName}</span>
                        </Field>
                        <Field label="Vertical">
                            {tracker.vertical ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                    <Layers size={10} />{tracker.vertical.name}
                                </span>
                            ) : null}
                        </Field>
                        <Field label="Payment Type">
                            {tracker.payment_type ? (
                                <span className="flex items-center gap-1"><CreditCard size={13} className="text-slate-300" />{tracker.payment_type.name}</span>
                            ) : null}
                        </Field>
                    </div>
                </div>

                {/* Risk & Aging */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <Clock size={15} className="text-amber-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Risk & Aging</h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
                        <Field label="EDC">
                            <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-300" />
                                {tracker.edc ? dayjs(tracker.edc).format('DD MMM YYYY') : null}
                            </span>
                        </Field>
                        <Field label="Revised EDC">
                            {tracker.revised_edc ? dayjs(tracker.revised_edc).format('DD MMM YYYY') : null}
                        </Field>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Aging</p>
                            <AgingHeatBar days={aging} />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">BANT POA</p>
                            {tracker.bant_poa ? (
                                <span className={clsx(
                                    'text-xs font-bold px-2.5 py-1 rounded-full border',
                                    tracker.bant_poa === 'High' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                    tracker.bant_poa === 'Medium' && 'bg-amber-50 text-amber-700 border-amber-200',
                                    tracker.bant_poa === 'Low' && 'bg-red-50 text-red-700 border-red-200',
                                )}>
                                    {tracker.bant_poa}
                                </span>
                            ) : <span className="text-slate-400 text-sm">—</span>}
                        </div>
                        <Field label="BANT POA EDC">
                            <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-300" />
                                {tracker.bant_poa_edc ? dayjs(tracker.bant_poa_edc).format('DD MMM YYYY') : null}
                            </span>
                        </Field>
                    </div>
                    {tracker.notes && (
                        <div className="px-5 pb-5">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{tracker.notes}</p>
                        </div>
                    )}
                </div>

                {/* Milestone Breakdown */}
                {tracker.milestones?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                            <DollarSign size={15} className="text-emerald-600" />
                            <h2 className="text-sm font-semibold text-slate-800">Milestone Breakdown</h2>
                        </div>
                        <Table
                            columns={([
                                { key: 'name', header: 'Milestone', className: 'text-sm text-slate-800', render: (m: any) => m.name },
                                { key: 'amount', header: 'Amount', align: 'right', className: 'text-sm font-semibold text-slate-800', render: (m: any) => fmt(m.amount) },
                                {
                                    key: 'status', header: 'Status', align: 'center', render: (m: any) => (
                                        m.status === 'Received' ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                <CheckCircle size={10} /> Received
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                                <AlertCircle size={10} /> Pending
                                            </span>
                                        )
                                    ),
                                },
                            ] as TableColumn<any>[])}
                            data={tracker.milestones}
                            getRowKey={(m: any) => m.id}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
