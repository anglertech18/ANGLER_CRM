import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, TrendingUp, DollarSign, CheckCircle2,
  AlertCircle, Clock, Calendar, ArrowUpRight, Plus,
  BarChart as BarChartIcon, Target, ListChecks, Users,
  BellRing, ArrowRight, ChevronRight, Download, Link2,
  ShieldCheck, FileText, PieChart as PieChartIcon, UserCheck,
  ChevronLeft, Phone, MessageSquare, Activity, ExternalLink, Zap,
  Sliders, Settings, Mail
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import api from '../../services/api';
import clsx from 'clsx';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';
import DataTableHeaderFilter from '../../components/DataTableHeaderFilter';
import ClientHistoryModal from '../../components/renewal/ClientHistoryModal';

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const PIE_COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

const CHANNEL_BADGES: Record<string, { cls: string; label: string; icon: JSX.Element }> = {
  CALL_TASK: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Call', icon: <Phone className="w-3 h-3" /> },
  EMAIL: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Email', icon: <Mail className="w-3 h-3" /> },
  WHATSAPP: { cls: 'bg-green-50 text-green-700 border-green-200', label: 'WhatsApp', icon: <MessageSquare className="w-3 h-3" /> },
  MEETING: { cls: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Meeting', icon: <Users className="w-3 h-3" /> },
  PAYMENT_FOLLOWUP: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Payment', icon: <DollarSign className="w-3 h-3" /> },
};

export default function RenewalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Root Global Date Range State
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [assignedOnly, setAssignedOnly] = useState(false);

  // Client History Modal State
  const [historyModalClient, setHistoryModalClient] = useState<{ id?: number; name: string } | null>(null);

  // DataTables Column Filters & Sorting
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Date Range Validation (UX-DATE-01)
  const isDateInvalid = Boolean(dateFrom && dateTo && dayjs(dateFrom).isAfter(dayjs(dateTo)));

  const handleDateFromChange = (val: string) => {
    if (dateTo && val && dayjs(val).isAfter(dayjs(dateTo))) {
      toast.error('⚠️ "From Date" cannot be after "To Date"');
      return;
    }
    setDateFrom(val);
  };

  const handleDateToChange = (val: string) => {
    if (dateFrom && val && dayjs(dateFrom).isAfter(dayjs(val))) {
      toast.error('⚠️ "To Date" cannot be before "From Date"');
      return;
    }
    setDateTo(val);
  };

  // 1. Dashboard Stats API
  const { data: stats } = useQuery({
    queryKey: ['renewal-dashboard', dateFrom, dateTo, assignedOnly],
    queryFn: () => api.get('/renewals/dashboard', { params: { from: dateFrom || undefined, to: dateTo || undefined, assignedOnly: assignedOnly ? 'true' : undefined } }).then(r => r.data),
  });

  // 2. Monthly Collection Trends API (For Bar Chart)
  const { data: monthly = [] } = useQuery({
    queryKey: ['renewal-monthly'],
    queryFn: () => api.get('/renewal-reports/monthly', { params: { months: 6 } }).then(r => r.data),
  });

  // 3. Service-Wise Category Breakdown API (For Doughnut Chart)
  const { data: serviceWise = [] } = useQuery({
    queryKey: ['renewal-service-wise'],
    queryFn: () => api.get('/renewal-reports/service-wise').then(r => r.data),
  });

  // 4. Expiring Services API
  const { data: upcoming = [] } = useQuery({
    queryKey: ['renewal-upcoming-7', assignedOnly],
    queryFn: () => api.get('/renewal-reports/upcoming', { params: { days: 7, assignedOnly: assignedOnly ? 'true' : undefined } }).then(r => r.data),
  });

  // 5. Follow-ups Counts & Today's List API
  const { data: followUpsData } = useQuery({
    queryKey: ['renewal-followups-today', assignedOnly],
    queryFn: () => api.get('/renewal-followups', { params: { tab: 'today', limit: 20, assignedOnly: assignedOnly ? 'true' : undefined } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const followUpItems: any[] = useMemo(() => {
    return followUpsData?.data ?? (Array.isArray(followUpsData) ? followUpsData : []);
  }, [followUpsData]);

  // 6. Pending Drafts Count API
  const { data: draftCount = 0 } = useQuery({
    queryKey: ['renewal-draft-count'],
    queryFn: () => api.get('/renewal-pricing/drafts', { params: { status: 'PENDING', limit: 1 } }).then(r => r.data?.total ?? r.data?.length ?? 0),
  });

  // ── Unique Column Values Extractor for Dashboard Tables ──────────────────────
  const uniqueOptions = useMemo(() => {
    const clients = new Set<string>();
    const services = new Set<string>();
    const owners = new Set<string>();

    (upcoming || []).forEach((item: any) => {
      const c = item.client_name ?? item.account_name ?? item.renewal_account?.client_company?.name;
      const s = item.service_name ?? item.service_master?.name;
      const o = item.assigned_user?.name || item.assigned_user?.first_name || 'Unassigned';
      if (c) clients.add(c);
      if (s) services.add(s);
      if (o) owners.add(o);
    });

    (followUpItems || []).forEach((item: any) => {
      const c = item.cycle?.service_instance?.renewal_account?.client_company?.name || item.client_name;
      const s = item.cycle?.service_instance?.service_master?.name || item.service_name;
      const o = item.assigned_user?.name || item.assigned_user?.first_name || item.owner || 'Unassigned';
      if (c) clients.add(c);
      if (s) services.add(s);
      if (o) owners.add(o);
    });

    return {
      client: Array.from(clients).sort(),
      service: Array.from(services).sort(),
      owner: Array.from(owners).sort(),
    };
  }, [upcoming, followUpItems]);

  // ── Filtered Dashboard Tables Data ─────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let result = [...followUpItems];

    for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
      if (allowedSet && allowedSet.size > 0) {
        result = result.filter(item => {
          let val = '';
          if (colKey === 'client') val = item.cycle?.service_instance?.renewal_account?.client_company?.name || item.client_name || '';
          else if (colKey === 'service') val = item.cycle?.service_instance?.service_master?.name || item.service_name || '';
          else if (colKey === 'owner') val = item.assigned_user?.name || item.assigned_user?.first_name || item.owner || 'Unassigned';
          return allowedSet.has(val);
        });
      }
    }
    return result;
  }, [followUpItems, columnFilters]);

  const filteredUpcoming = useMemo(() => {
    let result = [...upcoming];

    for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
      if (allowedSet && allowedSet.size > 0) {
        result = result.filter(item => {
          let val = '';
          if (colKey === 'client') val = item.client_name ?? item.account_name ?? item.renewal_account?.client_company?.name ?? '';
          else if (colKey === 'service') val = item.service_name ?? item.service_master?.name ?? '';
          else if (colKey === 'owner') val = item.assigned_user?.name || item.assigned_user?.first_name || 'Unassigned';
          return allowedSet.has(val);
        });
      }
    }
    return result;
  }, [upcoming, columnFilters]);

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  };

  return (
    <div className="page-wrapper renewal-page-wrapper space-y-5 bg-slate-50/50 min-h-screen">
      
      {/* 1. TOP HEADER BAR WITH ADVANCED FILTER BUILDER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
            <span>Renewals</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-700 font-semibold">Dashboard</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 leading-none">Renewals Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Track service renewals, collections and reminders</p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/renewals/new')}
            className="btn btn-primary text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
          >
            <Plus size={14} /> New Renewal
          </button>

          <button
            onClick={() => navigate('/renewals/follow-ups')}
            className="btn btn-ghost text-xs py-2 px-3 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Users size={13} className="text-slate-400" /> Follow-up Queue
          </button>

          <button
            onClick={() => navigate('/renewals/mappings')}
            className="btn btn-ghost text-xs py-2 px-3 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Link2 size={13} className="text-slate-400" /> Create Mapping
          </button>

          <button
            onClick={() => alert('Exporting Renewal Data...')}
            className="btn btn-ghost text-xs py-2 px-3 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download size={13} className="text-slate-400" /> Export
          </button>
        </div>
      </div>

      {/* GLOBAL EXECUTIVE DATE RANGE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Calendar size={15} className="text-blue-600" />
          <span>Global Date Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Presets */}
          <button
            type="button"
            onClick={() => {
              setDateFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
              setDateTo(dayjs().endOf('month').format('YYYY-MM-DD'));
            }}
            className="px-2.5 py-1 rounded-xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
          >
            This Month ({dayjs().format('MMM YYYY')})
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFrom(dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'));
              setDateTo(dayjs().add(1, 'month').endOf('month').format('YYYY-MM-DD'));
            }}
            className="px-2.5 py-1 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
          >
            Next Month ({dayjs().add(1, 'month').format('MMM YYYY')})
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => handleDateFromChange(e.target.value)}
              className={clsx('form-input text-xs font-semibold py-1 px-2.5 rounded-xl border', isDateInvalid ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-300')}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => handleDateToChange(e.target.value)}
              className={clsx('form-input text-xs font-semibold py-1 px-2.5 rounded-xl border', isDateInvalid ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-300')}
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-2.5 py-1 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200 ml-1"
            >
              Reset Dates
            </button>
          )}
        </div>
      </div>

      {/* 2. TOP METRICS GRID (6 CARDS Connected directly to Backend APIs) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: DUE THIS PERIOD */}
        <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">DUE THIS PERIOD</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar size={14} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 leading-none">{stats?.due_this_period ?? stats?.total_services ?? 0}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Filtered Period</p>
          </div>
          <button onClick={() => navigate('/renewals/register')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
            View details &gt;
          </button>
        </div>

        {/* Card 2: RENEWED */}
        <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">RENEWED</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 leading-none">{stats?.renewed ?? stats?.renewed_count ?? 0}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">This period</p>
          </div>
          <button onClick={() => navigate('/renewals/register')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
            View renewals &gt;
          </button>
        </div>

        {/* Card 3: RENEWAL % */}
        <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">RENEWAL %</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 leading-none">{stats?.renewal_pct ?? 0}%</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Renewed / Due</p>
          </div>
          <button onClick={() => navigate('/renewals/reports')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
            View trend &gt;
          </button>
        </div>

        {/* Card 4: AMOUNT DUE */}
        <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">AMOUNT DUE</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-lg font-black text-slate-900 leading-none">{fmt(stats?.amount_due ?? 0)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Across active services</p>
          </div>
          <button onClick={() => navigate('/renewals/register?filter=aging')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
            View aging &gt;
          </button>
        </div>

        {/* Card 5: COLLECTED */}
        <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">COLLECTED</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-lg font-black text-emerald-600 leading-none">{fmt(stats?.amount_collected ?? 0)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">{stats?.collection_pct ?? 0}% collection rate</p>
          </div>
          <button onClick={() => navigate('/renewals/reports?filter=collections')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
            View collections &gt;
          </button>
        </div>

        {/* Card 6: EXPIRING IN 7 DAYS */}
        <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">EXPIRING IN 7 DAYS</span>
            <div className="w-7 h-7 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Clock size={14} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-red-600 leading-none">{stats?.expiring_in_7_days ?? 0}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Services expiring soon</p>
          </div>
          <button onClick={() => navigate('/renewals/register')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
            View list &gt;
          </button>
        </div>
      </div>

      {/* 3. CHARTS ROW (3 CHARTS Side-by-Side) */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Chart 1: Monthly Due vs Renewed */}
        <div className="card p-4 bg-white border border-slate-200 shadow-2xs rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Monthly Due vs Renewed</h3>
            <span className="text-[10px] font-bold text-slate-400">Last 6 months</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }: any) => active && payload?.length ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xl text-xs space-y-0.5">
                      <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>
                      <p className="text-blue-400 font-semibold">Due: {payload[0]?.value}</p>
                      <p className="text-blue-700 font-semibold">Renewed: {payload[1]?.value}</p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="due" name="Due" fill="#BFDBFE" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="renewed" name="Renewed" fill="#1D4ED8" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Service-wise Breakdown */}
        <div className="card p-4 bg-white border border-slate-200 shadow-2xs rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Service-wise Breakdown</h3>
            <button onClick={() => navigate('/renewals/reports')} className="text-[10px] font-bold text-blue-600 hover:underline">
              View details &gt;
            </button>
          </div>

          <div className="h-52 w-full min-w-0">
            {!serviceWise || serviceWise.length === 0 || (serviceWise.length === 1 && serviceWise[0].due === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <AlertCircle size={24} className="text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500">Breakdown unavailable for the selected period</p>
                <p className="text-[10px] text-slate-400 mt-1">Try adjusting the date range or refresh data</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[minmax(115px,42%)_minmax(0,1fr)] gap-3 h-full min-w-0 overflow-hidden">
                <div className="h-full min-w-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceWise}
                        dataKey="due"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={58}
                        innerRadius={38}
                      >
                        {serviceWise.map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} services`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                    <span className="text-[11px] font-black text-slate-800">{stats?.total_services ?? 0} services</span>
                  </div>
                </div>

                <div className="min-w-0 max-h-full overflow-y-auto pr-1 space-y-1 text-[11px]">
                  {serviceWise.map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-[minmax(0,1fr)_34px] items-center gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-slate-700 font-medium truncate" title={item.category}>{item.category}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 text-right">{item.renewal_pct ?? 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Collection Trend */}
        <div className="card p-4 bg-white border border-slate-200 shadow-2xs rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Collection Trend</h3>
            <span className="text-[10px] font-bold text-slate-400">Last 6 months</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 15, right: 15, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [fmt(v), 'Collected']} />
                <Line type="monotone" dataKey="amount_collected" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-700">Total collected: <strong className="text-emerald-600 font-mono">{fmt(stats?.amount_collected ?? 0)}</strong></span>
            <button onClick={() => navigate('/renewals/reports')} className="text-[10px] font-bold text-blue-600 hover:underline">
              View report &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 5. TABLES ROW WITH AUTOMATED VS MANUAL CHANNEL BADGES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        
        {/* Table 1: Today's Follow-ups */}
        <div className="card bg-white border border-slate-200 shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Today's Follow-ups</h3>
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {filteredTasks.length}
                </span>
              </div>
              <button onClick={() => navigate('/renewals/follow-ups')} className="text-[11px] font-bold text-blue-600 hover:underline">
                View all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <DataTableHeaderFilter
                      title="Customer"
                      field="client"
                      allValues={uniqueOptions.client}
                      selectedValues={columnFilters['client'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, client: set }))}
                      className="w-[28%]"
                    />
                    <DataTableHeaderFilter
                      title="Service"
                      field="service"
                      allValues={uniqueOptions.service}
                      selectedValues={columnFilters['service'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, service: set }))}
                      className="w-[26%]"
                    />
                    <th className="w-[20%] p-2.5 text-center text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-200">Channel / Status</th>
                    <DataTableHeaderFilter
                      title="Owner"
                      field="owner"
                      allValues={uniqueOptions.owner}
                      selectedValues={columnFilters['owner'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, owner: set }))}
                      className="w-[14%]"
                    />
                    <th className="w-[12%] p-2.5 text-center text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No follow-ups due today</td>
                    </tr>
                  ) : (
                    filteredTasks.slice(0, 5).map((item: any) => {
                      const cName = item.cycle?.service_instance?.renewal_account?.client_company?.name || item.client_name || 'Valued Client';
                      const sName = item.cycle?.service_instance?.service_master?.name || item.service_name || 'Service';
                      const owner = item.assigned_user?.name || item.assigned_user?.first_name || item.owner || 'Unassigned';
                      const badge = CHANNEL_BADGES[item.action_type] || CHANNEL_BADGES.CALL_TASK;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-bold text-slate-800 truncate" title={cName}>{cName}</td>
                          <td className="p-2.5 text-slate-600 font-medium truncate" title={sName}>{sName}</td>
                          <td className="p-2.5 text-center">
                            <span className={clsx('inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border', badge.cls)}>
                              {badge.icon} {badge.label}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 font-semibold truncate" title={owner}>{owner}</td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => navigate('/renewals/follow-ups')}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                title="Open Follow-up"
                              >
                                <Phone size={12} />
                              </button>
                              <button
                                onClick={() => setHistoryModalClient({ id: item.id, name: cName })}
                                className="p-1 text-purple-600 hover:bg-purple-50 rounded-md font-bold flex items-center gap-0.5"
                                title="View Client Historical Renewal Graph"
                              >
                                <Activity size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-auto p-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
            <button onClick={() => navigate('/renewals/follow-ups')} className="text-[11px] font-bold text-blue-600 hover:underline">
              View all follow-ups &gt;
            </button>
          </div>
        </div>

        {/* Table 2: Expiring in 7 Days */}
        <div className="card bg-white border border-slate-200 shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-red-500" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Expiring in 7 Days</h3>
                <span className="w-6 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {filteredUpcoming.length}
                </span>
              </div>
              <button onClick={() => navigate('/renewals/register')} className="text-[11px] font-bold text-blue-600 hover:underline">
                View all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <DataTableHeaderFilter
                      title="Customer"
                      field="client"
                      allValues={uniqueOptions.client}
                      selectedValues={columnFilters['client'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, client: set }))}
                      className="w-[26%]"
                    />
                    <DataTableHeaderFilter
                      title="Service"
                      field="service"
                      allValues={uniqueOptions.service}
                      selectedValues={columnFilters['service'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, service: set }))}
                      className="w-[24%]"
                    />
                    <th className="w-[18%] p-2.5 text-center text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-200">Expires</th>
                    <th className="w-[14%] p-2.5 text-center text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-200">Days Left</th>
                    <DataTableHeaderFilter
                      title="Assigned To"
                      field="owner"
                      allValues={uniqueOptions.owner}
                      selectedValues={columnFilters['owner'] || new Set()}
                      onFilterChange={set => setColumnFilters(p => ({ ...p, owner: set }))}
                      className="w-[10%]"
                    />
                    <th className="w-[8%] p-2.5 text-center text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUpcoming.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No services expiring in 7 days</td>
                    </tr>
                  ) : (
                    filteredUpcoming.slice(0, 5).map((item: any) => {
                      const cName = item.client_name ?? item.account_name ?? item.renewal_account?.client_company?.name ?? 'Valued Client';
                      const sName = item.service_name ?? item.service_master?.name ?? 'Service';
                      const owner = item.assigned_user?.name || item.assigned_user?.first_name || 'Unassigned';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-bold text-slate-800 truncate" title={cName}>{cName}</td>
                          <td className="p-2.5 text-slate-600 font-medium truncate" title={sName}>{sName}</td>
                          <td className="p-2.5 text-center text-slate-600 font-semibold">{dayjs(item.expiry_date ?? new Date()).format('DD MMM YYYY')}</td>
                          <td className="p-2.5 text-center">
                            <DaysRemainingBadge expiryDate={item.expiry_date ?? new Date()} />
                          </td>
                          <td className="p-2.5 text-slate-600 font-semibold truncate" title={owner}>{owner}</td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => navigate('/renewals/register')}
                                className="btn btn-ghost text-[10px] py-0.5 px-2 border border-slate-300 rounded-md font-bold text-slate-700 hover:bg-slate-100"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => setHistoryModalClient({ id: item.id, name: cName })}
                                className="p-1 text-purple-600 hover:bg-purple-50 rounded-md font-bold flex items-center gap-0.5"
                                title="View Client Historical Renewal Graph"
                              >
                                <Activity size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-auto p-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
            <button onClick={() => navigate('/renewals/register')} className="text-[11px] font-bold text-blue-600 hover:underline">
              View all expiring services &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM SUGGESTED WORKFLOW STRIP */}
      <div className="card p-3.5 bg-white border border-slate-200 shadow-2xs rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 shrink-0">
            <span>💡 Suggested workflow:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button onClick={() => navigate('/renewals/new')} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5">
              1. New Renewal <ChevronRight size={12} />
            </button>
            <button onClick={() => navigate('/renewals/contacts')} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-all flex items-center gap-1.5">
              2. Add Contact <ChevronRight size={12} />
            </button>
            <button onClick={() => navigate('/renewals/new')} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-all flex items-center gap-1.5">
              3. Add Services <ChevronRight size={12} />
            </button>
            <button onClick={() => navigate('/renewals/mappings')} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-all flex items-center gap-1.5">
              4. Map Pricing/Alerts <ChevronRight size={12} />
            </button>
            <button onClick={() => navigate('/renewals/new')} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-all flex items-center gap-1.5">
              5. Activate
            </button>
          </div>
        </div>
      </div>

      {/* CLIENT HISTORICAL GRAPH MODAL */}
      {historyModalClient && (
        <ClientHistoryModal
          isOpen={!!historyModalClient}
          onClose={() => setHistoryModalClient(null)}
          clientId={historyModalClient.id}
          clientName={historyModalClient.name}
        />
      )}
    </div>
  );
}
