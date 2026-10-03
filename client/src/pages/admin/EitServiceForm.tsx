import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface EitServiceFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function EitServiceForm({ initialData, onClose }: EitServiceFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData || { name: '', count_type: '' },
    });
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (initialData) {
                await api.put(`/masters/eitservice/${initialData.id}`, data);
            } else {
                await api.post(`/masters/eitservice`, data);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['masters', 'eitservice'] });
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
                        {initialData ? 'Edit' : 'Add'} EIT Service
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">EIT Service Name</label>
                        <input
                            {...register('name', { required: 'EIT Service name is required' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                            placeholder="e.g., EIT Consulting Service"
                        />
                        {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Count Type</label>
                        <input
                            {...register('count_type')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border"
                            placeholder="e.g., licenses, users, seats"
                        />
                        <p className="mt-1 text-xs text-gray-500">Optional: Specify the count type for this service</p>
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
