import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Mail, Save, Plus, ShieldCheck, CheckCircle2, AlertCircle,
  Clock, ExternalLink, HelpCircle, Layers, User, Zap, ChevronRight,
  FolderPlus, Edit, Trash2, Check, RefreshCw, MessageSquare, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../../services/api';

import RenewalBulkUploadTab from './RenewalBulkUploadTab';

type Tab = 'policies' | 'subcategories' | 'brand-profiles' | 'email-templates' | 'gateway-health' | 'bulk-upload';

export default function RenewalSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('policies');
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [policyDraft, setPolicyDraft] = useState<any>(null);
  const [applyToPending, setApplyToPending] = useState(false);

  // Subcategory Modal State
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [subcatParentId, setSubcatParentId] = useState('');
  const [subcatName, setSubcatName] = useState('');
  const [subcatCode, setSubcatCode] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Fetch Policies
  const { data: policies = [] } = useQuery({
    queryKey: ['renewal-policies'],
    queryFn: () => api.get('/renewal-settings/policies').then(r => r.data),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['renewal-notification-templates'],
    queryFn: () => api.get('/renewal-settings/templates').then(r => r.data),
  });

  // Fetch Policy Versions
  const { data: policyVersions = [] } = useQuery({
    queryKey: ['renewal-policy-versions', selectedPolicyId],
    queryFn: () => selectedPolicyId ? api.get(`/renewal-settings/policies/${selectedPolicyId}/versions`).then(r => r.data) : [],
    enabled: !!selectedPolicyId,
  });

  // Fetch Categories & Subcategories
  const { data: categories = [], refetch: refetchCats } = useQuery({
    queryKey: ['renewal-categories'],
    queryFn: () => api.get('/renewal-masters/categories').then(r => r.data),
  });

  // Create Subcategory Mutation
  const createSubcatMutation = useMutation({
    mutationFn: (data: any) => api.post('/renewal-masters/categories', data),
    onSuccess: () => {
      toast.success('Subcategory created successfully!');
      refetchCats();
      setShowSubcatModal(false);
      setSubcatName('');
      setSubcatCode('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create subcategory'),
  });

  const selectedPolicy = policies.find((p: any) => p.id === selectedPolicyId) ?? policies[0];

  useEffect(() => {
    if (!selectedPolicyId && policies.length > 0) setSelectedPolicyId(policies[0].id);
  }, [policies, selectedPolicyId]);

  useEffect(() => {
    if (selectedPolicy) {
      setPolicyDraft({
        name: selectedPolicy.name || '',
        company_id: selectedPolicy.company_id ?? null,
        service_category_id: selectedPolicy.service_category_id ?? null,
        service_master_id: selectedPolicy.service_master_id ?? null,
        is_default: Boolean(selectedPolicy.is_default),
        use_business_days: Boolean(selectedPolicy.use_business_days),
        skip_weekends: Boolean(selectedPolicy.skip_weekends),
        timezone: selectedPolicy.timezone || 'Asia/Kolkata',
        steps: (selectedPolicy.steps || []).map((step: any) => ({ ...step })),
      });
      setApplyToPending(false);
    }
  }, [selectedPolicy]);

  const savePolicyMutation = useMutation({
    mutationFn: () => api.put(`/renewal-settings/policies/${selectedPolicyId}`, {
      ...policyDraft,
      apply_to_pending: applyToPending,
      change_reason: 'Updated from Reminder Settings',
    }),
    onSuccess: async () => {
      toast.success('Reminder policy and follow-up templates saved');
      await qc.invalidateQueries({ queryKey: ['renewal-policies'] });
      await qc.invalidateQueries({ queryKey: ['renewal-policy-versions', selectedPolicyId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to save policy'),
  });

  const createPolicyMutation = useMutation({
    mutationFn: (name: string) => api.post('/renewal-settings/policies', {
      name,
      timezone: 'Asia/Kolkata',
      is_default: false,
      steps: [],
    }),
    onSuccess: async (response) => {
      await qc.invalidateQueries({ queryKey: ['renewal-policies'] });
      setSelectedPolicyId(response.data.id);
      toast.success('New reminder policy created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create policy'),
  });

  const updateStep = (index: number, field: string, value: any) => {
    setPolicyDraft((current: any) => ({
      ...current,
      steps: current.steps.map((step: any, i: number) => i === index ? { ...step, [field]: value } : step),
    }));
  };

  const addStep = (preset: 'EXPIRY' | 'DEACTIVATION' = 'EXPIRY') => {
    const isDeactivation = preset === 'DEACTIVATION';
    setPolicyDraft((current: any) => ({
      ...current,
      steps: [...(current?.steps || []), {
        step_number: (current?.steps?.length || 0) + 1,
        offset_days: isDeactivation ? 3 : 0,
        relative_to: 'EXPIRY_DATE',
        action_type: isDeactivation ? 'DEACTIVATION' : 'EXPIRY_ALERT',
        channel: 'EMAIL',
        recipient_type: 'PRIMARY',
        template_id: null,
        escalate_after_days: null,
        escalate_to: null,
        is_mandatory: isDeactivation,
        is_enabled: true,
        attach_order_form: false,
      }],
    }));
  };

  const removeStep = (index: number) => setPolicyDraft((current: any) => ({
    ...current,
    steps: current.steps.filter((_: any, i: number) => i !== index)
      .map((step: any, i: number) => ({ ...step, step_number: i + 1 })),
  }));

  const moveStep = (index: number, direction: -1 | 1) => setPolicyDraft((current: any) => {
    const target = index + direction;
    if (target < 0 || target >= current.steps.length) return current;
    const steps = [...current.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    return { ...current, steps: steps.map((step: any, i: number) => ({ ...step, step_number: i + 1 })) };
  });

  return (
    <div className="page-wrapper space-y-5">
      {/* 1. Header Bar */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Reminder Settings & Masters</h1>
          <p className="page-subtitle">Configure reminder policies, subcategories, alert steps, brand profiles and communication templates.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => savePolicyMutation.mutate()}
            disabled={!selectedPolicyId || !policyDraft?.name || savePolicyMutation.isPending}
            className="btn btn-primary text-xs py-1.5 px-3"
          >
            <Save size={14} /> {savePolicyMutation.isPending ? 'Saving...' : 'Save Policy'}
          </button>
          <button onClick={() => setShowSubcatModal(true)} className="btn btn-ghost text-xs py-1.5 px-2.5 border border-slate-300">
            <FolderPlus size={14} /> + New Subcategory
          </button>
          <button onClick={() => navigate('/renewals/templates')} className="btn btn-ghost text-xs py-1.5 px-2.5 border border-slate-300">
            <Plus size={14} /> Create Template
          </button>
        </div>
      </div>

      {/* 2. Top Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('policies')}
          className={clsx('px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
            activeTab === 'policies' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}
        >
          <Bell size={14} /> Reminder Policies
        </button>
        <button
          onClick={() => setActiveTab('subcategories')}
          className={clsx('px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
            activeTab === 'subcategories' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}
        >
          <FolderPlus size={14} /> Subcategories Management
        </button>
        <button
          onClick={() => navigate('/settings/brand-profile')}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1.5"
        >
          <ShieldCheck size={14} /> Brand Profiles
        </button>
        <button
          onClick={() => navigate('/renewals/templates')}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1.5"
        >
          <Mail size={14} /> Email Templates
        </button>
        <button
          onClick={() => setActiveTab('gateway-health')}
          className={clsx('px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
            activeTab === 'gateway-health' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}
        >
          <Zap size={14} /> Gateway Health
        </button>
        <button
          onClick={() => setActiveTab('bulk-upload')}
          className={clsx('px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
            activeTab === 'bulk-upload' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}
        >
          <Layers size={14} /> Bulk Importer
        </button>
      </div>

      {/* 3. Subcategories Tab Content */}
      {activeTab === 'subcategories' ? (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Master Service Subcategories</h3>
              <p className="text-xs text-slate-500">Manage subcategories under parent service categories. Subcategory fields only appear on renewal forms when subcategories exist.</p>
            </div>
            <button onClick={() => setShowSubcatModal(true)} className="btn btn-primary text-xs py-1.5 px-3">
              + Create Subcategory
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat: any) => (
              <div key={cat.id} className="card p-3 bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {cat.children?.length ?? 0} Subcategories
                  </span>
                </div>
                {cat.children && cat.children.length > 0 ? (
                  <div className="space-y-1">
                    {cat.children.map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded text-xs">
                        <span className="font-medium text-slate-700">{sub.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{sub.code ?? 'SUB'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic p-2">No subcategories defined for {cat.name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'bulk-upload' ? (
        <RenewalBulkUploadTab />
      ) : (
        /* Policies Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Policies List */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800">Reminder Policies</h3>
              <button
                onClick={() => {
                  const name = window.prompt('New reminder policy name');
                  if (name?.trim()) createPolicyMutation.mutate(name.trim());
                }}
                className="btn btn-primary text-[11px] py-1 px-2.5"
              >
                + New Policy
              </button>
            </div>

            <div className="space-y-2">
              {policies.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPolicyId(p.id)}
                  className={clsx(
                    'card p-3 transition-all cursor-pointer border-l-4 flex items-center justify-between',
                    selectedPolicyId === p.id ? 'border-l-blue-600 bg-blue-50/30 shadow-sm' : 'border-l-transparent hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg text-white bg-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 text-xs truncate">{p.name}</p>
                        {p.is_default && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full">Default</span>}
                      </div>
                      <p className="text-[10px] text-slate-400">{p.company_id ? 'Company' : 'Global'} &bull; v{p.version}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 font-mono">{p._count?.instances ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Column: Stepper Builder */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{selectedPolicy?.name ?? 'Domain Default'}</h3>
                    {selectedPolicy?.is_default && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>}
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">v{selectedPolicy?.version ?? 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Editable expiry and overdue communication schedule</p>
                  <p className="text-[10px] text-slate-400">Scope: {selectedPolicy?.company_id ? 'Company' : 'Global'} &bull; Last Updated: {selectedPolicy?.updated_at ? new Date(selectedPolicy.updated_at).toLocaleDateString() : 'N/A'}</p>
                </div>

                {/* Version History */}
                {policyVersions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <button 
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      <Clock size={10} /> Version History ({policyVersions.length})
                    </button>
                    {showVersionHistory && (
                      <div className="mt-2 space-y-1">
                        {policyVersions.slice(0, 3).map((version: any) => (
                          <div key={version.id} className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded">
                            <span className="font-semibold text-slate-700">v{version.version}</span>
                            <span className="text-slate-400">{new Date(version.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {policyDraft && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-600 col-span-2">
                    Policy Name
                    <input value={policyDraft.name} onChange={e => setPolicyDraft({ ...policyDraft, name: e.target.value })} className="form-input text-xs w-full mt-1" />
                  </label>
                  <label className="text-[10px] font-bold text-slate-600">
                    Timezone
                    <input value={policyDraft.timezone} onChange={e => setPolicyDraft({ ...policyDraft, timezone: e.target.value })} className="form-input text-xs w-full mt-1" />
                  </label>
                  <div className="flex flex-col gap-2 text-[11px] pt-5">
                    <label><input type="checkbox" checked={policyDraft.is_default} onChange={e => setPolicyDraft({ ...policyDraft, is_default: e.target.checked })} /> Default policy</label>
                    <label><input type="checkbox" checked={policyDraft.use_business_days} onChange={e => setPolicyDraft({ ...policyDraft, use_business_days: e.target.checked })} /> Use business days</label>
                    <label><input type="checkbox" checked={policyDraft.skip_weekends} onChange={e => setPolicyDraft({ ...policyDraft, skip_weekends: e.target.checked })} /> Skip weekends</label>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-[10px] text-blue-800">
                Signed expiry offset: <strong>-30</strong> = 30 days before expiry, <strong>0</strong> = expiry date, <strong>+3</strong> = 3 days overdue.
              </div>

              {/* Fully editable follow-up timeline */}
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200">
                {(policyDraft?.steps || []).map((step: any, idx: number) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-8">
                    <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                    <div className="card p-3 bg-slate-50 border border-slate-200 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-blue-700 text-xs">
                          {step.offset_days < 0 ? `${Math.abs(step.offset_days)} days before expiry` : step.offset_days > 0 ? `${step.offset_days} days overdue` : 'On expiry date'}
                        </p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="px-1.5 border rounded disabled:opacity-30" title="Move up">↑</button>
                          <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === policyDraft.steps.length - 1} className="px-1.5 border rounded disabled:opacity-30" title="Move down">↓</button>
                          <button type="button" onClick={() => removeStep(idx)} className="px-1.5 border border-red-200 text-red-600 rounded" title="Delete step"><Trash2 size={11} /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[9px] font-bold text-slate-500">SIGNED DAYS
                          <input aria-label={`Step ${idx + 1} signed expiry days`} type="number" min={-3650} max={3650} value={step.offset_days} onChange={e => updateStep(idx, 'offset_days', Number(e.target.value))} className="form-input text-xs w-full mt-1" />
                        </label>
                        <label className="text-[9px] font-bold text-slate-500">ACTION
                          <select value={step.action_type} onChange={e => updateStep(idx, 'action_type', e.target.value)} className="form-input text-xs w-full mt-1">
                            <option value="FOLLOW_UP_EMAIL">Follow-up</option>
                            <option value="CALL_REMINDER">Telephone Reminder</option>
                            <option value="EXPIRY_ALERT">Expiry Intimation</option>
                            <option value="DEACTIVATION">Deactivation Intimation</option>
                            <option value="SEND_QUOTATION">Send Quotation</option>
                          </select>
                        </label>
                        <label className="text-[9px] font-bold text-slate-500">CHANNEL / DELIVERY
                          <select value={step.channel} onChange={e => updateStep(idx, 'channel', e.target.value)} className="form-input text-xs w-full mt-1 font-semibold text-blue-900 bg-white">
                            <option value="EMAIL_DIRECT">✉ Email (Auto Send / Direct)</option>
                            <option value="EMAIL_DRAFT">📝 Email (Draft — Approval Required)</option>
                            <option value="EMAIL">✉ Email (Standard Auto)</option>
                            <option value="PHONE">☎ Telephone / Call Task</option>
                            <option value="WHATSAPP">💬 WhatsApp</option>
                            <option value="IN_APP">📌 In-app Task</option>
                          </select>
                        </label>
                        <label className="text-[9px] font-bold text-slate-500">RECIPIENT
                          <select value={step.recipient_type} onChange={e => updateStep(idx, 'recipient_type', e.target.value)} className="form-input text-xs w-full mt-1">
                            <option value="PRIMARY">Primary Contact</option>
                            <option value="BILLING">Billing Contact</option>
                            <option value="CLIENT">Client Contact</option>
                            <option value="ASSIGNED_USER">Renewal Executive</option>
                            <option value="ACCOUNT_MANAGER">Account Manager</option>
                            <option value="BOTH">Client + Assigned User</option>
                            <option value="ALL">All Contacts</option>
                          </select>
                        </label>
                      </div>

                      <label className="text-[9px] font-bold text-slate-500 block">MESSAGE TEMPLATE
                        <select value={step.template_id ?? ''} onChange={e => updateStep(idx, 'template_id', e.target.value ? Number(e.target.value) : null)} disabled={step.channel === 'PHONE' || step.channel === 'IN_APP'} className="form-input text-xs w-full mt-1 disabled:bg-slate-100">
                          <option value="">No template selected</option>
                          {templates.filter((template: any) => {
                            if (!template.channel) return true;
                            if (step.channel === template.channel) return true;
                            if (String(step.channel).startsWith('EMAIL') && String(template.channel).startsWith('EMAIL')) return true;
                            return false;
                          }).map((template: any) => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </select>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[9px] font-bold text-slate-500">ESCALATE AFTER DAYS
                          <input type="number" min={0} value={step.escalate_after_days ?? ''} onChange={e => updateStep(idx, 'escalate_after_days', e.target.value === '' ? null : Number(e.target.value))} className="form-input text-xs w-full mt-1" />
                        </label>
                        <label className="text-[9px] font-bold text-slate-500">ESCALATE TO
                          <input value={step.escalate_to ?? ''} onChange={e => updateStep(idx, 'escalate_to', e.target.value)} placeholder="Manager / Finance" className="form-input text-xs w-full mt-1" />
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-700">
                        <label><input type="checkbox" checked={step.is_enabled !== false} onChange={e => updateStep(idx, 'is_enabled', e.target.checked)} /> Enabled</label>
                        <label><input type="checkbox" checked={Boolean(step.is_mandatory)} onChange={e => updateStep(idx, 'is_mandatory', e.target.checked)} /> Mandatory</label>
                        <label><input type="checkbox" checked={Boolean(step.attach_order_form)} onChange={e => updateStep(idx, 'attach_order_form', e.target.checked)} disabled={step.channel === 'PHONE' || step.channel === 'IN_APP'} /> Attach order form</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addStep('EXPIRY')} className="btn btn-ghost text-xs py-2 border-2 border-dashed border-blue-300 text-blue-600 justify-center">+ Expiry Mail/Tele Step</button>
                <button onClick={() => addStep('DEACTIVATION')} className="btn btn-ghost text-xs py-2 border-2 border-dashed border-rose-300 text-rose-600 justify-center">+ Deactivation Mail/Tele Step</button>
              </div>

              <label className="flex items-start gap-2 text-[10px] text-slate-600 p-2 border rounded-lg bg-amber-50 border-amber-200">
                <input type="checkbox" checked={applyToPending} onChange={e => setApplyToPending(e.target.checked)} />
                Apply this changed schedule to existing pending renewals. Leave unchecked to affect only newly generated reminders.
              </label>
            </div>
          </div>

          {/* Right Column: Interactive WhatsApp & Email Live Preview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live Client Message Preview</h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> WhatsApp Live
                </span>
              </div>

              {/* Smartphone Mockup Frame */}
              <div className="border border-slate-300 rounded-2xl p-3 bg-slate-900 shadow-xl text-xs space-y-3">
                {/* Phone Header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-[10px]">
                      AG
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs leading-none">Angler Technologies</p>
                      <p className="text-[9px] text-emerald-400 leading-none mt-0.5">WhatsApp Business Account</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">Verified</span>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="bg-[#0b141a] p-3 rounded-xl space-y-2 border border-slate-800">
                  <div className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none space-y-2 text-[11px] leading-relaxed shadow">
                    <p className="font-bold text-emerald-200 border-b border-emerald-600/50 pb-1">
                      🔔 Renewal Reminder: Domain Registration
                    </p>
                    <p>Dear <strong>Acme Solutions Pvt Ltd</strong>,</p>
                    <p>
                      Your service <strong>Domain Registration (acmesolutions.com)</strong> is due for renewal on <strong>30 Aug 2026</strong> (in 30 days).
                    </p>
                    <div className="bg-black/20 p-2 rounded border border-white/10 space-y-0.5 text-[10px]">
                      <p>💵 <strong>Amount Due:</strong> ₹12,500</p>
                      <p>👤 <strong>Account Manager:</strong> Rajesh Sharma</p>
                    </div>
                    <p className="text-[10px] text-emerald-100">
                      Please renew online or contact your account manager to avoid service disruption.
                    </p>
                    <p className="text-[10px] text-blue-200 underline">https://crm.angler.in/pay/RNW-1042</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-300 pt-1">
                      <span>11:34 AM</span>
                      <span className="text-emerald-400 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Variables Legend */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-slate-700 text-[11px]">Available Template Variables</p>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 font-mono">
                  <span className="bg-white border p-1 rounded">{"{{client_name}}"}</span>
                  <span className="bg-white border p-1 rounded">{"{{service_name}}"}</span>
                  <span className="bg-white border p-1 rounded">{"{{expiry_date}}"}</span>
                  <span className="bg-white border p-1 rounded">{"{{amount_due}}"}</span>
                  <span className="bg-white border p-1 rounded">{"{{days_left}}"}</span>
                  <span className="bg-white border p-1 rounded">{"{{payment_url}}"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Health Tab Content */}
      {activeTab === 'gateway-health' && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Communication Gateway Health</h3>
              <p className="text-xs text-slate-500">Monitor the status and health of email, WhatsApp, and other communication gateways.</p>
            </div>
            <button onClick={() => toast.success('Gateway status refreshed')} className="btn btn-ghost text-xs py-1.5 px-3 border border-slate-300">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Gateway */}
            <div className="card p-4 bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Email Gateway (SMTP)</p>
                    <p className="text-[10px] text-slate-400">smtp.gmail.com:587</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Last Check</p>
                  <p className="font-bold text-slate-700">2 min ago</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Response Time</p>
                  <p className="font-bold text-slate-700">124ms</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Success Rate</p>
                  <p className="font-bold text-emerald-600">98.5%</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">24h Volume</p>
                  <p className="font-bold text-slate-700">1,247</p>
                </div>
              </div>
            </div>

            {/* WhatsApp Gateway */}
            <div className="card p-4 bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">WhatsApp Business API</p>
                    <p className="text-[10px] text-slate-400">Meta Cloud API</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Last Check</p>
                  <p className="font-bold text-slate-700">1 min ago</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Response Time</p>
                  <p className="font-bold text-slate-700">89ms</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Success Rate</p>
                  <p className="font-bold text-emerald-600">99.2%</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">24h Volume</p>
                  <p className="font-bold text-slate-700">856</p>
                </div>
              </div>
            </div>

            {/* SMS Gateway */}
            <div className="card p-4 bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">SMS Gateway</p>
                    <p className="text-[10px] text-slate-400">Twilio API</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Degraded
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Last Check</p>
                  <p className="font-bold text-slate-700">5 min ago</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Response Time</p>
                  <p className="font-bold text-amber-600">2.1s</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Success Rate</p>
                  <p className="font-bold text-amber-600">87.3%</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">24h Volume</p>
                  <p className="font-bold text-slate-700">124</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-800">
                <p className="font-bold">⚠️ High latency detected</p>
                <p>SMS delivery times are elevated. Twilio reporting API delays.</p>
              </div>
            </div>

            {/* In-App Gateway */}
            <div className="card p-4 bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">In-App Notifications</p>
                    <p className="text-[10px] text-slate-400">Internal System</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Last Check</p>
                  <p className="font-bold text-slate-700">Real-time</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Response Time</p>
                  <p className="font-bold text-slate-700">&lt;10ms</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">Success Rate</p>
                  <p className="font-bold text-emerald-600">100%</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <p className="text-slate-400 font-medium">24h Volume</p>
                  <p className="font-bold text-slate-700">3,421</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Subcategory Modal */}
      {showSubcatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-800">Create Master Subcategory</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="form-label font-bold text-slate-700">Parent Category *</label>
                <select value={subcatParentId} onChange={e => setSubcatParentId(e.target.value)} className="form-input text-xs w-full mt-1">
                  <option value="">Select parent category...</option>
                  {categories.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">Subcategory Name *</label>
                <input type="text" placeholder="e.g. Premium gTLD, Dedicated Cloud" value={subcatName} onChange={e => setSubcatName(e.target.value)} className="form-input text-xs w-full mt-1" />
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">Subcategory Code</label>
                <input type="text" placeholder="e.g. SUB-GTLD" value={subcatCode} onChange={e => setSubcatCode(e.target.value)} className="form-input text-xs w-full mt-1 font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowSubcatModal(false)} className="btn btn-ghost text-xs py-1.5 px-3 border border-slate-300">Cancel</button>
              <button
                onClick={() => createSubcatMutation.mutate({
                  name: subcatName,
                  code: subcatCode || subcatName.substring(0, 4).toUpperCase(),
                  parent_id: subcatParentId ? parseInt(subcatParentId) : null
                })}
                disabled={createSubcatMutation.isPending || !subcatParentId || !subcatName}
                className="btn btn-primary text-xs py-1.5 px-4"
              >
                Create Subcategory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
