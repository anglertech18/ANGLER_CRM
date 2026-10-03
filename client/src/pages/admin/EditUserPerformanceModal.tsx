import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Target } from 'lucide-react';

interface EditUserPerformanceModalProps {
    userId: number;
    onClose: () => void;
}

export default function EditUserPerformanceModal({ userId, onClose }: EditUserPerformanceModalProps) {
    const queryClient = useQueryClient();
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

    // Fetch user details for header
    const { data: user, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user-detail', userId],
        queryFn: async () => {
            const res = await api.get(`/users/${userId}`);
            return res.data;
        }
    });

    // Fetch Products
    const { data: products = [], isLoading: isLoadingProducts } = useQuery({
        queryKey: ['products-active'],
        queryFn: async () => {
            const res = await api.get('/masters/product');
            return res.data.filter((p: any) => p.is_active);
        }
    });

    // Fetch Target Data when Product Changes
    const { data: targetData, isLoading: isLoadingTarget } = useQuery({
        queryKey: ['user-product-target', userId, selectedProductId],
        queryFn: async () => {
            if (!selectedProductId) return null;
            const res = await api.get(`/users/${userId}/product-targets?productId=${selectedProductId}`);
            return res.data;
        },
        enabled: !!selectedProductId
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            sales_target: '',
            revenue_target: '',
            device_target: '',
            partner_target: '',
            leads_target: '',
            calls_target: '',
            linkedin_target: '',
            direct_visit_target: '',
            email_target: '',
            linkedin_connection_target: '',
            proposals_target: '',
            demos_target: '',
        }
    });

    useEffect(() => {
        if (selectedProductId) {
            reset({
                sales_target: targetData?.sales_target || '',
                revenue_target: targetData?.revenue_target || '',
                device_target: targetData?.device_target || '',
                partner_target: targetData?.partner_target || '',
                leads_target: targetData?.leads_target || '',
                calls_target: targetData?.calls_target || '',
                linkedin_target: targetData?.linkedin_target || '',
                direct_visit_target: targetData?.direct_visit_target || '',
                email_target: targetData?.email_target || '',
                linkedin_connection_target: targetData?.linkedin_connection_target || '',
                proposals_target: targetData?.proposals_target || '',
                demos_target: targetData?.demos_target || '',
            });
        } else {
            reset({
                sales_target: '', revenue_target: '', device_target: '', partner_target: '', leads_target: '', calls_target: '', linkedin_target: '', direct_visit_target: '', email_target: '', linkedin_connection_target: '', proposals_target: '', demos_target: '',
            });
        }
    }, [targetData, selectedProductId, reset]);

    const productMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!selectedProductId) throw new Error("Please select a product");

            await api.patch(`/users/${userId}/product-targets`, {
                product_id: parseInt(selectedProductId as unknown as string),
                sales_target: data.sales_target ? parseInt(data.sales_target) : 0,
                revenue_target: data.revenue_target ? parseInt(data.revenue_target) : 0,
                device_target: data.device_target ? parseInt(data.device_target) : 0,
                partner_target: data.partner_target ? parseInt(data.partner_target) : 0,
                leads_target: data.leads_target ? parseInt(data.leads_target) : 0,
                calls_target: data.calls_target ? parseInt(data.calls_target) : 0,
                linkedin_target: data.linkedin_target ? parseInt(data.linkedin_target) : 0,
                direct_visit_target: data.direct_visit_target ? parseInt(data.direct_visit_target) : 0,
                email_target: data.email_target ? parseInt(data.email_target) : 0,
                linkedin_connection_target: data.linkedin_connection_target ? parseInt(data.linkedin_connection_target) : 0,
                proposals_target: data.proposals_target ? parseInt(data.proposals_target) : 0,
                demos_target: data.demos_target ? parseInt(data.demos_target) : 0,
                days: 22,
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            await queryClient.invalidateQueries({ queryKey: ['user-product-target', userId, selectedProductId] });
            alert('Product Targets updated successfully.');
        },
        onError: (error: any) => {
            alert('Failed to update: ' + (error.response?.data?.message || error.message));
        }
    });

    const onSubmit = (data: any) => {
        if (!selectedProductId) {
            alert('Please select a product first.');
            return;
        }
        productMutation.mutate(data);
    };

    if (isLoadingUser || isLoadingProducts) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                    <div className="text-center">Loading...</div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Target Configuration</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* User Info (Read-only) */}
                    <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-900">{user.first_name} {user.last_name}</h3>
                            <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="text-sm text-right">
                            <div><span className="text-gray-500">Role:</span> <span className="font-medium text-gray-900">{user.role}</span></div>
                            <div>
                                <span className="text-gray-500">Manager:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {user.reporting_manager
                                        ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}`
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Product / Service Type Toggle */}
                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Type</label>
                        <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600 border-gray-300"
                                    name="typeSelection"
                                    value="Products"
                                    checked={typeSelection === 'Products'}
                                    onChange={() => setTypeSelection('Products')}
                                />
                                <span className="ml-2">Products</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600 border-gray-300"
                                    name="typeSelection"
                                    value="Services"
                                    checked={typeSelection === 'Services'}
                                    onChange={() => setTypeSelection('Services')}
                                />
                                <span className="ml-2">Services</span>
                            </label>
                        </div>
                    </div> */}

                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Product *</label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full rounded-md border-gray-300 shadow-sm p-2.5 text-sm border focus:border-blue-500 focus:ring focus:ring-blue-200"
                        >
                            <option value="">-- Choose Product --</option>
                            {products.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Editable Fields Form */}
                    {!!selectedProductId && (
                        <form id="targetForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {isLoadingTarget ? (
                                <div className="text-center py-4 text-gray-500">Loading targets...</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    <InputField label="Sales Target (per month)" name="sales_target" register={register} errors={errors} icon={<Target size={16} className="text-amber-600" />} />
                                    <InputField label="Revenue Target (per month)" name="revenue_target" register={register} errors={errors} icon={<Target size={16} className="text-blue-600" />} />
                                    <InputField label="Device Target / License Target (per month)" name="device_target" register={register} errors={errors} icon={<Target size={16} className="text-green-600" />} />
                                    <InputField label="Partner Sign-Up Target (per month)" name="partner_target" register={register} errors={errors} icon={<Target size={16} className="text-emerald-600" />} />
                                    <InputField label="Leads Target (per month)" name="leads_target" register={register} errors={errors} icon={<Target size={16} className="text-purple-600" />} />
                                    <InputField label="Direct MarketingCalls Target(Per Day)" name="calls_target" register={register} errors={errors} icon={<Target size={16} className="text-orange-600" />} />
                                    <InputField label="LinkedIn Acceptance Target (Per Day)" name="linkedin_target" register={register} errors={errors} icon={<Target size={16} className="text-blue-500" />} />
                                    <InputField label="Direct Visit Target (Per Day)" name="direct_visit_target" register={register} errors={errors} icon={<Target size={16} className="text-rose-600" />} />
                                    <InputField label="Email Target (Per Day)" name="email_target" register={register} errors={errors} icon={<Target size={16} className="text-cyan-600" />} />
                                    <InputField label="LinkedIn Connection Target (Per Day)" name="linkedin_connection_target" register={register} errors={errors} icon={<Target size={16} className="text-indigo-600" />} />
                                    <InputField label="Proposals Target (Per Day)" name="proposals_target" register={register} errors={errors} icon={<Target size={16} className="text-fuchsia-600" />} />
                                    <InputField label="Demo Target (Per Day)" name="demos_target" register={register} errors={errors} icon={<Target size={16} className="text-teal-600" />} />
                                </div>
                            )}
                        </form>
                    )}

                    {!selectedProductId && (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            Please select a Product to view or edit its targets.
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 bg-white"
                    >
                        Close
                    </button>
                    {!!selectedProductId && (
                        <button
                            type="submit"
                            form="targetForm"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            disabled={productMutation.isPending || isLoadingTarget}
                        >
                            {productMutation.isPending ? 'Saving...' : 'Save Targets'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InputField({ label, name, register, errors, icon }: any) {
    return (
        <div className="flex items-center justify-between border border-gray-100 p-3 rounded-lg bg-gray-50/50">
            <label className="text-sm font-semibold text-gray-700 flex items-center min-w-[150px]">
                <span className="mr-2">{icon}</span>
                {label}
            </label>
            <div className="flex flex-col flex-grow max-w-[200px]">
                <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={`Enter ${label.toLowerCase()}`}
                    {...register(name, {
                        min: { value: 0, message: 'Min 0' },
                        pattern: { value: /^\d*$/, message: 'Integer only' }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:border-blue-500 focus:ring focus:ring-blue-200 text-right font-medium"
                />
                {errors[name] && (
                    <span className="text-red-500 text-xs text-right mt-1">{String(errors[name].message)}</span>
                )}
            </div>
        </div>
    );
}
