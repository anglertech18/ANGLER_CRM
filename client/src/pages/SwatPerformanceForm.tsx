import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Save, RefreshCw, ArrowLeft, CheckCircle2, AlertCircle, TrendingUp, Target, BarChart2, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

export default function SwatPerformanceForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlDate = searchParams.get('date');
    const urlProductId = searchParams.get('product_id');

    const [loading, setLoading] = useState(false);
    const [fetchingTargets, setFetchingTargets] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'auto_saved' | 'unsaved' | null>(null);
    const isDirtyRef = useRef(false);
    const [keyClosures, setKeyClosures] = useState<{ closure_text: string }[]>([{ closure_text: '' }]);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [mappedItems, setMappedItems] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    const selectedItemLabel: string = React.useMemo(() => {
        if (!selectedProductId) return '—';
        const found = mappedItems.find(m => String(m.id) === selectedProductId);
        return found?.name || '—';
    }, [selectedProductId, mappedItems]);

    const currentUser = React.useMemo(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }, []);

    const initialFormData = {
        date: urlDate || dayjs().format('YYYY-MM-DD'),
        calls_target: 0, activities_target: 0, q1_lead_gen_target: 0,
        linkedin_target: 0, demos_target: 0, proposals_target: 0, direct_visit_target: 0,
        calls_achieved: 0, calls_remarks: '',
        activities_achieved: 0, activities_remarks: '',
        q1_lead_gen_achieved: 0, q1_lead_gen_remarks: '',
        linkedin_achieved: 0, linkedin_remarks: '',
        demos_achieved: 0, demos_remarks: '',
        proposals_achieved: 0, proposals_remarks: '',
        direct_visit_achieved: 0, direct_visit_remarks: '',
        email_campaign_target: 0, email_campaign_achieved: 0, email_campaign_remarks: '',
        linkedin_connection_target: 0, linkedin_connection_achieved: 0, linkedin_connection_remarks: '',
        sales_order_won_target: 0, sales_order_won_achieved: 0, sales_order_won_remarks: '',
        revenue_collected_target: 0, revenue_collected_achieved: 0, revenue_collected_remarks: '',
        q1_to_q2: 0, q2_to_q3: 0, q3_to_q4: 0, q4_to_order: 0,
        q4_to_q3: 0, q3_to_q2: 0, q2_to_q1: 0, any_to_nurturing: 0,
        key_closures: [{ closure_text: '' }],
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        const fetchMappedItems = async () => {
            try {
                if (!currentUser?.id) return;
                const targetsRes = await api.get(`/users/${currentUser.id}/targets`);
                const productTargets = targetsRes.data?.productTargets || [];
                const myItems = productTargets
                    .map((pt: any) => pt.product)
                    .filter((p: any) => p?.is_active);

                setMappedItems(myItems);

                if (urlProductId) {
                    setSelectedProductId(urlProductId);
                } else if (myItems.length > 0) {
                    setSelectedProductId(String(myItems[0].id));
                }
            } catch (err) {
                console.error('Failed to load mapped products', err);
            }
        };
        fetchMappedItems();
    }, [currentUser?.id]);

    useEffect(() => {
        const fetchDailyStats = async () => {
            if (!currentUser?.id || !formData.date || !selectedProductId) return;

            setFetchingTargets(true);
            try {
                const url = `/swat-performance/stats?date=${formData.date}&product_id=${selectedProductId}`;
                const response = await api.get(url);
                const { targets, achievements, existing, computedRemarks } = response.data;

                setFormData({
                    ...initialFormData,
                    date: formData.date,
                    ...targets,
                    ...achievements,
                    ...(existing ? {
                        calls_remarks: existing.calls_remarks || '',
                        activities_remarks: existing.activities_remarks || '',
                        q1_lead_gen_achieved: existing.q1_lead_gen_achieved || 0,
                        q1_lead_gen_remarks: existing.q1_lead_gen_remarks || '',
                        linkedin_achieved: existing.linkedin_achieved || 0,
                        linkedin_remarks: existing.linkedin_remarks || '',
                        demos_achieved: existing.demos_achieved || 0,
                        demos_remarks: existing.demos_remarks || '',
                        proposals_achieved: existing.proposals_achieved || 0,
                        proposals_remarks: existing.proposals_remarks || '',
                        direct_visit_achieved: existing.direct_visit_achieved || 0,
                        direct_visit_remarks: existing.direct_visit_remarks || '',
                        email_campaign_achieved: existing.email_campaign_achieved || 0,
                        email_campaign_remarks: existing.email_campaign_remarks || '',
                        linkedin_connection_achieved: existing.linkedin_connection_achieved || 0,
                        linkedin_connection_remarks: existing.linkedin_connection_remarks || '',
                        sales_order_won_target: existing.sales_order_won_target || 0,
                        sales_order_won_achieved: existing.sales_order_won_achieved || 0,
                        sales_order_won_remarks: computedRemarks?.sales_order_won_remarks ?? existing.sales_order_won_remarks ?? '',
                        revenue_collected_target: existing.revenue_collected_target || 0,
                        revenue_collected_achieved: existing.revenue_collected_achieved || 0,
                        revenue_collected_remarks: computedRemarks?.revenue_collected_remarks ?? existing.revenue_collected_remarks ?? '',
                        q1_to_q2: existing.q1_to_q2 || 0, q2_to_q3: existing.q2_to_q3 || 0,
                        q3_to_q4: existing.q3_to_q4 || 0, q4_to_order: existing.q4_to_order || 0,
                        q4_to_q3: existing.q4_to_q3 || 0, q3_to_q2: existing.q3_to_q2 || 0,
                        q2_to_q1: existing.q2_to_q1 || 0, any_to_nurturing: existing.any_to_nurturing || 0,
                        demos_target: existing.demos_target || targets.demos_target || 0,
                        proposals_target: existing.proposals_target || targets.proposals_target || 0,
                    } : {})
                });

                if (existing?.key_closures) {
                    setKeyClosures(existing.key_closures.length > 0 ? existing.key_closures : [{ closure_text: '' }]);
                } else {
                    setKeyClosures([{ closure_text: '' }]);
                }

                // Set save status from existing record
                isDirtyRef.current = false;
                if (existing?.is_manually_saved) {
                    setSaveStatus('saved');
                } else if (existing?.is_auto_saved) {
                    setSaveStatus('auto_saved');
                } else {
                    setSaveStatus(null);
                }

                const targetDate = dayjs(formData.date).startOf('day');
                const today = dayjs().startOf('day');
                setIsViewOnly(targetDate.isBefore(today, 'day'));
            } catch (err) {
                console.error('Error fetching stats:', err);
                setError('Failed to fetch daily stats. Please contact Admin.');
            } finally {
                setFetchingTargets(false);
            }
        };
        fetchDailyStats();
    }, [currentUser?.id, formData.date, selectedProductId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Math.max(0, parseInt(value) || 0) : value
        }));
        if (!isDirtyRef.current) {
            isDirtyRef.current = true;
            setSaveStatus('unsaved');
        }
    };

    const addKeyClosure = () => setKeyClosures([...keyClosures, { closure_text: '' }]);
    const removeKeyClosure = (index: number) => setKeyClosures(keyClosures.filter((_, i) => i !== index));
    const handleKeyClosureChange = (index: number, value: string) => {
        const newClosures = [...keyClosures];
        newClosures[index].closure_text = value;
        setKeyClosures(newClosures);
        if (!isDirtyRef.current) {
            isDirtyRef.current = true;
            setSaveStatus('unsaved');
        }
    };

    const handleReset = () => {
        if (window.confirm('Reset the form? All unsaved achievements will be lost.')) {
            setFormData({
                ...initialFormData,
                calls_target: formData.calls_target,
                activities_target: formData.activities_target,
                linkedin_target: formData.linkedin_target,
                q1_lead_gen_target: formData.q1_lead_gen_target,
                demos_target: formData.demos_target,
                proposals_target: formData.proposals_target,
                direct_visit_target: formData.direct_visit_target,
                email_campaign_target: formData.email_campaign_target,
                linkedin_connection_target: formData.linkedin_connection_target,
                calls_achieved: formData.calls_achieved,
                activities_achieved: formData.activities_achieved,
                linkedin_achieved: formData.linkedin_achieved,
                sales_order_won_achieved: formData.sales_order_won_achieved,
                sales_order_won_remarks: formData.sales_order_won_remarks,
                revenue_collected_achieved: formData.revenue_collected_achieved,
                revenue_collected_remarks: formData.revenue_collected_remarks,
            });
            setKeyClosures([{ closure_text: '' }]);
            setError(null);
            setSuccess(false);
        }
    };

    const validate = () => {
        if (!formData.date) return 'Date is required';
        if (!selectedProductId) return 'Product is required';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) { setError(validationError); return; }
        setLoading(true);
        setError(null);
        try {
            const payload: any = {
                ...formData,
                product_id: parseInt(selectedProductId),
                key_closures: keyClosures.filter(c => c.closure_text.trim() !== '')
            };
            await api.post('/swat-performance', payload);
            setSuccess(true);
            isDirtyRef.current = false;
            setSaveStatus('saved');
            setTimeout(() => setSuccess(false), 3000);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving performance data');
        } finally {
            setLoading(false);
        }
    };

    const calculateOverallPerformance = () => {
        const sections = [
            { t: formData.calls_target, a: formData.calls_achieved },
            { t: formData.activities_target, a: formData.activities_achieved },
            { t: formData.q1_lead_gen_target, a: formData.q1_lead_gen_achieved },
            { t: formData.linkedin_target, a: formData.linkedin_achieved },
            { t: formData.demos_target, a: formData.demos_achieved },
            { t: formData.proposals_target, a: formData.proposals_achieved },
            { t: formData.direct_visit_target, a: formData.direct_visit_achieved },
            { t: formData.email_campaign_target, a: formData.email_campaign_achieved },
            { t: formData.linkedin_connection_target, a: formData.linkedin_connection_achieved },
            { t: formData.sales_order_won_target, a: formData.sales_order_won_achieved },
            { t: formData.revenue_collected_target, a: formData.revenue_collected_achieved }
        ];
        let totalPct = 0, activeCount = 0;
        sections.forEach(s => {
            if (s.t > 0) { activeCount++; totalPct += Math.min(100, (s.a / s.t) * 100); }
        });
        return activeCount > 0 ? (totalPct / activeCount).toFixed(1) : '0.0';
    };

    const performancePct = parseFloat(calculateOverallPerformance());
    const perfColor   = performancePct < 70 ? 'text-red-600' : performancePct < 100 ? 'text-amber-600' : 'text-emerald-600';
    const perfBg      = performancePct < 70 ? 'bg-red-50 border-red-200' : performancePct < 100 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

    return (
        <div className="page-wrapper max-w-6xl">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <BarChart2 size={14} className="text-primary-600" />
                        </div>
                        <div>
                            <h1 className="page-title">SWAT Performance Form</h1>
                            <p className="page-subtitle">Track your daily sales targets and achievements</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Save status badge */}
                    {saveStatus === 'saved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> Saved
                        </span>
                    )}
                    {saveStatus === 'auto_saved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock size={11} /> Auto Saved
                        </span>
                    )}
                    {saveStatus === 'unsaved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle size={11} /> Unsaved Changes
                        </span>
                    )}
                    {!isViewOnly && (
                        <button onClick={handleReset} className="btn btn-ghost gap-1.5">
                            <RefreshCw size={14} />
                            Reset
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || fetchingTargets || isViewOnly}
                        className={clsx(
                            'btn disabled:opacity-50',
                            isViewOnly ? 'btn-secondary cursor-not-allowed' : 'btn-primary'
                        )}
                    >
                        {isViewOnly ? <CheckCircle2 size={15} /> : <Save size={15} />}
                        {isViewOnly ? 'View Only' : loading ? 'Saving...' : 'Submit Log'}
                    </button>
                </div>
            </div>

            {/* Performance Banner */}
            <div className={clsx('card p-5 border flex flex-col md:flex-row items-center gap-5', perfBg)}>
                <div className="flex items-center gap-4">
                    <div className={clsx('w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center', perfColor)}>
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Performance</p>
                        {/* <p className={clsx('text-3xl font-bold', perfColor)}>{performancePct}%</p> */}
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1 pl-0 md:pl-6 md:border-l border-white/50">
                    {/* <div>
                        <p className="text-xs text-slate-500 font-medium">Status</p>
                        <p className={clsx('text-sm font-bold', perfColor)}>
                            {performancePct < 70 ? 'Below Target' : performancePct < 100 ? 'On Track' : 'Excellence'}
                        </p>
                    </div> */}
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Date</p>
                        <p className="text-sm font-bold text-slate-800">{dayjs(formData.date).format('DD/MM/YYYY')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">BDE</p>
                        <p className="text-sm font-bold text-slate-800">{currentUser?.first_name} {currentUser?.last_name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Product</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{selectedItemLabel}</p>
                    </div>
                </div>
            </div>

            {/* View-only notice */}
            {isViewOnly && (
                <div className="card p-4 flex items-center gap-3 border-l-4 border-amber-400 bg-amber-50">
                    <AlertCircle size={18} className="text-amber-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800">View Only Mode</p>
                        <p className="text-xs text-amber-700 mt-0.5">Past records cannot be modified.</p>
                    </div>
                    <button onClick={() => navigate('/swat-performance')} className="btn btn-secondary text-xs">
                        Back to List
                    </button>
                </div>
            )}

            {error && (
                <div className="card p-4 flex items-center gap-3 border-l-4 border-red-500 bg-red-50">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}

            {success && (
                <div className="card p-4 flex items-center gap-3 border-l-4 border-emerald-500 bg-emerald-50">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-sm text-emerald-700 font-medium">Performance log saved successfully!</span>
                </div>
            )}

            {/* Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Activity Log + Key Closures */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Activity Log Card */}
                    <div className="card overflow-hidden">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={15} className="text-primary-600" />
                                <h3 className="text-sm font-semibold text-slate-800">Activity Log</h3>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Selectors row */}
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="form-group flex-1 mb-0">
                                    <label className="form-label">Reporting Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        onClick={e => (e.target as any).showPicker?.()}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group flex-1 mb-0">
                                    <label className="form-label">Product</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={e => setSelectedProductId(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="">— Select Product —</option>
                                        {mappedItems.map(m => (
                                            <option key={m.id} value={String(m.id)}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Activity Table */}
                            {fetchingTargets ? (
                                <div className="py-10 flex justify-center">
                                    <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="table-base">
                                        <thead className="table-head">
                                            <tr>
                                                <th className="table-th">Activity Type</th>
                                                <th className="table-th">Target</th>
                                                <th className="table-th">Achieved</th>
                                                <th className="table-th">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <TableRow label="Calls"              target={formData.calls_target}              achievedName="calls_achieved"              remarksName="calls_remarks"              readOnly={true}  formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Activities (Email + Linkedin)"         target={formData.activities_target}         achievedName="activities_achieved"         remarksName="activities_remarks"         readOnly={true}  formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Q1 Lead Generation" target={formData.q1_lead_gen_target}        achievedName="q1_lead_gen_achieved"        remarksName="q1_lead_gen_remarks"        readOnly={true}  formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Direct Visit"       target={formData.direct_visit_target}       achievedName="direct_visit_achieved"       remarksName="direct_visit_remarks"                        formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="LinkedIn Acceptance"           target={formData.linkedin_target}           achievedName="linkedin_achieved"           remarksName="linkedin_remarks"                                formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Email Campaign"     target={formData.email_campaign_target}     achievedName="email_campaign_achieved"     remarksName="email_campaign_remarks"                        formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="LinkedIn Connection Sent" target={formData.linkedin_connection_target} achievedName="linkedin_connection_achieved" remarksName="linkedin_connection_remarks"                formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Demos"              target={formData.demos_target}              achievedName="demos_achieved"              remarksName="demos_remarks"                                              formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Proposals"          target={formData.proposals_target}          achievedName="proposals_achieved"          remarksName="proposals_remarks"                                              formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Sales Order Won"    target={formData.sales_order_won_target}    achievedName="sales_order_won_achieved"    remarksName="sales_order_won_remarks"    readOnly remarksReadOnly targetLabel="Monthly Target" formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                            <TableRow label="Revenue Collected"  target={formData.revenue_collected_target}  achievedName="revenue_collected_achieved"  remarksName="revenue_collected_remarks"  readOnly remarksReadOnly targetLabel="Monthly Target" formData={formData} handleChange={handleChange} isViewOnly={isViewOnly} />
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Key Closures Card */}
                    <div className="card overflow-hidden">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-primary-600" />
                                <h3 className="text-sm font-semibold text-slate-800">Key Closures</h3>
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            {keyClosures.map((closure, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={closure.closure_text}
                                        onChange={e => handleKeyClosureChange(index, e.target.value)}
                                        readOnly={isViewOnly}
                                        disabled={isViewOnly}
                                        placeholder={isViewOnly ? '' : 'Enter closure detail...'}
                                        className={clsx('form-input flex-1', isViewOnly && 'bg-slate-50 text-slate-500 cursor-not-allowed')}
                                    />
                                    {!isViewOnly && (
                                        <button
                                            type="button"
                                            onClick={() => removeKeyClosure(index)}
                                            disabled={keyClosures.length === 1}
                                            className="btn btn-ghost btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                                        >
                                            <RefreshCw size={14} className="rotate-45" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!isViewOnly && (
                                <button type="button" onClick={addKeyClosure} className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                                    + Add More Closure
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Quadrant Movements */}
                <div className="space-y-5">
                    <QuadrantCard title="Positive Movement" accent="primary">
                        {[
                            { label: 'Q1 → Q2', name: 'q1_to_q2' },
                            { label: 'Q2 → Q3', name: 'q2_to_q3' },
                            { label: 'Q3 → Q4', name: 'q3_to_q4' },
                            { label: 'Q4 → Order', name: 'q4_to_order' },
                        ].map(f => (
                            <QuadrantField key={f.name} label={f.label} name={f.name} value={(formData as any)[f.name]} color="blue" />
                        ))}
                    </QuadrantCard>

                    <QuadrantCard title="Negative Movement" accent="red">
                        {[
                            { label: 'Q4 → Q3', name: 'q4_to_q3' },
                            { label: 'Q3 → Q2', name: 'q3_to_q2' },
                            { label: 'Q2 → Q1', name: 'q2_to_q1' },
                            { label: '→ Nurturing', name: 'any_to_nurturing' },
                        ].map(f => (
                            <QuadrantField key={f.name} label={f.label} name={f.name} value={(formData as any)[f.name]} color="red" />
                        ))}
                    </QuadrantCard>

                    {/* Guidelines */}
                    <div className="card p-5 bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none">
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-80">Quick Guidelines</h3>
                        <ul className="space-y-2.5 text-xs opacity-90">
                            {[
                                'Achieved values cannot exceed targets.',
                                'Only one entry allowed per user per day.',
                                'Performance % is calculated based on active targets.',
                            ].map((tip, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────

function QuadrantCard({ title, accent, children }: { title: string; accent: 'primary' | 'red'; children: React.ReactNode }) {
    return (
        <div className="card overflow-hidden">
            <div className={clsx('card-header', accent === 'red' ? 'bg-red-50/50' : 'bg-primary-50/50')}>
                <h3 className={clsx('text-xs font-semibold', accent === 'red' ? 'text-red-700' : 'text-primary-700')}>{title}</h3>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-2 gap-3">{children}</div>
            </div>
        </div>
    );
}

function QuadrantField({ label, name, value, color }: { label: string; name: string; value: number; color: 'blue' | 'red' }) {
    return (
        <div>
            <label className={clsx('block text-[10px] font-semibold uppercase mb-1.5', color === 'red' ? 'text-red-600' : 'text-primary-600')}>{label}</label>
            <div className={clsx('form-input text-center font-bold cursor-not-allowed opacity-80', color === 'red' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-primary-50 border-primary-100 text-primary-700')}>
                {value}
            </div>
        </div>
    );
}

interface TableRowProps {
    label: string;
    target: number;
    targetName?: string;
    achievedName: string;
    remarksName: string;
    readOnly?: boolean;
    remarksReadOnly?: boolean;
    isTargetEditable?: boolean;
    hideTarget?: boolean;
    targetLabel?: string;
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    isViewOnly: boolean;
}

function TableRow({ label, target, targetName, achievedName, remarksName, readOnly, remarksReadOnly, isTargetEditable, hideTarget, targetLabel, formData, handleChange, isViewOnly }: TableRowProps) {
    const achieved = formData[achievedName] as number;
    const isOver = target > 0 && achieved > target;

    return (
        <tr className="table-tr">
            <td className="table-td font-medium text-slate-700 w-1/4">
                {label}
                {targetLabel && (
                    <span className="block text-[10px] font-normal text-slate-400">{targetLabel}</span>
                )}
            </td>
            <td className="table-td w-1/6">
                {!hideTarget ? (
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Target size={12} className="text-slate-400 shrink-0" />
                        {isTargetEditable && targetName ? (
                            <input
                                type="number"
                                name={targetName}
                                value={formData[targetName]}
                                onChange={handleChange}
                                readOnly={isViewOnly}
                                className="w-14 p-1 border border-slate-200 rounded text-xs font-bold bg-white focus:ring-1 focus:ring-primary-400 outline-none"
                            />
                        ) : (
                            <span className="font-semibold text-slate-700 text-xs">{target}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-[10px] text-slate-400 italic">No Target</span>
                )}
            </td>
            <td className="table-td w-1/4">
                <div className="relative">
                    <input
                        type="number"
                        name={achievedName}
                        value={achieved}
                        onChange={handleChange}
                        readOnly={readOnly || isViewOnly}
                        className={clsx(
                            'form-input text-sm font-semibold',
                            readOnly ? 'bg-primary-50 border-primary-100 text-primary-700 cursor-not-allowed' :
                            isOver ? 'border-red-400 bg-red-50 text-red-700' : ''
                        )}
                    />
                    {readOnly && (
                        <CheckCircle2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500" />
                    )}
                </div>
            </td>
            <td className="table-td w-1/3">
                {remarksReadOnly ? (
                    <textarea
                        name={remarksName}
                        value={formData[remarksName] || ''}
                        onChange={handleChange}
                        readOnly
                        rows={2}
                        placeholder="Auto-generated"
                        className="form-input text-xs bg-slate-50 text-slate-500 cursor-not-allowed resize-none"
                    />
                ) : (
                    <input
                        type="text"
                        name={remarksName}
                        value={formData[remarksName] || ''}
                        onChange={handleChange}
                        readOnly={isViewOnly}
                        placeholder={isViewOnly ? 'No remarks' : 'Add notes...'}
                        className={clsx('form-input text-xs', isViewOnly && 'bg-slate-50 text-slate-500 cursor-not-allowed')}
                    />
                )}
            </td>
        </tr>
    );
}
