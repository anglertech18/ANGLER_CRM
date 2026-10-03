import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowLeft, Save, User, Clock, Lock } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import DateOverlay from '../../components/DateOverlay';

function SectionBar({ color, title }: { color: string; title: string }) {
    return (
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className={clsx('w-1 h-5 rounded-full', color)} />
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
    );
}

export default function PartnerForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();
    const isEdit = !!id;

    // Context lock: product pre-selected from the tracker listing page
    const urlProductId  = searchParams.get('product_id') || '';
    const contextName   = searchParams.get('context_name') || '';
    const isContextLocked = !isEdit && !!urlProductId;

    const { register, handleSubmit, reset, setValue, formState: { errors }, watch } = useForm();

    const enquiryDate   = watch('enquiry_interest_date');
    const quadrantDate  = watch('quadrant_allotted_date');

    const { data: sources } = useQuery({
        queryKey: ['masters', 'leadsource'],
        queryFn: () => api.get('/masters/leadsource').then(r => r.data)
    });

    /* ── Mapped products from Product Master ── */
    const { data: mappedProducts = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['poas', 'mapped-products', authUser?.id],
        queryFn: () => api.get('/seal/poas/mapped-products').then(r => r.data),
        staleTime: 5 * 60 * 1000,
        enabled: !!authUser?.id,
    });

    // Auto-select first mapped product only when no product has been set yet (no URL context)
    useEffect(() => {
        if (!isEdit && !urlProductId && mappedProducts.length > 0 && !watch('product_id')) {
            setValue('product_id', String(mappedProducts[0].id));
        }
    }, [isEdit, mappedProducts]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users').then(res => res.data)
    });

    const { data: existingPartner, isLoading: isLoadingPartner } = useQuery({
        queryKey: ['partners', id],
        queryFn: () => api.get(`/seal/partners/${id}`).then(res => res.data),
        enabled: isEdit
    });

    useEffect(() => {
        if (isEdit && existingPartner) {
            reset({
                ...existingPartner,
                reg_date: existingPartner.reg_date ? dayjs(existingPartner.reg_date).format('YYYY-MM-DD') : '',
                enquiry_interest_date: existingPartner.enquiry_interest_date ? dayjs(existingPartner.enquiry_interest_date).format('YYYY-MM-DD') : '',
                quadrant_allotted_date: existingPartner.quadrant_allotted_date ? dayjs(existingPartner.quadrant_allotted_date).format('YYYY-MM-DD') : '',
                edc: existingPartner.edc ? dayjs(existingPartner.edc).format('YYYY-MM-DD') : '',
                signed_date: existingPartner.signed_date ? dayjs(existingPartner.signed_date).format('YYYY-MM-DD') : '',
                source_id: existingPartner.source_id?.toString() || '',
                product_id: existingPartner.product_id?.toString() || '',
                is_rfi_received: existingPartner.is_rfi_received ? 'Yes' : 'No',
                is_business_plan_submitted: existingPartner.is_business_plan_submitted ? 'Yes' : 'No',
                is_business_plan_target_agreed: existingPartner.is_business_plan_target_agreed ? 'Yes' : 'No',
                is_training_provided: existingPartner.is_training_provided ? 'Yes' : 'No',
                is_monthly_engagement_started: existingPartner.is_monthly_engagement_started ? 'Yes' : 'No',
                current_end_client_opportunity: existingPartner.current_end_client_opportunity || 'No',
                user_id: existingPartner.user_id?.toString() || '',
            });
        } else if (!isEdit) {
            reset({
                user_id: authUser?.id?.toString() || '',
                product_id: urlProductId || '',
                reg_date: dayjs().format('YYYY-MM-DD'),
                partner_company: '', name: '', source_id: '', region: '',
                enquiry_interest_date: '', quadrant_allotted_date: '',
                current_lead_score: 0, quadrant: 'Q1', partner_type: '',
                current_end_client_opportunity: 'No',
                is_rfi_received: 'No', is_business_plan_submitted: 'No',
                is_business_plan_target_agreed: 'No', business_plan_target_value: 0,
                is_training_provided: 'No', is_monthly_engagement_started: 'No',
                partner_action_poa: '', edc: '',
                active_leads_moved_to_quadrant: 0, status: 'Active', signed_date: ''
            });
        }
    }, [isEdit, existingPartner, reset, urlProductId]);

    const calculateAge = (dateString: string) => {
        if (!dateString) return '0 days';
        return `${dayjs().diff(dayjs(dateString), 'day')} days`;
    };

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                is_rfi_received: data.is_rfi_received === 'Yes',
                is_business_plan_submitted: data.is_business_plan_submitted === 'Yes',
                is_business_plan_target_agreed: data.is_business_plan_target_agreed === 'Yes',
                is_training_provided: data.is_training_provided === 'Yes',
                is_monthly_engagement_started: data.is_monthly_engagement_started === 'Yes',
            };
            return isEdit ? api.put(`/seal/partners/${id}`, payload) : api.post('/seal/partners', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            navigate('/partner-signup');
        },
        onError: (err: any) => {
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
            alert('Error saving partner: ' + detail);
        }
    });

    const onSubmit = (data: any) => mutation.mutate(data);

    const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
        try { (e.currentTarget as any).showPicker(); } catch {}
    };

    if (isEdit && isLoadingPartner) return (
        <div className="page-wrapper">
            <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="card p-6">
                        <div className="skeleton h-4 w-48 rounded mb-5" />
                        <div className="grid grid-cols-3 gap-4">
                            {Array.from({ length: 3 }).map((_, j) => <div key={j} className="skeleton h-9 rounded-lg" />)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const isCeoOrManager = String(authUser?.role).toUpperCase() === 'CEO' ||
        String(authUser?.role).toUpperCase() === 'ADMIN' ||
        String(authUser?.role).toUpperCase() === 'SALESMANAGER';

    return (
        <div className="page-wrapper max-w-5xl">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/partner-signup')}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <User size={14} className="text-primary-600" />
                        </div>
                        <div>
                            <h1 className="page-title">{isEdit ? 'Update Partner Lifecycle' : 'New Partner Onboarding'}</h1>
                            <p className="page-subtitle">Structure partner data in logical performance groups</p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Group 1: Basic Info */}
                <div className="card p-6">
                    <SectionBar color="bg-primary-600" title="1. Basic Information" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="form-group">
                            <label className="form-label">Executive (Owner)</label>
                            {isCeoOrManager ? (
                                <select {...register('user_id', { required: 'Owner required' })} className="form-select">
                                    <option value="">Select Executive</option>
                                    {users?.filter((u: any) => {
                                        const role = String(authUser?.role).toUpperCase();
                                        if (role === 'CEO' || role === 'ADMIN') return true;
                                        if (role === 'SALESMANAGER') return u.id === authUser?.id || u.reporting_manager_id === authUser?.id;
                                        return false;
                                    }).map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="form-input bg-slate-50 text-slate-500 cursor-not-allowed">
                                    {isEdit ? `${existingPartner?.user?.first_name} ${existingPartner?.user?.last_name}` : `${authUser?.first_name} ${authUser?.last_name || ''}`}
                                    <input type="hidden" value={watch('user_id') || ''} {...register('user_id')} />
                                </div>
                            )}
                            {errors.user_id && <p className="text-[10px] text-red-500 mt-1 font-medium">{(errors.user_id as any).message}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Lead Source</label>
                            <select {...register('source_id')} className="form-select">
                                <option value="">Select Source</option>
                                {sources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label flex items-center gap-1">
                                Product <span className="text-red-500">*</span>
                                {isContextLocked && <Lock size={10} className="text-slate-400 ml-1" />}
                            </label>
                            {isContextLocked ? (
                                <div className="form-input bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-not-allowed">
                                    {contextName || mappedProducts.find(p => String(p.id) === urlProductId)?.name || urlProductId}
                                    <input type="hidden" value={urlProductId} {...register('product_id', { required: 'Product is required' })} />
                                </div>
                            ) : (
                                <select
                                    {...register('product_id', { required: 'Product is required' })}
                                    className={clsx('form-select', errors.product_id && 'border-red-400')}
                                >
                                    <option value="">Select Product</option>
                                    {mappedProducts.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                            {errors.product_id && <p className="text-[10px] text-red-500 mt-1 font-medium">{(errors.product_id as any).message}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Partner Company <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="Org Name" {...register('partner_company', { required: 'Required' })}
                                className={clsx('form-input', errors.partner_company && 'border-red-400')} />
                            {errors.partner_company && <p className="text-[10px] text-red-500 mt-1 font-medium">Required</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Partner Name <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="Contact Name" {...register('name', { required: 'Required' })}
                                className={clsx('form-input', errors.name && 'border-red-400')} />
                            {errors.name && <p className="text-[10px] text-red-500 mt-1 font-medium">Required</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Region / Location</label>
                            <input type="text" placeholder="Dubai, UAE" {...register('region')} className="form-input" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Enquiry Initiated Date</label>
                            <div className="relative">
                                <DateOverlay value={watch('enquiry_interest_date')}>
                                    <input type="date" {...register('enquiry_interest_date')} className="form-input pr-28" onClick={handleDateClick} />
                                </DateOverlay>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
                                    <Clock size={10} />
                                    {calculateAge(enquiryDate)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Group 2: Timeline */}
                <div className="card p-6">
                    <SectionBar color="bg-indigo-600" title="2. Timeline Tracking" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="form-group">
                            <label className="form-label">Quadrant Allotted Date</label>
                            <DateOverlay value={watch('quadrant_allotted_date')}>
                                <input type="date" {...register('quadrant_allotted_date')} className="form-input" onClick={handleDateClick} />
                            </DateOverlay>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Age in Quadrant (Computed)</label>
                            <div className="form-input bg-slate-50 text-slate-500 cursor-not-allowed">{calculateAge(quadrantDate)}</div>
                        </div>
                    </div>
                </div>

                {/* Group 3: Scoring */}
                <div className="card p-6">
                    <SectionBar color="bg-amber-500" title="3. Scoring & Classification" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="form-group">
                            <label className="form-label">Current Lead Score</label>
                            <input type="number" {...register('current_lead_score')} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quadrant</label>
                            <select {...register('quadrant')} className="form-select">
                                <option value="Q1">Q1 (Interested)</option>
                                <option value="Q2">Q2 (Progressing)</option>
                                <option value="Q3">Q3 (Warm)</option>
                                <option value="Q4">Q4 (Hot)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Partner Type</label>
                            <select {...register('partner_type')} className="form-select">
                                <option value="">Select Type</option>
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Client Opportunity?</label>
                            <select {...register('current_end_client_opportunity')} className="form-select">
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Group 4: Milestones */}
                <div className="card p-6">
                    <SectionBar color="bg-emerald-500" title="4. Partner Activity (Milestones)" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { name: 'is_rfi_received',                   label: 'RFI Received from Partner' },
                            { name: 'is_business_plan_submitted',        label: 'Business Plan Submitted' },
                            { name: 'is_training_provided',             label: 'Training Provided to Sales Teams' },
                            { name: 'is_monthly_engagement_started',    label: 'Monthly Partner Engagement Started' },
                        ].map(field => (
                            <div key={field.name} className="card p-4 bg-slate-50/50 border border-slate-100">
                                <div className="form-group mb-0">
                                    <label className="form-label">{field.label}</label>
                                    <select {...register(field.name as any)} className="form-select">
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                        <div className="card p-4 bg-slate-50/50 border border-slate-100 space-y-3">
                            <div className="form-group mb-0">
                                <label className="form-label">BP Target Agreed by Partner</label>
                                <select {...register('is_business_plan_target_agreed')} className="form-select">
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                            {watch('is_business_plan_target_agreed') === 'Yes' && (
                                <div className="form-group mb-0">
                                    <label className="form-label">BP Target Value (Monthly)</label>
                                    <input type="number" {...register('business_plan_target_value')} className="form-input" placeholder="Enter target amount" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Group 5: Actions */}
                <div className="card p-6">
                    <SectionBar color="bg-violet-600" title="5. Actions & Metrics" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="form-group md:col-span-3">
                            <label className="form-label">Partner Action PoA (Notes)</label>
                            <textarea rows={3} placeholder="Immediate next steps..." {...register('partner_action_poa')} className="form-input resize-none" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">EDC (Est. Closure Date)</label>
                            <DateOverlay value={watch('edc')}>
                                <input type="date" {...register('edc')} className="form-input" onClick={handleDateClick} />
                            </DateOverlay>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Leads Moved to Quadrant</label>
                            <input type="number" {...register('active_leads_moved_to_quadrant')} className="form-input" />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={() => navigate('/partner-signup')} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" disabled={mutation.isPending} className="btn btn-primary disabled:opacity-50">
                        <Save size={15} />
                        {mutation.isPending ? 'Saving...' : isEdit ? 'Update Partner' : 'Complete Onboarding'}
                    </button>
                </div>
            </form>
        </div>
    );
}
