import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Download, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { DaysRemainingBadge } from '../../components/renewal/DaysRemainingBadge';

type Tab = 'monthly' | 'service' | 'overdue' | 'upcoming';
const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function RenewalReports() {
  const [tab, setTab] = useState<Tab>('monthly');
  const [upcomingDays, setUpcomingDays] = useState('30');

  const { data: monthly = [] } = useQuery({
    queryKey: ['report-monthly'],
    queryFn: () => api.get('/renewal-reports/monthly', { params: { months: 12 } }).then(r => r.data),
    enabled: tab === 'monthly',
  });

  const { data: serviceWise = [] } = useQuery({
    queryKey: ['report-service-wise'],
    queryFn: () => api.get('/renewal-reports/service-wise').then(r => r.data),
    enabled: tab === 'service',
  });

  const { data: overdue = [] } = useQuery({
    queryKey: ['report-overdue'],
    queryFn: () => api.get('/renewal-reports/overdue').then(r => r.data),
    enabled: tab === 'overdue',
  });

  const { data: upcoming = [] } = useQuery({
    queryKey: ['report-upcoming', upcomingDays],
    queryFn: () => api.get('/renewal-reports/upcoming', { params: { days: upcomingDays } }).then(r => r.data),
    enabled: tab === 'upcoming',
  });

  const TABS = [
    { id: 'monthly' as Tab,  label: 'Monthly',      icon: BarChart2 },
    { id: 'service' as Tab,  label: 'Service-wise', icon: TrendingUp },
    { id: 'overdue' as Tab,  label: 'Overdue',      icon: AlertCircle },
    { id: 'upcoming' as Tab, label: 'Upcoming',     icon: Clock },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
            <BarChart2 size={16} className="text-primary-600" />
          </div>
          <div>
            <h1 className="page-title">Renewal Reports</h1>
            <p className="page-subtitle">Analytics and performance tracking</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('chip', tab === t.id ? 'chip-active' : 'chip-inactive')}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Monthly */}
      {tab === 'monthly' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><span className="text-sm font-semibold text-slate-800">Monthly Renewal Performance (Last 12 months)</span></div>
            <div className="p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#CBD5E1' }} />
                  <Tooltip />
                  <Bar dataKey="due" name="Due" fill="#BFDBFE" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="renewed" name="Renewed" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Month</th>
                  <th className="table-th text-right">Due</th>
                  <th className="table-th text-right">Renewed</th>
                  <th className="table-th text-right">Renewal %</th>
                  <th className="table-th text-right">Amount Due</th>
                  <th className="table-th text-right">Collected</th>
                  <th className="table-th text-right">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m: any) => (
                  <tr key={m.month} className="table-tr">
                    <td className="table-td font-medium">{m.month}</td>
                    <td className="table-td text-right">{m.due}</td>
                    <td className="table-td text-right text-emerald-700 font-medium">{m.renewed}</td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${m.renewal_pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{m.renewal_pct}%</span>
                      </div>
                    </td>
                    <td className="table-td text-right text-slate-600">{fmt(m.amount_due)}</td>
                    <td className="table-td text-right text-emerald-700 font-medium">{fmt(m.amount_collected)}</td>
                    <td className="table-td text-right text-xs font-semibold text-slate-600">
                      {m.amount_due > 0 ? Math.round((m.amount_collected / m.amount_due) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service-wise */}
      {tab === 'service' && (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Category</th>
                <th className="table-th text-right">Due</th>
                <th className="table-th text-right">Renewed</th>
                <th className="table-th text-right">Renewal %</th>
                <th className="table-th text-right">Amount Due</th>
                <th className="table-th text-right">Collected</th>
                <th className="table-th text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {serviceWise.length === 0 ? (
                <tr><td colSpan={7} className="table-td text-center text-slate-400 py-10">No data</td></tr>
              ) : serviceWise.map((s: any) => (
                <tr key={s.category} className="table-tr">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-medium">{s.category}</span>
                    </div>
                  </td>
                  <td className="table-td text-right">{s.due}</td>
                  <td className="table-td text-right text-emerald-700 font-medium">{s.renewed}</td>
                  <td className="table-td text-right">
                    <span className={clsx('font-semibold', s.renewal_pct >= 80 ? 'text-emerald-600' : s.renewal_pct >= 50 ? 'text-amber-600' : 'text-red-600')}>
                      {s.renewal_pct}%
                    </span>
                  </td>
                  <td className="table-td text-right text-slate-600">{fmt(s.amount_due)}</td>
                  <td className="table-td text-right text-emerald-700">{fmt(s.amount_collected)}</td>
                  <td className="table-td text-right text-amber-700">{fmt(s.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overdue */}
      {tab === 'overdue' && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="text-sm font-semibold text-slate-800">Overdue Services ({overdue.length})</span>
          </div>
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Customer</th>
                <th className="table-th">Service</th>
                <th className="table-th">Identifier</th>
                <th className="table-th">Expired</th>
                <th className="table-th">Days Overdue</th>
                <th className="table-th">Assigned</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {overdue.length === 0 ? (
                <tr><td colSpan={7} className="table-td text-center text-emerald-600 py-10">No overdue services</td></tr>
              ) : overdue.map((s: any) => (
                <tr key={s.id} className="table-tr bg-red-50/20">
                  <td className="table-td font-medium text-slate-800">{s.renewal_account?.client_company?.name}</td>
                  <td className="table-td text-xs text-slate-600">{s.service_master?.name}</td>
                  <td className="table-td text-xs text-slate-400">{s.identifier || '—'}</td>
                  <td className="table-td text-xs text-red-600">{dayjs(s.expiry_date).format('DD-MMM-YY')}</td>
                  <td className="table-td"><DaysRemainingBadge expiryDate={s.expiry_date} /></td>
                  <td className="table-td text-xs text-slate-500">{s.assigned_user ? `${s.assigned_user.first_name} ${s.assigned_user.last_name ?? ''}` : '—'}</td>
                  <td className="table-td"><span className="badge badge-red text-[10px]">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upcoming */}
      {tab === 'upcoming' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Show next</span>
            {['7', '14', '30', '60', '90'].map(d => (
              <button key={d} onClick={() => setUpcomingDays(d)}
                className={clsx('chip', upcomingDays === d ? 'chip-active' : 'chip-inactive')}>
                {d} days
              </button>
            ))}
          </div>
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Service</th>
                  <th className="table-th">Identifier</th>
                  <th className="table-th">Expiry</th>
                  <th className="table-th">Days Left</th>
                  <th className="table-th">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.length === 0 ? (
                  <tr><td colSpan={6} className="table-td text-center text-slate-400 py-10">No upcoming renewals in {upcomingDays} days</td></tr>
                ) : upcoming.map((s: any) => (
                  <tr key={s.id} className="table-tr">
                    <td className="table-td font-medium text-slate-800">{s.renewal_account?.client_company?.name}</td>
                    <td className="table-td text-xs" style={{ color: s.service_master?.category?.color }}>{s.service_master?.name}</td>
                    <td className="table-td text-xs text-slate-400">{s.identifier || '—'}</td>
                    <td className="table-td text-xs text-slate-500">{dayjs(s.expiry_date).format('DD-MMM-YY')}</td>
                    <td className="table-td"><DaysRemainingBadge expiryDate={s.expiry_date} /></td>
                    <td className="table-td text-xs text-slate-500">{s.assigned_user ? `${s.assigned_user.first_name} ${s.assigned_user.last_name ?? ''}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
