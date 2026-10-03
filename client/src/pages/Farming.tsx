import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Sprout, Eye, Mail, Phone, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import Table, { type TableColumn } from '../components/Table';
import TablePagination from '../components/TablePagination';

export default function Farming() {
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data: leads, isLoading, isError, error } = useQuery({
        queryKey: ['farming-leads'],
        queryFn: () => api.get('/leads?is_farming=true').then(r => r.data),
    });

    const allRows: any[] = leads?.data || [];
    const totalCount = allRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = allRows.slice((safePage - 1) * pageSize, safePage * pageSize);

    const columns: TableColumn<any>[] = [
        {
            key: 'lead', header: 'Lead', render: lead => (
                <>
                    <p className="font-semibold text-slate-800">{lead.first_name} {lead.last_name}</p>
                    {lead.job_title?.name && <p className="text-xs text-slate-400 mt-0.5">{lead.job_title.name}</p>}
                </>
            ),
        },
        {
            key: 'company', header: 'Company', render: lead => (
                <>
                    <p className="font-medium text-slate-700">{lead.company_name || lead.company_master?.name || '—'}</p>
                    {lead.industry?.name && <p className="text-xs text-slate-400 mt-0.5">{lead.industry.name}</p>}
                </>
            ),
        },
        {
            key: 'contact', header: 'Contact', render: lead => (
                <div className="space-y-1">
                    {lead.email && (
                        <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline">
                            <Mail size={11} />{lead.email}
                        </a>
                    )}
                    {lead.mobile_number && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone size={11} />{lead.mobile_number}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'score', header: 'Score', align: 'center', render: lead => (
                <>
                    <span className="text-lg font-bold text-primary-600">{lead.lead_score ?? 0}</span>
                    <span className="text-xs text-slate-400 block">/ 26</span>
                </>
            ),
        },
        {
            key: 'since', header: 'Farming Since', className: 'text-slate-500', render: lead => (
                lead.farming_moved_at ? dayjs(lead.farming_moved_at).format('DD/MM/YYYY') : '—'
            ),
        },
        {
            key: 'view', header: '', render: lead => (
                <Link to={`/farming/${lead.id}`} className="btn btn-secondary btn-sm btn-icon" title="View">
                    <Eye size={13} />
                </Link>
            ),
        },
    ];

    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-3 mb-8">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="skeleton h-5 w-40 rounded" />
            </div>
            <div className="card overflow-hidden">
                <Table columns={columns} data={[]} getRowKey={(_l, i) => i} isLoading skeletonRows={5} />
            </div>
        </div>
    );

    if (isError) return (
        <div className="page-wrapper">
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">
                    {(error as any)?.response?.data?.message || (error as any)?.message}
                </span>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                        <Sprout size={16} className="text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Farming Leads</h1>
                        <p className="page-subtitle">Long-term nurturing pipeline</p>
                    </div>
                </div>
                <span className="text-sm text-slate-500">
                    <span className="font-bold text-emerald-600">{leads?.total ?? 0}</span> leads in farming
                </span>
            </div>

            {!leads?.data?.length ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                            <Sprout size={24} className="text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700 mb-1">No Farming Leads Yet</p>
                        <p className="text-xs text-slate-400">Leads moved to farming will appear here for long-term nurturing.</p>
                    </div>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <Table
                        columns={columns}
                        data={pagedRows}
                        getRowKey={lead => lead.id}
                        maxHeight="max-h-[65vh]"
                    />
                    <TablePagination
                        page={safePage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        itemLabel="leads"
                    />
                </div>
            )}
        </div>
    );
}
