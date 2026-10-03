import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, CheckCircle, SkipForward, Eye,
  Clock, DollarSign, Calendar, Activity, Mail,
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { AlertTimelineBuilder, type AlertStep } from '../../components/renewal/AlertTimelineBuilder';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';
import { RenewalStatusBadge } from '../../components/renewal/RenewalStatusBadge';

type Tab = 'timeline' | 'drafts' | 'pricing' | 'activity';

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d: any) => d ? dayjs(d).format('DD MMM YYYY') : '—';

export default function MappingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [editingSteps, setEditingSteps] = useState(false);
  const [localSteps, setLocalSteps] = useState<AlertStep[]>([]);
  const [savingSteps, setSavingSteps] = useState(false);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['mapping-detail', id],
    queryFn: () => api.get(`/renewal-pricing/mappings/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['renewal-templates-list'],
    queryFn: () => api.get('/renewal-templates?channel=EMAIL').then(r => r.data.data),
  });

  const { data: drafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['mapping-drafts', id],
    queryFn: () => api.get('/renewal-pricing/drafts', { params: { mappingId: id } }).then(r => r.data.data ?? []),
    enabled: activeTab === 'drafts',
    staleTime: 10_000,
  });

  const approveDraft = useMutation({
    mutationFn: (draftId: number) => api.post(`/renewal-pricing/drafts/${draftId}/approve`),
    onSuccess: () => { toast.success('Email approved & queued'); refetchDrafts(); },
  });

  const skipDraft = useMutation({
    mutationFn: (draftId: number) => api.post(`/renewal-pricing/drafts/${draftId}/skip`),
    onSuccess: () => { toast.success('Draft skipped'); refetchDrafts(); },
  });

  const saveSteps = async () => {
    setSavingSteps(true);
    try {
      await api.put(`/renewal-pricing/mappings/${id}/alert-steps`, { steps: localSteps });
      qc.invalidateQueries({ queryKey: ['mapping-detail', id] });
      setEditingSteps(false);
      toast.success('Alert timeline saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSavingSteps(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="flex gap-4 animate-pulse">
          <div className="w-72 h-96 bg-slate-100 rounded-xl" />
          <div className="flex-1 h-96 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!raw) return <div className="page-wrapper"><p className="text-slate-500">Mapping not found.</p></div>;

  const client = raw.renewal_account?.client_company;
  const service = raw.service_master;
  const category = service?.category;
  const daysLeft = raw.expiry_date ? dayjs(raw.expiry_date).diff(dayjs(), 'day') : null;
  const resolvedPrice = raw.resolved_price;
  const pricingHistory = raw.pricing_history;

  const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
    { key: 'timeline', label: 'Alert Timeline', icon: Clock },
    { key: 'drafts',   label: 'Email Drafts', icon: Mail },
    { key: 'pricing',  label: 'Pricing History', icon: DollarSign },
    { key: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/renewals/mappings')} className="btn btn-ghost">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="page-title leading-tight">{client?.name} — {service?.name}</h1>
            <p className="text-[12px] text-slate-400">MAP-{String(raw.id).padStart(3, '0')} · {category?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/renewals/mappings/${id}/edit`)} className="btn btn-secondary">
            <Edit2 size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex gap-4 items-start" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {/* LEFT PANEL — fixed 280px */}
        <div className="w-72 flex-shrink-0 space-y-3">
          <div className="card px-4 py-4 space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <RenewalStatusBadge status={raw.status} />
              <DaysRemainingBadge expiryDate={raw.expiry_date} />
            </div>

            {/* Customer */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Customer</p>
              <p className="text-[13px] font-semibold text-slate-800">{client?.name}</p>
            </div>

            {/* Service */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Service</p>
              <p className="text-[13px] font-medium text-slate-700">{service?.name}</p>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${category?.color}20`, color: category?.color }}
              >
                {category?.name}
              </span>
            </div>

            {/* Asset */}
            {raw.identifier && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Asset / Domain</p>
                <p className="text-[12px] font-mono text-slate-700 break-all">{raw.identifier}</p>
              </div>
            )}

            {/* Mapping ID */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Mapping ID</p>
              <p className="text-[12px] font-mono text-slate-600">MAP-{String(raw.id).padStart(3, '0')}</p>
            </div>

            {/* Price */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Price / Billing</p>
              <p className="text-[15px] font-bold text-slate-800">
                {resolvedPrice ? fmt(resolvedPrice.price) : fmt(raw.amount_due)}
                <span className="text-[11px] font-normal text-slate-500"> /{resolvedPrice?.billing_unit ?? 'yr'}</span>
              </p>
              {resolvedPrice?.source === 'customer_override' && (
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Customer override</span>
              )}
              {resolvedPrice?.source === 'service_default' && (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">Master default</span>
              )}
              <button
                onClick={() => navigate(`/renewals/mappings/${id}/edit`)}
                className="block text-[11px] text-primary-600 hover:text-primary-700 mt-1"
              >
                Edit Price →
              </button>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Start</p>
                <p className="text-[12px] text-slate-600">{fmtDate(raw.activation_date)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Expiry</p>
                <p className="text-[12px] text-slate-600">{fmtDate(raw.expiry_date)}</p>
              </div>
            </div>

            {/* Provider */}
            {raw.provider && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Provider</p>
                <p className="text-[12px] text-slate-700">{raw.provider.name}</p>
              </div>
            )}

            {/* Email Count */}
            {category?.code === 'EMAIL' && raw.email_count !== null && raw.email_count !== undefined && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Email IDs Count</p>
                <p className="text-[12px] font-semibold text-slate-700">{raw.email_count} Users</p>
              </div>
            )}

            {/* Server Provider Type & Server Name */}
            {(category?.code === 'AMC' || category?.code === 'SUPPORT') && raw.provider_type && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Server Provider Type</p>
                <p className="text-[12px] font-semibold text-slate-700">
                  {raw.provider_type === 'CLIENT_SERVER' ? "Client's Server" : "Angler's Server"}
                </p>
                {raw.provider_type === 'ANGLER_SERVER' && raw.server_name && (
                  <div className="mt-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Server Name</p>
                    <p className="text-[11px] font-mono font-semibold text-slate-700">{raw.server_name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Assigned */}
            {raw.assigned_user && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Assigned To</p>
                <p className="text-[12px] text-slate-700">{raw.assigned_user.name}</p>
              </div>
            )}

            {/* Contact */}
            {raw.customer_contact && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Contact</p>
                <p className="text-[12px] text-slate-700">{raw.customer_contact.name}</p>
                {raw.customer_contact.email && (
                  <p className="text-[11px] text-slate-400 truncate">{raw.customer_contact.email}</p>
                )}
              </div>
            )}

            {/* Created */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">Created {fmtDate(raw.created_at)}</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — tabbed */}
        <div className="flex-1 min-w-0">
          <div className="card overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      'flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium border-b-2 transition-colors',
                      activeTab === tab.key
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                    )}
                  >
                    <Icon size={13} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-5" style={{ minHeight: 380 }}>

              {/* TIMELINE TAB */}
              {activeTab === 'timeline' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-700">Alert Timeline Configuration</p>
                      <p className="text-[11px] text-slate-400">Per-mapping steps override the global policy.</p>
                    </div>
                    {!editingSteps ? (
                      <button
                        onClick={() => { setLocalSteps(raw.alert_steps ?? []); setEditingSteps(true); }}
                        className="btn btn-secondary text-[12px]"
                      >
                        <Edit2 size={12} /> Edit Steps
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setEditingSteps(false)} className="btn btn-ghost text-[12px]">Cancel</button>
                        <button onClick={saveSteps} disabled={savingSteps} className="btn btn-primary text-[12px]">
                          {savingSteps ? 'Saving...' : 'Save Steps'}
                        </button>
                      </div>
                    )}
                  </div>
                  <AlertTimelineBuilder
                    steps={editingSteps ? localSteps : (raw.alert_steps ?? [])}
                    templates={templates}
                    onChange={setLocalSteps}
                    readonly={!editingSteps}
                  />
                  {!editingSteps && raw.alert_steps?.length === 0 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-[12px] text-slate-500">
                        No custom steps configured. Using <strong>global reminder policy</strong> as fallback.
                      </p>
                      {raw.reminder_policy && (
                        <p className="text-[11px] text-slate-400 mt-1">Policy: {raw.reminder_policy.name}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DRAFTS TAB */}
              {activeTab === 'drafts' && (
                <div>
                  <p className="text-[13px] font-semibold text-slate-700 mb-4">Email Drafts & Approval Queue</p>
                  {drafts.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail size={32} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-[13px] text-slate-400">No pending email drafts</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drafts.map((d: any) => (
                        <div key={d.id} className="border border-slate-200 rounded-xl px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 truncate">{d.subject}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">To: {d.recipient}</p>
                              <p className="text-[11px] text-slate-400">Scheduled: {fmtDate(d.created_at)}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => approveDraft.mutate(d.id)}
                                disabled={approveDraft.isPending}
                                className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => skipDraft.mutate(d.id)}
                                disabled={skipDraft.isPending}
                                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <SkipForward size={12} /> Skip
                              </button>
                            </div>
                          </div>
                          {d.mapping_context && (
                            <details className="mt-2">
                              <summary className="text-[11px] text-primary-600 cursor-pointer">Preview body</summary>
                              <div
                                className="mt-2 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 max-h-40 overflow-auto"
                                dangerouslySetInnerHTML={{ __html: d.rendered_body?.substring(0, 500) + '...' }}
                              />
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PRICING HISTORY TAB */}
              {activeTab === 'pricing' && (
                <div>
                  <p className="text-[13px] font-semibold text-slate-700 mb-4">Pricing History</p>

                  {/* Customer overrides */}
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide mb-2">Customer Overrides</p>
                    {pricingHistory?.customer_overrides?.length === 0 ? (
                      <p className="text-[12px] text-slate-400">No customer-specific overrides set.</p>
                    ) : (
                      <div className="space-y-2">
                        {pricingHistory?.customer_overrides?.map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2 text-[12px]">
                            <div>
                              <span className={clsx('font-semibold', o.is_active ? 'text-slate-800' : 'text-slate-400 line-through')}>
                                {fmt(o.override_price)}/{o.billing_unit}
                              </span>
                              <span className="text-slate-400 ml-2">{fmtDate(o.effective_from)} → {o.effective_to ? fmtDate(o.effective_to) : 'ongoing'}</span>
                            </div>
                            {o.is_active && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Master default versions */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Master Default Versions</p>
                    {pricingHistory?.default_versions?.length === 0 ? (
                      <p className="text-[12px] text-slate-400">No default price versions configured.</p>
                    ) : (
                      <div className="space-y-2">
                        {pricingHistory?.default_versions?.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2 text-[12px]">
                            <div>
                              <span className={clsx('font-semibold', v.is_current ? 'text-slate-800' : 'text-slate-400')}>
                                {fmt(v.base_price)}/{v.billing_unit}
                              </span>
                              <span className="text-slate-400 ml-2">{fmtDate(v.effective_from)} → {v.effective_to ? fmtDate(v.effective_to) : 'ongoing'}</span>
                            </div>
                            {v.is_current && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Current</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-500">Resolved price for next cycle:</span>
                      <span className="font-bold text-slate-800">
                        {resolvedPrice ? `${fmt(resolvedPrice.price)}/${resolvedPrice.billing_unit}` : '—'}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (via {resolvedPrice?.source?.replace('_', ' ')})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === 'activity' && (
                <div>
                  <p className="text-[13px] font-semibold text-slate-700 mb-4">Activity Log</p>
                  {raw.follow_up_logs?.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity size={32} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-[13px] text-slate-400">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {raw.follow_up_logs?.map((log: any) => (
                        <div key={log.id} className="flex gap-3 text-[12px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-slate-700">{log.notes ?? log.outcome_code}</p>
                            <p className="text-slate-400 text-[11px]">{fmtDate(log.logged_at)} · {log.logged_by?.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
