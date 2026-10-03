import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, User, Building2, CalendarDays, CheckCircle2, Clock, XCircle, AlertTriangle, FileWarning } from 'lucide-react';
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

const STATUS_META: Record<string, { badge: string; icon: typeof CheckCircle2; label: string }> = {
    sent: { badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Sent' },
    generated: { badge: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Generated' },
    failed: { badge: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
};

function InfoTile({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                <Icon size={14} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <div className="text-sm font-medium text-slate-800 truncate">{children}</div>
            </div>
        </div>
    );
}

export default function DailyReportPreview() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: report, isLoading, isError } = useQuery<ReportDetail>({
        queryKey: ['daily-report', id],
        queryFn: () => api.get(`/daily-report/${id}`).then(r => r.data),
    });

    const goBack = () => navigate('/reports/daily-report');

    if (isLoading) {
        return (
            <div className="page-wrapper">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="skeleton w-9 h-9 rounded-xl" />
                        <div className="skeleton w-9 h-9 rounded-xl" />
                        <div className="space-y-2">
                            <div className="skeleton h-4 w-56 rounded" />
                            <div className="skeleton h-3 w-32 rounded" />
                        </div>
                    </div>
                </div>
                <div className="card p-5 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
                    </div>
                </div>
                <div className="card p-6 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-8 rounded-lg" />)}
                </div>
            </div>
        );
    }

    if (isError || !report) {
        return (
            <div className="page-wrapper">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={goBack}
                            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <h1 className="page-title">Daily Report</h1>
                    </div>
                </div>
                <div className="card p-10 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                        <FileWarning size={20} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Couldn't load this report</p>
                        <p className="text-xs text-slate-400 mt-1">It may have been removed, or you may not have access to it.</p>
                    </div>
                    <button type="button" onClick={goBack} className="btn-secondary mt-2">
                        <ArrowLeft size={14} />
                        Back to Daily Reports
                    </button>
                </div>
            </div>
        );
    }

    const statusMeta = STATUS_META[report.status] ?? { badge: 'bg-slate-100 text-slate-600', icon: Clock, label: report.status };
    const StatusIcon = statusMeta.icon;
    const employeeName = `${report.user.first_name} ${report.user.last_name || ''}`.trim();

    return (
        <div className="page-wrapper print:max-w-none print:p-0">
            {/* The email body is sized to an A4 portrait content width (~720px);
                pin the print page to A4 and keep backgrounds so the exported PDF
                matches the on-screen report one-to-one. */}
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                /* SWAT Performance has 11 metric columns fixed to a narrow,
                   Outlook-safe width in the actual emailed HTML (dailyReportService.ts),
                   which reads cramped in a browser that has room to spare. On
                   screen only (never on print/export, which should keep matching
                   the real sent email) let that one table's columns size to their
                   content instead of the mailed fixed widths. */
                @media screen {
                    .daily-report-email [data-report-table="swat"] table {
                        table-layout: auto !important;
                        width: auto !important;
                        min-width: 100%;
                    }
                    .daily-report-email [data-report-table="swat"] th,
                    .daily-report-email [data-report-table="swat"] td {
                        width: auto !important;
                        white-space: nowrap;
                        word-wrap: normal !important;
                        overflow-wrap: normal !important;
                    }
                }
            `}</style>
            <div className="max-w-4xl print:max-w-none">
                <div className="page-header print:hidden">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={goBack}
                            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                            <Mail size={16} className="text-primary-600" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="page-title truncate">{report.subject}</h1>
                            <p className="page-subtitle truncate">{report.company.name} &middot; {dayjs(report.report_date).format('DD-MMM-YYYY')}</p>
                        </div>
                        <span className={clsx('hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[11px] shrink-0', statusMeta.badge)}>
                            <StatusIcon size={11} />
                            {statusMeta.label}
                        </span>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="btn-secondary flex items-center gap-2 ml-auto shrink-0"
                        >
                            <Printer size={15} />
                            <span className="hidden sm:inline">Print / Export PDF</span>
                        </button>
                    </div>
                </div>

                <div className="card mb-4 p-5 print:shadow-none print:border-slate-300">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <InfoTile icon={Mail} label="Recipient">{report.recipient_email || '—'}</InfoTile>
                        <InfoTile icon={User} label="Employee">{employeeName || '—'}</InfoTile>
                        <InfoTile icon={Building2} label="Company">{report.company.name}</InfoTile>
                        <InfoTile icon={StatusIcon} label="Status">
                            <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold', statusMeta.badge)}>
                                {statusMeta.label}
                            </span>
                        </InfoTile>
                        <InfoTile icon={CalendarDays} label={report.sent_at ? 'Sent At' : 'Report Date'}>
                            {report.sent_at ? dayjs(report.sent_at).format('DD-MMM-YYYY, HH:mm') : dayjs(report.report_date).format('DD-MMM-YYYY')}
                        </InfoTile>
                    </div>

                    {report.status === 'failed' && report.error_message && (
                        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-red-700">Delivery failed</p>
                                <p className="text-xs text-red-600 mt-0.5">{report.error_message}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-2.5 px-1 print:hidden">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email Preview</p>
                    <span className="h-px flex-1 bg-slate-100" />
                </div>
            </div>

            {/* Unlike the header/meta info above, this card isn't width-capped —
                the mailed HTML is a fixed ~720px layout, but its SWAT Performance
                table is widened on screen (see the style block above) to show
                all 11 metric columns without a nested scrollbar, so this needs
                room to grow with it instead of clipping at a narrow max-width. */}
            <div className="card p-4 sm:p-6 bg-slate-50/60 print:shadow-none print:border-slate-300 print:bg-white print:p-0">
                <div
                    className="daily-report-email mx-auto bg-white rounded-lg shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0 print:mx-0"
                    dangerouslySetInnerHTML={{ __html: report.email_html }}
                />
            </div>
        </div>
    );
}
