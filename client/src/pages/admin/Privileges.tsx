import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../services/api';
import { ArrowLeft, Save, Shield, Check, ListChecks, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { SearchableMultiSelect } from '../../components/FilterDropdown';
import { PRIVILEGE_MODULES, SALES_OPERATION_MODULES } from './permissionModules';

const Toggle = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={clsx(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            checked ? "bg-blue-600" : "bg-slate-200"
        )}
    >
        <span
            className={clsx(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                checked ? "translate-x-4" : "translate-x-0"
            )}
        />
    </button>
);

export default function Privileges() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { register, control, handleSubmit, reset, setValue, watch, getValues } = useForm({
        defaultValues: {
            modules: PRIVILEGE_MODULES.map(m => ({
                module_name: m,
                can_add: false,
                can_edit: false,
                can_delete: false,
                can_view: false
            }))
        }
    });

    const { fields } = useFieldArray({
        control,
        name: "modules"
    });

    // Form Watcher for responsive UI
    const currentModules = watch('modules');

    // Fetch all users for dropdown
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        }
    });

    // Fetch current user details
    const { data: currentUser } = useQuery({
        queryKey: ['user', userId],
        queryFn: async () => {
            const res = await api.get('/users');
            const allUsers = res.data;
            return allUsers.find((u: any) => u.id === parseInt(userId!));
        },
        enabled: !!userId
    });

    const { data: existingPrivileges, isLoading } = useQuery({
        queryKey: ['privileges', userId],
        queryFn: async () => {
            const res = await api.get(`/privileges/${userId}`);
            return res.data;
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (existingPrivileges) {
            const merged = PRIVILEGE_MODULES.map(m => {
                const existing = existingPrivileges.find((p: any) => p.module_name === m);
                return existing || {
                    module_name: m,
                    can_add: false,
                    can_edit: false,
                    can_delete: false,
                    can_view: false
                };
            });
            reset({ modules: merged });
        }
    }, [existingPrivileges, reset]);

    // Cashflow Privileges — Management Access
    const [cashflowEnabled, setCashflowEnabled] = React.useState(false);
    const [cashflowCompanyIds, setCashflowCompanyIds] = React.useState<string[]>([]);

    const { data: companies } = useQuery({
        queryKey: ['companies-master'],
        queryFn: async () => {
            const res = await api.get('/masters/company');
            return (res.data as any[]).filter((c: any) => c.is_active !== false);
        }
    });

    const { data: existingCashflowAccess } = useQuery({
        queryKey: ['cashflow-access', userId],
        queryFn: async () => {
            const res = await api.get(`/privileges/${userId}/cashflow-access`);
            return res.data as { is_enabled: boolean; company_ids: number[] };
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (existingCashflowAccess) {
            setCashflowEnabled(!!existingCashflowAccess.is_enabled);
            setCashflowCompanyIds((existingCashflowAccess.company_ids || []).map(String));
        }
    }, [existingCashflowAccess]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            await Promise.all([
                api.post(`/privileges/${userId}`, data),
                api.post(`/privileges/${userId}/cashflow-access`, {
                    is_enabled: cashflowEnabled,
                    company_ids: cashflowCompanyIds.map(Number),
                }),
            ]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privileges', userId] });
            queryClient.invalidateQueries({ queryKey: ['cashflow-access', userId] });
            alert('Privileges updated successfully');
        },
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    const handleUserChange = (newUserId: string) => {
        if (newUserId) {
            navigate(`/admin/privileges/${newUserId}`);
        }
    };

    const applyPreset = (role: string) => {
        const updated = currentModules.map((p: any) => {
            const isOpModule = SALES_OPERATION_MODULES.includes(p.module_name);
            
            if (role === 'Clear') {
                return { ...p, can_view: false, can_add: false, can_edit: false, can_delete: false };
            }
            if (role === 'CEO') {
                return { ...p, can_view: true, can_add: true, can_edit: true, can_delete: true };
            }
            if (role === 'ReadOnly') {
                return { ...p, can_view: true, can_add: false, can_edit: false, can_delete: false };
            }
            if (role === 'SalesManager') {
                return { 
                    ...p, 
                    can_view: true, 
                    can_add: true, 
                    can_edit: true, 
                    can_delete: false 
                };
            }
            if (role === 'SalesPerson') {
                return { 
                    ...p, 
                    can_view: isOpModule, 
                    can_add: isOpModule, 
                    can_edit: false, 
                    can_delete: false 
                };
            }
            return p;
        });
        setValue('modules', updated);
    };

    const toggleColumn = (field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete', forceValue: boolean) => {
        const updated = currentModules.map((p: any) => ({ ...p, [field]: forceValue }));
        setValue('modules', updated);
    };

    const toggleRow = (index: number, forceValue: boolean) => {
        setValue(`modules.${index}.can_view`, forceValue);
        setValue(`modules.${index}.can_add`, forceValue);
        setValue(`modules.${index}.can_edit`, forceValue);
        setValue(`modules.${index}.can_delete`, forceValue);
    };

    if (isLoading) return <div className="p-8">Loading...</div>;

    const allViewChecked = currentModules && currentModules.every((p: any) => p.can_view);
    const allAddChecked = currentModules && currentModules.every((p: any) => p.can_add);
    const allEditChecked = currentModules && currentModules.every((p: any) => p.can_edit);
    const allDeleteChecked = currentModules && currentModules.every((p: any) => p.can_delete);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Manage Privileges</h1>
                        <p className="text-sm text-slate-500">Configure systemic access and module rights.</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={!userId || mutation.isPending}
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
                >
                    <Save size={20} />
                    <span>{mutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            {/* User Selector Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select User</label>
                        <select
                            value={userId || ''}
                            onChange={(e) => handleUserChange(e.target.value)}
                            className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-3 border outline-none transition-all"
                        >
                            <option value="">-- Select a User --</option>
                            {users?.filter((u: any) => u.status === 'ACTIVE' || u.is_active).map((user: any) => (
                                <option key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>
                    {currentUser && (
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4">
                            <div className="p-3 bg-white rounded-full shadow-sm">
                                <Shield className="text-blue-600" size={24} />
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                                <p><span className="font-bold text-slate-800">Assigning for:</span> {currentUser.first_name} {currentUser.last_name}</p>
                                <p><span className="font-bold text-slate-800">Current Role:</span> <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">{currentUser.role}</span></p>
                                <p><span className="font-bold text-slate-800">Company:</span> {currentUser.company?.name || 'N/A'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {userId && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Presets Section */}
                    <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => applyPreset('CEO')} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 text-sm font-semibold rounded-lg transition-colors shadow-sm">Admin (Full Access)</button>
                            <button onClick={() => applyPreset('SalesManager')} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 text-sm font-semibold rounded-lg transition-colors shadow-sm">Sales Manager</button>
                            <button onClick={() => applyPreset('SalesPerson')} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 text-sm font-semibold rounded-lg transition-colors shadow-sm">Sales Person</button>
                            <button onClick={() => applyPreset('ReadOnly')} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 text-sm font-semibold rounded-lg transition-colors shadow-sm">Read-Only</button>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button onClick={() => applyPreset('Clear')} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors shadow-sm">Clear All</button>
                        </div>
                    </div>

                    {/* Table Matrix */}
                    <div className="overflow-x-auto p-4">
                        <table className="min-w-full divide-y divide-slate-100 border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b-2 border-slate-100 w-[30%]">Module Designation</th>
                                    <th className="px-4 py-4 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_view', !allViewChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">View</span>
                                            {allViewChecked ? <Check size={16} className="text-blue-500" /> : <ListChecks size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_add', !allAddChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Add</span>
                                            {allAddChecked ? <Check size={16} className="text-blue-500" /> : <ListChecks size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_edit', !allEditChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Edit</span>
                                            {allEditChecked ? <Check size={16} className="text-blue-500" /> : <ListChecks size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_delete', !allDeleteChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-red-500 transition-colors">Delete</span>
                                            {allDeleteChecked ? <Check size={16} className="text-red-500" /> : <ListChecks size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-center border-b-2 border-slate-100 w-[10%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {fields.map((field, index) => {
                                    const p = currentModules?.[index] || field;
                                    const allRowChecked = p.can_view && p.can_add && p.can_edit && p.can_delete;
                                    return (
                                        <tr key={field.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-5 whitespace-nowrap font-bold text-slate-700">
                                                {field.module_name}
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-center">
                                                <Toggle checked={p.can_view} onChange={() => setValue(`modules.${index}.can_view`, !p.can_view)} />
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-center">
                                                <Toggle checked={p.can_add} onChange={() => setValue(`modules.${index}.can_add`, !p.can_add)} />
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-center">
                                                <Toggle checked={p.can_edit} onChange={() => setValue(`modules.${index}.can_edit`, !p.can_edit)} />
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-center">
                                                <Toggle checked={p.can_delete} onChange={() => setValue(`modules.${index}.can_delete`, !p.can_delete)} />
                                            </td>
                                            <td className="px-4 py-5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    title={allRowChecked ? "Uncheck Row" : "Select All in Row"}
                                                    onClick={() => toggleRow(index, !allRowChecked)} 
                                                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                                >
                                                    <ListChecks size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {userId && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <Building2 className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Cashflow Privileges</h3>
                            <p className="text-xs text-slate-500">Company-wide Cashflow Report access, independent of the reporting hierarchy.</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Management Access</p>
                            <p className="text-xs text-slate-500">View Cashflow Report data for all BDEs within the assigned companies.</p>
                        </div>
                        <Toggle checked={cashflowEnabled} onChange={() => setCashflowEnabled(v => !v)} />
                    </div>

                    {cashflowEnabled && (
                        <div className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Management Companies</label>
                                <button
                                    type="button"
                                    onClick={() => setCashflowCompanyIds((companies || []).map((c: any) => String(c.id)))}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    Select All
                                </button>
                            </div>
                            <SearchableMultiSelect
                                options={(companies || []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                                values={cashflowCompanyIds}
                                onChange={setCashflowCompanyIds}
                                placeholder="Select companies…"
                                className="w-full max-w-md"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
