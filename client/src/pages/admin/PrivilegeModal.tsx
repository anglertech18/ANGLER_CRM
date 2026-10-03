import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Save, Shield, Check, ListChecks, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { SearchableMultiSelect } from '../../components/FilterDropdown';
import { PRIVILEGE_MODULES, SALES_OPERATION_MODULES } from './permissionModules';

interface PrivilegeModalProps {
    userId: number;
    userName: string;
    onClose: () => void;
}

interface Privilege {
    module_name: string;
    can_view: boolean;
    can_add: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

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

export default function PrivilegeModal({ userId, userName, onClose }: PrivilegeModalProps) {
    const queryClient = useQueryClient();
    const [localPrivileges, setLocalPrivileges] = useState<Privilege[]>([]);

    const { data: serverPrivileges, isLoading } = useQuery({
        queryKey: ['privileges', userId],
        queryFn: () => api.get(`/privileges/${userId}`).then(r => r.data)
    });

    useEffect(() => {
        if (serverPrivileges) {
            // Merge server privileges with the full list of modules
            const merged = PRIVILEGE_MODULES.map(moduleName => {
                const existing = serverPrivileges.find((p: any) => p.module_name === moduleName);
                return existing || {
                    module_name: moduleName,
                    can_view: false,
                    can_add: false,
                    can_edit: false,
                    can_delete: false
                };
            });
            setLocalPrivileges(merged);
        }
    }, [serverPrivileges]);

    // Cashflow Privileges — Management Access
    const [cashflowEnabled, setCashflowEnabled] = useState(false);
    const [cashflowCompanyIds, setCashflowCompanyIds] = useState<string[]>([]);

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
        }
    });

    useEffect(() => {
        if (existingCashflowAccess) {
            setCashflowEnabled(!!existingCashflowAccess.is_enabled);
            setCashflowCompanyIds((existingCashflowAccess.company_ids || []).map(String));
        }
    }, [existingCashflowAccess]);

    const mutation = useMutation({
        mutationFn: async (modules: Privilege[]) => {
            await Promise.all([
                api.post(`/privileges/${userId}`, { modules }),
                api.post(`/privileges/${userId}/cashflow-access`, {
                    is_enabled: cashflowEnabled,
                    company_ids: cashflowCompanyIds.map(Number),
                }),
            ]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['cashflow-access', userId] });
            alert('Privileges updated successfully');
            onClose();
        },
        onError: (error: any) => {
            alert('Error updating privileges: ' + (error.response?.data?.message || error.message));
        }
    });

    const handleCheckboxChange = (moduleName: string, field: keyof Omit<Privilege, 'module_name'>) => {
        setLocalPrivileges(prev => prev.map(p =>
            p.module_name === moduleName ? { ...p, [field]: !p[field] } : p
        ));
    };

    const toggleColumn = (field: keyof Omit<Privilege, 'module_name'>, forceValue: boolean) => {
        setLocalPrivileges(prev => prev.map(p => ({ ...p, [field]: forceValue })));
    };

    const toggleRow = (moduleName: string, forceValue: boolean) => {
        setLocalPrivileges(prev => prev.map(p =>
            p.module_name === moduleName
                ? { ...p, can_view: forceValue, can_add: forceValue, can_edit: forceValue, can_delete: forceValue }
                : p
        ));
    };

    const applyPreset = (role: string) => {
        setLocalPrivileges(prev => prev.map(p => {
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
        }));
    };

    const handleSave = () => {
        mutation.mutate(localPrivileges);
    };

    if (isLoading) return null;

    const allViewChecked = localPrivileges.every(p => p.can_view);
    const allAddChecked = localPrivileges.every(p => p.can_add);
    const allEditChecked = localPrivileges.every(p => p.can_edit);
    const allDeleteChecked = localPrivileges.every(p => p.can_delete);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Control & Privileges</h2>
                            <p className="text-sm text-slate-500">Configuring permissions for <span className="font-semibold text-slate-700">{userName}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Presets Section */}
                    <div className="p-6 bg-white border-b border-slate-100">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Presets</h3>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => applyPreset('CEO')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Admin (Full Access)</button>
                            <button onClick={() => applyPreset('SalesManager')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Sales Manager</button>
                            <button onClick={() => applyPreset('SalesPerson')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Sales Person</button>
                            <button onClick={() => applyPreset('ReadOnly')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Read-Only</button>
                            <div className="flex-1"></div>
                            <button onClick={() => applyPreset('Clear')} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors">Clear All</button>
                        </div>
                    </div>

                    {/* Matrix */}
                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b-2 border-slate-100 w-[40%]">Modules</th>
                                    <th className="px-4 py-3 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_view', !allViewChecked)} className="flex flex-col items-center justify-center w-full gap-1 group">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">View</span>
                                            {allViewChecked ? <Check size={14} className="text-blue-500" /> : <ListChecks size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_add', !allAddChecked)} className="flex flex-col items-center justify-center w-full gap-1 group">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Add</span>
                                            {allAddChecked ? <Check size={14} className="text-blue-500" /> : <ListChecks size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_edit', !allEditChecked)} className="flex flex-col items-center justify-center w-full gap-1 group">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Edit</span>
                                            {allEditChecked ? <Check size={14} className="text-blue-500" /> : <ListChecks size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-center border-b-2 border-slate-100">
                                        <button onClick={() => toggleColumn('can_delete', !allDeleteChecked)} className="flex flex-col items-center justify-center w-full gap-1 group">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-red-500 transition-colors">Delete</span>
                                            {allDeleteChecked ? <Check size={14} className="text-red-500" /> : <ListChecks size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-center border-b-2 border-slate-100 w-[10%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {localPrivileges.map((p) => {
                                    const allRowChecked = p.can_view && p.can_add && p.can_edit && p.can_delete;
                                    return (
                                        <tr key={p.module_name} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-4 py-4 font-semibold text-slate-700">
                                                {p.module_name}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Toggle checked={p.can_view} onChange={() => handleCheckboxChange(p.module_name, 'can_view')} />
                                                <div className="text-[10px] text-slate-400 mt-1">{p.can_view ? 'Allowed' : 'Denied'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Toggle checked={p.can_add} onChange={() => handleCheckboxChange(p.module_name, 'can_add')} />
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Toggle checked={p.can_edit} onChange={() => handleCheckboxChange(p.module_name, 'can_edit')} />
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Toggle checked={p.can_delete} onChange={() => handleCheckboxChange(p.module_name, 'can_delete')} />
                                            </td>
                                            <td className="px-4 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    title={allRowChecked ? "Uncheck Row" : "Select All in Row"}
                                                    onClick={() => toggleRow(p.module_name, !allRowChecked)}
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

                    {/* Cashflow Privileges */}
                    <div className="p-6 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Building2 size={20} />
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
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium"><span className="text-amber-500 font-bold">Note:</span> Giving Delete privileges poses risk to data integrity.</p>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={mutation.isPending}
                            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                            <Save size={18} />
                            <span>{mutation.isPending ? 'Saving...' : 'Apply Privileges'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
