import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api';

interface Props {
    type: string;
    initialData?: any;
    onClose: () => void;
}

const API_MAP: Record<string, string> = {
    renewalcategory: '/renewal-masters/categories',
    renewalsubcategory: '/renewal-masters/categories',
    renewalprovider: '/renewal-masters/providers',
};

const TITLE_MAP: Record<string, string> = {
    renewalcategory: 'Renewal Service Category',
    renewalsubcategory: 'Renewal Service Sub-Category',
    renewalprovider: 'Renewal Provider',
};

export default function RenewalMasterForm({ type, initialData, onClose }: Props) {
    const queryClient = useQueryClient();
    const isEdit = Boolean(initialData);
    const isProvider = type === 'renewalprovider';
    const isSubCategory = type === 'renewalsubcategory';

    const [form, setForm] = useState({
        name: '',
        code: '',
        color: '#6366f1',
        company_id: '',
        parent_id: '',
        category_code: '',
        sort_order: 0,
        is_active: true,
    });

    useEffect(() => {
        if (!initialData) return;

        setForm({
            name: initialData.name || '',
            code: initialData.code || '',
            color: initialData.color || '#6366f1',
            company_id: initialData.company_id ? String(initialData.company_id) : '',
            parent_id: initialData.parent_id ? String(initialData.parent_id) : '',
            category_code: initialData.category_code || '',
            sort_order: initialData.sort_order ?? 0,
            is_active: initialData.is_active ?? true,
        });
    }, [initialData]);

    const { data: companies = [] } = useQuery({
        queryKey: ['companies-master'],
        queryFn: async () => {
            const res = await api.get('/masters/company');
            return (res.data as any[]).filter((company) => company.is_active !== false);
        },
        enabled: !isProvider,
    });

    const { data: parentCategories = [] } = useQuery({
        queryKey: ['renewal-parent-categories', form.company_id],
        queryFn: async () => {
            const params = form.company_id ? { companyId: form.company_id } : undefined;
            const res = await api.get('/renewal-masters/categories', { params });
            return res.data;
        },
        enabled: isSubCategory,
    });

    const mutation = useMutation({
        mutationFn: async (payload: any) => {
            const path = API_MAP[type];
            if (isEdit) {
                return api.put(`${path}/${initialData.id}`, payload);
            }
            return api.post(path, payload);
        },
        onSuccess: async () => {
            toast.success(`${TITLE_MAP[type]} ${isEdit ? 'updated' : 'created'}`);
            await queryClient.invalidateQueries({ queryKey: ['masters', type] });
            onClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to save renewal master');
        },
    });

    const title = useMemo(() => TITLE_MAP[type] || 'Renewal Master', [type]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (isProvider) {
            mutation.mutate({
                name: form.name.trim(),
                category_code: form.category_code.trim() || null,
                is_active: form.is_active,
            });
            return;
        }

        if (isSubCategory && !form.parent_id) {
            toast.error('Parent category is required');
            return;
        }

        mutation.mutate({
            name: form.name.trim(),
            code: form.code.trim() || undefined,
            color: form.color || '#6366f1',
            company_id: form.company_id ? Number(form.company_id) : null,
            parent_id: isSubCategory ? Number(form.parent_id) : null,
            sort_order: Number(form.sort_order) || 0,
            is_active: form.is_active,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box max-w-lg">
                <div className="modal-header">
                    <h2 className="modal-title">{isEdit ? 'Edit' : 'New'} {title}</h2>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="form-label">Name *</label>
                        <input
                            className="form-input"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        />
                    </div>

                    {!isProvider && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Code</label>
                                    <input
                                        className="form-input"
                                        value={form.code}
                                        onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                                        placeholder="Auto generated when blank"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Color</label>
                                    <input
                                        type="color"
                                        className="form-input h-10 p-1"
                                        value={form.color}
                                        onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Parent Company</label>
                                <select
                                    className="form-select"
                                    value={form.company_id}
                                    onChange={(event) => setForm((prev) => ({ ...prev, company_id: event.target.value, parent_id: '' }))}
                                >
                                    <option value="">Global fallback</option>
                                    {companies.map((company: any) => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                    ))}
                                </select>
                            </div>

                            {isSubCategory && (
                                <div>
                                    <label className="form-label">Parent Category *</label>
                                    <select
                                        className="form-select"
                                        value={form.parent_id}
                                        onChange={(event) => setForm((prev) => ({ ...prev, parent_id: event.target.value }))}
                                    >
                                        <option value="">Select category</option>
                                        {parentCategories.map((category: any) => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="form-label">Sort Order</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="form-input"
                                    value={form.sort_order}
                                    onChange={(event) => setForm((prev) => ({ ...prev, sort_order: Number(event.target.value) || 0 }))}
                                />
                            </div>
                        </>
                    )}

                    {isProvider && (
                        <div>
                            <label className="form-label">Category Code</label>
                            <input
                                className="form-input"
                                value={form.category_code}
                                onChange={(event) => setForm((prev) => ({ ...prev, category_code: event.target.value }))}
                                placeholder="e.g. SERVER, DOMAIN"
                            />
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                        />
                        Active
                    </label>

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
