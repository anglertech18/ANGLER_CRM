import dayjs from 'dayjs';
import clsx from 'clsx';

interface Props {
  expiryDate: string | Date | null | undefined;
  showLabel?: boolean;
}

export function DaysRemainingBadge({ expiryDate, showLabel = true }: Props) {
  if (!expiryDate) return <span className="text-slate-400 text-xs">—</span>;

  const days = dayjs(expiryDate).diff(dayjs().startOf('day'), 'day');

  let cls = '';
  let label = '';
  let pulse = false;

  if (days < 0) {
    cls = 'bg-red-50 text-red-700 ring-red-200';
    label = showLabel ? `${Math.abs(days)}d overdue` : `−${Math.abs(days)}d`;
    pulse = true;
  } else if (days === 0) {
    cls = 'bg-red-50 text-red-700 ring-red-200';
    label = showLabel ? 'Expires today' : '0d';
    pulse = true;
  } else if (days <= 7) {
    cls = 'bg-red-50 text-red-600 ring-red-200';
    label = showLabel ? `${days}d left` : `${days}d`;
    pulse = true;
  } else if (days <= 14) {
    cls = 'bg-orange-50 text-orange-700 ring-orange-200';
    label = showLabel ? `${days}d left` : `${days}d`;
  } else if (days <= 30) {
    cls = 'bg-amber-50 text-amber-700 ring-amber-200';
    label = showLabel ? `${days}d left` : `${days}d`;
  } else {
    cls = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    label = showLabel ? `${days}d left` : `${days}d`;
  }

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 whitespace-nowrap',
      cls
    )}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
      )}
      {label}
    </span>
  );
}
