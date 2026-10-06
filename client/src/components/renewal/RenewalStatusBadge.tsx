import clsx from 'clsx';

const SERVICE_STATUS: Record<string, string> = {
  DRAFT:            'bg-slate-100 text-slate-600 ring-slate-300',
  ACTIVE:           'bg-blue-50 text-blue-700 ring-blue-200',
  DUE_SOON:         'bg-amber-50 text-amber-700 ring-amber-200',
  FOLLOW_UP:        'bg-orange-50 text-orange-700 ring-orange-200',
  QUOTE_SENT:       'bg-violet-50 text-violet-700 ring-violet-200',
  PAYMENT_PENDING:  'bg-yellow-50 text-yellow-700 ring-yellow-200',
  RENEWED:          'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PARTIALLY_RENEWED:'bg-teal-50 text-teal-700 ring-teal-200',
  EXPIRED:          'bg-red-50 text-red-700 ring-red-200',
  NOT_RENEWING:     'bg-slate-100 text-slate-500 ring-slate-300',
  CANCELLED:        'bg-slate-100 text-slate-400 ring-slate-200',
  DEACTIVATED:      'bg-red-50 text-red-400 ring-red-100',
};

const REMINDER_STATUS: Record<string, string> = {
  PENDING:     'bg-slate-100 text-slate-600 ring-slate-200',
  DUE:         'bg-amber-50 text-amber-700 ring-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETED:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SKIPPED:     'bg-slate-100 text-slate-400 ring-slate-200',
  CANCELLED:   'bg-slate-50 text-slate-400 ring-slate-100',
  FAILED:      'bg-red-50 text-red-600 ring-red-200',
};

const LABELS: Record<string, string> = {
  DRAFT: 'Draft', ACTIVE: 'Active', DUE_SOON: 'Due Soon',
  FOLLOW_UP: 'Follow Up', QUOTE_SENT: 'Quote Sent',
  PAYMENT_PENDING: 'Payment Pending', RENEWED: 'Renewed',
  PARTIALLY_RENEWED: 'Partially Renewed', EXPIRED: 'Expired',
  NOT_RENEWING: 'Not Renewing', CANCELLED: 'Cancelled',
  DEACTIVATED: 'Deactivated', PENDING: 'Pending', DUE: 'Due',
  IN_PROGRESS: 'In Progress', COMPLETED: 'Completed',
  SKIPPED: 'Skipped', FAILED: 'Failed',
};

interface Props {
  status: string | null | undefined;
  variant?: 'service' | 'reminder';
  size?: 'sm' | 'md';
}

export function RenewalStatusBadge({ status, variant = 'service', size = 'sm' }: Props) {
  const s = status ?? 'ACTIVE';
  const map = variant === 'reminder' ? REMINDER_STATUS : SERVICE_STATUS;
  const cls = map[s] ?? SERVICE_STATUS.ACTIVE;
  return (
    <span className={clsx(
      'inline-flex items-center font-semibold rounded-full ring-1 whitespace-nowrap',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      cls
    )}>
      {LABELS[s] ?? s}
    </span>
  );
}
