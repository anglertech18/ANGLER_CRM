import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Plus, AlertCircle } from 'lucide-react';

interface ProductFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function ProductForm({ initialData, onClose }: ProductFormProps) {
    // count_type stored as comma-separated; manage as a tag array in UI
    const parseCountTypes = (raw: string) =>
        (raw || '').split(',').map(s => s.trim()).filter(Boolean);

    const [countTypes, setCountTypes] = useState<string[]>(
        parseCountTypes(initialData?.count_type || '')
    );
    const [countTypeInput, setCountTypeInput] = useState('');

    const addCountType = () => {
        const val = countTypeInput.trim();
        if (val && !countTypes.includes(val)) {
            setCountTypes(prev => [...prev, val]);
        }
        setCountTypeInput('');
    };

    const removeCountType = (idx: number) =>
        setCountTypes(prev => prev.filter((_, i) => i !== idx));

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData || {
            name: '',
            company_id: '',
            count_type: '',
            q4_to_q3_days: 0,
            q3_to_q2_days: 0,
            q2_to_q1_days: 0,
            q1_to_nurturing_days: 0,
            device_q4_multiplier: 1.0,
            device_q3_multiplier: 1.0,
            device_q2_multiplier: 1.0,
            device_q1_multiplier: 1.0,
            lead_q4_multiplier: 1.0,
            lead_q3_multiplier: 1.0,
            lead_q2_multiplier: 1.0,
            lead_q1_multiplier: 1.0
        },
    });
    const queryClient = useQueryClient();

    const { data: companies } = useQuery({
        queryKey: ['masters', 'company'],
        queryFn: () => api.get('/masters/company').then(r => r.data),
    });
    const [submitError, setSubmitError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data };
            delete payload.id;
            delete payload.created_at;
            delete payload.updated_at;
            delete payload.leads;
            delete payload.personas;
            delete payload.call_trackers;
            delete payload.company;
            payload.count_type = countTypes.join(',');
            payload.company_id = payload.company_id ? parseInt(payload.company_id) : null;

            if (initialData) {
                await api.put(`/masters/product/${initialData.id}`, payload);
            } else {
                await api.post(`/masters/product`, payload);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['masters', 'product'] });
            onClose();
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.message || error.message || 'Failed to save product.';
            setSubmitError(msg);
        }
    });

    const onSubmit = (data: any) => {
        setSubmitError(null);
        mutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[600px] p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold capitalize">
                        {initialData ? 'Edit' : 'Add'} Product
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Product Name</label>
                            <input
                                {...register('name', { required: 'Product name is required' })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                                placeholder="e.g., Time Check"
                            />
                            {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company</label>
                            <select
                                {...register('company_id', { required: 'Please select a Company.' })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                            >
                                <option value="">Select Company</option>
                                {companies?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {errors.company_id && <span className="text-red-500 text-sm">{errors.company_id.message as string}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Count Types</label>
                            {/* Tag display */}
                            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
                                {countTypes.map((ct, idx) => (
                                    <span key={idx} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                                        {ct}
                                        <button type="button" onClick={() => removeCountType(idx)} className="hover:text-red-500">
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                                {countTypes.length === 0 && (
                                    <span className="text-xs text-gray-400 italic">No count types added</span>
                                )}
                            </div>
                            {/* Add input */}
                            <div className="flex gap-2">
                                <input
                                    value={countTypeInput}
                                    onChange={e => setCountTypeInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCountType(); } }}
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border text-sm"
                                    placeholder="e.g., Licenses"
                                />
                                <button type="button" onClick={addCountType} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1 text-sm">
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-md font-semibold mb-3 text-blue-600">Quadrant Degradation Rules (Days)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-600">Q4 → Q3 (Days)</label>
                                <input type="number" {...register('q4_to_q3_days')} className="mt-1 block w-full rounded-md border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600">Q3 → Q2 (Days)</label>
                                <input type="number" {...register('q3_to_q2_days')} className="mt-1 block w-full rounded-md border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600">Q2 → Q1 (Days)</label>
                                <input type="number" {...register('q2_to_q1_days')} className="mt-1 block w-full rounded-md border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600">Q1 → Nurturing (Days)</label>
                                <input type="number" {...register('q1_to_nurturing_days')} className="mt-1 block w-full rounded-md border p-2 text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-md font-semibold mb-3 text-blue-600">Target Multipliers</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-xs font-bold mb-2 uppercase text-gray-500">Device Multipliers</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q4</span>
                                        <input type="number" step="0.1" {...register('device_q4_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q3</span>
                                        <input type="number" step="0.1" {...register('device_q3_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q2</span>
                                        <input type="number" step="0.1" {...register('device_q2_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q1</span>
                                        <input type="number" step="0.1" {...register('device_q1_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold mb-2 uppercase text-gray-500">Lead Multipliers</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q4</span>
                                        <input type="number" step="0.1" {...register('lead_q4_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q3</span>
                                        <input type="number" step="0.1" {...register('lead_q3_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q2</span>
                                        <input type="number" step="0.1" {...register('lead_q2_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs">Q1</span>
                                        <input type="number" step="0.1" {...register('lead_q1_multiplier')} className="w-20 rounded-md border p-1 text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {submitError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                            <AlertCircle size={15} className="shrink-0" />
                            {submitError}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 mt-6 sticky bottom-0 bg-white py-2 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? 'Saving...' : 'Save Product Data'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
