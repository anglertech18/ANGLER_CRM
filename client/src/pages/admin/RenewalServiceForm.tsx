import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    initialData?: any;
    onClose: () => void;
}

const DURATION_UNITS = ['days', 'months', 'years'];

export default function RenewalServiceForm({ initialData, onClose }: Props) {
    const queryClient = useQueryClient();
    const isEdit = !!initialData;

    const [form, setForm] = useState({
        name: '',
        company_id: '',
        category_id: '',
        identifier_label: 'Identifier',
        requires_identifier: true,
        supports_provider: true,
        requires_provider: false,
        supports_server_name: true,
        requires_server_name: false,
        supports_plan_name: true,
        requires_plan_name: false,
        supports_login_username: false,
        requires_login_username: false,
        supports_quantity: false,
        requires_quantity: false,
        quantity_label: '',
        default_duration_value: 12,
        default_duration_unit: 'months',
        supports_amc: false,
        supports_support_package: false,
        is_active: true,
        sort_order: 0,
    });

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                company_id: String(initialData.company_id || initialData.category?.company_id || ''),
                category_id: String(initialData.category_id || ''),
                identifier_label: initialData.identifier_label || 'Identifier',
                requires_identifier: initialData.requires_identifier ?? true,
                supports_provider: initialData.supports_provider ?? true,
                requires_provider: initialData.requires_provider ?? false,
                supports_server_name: initialData.supports_server_name ?? true,
                requires_server_name: initialData.requires_server_name ?? false,
                supports_plan_name: initialData.supports_plan_name ?? true,
                requires_plan_name: initialData.requires_plan_name ?? false,
                supports_login_username: initialData.supports_login_username ?? false,
                requires_login_username: initialData.requires_login_username ?? false,
                supports_quantity: initialData.supports_quantity ?? false,
                requires_quantity: initialData.requires_quantity ?? false,
                quantity_label: initialData.quantity_label || '',
                default_duration_value: initialData.default_duration_value ?? 12,
                default_duration_unit: initialData.default_duration_unit || 'months',
                supports_amc: initialData.supports_amc ?? false,
                supports_support_package: initialData.supports_support_package ?? false,
                is_active: initialData.is_active ?? true,
                sort_order: initialData.sort_order ?? 0,
            });
        }
    }, [initialData]);

    const { data: companies = [] } = useQuery({
        queryKey: ['companies-master'],
        queryFn: async () => {
            const res = await api.get('/masters/company');
            return (res.data as any[]).filter((company) => company.is_active !== false);
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['renewal-categories', form.company_id],
        queryFn: () => api.get('/renewal-masters/categories', {
            params: form.company_id ? { companyId: form.company_id } : undefined,
        }).then(r => r.data),
    });

    const mutation = useMutation({
        mutationFn: (data: any) =>
            isEdit
                ? api.put(`/renewal-masters/services/${initialData.id}`, data)
                : api.post('/renewal-masters/services', data),
        onSuccess: () => {
            toast.success(isEdit ? 'Service updated' : 'Service created');
            queryClient.invalidateQueries({ queryKey: ['masters', 'renewalservice'] });
            onClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to save');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        if (!form.company_id) { toast.error('Parent company is required'); return; }
        if (!form.category_id) { toast.error('Category is required'); return; }
        mutation.mutate({
            ...form,
            company_id: parseInt(form.company_id),
            category_id: parseInt(form.category_id),
        });
    };

    const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
        <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
                type="button"
                onClick={onChange}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-slate-600">{label}</span>
        </label>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-box max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="modal-header">
                    <h2 className="modal-title">{isEdit ? 'Edit' : 'New'} Renewal Service</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="form-label">Service Name *</label>
                            <input
                                className="form-input"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Basic Server, .com Domain, Vehicle Tracking"
                            />
                        </div>

                        <div>
                            <label className="form-label">Parent Company *</label>
                            <select
                                className="form-select"
                                value={form.company_id}
                                onChange={e => setForm(p => ({ ...p, company_id: e.target.value, category_id: '' }))}
                            >
                                <option value="">Select company</option>
                                {companies.map((company: any) => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Category *</label>
                            <select
                                className="form-select"
                                value={form.category_id}
                                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                            >
                                <option value="">Select category</option>
                                {categories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Identifier Label</label>
                            <input
                                className="form-input"
                                value={form.identifier_label}
                                onChange={e => setForm(p => ({ ...p, identifier_label: e.target.value }))}
                                placeholder="e.g. Domain Name, Serial No"
                            />
                        </div>

                        <div>
                            <label className="form-label">Quantity Label</label>
                            <input
                                className="form-input"
                                value={form.quantity_label}
                                onChange={e => setForm(p => ({ ...p, quantity_label: e.target.value }))}
                                placeholder="e.g. No. of Email IDs, No. of Vehicles"
                            />
                        </div>

                        <div>
                            <label className="form-label">Default Duration</label>
                            <input
                                type="number"
                                min={1}
                                className="form-input"
                                value={form.default_duration_value}
                                onChange={e => setForm(p => ({ ...p, default_duration_value: parseInt(e.target.value) || 12 }))}
                            />
                        </div>

                        <div>
                            <label className="form-label">Duration Unit</label>
                            <select
                                className="form-select"
                                value={form.default_duration_unit}
                                onChange={e => setForm(p => ({ ...p, default_duration_unit: e.target.value }))}
                            >
                                {DURATION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Sort Order</label>
                            <input
                                type="number"
                                min={0}
                                className="form-input"
                                value={form.sort_order}
                                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Field Rules & Capabilities</span>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                            <Toggle checked={form.requires_identifier} onChange={() => setForm(p => ({ ...p, requires_identifier: !p.requires_identifier }))} label="Requires Identifier" />
                            <Toggle checked={form.supports_provider} onChange={() => setForm(p => ({ ...p, supports_provider: !p.supports_provider }))} label="Supports Provider" />
                            <Toggle checked={form.requires_provider} onChange={() => setForm(p => ({ ...p, requires_provider: !p.requires_provider }))} label="Requires Provider" />
                            <Toggle checked={form.supports_server_name} onChange={() => setForm(p => ({ ...p, supports_server_name: !p.supports_server_name }))} label="Supports Server Name" />
                            <Toggle checked={form.supports_plan_name} onChange={() => setForm(p => ({ ...p, supports_plan_name: !p.supports_plan_name }))} label="Supports Service Plan" />
                            <Toggle checked={form.supports_login_username} onChange={() => setForm(p => ({ ...p, supports_login_username: !p.supports_login_username }))} label="Supports Login Username" />
                            <Toggle checked={form.supports_quantity} onChange={() => setForm(p => ({ ...p, supports_quantity: !p.supports_quantity }))} label="Supports Quantity" />
                            <Toggle checked={form.requires_quantity} onChange={() => setForm(p => ({ ...p, requires_quantity: !p.requires_quantity }))} label="Requires Quantity" />
                            <Toggle checked={form.supports_amc} onChange={() => setForm(p => ({ ...p, supports_amc: !p.supports_amc }))} label="Supports AMC" />
                            <Toggle checked={form.supports_support_package} onChange={() => setForm(p => ({ ...p, supports_support_package: !p.supports_support_package }))} label="Support Package" />
                            <Toggle checked={form.is_active} onChange={() => setForm(p => ({ ...p, is_active: !p.is_active }))} label="Active" />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                            <Save size={14} />
                            {mutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
