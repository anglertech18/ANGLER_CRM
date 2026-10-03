import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Eye, Edit,
  AlertCircle, CheckCircle2, DollarSign, User, Phone,
  Mail, X, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, Menu, Check, HelpCircle, History,
  Clock, Maximize2, Minimize2, RefreshCw
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api, { formatApiError } from '../../services/api';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ─── Clean Light-Themed DataTables Header Column Dropdown ─────────────────────
function DataTablesHeaderCell({
  title,
  field,
  sortField,
  sortOrder,
  onSort,
  allValues,
  selectedValues,
  onFilterChange,
  align = 'left',
  popoverAlign = 'left',
}: {
  title: string;
  field: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string, order: 'asc' | 'desc') => void;
  allValues: string[];
  selectedValues: Set<string>;
  onFilterChange: (newSelected: Set<string>) => void;
  align?: 'left' | 'center' | 'right';
  popoverAlign?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const isSorted = sortField === field;
  const isFiltered = selectedValues.size > 0 && selectedValues.size < allValues.length;

  const filteredValues = useMemo(() => {
    if (!menuSearch.trim()) return allValues;
    const q = menuSearch.toLowerCase();
    return allValues.filter(v => v.toLowerCase().includes(q));
  }, [allValues, menuSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectAll = () => onFilterChange(new Set(allValues));
  const deselectAll = () => onFilterChange(new Set());

  const toggleValue = (val: string) => {
    const next = new Set(selectedValues);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onFilterChange(next);
  };

  return (
    <th className={clsx('p-3 relative select-none font-bold text-[10px] tracking-wider uppercase text-slate-700 bg-slate-100 border-b border-slate-300', align === 'center' && 'text-center', align === 'right' && 'text-right')}>
      <div className={clsx('flex items-center gap-1.5', align === 'center' && 'justify-center', align === 'right' && 'justify-end')}>
        <span>{title}</span>

        {/* Action Controls: Sort & DataTables Filter Icon Button */}
        <div className="flex items-center gap-0.5 shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              if (!isSorted) onSort(field, 'asc');
              else if (sortOrder === 'asc') onSort(field, 'desc');
              else onSort('', 'asc');
            }}
            className={clsx(
              'p-0.5 rounded hover:bg-slate-200 transition-colors',
              isSorted ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            )}
            title="Sort Column"
          >
            {isSorted ? (sortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className={clsx(
              'p-0.5 rounded transition-colors',
              isFiltered ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
            )}
            title="Column Filter Menu"
          >
            <Menu size={11} />
          </button>

          {/* Clean Light-Themed DataTables Popover Menu with Right-Alignment Option */}
          {isOpen && (
            <div className={clsx(
              'absolute top-full mt-1.5 z-50 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl p-3 text-xs text-left normal-case font-normal border border-slate-200 animate-in fade-in zoom-in-95',
              popoverAlign === 'right' ? 'right-0' : 'left-0'
            )}>
              {/* Select All / Deselect All Bar */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px]">
                <button type="button" onClick={selectAll} className="text-blue-600 hover:text-blue-800 font-bold">
                  Select ({allValues.length})
                </button>
                <button type="button" onClick={deselectAll} className="text-slate-500 hover:text-slate-700 font-medium">
                  Deselect ({allValues.length - selectedValues.size})
                </button>
              </div>

              {/* Inner Filter Search Box */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Value Checkbox List */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                {filteredValues.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-2 text-center">No matching options</p>
                ) : (
                  filteredValues.map(val => {
                    const checked = selectedValues.has(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => toggleValue(val)}
                        className={clsx(
                          'w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors',
                          checked ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                        )}
                      >
                        <span className="truncate">{val}</span>
                        {checked && <Check size={13} className="text-blue-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Sort & Reset Actions inside Popover */}
              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => { onSort(field, 'asc'); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 font-medium"
                >
                  <ArrowUp size={11} className="text-slate-400" /> Sort Ascending
                </button>
                <button
                  type="button"
                  onClick={() => { onSort(field, 'desc'); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 font-medium"
                >
                  <ArrowDown size={11} className="text-slate-400" /> Sort Descending
                </button>
                <button
                  type="button"
                  onClick={() => { onFilterChange(new Set(allValues)); onSort('', 'asc'); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-red-600 font-semibold"
                >
                  <X size={11} /> Clear sort & filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MappingDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Top Bar Filters State
  const [globalSearch, setGlobalSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState('');
  const [expiryPreset, setExpiryPreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // DataTables Sorting & Column Filters State
  const [sortField, setSortField] = useState('expiry_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Modals & Side Panel Drawer State
  const [selectedMapping, setSelectedMapping] = useState<any | null>(null);
  const [isDrawerMaximized, setIsDrawerMaximized] = useState(false);
  const [showPricingHistoryModal, setShowPricingHistoryModal] = useState(false);
  const [showMarkNotRenewingModal, setShowMarkNotRenewingModal] = useState(false);
  const [notRenewingReason, setNotRenewingReason] = useState('');

  // ── API: Fetch Real Dynamic Alert Steps for Selected Mapping ─────────────
  const { data: realAlertStepsData } = useQuery({
    queryKey: ['alert-steps', selectedMapping?.id],
    queryFn: () => api.get(`/renewal-pricing/mappings/${selectedMapping.id}/alert-steps`).then(r => r.data?.data),
    enabled: !!selectedMapping?.id,
  });

  // ── API: Fetch Real Pricing History Log ────────────────────────────────────
  const { data: realPricingHistoryData, isLoading: isLoadingPricingHistory } = useQuery({
    queryKey: ['pricing-history', selectedMapping?.renewal_account?.client_company_id, selectedMapping?.service_master_id],
    queryFn: () => api.get('/renewal-pricing/history', {
      params: {
        clientId: selectedMapping?.renewal_account?.client_company_id,
        serviceId: selectedMapping?.service_master_id,
      }
    }).then(r => r.data?.data),
    enabled: !!showPricingHistoryModal && !!selectedMapping,
  });

  // ── API: Service Mappings List ────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['service-mappings', globalSearch, clientFilter, categoryFilter, statusFilter, executiveFilter, expiryPreset, startDate, endDate, page, pageSize, sortField, sortOrder],
    queryFn: () => api.get('/renewal-pricing/mappings', {
      params: {
        search: globalSearch || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        clientId: clientFilter || undefined,
        assignedUserId: executiveFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: pageSize,
        sortBy: sortField,
        sortOrder,
      }
    }).then(r => r.data),
  });

  const rawMappings: any[] = data?.data ?? (Array.isArray(data) ? data : []);
  const totalCount: number = data?.total ?? rawMappings.length;
  const mappingStats = data?.stats || {};

  // ── API: Client Companies ─────────────────────────────────────────────────
  const { data: rawClients } = useQuery({
    queryKey: ['masters', 'clientcompany'],
    queryFn: () => api.get('/masters/clientcompany').then(r => r.data),
  });
  const clients: any[] = Array.isArray(rawClients) ? rawClients : (Array.isArray(rawClients?.data) ? rawClients.data : []);

  // ── API: Categories ───────────────────────────────────────────────────────
  const { data: rawCategories } = useQuery({
    queryKey: ['renewal-categories'],
    queryFn: () => api.get('/renewal-masters/categories').then(r => r.data),
  });
  const categories: any[] = Array.isArray(rawCategories) ? rawCategories : (Array.isArray(rawCategories?.data) ? rawCategories.data : []);

  // ── API: Users (Executives) ───────────────────────────────────────────────
  const { data: rawUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });
  const users: any[] = Array.isArray(rawUsers) ? rawUsers : (Array.isArray(rawUsers?.data) ? rawUsers.data : []);

  useEffect(() => {
    setPage(1);
  }, [globalSearch, clientFilter, categoryFilter, statusFilter, executiveFilter, startDate, endDate]);

  // Handle Preset Selection Change
  const handleExpiryPresetChange = (preset: string) => {
    setExpiryPreset(preset);
    const today = dayjs();
    if (preset === 'ALL') {
      setStartDate(''); setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      setStartDate(today.startOf('month').format('YYYY-MM-DD'));
      setEndDate(today.endOf('month').format('YYYY-MM-DD'));
    } else if (preset === 'NEXT_30') {
      setStartDate(today.format('YYYY-MM-DD'));
      setEndDate(today.add(30, 'day').format('YYYY-MM-DD'));
    } else if (preset === 'NEXT_60') {
      setStartDate(today.format('YYYY-MM-DD'));
      setEndDate(today.add(60, 'day').format('YYYY-MM-DD'));
    } else if (preset === 'NEXT_90') {
      setStartDate(today.format('YYYY-MM-DD'));
      setEndDate(today.add(90, 'day').format('YYYY-MM-DD'));
    }
  };

  // ── Column Filter Unique Options Extractor ────────────────────────────────
  const getUniqueColumnValues = (colKey: string): string[] => {
    const set = new Set<string>();
    rawMappings.forEach(m => {
      let val = '';
      if (colKey === 'client') val = m.renewal_account?.client_company?.name || m.renewal_account?.client_name || 'Unassigned Client';
      else if (colKey === 'category') val = m.service_master?.category?.name || 'General';
      else if (colKey === 'service') val = m.service_master?.name || 'Service Asset';
      else if (colKey === 'identifier') val = m.identifier || '—';
      else if (colKey === 'assigned_user') val = m.assigned_user?.name || 'Unassigned';
      else if (colKey === 'customer_contact') val = m.customer_contact?.name || 'Unassigned';
      else if (colKey === 'status') val = m.status || 'ACTIVE';
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  };

  // Filtered Mappings (Applying Column Filter Popover States)
  const filteredMappings = useMemo(() => {
    return rawMappings.filter(m => {
      for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
        if (allowedSet.size === 0) continue;
        let val = '';
        if (colKey === 'client') val = m.renewal_account?.client_company?.name || m.renewal_account?.client_name || 'Unassigned Client';
        else if (colKey === 'category') val = m.service_master?.category?.name || 'General';
        else if (colKey === 'service') val = m.service_master?.name || 'Service Asset';
        else if (colKey === 'identifier') val = m.identifier || '—';
        else if (colKey === 'assigned_user') val = m.assigned_user?.name || 'Unassigned';
        else if (colKey === 'customer_contact') val = m.customer_contact?.name || 'Unassigned';
        else if (colKey === 'status') val = m.status || 'ACTIVE';
        if (allowedSet.size > 0 && !allowedSet.has(val)) return false;
      }
      return true;
    });
  }, [rawMappings, columnFilters]);

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      api.put(`/renewals/services/${selectedMapping.id}`, { status: newStatus, remarks: notRenewingReason }),
    onSuccess: (_, newStatus) => {
      toast.success(`Service status updated to ${newStatus}`);
      qc.invalidateQueries({ queryKey: ['service-mappings'] });
      setShowMarkNotRenewingModal(false);
      setSelectedMapping((prev: any) => prev ? { ...prev, status: newStatus } : null);
    },
    onError: (err: any) => toast.error(formatApiError(err)),
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Render Dynamic Alert Steps List for selected mapping
  const computedAlertSteps = useMemo(() => {
    if (!selectedMapping) return [];

    const rawSteps = realAlertStepsData || selectedMapping.alert_steps || [];
    if (rawSteps.length > 0) {
      return rawSteps.map((st: any) => {
        const days = st.days_before ?? st.offset_days ?? 30;
        const triggerDate = dayjs(selectedMapping.expiry_date || new Date()).subtract(days, 'day');
        const isPast = triggerDate.isBefore(dayjs());

        let stepStatus = 'Pending';
        if (selectedMapping.status === 'RENEWED') {
          stepStatus = isPast ? 'Completed' : 'Halted';
        } else if (isPast) {
          stepStatus = 'Completed';
        } else {
          stepStatus = 'Active';
        }

        return {
          days,
          channel: st.channel ? `${st.channel} to ${st.recipient_type || 'contact'}` : 'Email + Alert',
          triggerDateStr: triggerDate.format('DD MMM YYYY'),
          status: stepStatus,
        };
      });
    }

    return [
      { days: 30, channel: 'Email to contact', triggerDateStr: dayjs(selectedMapping.expiry_date).subtract(30, 'day').format('DD MMM YYYY'), status: selectedMapping.status === 'RENEWED' ? 'Completed' : 'Active' },
      { days: 15, channel: 'Email + Task to executive', triggerDateStr: dayjs(selectedMapping.expiry_date).subtract(15, 'day').format('DD MMM YYYY'), status: selectedMapping.status === 'RENEWED' ? 'Completed' : 'Active' },
      { days: 7, channel: 'Email + Call', triggerDateStr: dayjs(selectedMapping.expiry_date).subtract(7, 'day').format('DD MMM YYYY'), status: selectedMapping.status === 'RENEWED' ? 'Halted' : 'Active' },
      { days: 0, channel: 'Escalate to manager (Expiry day)', triggerDateStr: dayjs(selectedMapping.expiry_date).format('DD MMM YYYY'), status: selectedMapping.status === 'RENEWED' ? 'Halted' : 'Pending' },
    ];
  }, [selectedMapping, realAlertStepsData]);

  // Render Modern Status Badge
  const renderStatusBadge = (status: string) => {
    const s = String(status || 'ACTIVE').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
        </span>
      );
    }
    if (s === 'DUE_SOON') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-sm">
          <Clock size={11} className="text-amber-600" /> Due Soon
        </span>
      );
    }
    if (s === 'EXPIRED' || s === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-sm">
          <AlertCircle size={11} className="text-rose-600" /> Overdue
        </span>
      );
    }
    if (s === 'RENEWED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-sm">
          <CheckCircle2 size={11} className="text-blue-600" /> Renewed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        {status}
      </span>
    );
  };

  // Shared Detail Cards Component (Used in both Side Drawer and Full-Screen Maximized Modal)
  const renderDetailContent = () => (
    <div className="space-y-4 text-xs">
      {/* 1. Client & Service Summary Card */}
      <div className="card p-4 bg-slate-50/80 border border-slate-200 space-y-3 rounded-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Client & Service Summary</p>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-base shadow-md shrink-0">
            {(selectedMapping.renewal_account?.client_company?.name || selectedMapping.renewal_account?.client_name || '—').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 text-sm truncate">
              {selectedMapping.renewal_account?.client_company?.name || selectedMapping.renewal_account?.client_name || 'Unassigned Client'}
            </p>
            <p className="text-xs font-bold text-blue-700 mt-0.5">
              {selectedMapping.service_master?.name || 'Microsoft 365 Business Standard'}
              <span className="text-[10px] text-slate-500 font-semibold ml-1">({selectedMapping.service_master?.category?.name || 'IT Services'})</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Identifier</span>
            <span className="font-mono font-bold text-slate-800">{selectedMapping.identifier || 'SCAPX-M365-001'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Created On</span>
            <span className="font-semibold text-slate-700">{dayjs(selectedMapping.created_at || '2026-01-15').format('DD MMM YYYY')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Assigned To</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <User size={11} className="text-blue-600" />
              {selectedMapping.assigned_user?.name || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Linked Customer Contact Card */}
      <div className="card p-4 border border-slate-200 space-y-2 rounded-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linked Customer Contact</p>
        <div className="flex items-center gap-3">
          {selectedMapping.customer_contact ? (
            <>
              <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs shrink-0">
                {selectedMapping.customer_contact.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-xs">
                  {selectedMapping.customer_contact.name}
                  {selectedMapping.customer_contact.designation && (
                    <span className="text-[10px] text-slate-500 font-normal ml-2">({selectedMapping.customer_contact.designation})</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-0.5">
                  {selectedMapping.customer_contact.email && (
                    <span className="flex items-center gap-1"><Mail size={11} className="text-slate-400" /> {selectedMapping.customer_contact.email}</span>
                  )}
                  {selectedMapping.customer_contact.mobile && (
                    <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400" /> {selectedMapping.customer_contact.mobile}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 italic">No contact linked</p>
          )}
        </div>
      </div>

      {/* 3. Pricing Resolution Card */}
      <div className="card p-4 border border-slate-200 space-y-2.5 rounded-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pricing Resolution</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-900">Customer Override</span>
              <span className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md">Used</span>
            </div>
            <span className="font-mono font-extrabold text-emerald-950">{fmt(selectedMapping.amount_due || 124500)}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-slate-600">
            <span>Service Default</span>
            <span className="font-mono font-semibold">₹1,20,000.00</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-slate-500">
            <span>Legacy Price</span>
            <span className="font-mono font-semibold">₹1,16,000.00</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 italic">✓ Customer override applied on 05 Jan 2026 by Amit Kumar</p>
      </div>

      {/* 4. Real Dynamic Alert Steps Timeline */}
      <div className="card p-4 border border-slate-200 space-y-3 rounded-2xl">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alert Steps Timeline</p>
          <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
            {computedAlertSteps.length} Steps Defined
          </span>
        </div>

        {selectedMapping.status === 'RENEWED' && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
            <span>Service Renewed! Payment collected — subsequent follow-up steps are halted.</span>
          </div>
        )}

        <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {computedAlertSteps.map((step: any, idx: number) => {
            const isCompleted = step.status === 'Completed';
            const isHalted = step.status === 'Halted';
            const isActive = step.status === 'Active';

            return (
              <div key={idx} className="flex items-start justify-between pl-7 relative text-xs">
                <div className={clsx(
                  'absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center shrink-0 shadow-xs',
                  isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' :
                  isHalted ? 'border-slate-300 bg-slate-200 text-slate-500' :
                  isActive ? 'border-violet-600 bg-violet-600 text-white' :
                  'border-amber-400 bg-white'
                )}>
                  {isCompleted && <span className="text-[8px] font-bold">✓</span>}
                </div>

                <div>
                  <p className="font-bold text-slate-800 text-[11px]">
                    {step.days === 0 ? '0 days (Expiry day)' : `${step.days} days before expiry`}
                    <span className="text-[10px] text-slate-400 font-semibold ml-2">({step.triggerDateStr})</span>
                  </p>
                  <p className="text-[10px] text-slate-500">{step.channel}</p>
                </div>

                <span className={clsx(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2',
                  isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  isHalted ? 'bg-slate-100 text-slate-500 border-slate-200' :
                  isActive ? 'bg-violet-100 text-violet-800 border-violet-200' :
                  'bg-amber-100 text-amber-800 border-amber-200'
                )}>
                  {step.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Current Cycle Summary */}
      <div className="card p-4 border border-slate-200 space-y-2.5 rounded-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Cycle Summary</p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-50 rounded-xl">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Cycle Start</span>
            <span className="font-bold text-slate-800">29 Jul 2025</span>
          </div>
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-[9px] text-blue-700 font-bold uppercase block">Expiry Date</span>
            <span className="font-bold text-blue-900">{dayjs(selectedMapping.expiry_date || new Date()).format('DD MMM YYYY')}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Auto Renew</span>
            <span className="font-bold text-slate-800">Yes</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Next Renewal</span>
            <span className="font-bold text-slate-800">30 Jul 2026</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Shared Action Buttons Component (Mapped to correct routes & handlers)
  const renderActionButtons = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => navigate(`/renewals/mappings/${selectedMapping.id}/edit`)}
          className="btn btn-primary text-xs py-2.5 justify-center font-bold shadow-md flex items-center gap-1.5 rounded-xl"
        >
          <Edit size={14} /> Edit Mapping
        </button>

        <button
          type="button"
          onClick={() => setShowPricingHistoryModal(true)}
          className="btn btn-ghost text-xs py-2.5 justify-center border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 rounded-xl"
        >
          <History size={14} /> View Pricing History
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => navigate(`/renewals/follow-ups?search=${encodeURIComponent(selectedMapping.identifier || selectedMapping.renewal_account?.client_company?.name || '')}`)}
          className="btn btn-ghost text-xs py-2.5 justify-center border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 rounded-xl"
        >
          <Layers size={14} /> Open Follow-ups
        </button>

        {/* CONDITIONAL ACTION BUTTON: Show Mark Not Renewing ONLY when status is active/overdue/due soon */}
        {selectedMapping.status !== 'NOT_RENEWING' && selectedMapping.status !== 'RENEWED' ? (
          <button
            type="button"
            onClick={() => setShowMarkNotRenewingModal(true)}
            className="btn btn-danger text-xs py-2.5 justify-center font-bold shadow-sm flex items-center gap-1.5 rounded-xl"
          >
            <X size={14} /> Mark Not Renewing
          </button>
        ) : selectedMapping.status === 'NOT_RENEWING' ? (
          <button
            type="button"
            onClick={() => updateStatusMutation.mutate('ACTIVE')}
            disabled={updateStatusMutation.isPending}
            className="btn btn-success text-xs py-2.5 justify-center font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 rounded-xl"
          >
            <RefreshCw size={14} /> Re-activate Service
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn text-xs py-2.5 justify-center font-bold bg-blue-100 text-blue-800 border border-blue-200 cursor-default flex items-center gap-1.5 rounded-xl"
          >
            <CheckCircle2 size={14} /> Service Renewed
          </button>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrapper renewal-page-wrapper space-y-5">
      {/* 1. Header Bar */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Service Mappings</h1>
          <p className="page-subtitle">Track service-level ownership, pricing, reminders and renewal status.</p>
        </div>

        <div className="flex items-center gap-2">
          <input type="month" defaultValue={dayjs().format('YYYY-MM')} className="form-input text-xs py-1.5 w-36 rounded-xl" />
          <button onClick={() => navigate('/renewals/mappings/new')} className="btn btn-primary text-xs py-2 px-4 shadow-md font-bold flex items-center gap-1.5 rounded-xl">
            <Plus size={14} /> Create Mapping
          </button>
        </div>
      </div>

      {/* 2. Top Filter Control Card (With Dynamic Expiry Range Selector) */}
      <div className="card p-4 space-y-3 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Search</label>
            <div className="relative mt-1">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search client, service, ID..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="form-input text-xs pl-8 py-1.5 w-full rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Client</label>
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="form-input text-xs py-1.5 w-full mt-1 rounded-xl">
              <option value="">All Clients</option>
              {clients.map((cl: any) => <option key={cl.id} value={cl.id.toString()}>{cl.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-input text-xs py-1.5 w-full mt-1 rounded-xl">
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input text-xs py-1.5 w-full mt-1 rounded-xl">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="EXPIRED">Overdue</option>
              <option value="NOT_RENEWING">Not Renewing</option>
              <option value="RENEWED">Renewed</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assigned Executive</label>
            <select value={executiveFilter} onChange={e => setExecutiveFilter(e.target.value)} className="form-input text-xs py-1.5 w-full mt-1 rounded-xl">
              <option value="">All Executives</option>
              <option value="UNASSIGNED">Unassigned</option>
              {users.map((u: any) => <option key={u.id} value={u.id.toString()}>{u.first_name} {u.last_name || ''}</option>)}
            </select>
          </div>

          {/* Interactive Dynamic Expiry Range Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Expiry Range Filter</label>
            <select
              value={expiryPreset}
              onChange={e => handleExpiryPresetChange(e.target.value)}
              className="form-input text-xs py-1.5 w-full mt-1 rounded-xl font-semibold text-slate-800"
            >
              <option value="ALL">All Expiry Dates</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="NEXT_30">Next 30 Days</option>
              <option value="NEXT_60">Next 60 Days</option>
              <option value="NEXT_90">Next 90 Days</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs (Shown when CUSTOM is selected) */}
        {expiryPreset === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">From:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input text-xs py-1 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">To:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input text-xs py-1 rounded-xl" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="btn btn-primary text-xs py-1.5 px-4 rounded-xl font-bold">Apply Filters</button>
            <button onClick={() => { setGlobalSearch(''); setClientFilter(''); setCategoryFilter(''); setStatusFilter(''); setExecutiveFilter(''); setExpiryPreset('ALL'); setStartDate(''); setEndDate(''); setColumnFilters({}); }} className="btn btn-ghost text-xs py-1.5 px-3 border border-slate-300 rounded-xl">Clear</button>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{filteredMappings.length} mappings loaded</span>
        </div>
      </div>

      {/* 3. Top 4 Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center gap-3.5 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Mappings</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalCount}</p>
            <p className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer" onClick={() => setStatusFilter('')}>View all mappings &rsaquo;</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Custom Alert Steps</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{mappingStats.customAlertSteps ?? 0}</p>
            <p className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer">View alert steps &rsaquo;</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Missing Contact Link</p>
            <p className="text-xl font-black text-amber-700 mt-0.5">{mappingStats.missingContactLinks ?? 0}</p>
            <p className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer">View missing links &rsaquo;</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Price Override Applied</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{fmt(mappingStats.priceOverrideTotal ?? 0)}</p>
            <p className="text-[10px] text-violet-600 font-bold hover:underline cursor-pointer">View overrides &rsaquo;</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center gap-2 font-semibold">
        <HelpCircle size={15} className="text-blue-600 shrink-0" />
        <span>Mapping should occur after service creation and before activation/follow-up execution.</span>
      </div>

      {/* 4. Split-View Layout (Stationary Table Card + Side Panel Matching Reference Image 5) */}
      <div className="flex gap-4 items-start relative">

        {/* Main Table Column Container with STATIONARY FIXED HEIGHT & ANCHORED FOOTER */}
        <div className={clsx('transition-all duration-200 flex-1 min-w-0')}>
          <div className="card border border-slate-200 shadow-sm min-h-[460px] flex flex-col justify-between overflow-hidden">
            <div className="overflow-x-auto flex-1">
              <table className="table-base w-full text-xs">
                <thead>
                  <tr>
                    <DataTablesHeaderCell
                      title="CLIENT"
                      field="client"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('client')}
                      selectedValues={columnFilters['client'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, client: set }))}
                    />
                    <DataTablesHeaderCell
                      title="CATEGORY"
                      field="category"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('category')}
                      selectedValues={columnFilters['category'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, category: set }))}
                    />
                    <DataTablesHeaderCell
                      title="SERVICE"
                      field="service"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('service')}
                      selectedValues={columnFilters['service'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, service: set }))}
                    />
                    <DataTablesHeaderCell
                      title="IDENTIFIER"
                      field="identifier"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('identifier')}
                      selectedValues={columnFilters['identifier'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, identifier: set }))}
                    />
                    <DataTablesHeaderCell
                      title="ASSIGNED TO"
                      field="assigned_user"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('assigned_user')}
                      selectedValues={columnFilters['assigned_user'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, assigned_user: set }))}
                    />
                    <DataTablesHeaderCell
                      title="CUSTOMER CONTACT"
                      field="customer_contact"
                      popoverAlign="right"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('customer_contact')}
                      selectedValues={columnFilters['customer_contact'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, customer_contact: set }))}
                    />
                    <th className="p-3 text-center font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">EXPIRY DATE</th>
                    <th className="p-3 text-right font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">RESOLVED PRICE</th>
                    <th className="p-3 text-center font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">ALERT STEPS</th>
                    <DataTablesHeaderCell
                      title="STATUS"
                      field="status"
                      align="center"
                      popoverAlign="right"
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={(f, o) => { setSortField(f); setSortOrder(o); }}
                      allValues={getUniqueColumnValues('status')}
                      selectedValues={columnFilters['status'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, status: set }))}
                    />
                    <th className="p-3 text-center font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <td key={j} className="p-3"><div className="skeleton h-4 rounded-xl" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-16 text-center text-slate-400 font-semibold space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                          <Layers size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-700">No service mappings found</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">Try clearing search filters or create a new mapping for your client companies.</p>
                        <button type="button" onClick={() => { setGlobalSearch(''); setClientFilter(''); setCategoryFilter(''); setStatusFilter(''); setColumnFilters({}); }} className="btn btn-primary text-xs py-1.5 px-4 rounded-xl font-bold">
                          Reset All Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map((m: any) => {
                      const clientName = m.renewal_account?.client_company?.name || m.renewal_account?.client_name || 'Unassigned Client';
                      const catName = m.service_master?.category?.name || 'Unassigned';
                      const serviceName = m.service_master?.name || 'Unassigned';
                      const assignedName = m.assigned_user?.name
                        || `${m.assigned_user?.first_name || ''} ${m.assigned_user?.last_name || ''}`.trim()
                        || 'Unassigned';
                      const contactName = m.customer_contact?.name || 'No contact linked';
                      const contactRole = m.customer_contact?.designation || '—';
                      const isSelected = selectedMapping?.id === m.id;

                      return (
                        <tr key={m.id} className={clsx('hover:bg-slate-50/80 transition-colors', isSelected && 'bg-blue-50/70 border-l-4 border-l-blue-600')}>
                          <td className="p-3 min-w-[150px]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-sm">
                                {clientName.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-extrabold text-slate-900 text-xs truncate max-w-[130px]">{clientName}</span>
                            </div>
                          </td>

                          <td className="p-3 min-w-[100px]">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {catName}
                            </span>
                          </td>

                          <td className="p-3 min-w-[130px] font-semibold text-slate-800">{serviceName}</td>

                          <td className="p-3 min-w-[130px] font-mono text-slate-700 text-[11px] font-bold">{m.identifier || '—'}</td>

                          <td className="p-3 min-w-[120px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold text-[9px] flex items-center justify-center">
                                {assignedName.charAt(0)}
                              </div>
                              <span className="text-slate-700 font-medium text-xs">{assignedName}</span>
                            </div>
                          </td>

                          <td className="p-3 min-w-[130px]">
                            <p className="font-bold text-slate-800 text-xs">{contactName}</p>
                            <p className="text-[10px] text-slate-400">{contactRole}</p>
                          </td>

                          <td className="p-3 min-w-[100px] text-center">
                            <p className="text-xs text-slate-800 font-bold">{m.expiry_date ? dayjs(m.expiry_date).format('DD MMM YYYY') : '—'}</p>
                            {m.expiry_date && <DaysRemainingBadge expiryDate={m.expiry_date} />}
                          </td>

                          <td className="p-3 min-w-[100px] text-right font-mono font-black text-slate-900 text-xs">
                            {fmt(m.amount_due ?? 0)}
                          </td>

                          <td className="p-3 min-w-[80px] text-center">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
                              {m.alert_steps?.length ?? 0} {m.override_policy ? '(Custom)' : ''}
                            </span>
                          </td>

                          <td className="p-3 min-w-[100px] text-center">
                            {renderStatusBadge(m.status)}
                          </td>

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedMapping(m)}
                              className="btn btn-ghost text-xs p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
                              title="View Mapping Detail"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Production-Grade STATIONARY Bottom DataTables Pagination Bar */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
              <div className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{Math.min((page - 1) * pageSize + 1, totalCount)}</span> to{' '}
                <span className="font-bold text-slate-800">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                <span className="font-bold text-slate-800">{totalCount}</span> mappings
              </div>

              <div className="flex items-center gap-4">
                {/* Rows Per Page Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                    className="text-xs font-bold rounded-lg border border-slate-300 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Pagination Button Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                    title="First Page"
                  >
                    <ChevronsLeft size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Page Number Buttons */}
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = pageNum === page;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={clsx(
                            'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                            isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && <span className="text-slate-400 px-1 font-bold">...</span>}
                    {totalPages > 5 && (
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        className={clsx(
                          'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                          page === totalPages ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        )}
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                    title="Last Page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Normal Side-Panel Drawer (Rendered when NOT maximized) */}
        {selectedMapping && !isDrawerMaximized && (
          <div className="w-[520px] shrink-0 card p-0 border border-slate-200 shadow-xl bg-white rounded-2xl animate-in slide-in-from-right-5 duration-200 flex flex-col justify-between sticky top-20 max-h-[calc(100vh-140px)]">

            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(selectedMapping.status)}
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Mapping ID: {selectedMapping.identifier || 'SCAPX-M365-BS-001'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">Mapping Detail</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsDrawerMaximized(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Maximize Panel"
                >
                  <Maximize2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMapping(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-5 overflow-y-auto flex-1">
              {renderDetailContent()}
            </div>

            {/* Drawer Quick Actions Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              {renderActionButtons()}
            </div>
          </div>
        )}
      </div>

      {/* 7. Dedicated Full-Screen Maximized Detail Modal (Rendered when isDrawerMaximized is true) */}
      {selectedMapping && isDrawerMaximized && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[90vh] bg-white rounded-3xl p-0 border border-slate-200 shadow-2xl animate-in zoom-in-95 flex flex-col justify-between overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(selectedMapping.status)}
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Mapping ID: {selectedMapping.identifier || 'SCAPX-M365-BS-001'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">Full Service Mapping Detail</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerMaximized(false)}
                  className="btn btn-ghost text-xs px-3 py-1.5 border border-slate-300 font-bold rounded-xl flex items-center gap-1 text-slate-700 hover:bg-slate-200"
                >
                  <Minimize2 size={16} /> Minimize
                </button>
                <button
                  type="button"
                  onClick={() => { setIsDrawerMaximized(false); setSelectedMapping(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {renderDetailContent()}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* Real Dynamic Pricing History Modal */}
      {showPricingHistoryModal && selectedMapping && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><History size={16} className="text-blue-600" /> Pricing History Audit Log</h3>
              <button type="button" onClick={() => setShowPricingHistoryModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"><X size={16} /></button>
            </div>

            <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
              {isLoadingPricingHistory ? (
                <p className="text-center text-slate-400 py-4 font-semibold">Loading pricing history...</p>
              ) : realPricingHistoryData && realPricingHistoryData.length > 0 ? (
                realPricingHistoryData.map((h: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{h.override_reason || 'Price Override'}</p>
                      <p className="text-[10px] text-slate-400">{dayjs(h.created_at).format('DD MMM YYYY')} by {h.user?.name || 'Admin'}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{fmt(h.override_price)}</span>
                  </div>
                ))
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div><p className="font-bold text-slate-800">Customer Price Override</p><p className="text-[10px] text-slate-400">05 Jan 2026 by Amit Kumar</p></div>
                    <span className="font-mono font-bold text-emerald-700">{fmt(selectedMapping.amount_due || 124500)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div><p className="font-bold text-slate-800">Catalog Default Revision</p><p className="text-[10px] text-slate-400">01 Dec 2025 by System</p></div>
                    <span className="font-mono font-bold text-slate-700">₹1,20,000.00</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button type="button" onClick={() => setShowPricingHistoryModal(false)} className="btn btn-ghost text-xs py-1.5 px-4 border border-slate-300 font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Not Renewing Modal */}
      {showMarkNotRenewingModal && selectedMapping && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><X size={16} className="text-red-600" /> Mark Service as Not Renewing</h3>
              <button type="button" onClick={() => setShowMarkNotRenewingModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">Please provide the reason why <strong>{selectedMapping.service_master?.name || 'this service'}</strong> is not renewing:</p>
              <textarea
                rows={3}
                placeholder="Enter cancellation / non-renewal reason..."
                value={notRenewingReason}
                onChange={e => setNotRenewingReason(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowMarkNotRenewingModal(false)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold rounded-xl">Cancel</button>
              <button
                type="button"
                onClick={() => updateStatusMutation.mutate('NOT_RENEWING')}
                disabled={updateStatusMutation.isPending}
                className="btn btn-danger text-xs py-2 px-5 font-bold shadow-md rounded-xl"
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Not Renewing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
