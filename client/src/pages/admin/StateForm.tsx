import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface StateFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function StateForm({ initialData, onClose }: StateFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData || { name: '', country_id: '' },
    });
    const queryClient = useQueryClient();

    // Fetch countries for dropdown
    const { data: countries } = useQuery({
        queryKey: ['masters', 'country'],
        queryFn: () => api.get('/masters/country').then(r => r.data)
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            // Convert country_id to number and remove relation fields
            const payload = {
                name: data.name,
                country_id: parseInt(data.country_id)
            };

            if (initialData) {
                await api.put(`/masters/state/${initialData.id}`, payload);
            } else {
                await api.post(`/masters/state`, payload);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['masters', 'state'] });
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
                        {initialData ? 'Edit' : 'Add'} State
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Country</label>
                        <select
                            {...register('country_id', { required: 'Country is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                        >
                            <option value="">Select Country</option>
                            {countries?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.country_id && <span className="text-red-500 text-sm">{errors.country_id.message as string}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">State Name</label>
                        <input
                            {...register('name', { required: 'Name is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                            placeholder="e.g., California"
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
