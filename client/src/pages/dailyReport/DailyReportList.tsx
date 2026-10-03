import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Mail, Eye } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import api from '../../services/api';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

interface Product { id: number; name: string; }

interface ReportRow {
    id: number;
    report_date: string;
    subject: string;
    status: 'generated' | 'sent' | 'failed';
    sent_at: string | null;
    recipient_email: string;
    user: { id: number; first_name: string; last_name: string | null };
    company: { id: number; name: string };
    products: { product_id: number; product_name: string }[];
}

const STATUS_BADGE: Record<string, string> = {
    sent: 'bg-emerald-100 text-emerald-700',
    generated: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
};

export default function DailyReportList() {
    const navigate = useNavigate();
    const [date, setDate] = useState('');
    const [productId, setProductId] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data: products } = useQuery<Product[]>({
        queryKey: ['masters', 'product'],
        queryFn: () => api.get('/masters/product').then(r => r.data),
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ['daily-reports', date, productId, page],
        queryFn: () => api.get('/daily-report', { params: { date: date || undefined, productId: productId || undefined, page, pageSize } }).then(r => r.data),
    });

    const rows: ReportRow[] = data?.data ?? [];
    const total: number = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const resetFilters = () => { setDate(''); setProductId(''); setPage(1); };

    const columns: TableColumn<ReportRow>[] = [
        { key: 'report_date', header: 'Date', render: r => <span className="text-slate-700">{dayjs(r.report_date).format('DD-MMM-YYYY')}</span> },
        { key: 'employee', header: 'Employee', render: r => <span className="text-slate-700 font-medium">{r.user.first_name} {r.user.last_name || ''}</span> },
        { key: 'products', header: 'Products', render: r => <span className="text-slate-600">{r.products.map(p => p.product_name).join(', ')}</span> },
        { key: 'company', header: 'Company', render: r => <span className="text-slate-600">{r.company.name}</span> },
        {
            key: 'status', header: 'Status', render: r => (
                <span className={clsx('px-2 py-0.5 rounded-full font-semibold text-[10px] capitalize', STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600')}>
                    {r.status}
                </span>
            ),
        },
        { key: 'view', header: '', width: 'w-10', render: () => <Eye size={14} className="text-slate-400" /> },
    ];

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <Mail size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Daily Report</h1>
                        <p className="page-subtitle">Automated daily activity reports sent to the Company Administrator</p>
                    </div>
                </div>
            </div>

            <div className="card mb-4 p-4 flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => { setDate(e.target.value); setPage(1); }}
                        className="form-input text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Product</label>
                    <select
                        value={productId}
                        onChange={e => { setProductId(e.target.value); setPage(1); }}
                        className="form-select text-sm min-w-[10rem]"
                    >
                        <option value="">All Products</option>
                        {(products ?? []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                {(date || productId) && (
                    <button type="button" onClick={resetFilters} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                        Clear filters
                    </button>
                )}
            </div>

            <div className="card overflow-hidden">
                <Table
                    columns={columns}
                    data={rows}
                    getRowKey={r => r.id}
                    isLoading={isLoading}
                    isError={isError}
                    onRowClick={r => navigate(`/reports/daily-report/${r.id}`)}
                    maxHeight="max-h-[65vh]"
                    emptyIcon={<Mail size={20} className="text-slate-400" />}
                    emptyTitle="No daily reports found"
                    emptySubtitle="Try adjusting the filters above."
                />
                <TablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    isLoading={isLoading}
                    itemLabel="reports"
                />
            </div>
        </div>
    );
}
