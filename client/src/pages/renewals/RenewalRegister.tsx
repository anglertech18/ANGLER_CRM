import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ChevronRight, ChevronDown, Eye, Edit2,
  Search, X, Download, RefreshCw, Menu, ArrowUp, ArrowDown, ArrowUpDown, Check,
  ChevronsLeft, ChevronLeft, ChevronsRight, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';
import { RenewalStatusBadge } from '../../components/renewal/RenewalStatusBadge';
import { useTableDensity, DensityToggle } from '../../hooks/useTableDensity';
import { ColumnPicker } from '../../components/shared/ColumnPicker';
import { MappingHoverCard } from '../../components/renewal/MappingHoverCard';

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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

          {/* Clean Light-Themed DataTables Popover Menu */}
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

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Due Soon', value: 'DUE_SOON' },
  { label: 'Follow Up', value: 'FOLLOW_UP' },
  { label: 'Renewed', value: 'RENEWED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Not Renewing', value: 'NOT_RENEWING' },
];

const COLUMNS = [
  { key: 'customer', label: 'Customer' },
  { key: 'services', label: 'Services' },
  { key: 'identifier', label: 'Identifier' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'daysLeft', label: 'Days Left' },
  { key: 'due', label: 'Due' },
  { key: 'collected', label: 'Collected' },
  { key: 'status', label: 'Status' },
];

export default function RenewalRegister() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [colFilters, setColFilters] = useState({ search: '', status: '', category: '' });

  // DataTables Column Filters State
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  const { filters, setFilters } = usePersistentFilters('renewal-register', {
    page: 1, limit: 25, sortBy: 'created_at', sortOrder: 'desc',
    expiryFrom: '', expiryTo: '', assignedUser: '',
  });

  const { density, setDensity, styles: densityStyles } = useTableDensity('renewal-register');
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    customer: true,
    services: true,
    identifier: true,
    expiry: true,
    daysLeft: true,
    due: true,
    collected: true,
    status: true,
  });

  // Masters for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['renewal-categories'],
    queryFn: () => api.get('/renewal-masters/categories').then(r => r.data),
  });
  const { data: rawUsers } = useQuery({
    queryKey: ['users-list', 'renewal-register'],
    queryFn: () => api.get('/users', { params: { limit: 200 } }).then(r => r.data),
  });
  const users: any[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data ?? []);

  const params = {
    page: filters.page, limit: filters.limit,
    sortBy: filters.sortBy, sortOrder: filters.sortOrder,
    search: colFilters.search || undefined,
    status: colFilters.status || undefined,
    category: colFilters.category || undefined,
    expiryFrom: filters.expiryFrom || undefined,
    expiryTo: filters.expiryTo || undefined,
    assignedUser: filters.assignedUser || undefined,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['renewals', params],
    queryFn: () => api.get('/renewals', { params }).then(r => r.data),
  });

  const accounts: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  // Extract unique values for Column Filter popover checkboxes
  const getUniqueColumnValues = (colKey: string): string[] => {
    const set = new Set<string>();
    accounts.forEach(acc => {
      let val = '';
      if (colKey === 'customer') val = acc.client_company?.name || acc.client_name || 'Unassigned';
      else if (colKey === 'services') val = acc.services?.[0]?.service_master?.category?.name || 'General';
      else if (colKey === 'identifier') val = acc.services?.[0]?.identifier || acc.services?.[0]?.service_master?.name || '—';
      else if (colKey === 'status') val = acc.status || 'DRAFT';
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  };

  // Filter accounts based on DataTables popover column filters
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
        if (allowedSet.size === 0) continue;
        let val = '';
        if (colKey === 'customer') val = acc.client_company?.name || acc.client_name || 'Unassigned';
        else if (colKey === 'services') val = acc.services?.[0]?.service_master?.category?.name || 'General';
        else if (colKey === 'identifier') val = acc.services?.[0]?.identifier || acc.services?.[0]?.service_master?.name || '—';
        else if (colKey === 'status') val = acc.status || 'DRAFT';
        if (allowedSet.size > 0 && !allowedSet.has(val)) return false;
      }
      return true;
    });
  }, [accounts, columnFilters]);

  const toggleRow = (id: number) => setExpandedRows(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleSort = (key: string, order?: 'asc' | 'desc') => setFilters({
    sortBy: key,
    sortOrder: order ?? (filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc'),
  } as any);

  const categoryOptions = categories.map((c: any) => ({ label: c.name, value: String(c.id) }));

  if (error) return (
    <div className="page-wrapper renewal-page-wrapper">
      <div className="card p-4 text-red-600 text-sm flex items-center gap-2">
        <span>Failed to load renewals. Please refresh.</span>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['renewals'] })} className="btn btn-sm btn-secondary ml-auto">Retry</button>
      </div>
    </div>
  );

  const visibleCount = COLUMNS.filter(c => visibleCols[c.key]).length + 2;

  return (
    <div className="page-wrapper renewal-page-wrapper space-y-4">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
            <RefreshCw size={18} />
          </div>
          <div>
            <h1 className="page-title">Renewal Register</h1>
            <p className="page-subtitle">{total} renewal account{total !== 1 ? 's' : ''} under tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ColumnPicker columns={COLUMNS} visible={visibleCols} onChange={(cols) => setVisibleCols(cols)} />
          <DensityToggle density={density} setDensity={setDensity} />
          <button onClick={() => navigate('/renewals/new')} className="btn btn-primary text-xs py-2 px-4 shadow-md font-bold flex items-center gap-1.5 rounded-xl">
            <Plus size={15} /> Add Renewal
          </button>
        </div>
      </div>

      {/* Main Table Card with Stationary Height */}
      <div className="card border border-slate-200 shadow-sm min-h-[460px] flex flex-col justify-between overflow-hidden">
        
        {/* Top Filter Toolbar */}
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={colFilters.search}
                onChange={e => setColFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                placeholder="Search company or domain..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="w-40">
              <select
                value={colFilters.category}
                onChange={e => setColFilters((prev: any) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Services</option>
                {categoryOptions.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="w-44">
              <select
                value={filters.assignedUser}
                onChange={e => setFilters({ ...filters, assignedUser: e.target.value, page: 1 } as any)}
                className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Executives</option>
                <option value="UNASSIGNED">Unassigned</option>
                {users.map((user: any) => (
                  <option key={user.id} value={String(user.id)}>
                    {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-40">
              <select
                value={colFilters.status}
                onChange={e => setColFilters((prev: any) => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expiry:</span>
              <input
                type="date"
                value={filters.expiryFrom}
                onChange={e => setFilters({ ...filters, expiryFrom: e.target.value, page: 1 } as any)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
              />
              <span className="text-slate-300 text-xs">—</span>
              <input
                type="date"
                value={filters.expiryTo}
                onChange={e => setFilters({ ...filters, expiryTo: e.target.value, page: 1 } as any)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
              />
            </div>
          </div>

          {(colFilters.search || colFilters.status || colFilters.category || filters.assignedUser || filters.expiryFrom || filters.expiryTo || Object.keys(columnFilters).length > 0) && (
            <button
              onClick={() => {
                setColFilters({ search: '', status: '', category: '' });
                setColumnFilters({});
                setFilters({ ...filters, assignedUser: '', expiryFrom: '', expiryTo: '', page: 1 } as any);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-200"
            >
              <X size={13} /> Clear All Filters
            </button>
          )}
        </div>

        {/* Table Body with DataTables Header Cell Popovers */}
        <div className="overflow-x-auto flex-1">
          <table className="table-base w-full text-xs">
            <thead>
              <tr>
                <th className="p-3 w-8 bg-slate-100 border-b border-slate-300" />
                {visibleCols.customer && (
                  <DataTablesHeaderCell
                    title="CUSTOMER"
                    field="client_company"
                    sortField={filters.sortBy}
                    sortOrder={filters.sortOrder as any}
                    onSort={(f, o) => handleSort(f, o)}
                    allValues={getUniqueColumnValues('customer')}
                    selectedValues={columnFilters['customer'] || new Set()}
                    onFilterChange={set => setColumnFilters(p => ({ ...p, customer: set }))}
                  />
                )}
                {visibleCols.services && (
                  <DataTablesHeaderCell
                    title="SERVICES"
                    field="services"
                    sortField={filters.sortBy}
                    sortOrder={filters.sortOrder as any}
                    onSort={(f, o) => handleSort(f, o)}
                    allValues={getUniqueColumnValues('services')}
                    selectedValues={columnFilters['services'] || new Set()}
                    onFilterChange={set => setColumnFilters(p => ({ ...p, services: set }))}
                  />
                )}
                {visibleCols.identifier && (
                  <DataTablesHeaderCell
                    title="IDENTIFIER"
                    field="identifier"
                    sortField={filters.sortBy}
                    sortOrder={filters.sortOrder as any}
                    onSort={(f, o) => handleSort(f, o)}
                    allValues={getUniqueColumnValues('identifier')}
                    selectedValues={columnFilters['identifier'] || new Set()}
                    onFilterChange={set => setColumnFilters(p => ({ ...p, identifier: set }))}
                  />
                )}
                {visibleCols.expiry && (
                  <th className="p-3 text-center font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">EXPIRY</th>
                )}
                {visibleCols.daysLeft && (
                  <th className="p-3 text-center font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">DAYS LEFT</th>
                )}
                {visibleCols.due && (
                  <th className="p-3 text-right font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">DUE (₹)</th>
                )}
                {visibleCols.collected && (
                  <th className="p-3 text-right font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">COLLECTED (₹)</th>
                )}
                {visibleCols.status && (
                  <DataTablesHeaderCell
                    title="STATUS"
                    field="status"
                    align="center"
                    popoverAlign="right"
                    sortField={filters.sortBy}
                    sortOrder={filters.sortOrder as any}
                    onSort={(f, o) => handleSort(f, o)}
                    allValues={getUniqueColumnValues('status')}
                    selectedValues={columnFilters['status'] || new Set()}
                    onFilterChange={set => setColumnFilters(p => ({ ...p, status: set }))}
                  />
                )}
                <th className="p-3 text-right font-bold text-[10px] uppercase text-slate-700 bg-slate-100 border-b border-slate-300">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(visibleCount)].map((_, j) => (
                      <td key={j} className="p-3"><div className="skeleton h-4 rounded-xl" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={visibleCount} className="p-16 text-center text-slate-400 font-semibold space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                      <RefreshCw size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No renewal accounts found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">Try resetting search filters or register a new renewal account.</p>
                    <button onClick={() => navigate('/renewals/new')} className="btn btn-primary text-xs py-1.5 px-4 rounded-xl font-bold">
                      <Plus size={14} /> Add Renewal
                    </button>
                  </td>
                </tr>
              ) : filteredAccounts.map((account: any) => {
                const isExpanded = expandedRows.has(account.id);
                const servicesList: any[] = account.services ?? [];
                const nearestExpiry = servicesList.reduce((min: any, s: any) => {
                  if (!s.expiry_date) return min;
                  if (!min || dayjs(s.expiry_date).isBefore(dayjs(min))) return s.expiry_date;
                  return min;
                }, null);
                const totalDue = servicesList.reduce((s: number, svc: any) => {
                  const cycle = svc.cycles?.[0];
                  return s + parseFloat(cycle?.amount_due ?? svc.amount_due ?? 0);
                }, 0);
                const totalCollected = servicesList.reduce((s: number, svc: any) => {
                  const cycle = svc.cycles?.[0];
                  return s + parseFloat(cycle?.amount_collected ?? 0);
                }, 0);
                const categoryChips = [...new Set(servicesList.map((s: any) => s.service_master?.category?.name).filter(Boolean))];

                return (
                  <Fragment key={account.id}>
                    {/* Parent row */}
                    <tr className={clsx('hover:bg-slate-50/80 transition-colors', isExpanded && 'bg-blue-50/40 border-l-4 border-l-blue-600')}>
                      <td className={clsx('p-3 w-8', densityStyles.cellPadding)}>
                        <button onClick={() => toggleRow(account.id)} className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                          {isExpanded ? <ChevronDown size={14} className="text-blue-600 font-bold" /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      {visibleCols.customer && (
                        <td className={clsx('p-3 font-extrabold text-slate-900 cursor-pointer min-w-[160px]', densityStyles.cellPadding)} onClick={() => navigate(`/renewals/${account.id}`)}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-sm">
                              {(account.client_company?.name || account.client_name || '—').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[200px]" title={account.client_company?.name || account.client_name}>{account.client_company?.name || account.client_name}</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.services && (
                        <td className={clsx('p-3 min-w-[120px]', densityStyles.cellPadding)}>
                          <div className="flex flex-wrap gap-1">
                            {categoryChips.slice(0, 3).map((cat: any) => (
                              <span key={String(cat)} className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                                {String(cat)}
                              </span>
                            ))}
                            {categoryChips.length > 3 && <span className="text-[10px] font-bold text-slate-400">+{categoryChips.length - 3}</span>}
                          </div>
                        </td>
                      )}
                      {visibleCols.identifier && (
                        <td className={clsx('p-3 text-slate-700 font-mono font-bold text-xs min-w-[130px]', densityStyles.cellPadding)}>
                          <span className="truncate max-w-[200px] block" title={servicesList[0]?.identifier || servicesList[0]?.service_master?.name}>
                            {servicesList[0]?.identifier || servicesList[0]?.service_master?.name || '—'}
                          </span>
                          {servicesList.length > 1 && <span className="text-[10px] font-bold text-slate-400"> +{servicesList.length - 1} more</span>}
                        </td>
                      )}
                      {visibleCols.expiry && (
                        <td className={clsx('p-3 text-center text-slate-800 font-bold text-xs min-w-[100px]', densityStyles.cellPadding)}>
                          {nearestExpiry ? dayjs(nearestExpiry).format('DD MMM YYYY') : '—'}
                        </td>
                      )}
                      {visibleCols.daysLeft && (
                        <td className={clsx('p-3 text-center min-w-[100px]', densityStyles.cellPadding)}>
                          <DaysRemainingBadge expiryDate={nearestExpiry} />
                        </td>
                      )}
                      {visibleCols.due && <td className={clsx('p-3 text-right font-mono font-black text-slate-900 text-xs min-w-[100px]', densityStyles.cellPadding)}>{fmt(totalDue)}</td>}
                      {visibleCols.collected && <td className={clsx('p-3 text-right font-mono font-black text-emerald-700 text-xs min-w-[100px]', densityStyles.cellPadding)}>{fmt(totalCollected)}</td>}
                      {visibleCols.status && (
                        <td className={clsx('p-3 text-center min-w-[100px]', densityStyles.cellPadding)}>
                          <RenewalStatusBadge status={account.status} />
                        </td>
                      )}
                      <td className={clsx('p-3 text-right min-w-[100px]', densityStyles.cellPadding)}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/renewals/${account.id}`)} className="btn btn-ghost text-xs p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50" title="View Account">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => navigate(`/renewals/${account.id}/edit`)} className="btn btn-ghost text-xs p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100" title="Edit Account">
                            <Edit2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Subscribed Services Sub-Table on Arrow Click Expand */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={visibleCount} className="p-4 pl-12">
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h4 className="text-[11px] font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                                Subscribed Services ({servicesList.length})
                              </h4>
                              <button
                                onClick={() => navigate(`/renewals/${account.id}`)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                              >
                                Manage Account <ExternalLink size={12} />
                              </button>
                            </div>

                            {servicesList.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">No active service instances registered for this account.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 bg-slate-50">
                                      <th className="py-2 px-3">Service Name</th>
                                      <th className="py-2 px-3">Identifier / Domain</th>
                                      <th className="py-2 px-3">Provider</th>
                                      <th className="py-2 px-3">Start Date</th>
                                      <th className="py-2 px-3">Expiry Date</th>
                                      <th className="py-2 px-3 text-right">Amount Due</th>
                                      <th className="py-2 px-3 text-center">Status</th>
                                      <th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {servicesList.map((svc: any) => (
                                      <tr key={svc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                          {svc.service_master?.name || 'Service'}
                                          {svc.service_master?.category?.name && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                              {svc.service_master.category.name}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">{svc.identifier || '—'}</td>
                                        <td className="py-2.5 px-3 text-slate-600 font-medium">{svc.provider?.name || '—'}</td>
                                        <td className="py-2.5 px-3 text-slate-600">{svc.activation_date ? dayjs(svc.activation_date).format('DD MMM YYYY') : '—'}</td>
                                        <td className="py-2.5 px-3 font-bold text-slate-800">{svc.expiry_date ? dayjs(svc.expiry_date).format('DD MMM YYYY') : '—'}</td>
                                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">{fmt(svc.amount_due)}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          <RenewalStatusBadge status={svc.status} />
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            onClick={() => navigate(`/renewals/mappings/${svc.id}/edit`)}
                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                          >
                                            Edit Mapping
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom DataTables Stationary Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{Math.min((filters.page - 1) * filters.limit + 1, total)}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(filters.page * filters.limit, total)}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> renewal accounts
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Rows per page</span>
              <select
                value={filters.limit}
                onChange={e => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 } as any)}
                className="text-xs font-bold rounded-lg border border-slate-300 px-2 py-1 bg-white focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: 1 } as any)}
                className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) } as any)}
                className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = pageNum === filters.page;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setFilters({ ...filters, page: pageNum } as any)}
                      className={clsx(
                        'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                        isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) } as any)}
                className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: totalPages } as any)}
                className="p-1 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
