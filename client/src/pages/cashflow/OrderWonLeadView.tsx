import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    ArrowLeft, Building2, User, Package, TrendingUp,
    Save, Plus, Trash2, AlertCircle, CheckCircle2, DollarSign,
} from 'lucide-react';
import clsx from 'clsx';
import DateOverlay from '../../components/DateOverlay';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const ReadField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[36px] flex items-center">
            {children || '—'}
        </div>
    </div>
);

export default function OrderWonLeadView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [verticalId, setVerticalId] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [milestones, setMilestones] = useState<any[]>([]);
    const [milestoneError, setMilestoneError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const clampToastRef = useRef<number | undefined>(undefined);

    const { data: lead, isLoading, isError } = useQuery({
        queryKey: ['leads', id],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/leads/${id}`, { headers: authHeaders() });
            return res.data;
        },
    });

    const { data: milestonesData } = useQuery({
        queryKey: ['lead-milestones', id],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/leads/${id}/milestones`, { headers: authHeaders() });
            return res.data;
        },
        enabled: !!id,
    });

    const { data: verticals = [] } = useQuery({
        queryKey: ['masters', 'vertical'],
        queryFn: () => axios.get(`${API_BASE}/masters/vertical`, { headers: authHeaders() }).then(r => r.data),
    });

    const { data: paymentTypes = [] } = useQuery({
        queryKey: ['masters', 'paymenttype'],
        queryFn: () => axios.get(`${API_BASE}/masters/paymenttype`, { headers: authHeaders() }).then(r => r.data),
    });

    useEffect(() => {
        if (!lead) return;
        setVerticalId(lead.vertical_id ? String(lead.vertical_id) : '');
        setProjectName(lead.project_name || '');
    }, [lead]);

    useEffect(() => {
        if (!milestonesData) return;
        setMilestones(
            (milestonesData as any[]).map((m: any) => ({
                id: m.id,
                payment_type_id: m.payment_type_id ? String(m.payment_type_id) : '',
                percentage: m.percentage != null ? String(m.percentage) : '',
                expected_amount: m.expected_amount != null ? String(m.expected_amount) : '',
                edc: m.edc ? m.edc.slice(0, 10) : '',
            }))
        );
    }, [milestonesData]);

    const addMilestone = () => {
        const orderVal = parseFloat(String(lead?.order_value)) || 0;
        if (orderVal <= 0) {
            setMilestoneError('Enter Order Value before adding a milestone.');
            window.clearTimeout(clampToastRef.current);
            clampToastRef.current = window.setTimeout(() => setMilestoneError(null), 4000);
            return;
        }
        setMilestones(prev => [...prev, { payment_type_id: '', percentage: '', expected_amount: '', edc: '' }]);
        setMilestoneError(null);
    };

    const removeMilestone = (idx: number) => {
        setMilestones(prev => prev.filter((_, i) => i !== idx));
        setMilestoneError(null);
    };

    const updateMilestoneField = (idx: number, field: string, value: string) => {
        const orderVal = parseFloat(String(lead?.order_value)) || 0;
        let clampMsg: string | null = null;
        // Clamp against the other rows' current values (read outside the state updater
        // so the notice can be shown synchronously).
        if (field === 'expected_amount' && orderVal > 0 && value !== '') {
            const othersAmt = milestones.reduce((s, m, i) => i === idx ? s : s + (parseFloat(m.expected_amount) || 0), 0);
            const remainingAmt = Math.max(0, orderVal - othersAmt);
            if ((parseFloat(value) || 0) > remainingAmt) {
                value = remainingAmt.toFixed(2);
                clampMsg = `Expected Amount capped at ${value} — milestones cannot exceed the Order Value.`;
            }
        } else if (field === 'percentage' && value !== '') {
            const othersTotal = milestones.reduce((s, m, i) => i === idx ? s : s + (parseFloat(m.percentage) || 0), 0);
            const remaining = Math.max(0, 100 - othersTotal);
            if ((parseFloat(value) || 0) > remaining) {
                value = String(remaining);
                clampMsg = `Percentage capped at ${value}% — total across milestones cannot exceed 100%.`;
            }
        }
        setMilestones(prev => {
            const next = [...prev];
            const current = next[idx];
            // Amount and percentage stay in sync only when an Order Value exists to
            // derive one from the other; without it the field the user is not editing
            // is left untouched instead of being wiped.
            if (field === 'expected_amount') {
                const pct = orderVal > 0
                    ? (value !== '' ? (((parseFloat(value) || 0) / orderVal) * 100).toFixed(2) : '')
                    : current.percentage;
                next[idx] = { ...current, expected_amount: value, percentage: pct };
            } else if (field === 'percentage') {
                const amount = orderVal > 0
                    ? (value !== '' ? (((parseFloat(value) || 0) / 100) * orderVal).toFixed(2) : '')
                    : current.expected_amount;
                next[idx] = { ...current, percentage: value, expected_amount: amount };
            } else {
                next[idx] = { ...current, [field]: value };
            }
            return next;
        });
        setMilestoneError(clampMsg);
        if (clampMsg) {
            window.clearTimeout(clampToastRef.current);
            clampToastRef.current = window.setTimeout(() => setMilestoneError(null), 4000);
        }
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            setMilestoneError(null);
            const orderVal = parseFloat(String(lead?.order_value)) || 0;
            const totalAmount = milestones.reduce((s, m) => s + (parseFloat(m.expected_amount) || 0), 0);
            // Amount is authoritative: when an Order Value exists, derive the total
            // percentage from the (exact) amount total rather than summing each row's
            // display-rounded percentage — otherwise splits like /6 or /7 round each
            // row up and the sum trips the 100% check even though the amounts are fine.
            const totalPct = orderVal > 0
                ? (totalAmount / orderVal) * 100
                : milestones.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);

            for (const m of milestones) {
                if ((parseFloat(m.expected_amount) || 0) <= 0) {
                    throw new Error('Expected Amount must be greater than 0 for every milestone.');
                }
                if (!m.edc) {
                    throw new Error('Please select an EDC for all milestones.');
                }
            }
            if (orderVal > 0 && totalAmount > orderVal + 0.01) {
                throw new Error('Total milestone expected amount cannot exceed the Order Value.');
            }
            if (totalPct > 100.01) {
                throw new Error('Total milestone percentage cannot exceed 100%.');
            }

            if (projectName.trim().length > 255) {
                throw new Error('Project Name cannot exceed 255 characters.');
            }

            await axios.patch(
                `${API_BASE}/leads/${id}/cashflow`,
                { vertical_id: verticalId || null, project_name: projectName.trim() },
                { headers: authHeaders() }
            );

            await axios.post(
                `${API_BASE}/leads/${id}/milestones`,
                { milestones },
                { headers: authHeaders() }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads', id] });
            queryClient.invalidateQueries({ queryKey: ['lead-milestones', id] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (e: any) => {
            // Server message first: an axios error's own `message` is only
            // "Request failed with status code 4xx" and would mask the real reason.
            const msg = e?.response?.data?.message || e?.message || 'Failed to save changes.';
            setMilestoneError(msg);
        },
    });

    const orderVal = parseFloat(String(lead?.order_value)) || 0;
    const totalAmount = milestones.reduce((s, m) => s + (parseFloat(m.expected_amount) || 0), 0);
    // Same amount-authoritative derivation as the save check, so the on-screen total
    // and the "exceeds" banner agree with what save will actually accept.
    const totalPct = orderVal > 0
        ? (totalAmount / orderVal) * 100
        : milestones.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
    const remainingAmount = orderVal - totalAmount;
    const remainingPct = 100 - totalPct;
    const amountExceeded = orderVal > 0 && totalAmount > orderVal + 0.01;
    const pctExceeded = totalPct > 100.01;

    if (isLoading) return (
        <div className="min-h-screen bg-slate-50 animate-pulse p-8 space-y-4">
            <div className="h-8 w-48 bg-slate-100 rounded" />
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
    );

    if (isError || !lead) return (
        <div className="min-h-screen bg-slate-50 p-8">
            <p className="text-red-600 text-sm">Failed to load lead.</p>
        </div>
    );

    const company = lead.company_name || lead.company_master?.name || '—';
    const customerName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';
    const productName = lead.product?.name || lead.eitService?.name || lead.imService?.name || '—';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100">

            {/* Sticky Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 md:px-8 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 leading-tight">{company}</h1>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                                Order Won — Update Vertical &amp; Milestones
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {saveSuccess && (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                                <CheckCircle2 size={13} /> Saved successfully
                            </span>
                        )}
                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || amountExceeded || pctExceeded}
                            className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save size={14} />
                            {saveMutation.isPending ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 md:px-8 py-6 space-y-5 max-w-5xl mx-auto">

                {/* Read-only lead summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <Building2 size={15} className="text-emerald-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Lead Information</h2>
                        <span className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Read Only</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <ReadField label="Company Name">
                            <span className="flex items-center gap-1.5">
                                <Building2 size={12} className="text-slate-400 shrink-0" />
                                {company}
                            </span>
                        </ReadField>
                        <ReadField label="Customer Name">
                            <span className="flex items-center gap-1.5">
                                <User size={12} className="text-slate-400 shrink-0" />
                                {customerName}
                            </span>
                        </ReadField>
                        <ReadField label="Product">
                            <span className="flex items-center gap-1.5">
                                <Package size={12} className="text-slate-400 shrink-0" />
                                {productName}
                            </span>
                        </ReadField>
                        <ReadField label="Order Value">
                            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                <DollarSign size={12} className="shrink-0" />
                                {lead.order_value ? `₹${Number(lead.order_value).toLocaleString('en-IN')}` : '—'}
                            </span>
                        </ReadField>
                    </div>
                </div>

                {/* Project & Vertical — the two editable lead-level fields, kept together
                    and apart from the read-only summary above. */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <TrendingUp size={15} className="text-emerald-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Project &amp; Vertical</h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Project Name
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={e => setProjectName(e.target.value)}
                                maxLength={255}
                                placeholder="e.g. Warehouse Automation Phase 1"
                                className="form-input w-full"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Shown under the company in Cashflow Tracker and Report. Leave blank to clear it.
                            </p>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Select Vertical
                            </label>
                            <select
                                value={verticalId}
                                onChange={e => setVerticalId(e.target.value)}
                                className="form-input w-full"
                            >
                                <option value="">— Select Vertical —</option>
                                {(verticals as any[]).map((v: any) => (
                                    <option key={v.id} value={String(v.id)}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Milestones */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <DollarSign size={15} className="text-emerald-600" />
                            <h2 className="text-sm font-semibold text-slate-800">Payment Milestones</h2>
                        </div>
                        <button
                            onClick={addMilestone}
                            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Plus size={12} /> Add Milestone
                        </button>
                    </div>

                    <div className="p-5">
                        {milestones.length === 0 ? (
                            <p className="text-sm text-slate-400 italic text-center py-8">
                                No milestones added yet. Click "Add Milestone" to start.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm" style={{ minWidth: 580 }}>
                                    <thead>
                                        <tr className="bg-emerald-50 text-emerald-800 text-xs font-semibold">
                                            <th className="px-3 py-2 text-left border border-emerald-100">Milestone Type</th>
                                            <th className="px-3 py-2 text-left border border-emerald-100">Percentage (%)</th>
                                            <th className="px-3 py-2 text-left border border-emerald-100">Expected Amount (₹)</th>
                                            <th className="px-3 py-2 text-left border border-emerald-100">EDC <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-2 border border-emerald-100 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {milestones.map((m, idx) => (
                                            <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                                                <td className="px-2 py-1.5 border border-emerald-50">
                                                    <select
                                                        value={m.payment_type_id}
                                                        onChange={e => updateMilestoneField(idx, 'payment_type_id', e.target.value)}
                                                        className="w-full rounded border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                    >
                                                        <option value="">Select Type</option>
                                                        {(paymentTypes as any[]).map((pt: any) => (
                                                            <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5 border border-emerald-50">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={m.percentage}
                                                        onChange={e => updateMilestoneField(idx, 'percentage', e.target.value)}
                                                        placeholder="e.g. 30"
                                                        className="w-full rounded border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 border border-emerald-50">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={m.expected_amount}
                                                        onChange={e => updateMilestoneField(idx, 'expected_amount', e.target.value)}
                                                        placeholder="Amount in ₹"
                                                        className="w-full rounded border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 border border-emerald-50">
                                                    <DateOverlay value={m.edc} textClassName="pl-1.5 text-xs text-slate-900">
                                                        <input
                                                            type="date"
                                                            value={m.edc}
                                                            onChange={e => updateMilestoneField(idx, 'edc', e.target.value)}
                                                            onClick={e => (e.target as any).showPicker?.()}
                                                            required
                                                            className={`w-full cursor-pointer rounded border p-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${!m.edc ? 'border-red-300' : 'border-slate-200'}`}
                                                        />
                                                    </DateOverlay>
                                                </td>
                                                <td className="px-2 py-1.5 border border-emerald-50 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMilestone(idx)}
                                                        className="text-red-400 hover:text-red-600 p-1 transition-colors rounded"
                                                        title="Remove milestone"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Allocation summary */}
                        {milestones.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs px-1">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Order Value</p>
                                    <p className="font-semibold text-slate-700 mt-0.5">₹{orderVal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total Amount Allocated</p>
                                    <p className={clsx('font-semibold mt-0.5', amountExceeded ? 'text-red-600' : 'text-slate-700')}>
                                        ₹{totalAmount.toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Remaining Amount</p>
                                    <p className={clsx('font-semibold mt-0.5', remainingAmount < 0 ? 'text-red-600' : 'text-emerald-700')}>
                                        ₹{remainingAmount.toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total % Allocated</p>
                                    <p className={clsx('font-semibold mt-0.5', pctExceeded ? 'text-red-600' : 'text-slate-700')}>
                                        {totalPct.toFixed(2)}%
                                    </p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Remaining %</p>
                                    <p className={clsx('font-semibold mt-0.5', remainingPct < 0 ? 'text-red-600' : 'text-emerald-700')}>
                                        {remainingPct.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        )}
                        {(amountExceeded || pctExceeded) && (
                            <div className="mt-2 text-xs font-semibold text-red-600 px-1">
                                {amountExceeded && 'Total expected amount exceeds the Order Value. '}
                                {pctExceeded && 'Total percentage exceeds 100%.'}
                            </div>
                        )}

                        {/* Validation error */}
                        {milestoneError && (
                            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
                                <AlertCircle size={14} className="shrink-0" />
                                {milestoneError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom save button */}
                <div className="flex justify-end pb-8">
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || amountExceeded || pctExceeded}
                        className="flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                    >
                        <Save size={15} />
                        {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
