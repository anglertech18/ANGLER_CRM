import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, ArrowLeft, Info, Plus, UserPlus, Lock } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { AlertTimelineBuilder, type AlertStep } from '../../components/renewal/AlertTimelineBuilder';
import { SearchableSelect } from '../../components/shared/SearchableSelect';

interface FormState {
  client_company_id: number | '';
  service_master_id: number | '';
  identifier: string;
  provider_id: number | '';
  activation_date: string;
  expiry_date: string;
  amount_due: string;
  duration_value: number;
  duration_unit: string;
  assigned_user_id: number | '';
  customer_contact_id: number | '';
  remarks: string;
  use_master_price: boolean;
  email_count: number | '';
  provider_type: 'CLIENT_SERVER' | 'ANGLER_SERVER' | '';
  server_name: string;
}

const DEFAULT_ALERT_STEPS: AlertStep[] = [
  { days_before: 30, channel: 'EMAIL_DIRECT', email_template_id: null, step_number: 1 },
  { days_before: 15, channel: 'EMAIL_DRAFT', email_template_id: null, step_number: 2 },
  { days_before: 7, channel: 'CALL_TASK', email_template_id: null, step_number: 3 },
  { days_before: 0, channel: 'EMAIL_DIRECT', email_template_id: null, step_number: 4 },
];

const INITIAL: FormState = {
  client_company_id: '', service_master_id: '', identifier: '',
  provider_id: '', activation_date: dayjs().format('YYYY-MM-DD'),
  expiry_date: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  amount_due: '', duration_value: 12, duration_unit: 'months',
  assigned_user_id: '', customer_contact_id: '', remarks: '',
  use_master_price: true,
  email_count: '',
  provider_type: '',
  server_name: '',
};

export default function MappingForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [alertSteps, setAlertSteps] = useState<AlertStep[]>(DEFAULT_ALERT_STEPS);
  const [masterDefaultPrice, setMasterDefaultPrice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Quick Add Contact Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactMobile, setNewContactMobile] = useState('');
  const [newContactDesignation, setNewContactDesignation] = useState('');

  const set = (key: keyof FormState, val: any) => setForm(f => ({ ...f, [key]: val }));

  // Auto-calculate expiry date whenever activation_date, duration_value, or duration_unit changes!
  useEffect(() => {
    if (!form.activation_date || !form.duration_value || !form.duration_unit) return;
    const unit = (form.duration_unit as dayjs.ManipulateType) || 'months';
    const calcExpiry = dayjs(form.activation_date).add(form.duration_value, unit).format('YYYY-MM-DD');
    if (form.expiry_date !== calcExpiry) {
      setForm(f => ({ ...f, expiry_date: calcExpiry }));
    }
  }, [form.activation_date, form.duration_value, form.duration_unit]);

  // Masters
  const { data: clients = [] } = useQuery({ queryKey: ['client-companies'], queryFn: () => api.get('/masters/clientcompany').then(r => r.data) });
  const { data: services = [] } = useQuery({ queryKey: ['renewal-services'], queryFn: () => api.get('/renewal-masters/services').then(r => r.data) });
  const { data: providers = [] } = useQuery({ queryKey: ['renewal-providers'], queryFn: () => api.get('/renewal-masters/providers').then(r => r.data) });
  const { data: users = [] } = useQuery({ queryKey: ['users-list'], queryFn: () => api.get('/users?limit=200').then(r => r.data?.data ?? r.data) });
  const { data: templates = [] } = useQuery({ queryKey: ['renewal-templates-list'], queryFn: () => api.get('/renewal-templates?channel=EMAIL').then(r => r.data?.data ?? r.data) });

  // Contacts for selected client
  const { data: contacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ['renewal-contacts', form.client_company_id],
    queryFn: () => api.get(`/renewal-masters/contacts?clientId=${form.client_company_id}`).then(r => r.data?.data ?? (Array.isArray(r.data) ? r.data : [])),
    enabled: !!form.client_company_id,
  });

  // Load existing mapping if edit
  const { data: existing } = useQuery({
    queryKey: ['mapping-detail', id],
    queryFn: () => api.get(`/renewal-pricing/mappings/${id}`).then(r => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    const svc = existing;
    setForm({
      client_company_id: svc.renewal_account?.client_company?.id ?? svc.renewal_account?.client_company_id ?? '',
      service_master_id: svc.service_master_id,
      identifier: svc.identifier ?? '',
      provider_id: svc.provider_id ?? '',
      activation_date: svc.activation_date ? dayjs(svc.activation_date).format('YYYY-MM-DD') : '',
      expiry_date: svc.expiry_date ? dayjs(svc.expiry_date).format('YYYY-MM-DD') : '',
      amount_due: String(svc.amount_due ?? ''),
      duration_value: svc.duration_value ?? 12,
      duration_unit: svc.duration_unit ?? 'months',
      assigned_user_id: svc.assigned_user_id ?? '',
      customer_contact_id: svc.customer_contact_id ?? '',
      remarks: svc.remarks ?? '',
      use_master_price: false,
      email_count: svc.email_count ?? '',
      provider_type: svc.provider_type ?? '',
      server_name: svc.server_name ?? '',
    });

    // Pre-load alert steps: use custom alert steps if present, or fallback policy steps, or defaults!
    const loadedSteps: AlertStep[] = (svc.alert_steps && svc.alert_steps.length > 0)
      ? svc.alert_steps.map((st: any) => ({
          days_before: st.days_before ?? 30,
          channel: (st.channel === 'CALL' ? 'CALL_TASK' : st.channel === 'EMAIL_DRAFT' ? 'EMAIL_DRAFT' : 'EMAIL_DIRECT') as any,
          email_template_id: st.email_template_id ?? st.template_id ?? null,
          step_number: st.step_number ?? 1,
        }))
      : (svc.reminder_policy?.steps && svc.reminder_policy.steps.length > 0)
      ? svc.reminder_policy.steps.map((st: any) => ({
          days_before: st.offset_days ?? st.days_before ?? 30,
          channel: (st.channel === 'CALL' ? 'CALL_TASK' : st.channel === 'EMAIL_DRAFT' ? 'EMAIL_DRAFT' : 'EMAIL_DIRECT') as any,
          email_template_id: st.email_template_id ?? st.template_id ?? null,
          step_number: st.step_order ?? st.step_number ?? 1,
        }))
      : DEFAULT_ALERT_STEPS;

    setAlertSteps(loadedSteps);
  }, [existing]);

  // Fetch resolved/default price when service changes
  useEffect(() => {
    if (!form.service_master_id || !form.client_company_id) return;
    api.get(`/renewal-pricing/customer/${form.client_company_id}/service/${form.service_master_id}`)
      .then(r => {
        if (r.data.data) {
          setMasterDefaultPrice(`₹${Number(r.data.data.override_price).toLocaleString('en-IN')}/${r.data.data.billing_unit} (customer override)`);
          if (form.use_master_price) set('amount_due', String(r.data.data.override_price));
        } else {
          api.get(`/renewal-pricing/service/${form.service_master_id}/prices`).then(pr => {
            const current = pr.data.data?.find((p: any) => p.is_current);
            if (current) {
              setMasterDefaultPrice(`₹${Number(current.base_price).toLocaleString('en-IN')}/${current.billing_unit} (master default)`);
              if (form.use_master_price) set('amount_due', String(current.base_price));
            }
          });
        }
      })
      .catch(() => setMasterDefaultPrice(null));
  }, [form.service_master_id, form.client_company_id]);

  // Quick Add Contact Handler
  const handleQuickAddContact = async () => {
    if (!form.client_company_id || !newContactName) {
      toast.error('Customer and Contact Name are required');
      return;
    }
    try {
      const res = await api.post('/renewal-masters/contacts', {
        client_company_id: form.client_company_id,
        name: newContactName,
        email: newContactEmail || undefined,
        mobile: newContactMobile || undefined,
        designation: newContactDesignation || undefined,
      });
      toast.success('New contact added!');
      refetchContacts();
      if (res.data?.data?.id) {
        set('customer_contact_id', res.data.data.id);
      }
      setShowAddContactModal(false);
      setNewContactName(''); setNewContactEmail(''); setNewContactMobile('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add contact');
    }
  };

  const handleSave = async () => {
    if (!form.client_company_id || !form.service_master_id || !form.expiry_date) {
      toast.error('Customer, Service and Expiry Date are required');
      return;
    }
    setSaving(true);
    try {
      const selectedClient = clients.find((c: any) => c.id === Number(form.client_company_id));

      if (isEdit && id) {
        // Update existing service instance
        await api.put(`/renewals/${existing?.renewal_account_id || 1}/services/${id}`, {
          identifier: form.identifier || null,
          provider_id: form.provider_id || null,
          activation_date: form.activation_date ? new Date(form.activation_date).toISOString() : null,
          expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
          amount_due: parseFloat(form.amount_due) || 0,
          duration_value: form.duration_value,
          duration_unit: form.duration_unit,
          assigned_user_id: form.assigned_user_id || null,
          customer_contact_id: form.customer_contact_id || null,
          remarks: form.remarks || null,
          email_count: form.email_count !== '' ? Number(form.email_count) : null,
          provider_type: form.provider_type || null,
          server_name: form.server_name || null,
        });
        // Save alert steps
        await api.put(`/renewal-pricing/mappings/${id}/alert-steps`, { steps: alertSteps });
        toast.success('Mapping updated successfully!');
        qc.invalidateQueries({ queryKey: ['service-mappings'] });
        navigate('/renewals/mappings');
      } else {
        // Create: find or create RenewalAccount for this client, then add service
        let accountId: number;
        const existingAcc = await api.get(`/renewals?clientCompanyId=${form.client_company_id}&limit=1`).then(r => r.data?.data?.[0]);
        if (existingAcc) {
          accountId = existingAcc.id;
        } else {
          const acc = await api.post('/renewals', {
            client_company_id: form.client_company_id,
            notes: `Auto-created for ${selectedClient?.name}`,
          });
          accountId = acc.data.id;
        }

        const svc = await api.post(`/renewals/${accountId}/services`, {
          service_master_id: form.service_master_id,
          identifier: form.identifier || null,
          provider_id: form.provider_id || null,
          activation_date: form.activation_date ? new Date(form.activation_date).toISOString() : null,
          expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
          amount_due: parseFloat(form.amount_due) || 0,
          duration_value: form.duration_value,
          duration_unit: form.duration_unit,
          assigned_user_id: form.assigned_user_id || null,
          customer_contact_id: form.customer_contact_id || null,
          remarks: form.remarks || null,
          status: 'ACTIVE',
          email_count: form.email_count !== '' ? Number(form.email_count) : null,
          provider_type: form.provider_type || null,
          server_name: form.server_name || null,
        });

        // Save alert steps for new service instance
        if (alertSteps.length > 0) {
          await api.put(`/renewal-pricing/mappings/${svc.data.id}/alert-steps`, { steps: alertSteps });
        }

        toast.success('Mapping created successfully!');
        qc.invalidateQueries({ queryKey: ['service-mappings'] });
        navigate('/renewals/mappings');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const serviceOptions = services.map((s: any) => ({
    ...s,
    label: `${s.name} (${s.category?.name ?? ''})`,
  }));

  const clientOptions = clients.map((c: any) => ({ value: c.id, label: c.name }));
  const serviceSelOptions = serviceOptions.map((s: any) => ({ value: s.id, label: s.label }));
  const providerOptions = providers.map((p: any) => ({ value: p.id, label: p.name }));
  const userOptions = users.map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name || ''}`.trim() }));
  const contactOptions = contacts.map((c: any) => ({ value: c.id, label: `${c.name} (${c.designation || 'Contact'})` }));

  const selectedService = services.find((s: any) => s.id === Number(form.service_master_id));

  return (
    <div className="page-wrapper space-y-4">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-ghost">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Service Mapping' : 'New Service Mapping'}</h1>
            <p className="page-subtitle">Configure client service instance, pricing, contacts, and reminder alert steps.</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary font-bold shadow-md px-5 py-2">
          <Save size={14} /> {saving ? 'Saving...' : 'Save Mapping'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column — Form Fields */}
        <div className="space-y-4">

          {/* Section 1: Customer & Service (Prominent Customer Contact Selector) */}
          <div className="card px-5 py-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Customer & Service Selection</h3>
            
            <div className="space-y-3">
              <div>
                <label className="form-label font-bold text-slate-700">Customer Company *</label>
                <SearchableSelect
                  options={clientOptions}
                  value={form.client_company_id}
                  onChange={val => { set('client_company_id', val || ''); set('customer_contact_id', ''); }}
                  placeholder="Search & select customer company..."
                />
              </div>

              {/* Prominent Linked Customer Contact Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label font-bold text-slate-700">Customer Contact Person *</label>
                  {form.client_company_id && (
                    <button
                      type="button"
                      onClick={() => setShowAddContactModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <UserPlus size={12} /> Add Contact
                    </button>
                  )}
                </div>
                <SearchableSelect
                  options={contactOptions}
                  value={form.customer_contact_id}
                  onChange={val => set('customer_contact_id', val || '')}
                  placeholder={form.client_company_id ? "Select customer contact..." : "Select customer company first"}
                  disabled={!form.client_company_id}
                />
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">Service Master *</label>
                <SearchableSelect
                  options={serviceSelOptions}
                  value={form.service_master_id}
                  onChange={val => set('service_master_id', val || '')}
                  placeholder="Search & select service master..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label font-bold text-slate-700">{selectedService?.identifier_label ?? 'Domain / Identifier'}</label>
                  <input value={form.identifier} onChange={e => set('identifier', e.target.value)} placeholder="e.g. clientdomain.com" className="form-input text-xs" />
                </div>
                <div>
                  <label className="form-label font-bold text-slate-700">Provider</label>
                  <SearchableSelect
                    options={providerOptions}
                    value={form.provider_id}
                    onChange={val => set('provider_id', val || '')}
                    placeholder="Select provider"
                  />
                </div>
              </div>

              {/* Conditional Email count for EMAIL category */}
              {selectedService?.category?.code === 'EMAIL' && (
                <div>
                  <label className="form-label font-bold text-slate-700">Email IDs Count</label>
                  <input
                    type="number"
                    min={0}
                    value={form.email_count}
                    onChange={e => set('email_count', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    placeholder="Number of mailboxes (e.g. 10)"
                    className="form-input text-xs"
                  />
                </div>
              )}

              {/* Conditional Server Provider Type for AMC / SUPPORT */}
              {(selectedService?.category?.code === 'AMC' || selectedService?.category?.code === 'SUPPORT') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label font-bold text-slate-700">Server Provider Type</label>
                    <select
                      value={form.provider_type}
                      onChange={e => {
                        const val = e.target.value as any;
                        set('provider_type', val);
                        if (val !== 'ANGLER_SERVER') set('server_name', '');
                      }}
                      className="form-select text-xs"
                    >
                      <option value="">Select Type</option>
                      <option value="CLIENT_SERVER">Client's Server</option>
                      <option value="ANGLER_SERVER">Angler's Server</option>
                    </select>
                  </div>
                  {form.provider_type === 'ANGLER_SERVER' && (
                    <div>
                      <label className="form-label font-bold text-slate-700">Server Name</label>
                      <input
                        type="text"
                        value={form.server_name}
                        onChange={e => set('server_name', e.target.value)}
                        placeholder="e.g. VPS-01, AWS-S3"
                        className="form-input text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Service Period (With Auto-Calculated & Locked Expiry Date) */}
          <div className="card px-5 py-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Service Period</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label font-bold text-slate-700">Start Date</label>
                <input type="date" value={form.activation_date} onChange={e => set('activation_date', e.target.value)} className="form-input text-xs" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label font-bold text-slate-700 flex items-center gap-1">
                    Expiry Date <Lock size={11} className="text-slate-400" />
                  </label>
                  <span className="text-[9px] text-blue-600 font-bold">(Auto-calculated)</span>
                </div>
                <input
                  type="date"
                  value={form.expiry_date}
                  readOnly
                  className="form-input text-xs bg-slate-50 font-bold text-blue-950 border-slate-200 cursor-not-allowed"
                />
              </div>
              <div className="col-span-2">
                <label className="form-label font-bold text-slate-700">Duration</label>
                <div className="flex gap-2">
                  <input type="number" min={1} value={form.duration_value} onChange={e => set('duration_value', parseInt(e.target.value) || 1)} className="form-input text-xs w-24 text-center font-bold" />
                  <select value={form.duration_unit} onChange={e => set('duration_unit', e.target.value)} className="form-select text-xs flex-1 font-semibold">
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pricing */}
          <div className="card px-5 py-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Pricing Configuration</h3>
            {masterDefaultPrice && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Info size={13} className="text-blue-600 flex-shrink-0" />
                <span>Resolved: <strong>{masterDefaultPrice}</strong></span>
              </div>
            )}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.use_master_price}
                onChange={e => {
                  set('use_master_price', e.target.checked);
                  if (e.target.checked && masterDefaultPrice) {
                    const match = masterDefaultPrice.match(/₹([\d,]+)/);
                    if (match) set('amount_due', match[1].replace(/,/g, ''));
                  }
                }}
                className="rounded border-slate-300"
              />
              Use resolved price (auto-filled from master/override)
            </label>
            <div>
              <label className="form-label font-bold text-slate-700">Custom Resolved Price</label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-xs font-semibold">₹</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount_due}
                  disabled={form.use_master_price}
                  onChange={e => set('amount_due', e.target.value)}
                  className={clsx(
                    'form-input text-xs pl-7 font-bold text-slate-800',
                    form.use_master_price && 'bg-slate-50 text-slate-400'
                  )}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Assignment & Remarks */}
          <div className="card px-5 py-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Internal Assignment</h3>
            <div>
              <label className="form-label font-bold text-slate-700">Assigned Renewal Executive</label>
              <SearchableSelect
                options={userOptions}
                value={form.assigned_user_id}
                onChange={val => set('assigned_user_id', val || '')}
                placeholder="Select internal executive..."
              />
            </div>
            <div>
              <label className="form-label font-bold text-slate-700">Remarks / Service Notes</label>
              <textarea rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} className="form-input text-xs resize-none rounded-xl" placeholder="Optional notes..." />
            </div>
          </div>
        </div>

        {/* Right column — Alert Steps Builder (Auto-filled with Default 4 Steps) */}
        <div>
          <div className="card px-5 py-4 border border-slate-200 shadow-sm space-y-3 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Alert Steps Sequence</h3>
                <p className="text-[10px] text-slate-400">Auto-filled default 4-step sequence (customizable per client)</p>
              </div>
              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                {alertSteps.length} Steps Defined
              </span>
            </div>

            <AlertTimelineBuilder
              steps={alertSteps}
              templates={templates}
              onChange={setAlertSteps}
            />
          </div>
        </div>
      </div>

      {/* Quick Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><UserPlus size={16} className="text-blue-600" /> Add New Customer Contact</h3>
              <button type="button" onClick={() => setShowAddContactModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="form-label font-bold text-slate-700">Full Name *</label>
                <input type="text" placeholder="e.g. Ramesh Venkatesan" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="form-input text-xs" />
              </div>
              <div>
                <label className="form-label font-bold text-slate-700">Designation</label>
                <input type="text" placeholder="e.g. IT Manager, CTO" value={newContactDesignation} onChange={e => setNewContactDesignation(e.target.value)} className="form-input text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label font-bold text-slate-700">Email</label>
                  <input type="email" placeholder="ramesh@client.com" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="form-input text-xs" />
                </div>
                <div>
                  <label className="form-label font-bold text-slate-700">Mobile</label>
                  <input type="tel" placeholder="+91 98765 43210" value={newContactMobile} onChange={e => setNewContactMobile(e.target.value)} className="form-input text-xs" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddContactModal(false)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold rounded-xl">Cancel</button>
              <button type="button" onClick={handleQuickAddContact} className="btn btn-primary text-xs py-2 px-5 font-bold shadow-md rounded-xl">Add Contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
