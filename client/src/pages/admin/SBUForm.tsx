import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface SBUFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function SBUForm({ initialData, onClose }: SBUFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData || { name: '', company_id: '' },
    });
    const queryClient = useQueryClient();

    // Fetch companies for dropdown
    const { data: companies } = useQuery({
        queryKey: ['masters', 'company'],
        queryFn: () => api.get('/masters/company').then(r => r.data)
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            // Convert company_id to number and remove relation fields
            const payload = {
                name: data.name,
                company_id: parseInt(data.company_id)
            };

            if (initialData) {
                await api.put(`/masters/sbu/${initialData.id}`, payload);
            } else {
                await api.post(`/masters/sbu`, payload);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['masters', 'sbu'] });
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
                        {initialData ? 'Edit' : 'Add'} SBU
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Company</label>
                        <select
                            {...register('company_id', { required: 'Company is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                        >
                            <option value="">Select Company</option>
                            {companies?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.company_id && <span className="text-red-500 text-sm">{errors.company_id.message as string}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">SBU Name</label>
                        <input
                            {...register('name', { required: 'Name is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                            placeholder="e.g., North Region"
                        />
                        {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
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
