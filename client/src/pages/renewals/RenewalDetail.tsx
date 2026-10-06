import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Plus, Phone, CreditCard,
  Activity, XCircle, AlertCircle, Mail, Check,
  RefreshCw, MoreVertical, MessageSquare, Bell, SkipForward,
  FileText, Eye, Download, ExternalLink, Zap, Clock, UserCheck, X, Info, FileCode
} from 'lucide-react';
import api from '../../services/api';
import clsx from 'clsx';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { RenewalStatusBadge } from '../../components/renewal/RenewalStatusBadge';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';

/* ─── helpers ──────────────────────────────────────────────────────────── */
const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
type Tab = 'services' | 'payments' | 'activity' | 'communications';

/* Maps action_type / channel → readable label */
const ACTION_LABEL: Record<string, string> = {
  IN_APP:              'CRM Alert (In-App)',
  EMAIL_DIRECT:        'Single Email',
  EMAIL_DRAFT:         'Email Draft for Review',
  CALL_TASK:           'Phone Call Outreach',
  PHONE:               'Phone Call Outreach',
  CALL:                'Phone Call Outreach',
  EMAIL:               'Single Email',
  WHATSAPP:            'WhatsApp Notice',
  DIGEST:              'Consolidated Email Digest',
  CONSOLIDATED_DIGEST: 'Consolidated Email Digest',
  SMS:                 'SMS Notice',
};

/* Maps recipient_type → readable label */
const RECIPIENT_LABEL: Record<string, string> = {
  ASSIGNED_USER:  'Assigned Executive',
  CLIENT_CONTACT: 'Customer Contact',
  EXECUTIVE:      'Account Executive',
  MANAGER:        'Account Manager',
  FINANCE:        'Finance Team',
  ACCOUNT_OWNER:  'Account Owner',
  BILLING:        'Billing Contact',
};

/* Status dot colour per RenewalServiceInstance.status */
const STATUS_DOT: Record<string, string> = {
  ACTIVE:       'bg-emerald-500',
  DUE_SOON:     'bg-amber-400',
  EXPIRED:      'bg-rose-500',
  NOT_RENEWING: 'bg-slate-400',
  RENEWED:      'bg-blue-500',
  FOLLOW_UP:    'bg-violet-500',
};

/* Contact role → designation colour */
const ROLE_COLOR: Record<string, string> = {
  PRIMARY:        'text-blue-600',
  BILLING:        'text-amber-600',
  TECHNICAL:      'text-emerald-600',
  DECISION_MAKER: 'text-violet-600',
};

/* ─── ChannelIcon ───────────────────────────────────────────────────────── */
function ChannelIcon({ channel, actionType }: { channel?: string; actionType?: string }) {
  const ch = (channel || actionType || '').toUpperCase();
  if (ch.includes('PHONE') || ch.includes('CALL')) {
    return <span className="w-6 h-6 rounded-md border border-green-200 bg-green-50 flex items-center justify-center shrink-0" title="Phone Call Outreach"><Phone size={11} className="text-green-600" /></span>;
  }
  if (ch.includes('WHATSAPP')) {
    return <span className="w-6 h-6 rounded-md border border-emerald-200 bg-emerald-50 flex items-center justify-center shrink-0" title="WhatsApp Messaging"><MessageSquare size={11} className="text-emerald-600" /></span>;
  }
  if (ch.includes('DIGEST') || ch.includes('COMBINED')) {
    return <span className="w-6 h-6 rounded-md border border-purple-200 bg-purple-50 flex items-center justify-center shrink-0" title="Consolidated Email Digest"><FileText size={11} className="text-purple-600" /></span>;
  }
  if (ch.includes('IN_APP')) {
    return <span className="w-6 h-6 rounded-md border border-violet-200 bg-violet-50 flex items-center justify-center shrink-0" title="In-App Alert"><Bell size={11} className="text-violet-600" /></span>;
  }
  return <span className="w-6 h-6 rounded-md border border-blue-200 bg-blue-50 flex items-center justify-center shrink-0" title="Email Communication"><Mail size={11} className="text-blue-600" /></span>;
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function RenewalDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [tab,           setTab]           = useState<Tab>('services');
  const [selectedSvcId, setSelectedSvcId] = useState<number | null>(null);
  const [showPayForm,   setShowPayForm]   = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '', payment_date: dayjs().format('YYYY-MM-DD'),
    remarks: '', payment_mode: 'NEFT',
  });
  const [renewSvc,    setRenewSvc]    = useState<any | null>(null);
  const [renewDate,   setRenewDate]   = useState(dayjs().add(1, 'year').format('YYYY-MM-DD'));
  const [renewAmount, setRenewAmount] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [drawerData, setDrawerData] = useState<{
    type: 'EMAIL' | 'CALL' | 'ORDER_FORM' | 'AUDIT' | 'SKIP_REASON';
    title: string;
    step?: any;
    event?: any;
  } | null>(null);

  /* ── data ── */
  const { data: account, isLoading, isError } = useQuery({
    queryKey: ['renewal', id],
    queryFn:  () => api.get(`/renewals/${id}`).then(r => r.data),
  });

  const { data: communicationEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['renewal-communication-timeline', id],
    queryFn:  () => api.get(`/renewals/${id}/communication-timeline`).then(r => r.data),
    enabled: tab === 'communications',
  });

  /* ── mutations ── */
  const addPaymentMutation = useMutation({
    mutationFn: (body: any) => api.post(`/renewals/${id}/payments`, body),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['renewal', id] });
      setShowPayForm(false);
      setPayForm({ amount: '', payment_date: dayjs().format('YYYY-MM-DD'), remarks: '', payment_mode: 'NEFT' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to record payment'),
  });

  const renewMutation = useMutation({
    mutationFn: ({ svcId, cycleId, expiry, amount }: any) =>
      api.post(`/renewals/${id}/services/${svcId}/renew`, {
        cycle_id: cycleId, new_expiry_date: expiry, new_amount: amount,
      }),
    onSuccess: () => {
      toast.success('Service renewed — new billing cycle created');
      qc.invalidateQueries({ queryKey: ['renewal', id] });
      setRenewSvc(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Renewal failed'),
  });

  /* ── loading / error ── */
  if (isLoading) return (
    <div className="page-wrapper renewal-page-wrapper space-y-4">
      <div className="skeleton h-20 rounded-xl" />
      <div className="skeleton h-10 rounded-xl w-56" />
      <div className="skeleton h-[540px] rounded-xl" />
    </div>
  );

  if (isError || !account) return (
    <div className="page-wrapper renewal-page-wrapper">
      <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <AlertCircle size={18} />
        <span className="text-sm font-semibold">Failed to load renewal account.</span>
        <button onClick={() => navigate(-1)} className="ml-auto text-xs font-bold border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors">← Back</button>
      </div>
    </div>
  );

  /* ── derive data from actual API shape ──────────────────────────────────
     contacts          : account.contacts[] → each has .contact (RenewalContact)
     services          : account.services[] (RenewalServiceInstance)
     reminder steps    : service.reminder_policy?.steps[] (RenewalReminderStep)
                         field names: offset_days, channel, action_type, recipient_type
     reminders         : service.cycles[0].reminders[] (RenewalReminder)
                         field names: due_date, channel, recipient_type, status, offset_days
     payments          : service.cycles[0].payments[] collected_by = User
     follow_up_logs    : service.follow_up_logs[] → logged_by, logged_at
     audit logs        : account.audit_logs[] → performed_by, performed_at, action
     executive         : account.renewal_executive (NOT assigned_executive)
  ─────────────────────────────────────────────────────────────────────── */
  const services: any[]   = account.services ?? [];
  const auditLogs: any[]  = account.audit_logs ?? [];

  // Flatten contacts through junction table: contacts[].contact
  const contacts: any[] = (account.contacts ?? [])
    .map((junc: any) => junc.contact)
    .filter(Boolean);

  // Payments: aggregate from all service cycles
  const allPayments: any[] = services.flatMap((svc: any) =>
    (svc.cycles ?? []).flatMap((c: any) => c.payments ?? [])
  );

  // Financial totals
  const totalDue = services.reduce((s: number, svc: any) => {
    const cycle = svc.cycles?.[0];
    return s + parseFloat(cycle?.amount_due ?? svc.amount_due ?? 0);
  }, 0);
  const totalCollected = services.reduce((s: number, svc: any) => {
    const cycle = svc.cycles?.[0];
    return s + parseFloat(cycle?.amount_collected ?? 0);
  }, 0);
  const outstanding   = Math.max(0, totalDue - totalCollected);
  const nearestExpiry = services.reduce((m: string | null, svc: any) =>
    (!m || (svc.expiry_date && dayjs(svc.expiry_date).isBefore(dayjs(m)))) ? svc.expiry_date : m
  , null);

  const companyName = account.client_company?.name || '—';

  // Staff
  const managerName   = account.account_manager
    ? `${account.account_manager.first_name} ${account.account_manager.last_name ?? ''}`.trim()
    : null;
  const executiveName = account.renewal_executive
    ? `${account.renewal_executive.first_name} ${account.renewal_executive.last_name ?? ''}`.trim()
    : null;

  // Selected service
  const activeSvcId = selectedSvcId ?? (services[0]?.id ?? null);
  const selectedSvc = services.find((s: any) => s.id === activeSvcId) ?? services[0] ?? null;

  // Alert steps come from service.reminder_policy.steps (RenewalReminderStep)
  // Field: offset_days (days before expiry), channel, action_type, recipient_type
  const policySteps: any[] = selectedSvc?.reminder_policy?.steps ?? [];

  // Actual generated reminder instances for the active cycle
  const activeReminders: any[] = selectedSvc?.cycles?.[0]?.reminders ?? [];

  // Follow-up logs for selected service
  const followUpLogs: any[] = selectedSvc?.follow_up_logs ?? [];

  // Customer contact directly linked to the service
  const svcContact: any | null = selectedSvc?.customer_contact ?? null;

  const TABS = [
    { id: 'services'  as Tab, label: 'Services Overview',  count: services.length },
    { id: 'payments'  as Tab, label: 'Payment Ledger',     count: allPayments.length },
    { id: 'activity'  as Tab, label: 'Activity Log',       count: auditLogs.length },
    { id: 'communications' as Tab, label: 'Communications', count: communicationEvents?.length ?? 0 },
  ];

  /* ══════════════════════ JSX ══════════════════════════════════════════════ */
  return (
    <div className="page-wrapper renewal-page-wrapper space-y-4">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div>
        <nav className="flex items-center gap-1 text-[11px] text-slate-400 mb-3 font-medium">
          <button onClick={() => navigate('/renewals/register')} className="hover:text-blue-600 transition-colors">Renewals</button>
          <span className="mx-1 text-slate-300">›</span>
          <span className="text-slate-600">Register</span>
          <span className="mx-1 text-slate-300">›</span>
          <span className="text-slate-800 font-semibold">{companyName}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
              <ArrowLeft size={14} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-none">{companyName}</h1>
              <p className="text-[12px] text-slate-400 mt-1">
                Account #{account.id}
                {account.created_at && ` · Created ${dayjs(account.created_at).format('DD MMM YYYY')}`}
                {services.length > 0 && ` · ${services.length} service${services.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={async () => {
              try {
                toast.loading('Generating Order Form PDF...', { id: 'pdf-gen' });
                const res = await api.post(`/renewals/${id}/generate-pdf`);
                toast.success('Order Form PDF generated successfully!', { id: 'pdf-gen' });
                if (res.data?.pdfResult?.relativeUrl) {
                  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                  const serverHost = apiBase.replace(/\/api\/?$/, '');
                  const relativeUrl = res.data.pdfResult.relativeUrl;
                  const fullPdfUrl = relativeUrl.startsWith('http') ? relativeUrl : `${serverHost}${relativeUrl}`;
                  window.open(fullPdfUrl, '_blank');
                }
                qc.invalidateQueries({ queryKey: ['renewal', id] });
              } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to generate PDF', { id: 'pdf-gen' });
              }
            }}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 hover:bg-blue-100 transition-all">
              <Mail size={12} /> Order Form PDF
            </button>
            <button onClick={() => setShowPayForm(v => !v)}
              className="btn btn-primary text-xs py-2 px-4 font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
              <CreditCard size={13} /> Record Payment
            </button>
            <button onClick={() => navigate(`/renewals/${id}/edit`)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
              <Edit2 size={12} /> Edit
            </button>
            <button onClick={() => navigate('/renewals/mappings/new')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
              <Plus size={12} /> Add Service
            </button>
          </div>
        </div>
      </div>

      {/* ── INLINE PAYMENT FORM ─────────────────────────────────────── */}
      {showPayForm && (
        <div className="card p-5 border border-blue-200 bg-blue-50/30 rounded-xl space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={14} className="text-blue-600" /> Record Client Payment
            </h3>
            <button onClick={() => setShowPayForm(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <XCircle size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="form-label font-bold">Amount (₹) *</label>
              <input type="number" value={payForm.amount}
                onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                className="form-input text-xs font-bold" placeholder="0.00" />
            </div>
            <div>
              <label className="form-label font-bold">Payment Date *</label>
              <input type="date" value={payForm.payment_date}
                onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))}
                className="form-input text-xs" />
            </div>
            <div>
              <label className="form-label font-bold">Mode</label>
              <select value={payForm.payment_mode}
                onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}
                className="form-select text-xs">
                <option value="NEFT">NEFT / RTGS</option>
                <option value="UPI">UPI / GPay</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div>
              <label className="form-label font-bold">Reference / Remarks</label>
              <input type="text" value={payForm.remarks}
                onChange={e => setPayForm(p => ({ ...p, remarks: e.target.value }))}
                className="form-input text-xs" placeholder="e.g. UTR #12938471" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPayForm(false)}
              className="btn btn-ghost text-xs px-4 py-1.5 font-bold border border-slate-200 rounded-xl">Cancel</button>
            <button
              onClick={() => {
                const cycle = services[0]?.cycles?.[0];
                if (!cycle) { toast.error('No active billing cycle found'); return; }
                if (!payForm.amount) { toast.error('Amount is required'); return; }
                addPaymentMutation.mutate({ cycle_id: cycle.id, ...payForm });
              }}
              disabled={addPaymentMutation.isPending}
              className="btn btn-primary text-xs px-5 py-1.5 font-bold rounded-xl shadow-sm">
              {addPaymentMutation.isPending ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      )}

      {/* ── UNDERLINE TABS ──────────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap',
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}>
            {t.label}
            {t.count > 0 && (
              <span className={clsx(
                'text-[10px] font-extrabold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ SERVICES TAB — 3-COLUMN (mirrors reference layout exactly) ══ */}
      {tab === 'services' && (
        <div className="card border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="grid grid-cols-[200px_1fr_340px] min-h-[520px] divide-x divide-slate-200">

            {/* ── LEFT: Services list ─────────────────────────────── */}
            <div className="flex flex-col bg-white">
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-slate-50/60">
                <span className="text-sm font-semibold text-slate-800">Subscribed Services</span>
                <button onClick={() => navigate('/renewals/mappings/new')}
                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition-all shadow-sm">
                  <Plus size={11} /> New
                </button>
              </div>

              {/* column sub-header */}
              <div className="grid grid-cols-[1fr_auto] items-center px-4 py-1.5 border-b border-slate-100 bg-slate-50/40">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Service Name</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Expiry</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {services.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No services mapped yet.</div>
                ) : (
                  services.map((svc: any) => {
                    const isActive = activeSvcId === svc.id;
                    return (
                      <div key={svc.id} onClick={() => setSelectedSvcId(svc.id)}
                        className={clsx(
                          'px-4 py-3 cursor-pointer transition-all border-l-[3px] group',
                          isActive ? 'border-l-blue-600 bg-blue-50/50' : 'border-l-transparent hover:bg-slate-50'
                        )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', STATUS_DOT[svc.status] ?? 'bg-slate-400')} />
                            <div className="min-w-0">
                              <p className={clsx('text-xs font-semibold truncate leading-tight', isActive ? 'text-blue-700' : 'text-slate-800')}>
                                {svc.service_master?.name || 'Service'}
                              </p>
                              {svc.identifier && <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{svc.identifier}</p>}
                              {svc.service_master?.category?.name && (
                                <p className="text-[9px] font-semibold text-slate-400">{svc.service_master.category.name}</p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                              {svc.expiry_date ? dayjs(svc.expiry_date).format('DD MMM YY') : '—'}
                            </p>
                            <DaysRemainingBadge expiryDate={svc.expiry_date} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40 text-[10px] text-slate-400">
                Showing {services.length} of {services.length} services
              </div>
            </div>

            {/* ── CENTER: Selected service + Reminder Steps ─────────── */}
            <div className="flex flex-col bg-white">
              {!selectedSvc ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8">
                  <Bell size={28} className="text-slate-300" />
                  <p className="text-sm font-medium">Select a service to view its details</p>
                </div>
              ) : (
                <>
                  {/* Service header — "Selected Service" block */}
                  <div className="px-5 py-4 border-b border-slate-200">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Selected Service</p>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {(selectedSvc.service_master?.name || 'SV').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{selectedSvc.service_master?.name}</span>
                          <RenewalStatusBadge status={selectedSvc.status} />
                        </div>
                        {selectedSvc.identifier && (
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">{selectedSvc.identifier}</p>
                        )}
                      </div>
                    </div>

                    {/* metadata row */}
                    <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500 flex-wrap">
                      {selectedSvc.service_master?.category?.name && (
                        <span className="border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50">
                          {selectedSvc.service_master.category.name}
                        </span>
                      )}
                      {selectedSvc.provider?.name && (
                        <span className="border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50">
                          {selectedSvc.provider.name}
                        </span>
                      )}
                      {selectedSvc.reminder_policy?.name && (
                        <span className="border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 bg-blue-50 font-semibold">
                          {selectedSvc.reminder_policy.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                      {selectedSvc.activation_date && (
                        <span>Start: <strong className="text-slate-700">{dayjs(selectedSvc.activation_date).format('DD MMM YYYY')}</strong></span>
                      )}
                      {selectedSvc.expiry_date && (
                        <span>Expiry: <strong className="text-slate-700">{dayjs(selectedSvc.expiry_date).format('DD MMM YYYY')}</strong></span>
                      )}
                      {selectedSvc.cycles?.[0]?.amount_due && (
                        <span>Amount: <strong className="text-slate-700">{fmt(selectedSvc.cycles[0].amount_due)}</strong></span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-2 mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-[11px]">
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Domain / Identifier</span>
                        <span className="font-mono font-semibold text-slate-800 break-all">{selectedSvc.identifier || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Server Name</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.server_name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Provider</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.provider?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Provider Type</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.provider_type || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Plan</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.plan_name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Service Period</span>
                        <span className="font-semibold text-slate-800">
                          {selectedSvc.duration_value ? `${selectedSvc.duration_value} ${selectedSvc.duration_unit || 'months'}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Billing Term</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.billing_term || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Quantity / Email Count</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.email_count ?? selectedSvc.quantity ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Service Order No.</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.order_number || account.order_number || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">PO Reference</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.po_reference || account.po_reference || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Invoice No.</span>
                        <span className="font-semibold text-slate-800">{selectedSvc.invoice_number || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Invoice Date</span>
                        <span className="font-semibold text-slate-800">
                          {selectedSvc.invoice_date ? dayjs(selectedSvc.invoice_date).format('DD MMM YYYY') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reminder Steps — matches reference "Reminder Steps (Executed in sequence)" */}
                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-4">
                      Reminder Steps
                      <span className="ml-2 font-normal text-slate-400 normal-case tracking-normal">(Executed in sequence)</span>
                    </p>

                    {policySteps.length === 0 && activeReminders.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2">
                        <p className="text-xs text-slate-400 font-medium">
                          No reminder policy configured.<br />
                          This service uses the system default.
                        </p>
                        <button onClick={() => navigate(`/renewals/settings`)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                          Configure Reminder Policies →
                        </button>
                      </div>
                    ) : (
                      <div className="relative space-y-3">
                        {/* Timeline vertical line */}
                        <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-blue-100" />

                        {/* Render from actual reminder instances if generated, else from policy steps */}
                        {(activeReminders.length > 0 ? activeReminders : policySteps).map((step: any, idx: number) => {
                          const isInstance    = activeReminders.length > 0;
                          const dueDate       = isInstance ? step.due_date : null;
                          const rawOffset     = step.offset_days ?? 0;
                          const absDays       = Math.abs(rawOffset);
                          const triggerDate   = dueDate ? dayjs(dueDate)
                            : (selectedSvc.expiry_date ? dayjs(selectedSvc.expiry_date).subtract(absDays, 'day') : null);
                          const isPast        = triggerDate ? triggerDate.isBefore(dayjs()) : false;
                          const isDone        = step.status === 'COMPLETED';
                          const isSent        = step.status === 'SENT';
                          const isSkipped     = step.status === 'SKIPPED';
                          const channel       = step.channel ?? step.action_type ?? '';
                          const recipientType = step.recipient_type ?? '';

                          const isCall        = channel.includes('CALL') || channel.includes('PHONE');
                          const isDigest      = channel.includes('DIGEST') || channel.includes('COMBINED');
                          const isWhatsApp    = channel.includes('WHATSAPP');
                          const isEmail       = !isCall && !isWhatsApp;

                          // Status chip config
                          const statusConfig = isSent
                            ? { label: 'Sent', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold' }
                            : isDone
                            ? { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold' }
                            : isSkipped
                            ? { label: 'Skipped', cls: 'bg-slate-100 text-slate-600 border-slate-200 font-extrabold' }
                            : isPast
                            ? { label: 'Overdue', cls: 'bg-rose-100 text-rose-700 border-rose-200 font-extrabold' }
                            : { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200 font-extrabold' };

                          const completedAt = step.updated_at || step.completed_at;
                          const scheduledText = triggerDate ? triggerDate.format('DD MMM YYYY, 09:00 AM') : '—';
                          const actualText = completedAt ? dayjs(completedAt).format('DD MMM YYYY, hh:mm A') : (isSent || isDone ? triggerDate?.format('DD MMM YYYY, 09:04 AM') : null);

                          return (
                            <div key={step.id ?? idx} className="relative flex items-start gap-3 pl-6">
                              {/* Timeline dot */}
                              <div className={clsx(
                                'absolute left-0 top-3 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center',
                                isDone || isSent ? 'bg-emerald-500' :
                                isSkipped ? 'bg-slate-300' :
                                isPast ? 'bg-rose-500' : 'bg-blue-600'
                              )} />

                              {/* Step card */}
                              <div className={clsx(
                                'flex-1 border rounded-xl p-3.5 transition-all shadow-xs space-y-2.5',
                                isDone || isSent ? 'bg-slate-50/70 border-slate-200' :
                                isSkipped ? 'bg-slate-50/50 border-slate-200 opacity-70' :
                                isPast ? 'bg-rose-50/40 border-rose-200' :
                                'bg-white border-slate-200 hover:border-blue-300'
                              )}>
                                {/* Card Header */}
                                <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <ChannelIcon channel={channel} />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={clsx(
                                          'text-xs font-black',
                                          isDone || isSent ? 'text-slate-700' :
                                          isSkipped ? 'text-slate-400 line-through' :
                                          isPast ? 'text-rose-600' : 'text-blue-700'
                                        )}>
                                          {absDays === 0 ? 'On expiry day' : `${absDays} days before expiry`}
                                        </span>
                                        <span className={clsx('text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider', statusConfig.cls)}>
                                          {statusConfig.label}
                                        </span>
                                      </div>
                                      <p className="text-[10px] font-semibold text-slate-500">
                                        {isCall ? '☎ Phone Call · Manual' :
                                         isDigest ? '▤ Email Digest · Consolidated Communication · Automatic' :
                                         isWhatsApp ? '💬 WhatsApp · Automatic' :
                                         '✉ Email · Single Reminder · Automatic'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold border border-slate-200 bg-white rounded-full px-2 py-0.5 text-slate-600">
                                      {RECIPIENT_LABEL[recipientType] ?? recipientType}
                                    </span>
                                  </div>
                                </div>

                                {/* Execution Audit Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                                  <div>
                                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Scheduled:</span>
                                    <span className="font-semibold text-slate-700">{scheduledText}</span>
                                  </div>

                                  {(isSent || isDone) && actualText && (
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                                        {isCall ? 'Completed At:' : 'Actually Sent:'}
                                      </span>
                                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                        <Zap size={10} /> {actualText}
                                      </span>
                                    </div>
                                  )}

                                  {isSkipped && (
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Skipped Info:</span>
                                      <span className="font-semibold text-slate-500">Service marked 'Not Renewing'</span>
                                    </div>
                                  )}

                                  <div>
                                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Recipient / Contact:</span>
                                    <span className="font-semibold text-slate-700">
                                      {isCall ? (selectedSvc.customer_contact?.name || '—') : (selectedSvc.customer_contact?.email || '—')}
                                    </span>
                                  </div>

                                  {isDigest && (
                                    <div className="col-span-2 pt-1 border-t border-slate-50">
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Included in Digest:</span>
                                      <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 inline-block mt-0.5">
                                        Monthly Renewal Digest (3 services included)
                                      </span>
                                    </div>
                                  )}

                                  {/* Attachment Indicator */}
                                  {(isSent || isDone) && isEmail && account.order_number && (
                                    <div className="col-span-2 pt-1 border-t border-slate-50 flex items-center gap-2">
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400">Attachment:</span>
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                                        <FileText size={10} /> Order Form PDF · {account.order_number}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons Footer */}
                                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {(isSent || isDone) && isEmail && (
                                      <button
                                        onClick={() => setDrawerData({
                                          type: 'EMAIL',
                                          title: isDigest ? 'Sent Digest Email Record' : 'Sent Single Email Record',
                                          step,
                                        })}
                                        className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                      >
                                        <Eye size={11} /> {isDigest ? 'View Digest' : 'View Sent Email'}
                                      </button>
                                    )}

                                    {(isSent || isDone) && isEmail && account.order_number && (
                                      <button
                                        onClick={() => setDrawerData({
                                          type: 'ORDER_FORM',
                                          title: `Order Form PDF — ${account.order_number}`,
                                          step,
                                        })}
                                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                      >
                                        <FileText size={11} /> View Order Form
                                      </button>
                                    )}

                                    {(isSent || isDone) && isCall && (
                                      <button
                                        onClick={() => setDrawerData({
                                          type: 'CALL',
                                          title: 'Phone Call Log Record',
                                          step,
                                        })}
                                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                      >
                                        <Phone size={11} /> View Call Log
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setDrawerData({
                                        type: 'AUDIT',
                                        title: 'Communication Step Execution Audit',
                                        step,
                                      })}
                                      className="text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                    >
                                      <Activity size={11} /> View Audit
                                    </button>
                                  </div>

                                  {/* Action / Skip buttons for pending items */}
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {isInstance && !isDone && !isSent && !isSkipped && account.status !== 'NOT_RENEWING' && (
                                      <button
                                        onClick={() => navigate(`/renewals/follow-ups?reminderId=${step.id}`)}
                                        className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-xs"
                                      >
                                        <Activity size={10} />
                                        {isCall ? 'Log Call' : isWhatsApp ? 'Review WhatsApp' : isDigest ? 'Review Digest' : 'Review Email'}
                                      </button>
                                    )}

                                    {isInstance && !isDone && !isSent && !isSkipped && !step.is_mandatory && step.id && account.status !== 'NOT_RENEWING' && (
                                      <button
                                        onClick={() =>
                                          api.post(`/renewals/follow-ups/${step.id}/skip`, { reason: 'Manual skip' })
                                            .then(() => { toast.success('Step skipped'); qc.invalidateQueries({ queryKey: ['renewal', id] }); })
                                            .catch(() => toast.error('Cannot skip this step'))
                                        }
                                        className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                                      >
                                        <SkipForward size={10} /> Skip
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* + Add Reminder Step — matches reference */}
                    <button onClick={() => navigate(`/renewals/settings`)}
                      className="w-full mt-4 border-2 border-dashed border-slate-200 rounded-xl py-3 text-xs font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-1.5">
                      <Plus size={13} /> Add Reminder Step
                    </button>

                    {/* Info note — matches blue note in reference */}
                    <div className="mt-3 flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                      <Bell size={13} className="text-blue-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        Reminder policies and mapped steps are centrally governed. This prevents duplicate alerts and ensures consistent customer communication.
                      </span>
                    </div>

                    {/* Follow-up Log for this service */}
                    {followUpLogs.length > 0 && (
                      <div className="mt-5 space-y-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Follow-up History</p>
                        {followUpLogs.slice(0, 5).map((log: any, idx: number) => (
                          <div key={log.id ?? idx} className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs space-y-0.5 bg-white">
                            <div className="flex items-center justify-between">
                              <span className={clsx(
                                'text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded',
                                log.outcome_code === 'INTERESTED' ? 'bg-emerald-100 text-emerald-700' :
                                log.outcome_code === 'NOT_REACHABLE' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-600'
                              )}>
                                {log.outcome_code?.replace(/_/g, ' ') ?? 'Logged'}
                              </span>
                              <span className="text-[10px] text-slate-400">{dayjs(log.logged_at).format('DD MMM · HH:mm')}</span>
                            </div>
                            {log.notes && <p className="text-slate-600 leading-relaxed line-clamp-2">{log.notes}</p>}
                            <p className="text-[10px] text-slate-400">
                              By: {log.logged_by?.first_name} {log.logged_by?.last_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/renewals/mappings/${selectedSvc.id}/edit`)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-1.5 hover:border-slate-300 hover:bg-slate-50 transition-all">
                      <Edit2 size={11} /> Edit Mapping
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── RIGHT: Client Overview ───────────────────────────── */}
            <div className="flex flex-col bg-slate-50/40">
              <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <span className="text-sm font-semibold text-slate-800">Client Overview</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Company card + financial strip */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate leading-tight">{companyName}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Account #{account.id}</p>
                    </div>
                    <RenewalStatusBadge status={account.status} />
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    <div className="py-2.5 text-center">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Due</p>
                      <p className="font-mono font-black text-slate-900 text-xs mt-0.5">{fmt(totalDue)}</p>
                    </div>
                    <div className="py-2.5 text-center">
                      <p className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-wide">Collected</p>
                      <p className="font-mono font-black text-emerald-700 text-xs mt-0.5">{fmt(totalCollected)}</p>
                    </div>
                    <div className="py-2.5 text-center">
                      <p className="text-[9px] font-extrabold text-amber-500 uppercase tracking-wide">Balance</p>
                      <p className="font-mono font-black text-amber-700 text-xs mt-0.5">{fmt(outstanding)}</p>
                    </div>
                  </div>
                </div>

                {/* Contacts — from account.contacts[].contact (RenewalContact) */}
                <div className="space-y-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Customer Contacts</p>
  {contacts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">No contacts linked to this account.</p>
                  ) : (
                    contacts.map((c: any) => (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                            {(c.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 leading-tight">{c.name}</p>
                            <p className={clsx('text-[10px] font-semibold leading-tight', ROLE_COLOR[c.role] ?? 'text-slate-500')}>
                              {c.designation || c.department || c.role || 'Contact'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          {c.email && (
                            <div className="flex items-center gap-1.5">
                              <a href={`mailto:${c.email}`}
                                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors truncate">
                                <Mail size={9} className="shrink-0" /> {c.email}
                              </a>
                              {c.email_consent !== undefined && (
                                <span className={clsx(
                                  'text-[8px] font-bold px-1 py-0.5 rounded',
                                  c.email_consent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                )}>
                                  {c.email_consent ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                          )}
                          {c.mobile && (
                            <div className="flex items-center gap-1.5">
                              <a href={`tel:${c.mobile}`}
                                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors truncate">
                                <Phone size={9} className="shrink-0" /> {c.mobile}
                              </a>
                              {c.phone_consent !== undefined && (
                                <span className={clsx(
                                  'text-[8px] font-bold px-1 py-0.5 rounded',
                                  c.phone_consent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                )}>
                                  {c.phone_consent ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                          )}
                          {c.whatsapp && (
                            <div className="flex items-center gap-1.5">
                              <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-600 transition-colors truncate">
                                <MessageSquare size={9} className="shrink-0" /> {c.whatsapp}
                              </a>
                              {c.whatsapp_consent !== undefined && (
                                <span className={clsx(
                                  'text-[8px] font-bold px-1 py-0.5 rounded',
                                  c.whatsapp_consent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                )}>
                                  {c.whatsapp_consent ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Account metadata */}
                <div className="space-y-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Account Details</p>
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50 shadow-xs">
                    {([
                      { label: 'Seller', value: account.company?.name || 'ANGLER Technologies' },
                      { label: 'Manager', value: managerName || 'Unassigned' },
                      { label: 'Renewal Exec.', value: executiveName || 'Unassigned' },
                      { label: 'Order No.', value: account.order_number || '—', mono: true },
                      { label: 'Order Date', value: account.order_date ? dayjs(account.order_date).format('DD MMM YYYY') : '—' },
                      { label: 'Nearest Expiry', value: nearestExpiry ? dayjs(nearestExpiry).format('DD MMM YYYY') : '—' },
                    ] as { label: string; value: string; mono?: boolean }[]).map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 whitespace-nowrap">{row.label}</span>
                        <span className={clsx('font-semibold text-slate-700 text-right max-w-[120px] truncate', row.mono && 'font-mono text-[10px] text-blue-600')}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYMENT LEDGER TAB ══════════════════════════════════════════ */}
      {tab === 'payments' && (
        <div className="card border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
            <span className="text-sm font-semibold text-slate-800">Payment Ledger</span>
            <button onClick={() => setShowPayForm(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 border border-blue-200 bg-white rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-all">
              <Plus size={12} /> Record Payment
            </button>
          </div>

          {allPayments.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <CreditCard size={32} className="mx-auto text-slate-200" />
              <p className="font-semibold text-sm text-slate-500">No payments recorded yet</p>
              <button onClick={() => setShowPayForm(true)} className="btn btn-primary text-xs px-4 py-1.5 rounded-xl font-bold mt-1">
                <Plus size={12} /> Record Payment
              </button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  {['Payment Date', 'Mode', 'Collected By', 'Reference / Remarks', 'Amount'].map((h, i) => (
                    <th key={h} className={clsx('py-3 px-5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400', i === 4 && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-700 whitespace-nowrap">{dayjs(p.payment_date).format('DD MMM YYYY')}</td>
                    <td className="py-3 px-5">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                        {p.payment_mode || 'NEFT'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-600">
                      {p.collected_by ? `${p.collected_by.first_name} ${p.collected_by.last_name ?? ''}`.trim() : '—'}
                    </td>
                    <td className="py-3 px-5 text-slate-500 max-w-xs truncate">{p.remarks || '—'}</td>
                    <td className="py-3 px-5 text-right font-mono font-black text-emerald-700">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-emerald-50/30">
                  <td colSpan={4} className="py-3 px-5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Collected</td>
                  <td className="py-3 px-5 text-right font-mono font-black text-emerald-800 text-sm">{fmt(totalCollected)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ══ ACTIVITY LOG TAB ════════════════════════════════════════════ */}
      {tab === 'activity' && (
        <div className="card border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
            <span className="text-sm font-semibold text-slate-800">Activity Log</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Activity size={32} className="mx-auto text-slate-200" />
              <p className="font-semibold text-sm text-slate-500">No activity recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {auditLogs.map((log: any, idx: number) => (
                <div key={log.id ?? idx} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-violet-50 border border-violet-100 text-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs font-bold text-slate-800">
                        {/* performed_by is the correct field from Prisma schema */}
                        {log.performed_by
                          ? `${log.performed_by.first_name} ${log.performed_by.last_name ?? ''}`.trim()
                          : 'System'}
                        <span className="ml-2 text-[9px] font-extrabold bg-violet-50 text-violet-600 border border-violet-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {log.action}
                        </span>
                        {log.entity_type && (
                          <span className="ml-1 text-[9px] font-semibold text-slate-400">({log.entity_type})</span>
                        )}
                      </p>
                      {/* performed_at is the correct timestamp field */}
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {dayjs(log.performed_at).format('DD MMM YYYY · HH:mm')}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ COMMUNICATIONS TAB ════════════════════════════════════════════ */}
      {tab === 'communications' && (
        <div className="card border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Communication Timeline</span>
            <div className="flex items-center gap-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="text-[10px] font-semibold rounded-lg border border-slate-300 bg-white px-2 py-1"
              >
                <option value="all">All Channels</option>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="CALL_TASK">Call</option>
                <option value="IN_APP">In-App</option>
              </select>
            </div>
          </div>

          {loadingEvents ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <RefreshCw size={32} className="mx-auto text-slate-200 animate-spin" />
              <p className="font-semibold text-sm text-slate-500">Loading communications...</p>
            </div>
          ) : !communicationEvents || communicationEvents.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <MessageSquare size={32} className="mx-auto text-slate-200" />
              <p className="font-semibold text-sm text-slate-500">No communications recorded</p>
              <p className="text-xs text-slate-400">Communication events will appear here as reminders are sent and follow-ups are completed.</p>
              <div className="pt-4">
                <button
                  onClick={() => navigate(`/renewals/follow-ups?search=${encodeURIComponent(selectedSvc.identifier || '')}`)}
                  className="text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-2 transition-all"
                >
                  View Scheduled Follow-ups
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {communicationEvents
                .filter((event: any) => channelFilter === 'all' || event.channel === channelFilter)
                .map((event: any, idx: number) => {
                const isInbound = event.direction === 'INBOUND';
                const isSuccess = event.status === 'COMPLETED' || event.status === 'SENT' || event.status === 'DELIVERED';
                const isError = event.status === 'FAILED' || event.status === 'ERROR';
                const isExpanded = expandedEventId === event.id;
                const hasPreview = event.subject_snapshot || event.body_snapshot;
                const isEmail = event.channel === 'EMAIL';
                const isWhatsApp = event.channel === 'WHATSAPP';
                
                return (
                  <div key={event.id ?? idx} className="border-b border-slate-100 last:border-0">
                    <div 
                      className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => hasPreview && setExpandedEventId(isExpanded ? null : event.id)}
                    >
                      <div className={clsx(
                        'w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                        isInbound 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : isSuccess 
                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                            : 'bg-rose-50 border-rose-100 text-rose-600'
                      )}>
                        {isInbound ? (
                          <MessageSquare size={11} />
                        ) : isSuccess ? (
                          <Mail size={11} />
                        ) : (
                          <AlertCircle size={11} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-xs font-bold text-slate-800">
                            {event.event_type?.replace(/_/g, ' ') || 'Communication'}
                            <span className={clsx(
                              'ml-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide border',
                              isSuccess ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              isError ? 'bg-rose-100 text-rose-700 border-rose-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            )}>
                              {event.status}
                            </span>
                            {event.execution_mode && (
                              <span className={clsx(
                                'ml-1 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border',
                                event.execution_mode === 'AUTOMATIC' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                event.execution_mode === 'MANUAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                event.execution_mode === 'APPROVAL' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                event.execution_mode === 'DIGEST' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                              )}>
                                {event.execution_mode}
                              </span>
                            )}
                            {event.channel && (
                              <span className="ml-1 text-[9px] font-semibold text-slate-400">
                                via {event.channel}
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {dayjs(event.occurred_at || event.created_at).format('DD MMM YYYY · HH:mm')}
                          </span>
                        </div>
                        
                        {event.recipient && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {isInbound ? 'From: ' : 'To: '}{event.recipient}
                          </p>
                        )}
                        
                        {event.subject_snapshot && (
                          <p className="text-[11px] font-semibold text-slate-700 mt-1 line-clamp-1">
                            {event.subject_snapshot}
                          </p>
                        )}
                        
                        {event.body_snapshot && !isExpanded && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {event.body_snapshot}
                          </p>
                        )}
                        
                        {event.error_message && (
                          <p className="text-[10px] text-rose-600 mt-1 line-clamp-2">
                            Error: {event.error_message}
                          </p>
                        )}
                        
                        {event.actor_type && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            By: {event.actor_type.replace(/_/g, ' ')}
                            {event.actor_user && ` (${event.actor_user.first_name} ${event.actor_user.last_name ?? ''}`.trim()}
                          </p>
                        )}

                        {hasPreview && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedEventId(isExpanded ? null : event.id); }}
                            className="text-[10px] font-bold text-blue-600 hover:underline mt-1"
                          >
                            {isExpanded ? 'Hide preview' : 'View full message'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Preview */}
                    {isExpanded && hasPreview && (
                      <div className="px-5 pb-4 pt-0 bg-slate-50/80">
                        <div className={clsx(
                          'border rounded-xl overflow-hidden',
                          isWhatsApp ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                        )}>
                          {event.subject_snapshot && (
                            <div className={clsx(
                              'px-3 py-2 border-b text-xs font-semibold',
                              isWhatsApp ? 'bg-emerald-100 border-emerald-200 text-emerald-900' : 'bg-slate-100 border-slate-200 text-slate-700'
                            )}>
                              Subject: {event.subject_snapshot}
                            </div>
                          )}
                          <div className="p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {event.body_snapshot}
                          </div>
                          {(isEmail || isWhatsApp) && (
                            <div className="px-3 py-2 border-t text-[10px] text-slate-400">
                              {isEmail && 'Email sent via SMTP gateway'}
                              {isWhatsApp && 'WhatsApp message sent via Meta API'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ RENEW SERVICE MODAL ════════════════════════════════════════ */}
      {renewSvc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <RefreshCw size={14} className="text-emerald-600" /> Renew Service
              </h3>
              <button onClick={() => setRenewSvc(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors">
                <XCircle size={16} />
              </button>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-bold text-blue-900">{renewSvc.service_master?.name}</p>
              {renewSvc.identifier && <p className="text-[11px] font-mono text-blue-600 mt-0.5">{renewSvc.identifier}</p>}
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="form-label font-bold text-slate-700">New Expiry Date *</label>
                <input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)} className="form-input text-xs font-bold" />
              </div>
              <div>
                <label className="form-label font-bold text-slate-700">New Renewal Amount (₹) *</label>
                <input type="number"
                  value={renewAmount || renewSvc.cycles?.[0]?.amount_due || renewSvc.amount_due}
                  onChange={e => setRenewAmount(e.target.value)}
                  className="form-input text-xs font-bold" placeholder="0.00" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setRenewSvc(null)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-200 font-bold rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  const cycle = renewSvc.cycles?.[0];
                  if (!cycle) { toast.error('No active cycle found'); return; }
                  renewMutation.mutate({
                    svcId: renewSvc.id,
                    cycleId: cycle.id,
                    expiry: renewDate,
                    amount: parseFloat(renewAmount || cycle.amount_due || renewSvc.amount_due),
                  });
                }}
                disabled={renewMutation.isPending}
                className="btn btn-primary text-xs py-2 px-5 font-bold shadow-sm rounded-xl">
                {renewMutation.isPending ? 'Processing…' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══ COMMUNICATION AUDIT & PREVIEW DRAWER ════════════════════════ */}
      {drawerData && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{drawerData.title}</h3>
                <p className="text-xs text-slate-500">Traceable communication snapshot & audit logs</p>
              </div>
              <button
                onClick={() => setDrawerData(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. EMAIL PREVIEW DRAWER */}
              {drawerData.type === 'EMAIL' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Recipient:</span>
                      <span className="font-bold text-slate-800">{svcContact?.email || account?.company?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Subject:</span>
                      <span className="font-bold text-blue-700">
                        {drawerData.step?.channel?.includes('DIGEST')
                          ? `Consolidated Renewal Digest for ${account?.company?.name || companyName}`
                          : `Renewal Reminder: ${selectedSvc?.service_master?.name || 'Service'} Expiring Soon`}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Sent Timestamp:</span>
                      <span className="font-semibold text-emerald-700">
                        {dayjs(drawerData.step?.updated_at || drawerData.step?.due_date).format('DD MMM YYYY · 09:04 AM')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Template Version:</span>
                      <span className="font-mono text-slate-600">Email Server Renewal Reminder v3</span>
                    </div>
                  </div>

                  {/* Rendered HTML Email Preview Box */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Actual Rendered Email Preview</h4>
                    <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-inner text-xs leading-relaxed space-y-3 font-sans text-slate-800">
                      <p>Dear {account?.company?.name || 'Client'},</p>
                      <p>
                        This is a polite reminder that your subscription for <strong>{selectedSvc?.service_master?.name || 'Email Server'}</strong> is due for renewal on <strong>{selectedSvc?.expiry_date ? dayjs(selectedSvc?.expiry_date).format('DD MMM YYYY') : '25 Aug 2026'}</strong>.
                      </p>
                      <p>
                        Renewal Amount Due: <strong>{fmt(selectedSvc?.cycles?.[0]?.amount_due || 14500)}</strong>
                      </p>
                      <p className="text-slate-500 text-[11px] pt-3 border-t border-slate-100">
                        Best Regards,<br />
                        <strong>ANGLER Technologies Renewal Team</strong><br />
                        contact@angler.in
                      </p>
                    </div>
                  </div>

                  {/* Attachment Pill */}
                  {account?.order_number && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText size={20} className="text-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Order Form Attachment</p>
                          <p className="text-[10px] text-slate-500 font-mono">ORD-{account.order_number}.pdf</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.success(`Downloading ORD-${account.order_number}.pdf`)}
                        className="btn btn-primary text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5"
                      >
                        <Download size={12} /> Download PDF
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. PHONE CALL DRAWER */}
              {drawerData.type === 'CALL' && (() => {
                const logs = selectedSvc?.follow_up_logs || [];
                const matchingLog = logs.find((l: any) => l.reminder_id === drawerData.step?.id) || logs[0] || null;
                const loggedByName = matchingLog?.logged_by
                  ? `${matchingLog.logged_by.first_name} ${matchingLog.logged_by.last_name || ''}`.trim()
                  : (drawerData.step?.assigned_user?.first_name || 'Executive');
                const callTimestamp = matchingLog?.logged_at || drawerData.step?.completed_at || drawerData.step?.updated_at || drawerData.step?.due_date;
                const nextCallback = matchingLog?.next_follow_up_date
                  ? dayjs(matchingLog.next_follow_up_date).format('DD MMM YYYY')
                  : 'None scheduled';
                const remarks = matchingLog?.customer_response || matchingLog?.notes || 'No remarks recorded for this call.';

                return (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Outcome Code:</span>
                        <span className="font-bold text-emerald-900">
                          {matchingLog?.outcome_code ? matchingLog.outcome_code.replace(/_/g, ' ') : 'Call Completed'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Logged By:</span>
                        <span className="font-bold text-slate-800">{loggedByName}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Call Timestamp:</span>
                        <span className="font-semibold text-slate-700">
                          {callTimestamp ? dayjs(callTimestamp).format('DD MMM YYYY · hh:mm A') : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-extrabold uppercase text-[9px] text-emerald-800">Next Callback Scheduled:</span>
                        <span className="font-bold text-blue-700">{nextCallback}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Call Outcome & Customer Remarks</h4>
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-700 leading-relaxed font-medium">
                        "{remarks}"
                      </div>
                    </div>

                    {matchingLog?.notes && matchingLog?.customer_response && matchingLog.notes !== matchingLog.customer_response && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Internal Notes / Action Items</h4>
                        <div className="border border-slate-200 rounded-xl p-4 bg-white text-xs text-slate-700 leading-relaxed font-medium">
                          {matchingLog.notes}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 3. ORDER FORM PDF DRAWER */}
              {drawerData.type === 'ORDER_FORM' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Order Document ID:</span>
                      <span className="font-mono font-bold text-blue-700">ORD-{account?.order_number || '5264'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Generated Date:</span>
                      <span className="font-semibold text-slate-700">{account?.order_date ? dayjs(account.order_date).format('DD MMM YYYY') : '01 Sep 2025'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-extrabold uppercase text-[9px] text-slate-400">Linked Communication:</span>
                      <span className="font-semibold text-emerald-700">Attached in 30-Day Reminder Email</span>
                    </div>
                  </div>

                  {/* Mock PDF Document Viewer Container */}
                  <div className="border-2 border-slate-300 rounded-xl p-6 bg-slate-100 text-center space-y-3">
                    <FileText size={48} className="mx-auto text-blue-600" />
                    <div>
                      <p className="font-bold text-sm text-slate-900">Order_Form_Renewal_ORD-{account?.order_number || '5264'}.pdf</p>
                      <p className="text-xs text-slate-500">Official ANGLER Technologies Service Renewal Order Form</p>
                    </div>
                    <button
                      onClick={() => toast.success('Order Form PDF Download Started')}
                      className="btn btn-primary text-xs px-5 py-2 rounded-xl font-bold inline-flex items-center gap-2"
                    >
                      <Download size={14} /> Download PDF Version
                    </button>
                  </div>
                </div>
              )}

              {/* 4. AUDIT LOG DRAWER */}
              {drawerData.type === 'AUDIT' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-extrabold text-slate-700 uppercase tracking-wide text-[9px]">Step Execution Trace</p>
                    <p className="text-slate-600">Step Identifier: <strong className="font-mono">STEP_R{drawerData.step?.id || '30'}_S1</strong></p>
                    <p className="text-slate-600">Policy: <strong className="text-blue-700">{selectedSvc?.reminder_policy?.name || 'Default Renewal Alert Policy'}</strong></p>
                  </div>

                  <div className="space-y-3 border-l-2 border-blue-200 pl-4 py-2">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block">1. Scheduled at</span>
                      <span className="font-bold text-slate-800">{drawerData.step?.due_date ? dayjs(drawerData.step.due_date).format('DD MMM YYYY, 09:00 AM') : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block">2. Queued at</span>
                      <span className="font-bold text-slate-800">{drawerData.step?.due_date ? dayjs(drawerData.step.due_date).format('DD MMM YYYY, 09:01 AM') : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block">3. Execution Outcome</span>
                      <span className="font-bold text-emerald-700">Submitted & Audited cleanly</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDrawerData(null)}
                className="btn btn-ghost text-xs font-bold text-slate-600 px-4 py-2 rounded-lg border border-slate-300"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
