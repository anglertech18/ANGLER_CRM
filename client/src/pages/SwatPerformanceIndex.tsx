import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import TablePagination from '../components/TablePagination';
import {
    Plus, Download, Calendar, User as UserIcon,
    TrendingUp, BarChart2, ChevronRight, AlertCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import DateOverlay from '../components/DateOverlay';

export default function SwatPerformanceIndex() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const today = dayjs().format('YYYY-MM-DD');
    const { filters, setFilters, resetFilters } = usePersistentFilters('swat', {
        startDate: today,
        endDate: today,
        user_id: '',
        status: '',
        product_id: '',
    });
    const selectedMappedKey = filters.product_id ? String(filters.product_id) : '';
    const [users, setUsers] = useState([]);
    const [mappedItems, setMappedItems] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const currentUser = useMemo(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }, []);

    const isAdminOrManager = currentUser?.role === 'CEO' || currentUser?.role === 'SalesManager';

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    const fetchInitialData = async () => {
        try {
            if (isAdminOrManager) {
                const response = await api.get('/users');
                setUsers(response.data);
            }
            const mappedRes = await api.get('/seal/poas/mapped-products');
            setMappedItems(mappedRes.data);
        } catch (err) {
            console.error('Error fetching initial filter data:', err);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters as any).toString();
            const response = await api.get(`/swat-performance?${query}`);
            setLogs(response.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters({ [name]: value } as any);
    };

    const handleMappedItemChange = (key: string) => {
        if (!key) {
            setFilters({ product_id: '' } as any);
            return;
        }
        setFilters({ product_id: key } as any);
    };

    const exportToExcel = () => {
        const dataToExport = logs.map((log: any) => ({
            'BDE Name':         log.bde_name,
            'Product':          log.product?.name || '—',
            'Date':             dayjs(log.date).format('DD/MM/YYYY'),
            'Calls':            `${log.calls_achieved} / ${log.calls_target}`,
            'Activities':       `${log.activities_achieved} / ${log.activities_target}`,
            'Email Campaign':   `${log.email_campaign_achieved} / ${log.email_campaign_target}`,
            'LinkedIn Connection Sent': `${log.linkedin_connection_achieved} / ${log.linkedin_connection_target}`,
            'Q1 Lead Generation': `${log.q1_lead_gen_achieved} / ${log.q1_lead_gen_target}`,
            'LinkedIn Acceptance': `${log.linkedin_achieved} / ${log.linkedin_target}`,
            'Demos':            `${log.demos_achieved} / ${log.demos_target}`,
            'Proposals':        `${log.proposals_achieved} / ${log.proposals_target}`,
            'Direct Visit':     `${log.direct_visit_achieved} / ${log.direct_visit_target}`,
            'Sales Order Won':  `${log.sales_order_won_achieved} / ${log.sales_order_won_target}`,
            'Revenue Collected': `${log.revenue_collected_achieved} / ${log.revenue_collected_target}`,
            'Perf %':           `${(log.performance_percentage || 0).toFixed(1)}%`
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'SWAT Performance');
        XLSX.writeFile(wb, `SWAT_Performance_${dayjs().format('DD_MM_YYYY')}.xlsx`);
    };

    const totalCount = logs.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);

    const MetricCell = ({ achieved, target }: { achieved: number; target: number }) => {
        const isAchieved = target > 0 && achieved >= target;
        const isUnder    = target > 0 && achieved < target;
        return (
            <td className={clsx(
                'table-td text-right font-semibold tabular-nums',
                isAchieved ? 'text-emerald-600' : isUnder ? 'text-red-500' : 'text-slate-600'
            )}>
                {achieved} / {target}
            </td>
        );
    };

    const PerfBadge = ({ pct }: { pct: number }) => {
        const isExceeded = pct >= 100;
        const isAchieved = pct >= 70 && pct < 100;
        return (
            <td className="table-td text-right">
                <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums',
                    isExceeded ? 'bg-emerald-100 text-emerald-700' :
                    isAchieved ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                )}>
                    {(pct || 0).toFixed(1)}%
                </span>
            </td>
        );
    };

    return (
        <div className="page-wrapper">
            {/* ── Header ── */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <BarChart2 size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">SWAT Performance</h1>
                        <p className="page-subtitle">Daily performance tracking and analytics</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdminOrManager && (
                        <button
                            onClick={exportToExcel}
                            disabled={logs.length === 0}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            <Download size={15} />
                            Export Excel
                        </button>
                    )}
                    <Link
                        to={`/swat-performance/new?date=${dayjs().format('YYYY-MM-DD')}`}
                        className="btn btn-primary"
                    >
                        <Plus size={15} />
                        Today's Performance
                    </Link>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="card p-5 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="form-group">
                        <label className="form-label flex items-center gap-1"><Calendar size={11} />Start Date</label>
                        <DateOverlay value={filters.startDate}>
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                onClick={(e) => (e.target as any).showPicker?.()}
                                className="form-input"
                            />
                        </DateOverlay>
                    </div>
                    <div className="form-group">
                        <label className="form-label flex items-center gap-1"><Calendar size={11} />End Date</label>
                        <DateOverlay value={filters.endDate}>
                            <input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                                onClick={(e) => (e.target as any).showPicker?.()}
                                className="form-input"
                            />
                        </DateOverlay>
                    </div>
                    {isAdminOrManager && (
                        <div className="form-group">
                            <label className="form-label flex items-center gap-1"><UserIcon size={11} />BDE Name</label>
                            <select name="user_id" value={filters.user_id} onChange={handleFilterChange} className="form-select">
                                <option value="">All BDEs</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label flex items-center gap-1"><TrendingUp size={11} />Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="form-select">
                            <option value="">All Statuses</option>
                            <option value="Below Target">Below Target</option>
                            <option value="Achieved">Achieved</option>
                            <option value="Exceeded">Exceeded</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label flex items-center gap-1"><BarChart2 size={11} />Product</label>
                        <select
                            value={selectedMappedKey}
                            onChange={e => handleMappedItemChange(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All</option>
                            {mappedItems.map((m: any) => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button
                        onClick={() => resetFilters()}
                        className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className={clsx('card overflow-hidden transition-opacity duration-200', loading && 'opacity-60')}>
                <div className="flex items-center justify-end gap-1.5 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-xs text-slate-400">Rows:</span>
                    <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="form-select py-1 text-xs"
                        style={{ width: 64 }}
                    >
                        {[5, 10, 20, 50, 100].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div className="overflow-auto max-h-[65vh]">
                    <table className="table-base">
                        <thead className="table-head">
                            <tr>
                                <th className="table-th">BDE</th>
                                <th className="table-th">Product / Service</th>
                                <th className="table-th">Date</th>
                                <th className="table-th text-right">Calls</th>
                                <th className="table-th text-right">Activities</th>
                                <th className="table-th text-right">Email Campaign</th>
                                <th className="table-th text-right">LinkedIn Connection</th>
                                <th className="table-th text-right">Q1 Lead Gen</th>
                                <th className="table-th text-right">LinkedIn Acceptance</th>
                                <th className="table-th text-right">Demos</th>
                                <th className="table-th text-right">Proposals</th>
                                <th className="table-th text-right">Visits</th>
                                <th className="table-th text-right">Sales Order Won</th>
                                <th className="table-th text-right">Revenue Collected</th>
                                <th className="table-th text-right">Perf %</th>
                                <th className="table-th"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50">
                                        {Array.from({ length: 16 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3.5">
                                                <div className="skeleton h-3 rounded" style={{ width: `${40 + (j % 3) * 20}px` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={16}>
                                        <div className="empty-state">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                                <AlertCircle size={20} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">No performance logs found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try adjusting the filters or add today's performance.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log: any) => (
                                    <tr key={log.id} className="table-tr">
                                        <td className="table-td font-semibold text-slate-800">{log.bde_name}</td>
                                        <td className="table-td">
                                            <div className="flex flex-col gap-0.5">
                                                <span className={clsx(
                                                    'badge',
                                                    log.product_id ? 'badge-blue' : 'badge-purple'
                                                )}>
                                                    {log.product?.name || log.service_department || '—'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {log.product_id ? 'Product' : 'Service'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="table-td">
                                            <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                <Calendar size={11} />
                                                {dayjs(log.date).format('DD/MM/YYYY')}
                                            </span>
                                        </td>
                                        <MetricCell achieved={log.calls_achieved}       target={log.calls_target} />
                                        <MetricCell achieved={log.activities_achieved}  target={log.activities_target} />
                                        <MetricCell achieved={log.email_campaign_achieved} target={log.email_campaign_target} />
                                        <MetricCell achieved={log.linkedin_connection_achieved} target={log.linkedin_connection_target} />
                                        <MetricCell achieved={log.q1_lead_gen_achieved} target={log.q1_lead_gen_target} />
                                        <MetricCell achieved={log.linkedin_achieved}    target={log.linkedin_target} />
                                        <MetricCell achieved={log.demos_achieved}       target={log.demos_target} />
                                        <MetricCell achieved={log.proposals_achieved}   target={log.proposals_target} />
                                        <MetricCell achieved={log.direct_visit_achieved} target={log.direct_visit_target} />
                                        <MetricCell achieved={log.sales_order_won_achieved} target={log.sales_order_won_target} />
                                        <MetricCell achieved={log.revenue_collected_achieved} target={log.revenue_collected_target} />
                                        <PerfBadge pct={log.performance_percentage || 0} />
                                        <td className="table-td text-right">
                                            <button
                                                onClick={() => {
                                                    let url = `/swat-performance/new?date=${dayjs(log.date).format('YYYY-MM-DD')}`;
                                                    if (log.product_id) url += `&product_id=${log.product_id}`;
                                                    else if (log.service_department) url += `&service_department=${encodeURIComponent(log.service_department)}`;
                                                    navigate(url);
                                                }}
                                                className="btn btn-ghost btn-sm gap-1"
                                            >
                                                {dayjs(log.date).isSame(dayjs(), 'day') ? 'Edit' : 'View'}
                                                <ChevronRight size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    isLoading={loading}
                    itemLabel="records"
                />
            </div>
        </div>
    );
}
