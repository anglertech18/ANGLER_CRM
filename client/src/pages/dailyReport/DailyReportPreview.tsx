import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Mail } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import api from '../../services/api';

interface ReportDetail {
    id: number;
    report_date: string;
    subject: string;
    email_html: string;
    status: 'generated' | 'sent' | 'failed';
    sent_at: string | null;
    recipient_email: string;
    error_message: string | null;
    user: { id: number; first_name: string; last_name: string | null };
    company: { id: number; name: string };
}

const STATUS_BADGE: Record<string, string> = {
    sent: 'bg-emerald-100 text-emerald-700',
    generated: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
};

export default function DailyReportPreview() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: report, isLoading, isError } = useQuery<ReportDetail>({
        queryKey: ['daily-report', id],
        queryFn: () => api.get(`/daily-report/${id}`).then(r => r.data),
    });

    if (isLoading) {
        return (
            <div className="page-wrapper max-w-3xl">
                <div className="page-header"><h1 className="page-title">Daily Report</h1></div>
                <div className="card p-6 space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
                </div>
            </div>
        );
    }

    if (isError || !report) {
        return (
            <div className="page-wrapper max-w-3xl">
                <div className="page-header"><h1 className="page-title">Daily Report</h1></div>
                <div className="card p-6 text-center text-red-500 text-sm">Failed to load this daily report.</div>
            </div>
        );
    }

    return (
        <div className="page-wrapper max-w-3xl print:max-w-none print:p-0">
            <div className="page-header print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/reports/daily-report')}
                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <Mail size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">{report.subject}</h1>
                        <p className="page-subtitle">{report.company.name} &middot; {dayjs(report.report_date).format('DD-MMM-YYYY')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-secondary flex items-center gap-2 ml-auto"
                    >
                        <Printer size={15} />
                        Print / Export PDF
                    </button>
                </div>
            </div>

            <div className="card mb-4 overflow-hidden print:shadow-none print:border-slate-300">
                <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center gap-4 px-5 py-3">
                        <span className="font-semibold text-slate-500 w-20 shrink-0">To</span>
                        <span className="text-slate-700">{report.recipient_email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-4 px-5 py-3">
                        <span className="font-semibold text-slate-500 w-20 shrink-0">Employee</span>
                        <span className="text-slate-700">{report.user.first_name} {report.user.last_name || ''}</span>
                    </div>
                    <div className="flex items-center gap-4 px-5 py-3">
                        <span className="font-semibold text-slate-500 w-20 shrink-0">Status</span>
                        <span className={clsx('px-2 py-0.5 rounded-full font-semibold text-[10px] capitalize', STATUS_BADGE[report.status] ?? 'bg-slate-100 text-slate-600')}>
                            {report.status}
                        </span>
                        {report.sent_at && <span className="text-slate-400">Sent {dayjs(report.sent_at).format('DD-MMM-YYYY HH:mm')}</span>}
                    </div>
                    {report.status === 'failed' && report.error_message && (
                        <div className="flex items-start gap-4 px-5 py-3">
                            <span className="font-semibold text-slate-500 w-20 shrink-0">Error</span>
                            <span className="text-red-600">{report.error_message}</span>
                        </div>
                    )}
                </div>
            </div>

            <div
                className="card p-0 overflow-hidden print:shadow-none print:border-slate-300"
                dangerouslySetInnerHTML={{ __html: report.email_html }}
            />
        </div>
    );
}
