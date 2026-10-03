import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Save, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import MultiSelect from '../../components/MultiSelect';
import dayjs from 'dayjs';
import clsx from 'clsx';
import DateOverlay from '../../components/DateOverlay';

interface WeeklyReportFormProps {
    isOpen: boolean;
    onClose: () => void;
    report?: any;
    mode: 'add' | 'edit' | 'view';
    productId?: string;
}

export default function WeeklyReportForm({ isOpen, onClose, report, mode, productId }: WeeklyReportFormProps) {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('user_id'); // ID of the user we are filing for (e.g. subordinate)

    const isViewOnly = mode === 'view';
    const isEditMode = mode === 'edit';

    const [formData, setFormData] = useState<any>({
        date: dayjs().format('YYYY-MM-DD'),
        prev_q4_to_order: '',
        prev_q3_to_q4: '',
        prev_q2_to_q3: '',
        prev_q1_to_q2: '',
        prev_notes: '',
        curr_q4_to_order: '',
        curr_q3_to_q4: '',
        curr_q2_to_q3: '',
        curr_q1_to_q2: '',
        curr_notes: ''
    });

    // Store display names for previous week to show in UI
    const [prevNames, setPrevNames] = useState<any>({
        q4_to_order: '',
        q3_to_q4: '',
        q2_to_q3: '',
        q1_to_q2: '',
        notes: ''
    });

    const [errors, setErrors] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // Fetch leads when the modal is open — always fresh so server-side fixes apply immediately
    const { data: leads = [] } = useQuery({
        queryKey: ['weekly-report-leads', targetUserId, productId],
        queryFn: async () => {
            const params: any = {};
            if (targetUserId) params.user_id = targetUserId;
            if (productId)    params.product_id = productId;
            const res = await api.get('/seal/weekly-reports/leads', { params });
            return Array.isArray(res.data) ? res.data : [];
        },
        enabled: isOpen && !!productId,
        staleTime: 0,
    });

    const leadOptions = leads.map((l: any) => ({
        value: l.id.toString(),
        label: l.company_master?.name || l.company_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || `Lead #${l.id}`,
        quadrant: l.quadrant
    }));

    const q4Options = leadOptions.filter((l: any) => l.quadrant === 'Q4');
    const q3Options = leadOptions.filter((l: any) => l.quadrant === 'Q3');
    const q2Options = leadOptions.filter((l: any) => l.quadrant === 'Q2');
    const q1Options = leadOptions.filter((l: any) => l.quadrant === 'Q1');

    // 1. Initialize form when opening modal or switching reports
    useEffect(() => {
        if (!isOpen) return;

        if (mode === 'add') {
            setFormData({
                date: dayjs().format('YYYY-MM-DD'),
                prev_q4_to_order: '',
                prev_q3_to_q4: '',
                prev_q2_to_q3: '',
                prev_q1_to_q2: '',
                prev_notes: '',
                curr_q4_to_order: '',
                curr_q3_to_q4: '',
                curr_q2_to_q3: '',
                curr_q1_to_q2: '',
                curr_notes: ''
            });
            setPrevNames({
                q4_to_order: '',
                q3_to_q4: '',
                q2_to_q3: '',
                q1_to_q2: '',
                notes: ''
            });
        } else if (report) {
            const getIds = (type: string, metric: string) => {
                const items = report.details?.filter((d: any) => d.type === type && d.metric === metric) || [];
                if (metric === 'NOTES') return items[0]?.value || '';
                return items.map((d: any) => d.lead_id?.toString() || '').filter(Boolean).join(', ');
            };
            
            const getNames = (type: string, metric: string) => {
                const items = report.details?.filter((d: any) => d.type === type && d.metric === metric) || [];
                if (metric === 'NOTES') return items[0]?.value || '';
                return items.map((d: any) => {
                    const l = d.lead;
                    if (!l) return 'Lead #' + d.lead_id;
                    return l.company_master?.name || l.company_name || `${l.first_name} ${l.last_name || ''}`.trim();
                }).filter(Boolean).join(', ');
            };

            setFormData({
                date: dayjs(report.date).format('YYYY-MM-DD'),
                prev_q4_to_order: getIds('PREVIOUS', 'Q4_TO_ORDER'),
                prev_q3_to_q4: getIds('PREVIOUS', 'Q3_TO_Q4'),
                prev_q2_to_q3: getIds('PREVIOUS', 'Q2_TO_Q3'),
                prev_q1_to_q2: getIds('PREVIOUS', 'Q1_TO_Q2'),
                prev_notes: getIds('PREVIOUS', 'NOTES'),
                curr_q4_to_order: getIds('CURRENT', 'Q4_TO_ORDER'),
                curr_q3_to_q4: getIds('CURRENT', 'Q3_TO_Q4'),
                curr_q2_to_q3: getIds('CURRENT', 'Q2_TO_Q3'),
                curr_q1_to_q2: getIds('CURRENT', 'Q1_TO_Q2'),
                curr_notes: getIds('CURRENT', 'NOTES'),
            });

            setPrevNames({
                q4_to_order: getNames('PREVIOUS', 'Q4_TO_ORDER'),
                q3_to_q4: getNames('PREVIOUS', 'Q3_TO_Q4'),
                q2_to_q3: getNames('PREVIOUS', 'Q2_TO_Q3'),
                q1_to_q2: getNames('PREVIOUS', 'Q1_TO_Q2'),
                notes: getNames('PREVIOUS', 'NOTES'),
            });
        }
    }, [isOpen, report, mode]);

    // 2. Fetch latest report to auto-fill PREVIOUS data when date or user changes (Add Mode Only)
    useEffect(() => {
        if (!isOpen || mode !== 'add') return;

        const targetDate = formData.date;
        if (!targetDate) return;

        api.get('/seal/weekly-reports/latest', { params: {
            user_id: targetUserId || '',
            before_date: targetDate,
            product_id: productId || ''
        }}).then(res => {
            const latestReport = res.data;
            if (latestReport && latestReport.details) {
                const getIds = (type: string, metric: string) => {
                    const items = latestReport.details.filter((d: any) => d.type === type && d.metric === metric);
                    if (metric === 'NOTES') return items[0]?.value || '';
                    return items.map((d: any) => d.lead_id?.toString() || '').filter(Boolean).join(', ');
                };
                
                const getNames = (type: string, metric: string) => {
                    const items = latestReport.details.filter((d: any) => d.type === type && d.metric === metric);
                    if (metric === 'NOTES') return items[0]?.value || '';
                    return items.map((d: any) => {
                        const l = d.lead;
                        if (!l) return 'Lead #' + d.lead_id;
                        return l.company_master?.name || l.company_name || `${l.first_name} ${l.last_name || ''}`.trim();
                    }).filter(Boolean).join(', ');
                };

                setFormData((prev: any) => ({
                    ...prev,
                    prev_q4_to_order: getIds('CURRENT', 'Q4_TO_ORDER'),
                    prev_q3_to_q4: getIds('CURRENT', 'Q3_TO_Q4'),
                    prev_q2_to_q3: getIds('CURRENT', 'Q2_TO_Q3'),
                    prev_q1_to_q2: getIds('CURRENT', 'Q1_TO_Q2'),
                    prev_notes: getIds('CURRENT', 'NOTES'),
                }));

                setPrevNames({
                    q4_to_order: getNames('CURRENT', 'Q4_TO_ORDER'),
                    q3_to_q4: getNames('CURRENT', 'Q3_TO_Q4'),
                    q2_to_q3: getNames('CURRENT', 'Q2_TO_Q3'),
                    q1_to_q2: getNames('CURRENT', 'Q1_TO_Q2'),
                    notes: getNames('CURRENT', 'NOTES'),
                });
            } else {
                // Clear previous week status if no prior report found
                setFormData((prev: any) => ({
                    ...prev,
                    prev_q4_to_order: '',
                    prev_q3_to_q4: '',
                    prev_q2_to_q3: '',
                    prev_q1_to_q2: '',
                    prev_notes: '',
                }));
                setPrevNames({
                    q4_to_order: '',
                    q3_to_q4: '',
                    q2_to_q3: '',
                    q1_to_q2: '',
                    notes: ''
                });
            }
        });
    }, [isOpen, mode, formData.date, targetUserId]);

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const finalData = { ...data };
            if (mode === 'add' && targetUserId) finalData.user_id = parseInt(targetUserId);
            if (mode === 'add' && productId) finalData.product_id = parseInt(productId);

            if (mode === 'add') return api.post('/seal/weekly-reports', finalData);
            return api.put(`/seal/weekly-reports/${report.id}`, finalData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
            onClose();
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Something went wrong');
        },
        onSettled: () => setLoading(false)
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const validate = () => {
        // Validation removed as per user request
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewOnly) {
            onClose();
            return;
        }
        if (!validate()) return;
        setLoading(true);
        mutation.mutate(formData);
    };

    if (!isOpen) return null;

    const modalTitle = mode === 'add' ? 'Add Weekly Report' : mode === 'edit' ? 'Edit Weekly Report' : 'View Weekly Report';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{modalTitle}</h2>
                            <p className="text-xs text-gray-500">Track quadrant progress and plan for the current week</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
                    {/* Basic Info Section */}
                    <section>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-1 h-5 bg-blue-600 rounded-full" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Report Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Calendar size={14} className="mr-2 text-blue-500" />
                                    Reporting Date
                                </label>
                                <div className="relative">
                                    <DateOverlay value={formData.date} textClassName="pl-10 text-sm text-gray-900">
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        readOnly={isViewOnly || isEditMode}
                                        className={clsx(
                                            "w-full pl-10 pr-4 py-3 border rounded-xl outline-none transition-all",
                                            (isViewOnly || isEditMode) ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "cursor-pointer bg-gray-50/50 hover:bg-white focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]",
                                            errors.date ? "border-red-300 bg-red-50/30" : "border-gray-200"
                                        )}
                                    />
                                    </DateOverlay>
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Current Week Plan Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-1 h-5 bg-orange-500 rounded-full" />
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Current Week Plan</h3>
                                </div>
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase">To-Do</span>
                            </div>
                            
                            <div className="space-y-5 bg-[#fff8f4] p-5 rounded-2xl border border-orange-100 shadow-sm">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Q4 to Order</label>
                                    <MultiSelect
                                        options={q4Options}
                                        value={formData.curr_q4_to_order}
                                        onChange={(val) => setFormData({ ...formData, curr_q4_to_order: val })}
                                        placeholder="Select leads..."
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Q3 to Q4</label>
                                    <MultiSelect
                                        options={q3Options}
                                        value={formData.curr_q3_to_q4}
                                        onChange={(val) => setFormData({ ...formData, curr_q3_to_q4: val })}
                                        placeholder="Select leads..."
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Q2 to Q3</label>
                                    <MultiSelect
                                        options={q2Options}
                                        value={formData.curr_q2_to_q3}
                                        onChange={(val) => setFormData({ ...formData, curr_q2_to_q3: val })}
                                        placeholder="Select leads..."
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Q1 to Q2</label>
                                    <MultiSelect
                                        options={q1Options}
                                        value={formData.curr_q1_to_q2}
                                        onChange={(val) => setFormData({ ...formData, curr_q1_to_q2: val })}
                                        placeholder="Select leads..."
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Weekly Summary</label>
                                    <textarea
                                        name="curr_notes"
                                        value={formData.curr_notes}
                                        onChange={handleChange}
                                        readOnly={isViewOnly}
                                        rows={3}
                                        className={clsx(
                                            "w-full px-4 py-3 border border-gray-200 rounded-xl outline-none transition-all resize-none",
                                            isViewOnly ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white hover:border-orange-300 focus:border-orange-500 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)]"
                                        )}
                                        placeholder="Any specific plans or challenges..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Previous Week Performance Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-1 h-5 bg-green-600 rounded-full" />
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Previous Week Status</h3>
                                </div>
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Actuals</span>
                            </div>

                            <div className="space-y-4 bg-green-50/40 p-5 rounded-2xl border border-green-100 shadow-sm min-h-[300px]">
                                {/* Q4 to Order */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Q4 to Order</label>
                                    <div className="text-sm font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                                        {prevNames.q4_to_order || <span className="text-gray-300 font-normal italic text-xs">No leads moved</span>}
                                    </div>
                                </div>

                                {/* Q3 to Q4 */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Q3 to Q4</label>
                                    <div className="text-sm font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                                        {prevNames.q3_to_q4 || <span className="text-gray-300 font-normal italic text-xs">No leads moved</span>}
                                    </div>
                                </div>

                                {/* Q2 to Q3 */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Q2 to Q3</label>
                                    <div className="text-sm font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                                        {prevNames.q2_to_q3 || <span className="text-gray-300 font-normal italic text-xs">No leads moved</span>}
                                    </div>
                                </div>

                                {/* Q1 to Q2 */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Q1 to Q2</label>
                                    <div className="text-sm font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                                        {prevNames.q1_to_q2 || <span className="text-gray-300 font-normal italic text-xs">No leads moved</span>}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Previous Week Summary</label>
                                    <div className="text-xs text-gray-600 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50 italic leading-relaxed">
                                        {prevNames.notes || "No notes from previous week"}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end space-x-3 sticky bottom-0 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    {!isViewOnly && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>{loading ? 'Saving...' : mode === 'add' ? 'Submit Report' : 'Update Report'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
