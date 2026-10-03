import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface Props {
    categoryId: number;
    categoryName: string;
    initialData?: any;
    onClose: () => void;
}

export default function BantQuestionForm({ categoryId, categoryName, initialData, onClose }: Props) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData
            ? { question: initialData.question, sort_order: initialData.sort_order, is_active: initialData.is_active }
            : { question: '', sort_order: 0, is_active: true },
    });
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (initialData) {
                await api.put(`/masters/bant-questions/${initialData.id}`, data);
            } else {
                await api.post('/masters/bant-questions', { ...data, category_id: categoryId });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bant-questions-admin', categoryId] });
            onClose();
        },
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[480px] p-6">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-xl font-bold">{initialData ? 'Edit' : 'Add'} Question</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Category: <span className="font-medium text-gray-700">{categoryName}</span></p>
                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Question <span className="text-red-500">*</span></label>
                        <textarea
                            {...register('question', { required: 'Question is required' })}
                            rows={3}
                            placeholder="Enter the qualification question..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.question && <span className="text-red-500 text-sm">{errors.question.message as string}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                        <input
                            type="number"
                            {...register('sort_order', { valueAsNumber: true })}
                            min={0}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_active" {...register('is_active')} className="rounded" />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
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
