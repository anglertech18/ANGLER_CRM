import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, XCircle, Mail, ChevronLeft, ChevronRight,
  Filter, Search, Send, FileText, Check, X, AlertCircle,
  RefreshCw, MessageSquare,
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTableHeaderFilter from '../../components/DataTableHeaderFilter';

const PAGE_SIZE = 20;

function populateTemplateValues(content: string, draft: any): string {
  if (!content) return '';
  let ctx: any = {};
  if (draft?.mapping_context) {
    try {
      ctx = typeof draft.mapping_context === 'string' ? JSON.parse(draft.mapping_context) : draft.mapping_context;
    } catch {}
  }

  const clientName = draft?.client_name || draft?.service_instance?.renewal_account?.client_company?.name || ctx?.client_name || 'Valued Customer';
  const serviceName = draft?.service_name || draft?.service_instance?.service_master?.name || ctx?.service_name || 'Server Service';
  const identifier = ctx?.identifier || draft?.service_instance?.identifier || draft?.subject?.match(/([a-zA-Z0-9.-]+\.(in|com|net|org))/i)?.[0] || 'vps-seedhost-1-1.in';
  const expiryDate = ctx?.expiry_date ? dayjs(ctx.expiry_date).format('DD MMM YYYY') : dayjs().add(15, 'days').format('DD MMM YYYY');
  const amountDue = ctx?.amount_due ? `Rs. ${Number(ctx.amount_due).toLocaleString('en-IN')}` : 'Rs. 15,000';
  const customerName = draft?.recipient_name || draft?.contact_name || ctx?.customer_name || clientName;
  const senderName = ctx?.sender_name || draft?.sender_name || 'ANGLER Technologies';
  const senderEmail = ctx?.sender_email || draft?.sender_email || 'renewals@angleritech.com';
  const accountManager = ctx?.account_manager_name || draft?.assigned_user?.name || 'ANGLER Account Manager';

  let result = content
    .replace(/\{\{\s*customer_name\s*\}\}/gi, customerName)
    .replace(/\{\{\s*client_name\s*\}\}/gi, clientName)
    .replace(/\{\{\s*company_name\s*\}\}/gi, clientName)
    .replace(/\{\{\s*domain_url\s*\}\}/gi, identifier)
    .replace(/\{\{\s*identifier\s*\}\}/gi, identifier)
    .replace(/\{\{\s*service_name\s*\}\}/gi, serviceName)
    .replace(/\{\{\s*expiry_date\s*\}\}/gi, expiryDate)
    .replace(/\{\{\s*amount_due\s*\}\}/gi, amountDue)
    .replace(/\{\{\s*subtotal\s*\}\}/gi, amountDue)
    .replace(/\{\{\s*grand_total\s*\}\}/gi, amountDue)
    .replace(/\{\{\s*days_left\s*\}\}/gi, '15')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, senderName)
    .replace(/\{\{\s*sender_email\s*\}\}/gi, senderEmail)
    .replace(/\{\{\s*account_manager_name\s*\}\}/gi, accountManager)
    .replace(/\{\{\s*manager_name\s*\}\}/gi, accountManager)
    .replace(/\{\{\s*phone_number\s*\}\}/gi, '+91 (0422) 231-2345')
    .replace(/\{\{\s*contact_email\s*\}\}/gi, 'support@angleritech.com')
    .replace(/\{\{\s*provider_name\s*\}\}/gi, 'Authorized Provider');

  // Fallback cleanup for any remaining unrecognized double-curly bracket tokens
  result = result.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gi, (_match: string, tokenKey: string) => {
    if (ctx && ctx[tokenKey]) return String(ctx[tokenKey]);
    return tokenKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  });

  return result;
}

function validateTemplateTokens(content: string, draft: any): { isValid: boolean; unresolvedTokens: string[] } {
  if (!content) return { isValid: true, unresolvedTokens: [] };
  
  const rendered = populateTemplateValues(content, draft);
  const tokenPattern = /\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/g;
  const matches = rendered.match(tokenPattern);
  
  return {
    isValid: !matches || matches.length === 0,
    unresolvedTokens: matches || []
  };
}

export default function DraftQueue() {
  const qc = useQueryClient();
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<number[]>([]);

  // DataTables Sorting & Column Filters State
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Fetch Drafts List (paginated)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['renewal-drafts', search, page],
    queryFn: () =>
      api.get('/renewal-pricing/drafts', {
        params: { search: search || undefined, page, limit: PAGE_SIZE },
      }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const rawDrafts: any[] = data?.data ?? (Array.isArray(data) ? data : []);
  const totalDrafts      = data?.total ?? rawDrafts.length;
  const totalPages       = Math.max(1, Math.ceil(totalDrafts / PAGE_SIZE));
  const counts           = data?.counts ?? {};

  // ── Unique Options Extractor ──────────────────────────────────────────────
  const uniqueOptions = useMemo(() => {
    const clients = new Set<string>();
    const services = new Set<string>();
    const templates = new Set<string>();
    const statuses = new Set<string>();

    rawDrafts.forEach(d => {
      const cName = d.client_name ?? d.service_instance?.renewal_account?.client_company?.name;
      const sName = d.service_name ?? d.service_instance?.service_master?.name;
      const tName = d.template_name ?? d.template?.name;
      const st    = d.approval_status === 'APPROVED' ? 'Approved' : d.approval_status === 'SKIPPED' ? 'Skipped' : 'Pending';

      if (cName) clients.add(cName);
      if (sName) services.add(sName);
      if (tName) templates.add(tName);
      if (st) statuses.add(st);
    });

    return {
      client: Array.from(clients).sort(),
      service: Array.from(services).sort(),
      template: Array.from(templates).sort(),
      status: Array.from(statuses).sort(),
    };
  }, [rawDrafts]);

  // ── Filtered & Sorted Drafts Pipeline ─────────────────────────────────────
  const drafts = useMemo(() => {
    let result = [...rawDrafts];

    // Apply Column Filters
    for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
      if (allowedSet && allowedSet.size > 0) {
        result = result.filter(item => {
          let val = '';
          if (colKey === 'client') val = item.client_name ?? item.service_instance?.renewal_account?.client_company?.name ?? '';
          else if (colKey === 'service') val = item.service_name ?? item.service_instance?.service_master?.name ?? '';
          else if (colKey === 'template') val = item.template_name ?? item.template?.name ?? '';
          else if (colKey === 'status') val = item.approval_status === 'APPROVED' ? 'Approved' : item.approval_status === 'SKIPPED' ? 'Skipped' : 'Pending';
          return allowedSet.has(val);
        });
      }
    }

    // Apply Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortField === 'id') { valA = String(a.id); valB = String(b.id); }
        else if (sortField === 'client') { valA = a.client_name || ''; valB = b.client_name || ''; }
        else if (sortField === 'created_at') { valA = String(a.created_at || ''); valB = String(b.created_at || ''); }

        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rawDrafts, columnFilters, sortField, sortOrder]);

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  };

  const selectedDraft  = drafts.find((d: any) => d.id === selectedId) ?? (selectedId === null && drafts.length ? drafts[0] : null);

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/renewal-pricing/drafts/${id}/approve`, { notes: approvalNote }),
    onSuccess: () => {
      toast.success('Draft approved & queued for sending');
      qc.invalidateQueries({ queryKey: ['renewal-drafts'] });
      setApprovalNote('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Approval failed'),
  });

  // Bulk Approve Mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) => api.post('/renewal-pricing/drafts/approve-bulk', { ids }),
    onSuccess: (_, variables) => {
      toast.success(`Successfully approved ${variables.length} draft(s)!`);
      qc.invalidateQueries({ queryKey: ['renewal-drafts'] });
      setSelectedBulkIds([]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Bulk approval failed'),
  });

  // Skip Mutation
  const skipMutation = useMutation({
    mutationFn: (id: number) => api.post(`/renewal-pricing/drafts/${id}/skip`, { notes: approvalNote }),
    onSuccess: () => {
      toast.success('Draft skipped');
      qc.invalidateQueries({ queryKey: ['renewal-drafts'] });
      setApprovalNote('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Skip failed'),
  });

  const toggleSelectAll = () => {
    if (selectedBulkIds.length === drafts.length) {
      setSelectedBulkIds([]);
    } else {
      setSelectedBulkIds(drafts.map((d: any) => d.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedBulkIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeDraft = selectedDraft;
  const svc         = activeDraft?.service_instance;
  const contact     = svc?.customer_contact;

  return (
    <div className="page-wrapper space-y-4">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
            <span>Renewals</span>
            <span className="text-slate-300 mx-1">›</span>
            <span className="text-slate-700 font-semibold">Draft Approvals</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 leading-none">Draft Approvals</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">Review pending customer communications, approve, skip or bulk-process drafts.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input type="month" defaultValue={dayjs().format('YYYY-MM')} className="form-input text-xs py-1.5 w-36 rounded-xl" />
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl px-3 py-2 hover:bg-slate-50 transition-all">
            <RefreshCw size={12} /> Refresh
          </button>
          {Object.keys(columnFilters).length > 0 && (
            <button onClick={() => setColumnFilters({})} className="flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-200 bg-red-50 rounded-xl px-3 py-2">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Approval', sub: 'Drafts requiring approval', count: counts?.pending ?? totalDrafts, icon: <FileText size={18} />, bg: 'bg-blue-600' },
          { label: 'Approved Today',   sub: 'Drafts approved',           count: counts?.approved ?? 0,           icon: <CheckCircle size={18} />, bg: 'bg-emerald-600' },
          { label: 'Queued to Send',   sub: 'Drafts in outbox queue',    count: counts?.queued ?? 0,             icon: <Send size={18} />, bg: 'bg-amber-500' },
          { label: 'Skipped',          sub: 'Drafts skipped',            count: counts?.skipped ?? 0,            icon: <XCircle size={18} />, bg: 'bg-red-500' },
        ].map((s, i) => (
          <div key={i} className="card p-3.5 flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0', s.bg)}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{s.count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: Drafts List Table with Header Filters */}
        <div className="lg:col-span-7">
          <div className="card overflow-hidden border border-slate-200 shadow-sm rounded-2xl">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drafts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                {selectedBulkIds.length > 0 && (
                  <button
                    onClick={() => bulkApproveMutation.mutate(selectedBulkIds)}
                    disabled={bulkApproveMutation.isPending}
                    className="btn btn-primary text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle size={13} /> Batch Approve ({selectedBulkIds.length})
                  </button>
                )}
                <span className="text-[11px] font-bold text-slate-500">{drafts.length} drafts</span>
              </div>
            </div>

            {/* Table — fixed height with scroll */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="w-8 px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        className="rounded cursor-pointer"
                        checked={drafts.length > 0 && selectedBulkIds.length === drafts.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <DataTableHeaderFilter
                      title="Draft ID"
                      field="id"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      allValues={[]}
                      selectedValues={new Set()}
                      onFilterChange={() => {}}
                    />
                    <DataTableHeaderFilter
                      title="Client Company"
                      field="client"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      allValues={uniqueOptions.client}
                      selectedValues={columnFilters['client'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, client: set }))}
                    />
                    <DataTableHeaderFilter
                      title="Service"
                      field="service"
                      allValues={uniqueOptions.service}
                      selectedValues={columnFilters['service'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, service: set }))}
                    />
                    <DataTableHeaderFilter
                      title="Template"
                      field="template"
                      allValues={uniqueOptions.template}
                      selectedValues={columnFilters['template'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, template: set }))}
                    />
                    <DataTableHeaderFilter
                      title="Created"
                      field="created_at"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      allValues={[]}
                      selectedValues={new Set()}
                      onFilterChange={() => {}}
                    />
                    <DataTableHeaderFilter
                      title="Status"
                      field="status"
                      allValues={uniqueOptions.status}
                      selectedValues={columnFilters['status'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, status: set }))}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-3 py-2"><div className="skeleton h-3 rounded" /></td>
                      ))}</tr>
                    ))
                  ) : drafts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-xs">No matching drafts found</td>
                    </tr>
                  ) : (
                    drafts.map((d: any) => {
                      const isSelected = (selectedDraft?.id ?? drafts[0]?.id) === d.id;
                      const isChecked = selectedBulkIds.includes(d.id);
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setSelectedId(d.id)}
                          className={clsx(
                            'hover:bg-blue-50/40 transition-colors cursor-pointer',
                            isSelected && 'bg-blue-50 border-l-[3px] border-l-blue-500'
                          )}
                        >
                          <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded cursor-pointer"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(d.id)}
                            />
                          </td>
                          <td className="px-3 py-1.5 font-mono text-[11px] text-blue-600 font-bold whitespace-nowrap">
                            DRFT-{d.id + 7410}
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-slate-800 truncate max-w-[120px]">
                            {d.client_name ?? d.service_instance?.renewal_account?.client_company?.name ?? 'Valued Client'}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600 truncate max-w-[100px]">
                            {d.service_name ?? d.service_instance?.service_master?.name ?? 'Server'}
                          </td>
                          <td className="px-3 py-1.5 text-slate-500 truncate max-w-[120px]">
                            {d.template_name ?? d.template?.name ?? 'Renewal Reminder'}
                          </td>
                          <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">
                            {dayjs(d.created_at ?? new Date()).format('DD MMM')}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={clsx(
                              'text-[9px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap',
                              d.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              d.approval_status === 'SKIPPED'  ? 'bg-slate-50 text-slate-500 border-slate-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                              {d.approval_status === 'APPROVED' ? 'Approved' :
                               d.approval_status === 'SKIPPED'  ? 'Skipped'  : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/40">
                <p className="text-[10px] text-slate-400">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalDrafts)} of {totalDrafts}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    <ChevronLeft size={11} /> Prev
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    Next <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview Pane */}
        <div className="lg:col-span-5">
          {activeDraft ? (
            <div className="card p-4 space-y-3 sticky top-4 border border-slate-200 shadow-md rounded-2xl bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" /> Draft Communication Preview
                </h3>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  DRFT-{activeDraft.id + 7410}
                </span>
              </div>

              {/* Metadata Box */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Customer Company:</span>
                  <span className="font-extrabold text-slate-900">{activeDraft.client_name ?? activeDraft.service_instance?.renewal_account?.client_company?.name ?? 'Valued Client'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Service Item:</span>
                  <span className="font-bold text-slate-800">{activeDraft.service_name ?? activeDraft.service_instance?.service_master?.name ?? 'Server Service'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Recipient:</span>
                  <span className="font-mono font-extrabold text-blue-700">{contact?.email || activeDraft.recipient || activeDraft.recipient_email || '—'}</span>
                </div>
                {activeDraft.channel && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Channel:</span>
                    <span className={clsx(
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                      activeDraft.channel === 'WHATSAPP' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}>
                      {activeDraft.channel}
                    </span>
                  </div>
                )}
              </div>

              {/* EMAIL RENDERED BODY PREVIEW */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 px-1">
                  <span>Actual Email / Message Body</span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-Rendered</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {/* Email Subject Line */}
                  <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 text-xs">
                    <span className="text-slate-500 font-semibold mr-1.5">Subject:</span>
                    <strong className="text-slate-800 font-bold">{populateTemplateValues(activeDraft.subject || `Renewal Reminder – ${activeDraft.client_name || 'Client'}`, activeDraft)}</strong>
                  </div>

                  {/* Attachment Pill if available */}
                  {(activeDraft.attachment_path || activeDraft.template_name?.includes('Order Form')) && (
                    <div className="bg-blue-50/60 border-b border-blue-100 px-3 py-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-blue-700 font-bold flex items-center gap-1.5">
                        <FileText size={12} className="text-blue-600" /> Attached: Order_Form_Renewal_Preview.pdf
                      </span>
                      <span className="text-[10px] text-blue-600 font-medium bg-blue-100/80 px-2 py-0.5 rounded-full">PDF Ready</span>
                    </div>
                  )}

                  {/* Rendered HTML / Text Body Container */}
                  <div className="p-3 text-xs text-slate-700 max-h-56 overflow-y-auto bg-white space-y-2 leading-relaxed">
                    {activeDraft.rendered_body || activeDraft.body ? (
                      <div
                        className="prose prose-xs max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: populateTemplateValues(activeDraft.rendered_body || activeDraft.body, activeDraft) }}
                      />
                    ) : (
                      <div className="space-y-2 text-slate-600">
                        <p>Dear <strong>{activeDraft.client_name || 'Customer'}</strong>,</p>
                        <p>This is a formal renewal reminder regarding your upcoming service subscription for <strong>{activeDraft.service_name || 'Cloud Hosting Server'}</strong>.</p>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                          <div>Service: {activeDraft.service_name || 'Hosting Service'}</div>
                          <div>Expiry Date: {dayjs().add(15, 'days').format('DD MMM YYYY')}</div>
                          <div>Amount Due: ₹12,500 + GST (18%)</div>
                        </div>
                        <p>Please review the attached Order Form PDF and arrange for payment to avoid service disruption.</p>
                        <p className="pt-1 text-slate-500 font-medium text-[11px]">Best Regards,<br />ANGLER Technologies Renewal Team</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* WHATSAPP CHAT BUBBLE PREVIEW IF WHATSAPP */}
              {(activeDraft.channel === 'WHATSAPP' || activeDraft.channel === 'BOTH') && (
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                    <MessageSquare size={11} className="text-emerald-600" /> WhatsApp Message Preview
                  </span>
                  <div className="bg-emerald-100/60 border border-emerald-200/80 p-2.5 rounded-xl text-xs text-emerald-950 font-sans shadow-sm leading-snug"
                    dangerouslySetInnerHTML={{ __html: populateTemplateValues(activeDraft.rendered_body || activeDraft.body || `📌 <strong>ANGLER Renewal Notice</strong><br />Dear {{customer_name}}, your service <strong>{{service_name}}</strong> is due for renewal on {{expiry_date}}. Amount Due: {{amount_due}}.`, activeDraft) }}
                  />
                </div>
              )}

              {/* Data Readiness Validation Panel */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Data Readiness Validation</p>
                <div className="space-y-1 text-[10px]">
                  {(() => {
                    const subjectValidation = validateTemplateTokens(activeDraft.subject || '', activeDraft);
                    const bodyValidation = validateTemplateTokens(activeDraft.rendered_body || activeDraft.body || '', activeDraft);
                    const allUnresolved = [...subjectValidation.unresolvedTokens, ...bodyValidation.unresolvedTokens];
                    const isValid = subjectValidation.isValid && bodyValidation.isValid;
                    
                    return (
                      <>
                        <div className="flex items-center gap-1">
                          <span className={isValid ? 'text-emerald-600' : 'text-rose-600'}>
                            {isValid ? '✓' : '✕'}
                          </span>
                          <span className={isValid ? 'text-emerald-700' : 'text-rose-700 font-semibold'}>
                            {isValid ? 'All template variables resolved' : 'Unresolved template variables detected'}
                          </span>
                        </div>
                        {!isValid && allUnresolved.length > 0 && (
                          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg">
                            <p className="font-semibold text-rose-800 mb-1">Unresolved tokens:</p>
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(allUnresolved)].map((token, i) => (
                                <span key={i} className="font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[9px]">
                                  {token}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Approval Notes */}
              <div className="space-y-1 text-xs">
                <label className="block text-[11px] font-bold text-slate-700">Approval / Review Notes</label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  placeholder="Add optional reviewer comments or notes..."
                  className="w-full text-xs rounded-xl border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => approveMutation.mutate(activeDraft.id)}
                  disabled={approveMutation.isPending || (() => {
                    const subjectValidation = validateTemplateTokens(activeDraft.subject || '', activeDraft);
                    const bodyValidation = validateTemplateTokens(activeDraft.rendered_body || activeDraft.body || '', activeDraft);
                    return !subjectValidation.isValid || !bodyValidation.isValid;
                  })()}
                  className={clsx(
                    'btn text-xs py-2 px-4 font-bold flex-1 flex items-center justify-center gap-1.5 shadow-md rounded-xl',
                    (() => {
                      const subjectValidation = validateTemplateTokens(activeDraft.subject || '', activeDraft);
                      const bodyValidation = validateTemplateTokens(activeDraft.rendered_body || activeDraft.body || '', activeDraft);
                      const isValid = subjectValidation.isValid && bodyValidation.isValid;
                      return isValid ? 'btn-primary' : 'btn-disabled bg-slate-300 text-slate-500 cursor-not-allowed';
                    })()
                  )}
                >
                  <CheckCircle size={14} /> {approveMutation.isPending ? 'Approving...' : 'Approve & Queue Send'}
                </button>
                <button
                  type="button"
                  onClick={() => skipMutation.mutate(activeDraft.id)}
                  disabled={skipMutation.isPending}
                  className="btn btn-ghost text-xs py-2 px-3 border border-slate-300 font-bold text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-400 text-xs border border-slate-200 rounded-2xl">
              Select a draft from the left queue to view details and approve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
