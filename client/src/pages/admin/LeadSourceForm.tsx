import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface LeadSourceFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function LeadSourceForm({ initialData, onClose }: LeadSourceFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData || { name: '', lead_source_type_id: '' },
    });
    const queryClient = useQueryClient();

    // Fetch active Lead Source Types for dropdown
    const { data: leadSourceTypes } = useQuery({
        queryKey: ['masters', 'leadsourcetype'],
        queryFn: () => api.get('/masters/leadsourcetype').then(r => r.data)
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                name: data.name,
                lead_source_type_id: parseInt(data.lead_source_type_id)
            };

            if (initialData) {
                await api.put(`/masters/leadsource/${initialData.id}`, payload);
            } else {
                await api.post(`/masters/leadsource`, payload);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['masters', 'leadsource'] });
            onClose();
        },
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold capitalize">
                        {initialData ? 'Edit' : 'Add'} Lead Source
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lead Source</label>
                        <input
                            {...register('name', { required: 'Name is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                            placeholder="e.g., Telecall"
                        />
                        {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lead Source Type</label>
                        <select
                            {...register('lead_source_type_id', { required: 'Lead Source Type is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                        >
                            <option value="">Select Lead Source Type</option>
                            {leadSourceTypes?.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {errors.lead_source_type_id && <span className="text-red-500 text-sm">{errors.lead_source_type_id.message as string}</span>}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
