import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface Props {
    initialData?: any;
    onClose: () => void;
}

export default function BantCategoryForm({ initialData, onClose }: Props) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData || { code: '', name: '', status: 'active' },
    });
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (initialData) {
                await api.put(`/masters/bant-categories/${initialData.id}`, data);
            } else {
                await api.post('/masters/bant-categories', data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bant-categories-admin'] });
            onClose();
        },
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{initialData ? 'Edit' : 'Add'} BANT Category</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Code <span className="text-red-500">*</span></label>
                        <input
                            {...register('code', { required: 'Code is required' })}
                            maxLength={10}
                            placeholder="e.g. B"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 uppercase"
                        />
                        {errors.code && <span className="text-red-500 text-sm">{errors.code.message as string}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                        <input
                            {...register('name', { required: 'Name is required' })}
                            placeholder="e.g. Budget"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            {...register('status')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {mutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    {mutation.isError && (
                        <p className="text-red-500 text-sm text-center">{(mutation.error as any)?.response?.data?.error || 'Save failed'}</p>
                    )}
                </form>
            </div>
        </div>
    );
}
