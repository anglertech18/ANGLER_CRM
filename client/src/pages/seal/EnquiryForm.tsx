import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Save, Globe, User, MessageSquare, ClipboardList, Package, Lock } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import DateOverlay from '../../components/DateOverlay';

interface MappedItem {
    id: number | string;
    name: string;
}

function SectionHeader({ icon: Icon, title, color = 'text-primary-600' }: { icon: any; title: string; color?: string }) {
    return (
        <div className={clsx('flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-5 pb-3 border-b border-slate-100', color)}>
            <Icon size={13} />
            {title}
        </div>
    );
}

export default function EnquiryForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const isEdit = !!id;

    // Context lock: when navigating from tracker with product in URL
    const urlProductId   = searchParams.get('product_id') || '';
    const contextName    = searchParams.get('context_name') || '';
    const isContextLocked = !isEdit && !!urlProductId;

    const [formData, setFormData] = useState<any>({
        date: dayjs().format('YYYY-MM-DD'),
        lead_source_id: '',
        country_id: '',
        state_id: '',
        city_id: '',
        company_name: '',
        contact_name: '',
        mobile_number: '',
        email: '',
        requirement: '',
        lead_qualification: '',
        validated_by_id: '',
        allocated_to_id: '',
        enquiry_allocated_to: '',
        product_id: '',
        linkedin_status: '',
        sales_stage_id: '',
        remarks: '',
        frequency: '',
        name: '',
        mktg_effectiveness: '',
        converted_to: ''
    });

    const [errors, setErrors] = useState<any>({});

    // Mapped products for the logged-in user
    const { data: mappedItems = [] } = useQuery<MappedItem[]>({
        queryKey: ['poas', 'mapped-products'],
        queryFn: () => api.get('/seal/poas/mapped-products').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const { data: leadSources = [] } = useQuery({ queryKey: ['masters', 'leadsource'], queryFn: () => api.get('/masters/leadsource').then(r => r.data) });
    const { data: countries = [] }   = useQuery({ queryKey: ['masters', 'country'],    queryFn: () => api.get('/masters/country').then(r => r.data) });
    const { data: states = [] } = useQuery({
        queryKey: ['masters', 'state', formData.country_id],
        queryFn: () => api.get(`/masters/state?country_id=${formData.country_id}`).then(r => r.data),
        enabled: !!formData.country_id
    });
    const { data: cities = [] } = useQuery({
        queryKey: ['masters', 'city', formData.state_id],
        queryFn: () => api.get(`/masters/city?state_id=${formData.state_id}`).then(r => r.data),
        enabled: !!formData.state_id
    });
    const { data: users = [] } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => api.get('/users', { params: { all: 'true' } }).then(r => r.data),
        staleTime: 30000
    });
    const { data: salesStages = [] } = useQuery({ queryKey: ['masters', 'salesstage'], queryFn: () => api.get('/masters/salesstage').then(r => r.data) });

    const { data: initialEnquiry, isLoading: isEnquiryLoading } = useQuery({
        queryKey: ['enquiry', id],
        queryFn: () => api.get(`/enquiries/${id}`).then(r => r.data),
        enabled: isEdit
    });

    // Pre-fill product from URL context on create
    useEffect(() => {
        if (!isEdit && urlProductId) {
            setFormData((prev: any) => ({ ...prev, product_id: urlProductId }));
        }
    }, [isEdit, urlProductId]);

    // Auto-select first mapped product for new enquiries
    // Note: allocated_to_id (Lead Allocated To) is intentionally left empty — optional field

    useEffect(() => {
        if (!isEdit && !isContextLocked && mappedItems.length > 0 && !formData.product_id) {
            setFormData((prev: any) => ({ ...prev, product_id: String(mappedItems[0].id) }));
        }
    }, [isEdit, isContextLocked, mappedItems]);

    // Populate form when editing
    useEffect(() => {
        if (initialEnquiry) {
            setFormData({
                ...initialEnquiry,
                date: dayjs(initialEnquiry.date).format('YYYY-MM-DD'),
                lead_source_id:        initialEnquiry.lead_source_id        || '',
                country_id:            initialEnquiry.country_id            || '',
                state_id:              initialEnquiry.state_id              || '',
                city_id:               initialEnquiry.city_id               || '',
                validated_by_id:       initialEnquiry.validated_by_id       || '',
                allocated_to_id:       initialEnquiry.allocated_to_id       || '',
                enquiry_allocated_to:  initialEnquiry.enquiry_allocated_to  || '',
                product_id:            initialEnquiry.product_id            || '',
                sales_stage_id:        initialEnquiry.sales_stage_id        || '',
                converted_to:          initialEnquiry.converted_to || (initialEnquiry.is_converted ? 'Lead' : ''),
            });
        }
    }, [initialEnquiry]);

    const mutation = useMutation({
        mutationFn: (data: any) => isEdit
            ? api.put(`/enquiries/${id}`, data)
            : api.post('/enquiries', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enquiries'] });
            navigate('/seal/enquiry-tracker');
        },
        onError: (err: any) => {
            const resp = err.response?.data;
            const detail = resp?.details || resp?.message || err.message;
            alert('Error saving enquiry: ' + detail);
        }
    });

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev: any) => {
            const updates: any = { [name]: type === 'checkbox' ? checked : value };
            if (name === 'country_id') { updates.state_id = ''; updates.city_id = ''; }
            else if (name === 'state_id') { updates.city_id = ''; }
            return { ...prev, ...updates };
        });
        if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: null }));
    };


    const handleSubmit = (e: any) => {
        e.preventDefault();
        const newErrors: any = {};
        if (!formData.company_name) newErrors.company_name = 'Required';
        if (!formData.contact_name) newErrors.contact_name = 'Required';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
        mutation.mutate(formData);
    };

    if (isEdit && isEnquiryLoading) return (
        <div className="page-wrapper">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card p-6">
                        <div className="skeleton h-4 w-32 rounded mb-4" />
                        <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, j) => <div key={j} className="skeleton h-9 rounded-lg" />)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const inputCls = (name: string) => clsx(
        'form-input',
        errors[name] && 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
    );


    return (
        <div className="page-wrapper max-w-5xl">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/seal/enquiry-tracker')}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <ClipboardList size={14} className="text-primary-600" />
                        </div>
                        <div>
                            <h1 className="page-title">{isEdit ? 'Edit Enquiry' : 'Add New Enquiry'}</h1>
                            <p className="page-subtitle">
                                {isContextLocked && contextName
                                    ? <>Scoped to: <span className="font-semibold text-primary-600">{contextName}</span></>
                                    : 'Capture detailed enquiry information for the tracker'
                                }
                            </p>
                        </div>
                    </div>
                </div>
              
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Section 1: Sourcing & Location */}
                <div className="card p-6">
                    <SectionHeader icon={Globe} title="Sourcing & Location" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <DateOverlay value={formData.date}>
                                <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputCls('date')} />
                            </DateOverlay>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lead Source</label>
                            <select name="lead_source_id" value={formData.lead_source_id} onChange={handleChange} className="form-select">
                                <option value="">Select Source</option>
                                {leadSources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Country</label>
                            <select name="country_id" value={formData.country_id} onChange={handleChange} className="form-select">
                                <option value="">Select Country</option>
                                {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">State</label>
                            <select name="state_id" value={formData.state_id} onChange={handleChange} disabled={!formData.country_id} className="form-select disabled:opacity-50">
                                <option value="">Select State</option>
                                {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <select name="city_id" value={formData.city_id} onChange={handleChange} disabled={!formData.state_id} className="form-select disabled:opacity-50">
                                <option value="">Select City</option>
                                {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Company & Contact */}
                <div className="card p-6">
                    <SectionHeader icon={User} title="Company & Contact Details" color="text-indigo-600" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Company Name <span className="text-red-500">*</span></label>
                            <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} placeholder="e.g. Acme Corp" className={inputCls('company_name')} />
                            {errors.company_name && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.company_name}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Name <span className="text-red-500">*</span></label>
                            <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} placeholder="Full Name" className={inputCls('contact_name')} />
                            {errors.contact_name && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.contact_name}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mobile Number</label>
                            <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleChange} placeholder="+1..." className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className="form-input" />
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Requirement</label>
                            <textarea name="requirement" value={formData.requirement} onChange={handleChange} rows={2} className="form-input resize-none" placeholder="Primary needs and pain points..." />
                        </div>
                    </div>
                </div>

                {/* Section 3: Lead Allocation */}
                <div className="card p-6">
                    <SectionHeader icon={User} title="Lead Allocation" color="text-blue-600" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Enquiry Allocated To <span className="text-slate-400 text-[10px] font-normal">(optional)</span></label>
                            <select name="enquiry_allocated_to" value={formData.enquiry_allocated_to} onChange={handleChange} className="form-select">
                                <option value="">— Select User —</option>
                                {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 4: Sales Team */}
                <div className="card p-6">
                    <SectionHeader icon={MessageSquare} title="Sales Team" color="text-emerald-600" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="form-group">
                            <label className="form-label">Lead Qualification</label>
                            <select name="lead_qualification" value={formData.lead_qualification} onChange={handleChange} className="form-select">
                                <option value="">Select Status</option>
                                <option value="Lead Qualification In Progress">Lead Qualification In Progress</option>
                                <option value="Quadrant">Quadrant</option>
                                <option value="Nurturing">Nurturing</option>
                                <option value="Invalid">Invalid</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Validated By</label>
                            <select name="validated_by_id" value={formData.validated_by_id} onChange={handleChange} className="form-select">
                                <option value="">Select User</option>
                                {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lead Allocated To</label>
                            <select name="allocated_to_id" value={formData.allocated_to_id} onChange={handleChange} className="form-select">
                                <option value="">Select User</option>
                                {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                            </select>
                        </div>


                        {/* Product — locked when coming from tracker context */}
                        <div className="form-group">
                            <label className="form-label flex items-center gap-1">
                                {isContextLocked ? <Lock size={10} className="text-primary-500" /> : <Package size={10} />}
                                Product
                            </label>
                            {isContextLocked ? (
                                <div className="flex items-center gap-2 h-9 px-3 bg-primary-50 border border-primary-200 rounded-lg cursor-not-allowed">
                                    <Package size={13} className="text-primary-600 shrink-0" />
                                    <span className="text-sm font-semibold text-primary-700 truncate">{contextName}</span>
                                    <span className="ml-auto text-[9px] font-bold text-primary-400 uppercase tracking-wide shrink-0">Locked</span>
                                </div>
                            ) : (
                                <select
                                    name="product_id"
                                    value={formData.product_id}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">— Select Product —</option>
                                    {mappedItems.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">LinkedIn Connection Status</label>
                            <select name="linkedin_status" value={formData.linkedin_status} onChange={handleChange} className="form-select">
                                <option value="">Select Status</option>
                                <option value="Yet Connect">Yet Connect</option>
                                <option value="Sent">Sent</option>
                                <option value="Received">Received</option>
                                <option value="Not Available">Not Available</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sales Stage</label>
                            <select name="sales_stage_id" value={formData.sales_stage_id} onChange={handleChange} className="form-select">
                                <option value="">Select Stage</option>
                                {salesStages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Remarks</label>
                            <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Additional context..." className="form-input" />
                        </div>
                    </div>
                </div>

                {/* Section 4: MKTG Review */}
                {/* <div className="card p-6 bg-slate-50/50">
                    <SectionHeader icon={CheckCircle2} title="MKTG Team Effectiveness Review" color="text-slate-600" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                            <label className="form-label">Frequency</label>
                            <select name="frequency" value={formData.frequency} onChange={handleChange} className="form-select">
                                <option value="">Select Week</option>
                                <option value="Week 1">Week 1</option>
                                <option value="Week 2">Week 2</option>
                                <option value="Week 3">Week 3</option>
                                <option value="Week 4">Week 4</option>
                                <option value="Week 5">Week 5</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Name (Source/Verifier)</label>
                            <select name="name" value={formData.name} onChange={handleChange} className="form-select">
                                <option value="">Select BDE / User</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={`${u.first_name} ${u.last_name || ''}`.trim()}>
                                        {u.first_name} {u.last_name || ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">MKTG Effectiveness Review</label>
                            <select name="mktg_effectiveness" value={formData.mktg_effectiveness} onChange={handleChange} className="form-select">
                                <option value="">Select Option</option>
                                <option value="Excellent">Excellent</option>
                                <option value="Good">Good</option>
                                <option value="Average">Average</option>
                                <option value="Poor">Poor</option>
                            </select>
                        </div>
                       
                    </div>
                </div> */}
                 <div className="form-group">
                            <label className="form-label">Enquiry Converted To</label>
                            <select name="converted_to" value={formData.converted_to} onChange={handleChange} className="form-select">
                                <option value="">Not Converted</option>
                                <option value="Lead">Lead</option>
                                <option value="CallTracker">Call Tracker</option>
                            </select>
                        </div>

                        <div className="save-btn text-end">
                              <button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className="btn btn-primary disabled:opacity-50"
                >
                    <Save size={15} />
                    {mutation.isPending ? 'Saving...' : 'Save Record'}
                </button>
                        </div>
            </form>
        </div>
    );
}
