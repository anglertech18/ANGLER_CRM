import React, { useState } from 'react';
import clsx from 'clsx';

const POA_STYLES: Record<string, string> = {
    'Pending': 'bg-red-50 text-red-700 ring-red-200',
    'In Progress': 'bg-orange-50 text-orange-700 ring-orange-200',
    'Completed': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const COLLECTION_STYLES: Record<string, string> = {
    'Pending': 'bg-yellow-50 text-yellow-800 ring-yellow-300',
    'Partial Paid': 'bg-orange-50 text-orange-700 ring-orange-200',
    'Fully Paid': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Stuck': 'bg-red-50 text-red-700 ring-red-200',
};

export function PoaStatusBadge({ status }: { status: string | null | undefined }) {
    const s = status || 'Pending';
    return (
        <span className={clsx('inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1', POA_STYLES[s] || POA_STYLES['Pending'])}>
            {s}
        </span>
    );
}

export function CollectionStatusBadge({ status }: { status: string | null | undefined }) {
    const s = status || 'Pending';
    return (
        <span className={clsx('inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1', COLLECTION_STYLES[s] || COLLECTION_STYLES['Pending'])}>
            {s}
        </span>
    );
}

// Click-to-edit badge: shows the status badge by default; clicking it swaps in
// a dropdown, and selecting a new value auto-saves (via onSave) before
// collapsing back to the badge. Used by the Cashflow Tracker so POA Status /
// Collection Status no longer show a dropdown + badge simultaneously (CR11).
export function EditableStatusBadge({
    status, options, variant, disabled, onSave,
}: {
    status: string | null | undefined;
    options: string[];
    variant: 'poa' | 'collection';
    disabled?: boolean;
    onSave: (newValue: string) => Promise<void>;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const Badge = variant === 'poa' ? PoaStatusBadge : CollectionStatusBadge;

    if (disabled) return <Badge status={status} />;

    if (!isEditing) {
        return (
            <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="cursor-pointer hover:ring-2 hover:ring-blue-200 rounded-full transition-shadow"
                title="Click to change"
            >
                <Badge status={status} />
            </button>
        );
    }

    return (
        <select
            autoFocus
            value={status || 'Pending'}
            disabled={saving}
            onBlur={() => setIsEditing(false)}
            onChange={async e => {
                const newValue = e.target.value;
                setSaving(true);
                try {
                    await onSave(newValue);
                    setIsEditing(false);
                } catch {
                    // Error already surfaced by the caller's mutation (toast); keep the
                    // dropdown open so the user can retry or pick a different value.
                } finally {
                    setSaving(false);
                }
            }}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer bg-white disabled:opacity-50"
        >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}
