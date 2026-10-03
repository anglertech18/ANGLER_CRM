import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import clsx from 'clsx';
import dayjs from 'dayjs';

interface PartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: any;
    isSubmitting?: boolean;
}

export default function PartnerModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }: PartnerModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    // Fetch Masters
    const { data: sources } = useQuery({ 
        queryKey: ['masters', 'leadsource'], 
        queryFn: () => api.get('/masters/leadsource').then(r => r.data),
        enabled: isOpen 
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    ...initialData,
                    reg_date: initialData.reg_date ? dayjs(initialData.reg_date).format('YYYY-MM-DD') : '',
                    enquiry_interest_date: initialData.enquiry_interest_date ? dayjs(initialData.enquiry_interest_date).format('YYYY-MM-DD') : '',
                    quadrant_allotted_date: initialData.quadrant_allotted_date ? dayjs(initialData.quadrant_allotted_date).format('YYYY-MM-DD') : '',
                    rfi_received_date: initialData.rfi_received_date ? dayjs(initialData.rfi_received_date).format('YYYY-MM-DD') : '',
                    business_plan_submitted_date: initialData.business_plan_submitted_date ? dayjs(initialData.business_plan_submitted_date).format('YYYY-MM-DD') : '',
                    business_plan_target_agreed_date: initialData.business_plan_target_agreed_date ? dayjs(initialData.business_plan_target_agreed_date).format('YYYY-MM-DD') : '',
                    training_provided_date: initialData.training_provided_date ? dayjs(initialData.training_provided_date).format('YYYY-MM-DD') : '',
                    monthly_engagement_started_date: initialData.monthly_engagement_started_date ? dayjs(initialData.monthly_engagement_started_date).format('YYYY-MM-DD') : '',
                    edc: initialData.edc ? dayjs(initialData.edc).format('YYYY-MM-DD') : '',
                    signed_date: initialData.signed_date ? dayjs(initialData.signed_date).format('YYYY-MM-DD') : '',
                    source_id: initialData.source_id?.toString() || '',
                });
            } else {
                reset({
                    reg_date: dayjs().format('YYYY-MM-DD'),
                    partner_company: '',
                    name: '',
                    source_id: '',
                    region: '',
                    enquiry_interest_date: '',
                    quadrant_allotted_date: '',
                    current_lead_score: 0,
                    quadrant: 'Q1',
                    partner_type: '',
                    current_end_client_opportunity: '',
                    rfi_received_date: '',
                    business_plan_submitted_date: '',
                    business_plan_target_agreed_date: '',
                    training_provided_date: '',
                    monthly_engagement_started_date: '',
                    partner_action_poa: '',
                    edc: '',
                    active_leads_moved_to_quadrant: 0,
                    status: 'Active',
                    signed_date: ''
                });
            }
        }
    }, [isOpen, initialData, reset]);

    if (!isOpen) return null;

    const inputClasses = "w-full p-2 border border-gray-200 rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all";
    const labelClasses = "block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider ml-1";

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Edit Partner Performance' : 'Partner Sign-Up & Performance Tracking'}</h2>
                        <p className="text-sm text-gray-500 font-medium">Capture onboarding details and engagement lifecycle</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Section 1: Basic Info */}
                        <div className="md:col-span-3 pb-2 border-b border-slate-100 mb-2">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Basic Information</h3>
                        </div>

                        <div>
                            <label className={labelClasses}>Partner Company *</label>
                            <input
                                type="text"
                                placeholder="Org Name"
                                {...register('partner_company', { required: 'Partner Company is required' })}
                                className={clsx(inputClasses, errors.partner_company && "border-red-400 focus:ring-red-500")}
                            />
                        </div>

                        <div>
                            <label className={labelClasses}>Partner Name *</label>
                            <input
                                type="text"
                                placeholder="Primary Contact Name"
                                {...register('name', { required: 'Partner Name is required' })}
                                className={clsx(inputClasses, errors.name && "border-red-400 focus:ring-red-500")}
                            />
                        </div>

                        <div>
                            <label className={labelClasses}>Lead Source</label>
                            <select {...register('source_id')} className={inputClasses}>
                                <option value="">Select Source</option>
                                {sources?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClasses}>Region / Location</label>
                            <input type="text" placeholder="e.g. Dubai, UAE" {...register('region')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Partner Type</label>
                            <input type="text" placeholder="e.g. Referral, Reseller" {...register('partner_type')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Status</label>
                            <select {...register('status')} className={inputClasses}>
                                <option value="Active">Active</option>
                                <option value="Pending">Pending</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Section 2: Engagement Timeline */}
                        <div className="md:col-span-3 pb-2 border-b border-slate-100 mt-4 mb-2">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Onboarding & Engagement Lifecycle</h3>
                        </div>

                        <div>
                            <label className={labelClasses}>Enquiry Interest Date</label>
                            <input type="date" {...register('enquiry_interest_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Quadrant Allotted Date</label>
                            <input type="date" {...register('quadrant_allotted_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Quadrant</label>
                            <select {...register('quadrant')} className={inputClasses}>
                                <option value="Q1">Q1 (Interested)</option>
                                <option value="Q2">Q2 (Progressing)</option>
                                <option value="Q3">Q3 (Warm)</option>
                                <option value="Q4">Q4 (Hot)</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClasses}>RFI Received Date</label>
                            <input type="date" {...register('rfi_received_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Business Plan Submitted</label>
                            <input type="date" {...register('business_plan_submitted_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>BP Target Agreed</label>
                            <input type="date" {...register('business_plan_target_agreed_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Training Provided</label>
                            <input type="date" {...register('training_provided_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Monthly Engagement Start</label>
                            <input type="date" {...register('monthly_engagement_started_date')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Signed Date</label>
                            <input type="date" {...register('signed_date')} className={inputClasses} />
                        </div>

                        {/* Section 3: Performance Metrics */}
                        <div className="md:col-span-3 pb-2 border-b border-slate-100 mt-4 mb-2">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Performance Tracking</h3>
                        </div>

                        <div>
                            <label className={labelClasses}>Current Lead Score</label>
                            <input type="number" {...register('current_lead_score')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>Active Leads in Quadrant</label>
                            <input type="number" {...register('active_leads_moved_to_quadrant')} className={inputClasses} />
                        </div>

                        <div>
                            <label className={labelClasses}>EDC (Closure Date)</label>
                            <input type="date" {...register('edc')} className={inputClasses} />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClasses}>Current End Client Opportunity Details</label>
                            <input type="text" placeholder="Describe current major opportunities..." {...register('current_end_client_opportunity')} className={inputClasses} />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClasses}>Partner Action PoA (Plan of Action)</label>
                            <textarea 
                                rows={3} 
                                placeholder="Immediate next steps for this partner..." 
                                {...register('partner_action_poa')} 
                                className={clsx(inputClasses, "resize-none")}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t flex items-center justify-end space-x-3 bg-white sticky bottom-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="mr-2" />
                                    Save Partner
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

