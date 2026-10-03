import React from 'react';
import clsx from 'clsx';

export function AgingBadge({ days, pendingAmount }: { days: number | null; pendingAmount: number | null }) {
    if (Number(pendingAmount) <= 0) {
        return (
            <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 text-blue-700 bg-blue-50 ring-blue-200">
                Collected
            </span>
        );
    }
    if (days === null || days === undefined) return <span className="text-slate-300">—</span>;
    const cls =
        days <= 7 ? 'text-emerald-700 bg-emerald-50 ring-emerald-200'
            : days <= 15 ? 'text-orange-700 bg-orange-50 ring-orange-200'
                : 'text-red-700 bg-red-50 ring-red-200';
    return <span className={clsx('inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1', cls)}>{days}d</span>;
}
