import React, { useState, useEffect, useMemo } from 'react';
import { Target, Calendar, User, LayoutGrid, Activity, TrendingUp, BarChart3, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';

export default function KraTracker() {
    const { user: currentUser } = useAuth();
    const isAdminOrManager = currentUser?.role === 'CEO' || currentUser?.role === 'SalesManager';

    const { filters: kf, setFilters: setKf } = usePersistentFilters('kra', {
        selectedMonth: dayjs().format('YYYY-MM'),
        selectedUserId: '',
        selectedMappedKey: '',
    });
    const selectedMonth    = kf.selectedMonth;
    const setSelectedMonth = (v: string) => setKf({ selectedMonth: v });
    const selectedUserId   = kf.selectedUserId;
    const setSelectedUserId = (v: string) => setKf({ selectedUserId: v });
    const selectedMappedKey = kf.selectedMappedKey;
    const setSelectedMappedKey = (v: string) => setKf({ selectedMappedKey: v });

    useEffect(() => {
        if (currentUser?.id && !selectedUserId) {
            setSelectedUserId(currentUser.id.toString());
        }
    }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const [users, setUsers] = useState<any[]>([]);
    const [mappedItems, setMappedItems] = useState<any[]>([]);
    const [trackerData, setTrackerData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Initial data fetch — mapped items only, no all-products list
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                if (isAdminOrManager) {
                    const userRes = await api.get('/users');
                    setUsers(userRes.data);
                }
                const [mappedRes, mappingsRes] = await Promise.all([
                    api.get('/seal/poas/mapped-products'),
                    api.get('/swat-performance/my-mappings'),
                ]);
                const items: any[] = mappedRes.data;
                const { product_ids } = mappingsRes.data;
                // Filter to only the logged-in user's own assigned items for default selection
                const myItems = items.filter((item: any) => product_ids.includes(item.id));
                setMappedItems(items);
                // Auto-select first of the user's own items; fall back to global first
                const defaultItem = myItems.length > 0 ? myItems[0] : items[0];
                if (defaultItem && !kf.selectedMappedKey) {
                    setSelectedMappedKey(String(defaultItem.id));
                }
            } catch (err) {
                console.error('Error fetching filter data:', err);
            }
        };
        fetchFilters();
    }, [isAdminOrManager]);

    // Derive API params from selectedMappedKey (always product)
    const { apiType, apiProductId } = useMemo(() => {
        if (!selectedMappedKey) return { apiType: '', apiProductId: '' };
        return { apiType: 'Product', apiProductId: selectedMappedKey };
    }, [selectedMappedKey]);

    // Fetch KRA data
    useEffect(() => {
        const fetchKraData = async () => {
            if (!selectedMonth || !selectedUserId || !apiType) return;

            setLoading(true);
            try {
                const params = new URLSearchParams({
                    month: selectedMonth,
                    user_id: selectedUserId,
                    type: apiType,
                });
                if (apiProductId) params.append('product_id', apiProductId);

                const response = await api.get(`/kra-tracker?${params.toString()}`);
                setTrackerData(response.data);
            } catch (err) {
                console.error('Error fetching KRA data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchKraData();
    }, [selectedMonth, selectedUserId, apiType, apiProductId]);


    // Generate days of the month
    const daysInMonth = useMemo(() => {
        const date = dayjs(selectedMonth);
        const count = date.daysInMonth();
        return Array.from({ length: count }, (_, i) => i + 1);
    }, [selectedMonth]);

    // Define Sections and Metrics
    const sections = [
        {
            title: "Core Measures",
            icon: LayoutGrid,
            color: "bg-[#0070c0]", // Specific blue from image
            rows: [
                { id: "revenue_target", label: "Revenue – Target", isTarget: true },
                { id: "revenue_achieved", label: "Revenue – Achieved", isAchieved: true },
                { id: "sales_device_target", label: "Sales Device – Target", isTarget: true },
                { id: "sales_device_achieved", label: "Sales Device – Achieved", isAchieved: true },
                { id: "sales_lead_target", label: "Sales Lead – Target", isTarget: true },
                { id: "sales_lead_achieved", label: "Sales Lead – Achieved", isAchieved: true },
                { id: "leads_target", label: "Leads – Target", isTarget: true },
                { id: "leads_achieved", label: "Leads – Achieved", isAchieved: true },
            ]
        },
        // Quarterly Sections split into individual blocks as per image
        ...["Q4", "Q3", "Q2", "Q1"].map(q => ({
            title: `${q} Devices`, // Hidden title mostly, the blue bar is the divider
            icon: BarChart3,
            color: "bg-[#0070c0]",
            isQuarter: true,
            rows: [
                { id: `${q.toLowerCase()}_devices_target`, label: `${q} Devices - Target`, isTarget: true, highlightTarget: true },
                { id: `${q.toLowerCase()}_devices_actuals`, label: `${q} Devices - Actuals`, isAchieved: true },
                { id: `${q.toLowerCase()}_leads_target`, label: `${q} Leads Target`, isTarget: true },
                { id: `${q.toLowerCase()}_prospect_count`, label: `${q} Prospect Count`, isAchieved: true },
            ]
        })),
        {
            title: "Activity Tracking",
            icon: Activity,
            color: "bg-[#0070c0]",
            rows: [
                { id: "eff_calls_target", label: "Effective Calls Target per Day", isTarget: true, highlightTarget: true },
                { id: "eff_calls_achieved", label: "Calls Achieved", isAchieved: true },
                { id: "q1_direct_lead", label: "Q1 Direct Lead Achieved", isAchieved: true },
                { id: "industry_campaigns", label: "Industry Campaigns", isAchieved: true },
                { id: "email_target", label: "Direct Marketing Emails Target", isTarget: true },
                { id: "email_sent", label: "Direct Marketing Emails Sent", isAchieved: true },
                { id: "linkedin_target", label: "LinkedIn Connections Target per Day", isTarget: true },
                { id: "linkedin_req", label: "LinkedIn Request Given", isAchieved: true },
                { id: "linkedin_achieved", label: "LinkedIn Connections Achieved", isAchieved: true },
                { id: "demos_given", label: "Number of Demos Given", isAchieved: true },
                { id: "demo_duration", label: "Duration of Demo", isAchieved: true },
                { id: "proposals", label: "Number of Proposals Submitted", isAchieved: true },
                { id: "visit_target", label: "Direct Visit Target per Day", isTarget: true },
                { id: "visit_achieved", label: "Direct Visit Achieved", isAchieved: true },
                { id: "visit_duration", label: "Duration", isAchieved: true },
            ]
        }
    ];

    // Handlers are inline in the select component now
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">KRA Performance Tracker</h1>
                        <p className="text-gray-500 text-sm font-medium">Daily performance tracking and KRA management</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    

                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1 text-left">User</label>
                        <div className="relative">
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                disabled={!isAdminOrManager}
                                className={clsx(
                                    "pl-10 pr-8 py-2 border-gray-200 rounded-xl text-sm font-bold outline-none transition-all appearance-none cursor-pointer w-full md:w-auto",
                                    !isAdminOrManager ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50 text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                                )}
                            >
                                {!isAdminOrManager ? (
                                    <option value={currentUser?.id}>{currentUser?.first_name} {currentUser?.last_name}</option>
                                ) : (
                                    <>
                                        <option value="">Select User</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                                        ))}
                                    </>
                                )}
                            </select>
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1 text-left">Product</label>
                        <div className="relative">
                            <select
                                value={selectedMappedKey}
                                onChange={e => setSelectedMappedKey(e.target.value)}
                                className="pl-4 pr-10 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none cursor-pointer min-w-[180px]"
                            >
                                <option value="">— Select —</option>
                                {mappedItems.map((m: any) => (
                                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                                ))}
                            </select>
                            <Target className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1 text-left">Period</label>
                        <div className="relative">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            // Basic CSV export logic would go here
                            alert('Export logic would be implemented here using XLSX');
                        }}
                        className="mt-4 lg:mt-0 px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
                    >
                        <FileText size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
                <div className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full border-collapse table-fixed min-w-[1500px]">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-gray-50 border-b border-gray-200 shadow-sm">
                                <th className="sticky left-0 z-30 bg-gray-50 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider w-[280px] border-r border-gray-200">
                                    Metrics
                                </th>
                                <th className="sticky left-[280px] z-30 bg-gray-50 px-4 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider w-[120px] border-r border-gray-200">
                                    Target
                                </th>
                                {daysInMonth.map(day => (
                                    <th key={day} className="px-2 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-tighter w-[45px] border-r border-gray-100 italic">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sections.map((section, sIdx) => (
                                <React.Fragment key={sIdx}>
                                    {/* Section Header - Styled as a blue bar spanning the table */}
                                    <tr className={clsx("z-10 h-8", section.color)}>
                                        <td colSpan={2 + daysInMonth.length} className="sticky left-0 z-10 px-6 py-1 font-black text-white uppercase tracking-widest text-[11px]">
                                            <div className="flex items-center gap-2">
                                                <section.icon size={14} />
                                                {section.title}
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {section.rows.map((row, rIdx) => (
                                        <TableRow 
                                            key={row.id} 
                                            id={row.id}
                                            label={row.label} 
                                            isTarget={row.isTarget} 
                                            isAchieved={row.isAchieved} 
                                            highlightTarget={row.highlightTarget}
                                            days={daysInMonth} 
                                            kraData={trackerData?.dailyData}
                                            monthlyTargets={trackerData?.monthly_targets}
                                            multipliers={trackerData?.multipliers}
                                            leadsDailyData={trackerData?.leadsDailyData}
                                            salesDeviceDailyData={trackerData?.salesDeviceDailyData}
                                            emailDailyData={trackerData?.emailDailyData}
                                            linkedinReqDailyData={trackerData?.linkedinReqDailyData}
                                            leadsCreatedDailyData={trackerData?.leadsCreatedDailyData}
                                            q1LeadsDailyData={trackerData?.q1LeadsDailyData}
                                            q2LeadsDailyData={trackerData?.q2LeadsDailyData}
                                            q3LeadsDailyData={trackerData?.q3LeadsDailyData}
                                            q4LeadsDailyData={trackerData?.q4LeadsDailyData}
                                            q1DevicesDailyData={trackerData?.q1DevicesDailyData}
                                            q2DevicesDailyData={trackerData?.q2DevicesDailyData}
                                            q3DevicesDailyData={trackerData?.q3DevicesDailyData}
                                            q4DevicesDailyData={trackerData?.q4DevicesDailyData}
                                            callsAchievedDailyData={trackerData?.callsAchievedDailyData}
                                        />
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

interface TableRowProps {
    id: string;
    label: string;
    subLabel?: string;
    isTarget?: boolean;
    isAchieved?: boolean;
    highlightTarget?: boolean;
    days: number[];
    isFirstSub?: boolean;
    isLastSub?: boolean;
    kraData?: any;
    monthlyTargets?: any;
    multipliers?: any;
    leadsDailyData?: Record<number, number>;
    salesDeviceDailyData?: Record<number, number>;
    emailDailyData?: Record<number, number>;
    linkedinReqDailyData?: Record<number, number>;
    leadsCreatedDailyData?: Record<number, number>;
    q1LeadsDailyData?: Record<number, number>;
    q2LeadsDailyData?: Record<number, number>;
    q3LeadsDailyData?: Record<number, number>;
    q4LeadsDailyData?: Record<number, number>;
    q1DevicesDailyData?: Record<number, number>;
    q2DevicesDailyData?: Record<number, number>;
    q3DevicesDailyData?: Record<number, number>;
    q4DevicesDailyData?: Record<number, number>;
    callsAchievedDailyData?: Record<number, number>;
}

function TableRow({ id, label, subLabel, isTarget, isAchieved, highlightTarget, days, isFirstSub, isLastSub, kraData, monthlyTargets, multipliers, leadsDailyData, salesDeviceDailyData, emailDailyData, linkedinReqDailyData, leadsCreatedDailyData, q1LeadsDailyData, q2LeadsDailyData, q3LeadsDailyData, q4LeadsDailyData, q1DevicesDailyData, q2DevicesDailyData, q3DevicesDailyData, q4DevicesDailyData, callsAchievedDailyData }: TableRowProps) {
    const getValue = (day: number) => {
        // Special case: rows from external daily data sources
        const externalSources: Record<string, Record<number, number> | undefined> = {
            'sales_device_achieved': salesDeviceDailyData,
            'leads_achieved': leadsDailyData,
            'email_sent': emailDailyData,
            'linkedin_req': linkedinReqDailyData,
            'q1_direct_lead': leadsCreatedDailyData,
            'q1_prospect_count': q1LeadsDailyData,
            'q2_prospect_count': q2LeadsDailyData,
            'q3_prospect_count': q3LeadsDailyData,
            'q4_prospect_count': q4LeadsDailyData,
            'q1_devices_actuals': q1DevicesDailyData,
            'q2_devices_actuals': q2DevicesDailyData,
            'q3_devices_actuals': q3DevicesDailyData,
            'q4_devices_actuals': q4DevicesDailyData,
            'eff_calls_achieved': callsAchievedDailyData,
        };
        if (id in externalSources) {
            const src = externalSources[id];
            return src ? (src[day] || 0) : 0;
        }

        // For Effective Calls Target per Day: show the per-day target in every day cell
        if (id === 'eff_calls_target') {
            return monthlyTargets ? (monthlyTargets['calls_target'] || 0) : 0;
        }

        if (!kraData || !kraData[day]) return 0;
        const dayData = kraData[day];
        
        // Mapping UI row IDs to SwatPerformance fields
        const mapping: Record<string, string> = {
            'revenue_achieved': 'revenue_collected_achieved',
            'sales_lead_achieved': 'sales_order_won_achieved',
            'leads_achieved': 'q1_lead_gen_achieved',
            'eff_calls_achieved': 'calls_achieved',
            'linkedin_achieved': 'linkedin_achieved',
            'demos_given': 'demos_achieved',
            'proposals': 'proposals_achieved',
            'visit_achieved': 'direct_visit_achieved',
            'q1_to_q2': 'q1_to_q2',
            'q2_to_q3': 'q2_to_q3',
            'q3_to_q4': 'q3_to_q4',
            'q4_to_order': 'q4_to_order',
            'q4_to_q3': 'q4_to_q3',
            'q3_to_q2': 'q3_to_q2',
            'q2_to_q1': 'q2_to_q1',
            'any_to_nurturing': 'any_to_nurturing'
        };

        const fieldName = mapping[id];
        return fieldName ? (dayData[fieldName] || 0) : 0;
    };

    const getTargetValue = () => {
        if (!monthlyTargets) return 0;

        // Custom division logic for Quarterly Device/Lead Targets
        const qTargetMatch = id.match(/^(q[1-4])_(devices|leads)_target$/);
        if (qTargetMatch) {
            const quarter = qTargetMatch[1]; // q4, q3, q2, q1
            const type = qTargetMatch[2]; // devices, leads
            
            const baseLeadsTarget = monthlyTargets['leads_target'] || 0;
            const multiplierKey = type === 'devices' ? `device_${quarter}` : `lead_${quarter}`;
            const multiplierValue = multipliers ? (multipliers[multiplierKey] ?? 0) : 0;
            
            return Math.round(baseLeadsTarget * multiplierValue);
        }

        // Direct mapping for Activity targets, Revenue, and Core Measures
        const directMapping: Record<string, string> = {
            'revenue_target': 'revenue_target',
            'sales_device_target': 'device_target', // Monthly target directly
            'sales_lead_target': 'sales_target',  // Monthly target directly
            'leads_target': 'leads_target',       // Lead target directly
            'eff_calls_target': 'calls_target',
            'email_target': 'calls_target',       // Emails target = Effective Calls target per day
            'linkedin_target': 'linkedin_target',
            'visit_target': 'direct_visit_target'
        };

        const fieldName = directMapping[id];
        if (!fieldName) return 0;
        const rawValue = monthlyTargets[fieldName] || 0;
        // For Effective Calls Target per Day: Target column = daily target × total days in month
        if (id === 'eff_calls_target') {
            return rawValue * days.length;
        }
        return rawValue;
    };

    const getAchievedTotal = () => {
        // Rows sourced from external daily data: sum directly from their data
        const externalSums: Record<string, Record<number, number> | undefined> = {
            'sales_device_achieved': salesDeviceDailyData,
            'leads_achieved': leadsDailyData,
            'email_sent': emailDailyData,
            'linkedin_req': linkedinReqDailyData,
            'q1_direct_lead': leadsCreatedDailyData,
            'q1_prospect_count': q1LeadsDailyData,
            'q2_prospect_count': q2LeadsDailyData,
            'q3_prospect_count': q3LeadsDailyData,
            'q4_prospect_count': q4LeadsDailyData,
            'q1_devices_actuals': q1DevicesDailyData,
            'q2_devices_actuals': q2DevicesDailyData,
            'q3_devices_actuals': q3DevicesDailyData,
            'q4_devices_actuals': q4DevicesDailyData,
            'eff_calls_achieved': callsAchievedDailyData,
        };
        if (id in externalSums) {
            const src = externalSums[id];
            if (!src) return 0;
            return Object.values(src).reduce((sum, count) => sum + count, 0);
        }
        if (!kraData) return 0;
        let total = 0;
        for (let i = 1; i <= 31; i++) {
            total += getValue(i);
        }
        return total;
    };

    return (
        <tr className={clsx(
            "group hover:bg-blue-50/30 transition-colors border-b border-gray-100",
            isLastSub && "border-b-2 border-gray-100"
        )}>
            <td className={clsx(
                "sticky left-0 z-10 px-6 py-1 bg-white group-hover:bg-blue-50/30 border-r border-gray-100 transition-colors",
                subLabel ? "text-[10px] font-bold" : "text-xs font-medium text-gray-700"
            )}>
                {label}
            </td>
            <td className={clsx(
                "sticky left-[280px] z-10 px-3 py-1 bg-white group-hover:bg-blue-50/30 border-r border-gray-100",
                highlightTarget && "bg-yellow-100 group-hover:bg-yellow-200/50"
            )}>
                {isTarget ? (
                    <div className={clsx(
                        "w-full text-center py-0.5 border border-gray-200 rounded text-xs font-black",
                        highlightTarget ? "bg-transparent border-yellow-300 text-gray-900" : "bg-gray-50 text-gray-700"
                    )}>
                        {getTargetValue()}
                    </div>
                ) : isAchieved ? (
                    <div className="w-full text-center py-0.5 border border-green-200 rounded text-xs font-bold bg-green-50 text-green-700">
                        {getAchievedTotal()}
                    </div>
                ) : (
                    <div className="text-center text-xs font-bold text-gray-300 italic">-</div>
                )}
            </td>
            {days.map(day => (
                <td key={day} className="px-0 py-0 border-r border-gray-100 h-8">
                    <div className={clsx(
                        "w-full h-full flex items-center justify-center text-[11px] font-bold",
                        isTarget ? "text-red-500 bg-red-50/10" : "text-gray-700"
                    )}>
                        {getValue(day) || ''}
                    </div>
                </td>
            ))}
        </tr>
    );
}

