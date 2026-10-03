import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserFormProps {
    initialData?: any;
    onClose: () => void;
}

export default function UserForm({ initialData, onClose }: UserFormProps) {
    const { user: currentUser } = useAuth();
    const isManager = currentUser?.role === 'SalesManager';
    const isAdmin = currentUser?.role === 'CEO';

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: initialData || {
            first_name: '',
            last_name: '',
            email: '',
            role: 'SalesPerson',
            company_id: initialData?.company_id || '',
            sbu_id: initialData?.sbu_id || '',
            reporting_manager_id: initialData?.reporting_manager_id || '',
            department: isManager ? currentUser?.department : (initialData?.department || ''),
            department_id: initialData?.department_id || '',
        },
    });
    const queryClient = useQueryClient();

    // Watch fields
    const selectedCompanyId = watch('company_id');
    const selectedRole = watch('role');

    // Fetch masters for dropdowns
    const { data: allCompanies } = useQuery({ queryKey: ['masters', 'company'], queryFn: () => api.get('/masters/company').then(r => r.data) });
    const { data: allDepartments } = useQuery({ queryKey: ['masters', 'department'], queryFn: () => api.get('/masters/department').then(r => r.data) });

    // Filter companies
    const companies = React.useMemo(() => {
        if (!allCompanies) return [];

        let filtered = allCompanies;

        // 1. Restriction based on inviter (Manager can only see their mapped companies)
        if (isManager) {
            let managedIds = currentUser?.managed_companies?.map((c: any) => c.id) || [];

            // Fallback for legacy users or users who haven't synchronized relations yet
            if (managedIds.length === 0 && currentUser?.company_id) {
                managedIds = [currentUser.company_id];
            }

            filtered = allCompanies.filter((c: any) => managedIds.includes(c.id));
        }

        // 2. Restriction based on invitee role
        if (selectedRole === 'SalesPerson') {
            // Sales Persons cannot have "Both Companies"
            return filtered.filter((c: any) => c.name !== 'Both Companies');
        }

        if (selectedRole === 'SalesManager') {
            // Sales Managers can have "Both Companies"
            return filtered;
        }

        // Default: filter out "Both Companies" for other roles unless specified
        return filtered.filter((c: any) => c.name !== 'Both Companies');
    }, [allCompanies, isManager, currentUser, selectedRole]);

    const { data: allSbus } = useQuery({ queryKey: ['masters', 'sbu'], queryFn: () => api.get('/masters/sbu').then(r => r.data) });
    const { data: allUsers } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

    // List of individual company IDs that "Both Companies" covers
    const bothCompanyIds = React.useMemo(() => {
        return allCompanies?.filter((c: any) => c.name === 'Angler Technologies' || c.name === 'Trinetra').map((c: any) => c.id) || [1, 2];
    }, [allCompanies]);

    const bothCompaniesRecord = React.useMemo(() => {
        return allCompanies?.find((c: any) => c.name === 'Both Companies');
    }, [allCompanies]);

    // Filter SBUs by selected company
    const sbus = React.useMemo(() => {
        if (!selectedCompanyId || !allSbus) return [];
        const compId = parseInt(selectedCompanyId);

        if (bothCompaniesRecord && compId === bothCompaniesRecord.id) {
            // Show SBUs for all companies covered by "Both"
            return allSbus.filter((s: any) => bothCompanyIds.includes(s.company_id) || s.company_id === compId);
        }

        return allSbus.filter((s: any) => s.company_id === compId);
    }, [selectedCompanyId, allSbus, bothCompaniesRecord, bothCompanyIds]);

    // Filter Reporting Managers by:
    // 1. Role must be SalesManager (or CEO)
    // 2. Must be mapped to the selected company OR to "Both Companies"
    const managers = React.useMemo(() => {
        if (!selectedCompanyId || !allUsers) return [];
        const compId = parseInt(selectedCompanyId);

        return allUsers.filter((u: any) => {
            const isManagerRole = u.role === 'SalesManager' || u.role === 'CEO';
            if (!isManagerRole) return false;

            // CEO has access to everything
            if (u.role === 'CEO') return true;

            // Check if manager is mapped to this company OR "Both Companies"
            const managedIds = u.managed_companies?.map((c: any) => c.id) || [];
            const isMappedToThis = managedIds.includes(compId);
            const isMappedToBoth = bothCompaniesRecord ? managedIds.includes(bothCompaniesRecord.id) : false;

            // If a manager is mapped to "Both", they are valid for individual companies
            if (bothCompanyIds.includes(compId) && isMappedToBoth) return true;

            // If selecting "Both", show managers mapped to "Both"
            return isMappedToThis;
        });
    }, [selectedCompanyId, allUsers, bothCompaniesRecord, bothCompanyIds]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const payload: any = {
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                role: data.role,
                department: data.department,
                department_id: data.department_id ? parseInt(data.department_id) : null
            };

            if (data.company_id) {
                payload.company_id = parseInt(data.company_id);
                // If it's a manager, also sync managed_companies relationship
                if (data.role === 'SalesManager') {
                    payload.managed_company_ids = [parseInt(data.company_id)];
                }
            }
            if (data.sbu_id) payload.sbu_id = parseInt(data.sbu_id);
            if (data.reporting_manager_id) payload.reporting_manager_id = parseInt(data.reporting_manager_id);



            if (initialData) {
                await api.put(`/users/${initialData.id}`, payload);
            } else {
                await api.post('/users', payload);
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            onClose();
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to save user');
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[600px] p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {initialData ? 'Edit User' : 'Add User'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <input {...register('first_name', { required: 'Required' })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                            {errors.first_name && <span className="text-red-500 text-xs">Required</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input {...register('last_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input {...register('email', {
                            required: 'Required',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "invalid email address"
                            }
                        })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        {errors.email && <span className="text-red-500 text-xs">{errors.email.message as string}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <select {...register('role', { required: 'Required' })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                                {isAdmin && (
                                    <>
                                        <option value="CEO">CEO</option>
                                        <option value="SalesManager">Sales Manager</option>
                                    </>
                                )}
                                <option value="SalesPerson">Sales Person</option>
                            </select>
                        </div>
                        {/* <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <select
                                {...register('department_id', {
                                    required: 'Required',
                                    onChange: (e) => {
                                        const dept = allDepartments?.find((d: any) => d.id === parseInt(e.target.value));
                                        if (dept) setValue('department', dept.name);
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                disabled={isManager}
                            >
                                <option value="">Select Department</option>
                                {allDepartments?.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            {errors.department_id && <span className="text-red-500 text-xs">Required</span>}
                            <input type="hidden" {...register('department')} />
                        </div> */}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Company {selectedRole === 'SalesPerson' && <span className="text-red-500">*</span>}
                            </label>
                            <select
                                {...register('company_id', { required: selectedRole === 'SalesPerson' ? 'Company is required for Sales Person' : false })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            >
                                <option value="">Select Company</option>
                                {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {errors.company_id && <span className="text-red-500 text-xs">{errors.company_id.message as string}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SBU</label>
                            <select {...register('sbu_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" disabled={!selectedCompanyId}>
                                <option value="">Select SBU</option>
                                {sbus?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {!selectedCompanyId && <p className="text-xs text-gray-500 mt-1">Select a company first</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Reporting Manager {selectedRole === 'SalesPerson' && <span className="text-red-500">*</span>}
                        </label>
                        <select {...register('reporting_manager_id', { required: selectedRole === 'SalesPerson' ? 'Manager is required' : false })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" disabled={!selectedCompanyId}>
                            <option value="">Select Manager</option>
                            {managers?.map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                        </select>
                        {!selectedCompanyId && <p className="text-xs text-gray-500 mt-1">Select a company first</p>}
                        {errors.reporting_manager_id && <span className="text-red-500 text-xs">{errors.reporting_manager_id.message as string}</span>}
                    </div>



                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

