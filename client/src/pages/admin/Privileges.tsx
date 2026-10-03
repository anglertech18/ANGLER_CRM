import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../services/api';
import {
    ArrowLeft, Save, Shield, ListChecks, Building2,
    UserCircle2, Sparkles, Eye, PlusCircle, Pencil, Trash2, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';

const MODULE_GROUPS: { group: string; modules: string[] }[] = [
    { group: 'Administration', modules: ['Masters', 'UserMaster', 'PrivilegeMaster'] },
    { group: 'Sales', modules: ['Leads', 'Calls', 'SwatMeeting', 'Reports'] },
    { group: 'SEAL', modules: ['SealDashboard', 'WeeklySummary', 'LeadGenSummary', 'POAs', 'EnquiryTracker', 'PartnerSignup'] },
    { group: 'Finance & Reporting', modules: ['CashflowReport', 'DailyReport', 'CashflowForecast', 'BillingForecast'] },
];
const MODULES = MODULE_GROUPS.flatMap(g => g.modules);
const GROUP_OF: Record<string, string> = Object.fromEntries(
    MODULE_GROUPS.flatMap(g => g.modules.map(m => [m, g.group]))
);

const PRESETS = [
    { key: 'CEO', label: 'Full Access', description: 'View, add, edit & delete everywhere', tone: 'text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300' },
    { key: 'SalesManager', label: 'Sales Manager', description: 'View, add & edit; no deletes', tone: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300' },
    { key: 'SalesPerson', label: 'Sales Person', description: 'View & add on operational modules', tone: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
    { key: 'ReadOnly', label: 'Read-Only', description: 'View access only', tone: 'text-slate-600 bg-slate-50 border-slate-200 hover:border-slate-300' },
] as const;

const Toggle = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={clsx(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed",
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

// Plain checkbox grid used in place of a searchable dropdown for short,
// fully-visible option lists (Cashflow Companies, Lead Source Types).
const CheckboxGrid = ({ options, values, onChange }: {
    options: { value: string; label: string }[];
    values: string[];
    onChange: (values: string[]) => void;
}) => {
    const toggle = (value: string) => {
        onChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value]);
    };
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map(opt => {
                const checked = values.includes(opt.value);
                return (
                    <label
                        key={opt.value}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors",
                            checked ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(opt.value)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        {opt.label}
                    </label>
                );
            })}
        </div>
    );
};

export default function Privileges() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { control, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            modules: MODULES.map(m => ({
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
            const merged = MODULES.map(m => {
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

    // Billing Forecast Privileges — Management Access
    const [billingForecastEnabled, setBillingForecastEnabled] = React.useState(false);
    const [billingForecastCompanyIds, setBillingForecastCompanyIds] = React.useState<string[]>([]);

    const { data: existingBillingForecastAccess } = useQuery({
        queryKey: ['billing-forecast-access', userId],
        queryFn: async () => {
            const res = await api.get(`/privileges/${userId}/billing-forecast-access`);
            return res.data as { is_enabled: boolean; company_ids: number[] };
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (existingBillingForecastAccess) {
            setBillingForecastEnabled(!!existingBillingForecastAccess.is_enabled);
            setBillingForecastCompanyIds((existingBillingForecastAccess.company_ids || []).map(String));
        }
    }, [existingBillingForecastAccess]);

    // Lead Gen Summary — Lead Source Type restriction. Empty selection = unrestricted
    // (BDE sees every active Lead Source Type), matching prior/default behavior.
    const [leadSourceTypeRestricted, setLeadSourceTypeRestricted] = React.useState(false);
    const [leadSourceTypeIds, setLeadSourceTypeIds] = React.useState<string[]>([]);

    const { data: leadSourceTypes } = useQuery({
        queryKey: ['lead-source-types-master'],
        queryFn: async () => {
            const res = await api.get('/masters/leadsourcetype');
            return (res.data as any[]).filter((t: any) => t.is_active !== false);
        }
    });

    const { data: existingLeadSourceTypeAccess } = useQuery({
        queryKey: ['lead-source-type-access', userId],
        queryFn: async () => {
            const res = await api.get(`/privileges/${userId}/lead-source-types`);
            return res.data as { lead_source_type_ids: number[] };
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (existingLeadSourceTypeAccess) {
            const ids = existingLeadSourceTypeAccess.lead_source_type_ids || [];
            setLeadSourceTypeRestricted(ids.length > 0);
            setLeadSourceTypeIds(ids.map(String));
        }
    }, [existingLeadSourceTypeAccess]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            await Promise.all([
                api.post(`/privileges/${userId}`, data),
                api.post(`/privileges/${userId}/cashflow-access`, {
                    is_enabled: cashflowEnabled,
                    company_ids: cashflowCompanyIds.map(Number),
                }),
                api.post(`/privileges/${userId}/billing-forecast-access`, {
                    is_enabled: billingForecastEnabled,
                    company_ids: billingForecastCompanyIds.map(Number),
                }),
                api.post(`/privileges/${userId}/lead-source-types`, {
                    lead_source_type_ids: leadSourceTypeRestricted ? leadSourceTypeIds.map(Number) : [],
                }),
            ]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privileges', userId] });
            queryClient.invalidateQueries({ queryKey: ['cashflow-access', userId] });
            queryClient.invalidateQueries({ queryKey: ['billing-forecast-access', userId] });
            queryClient.invalidateQueries({ queryKey: ['lead-source-type-access', userId] });
            alert('Privileges updated successfully');
        },
        onError: (error: any) => {
            alert('Error updating privileges: ' + (error.response?.data?.message || error.message));
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
            const isOpModule = [
                'Leads', 'Calls', 'Reports', 'SwatMeeting',
                'SealDashboard', 'WeeklySummary', 'LeadGenSummary', 'POAs', 'EnquiryTracker', 'PartnerSignup'
            ].includes(p.module_name);

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
        setValue('modules', updated, { shouldDirty: true });
    };

    const toggleColumn = (field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete', forceValue: boolean) => {
        const updated = currentModules.map((p: any) => ({ ...p, [field]: forceValue }));
        setValue('modules', updated, { shouldDirty: true });
    };

    const toggleRow = (index: number, forceValue: boolean) => {
        setValue(`modules.${index}.can_view`, forceValue, { shouldDirty: true });
        setValue(`modules.${index}.can_add`, forceValue, { shouldDirty: true });
        setValue(`modules.${index}.can_edit`, forceValue, { shouldDirty: true });
        setValue(`modules.${index}.can_delete`, forceValue, { shouldDirty: true });
    };

    const allViewChecked = !!currentModules?.length && currentModules.every((p: any) => p.can_view);
    const allAddChecked = !!currentModules?.length && currentModules.every((p: any) => p.can_add);
    const allEditChecked = !!currentModules?.length && currentModules.every((p: any) => p.can_edit);
    const allDeleteChecked = !!currentModules?.length && currentModules.every((p: any) => p.can_delete);

    const grantedCount = currentModules?.filter((p: any) => p.can_view || p.can_add || p.can_edit || p.can_delete).length || 0;

    return (
        <div className="min-h-full bg-slate-50/60">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
                {/* Header + inline user selector */}
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors shadow-sm shrink-0">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-200 shrink-0">
                        <ShieldCheck size={22} className="text-white" />
                    </div>
                    <div className="mr-1">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">Manage Privileges</h1>
                        <p className="text-sm text-slate-500">Configure module access and system-wide rights.</p>
                    </div>
                    <div className="relative ml-auto min-w-[16rem]">
                        <UserCircle2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            value={userId || ''}
                            onChange={(e) => handleUserChange(e.target.value)}
                            className="w-full text-sm font-semibold text-slate-800 rounded-xl border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 pr-8 py-2.5 border outline-none transition-all appearance-none bg-white shadow-sm"
                        >
                            <option value="">Select a BDE…</option>
                            {users?.filter((u: any) => u.status === 'ACTIVE' || u.is_active).map((u: any) => (
                                <option key={u.id} value={u.id}>
                                    {u.first_name} {u.last_name}{u.role ? ` — ${u.role}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {currentUser && (
                    <div className="flex items-center gap-2 mb-5 text-sm text-slate-500 flex-wrap">
                        <span className="font-semibold text-slate-800">{currentUser.first_name} {currentUser.last_name}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">{currentUser.role}</span>
                        {currentUser.company?.name && <span className="text-slate-400">·</span>}
                        {currentUser.company?.name && <span>{currentUser.company.name}</span>}
                        {currentUser.email && <span className="text-slate-400">·</span>}
                        {currentUser.email && <span className="truncate">{currentUser.email}</span>}
                    </div>
                )}

                {!userId && (
                    <div className="bg-white rounded-2xl shadow-sm border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                        <Shield size={28} className="text-slate-300 mb-3" />
                        <h3 className="text-slate-700 font-bold mb-1">No user selected</h3>
                        <p className="text-sm text-slate-400 max-w-sm">Pick a BDE from the dropdown above to review and edit their access.</p>
                    </div>
                )}

                {isLoading && userId && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 flex items-center justify-center text-slate-400 text-sm">
                        Loading privileges...
                    </div>
                )}

                {userId && !isLoading && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Presets Section */}
                        <div className="p-6 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
                            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={14} className="text-blue-500" />
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Presets</h3>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">{grantedCount} / {MODULES.length} modules granted</span>
                                    <button onClick={() => applyPreset('Clear')} className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Clear All</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {PRESETS.map(preset => (
                                    <button
                                        key={preset.key}
                                        onClick={() => applyPreset(preset.key)}
                                        className={clsx("text-left px-4 py-3 rounded-xl border transition-colors shadow-sm", preset.tone)}
                                    >
                                        <div className="text-sm font-bold">{preset.label}</div>
                                        <div className="text-[11px] opacity-80 mt-0.5 leading-snug">{preset.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table Matrix */}
                        <div className="overflow-auto max-h-[70vh]">
                            <table className="min-w-full divide-y divide-slate-100 border-collapse">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 w-[30%] sticky left-0 bg-slate-50 z-30">Module Designation</th>
                                        <th className="px-4 py-4 text-center border-b border-slate-100 bg-slate-50">
                                            <button onClick={() => toggleColumn('can_view', !allViewChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                                <Eye size={14} className={clsx("transition-colors", allViewChecked ? "text-blue-500" : "text-slate-300 group-hover:text-blue-400")} />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">View</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 text-center border-b border-slate-100 bg-slate-50">
                                            <button onClick={() => toggleColumn('can_add', !allAddChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                                <PlusCircle size={14} className={clsx("transition-colors", allAddChecked ? "text-blue-500" : "text-slate-300 group-hover:text-blue-400")} />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Add</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 text-center border-b border-slate-100 bg-slate-50">
                                            <button onClick={() => toggleColumn('can_edit', !allEditChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                                <Pencil size={14} className={clsx("transition-colors", allEditChecked ? "text-blue-500" : "text-slate-300 group-hover:text-blue-400")} />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Edit</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 text-center border-b border-slate-100 bg-slate-50">
                                            <button onClick={() => toggleColumn('can_delete', !allDeleteChecked)} className="flex flex-col items-center justify-center w-full gap-1.5 group cursor-pointer">
                                                <Trash2 size={14} className={clsx("transition-colors", allDeleteChecked ? "text-red-500" : "text-slate-300 group-hover:text-red-400")} />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-red-500 transition-colors">Delete</span>
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 text-center border-b border-slate-100 bg-slate-50 w-[8%]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {fields.map((field, index) => {
                                        const p = currentModules?.[index] || field;
                                        const allRowChecked = p.can_view && p.can_add && p.can_edit && p.can_delete;
                                        const hasAnyAccess = p.can_view || p.can_add || p.can_edit || p.can_delete;
                                        const group = GROUP_OF[field.module_name];
                                        const showGroup = index === 0 || GROUP_OF[fields[index - 1].module_name] !== group;
                                        return (
                                        <React.Fragment key={field.id}>
                                            {showGroup && (
                                                <tr className="bg-slate-50/40">
                                                    <td colSpan={6} className="px-6 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50/40">
                                                        {group}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50/80">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", hasAnyAccess ? "bg-blue-500" : "bg-slate-200")} />
                                                        <span className="font-semibold text-slate-700">{field.module_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <Toggle checked={p.can_view} onChange={() => setValue(`modules.${index}.can_view`, !p.can_view, { shouldDirty: true })} />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <Toggle checked={p.can_add} onChange={() => setValue(`modules.${index}.can_add`, !p.can_add, { shouldDirty: true })} />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <Toggle checked={p.can_edit} onChange={() => setValue(`modules.${index}.can_edit`, !p.can_edit, { shouldDirty: true })} />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <Toggle checked={p.can_delete} onChange={() => setValue(`modules.${index}.can_delete`, !p.can_delete, { shouldDirty: true })} />
                                                </td>
                                                <td className="px-4 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        title={allRowChecked ? "Uncheck Row" : "Select All in Row"}
                                                        onClick={() => toggleRow(index, !allRowChecked)}
                                                        className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                                    >
                                                        <ListChecks size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {userId && !isLoading && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
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
                                <CheckboxGrid
                                    options={(companies || []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                                    values={cashflowCompanyIds}
                                    onChange={setCashflowCompanyIds}
                                />
                            </div>
                        )}
                    </div>
                )}

                {userId && !isLoading && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-indigo-50 rounded-xl">
                                <Building2 className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Billing Forecast Privileges</h3>
                                <p className="text-xs text-slate-500">Company-wide Billing Forecast access, independent of the reporting hierarchy.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Management Access</p>
                                <p className="text-xs text-slate-500">View & update Billing Forecast data for all BDEs within the assigned companies.</p>
                            </div>
                            <Toggle checked={billingForecastEnabled} onChange={() => setBillingForecastEnabled(v => !v)} />
                        </div>

                        {billingForecastEnabled && (
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Management Companies</label>
                                    <button
                                        type="button"
                                        onClick={() => setBillingForecastCompanyIds((companies || []).map((c: any) => String(c.id)))}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                    >
                                        Select All
                                    </button>
                                </div>
                                <CheckboxGrid
                                    options={(companies || []).map((c: any) => ({ value: String(c.id), label: c.name }))}
                                    values={billingForecastCompanyIds}
                                    onChange={setBillingForecastCompanyIds}
                                />
                            </div>
                        )}
                    </div>
                )}

                {userId && !isLoading && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-emerald-50 rounded-xl">
                                <ListChecks className="text-emerald-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Lead Source Types</h3>
                                <p className="text-xs text-slate-500">Restricts Lead Gen Summary to specific Lead Source Types for this BDE (e.g. Direct + Reference only).</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Restrict Lead Source Types</p>
                                <p className="text-xs text-slate-500">Off = unrestricted, sees every active Lead Source Type in Lead Gen Summary.</p>
                            </div>
                            <Toggle checked={leadSourceTypeRestricted} onChange={() => setLeadSourceTypeRestricted(v => !v)} />
                        </div>

                        {leadSourceTypeRestricted && (
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Allowed Lead Source Types</label>
                                    <button
                                        type="button"
                                        onClick={() => setLeadSourceTypeIds((leadSourceTypes || []).map((t: any) => String(t.id)))}
                                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                                    >
                                        Select All
                                    </button>
                                </div>
                                <CheckboxGrid
                                    options={(leadSourceTypes || []).map((t: any) => ({ value: String(t.id), label: t.name }))}
                                    values={leadSourceTypeIds}
                                    onChange={setLeadSourceTypeIds}
                                />
                            </div>
                        )}
                    </div>
                )}

                {userId && !isLoading && (
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSubmit(onSubmit)}
                            disabled={!userId || mutation.isPending}
                            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                        >
                            <Save size={18} />
                            <span>{mutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
