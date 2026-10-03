import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';

interface PersonaFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function PersonaForm({ initialData, onClose }: PersonaFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: initialData ? {
            name: initialData.name,
            mapped_id: initialData.product_id || ''
        } : {
            name: '',
            mapped_id: ''
        },
    });
    const queryClient = useQueryClient();

    // Fetch products
    const { data: products } = useQuery({
        queryKey: ['masters', 'product'],
        queryFn: () => api.get('/masters/product').then(r => r.data)
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const mappedId = parseInt(data.mapped_id);
            const payload: any = {
                name: data.name,
                product_or_service: 'Product',
                product_id: mappedId,
                eit_service_id: null,
                im_service_id: null
            };

            if (initialData) {
                await api.put(`/masters/persona/${initialData.id}`, payload);
            } else {
                await api.post(`/masters/persona`, payload);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['masters', 'persona'] });
            onClose();
        },
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? 'Edit' : 'Add'} Customer Persona
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Product */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Select Product</label>
                        <select
                            {...register('mapped_id', { required: 'Product is required' })}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                        >
                            <option value="">Select Product</option>
                            {(products || []).map((item: any) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                        {errors.mapped_id && <span className="text-red-500 text-xs mt-1 block">{errors.mapped_id.message as string}</span>}
                    </div>

                    {/* Persona Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Persona Name</label>
                        <input
                            {...register('name', { required: 'Name is required' })}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                            placeholder="e.g., CTO, Finance Manager"
                        />
                        {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name.message as string}</span>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? 'Saving...' : 'Save Persona'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
