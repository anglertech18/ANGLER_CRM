import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Phone, Clock, CheckCircle2, AlertCircle,
  Search, RefreshCw, ChevronRight, X, Mail,
  Download, BellRing, ArrowRight, Check, SkipForward,
  MessageSquare, ExternalLink, Bell, Zap, CalendarClock, UserCheck, ShieldCheck,
  Calendar, FileText, Grid
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';
import DataTableHeaderFilter from '../../components/DataTableHeaderFilter';

dayjs.extend(relativeTime);

type QueueTab = 'today' | 'upcoming' | 'overdue' | 'completed' | 'skipped';

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; cls: string; auto: boolean; tooltip: string }> = {
  IN_APP:              { label: 'CRM Alert',    icon: <Bell size={10} />,          cls: 'bg-violet-50 text-violet-700 border-violet-200', auto: true, tooltip: 'In-app system notification' },
  EMAIL:               { label: 'Email',         icon: <Mail size={10} />,          cls: 'bg-blue-50 text-blue-700 border-blue-200',       auto: true, tooltip: 'Automated email sent via SMTP' },
  EMAIL_DIRECT:        { label: 'Email',         icon: <Mail size={10} />,          cls: 'bg-blue-50 text-blue-700 border-blue-200',       auto: true, tooltip: 'Automated email sent via SMTP' },
  EMAIL_DRAFT:         { label: 'Draft Email',   icon: <Mail size={10} />,          cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', auto: false, tooltip: 'Email draft requiring manual review' },
  CALL:                { label: 'Phone Call',    icon: <Phone size={10} />,         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', auto: false, tooltip: 'Manual call task assigned to user' },
  PHONE:               { label: 'Phone Call',    icon: <Phone size={10} />,         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', auto: false, tooltip: 'Manual call task assigned to user' },
  CALL_TASK:           { label: 'Phone Call',    icon: <Phone size={10} />,         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', auto: false, tooltip: 'Manual call task assigned to user' },
  WHATSAPP:            { label: 'WhatsApp',      icon: <MessageSquare size={10} />, cls: 'bg-green-50 text-green-700 border-green-200',    auto: true, tooltip: 'WhatsApp message sent via Meta API' },
  DIGEST:              { label: 'Digest',        icon: <BellRing size={10} />,      cls: 'bg-amber-50 text-amber-700 border-amber-200',    auto: true, tooltip: 'Consolidated daily digest notification' },
  CONSOLIDATED_DIGEST: { label: 'Digest Sent',  icon: <BellRing size={10} />,      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', auto: true, tooltip: 'Consolidated digest already sent' },
  COMBINED_SENT:       { label: 'Bundled',       icon: <BellRing size={10} />,      cls: 'bg-slate-50 text-slate-600 border-slate-200',    auto: true, tooltip: 'Multiple notifications bundled together' },
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: 'Pending', cls: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  DUE:       { label: 'Due Now', cls: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500' },
  SENT:      { label: 'Sent',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  COMPLETED: { label: 'Done',    cls: 'bg-slate-100 text-slate-600 border-slate-200',     dot: 'bg-slate-400' },
  SKIPPED:   { label: 'Skipped', cls: 'bg-rose-50 text-rose-600 border-rose-200',         dot: 'bg-rose-300' },
};

const OUTCOME_OPTIONS = [
  { value: 'CONTACTED_CALLBACK',         label: 'Contacted — Callback Expected' },
  { value: 'CONTACTED_CONFIRMED',        label: 'Contacted — Renewal Confirmed' },
  { value: 'CONTACTED_PO_PROCESS',       label: 'Contacted — PO Under Process' },
  { value: 'CONTACTED_PAYMENT_PROMISED', label: 'Contacted — Payment Promised' },
  { value: 'NO_ANSWER',                  label: 'No Answer — Will Retry' },
  { value: 'NO_ANSWER_LEFT_MESSAGE',     label: 'No Answer — Left Voicemail' },
  { value: 'DECLINED',                   label: 'Client Declined Renewal' },
  { value: 'RENEWED',                    label: 'Renewed & Paid' },
];

function resolveAssigneeName(item: any): string {
  const u = item.assigned_user ||
    item.cycle?.service_instance?.assigned_user ||
    item.cycle?.service_instance?.renewal_account?.renewal_executive;
  if (!u) return 'Unassigned';
  const name = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ');
  return name.trim() || 'Unassigned';
}

function avatarInitials(name: string) {
  return (name || '?').split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
}

export default function RenewalFollowUps() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('search') || '';
  const directReminderId = searchParams.get('reminderId') || '';

  const [activeTab, setActiveTab]           = useState<QueueTab>('today');
  const [search, setSearch]                 = useState(urlQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(urlQuery);
  const [channelFilter, setChannelFilter]   = useState('');
  const [assignedOnly, setAssignedOnly]     = useState(false);
  const [assignedUser, setAssignedUser]     = useState('');
  const [page, setPage]                     = useState(1);
  const [selectedItem, setSelectedItem]     = useState<any | null>(null);

  // DataTables Sorting & Column Filters State
  const [sortField, setSortField] = useState('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  const [outcomeCode, setOutcomeCode]           = useState('CONTACTED_CALLBACK');
  const [customerResponse, setCustomerResponse] = useState('');
  const [notes, setNotes]                       = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [selectedChannelAction, setSelectedChannelAction] = useState<any>(null);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [whatsappPreview, setWhatsappPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isRecordResponseOpen, setIsRecordResponseOpen] = useState(false);
  const previewRequestRef = useRef(0);

  const closeSelectedItem = () => {
    setSelectedItem(null);
    if (directReminderId) {
      const next = new URLSearchParams(searchParams);
      next.delete('reminderId');
      setSearchParams(next, { replace: true });
    }
  };

  // Reset form state when drawer opens/closes
  useEffect(() => {
    if (selectedItem) {
      setOutcomeCode('CONTACTED_CALLBACK');
      setCustomerResponse('');
      setNotes('');
      setNextFollowUpDate(dayjs().add(1, 'day').format('YYYY-MM-DD'));
      setEmailPreview(null);
      setWhatsappPreview(null);
      setIsRecordResponseOpen(false);
      
      // Auto-select the first pending channel action
      const pendingAction = selectedItem.channel_actions?.find((a: any) => 
        a.status === 'PENDING' || a.status === 'DUE'
      );
      setSelectedChannelAction(pendingAction || null);

      // Fetch preview based on channel type
      if (pendingAction) {
        if (pendingAction.channel === 'EMAIL' || pendingAction.channel === 'EMAIL_DIRECT' || pendingAction.channel === 'EMAIL_DRAFT') {
          fetchEmailPreview(pendingAction.id);
        } else if (pendingAction.channel === 'WHATSAPP') {
          fetchWhatsAppPreview(pendingAction.id);
        }
      }
    } else {
      setSelectedChannelAction(null);
      setEmailPreview(null);
      setWhatsappPreview(null);
    }
  }, [selectedItem]);

  const fetchEmailPreview = async (channelActionId: number) => {
    const requestId = ++previewRequestRef.current;
    setIsPreviewLoading(true);
    try {
      const response = await api.get(`/renewal-channel-actions/${channelActionId}/preview-email`);
      if (requestId === previewRequestRef.current) setEmailPreview(response.data);
    } catch (err: any) {
      console.error('Failed to fetch email preview:', err);
      toast.error(err.response?.data?.detail || 'Failed to load email preview');
    } finally {
      if (requestId === previewRequestRef.current) setIsPreviewLoading(false);
    }
  };

  const fetchWhatsAppPreview = async (channelActionId: number) => {
    const requestId = ++previewRequestRef.current;
    setIsPreviewLoading(true);
    try {
      const response = await api.get(`/renewal-channel-actions/${channelActionId}/preview-whatsapp`);
      if (requestId === previewRequestRef.current) setWhatsappPreview(response.data);
    } catch (err: any) {
      console.error('Failed to fetch WhatsApp preview:', err);
      toast.error(err.response?.data?.detail || 'Failed to load WhatsApp preview');
    } finally {
      if (requestId === previewRequestRef.current) setIsPreviewLoading(false);
    }
  };

  const selectChannelAction = (action: any) => {
    setSelectedChannelAction(action);
    setEmailPreview(null);
    setWhatsappPreview(null);
    const channel = String(action?.channel || '').toUpperCase();
    if (channel === 'EMAIL' || channel === 'EMAIL_DIRECT' || channel === 'EMAIL_DRAFT') {
      fetchEmailPreview(action.id);
    } else if (channel === 'WHATSAPP' || channel === 'WA') {
      fetchWhatsAppPreview(action.id);
    }
  };

  const queueEmailMutation = useMutation({
    mutationFn: (channelActionId: number) => 
      api.post(`/renewal-channel-actions/${channelActionId}/queue-email`),
    onSuccess: () => {
      toast.success('Email queued for sending');
      refetch();
      closeSelectedItem();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to queue email');
    },
  });

  const approveEmailMutation = useMutation({
    mutationFn: (channelActionId: number) => 
      api.post(`/renewal-channel-actions/${channelActionId}/approve-email`),
    onSuccess: () => {
      toast.success('Email approved and queued');
      refetch();
      closeSelectedItem();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to approve email');
    },
  });

  const queueWhatsAppMutation = useMutation({
    mutationFn: (channelActionId: number) => 
      api.post(`/renewal-channel-actions/${channelActionId}/queue-whatsapp`),
    onSuccess: () => {
      toast.success('WhatsApp message queued for sending');
      refetch();
      closeSelectedItem();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to queue WhatsApp message');
    },
  });

  const approveWhatsAppMutation = useMutation({
    mutationFn: (channelActionId: number) => 
      api.post(`/renewal-channel-actions/${channelActionId}/approve-whatsapp`),
    onSuccess: () => {
      toast.success('WhatsApp message approved and queued');
      refetch();
      closeSelectedItem();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to approve WhatsApp message');
    },
  });

  // Channel-aware action resolver using canonical_next_action
  const resolveNextAction = (item: any) => {
    const channelActions = item.channel_actions || [];
    const pendingActions = channelActions.filter((a: any) => 
      a.status === 'PENDING' || a.status === 'DUE'
    );

    if (item.canonical_next_action) {
      return {
        channel: item.canonical_next_action.channel,
        label: item.canonical_next_action.button_label,
        channel_label: item.canonical_next_action.channel_label,
        is_digest: item.canonical_next_action.is_digest,
        pendingActions,
      };
    }
    
    if (channelActions.length > 0) {
      if (pendingActions.length === 1) {
        const action = pendingActions[0];
        return {
          channel: action.channel,
          action: getActionForChannel(action.channel, action.status),
          label: getButtonLabel(action.channel, action.status),
          pendingActions,
        };
      }
      if (pendingActions.length > 1) {
        return {
          channel: 'MULTI',
          action: 'SUMMARY',
          label: `${pendingActions.length} Actions Pending`,
          pendingActions,
        };
      }
      if (pendingActions.length === 0) {
        return {
          channel: 'AUDIT',
          action: 'VIEW_AUDIT',
          label: 'View Audit',
          pendingActions,
        };
      }
    }
    
    const actionType = item.action_type || 'EMAIL_DIRECT';
    return {
      channel: actionType,
      action: getActionForChannel(actionType, item.status),
      label: getButtonLabel(actionType, item.status),
      pendingActions: [],
    };
  };

  const getActionForChannel = (channel: string, status: string) => {
    const ch = (channel || '').toUpperCase();
    if (ch === 'PHONE' || ch === 'CALL' || ch === 'CALL_TASK') {
      if (status === 'PENDING' || status === 'DUE') return 'LOG_CALL';
      if (status === 'COMPLETED') return 'VIEW_CALL_AUDIT';
    }
    if (ch === 'WHATSAPP' || ch === 'WA') {
      if (status === 'PENDING' || status === 'DUE') return 'PREVIEW_SEND_WHATSAPP';
      if (status === 'SENT') return 'VIEW_SENT_WHATSAPP';
      if (status === 'FAILED') return 'RETRY_WHATSAPP';
    }
    if (ch === 'EMAIL' || ch === 'EMAIL_DIRECT' || ch === 'EMAIL_DRAFT') {
      if (status === 'PENDING' || status === 'DUE') return 'PREVIEW_SEND_EMAIL';
      if (status === 'SENT') return 'VIEW_SENT_EMAIL';
      if (status === 'FAILED') return 'RETRY_EMAIL';
    }
    return 'VIEW_DETAILS';
  };

  const getButtonLabel = (channel: string, status: string) => {
    const ch = (channel || '').toUpperCase();
    if (ch === 'PHONE' || ch === 'CALL' || ch === 'CALL_TASK') {
      if (status === 'COMPLETED') return 'View Audit';
      return 'Log Call';
    }
    if (ch === 'WHATSAPP' || ch === 'WA') {
      if (status === 'SENT') return 'View Message';
      if (status === 'FAILED') return 'Retry WhatsApp';
      return 'Review WhatsApp';
    }
    if (ch === 'EMAIL' || ch === 'EMAIL_DIRECT' || ch === 'EMAIL_DRAFT') {
      if (status === 'SENT') return 'View Email';
      if (status === 'FAILED') return 'Retry Email';
      return 'Review Email';
    }
    if (ch === 'DIGEST' || ch === 'CONSOLIDATED_DIGEST') {
      return 'View Digest';
    }
    return 'View Details';
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeTab, debouncedSearch, channelFilter, assignedOnly, assignedUser]);
  useEffect(() => { if (urlQuery) setSearch(urlQuery); }, [urlQuery]);

  const { data: counts } = useQuery({
    queryKey: ['renewal-followup-counts', assignedOnly],
    queryFn: () => api.get('/renewal-followups/counts', {
      params: { assignedOnly: assignedOnly ? 'true' : undefined }
    }).then(r => r.data),
    refetchInterval: 30000,
  });
  const { data: rawUsers } = useQuery({
    queryKey: ['users-list', 'renewal-followups'],
    queryFn: () => api.get('/users', { params: { limit: 200 } }).then(r => r.data),
  });
  const users: any[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data ?? []);

  const { data: listResp, isLoading, refetch } = useQuery({
    queryKey: ['renewal-followups', activeTab, debouncedSearch, channelFilter, assignedOnly, assignedUser, page, directReminderId],
    queryFn: () => api.get('/renewal-followups', {
      params: {
        tab: activeTab,
        search: directReminderId ? undefined : (debouncedSearch || undefined),
        reminderId: directReminderId || undefined,
        channel: channelFilter || undefined,
        assignedOnly: assignedOnly ? 'true' : undefined,
        assignedUser: assignedOnly ? undefined : (assignedUser || undefined),
        page,
        limit: directReminderId ? 1 : 100,
        includeChannelActions: 'true',
      }
    }).then(r => r.data),
    staleTime: 10000,
  });

  // ── Dedicated Task Audit Query ─────────────────────────────────────────────
  const { data: auditData, isLoading: isLoadingAudit, isError: isAuditError, refetch: refetchAudit } = useQuery({
    queryKey: ['renewal-follow-up-audit', selectedItem?.id],
    queryFn: () => api.get(`/renewal-followups/${selectedItem.id}/audit`).then(r => r.data),
    enabled: !!selectedItem?.id,
  });

  const rawItems: any[] = listResp?.data ?? (Array.isArray(listResp) ? listResp : []);

  useEffect(() => {
    if (!directReminderId || selectedItem || rawItems.length === 0) return;
    const directItem = rawItems.find(item => String(item.id) === directReminderId);
    if (directItem) setSelectedItem(directItem);
  }, [directReminderId, rawItems, selectedItem]);

  // ── Unique Column Values Extractor ──────────────────────────────────────────
  const uniqueOptions = useMemo(() => {
    const clients = new Set<string>();
    const services = new Set<string>();
    const channels = new Set<string>();
    const assignees = new Set<string>();
    const statuses = new Set<string>();

    rawItems.forEach(i => {
      const cName = i.cycle?.service_instance?.renewal_account?.client_company?.name || i.client_name;
      const sName = i.cycle?.service_instance?.service_master?.name;
      const ch    = i.action_type;
      const ass   = resolveAssigneeName(i);
      const st    = i.status;

      if (cName) clients.add(cName);
      if (sName) services.add(sName);
      if (ch) channels.add(ch);
      if (ass) assignees.add(ass);
      if (st) statuses.add(st);
    });

    return {
      client: Array.from(clients).sort(),
      service: Array.from(services).sort(),
      channel: Array.from(channels).sort(),
      assignee: Array.from(assignees).sort(),
      status: Array.from(statuses).sort(),
    };
  }, [rawItems]);

  // ── Data Filter & Sort Pipeline ───────────────────────────────────────────
  const items = useMemo(() => {
    let result = [...rawItems];

    for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
      if (allowedSet && allowedSet.size > 0) {
        result = result.filter(item => {
          let val = '';
          if (colKey === 'client') val = item.cycle?.service_instance?.renewal_account?.client_company?.name || item.client_name || '';
          else if (colKey === 'service') val = item.cycle?.service_instance?.service_master?.name || '';
          else if (colKey === 'channel') val = item.action_type || '';
          else if (colKey === 'assignee') val = resolveAssigneeName(item);
          else if (colKey === 'status') val = item.status || '';
          return allowedSet.has(val);
        });
      }
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortField === 'due_date') { valA = String(a.due_date || ''); valB = String(b.due_date || ''); }
        else if (sortField === 'client') { valA = a.client_name || ''; valB = b.client_name || ''; }

        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rawItems, columnFilters, sortField, sortOrder]);

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  };

  // Complete Followup Mutation
  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.post(`/renewal-followups/${id}/complete`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('Follow-up outcome logged successfully!');
      qc.invalidateQueries({ queryKey: ['renewal-followups'] });
      qc.invalidateQueries({ queryKey: ['renewal-followup-counts'] });
      qc.invalidateQueries({ queryKey: ['renewal-follow-up-audit', selectedItem?.id] });
      qc.invalidateQueries({ queryKey: ['renewal'] });
      refetchAudit();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to log outcome'),
  });

  const TABS: Array<{ id: QueueTab; label: string; count: number }> = [
    { id: 'today',     label: 'Today',     count: counts?.today ?? 0 },
    { id: 'overdue',   label: 'Overdue',   count: counts?.overdue ?? 0 },
    { id: 'upcoming',  label: 'Upcoming',  count: counts?.upcoming ?? 0 },
    { id: 'completed', label: 'Completed', count: counts?.completed ?? 0 },
    { id: 'skipped',   label: 'Skipped',   count: counts?.skipped ?? 0 },
  ];

  return (
    <div className="page-wrapper renewal-page-wrapper space-y-4">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
            <span>Renewals</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-700 font-semibold">Follow-up Queue</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 leading-none flex items-center gap-2">
            <CalendarClock className="text-blue-600" size={24} /> Follow-up Task Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Manage daily customer outreach, log phone call outcomes, and audit automated digest timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => refetch()} className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 shadow-xs" title="Refresh Queue">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* QUEUE TABS */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={clsx('px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap',
              activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
            {t.label}
            <span className={clsx('text-[10px] font-extrabold px-1.5 py-0.5 rounded-full',
              activeTab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
          <input type="text" placeholder="Search client, service, identifier..." value={search}
            onChange={e => setSearch(e.target.value)} className="form-input text-xs pl-9 py-2 w-full rounded-xl" />
        </div>

        {/* Task Scope Toggle: All Tasks vs Assigned to Me */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAssignedOnly(false)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
              !assignedOnly
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <ShieldCheck size={13} className={!assignedOnly ? 'text-blue-600' : 'text-slate-400'} />
            <span>All Tasks</span>
          </button>
          <button
            type="button"
            onClick={() => setAssignedOnly(true)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
              assignedOnly
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <UserCheck size={13} className={assignedOnly ? 'text-blue-600' : 'text-slate-400'} />
            <span>Assigned to Me</span>
          </button>
        </div>

        {!assignedOnly && (
          <select
            value={assignedUser}
            onChange={e => setAssignedUser(e.target.value)}
            className="form-input text-xs py-2 w-full sm:w-44 rounded-xl"
          >
            <option value="">All Executives</option>
            <option value="UNASSIGNED">Unassigned</option>
            {users.map((user: any) => (
              <option key={user.id} value={String(user.id)}>
                {[user.first_name, user.last_name].filter(Boolean).join(' ')}
              </option>
            ))}
          </select>
        )}

        {Object.keys(columnFilters).length > 0 && (
          <button onClick={() => setColumnFilters({})} className="text-[11px] font-bold text-red-600 border border-red-200 bg-red-50 px-2.5 py-1 rounded-lg">
            Clear Column Filters
          </button>
        )}
        <div className="ml-auto shrink-0 text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          {listResp?.total ?? items.length} total result{(listResp?.total ?? items.length) !== 1 ? 's' : ''}
        </div>
      </div>

      {/* MAIN: FULL WIDTH TABLE */}
      <div className="w-full card border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <DataTableHeaderFilter
                  title="Due Date & Audit Sent"
                  field="due_date"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={[]}
                  selectedValues={new Set()}
                  onFilterChange={() => {}}
                  className="w-[16%] min-w-[140px]"
                />
                <DataTableHeaderFilter
                  title="Customer Company"
                  field="client"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={uniqueOptions.client}
                  selectedValues={columnFilters['client'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, client: set }))}
                  className="w-[24%] min-w-[180px]"
                />
                <DataTableHeaderFilter
                  title="Service Item"
                  field="service"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={uniqueOptions.service}
                  selectedValues={columnFilters['service'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, service: set }))}
                  className="w-[24%] min-w-[180px]"
                />
                <DataTableHeaderFilter
                  title="Multi-Channel Status"
                  field="channel"
                  allValues={uniqueOptions.channel}
                  selectedValues={columnFilters['channel'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, channel: set }))}
                  className="w-[18%] min-w-[150px]"
                />
                <DataTableHeaderFilter
                  title="Assigned Executive"
                  field="assignee"
                  allValues={uniqueOptions.assignee}
                  selectedValues={columnFilters['assignee'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, assignee: set }))}
                  className="w-[10%] min-w-[100px]"
                />
                <th className="w-[14%] min-w-[120px] py-2.5 px-3 text-[9px] font-extrabold uppercase tracking-widest text-slate-700 text-center bg-slate-100 border-b border-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="skeleton h-3.5 rounded-md" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center">
                    <BellRing size={28} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-700">No follow-ups found in this queue</p>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isDigest   = item.action_type === 'CONSOLIDATED_DIGEST' || item.action_type === 'COMBINED_SENT';
                  const chMeta     = CHANNEL_META[item.action_type] || CHANNEL_META.EMAIL_DIRECT;
                  const svc        = item.cycle?.service_instance;
                  const clientName = svc?.renewal_account?.client_company?.name || item.client_name || 'Valued Client';
                  const assignee   = resolveAssigneeName(item);

                  return (
                    <tr key={item.id}
                      className={clsx('hover:bg-slate-50 transition-colors cursor-pointer', isSelected && 'bg-blue-50/90 border-l-4 border-l-blue-600 font-medium')}
                      onClick={() => setSelectedItem(item)}>
                      
                      {/* Due Date & Digest Audit Timestamps */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-800">{dayjs(item.due_date).format('DD MMM YYYY')}</p>
                        {isDigest && item.updated_at && (
                          <p className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                            <Zap size={10} /> Sent: {dayjs(item.updated_at).format('DD MMM HH:mm')}
                          </p>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5">
                        <p className="font-extrabold text-slate-900 text-xs truncate" title={clientName}>{clientName}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{svc?.customer_contact?.name || '—'}</p>
                      </td>

                      {/* Service Item */}
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-800 text-xs truncate" title={svc?.service_master?.name}>{svc?.service_master?.name || 'Service'}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{svc?.identifier || '—'}</p>
                      </td>

                      {/* Multi-Channel Status */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1">
                          {item.channel_actions && item.channel_actions.length > 0 ? (
                            <div className="space-y-1">
                              {/* Progress Bar */}
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ 
                                      width: `${(item.channel_actions.filter((a: any) => a.status === 'COMPLETED' || a.status === 'SENT').length / item.channel_actions.length) * 100}%` 
                                    }}
                                  />
                                </div>
                                <span className="text-[8px] font-bold text-slate-600">
                                  {item.channel_actions.filter((a: any) => a.status === 'COMPLETED' || a.status === 'SENT').length}/{item.channel_actions.length}
                                </span>
                              </div>
                              
                              {/* Channel Action Badges */}
                              <div className="flex flex-wrap gap-1">
                                {item.channel_actions.map((action: any) => {
                                  const actionMeta = CHANNEL_META[action.channel] || CHANNEL_META.EMAIL_DIRECT;
                                  const isComplete = action.status === 'COMPLETED' || action.status === 'SENT';
                                  const isPending = action.status === 'PENDING' || action.status === 'DUE';
                                  const isFailed = action.status === 'FAILED';
                                  
                                  return (
                                    <div 
                                      key={action.id} 
                                      className={clsx(
                                        'flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border cursor-help',
                                        isComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        isFailed ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                      )}
                                      title={actionMeta.label || action.channel}
                                    >
                                      {actionMeta.icon}
                                      <span>{action.channel}</span>
                                      {isComplete && <span>✓</span>}
                                      {isPending && <span>●</span>}
                                      {isFailed && <span>!</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={clsx('inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border', (CHANNEL_META[item.canonical_next_action?.channel] || chMeta).cls)}>
                                {(CHANNEL_META[item.canonical_next_action?.channel] || chMeta).icon} {item.canonical_next_action?.channel_label || chMeta.label}
                              </span>
                              <span className="text-[9px] font-semibold text-slate-500">
                                {item.status === 'PENDING' ? 'Pending' : 
                                 item.status === 'SENT' ? 'Sent' : 
                                 item.status === 'COMPLETED' ? 'Done' : 
                                 item.status === 'SKIPPED' ? 'Skipped' : item.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Executive */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold truncate" title={assignee}>
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {avatarInitials(assignee)}
                          </div>
                          <span className="truncate">{assignee}</span>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const resolvedAction = resolveNextAction(item);
                          
                          if (activeTab === 'completed' || activeTab === 'skipped') {
                            return (
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="btn btn-ghost text-xs py-1 px-3 font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap inline-block"
                              >
                                View Audit
                              </button>
                            );
                          }
                          
                          if (activeTab === 'overdue') {
                            return (
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="btn btn-primary text-xs py-1 px-3 font-bold rounded-lg shadow-xs bg-rose-600 hover:bg-rose-700 text-white whitespace-nowrap inline-block"
                              >
                                Act Now
                              </button>
                            );
                          }
                          
                          if (activeTab === 'upcoming') {
                            return (
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="btn btn-ghost text-xs py-1 px-3 font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap inline-block"
                              >
                                View Task
                              </button>
                            );
                          }
                          
                          // Today tab - use channel-aware label
                          return (
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="btn btn-primary text-xs py-1 px-3 font-bold rounded-lg shadow-xs bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap inline-block"
                            >
                              {resolvedAction.label}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NON-MODAL FIXED INSPECTION DRAWER: NO FULL-SCREEN DARK BACKDROP */}
      {selectedItem && (
        <div className="fixed right-0 top-16 bottom-0 z-40 w-[520px] max-w-[90vw] sm:max-w-[80vw] lg:max-w-[520px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  {(() => {
                    const resolved = resolveNextAction(selectedItem);
                    if (resolved.channel === 'EMAIL' || resolved.channel === 'EMAIL_DIRECT' || resolved.channel === 'EMAIL_DRAFT') {
                      return <><Mail size={16} className="text-blue-600" /> Review Renewal Email</>;
                    }
                    if (resolved.channel === 'CALL_TASK') {
                      return <><Phone size={16} className="text-emerald-600" /> Log Phone Call Outcome</>;
                    }
                    if (resolved.channel === 'WHATSAPP') {
                      return <><MessageSquare size={16} className="text-green-600" /> Review WhatsApp Reminder</>;
                    }
                    if (resolved.channel === 'MULTI') {
                      return <><Grid size={16} className="text-violet-600" /> Follow-up Actions ({resolved.pendingActions?.length || 0} Pending)</>;
                    }
                    return <><FileText size={16} className="text-slate-600" /> Follow-up Audit</>;
                  })()}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedItem.cycle?.service_instance?.renewal_account?.client_company?.name || selectedItem.client_name || 'Valued Client'}
                  {selectedItem.cycle?.service_instance?.service_master?.name ? ` • ${selectedItem.cycle.service_instance.service_master.name}` : ''}
                </p>
              </div>
              <button
                onClick={closeSelectedItem}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Record Context Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Client Account</p>
                    <p className="text-sm font-extrabold text-slate-900">
                      {selectedItem.cycle?.service_instance?.renewal_account?.client_company?.name || selectedItem.client_name}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                    Cycle #{selectedItem.cycle?.cycle_number || 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Service Name:</span>
                    <p className="font-bold text-slate-900">{selectedItem.cycle?.service_instance?.service_master?.name || 'Service'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Identifier / Server:</span>
                    <p className="font-mono font-bold text-slate-800">{selectedItem.cycle?.service_instance?.identifier || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Scheduled Date:</span>
                    <p className="font-bold text-slate-900">{dayjs(selectedItem.due_date).format('DD MMM YYYY')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Renewal Expiry:</span>
                    <p className="font-bold text-slate-900">
                      {selectedItem.cycle?.service_instance?.expiry_date ? dayjs(selectedItem.cycle.service_instance.expiry_date).format('DD MMM YYYY') : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* DIGEST AUDIT CARD */}
              {(selectedItem.action_type === 'CONSOLIDATED_DIGEST' || selectedItem.action_type === 'COMBINED_SENT') && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                  <p className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-sm">
                    <BellRing size={16} className="text-emerald-600" /> Monthly Digest Emailed
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-b border-emerald-200/60 py-2">
                    <div>
                      <span className="text-emerald-700">Follow-up Due:</span>
                      <p className="font-bold text-slate-900">{dayjs(selectedItem.due_date).format('DD MMM YYYY')}</p>
                    </div>
                    <div>
                      <span className="text-emerald-700">Digest Sent At:</span>
                      <p className="font-bold text-slate-900">{dayjs(selectedItem.updated_at || new Date()).format('DD MMM HH:mm')}</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">
                    Order Form PDF digest was attached and sent to client primary contacts automatically.
                  </p>
                </div>
              )}

              {/* Multi-Channel Summary List */}
              {(() => {
                const resolved = resolveNextAction(selectedItem);
                if (resolved.channel === 'MULTI' && resolved.pendingActions) {
                  return (
                    <div className="space-y-3">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Pending Channel Actions ({resolved.pendingActions.length})</p>
                      <div className="space-y-2">
                        {resolved.pendingActions.map((action: any) => {
                          const actionMeta = CHANNEL_META[action.channel] || CHANNEL_META.EMAIL_DIRECT;
                          const isComplete = action.status === 'COMPLETED' || action.status === 'SENT';
                          const isPending = action.status === 'PENDING' || action.status === 'DUE';
                          
                          return (
                            <div key={action.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                              <div className="flex items-center gap-2">
                                <span className={clsx(
                                  'inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-full border',
                                  isComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                )}>
                                  {actionMeta.icon} {action.channel}
                                </span>
                                <span className="text-xs font-medium text-slate-600">{action.status}</span>
                              </div>
                              {isPending && (
                                <button
                                  onClick={() => selectChannelAction(action)}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  {getButtonLabel(action.channel, action.status)} →
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Interactive Channel Action Panel */}
              {(() => {
                const resolved = resolveNextAction(selectedItem);
                const rawCh = (selectedChannelAction?.channel || resolved.channel || selectedItem.canonical_next_action?.channel || selectedItem.channel || '').toUpperCase();
                
                switch (rawCh) {
                  case 'CALL':
                  case 'PHONE':
                  case 'CALL_TASK':
                    return (
                      <div className="space-y-4 text-xs card p-4 border border-slate-200 shadow-xs bg-white rounded-2xl">
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <Phone size={16} className="text-emerald-600" /> Log Phone Call Outcome
                        </h4>
                        <div>
                          <label id="outcome-code-select" className="block text-xs font-bold text-slate-700 mb-1">Call / Outreach Outcome *</label>
                          <select
                            value={outcomeCode}
                            onChange={e => setOutcomeCode(e.target.value)}
                            className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2.5 bg-slate-50"
                          >
                            {OUTCOME_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Customer Feedback / Remarks</label>
                          <textarea
                            rows={3}
                            value={customerResponse}
                            onChange={e => setCustomerResponse(e.target.value)}
                            placeholder="Record detailed customer response..."
                            className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes / Action Taken</label>
                          <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Spoke with client, shared quotation, left voicemail"
                            className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-slate-50 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Next Call Back Date</label>
                          <input
                            type="date"
                            value={nextFollowUpDate}
                            onChange={e => setNextFollowUpDate(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-bold bg-slate-50"
                          />
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => completeMutation.mutate({
                              id: selectedItem.id,
                              data: {
                                outcome_code: outcomeCode,
                                customer_response: customerResponse,
                                notes: notes || customerResponse,
                                next_follow_up_date: nextFollowUpDate,
                                contacted: true,
                              }
                            })}
                            disabled={completeMutation.isPending}
                            className="w-full btn btn-primary text-xs py-2.5 px-4 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                          >
                            {completeMutation.isPending ? 'Logging Call Outcome...' : 'Save Call Result'}
                          </button>
                        </div>
                      </div>
                    );

                  case 'WHATSAPP':
                  case 'WA': {
                    const contact = selectedItem.cycle?.service_instance?.customer_contact;
                    const isApprovalRequired = selectedChannelAction?.execution_mode === 'APPROVAL';
                    
                    return (
                      <div className="space-y-4 text-xs card p-4 border border-slate-200 shadow-xs bg-white rounded-2xl">
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <MessageSquare size={16} className="text-green-600" /> Review WhatsApp Message
                        </h4>
                        {isPreviewLoading ? (
                          <div className="p-6 text-center text-slate-500 font-medium">Loading WhatsApp preview...</div>
                        ) : whatsappPreview ? (
                          <>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-green-700 font-medium">Recipient:</span>
                                  <p className="font-bold text-slate-900 truncate">{whatsappPreview.recipient || contact?.mobile || 'No number'}</p>
                                </div>
                                <div>
                                  <span className="text-green-700 font-medium">Status:</span>
                                  <p className="font-bold text-slate-900">{selectedChannelAction?.status || selectedItem.status}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-emerald-950 text-white rounded-xl space-y-2">
                              <p className="font-bold text-emerald-300 text-xs">WhatsApp Preview:</p>
                              <div className="h-36 overflow-y-auto bg-emerald-900/60 rounded-xl p-3 text-xs text-emerald-100 whitespace-pre-wrap font-mono">
                                {whatsappPreview.message_text}
                              </div>
                            </div>
                            
                            <div className="space-y-2 pt-2">
                              {isApprovalRequired ? (
                                <button
                                  onClick={() => approveWhatsAppMutation.mutate(selectedChannelAction.id)}
                                  disabled={approveWhatsAppMutation.isPending}
                                  className="w-full btn btn-primary text-xs py-2.5 px-4 font-bold rounded-xl bg-green-600 hover:bg-green-700"
                                >
                                  {approveWhatsAppMutation.isPending ? 'Approving...' : 'Approve & Queue WhatsApp'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => queueWhatsAppMutation.mutate(selectedChannelAction.id)}
                                  disabled={queueWhatsAppMutation.isPending}
                                  className="w-full btn btn-primary text-xs py-2.5 px-4 font-bold rounded-xl bg-green-600 hover:bg-green-700"
                                >
                                  {queueWhatsAppMutation.isPending ? 'Queuing...' : 'Queue WhatsApp'}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const phone = contact?.mobile;
                                  if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
                                  else toast.error('No WhatsApp number available');
                                }}
                                className="w-full btn btn-ghost text-xs py-2 px-3 font-bold rounded-xl border border-slate-300"
                              >
                                <MessageSquare size={13} className="inline mr-1" /> Open WhatsApp (Fallback)
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 font-medium">
                            WhatsApp message preview unavailable
                          </div>
                        )}
                      </div>
                    );
                  }

                  case 'EMAIL':
                  case 'EMAIL_DIRECT':
                  case 'EMAIL_DRAFT': {
                    const contact = selectedItem.cycle?.service_instance?.customer_contact;
                    const isApprovalRequired = selectedChannelAction?.execution_mode === 'APPROVAL';
                    
                    return (
                      <div className="space-y-4 text-xs card p-4 border border-slate-200 shadow-xs bg-white rounded-2xl">
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <Mail size={16} className="text-blue-600" /> Review Email Draft / Template
                        </h4>
                        {isPreviewLoading ? (
                          <div className="p-6 text-center text-slate-500 font-medium">Loading rendered email body...</div>
                        ) : emailPreview ? (
                          <>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-blue-700 font-medium">Recipient:</span>
                                  <p className="font-bold text-slate-900 truncate">{emailPreview.recipient || contact?.email || 'No email'}</p>
                                </div>
                                <div>
                                  <span className="text-blue-700 font-medium">Status:</span>
                                  <p className="font-bold text-slate-900">{selectedChannelAction?.status || selectedItem.status}</p>
                                </div>
                                <div>
                                  <span className="text-blue-700 font-medium">Template:</span>
                                  <p className="font-bold text-slate-900 truncate">{emailPreview.template_name}</p>
                                </div>
                                <div>
                                  <span className="text-blue-700 font-medium">Version:</span>
                                  <p className="font-bold text-slate-900">v{emailPreview.template_version}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <p className="font-bold text-slate-900 text-xs">Subject: {emailPreview.subject}</p>
                              <div className="h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                                <div dangerouslySetInnerHTML={{ __html: emailPreview.rendered_body }} />
                              </div>
                            </div>
                            
                            <div className="space-y-2 pt-2">
                              {isApprovalRequired ? (
                                <button
                                  onClick={() => approveEmailMutation.mutate(selectedChannelAction.id)}
                                  disabled={approveEmailMutation.isPending}
                                  className="w-full btn btn-primary text-xs py-2.5 px-4 font-bold rounded-xl bg-blue-600 hover:bg-blue-700"
                                >
                                  {approveEmailMutation.isPending ? 'Approving...' : 'Approve & Queue Email'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => queueEmailMutation.mutate(selectedChannelAction.id)}
                                  disabled={queueEmailMutation.isPending}
                                  className="w-full btn btn-primary text-xs py-2.5 px-4 font-bold rounded-xl bg-blue-600 hover:bg-blue-700"
                                >
                                  {queueEmailMutation.isPending ? 'Queuing...' : 'Queue Email'}
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  const email = contact?.email;
                                  if (email) window.open(`mailto:${email}`, '_blank');
                                  else toast.error('No email available');
                                }}
                                className="w-full btn btn-ghost text-xs py-2 px-3 font-bold rounded-xl border border-slate-300"
                              >
                                <Mail size={13} className="inline mr-1" /> Open Email Client (Fallback)
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 font-medium">
                            Email preview unavailable for this action
                          </div>
                        )}
                      </div>
                    );
                  }

                  default:
                    return (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-3">
                        <div className="space-y-1">
                          <p className="font-extrabold text-amber-900 flex items-center gap-1.5 text-sm">
                            <AlertCircle size={15} className="text-amber-600" /> Workflow Data Unavailable
                          </p>
                          <p className="text-amber-800 font-medium">
                            No active channel action or template mapping is configured for this follow-up record.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => navigate('/settings/service-catalog')}
                            className="btn btn-ghost text-xs py-1.5 px-3 font-bold text-amber-900 border border-amber-300 bg-amber-100/60 rounded-xl flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> Open Service Mapping
                          </button>
                        </div>
                      </div>
                    );
                }
              })()}

              {/* Status-Gated Customer Response Outcome Card */}
              {(() => {
                if (selectedItem?.workflow_state === 'DATA_INCOMPLETE') return null;
                const status = selectedChannelAction?.status || selectedItem?.status;
                const channel = (selectedChannelAction?.channel || selectedItem?.canonical_next_action?.channel || '').toUpperCase();
                const isSentOrCompleted = status === 'SENT' || status === 'COMPLETED';
                const isCall = channel === 'CALL' || channel === 'PHONE';

                if (!isSentOrCompleted && !isCall) return null;

                return (
                  <div className="card p-4 border border-blue-200 shadow-xs bg-blue-50/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                      <h4 className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                        <UserCheck size={15} className="text-blue-600" /> Customer Business Outcome
                      </h4>
                      <button
                        onClick={() => setIsRecordResponseOpen(!isRecordResponseOpen)}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                      >
                        {isRecordResponseOpen ? 'Close Form' : 'Record Outcome'}
                      </button>
                    </div>

                    {isRecordResponseOpen && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Outcome Code *</label>
                          <select
                            value={outcomeCode}
                            onChange={e => setOutcomeCode(e.target.value)}
                            className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2 bg-white"
                          >
                            <option value="NO_RESPONSE">NO_RESPONSE (No Response)</option>
                            <option value="CALLBACK_REQUESTED">CALLBACK_REQUESTED (Callback Requested)</option>
                            <option value="UNDER_REVIEW">UNDER_REVIEW (Under Review)</option>
                            <option value="RENEWAL_CONFIRMED">RENEWAL_CONFIRMED (Renewal Confirmed)</option>
                            <option value="PAYMENT_PROMISED">PAYMENT_PROMISED (Payment Promised)</option>
                            <option value="DECLINED">DECLINED (Declined Renewal)</option>
                            <option value="RENEWED_PAID">RENEWED_PAID (Renewed & Paid)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Response Remarks</label>
                          <textarea
                            rows={2}
                            value={customerResponse}
                            onChange={e => setCustomerResponse(e.target.value)}
                            placeholder="Verbal or written customer feedback..."
                            className="w-full text-xs rounded-xl border border-slate-300 p-2 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Next Follow-up Callback Date</label>
                          <input
                            type="date"
                            value={nextFollowUpDate}
                            onChange={e => setNextFollowUpDate(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-300 p-2 font-bold bg-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            completeMutation.mutate({
                              id: selectedItem.id,
                              data: {
                                outcome_code: outcomeCode,
                                customer_response: customerResponse,
                                notes: notes || customerResponse,
                                next_follow_up_date: nextFollowUpDate,
                                contacted: true,
                              }
                            });
                            setIsRecordResponseOpen(false);
                          }}
                          disabled={completeMutation.isPending}
                          className="w-full btn btn-primary text-xs py-2 px-3 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                        >
                          {completeMutation.isPending ? 'Saving...' : 'Save Customer Response'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* AUDIT PANEL */}
              {(() => {
                return (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                        <FileText size={15} className="text-slate-600" /> Historical Follow-up Audit Logs
                      </h4>
                      {auditData?.follow_up_logs?.length > 0 && (
                        <span className="text-[10px] font-extrabold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {auditData.follow_up_logs.length} Logged Event{auditData.follow_up_logs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {isLoadingAudit ? (
                      <div className="p-4 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200">
                        Loading follow-up task audit history...
                      </div>
                    ) : isAuditError ? (
                      <div className="p-4 text-center text-rose-700 text-xs font-bold bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                        <span>⚠️ Failed to load audit history</span>
                        <button onClick={() => refetchAudit()} className="btn btn-ghost text-[10px] py-1 px-2.5 bg-white border border-rose-300 rounded-lg">Retry</button>
                      </div>
                    ) : auditData?.follow_up_logs && auditData.follow_up_logs.length > 0 ? (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {auditData.follow_up_logs.map((log: any) => (
                          <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] bg-slate-200/80 px-2 py-0.5 rounded">
                                {log.outcome_code || 'LOGGED'}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                {dayjs(log.logged_at).format('DD MMM YYYY, HH:mm')}
                              </span>
                            </div>
                            {(log.customer_response || log.notes) && (
                              <p className="text-slate-800 text-xs font-medium italic bg-white p-2.5 rounded-lg border border-slate-200">
                                &ldquo;{log.customer_response || log.notes}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                              <span>By: <strong className="text-slate-800">{log.logged_by?.first_name ? `${log.logged_by.first_name} ${log.logged_by.last_name || ''}`.trim() : 'Executive'}</strong></span>
                              {log.next_follow_up_date && (
                                <span className="text-blue-700 font-bold">Next Call: {dayjs(log.next_follow_up_date).format('DD MMM YYYY')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                        <p className="font-bold text-slate-700">No call outcome recorded for this cycle yet.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Use the Log Call Outcome form above to record customer feedback.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sticky Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  const accId = selectedItem.cycle?.service_instance?.renewal_account?.id || selectedItem.renewal_account_id;
                  if (accId) navigate(`/renewals/${accId}`);
                  else toast.error('Renewal account ID not found');
                }}
                className="btn btn-ghost text-xs py-2 px-3 border border-slate-300 font-bold flex items-center gap-1.5 text-slate-700 hover:bg-white rounded-xl"
              >
                <ExternalLink size={13} /> Open Renewal Account
              </button>

              <button
                onClick={closeSelectedItem}
                className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold text-slate-700 rounded-xl hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
