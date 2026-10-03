import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    ArrowLeft, Save, Plus, Trash2, DollarSign, User, Building2,
    Layers, CreditCard, Calendar, ChevronDown, BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const BANT_POA_OPTIONS = ['Low', 'Medium', 'High'];

interface Milestone {
    id?: number;
    name: string;
    amount: string;
    received_amount: string;
}

const defaultForm = {
    product_id: '',
    client_company_id: '',
    vertical_id: '',
    payment_type_id: '',
    expected_cashflow: '',
    actual_received: '',
    monthly_stretch_target: '',
    edc: '',
    revised_edc: '',
    bant_poa: '',
    bant_poa_edc: '',
    notes: '',
};

export default function CashflowTrackerForm() {
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    const [form, setForm] = useState(defaultForm);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [milestoneError, setMilestoneError] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const productDefaultApplied = useRef(false);

    // Mapped products for auto-selection
    const { data: mappedItems = [] } = useQuery({
        queryKey: ['cf-form-mapped-products', authUser?.id],
        queryFn: () => axios.get(`${API_BASE}/seal/poas/mapped-products`, { headers: authHeaders() }).then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    // Auto-select first mapped product on create
    useEffect(() => {
        if (isEdit || productDefaultApplied.current) return;
        if ((mappedItems as any[]).length > 0 && !form.product_id) {
            productDefaultApplied.current = true;
            const first = (mappedItems as any[])[0];
            const id = Number(first.id);
            if (id) setForm(p => ({ ...p, product_id: String(id) }));
        }
    }, [mappedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    // Masters
    const { data: verticals = [] } = useQuery({
        queryKey: ['masters', 'vertical'],
        queryFn: () => axios.get(`${API_BASE}/masters/vertical`, { headers: authHeaders() }).then(r => r.data),
        staleTime: 10 * 60 * 1000,
    });

    const { data: paymentTypes = [] } = useQuery({
        queryKey: ['masters', 'paymenttype'],
        queryFn: () => axios.get(`${API_BASE}/masters/paymenttype`, { headers: authHeaders() }).then(r => r.data),
        staleTime: 10 * 60 * 1000,
    });

    const { data: clientCompanies = [] } = useQuery({
        queryKey: ['masters', 'clientcompany'],
        queryFn: () => axios.get(`${API_BASE}/masters/clientcompany`, { headers: authHeaders() }).then(r => r.data),
        staleTime: 10 * 60 * 1000,
    });

    // Fetch existing record in edit mode
    const { data: existing } = useQuery({
        queryKey: ['cashflow-tracker', id],
        enabled: isEdit,
        queryFn: () => axios.get(`${API_BASE}/cashflow-tracker/${id}`, { headers: authHeaders() }).then(r => r.data),
    });

    useEffect(() => {
        if (!existing) return;
        setForm({
            product_id: existing.product_id ? String(existing.product_id) : '',
            client_company_id: existing.client_company_id ? String(existing.client_company_id) : '',
            vertical_id: existing.vertical_id ? String(existing.vertical_id) : '',
            payment_type_id: existing.payment_type_id ? String(existing.payment_type_id) : '',
            expected_cashflow: existing.expected_cashflow ? String(existing.expected_cashflow) : '',
            actual_received: existing.actual_received ? String(existing.actual_received) : '',
            monthly_stretch_target: existing.monthly_stretch_target ? String(existing.monthly_stretch_target) : '',
            edc: existing.edc ? dayjs(existing.edc).format('YYYY-MM-DD') : '',
            revised_edc: existing.revised_edc ? dayjs(existing.revised_edc).format('YYYY-MM-DD') : '',
            bant_poa: existing.bant_poa || '',
            bant_poa_edc: existing.bant_poa_edc ? dayjs(existing.bant_poa_edc).format('YYYY-MM-DD') : '',
            notes: existing.notes || '',
        });
        if (existing.client_company) {
            setClientSearch(existing.client_company.name);
        }
        if (existing.milestones?.length) {
            setMilestones(existing.milestones.map((m: any) => ({
                id: m.id,
                name: m.name,
                amount: String(m.amount),
                received_amount: String(m.received_amount ?? 0),
            })));
        }
    }, [existing]);

    const filteredClients = clientSearch
        ? (clientCompanies as any[]).filter((c: any) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
        : (clientCompanies as any[]).slice(0, 20);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isEdit) {
                return axios.put(`${API_BASE}/cashflow-tracker/${id}`, data, { headers: authHeaders() });
            }
            return axios.post(`${API_BASE}/cashflow-tracker`, data, { headers: authHeaders() });
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['cashflow-trackers'] });
            queryClient.invalidateQueries({ queryKey: ['cashflow-tracker', id] });
            const newId = res.data?.id || id;
            navigate(`/cashflow/tracker/${newId}`);
        },
        onError: (e: any) => {
            alert(e?.response?.data?.message || 'Failed to save');
        },
    });

    const getMilestoneStatus = (amount: string, received: string): string => {
        const exp = parseFloat(amount) || 0;
        const rec = parseFloat(received) || 0;
        if (!rec || rec === 0) return 'Yet To Start';
        if (rec >= exp && exp > 0) return 'Completed';
        return 'In Progress';
    };

    const handleSubmit = () => {
        setMilestoneError(null);
        for (let i = 0; i < milestones.length; i++) {
            const exp = parseFloat(milestones[i].amount) || 0;
            const rec = parseFloat(milestones[i].received_amount) || 0;
            if (rec > exp) {
                setMilestoneError(`Milestone "${milestones[i].name || `#${i + 1}`}": Received Amount cannot exceed the Expected Amount.`);
                return;
            }
        }
        const payload = {
            ...form,
            milestones: milestones.map(m => ({
                name: m.name,
                amount: parseFloat(m.amount) || 0,
                received_amount: parseFloat(m.received_amount) || 0,
            })),
        };
        saveMutation.mutate(payload);
    };

    const addMilestone = () => setMilestones(ms => [...ms, { name: '', amount: '', received_amount: '' }]);
    const removeMilestone = (i: number) => setMilestones(ms => ms.filter((_, idx) => idx !== i));
    const updateMilestone = (i: number, field: keyof Milestone, val: string) =>
        setMilestones(ms => ms.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

    const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [field]: e.target.value }));

    const execName = authUser ? `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() : '';
    const selectedClient = (clientCompanies as any[]).find((c: any) => String(c.id) === form.client_company_id);

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
                                {isEdit ? 'Edit Cashflow Entry' : 'New Cashflow Entry'}
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">Cashflow Tracker</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <Save size={14} />
                        {saveMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="px-6 py-6 space-y-5 max-w-3xl">

                {/* Basic Details */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <Building2 size={15} className="text-blue-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Basic Details</h2>
                    </div>
                    <div className="p-5 space-y-4">

                        {/* Executive (read-only, auto-set) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Executive</label>
                                <div className="form-input w-full flex items-center gap-2 bg-slate-50 text-slate-500 cursor-not-allowed">
                                    <User size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-sm">{execName || 'You (current user)'}</span>
                                </div>
                            </div>

                            {/* Product */}
                            <div className="relative">
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Product</label>
                                <select
                                    value={form.product_id}
                                    onChange={f('product_id')}
                                    className="form-input w-full appearance-none pr-8"
                                >
                                    <option value="">Select Product</option>
                                    {(mappedItems as any[]).map((m: any) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Client Company */}
                        <div className="relative">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Client Name</label>
                            <input
                                type="text"
                                placeholder="Search client company..."
                                value={clientSearch}
                                onChange={e => {
                                    setClientSearch(e.target.value);
                                    setShowClientDropdown(true);
                                    if (!e.target.value) setForm(p => ({ ...p, client_company_id: '' }));
                                }}
                                onFocus={() => setShowClientDropdown(true)}
                                className="form-input w-full"
                            />
                            {showClientDropdown && filteredClients.length > 0 && (
                                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {filteredClients.map((c: any) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                            onClick={() => {
                                                setForm(p => ({ ...p, client_company_id: String(c.id) }));
                                                setClientSearch(c.name);
                                                setShowClientDropdown(false);
                                            }}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Vertical */}
                            <div className="relative">
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Vertical</label>
                                <select value={form.vertical_id} onChange={f('vertical_id')} className="form-input w-full appearance-none pr-8">
                                    <option value="">Select Vertical</option>
                                    {(verticals as any[]).map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none" />
                            </div>

                            {/* Payment Type */}
                            <div className="relative">
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Payment Type</label>
                                <select value={form.payment_type_id} onChange={f('payment_type_id')} className="form-input w-full appearance-none pr-8">
                                    <option value="">Select Type</option>
                                    {(paymentTypes as any[]).map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Data */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <DollarSign size={15} className="text-emerald-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Financial Data</h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expected Cashflow (INR)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.expected_cashflow}
                                    onChange={f('expected_cashflow')}
                                    placeholder="0"
                                    className="form-input w-full pl-7"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Actual Received (INR)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.actual_received}
                                    onChange={f('actual_received')}
                                    placeholder="0"
                                    className="form-input w-full pl-7"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Monthly Stretch Target (INR)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.monthly_stretch_target}
                                    onChange={f('monthly_stretch_target')}
                                    placeholder="0"
                                    className="form-input w-full pl-7"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date Controls */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <Calendar size={15} className="text-slate-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Date Controls</h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">EDC (Expected Date of Collection)</label>
                            <input type="date" value={form.edc} onChange={f('edc')} className="form-input w-full" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Revised EDC</label>
                            <input type="date" value={form.revised_edc} onChange={f('revised_edc')} className="form-input w-full" />
                        </div>
                    </div>
                </div>

                {/* Analytics */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <Layers size={15} className="text-slate-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Analytics</h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Aging (Auto-calculated)</label>
                            <div className="form-input w-full bg-slate-50 text-slate-500 cursor-not-allowed text-sm">
                                {(() => {
                                    const edc = form.revised_edc || form.edc;
                                    if (!edc) return 'Set EDC to calculate';
                                    const days = dayjs().diff(dayjs(edc), 'day');
                                    return days <= 0 ? 'Not overdue' : `${days} day(s) overdue`;
                                })()}
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">BANT POA</label>
                            <select value={form.bant_poa} onChange={f('bant_poa')} className="form-input w-full appearance-none pr-8">
                                <option value="">Select BANT POA</option>
                                {BANT_POA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">BANT POA EDC</label>
                            <input type="date" value={form.bant_poa_edc} onChange={f('bant_poa_edc')} className="form-input w-full" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={f('notes')}
                                rows={3}
                                placeholder="Any additional notes..."
                                className="form-input w-full resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Milestones */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <DollarSign size={15} className="text-emerald-600" />
                            <h2 className="text-sm font-semibold text-slate-800">Milestones</h2>
                        </div>
                        <button
                            type="button"
                            onClick={addMilestone}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <Plus size={13} /> Add Milestone
                        </button>
                    </div>
                    <div className="p-5 space-y-3">
                        {milestones.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">
                                No milestones added. <button type="button" onClick={addMilestone} className="text-blue-600 hover:underline">Add one</button>
                            </p>
                        ) : milestones.map((m, i) => {
                            const status = getMilestoneStatus(m.amount, m.received_amount);
                            const statusStyle = status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : status === 'In Progress'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200';
                            const recVal = parseFloat(m.received_amount) || 0;
                            const expVal = parseFloat(m.amount) || 0;
                            const hasError = recVal > expVal && expVal > 0;
                            return (
                                <div key={i} className={clsx('p-3 border rounded-xl bg-slate-50/50 space-y-2', hasError ? 'border-red-300' : 'border-slate-100')}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Milestone name"
                                            value={m.name}
                                            onChange={e => updateMilestone(i, 'name', e.target.value)}
                                            className="form-input flex-1 min-w-0 text-sm"
                                        />
                                        <div className="relative w-36 shrink-0">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">₹</span>
                                            <input
                                                type="number"
                                                placeholder="Expected"
                                                value={m.amount}
                                                onChange={e => updateMilestone(i, 'amount', e.target.value)}
                                                className="form-input w-full pl-6 text-sm"
                                            />
                                        </div>
                                        <div className="relative w-36 shrink-0">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">₹</span>
                                            <input
                                                type="number"
                                                placeholder="Received"
                                                value={m.received_amount}
                                                onChange={e => updateMilestone(i, 'received_amount', e.target.value)}
                                                className={clsx('form-input w-full pl-6 text-sm', hasError ? 'border-red-400 focus:ring-red-400' : '')}
                                            />
                                        </div>
                                        <span className={clsx('px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap shrink-0', statusStyle)}>
                                            {status}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeMilestone(i)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {hasError && (
                                        <p className="text-xs text-red-600 font-medium pl-1">Received Amount cannot exceed the Expected Amount.</p>
                                    )}
                                </div>
                            );
                        })}
                        {milestoneError && (
                            <p className="text-sm text-red-600 font-medium mt-2">{milestoneError}</p>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-3 pb-6">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <Save size={14} />
                        {saveMutation.isPending ? 'Saving…' : 'Save Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
}
