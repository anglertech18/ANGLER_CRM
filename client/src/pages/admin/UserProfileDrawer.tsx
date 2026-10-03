import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Shield, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserProfileDrawerProps {
    user: any;
    onClose: () => void;
}

export default function UserProfileDrawer({ user, onClose }: UserProfileDrawerProps) {
    const queryClient = useQueryClient();

    // Fetch masters for dropdowns
    const { data: companies } = useQuery({ queryKey: ['masters', 'company'], queryFn: () => api.get('/masters/company').then(r => r.data) });
    const { data: allSbus } = useQuery({ queryKey: ['masters', 'sbu'], queryFn: () => api.get('/masters/sbu').then(r => r.data) });
    const { data: allManagers } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            role: user.role || 'SalesPerson',
            company_id: user.company_id || '',
            sbu_id: user.sbu_id || '',
            reporting_manager_id: user.reporting_manager_id || '',
            status: user.status || 'ACTIVE',
        }
    });

    const selectedCompanyId = watch('company_id');

    // Filter SBUs and Managers
    const sbus = React.useMemo(() => {
        if (!selectedCompanyId || !allSbus) return [];
        return allSbus.filter((s: any) => s.company_id === parseInt(selectedCompanyId));
    }, [selectedCompanyId, allSbus]);

    const managers = React.useMemo(() => {
        if (!selectedCompanyId || !allManagers) return [];
        return allManagers.filter((m: any) => m.company_id === parseInt(selectedCompanyId));
    }, [selectedCompanyId, allManagers]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            // Update Profile (Targets, Role, Org)
            const profilePayload: any = {
                role: data.role,
                status: data.status,
            };

            if (data.company_id) profilePayload.company_id = parseInt(data.company_id);
            if (data.sbu_id) profilePayload.sbu_id = parseInt(data.sbu_id);
            if (data.reporting_manager_id) profilePayload.reporting_manager_id = parseInt(data.reporting_manager_id);

            await api.patch(`/users/${user.id}/profile`, profilePayload);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            alert('Profile updated successfully');
            onClose();
        },
        onError: (error: any) => {
            alert('Failed to update profile: ' + (error.response?.data?.message || error.message));
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto transform transition-transform duration-300 ease-in-out">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">User Profile</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{user.first_name} {user.last_name}</h3>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {user.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Joined: {user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'}</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Status & Role */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select {...register('status')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select {...register('role')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                                    <option value="SalesPerson">Sales Person</option>
                                    <option value="SalesManager">Sales Manager</option>
                                    <option value="CEO">CEO</option>
                                </select>
                            </div>
                        </div>

                        {/* Org Structure */}
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="font-medium text-gray-900">Organization</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company</label>
                                <select {...register('company_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                                    <option value="">Select Company</option>
                                    {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">SBU</label>
                                    <select {...register('sbu_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" disabled={!selectedCompanyId}>
                                        <option value="">Select SBU</option>
                                        {sbus?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Manager</label>
                                    <select {...register('reporting_manager_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" disabled={!selectedCompanyId}>
                                        <option value="">Select Manager</option>
                                        {managers?.map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>



                        {/* Privileges Link */}
                        <div className="border-t pt-4">
                            <Link
                                to={`/admin/privileges/${user.id}`}
                                className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                            >
                                <div className="flex items-center space-x-2">
                                    <Shield size={18} />
                                    <span className="font-medium">Manage Detailed Privileges</span>
                                </div>
                                <ExternalLink size={16} />
                            </Link>
                        </div>

                        <div className="pt-4 border-t flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
