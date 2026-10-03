import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
    ArrowLeft, Save, Info, Calendar, Phone, Mail,
    MapPin, Linkedin, Briefcase, CheckCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import DateOverlay from '../../components/DateOverlay';

/* ── Section card heading ── */
const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="card-header">
        <div className="flex items-center gap-2">
            <Icon size={15} className="text-primary-600" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h2>
        </div>
    </div>
);

export default function CallTrackerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const isUpdateMode = location.pathname.includes('/update');

    const currentUserId = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return null; }
    }, []);

    const [formData, setFormData] = useState<any>({
        date: dayjs().format('YYYY-MM-DD'),
        product_id: '',
        industry_id: '',
        lead_source_id: '',
        source_of_db_id: '',
        company_name: '',
        location: '',
        contact_person_name: '',
        designation: '',
        email_address: '',
        personal_email: '',
        mobile_no: '',
        business_potential: '',
        email_status_id: '',
        linkedin_sent: false,
        call_status_id: '',
        remarks: '',
        next_follow_up_date: '',
        follow_up_note: '',
        follow_up_status: 'Pending',
        pipeline_action: ''
    });
    const [errors, setErrors] = useState<any>({});

    /* ── User's mapped products ── */
    const { data: userTargets } = useQuery({
        queryKey: ['user-targets', currentUserId],
        queryFn: () => api.get(`/users/${currentUserId}/targets`).then(r => r.data),
        enabled: !!currentUserId
    });

    const myProducts = useMemo(() =>
        (userTargets?.productTargets || []).map((pt: any) => pt.product).filter((p: any) => p?.is_active),
        [userTargets]
    );

    /* ── Masters ── */
    const { data: industries }   = useQuery({ queryKey: ['masters', 'industry'],    queryFn: () => api.get('/masters/industry').then(r => r.data) });
    const { data: leadSources }  = useQuery({ queryKey: ['masters', 'leadsource'],  queryFn: () => api.get('/masters/leadsource').then(r => r.data) });
    const { data: dbSources }    = useQuery({ queryKey: ['masters', 'sourceofdb'],  queryFn: () => api.get('/masters/sourceofdb').then(r => r.data) });
    const { data: callStatuses } = useQuery({ queryKey: ['masters', 'callstatus'],  queryFn: () => api.get('/masters/callstatus').then(r => r.data) });
    const { data: emailStatuses }= useQuery({ queryKey: ['masters', 'emailstatus'], queryFn: () => api.get('/masters/emailstatus').then(r => r.data) });

    /* ── Fetch existing call for edit/update ── */
    const { data: initialCall, isLoading: isCallLoading } = useQuery({
        queryKey: ['call-tracker', id],
        queryFn: () => api.get(`/call-tracker/${id}`).then(r => r.data),
        enabled: !!id
    });

    // Auto-select first mapped product for new call entries
    useEffect(() => {
        if (!id && myProducts.length > 0 && !formData.product_id) {
            setFormData((prev: any) => ({ ...prev, product_id: String(myProducts[0].id) }));
        }
    }, [id, myProducts]);

    useEffect(() => {
        if (initialCall) {
            setFormData({
                date: dayjs(initialCall.date).format('YYYY-MM-DD'),
                product_id: initialCall.product_id ? String(initialCall.product_id) : '',
                industry_id: initialCall.industry_id || '',
                lead_source_id: initialCall.lead_source_id || '',
                source_of_db_id: initialCall.source_of_db_id || '',
                company_name: initialCall.company_name || '',
                location: initialCall.location || '',
                contact_person_name: initialCall.contact_person_name || '',
                designation: initialCall.designation || '',
                email_address: initialCall.email_address || '',
                personal_email: initialCall.personal_email || '',
                mobile_no: initialCall.mobile_no || '',
                business_potential: initialCall.business_potential || '',
                email_status_id: initialCall.email_status_id || '',
                linkedin_sent: initialCall.linkedin_sent || false,
                call_status_id: initialCall.call_status_id || '',
                remarks: initialCall.remarks || '',
                next_follow_up_date: initialCall.next_follow_up_date ? dayjs(initialCall.next_follow_up_date).format('YYYY-MM-DD') : '',
                follow_up_note: initialCall.follow_up_note || '',
                follow_up_status: initialCall.follow_up_status || 'Pending',
                pipeline_action: initialCall.pipeline_action || '',
            });
        }
    }, [initialCall]);

    const mutation = useMutation({
        mutationFn: (vars: any) => {
            if (id && !isUpdateMode) return api.put(`/call-tracker/${id}`, vars);
            return api.post('/call-tracker', vars);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['call-tracker'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['enquiries'] });
            if (formData.pipeline_action === 'Quadrant') {
                toast.success('Lead created successfully from Call Tracker.');
            } else if (formData.pipeline_action === 'Nurturing') {
                toast.success('Lead created in Nurturing from Call Tracker.');
            } else if (formData.pipeline_action === 'Enquiry') {
                toast.success('Enquiry created successfully from Call Tracker.');
            }
            navigate('/call-management/tracker');
        },
        onError: (err: any) => {
            alert('Error saving call: ' + (err.response?.data?.message || err.message));
        }
    });

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const newErrors: any = {};
        if (!formData.company_name?.trim()) newErrors.company_name = 'Company Name is required';
        if (!formData.product_id) newErrors.product_id = 'Product is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildPayload = () => {
        const payload: any = {
            date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
            company_name: formData.company_name,
            location: formData.location || null,
            contact_person_name: formData.contact_person_name || null,
            designation: formData.designation || null,
            email_address: formData.email_address || null,
            personal_email: formData.personal_email || null,
            mobile_no: formData.mobile_no || null,
            business_potential: formData.business_potential || null,
            linkedin_sent: formData.linkedin_sent || false,
            remarks: formData.remarks || null,
            next_follow_up_date: formData.next_follow_up_date ? new Date(formData.next_follow_up_date).toISOString() : null,
            follow_up_note: formData.follow_up_note || null,
            follow_up_status: formData.follow_up_status || 'Pending',
            pipeline_action: formData.pipeline_action || null,
            product_id: formData.product_id ? parseInt(formData.product_id) : null,
            industry_id: formData.industry_id ? parseInt(formData.industry_id) : null,
            lead_source_id: formData.lead_source_id ? parseInt(formData.lead_source_id) : null,
            source_of_db_id: formData.source_of_db_id ? parseInt(formData.source_of_db_id) : null,
            call_status_id: formData.call_status_id ? parseInt(formData.call_status_id) : null,
            email_status_id: formData.email_status_id ? parseInt(formData.email_status_id) : null,
        };
        return payload;
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        if (!validateForm()) return;
        mutation.mutate(buildPayload());
    };

    const callStatusName = callStatuses?.find((s: any) => s.id === parseInt(formData.call_status_id))?.name;
    const isFollowUpRequired = callStatusName === 'Follow Up Required';

    if (id && isCallLoading) return (
        <div className="page-wrapper max-w-4xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="space-y-6">
                {[1, 2, 3].map(i => <div key={i} className="card p-6 space-y-4">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="grid grid-cols-2 gap-4">
                        {[1,2,3,4].map(j => <div key={j} className="skeleton h-10 rounded-lg" />)}
                    </div>
                </div>)}
            </div>
        </div>
    );

    return (
        <div className="page-wrapper max-w-4xl">
            {/* ── Header ── */}
            <div className="page-header mb-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/call-management/tracker')}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="page-title">
                            {isUpdateMode ? 'Call Update' : (id ? 'Edit Call Entry' : 'New Call Entry')}
                        </h1>
                        <p className="page-subtitle">
                            {isUpdateMode ? 'Create a new entry based on this call' : 'Enter prospect engagement details'}
                        </p>
                    </div>
                </div>
                
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Classification ── */}
                <div className="card">
                    <SectionHeader icon={Info} title="Classification" />
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="form-group">
                            <label className="form-label flex items-center gap-1"><Calendar size={11} />Call Date</label>
                            <DateOverlay value={formData.date}>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    onClick={(e) => (e.target as any).showPicker?.()}
                                    className="form-input"
                                />
                            </DateOverlay>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Product <span className="text-danger">*</span></label>
                            <select
                                name="product_id"
                                value={formData.product_id}
                                onChange={handleChange}
                                className={clsx('form-select', errors.product_id && 'form-input-error')}
                            >
                                <option value="">Select Product</option>
                                {myProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {errors.product_id && <p className="form-error">{errors.product_id}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Industry</label>
                            <select name="industry_id" value={formData.industry_id} onChange={handleChange} className="form-select">
                                <option value="">Select Industry</option>
                                {industries?.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lead Source</label>
                            <select name="lead_source_id" value={formData.lead_source_id} onChange={handleChange} className="form-select">
                                <option value="">Select Lead Source</option>
                                {leadSources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Source of Database</label>
                            <select name="source_of_db_id" value={formData.source_of_db_id} onChange={handleChange} className="form-select">
                                <option value="">Select Source</option>
                                {dbSources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Company & Contact ── */}
                <div className="card">
                    <SectionHeader icon={Briefcase} title="Company & Contact Details" />
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-group">
                                <label className="form-label">Company Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    placeholder="Enter company name"
                                    className={clsx('form-input', errors.company_name && 'form-input-error')}
                                />
                                {errors.company_name && <p className="form-error">{errors.company_name}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label flex items-center gap-1"><MapPin size={11} />Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="City / Region"
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-group">
                                <label className="form-label">Contact Person Name</label>
                                <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} placeholder="Full Name" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="Position" className="form-input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-group">
                                <label className="form-label flex items-center gap-1"><Mail size={11} />Company Email</label>
                                <input type="text" name="email_address" value={formData.email_address} onChange={handleChange} placeholder="company@example.com" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label flex items-center gap-1"><Mail size={11} />Personal Email</label>
                                <input type="text" name="personal_email" value={formData.personal_email} onChange={handleChange} placeholder="personal@example.com" className="form-input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-group">
                                <label className="form-label flex items-center gap-1"><Phone size={11} />Mobile No</label>
                                <input type="text" name="mobile_no" value={formData.mobile_no} onChange={handleChange} placeholder="Mobile Number" className="form-input" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Engagement & Outcome ── */}
                <div className="card">
                    <SectionHeader icon={Calendar} title="Engagement & Outcome" />
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-group">
                                <label className="form-label">Business Potential</label>
                                <input type="text" name="business_potential" value={formData.business_potential} onChange={handleChange} placeholder="Count / Value" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Status</label>
                                <select name="email_status_id" value={formData.email_status_id} onChange={handleChange} className="form-select">
                                    <option value="">Select Status</option>
                                    {emailStatuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                            {/* LinkedIn toggle */}
                            <label className={clsx(
                                'flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors',
                                formData.linkedin_sent
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            )}>
                                <div className="flex items-center gap-3">
                                    <Linkedin size={18} className={formData.linkedin_sent ? 'text-[#0A66C2]' : 'text-slate-400'} />
                                    <span className="text-sm font-medium text-slate-700">LinkedIn Connection Sent</span>
                                </div>
                                <input
                                    type="checkbox"
                                    name="linkedin_sent"
                                    checked={formData.linkedin_sent}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded text-primary-600 border-slate-300"
                                />
                            </label>

                            <div className="form-group">
                                <label className="form-label">Call Status</label>
                                <select name="call_status_id" value={formData.call_status_id} onChange={handleChange} className="form-select">
                                    <option value="">Select Call Status</option>
                                    {callStatuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Call summary, key points discussed..."
                                className="form-textarea"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                            <div className="form-group">
                                <label className="form-label text-amber-600">
                                    Next Follow Up Date {isFollowUpRequired && <span className="text-danger">*</span>}
                                </label>
                                <DateOverlay value={formData.next_follow_up_date}>
                                    <input
                                        type="date"
                                        name="next_follow_up_date"
                                        value={formData.next_follow_up_date}
                                        onChange={handleChange}
                                        onClick={(e) => e.currentTarget.showPicker()}
                                        min={dayjs().format('YYYY-MM-DD')}
                                        className="form-input border-amber-200 focus:ring-amber-200 focus:border-amber-400"
                                    />
                                </DateOverlay>
                            </div>
                            <div className="form-group">
                                <label className="form-label text-amber-600">Follow Up Status</label>
                                <select
                                    name="follow_up_status"
                                    value={formData.follow_up_status}
                                    onChange={handleChange}
                                    className="form-select border-amber-200 focus:ring-amber-200 focus:border-amber-400"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="InProgress">In Progress</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                            <div className="form-group md:col-span-2">
                                <label className="form-label text-amber-600">Follow Up Note</label>
                                <textarea
                                    name="follow_up_note"
                                    value={formData.follow_up_note}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Notes for the next follow-up..."
                                    className="form-textarea border-amber-200 focus:ring-amber-200 focus:border-amber-400"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label text-primary-600">Move to Pipeline</label>
                                <select name="pipeline_action" value={formData.pipeline_action} onChange={handleChange} className="form-select border-primary-200 focus:ring-primary-200">
                                    <option value="">Select</option>
                                    <option value="Quadrant">Move to Quadrant</option>
                                    <option value="Nurturing">Move to Nurturing</option>
                                    <option value="Enquiry">Move to Enquiry</option>
                                </select>
                                {formData.pipeline_action === 'Quadrant' && (
                                    <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1.5">
                                        <CheckCircle size={11} />
                                        Lead will be created automatically upon saving.
                                    </p>
                                )}
                                {formData.pipeline_action === 'Nurturing' && (
                                    <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1.5">
                                        <CheckCircle size={11} />
                                        Lead will be created with Quadrant and Sales Stage set to Nurturing.
                                    </p>
                                )}
                                {formData.pipeline_action === 'Enquiry' && (
                                    <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1.5">
                                        <CheckCircle size={11} />
                                        Record will be moved to the Enquiry Tracker upon saving.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                </div>
                <div className="flex items-center gap-2 justify-end">
                    <button type="button" onClick={() => navigate('/call-management/tracker')} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="btn btn-primary disabled:opacity-50"
                    >
                        <Save size={15} />
                        {mutation.isPending ? 'Saving…' : (isUpdateMode ? 'Save as New Record' : 'Save Entry')}
                    </button>
                </div>
            </form>
        </div>
    );
}
