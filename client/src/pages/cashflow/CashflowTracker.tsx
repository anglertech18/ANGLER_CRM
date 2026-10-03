import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    UserCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ArrowUpDown, RefreshCw, Save,
    TrendingUp, Wallet, Building2, Package,
    IndianRupee, X, History,
    Scale, ClipboardList, Plus, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { AgingBadge } from '../../components/AgingBadge';
import { EditableStatusBadge } from '../../components/StatusBadge';
import MultiSelect from '../../components/MultiSelect';
import { SearchableSelect } from '../../components/FilterDropdown';
import { EdcStatusSelect, PeriodSelect, QuarterSelect, DateRangeFields, normalizeEdcStatus, EntityFilter, ActivePill } from '../../components/CashflowFilterFields';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.99:5000/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const POA_STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];
const COLLECTION_STATUS_OPTIONS = ['Pending', 'Partial Paid', 'Fully Paid', 'Stuck'];
const POA_STATUS_MULTI_OPTIONS = POA_STATUS_OPTIONS.map(s => ({ value: s, label: s }));
const COLLECTION_STATUS_MULTI_OPTIONS = COLLECTION_STATUS_OPTIONS.map(s => ({ value: s, label: s }));

export function StatCard({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: any; tone: string }) {
    const tones: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
        emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50',
        amber: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50',
        violet: 'from-violet-500 to-violet-600 text-violet-600 bg-violet-50',
        rose: 'from-rose-500 to-rose-600 text-rose-600 bg-rose-50',
    };
    const [grad, text, bg] = tones[tone].split(' ');
    return (
        <div className="bg-white rounded-lg border border-slate-200/70 shadow-sm px-2.5 py-1.5 flex items-center gap-2 transition-all hover:shadow-md">
            <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm', grad)}>
                <Icon size={14} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">{label}</p>
                <p className={clsx('text-base font-bold leading-tight truncate', text.replace('bg-', 'text-'))}>{value}</p>
                {sub && <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>}
            </div>
            <div className={clsx('ml-auto hidden xl:block w-1.5 h-6 rounded-full', bg)} />
        </div>
    );
}

function SortTh({
    label, sortKey, align = 'left', style, className, sortConfig, onSort,
}: {
    label: string; sortKey: string; align?: 'left' | 'right' | 'center';
    style?: React.CSSProperties; className?: string;
    sortConfig: { key: string; dir: 'asc' | 'desc' } | null; onSort: (key: string) => void;
}) {
    const active = sortConfig?.key === sortKey;
    return (
        <th
            className={clsx(
                'px-3 py-3.5 cursor-pointer select-none hover:bg-blue-900/40 transition-colors',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                className
            )}
            style={style}
            onClick={() => onSort(sortKey)}
        >
            <span className={clsx('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse', align === 'center' && 'justify-center')}>
                {label}
                {active ? (
                    sortConfig!.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                )}
            </span>
        </th>
    );
}

function Skeleton() {
    return (
        <div className="animate-pulse flex gap-4">
            <div className="w-72 shrink-0 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-slate-100" />)}
            </div>
            <div className="flex-1 space-y-4">
                <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100" />)}</div>
                <div className="h-72 bg-white rounded-2xl border border-slate-100" />
            </div>
        </div>
    );
}

// Every column's width, in render order. A frozen column's `left` offset is the sum of
// the widths before it, so these must be the widths the browser actually uses — hence
// the <colgroup> + table-fixed + explicit table width below. Under table-layout:auto the
// browser resizes columns to fit content, the offsets stop matching, and the frozen
// cells overlap the ones beside them.
const COL_WIDTHS = [
    180, // Company        (frozen)
    160, // Project        (frozen)
    190, // Milestone      (frozen)
    55,  // %              (frozen)
    115, // Expected       (frozen)
    130, // Collected
    110, // Pending
    120, // EDC & Aging
    120, // Revised EDC
    170, // Cash Flow POA
    140, // POA EDC & Status
    140, // Collection Status
];
const TABLE_WIDTH = COL_WIDTHS.reduce((s, w) => s + w, 0);

// Frozen columns, left to right. Offsets derive from COL_WIDTHS so the two can't drift.
const frozenAt = (i: number) => ({ width: COL_WIDTHS[i], left: COL_WIDTHS.slice(0, i).reduce((s, w) => s + w, 0) });
const FROZEN = {
    company: frozenAt(0),
    project: frozenAt(1),
    milestone: frozenAt(2),
    percent: frozenAt(3),
    expected: frozenAt(4),
};

// Mirrors the server-side validation in updateMilestone so users get instant
// feedback before the round trip; the server re-validates independently since
// this check is a convenience, not the security boundary.

// The two date fields that save from their own cell. Pending edits and per-cell errors
// are keyed by milestone id + field so the two never overwrite each other's state.
type EditableDateField = 'revised_edc' | 'bant_poa_edc';
const cellKey = (mid: number, field: EditableDateField) => `${mid}:${field}`;

// Save / discard pair shown under a date cell once its value has been changed.
function CellSaveControls({
    saving, error, onSave, onCancel,
}: { saving: boolean; error?: string; onSave: () => void; onCancel: () => void }) {
    return (
        <>
            <div className="flex items-center justify-center gap-1">
                <button
                    onClick={onSave}
                    disabled={saving}
                    title="Save"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2 py-1 rounded-md transition-colors"
                >
                    <Save size={10} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={saving}
                    title="Discard change"
                    className="inline-flex items-center text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 p-1 rounded-md transition-colors"
                >
                    <X size={10} />
                </button>
            </div>
            {error && <p className="text-[10px] text-red-600 mt-1 leading-tight">{error}</p>}
        </>
    );
}

function validateMilestonePatch(m: any, patch: any): string | null {
    if (patch.revised_edc) {
        const d = dayjs(patch.revised_edc).startOf('day');
        if (d.isBefore(dayjs().startOf('day'))) return "Revised EDC cannot be earlier than today's date.";
    }
    // The row's POA EDC cell can be cleared on a milestone that still holds POA notes;
    // notes and date travel together, so that is rejected here rather than by the API.
    if (patch.bant_poa_edc !== undefined && !patch.bant_poa_edc) {
        const notes = patch.bant_poa ?? m.bant_poa ?? '';
        if (String(notes).trim()) return 'POA EDC is required once POA notes are entered.';
    }
    if (patch.actual_amount != null && patch.actual_amount !== '') {
        const expected = Number(m.expected_amount || 0);
        const alreadyReceived = Number(m.already_received ?? 0);
        const pending = expected - alreadyReceived;
        const periodExpected = Number(m.period_expected ?? expected);
        const newAmt = parseFloat(patch.actual_amount);
        if (isNaN(newAmt) || newAmt <= 0) return 'Enter a valid collection amount.';
        if (newAmt > periodExpected + 0.01) return `Collection Amount cannot exceed Expected (${fmt(periodExpected)}).`;
        if (newAmt > pending + 0.01) return `Collection Amount cannot exceed Pending Amount (${fmt(pending)}).`;
        if (alreadyReceived + newAmt > expected + 0.01) return `Total Collected cannot exceed Expected Amount (${fmt(expected)}).`;
    }
    return null;
}

export default function CashflowTrackerPage() {
    const { user: authUser } = useAuth();
    const queryClient = useQueryClient();

    const { filters, setFilters } = usePersistentFilters('cashflow-tracker', {
        sel_id: '', bde_id: '', client_company_id: '', edc_status: 'all', quick_filter: '', month: '',
        quarter: '', from_date: '', to_date: '',
        collection_status: '', poa_status: '', not_overdue: '',
    });

    const [selectedProductId, setSelectedProductIdState] = useState<number | null>(
        filters.sel_id ? Number(filters.sel_id) || null : null
    );
    const [selectedBdeId, setSelectedBdeIdState] = useState<number | null>(
        filters.bde_id ? Number(filters.bde_id) : null
    );
    const [selectionKey, setSelectionKey] = useState(filters.sel_id || '');
    const [clientCompanyId, setClientCompanyIdState] = useState(filters.client_company_id || '');
    const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [editingRows, setEditingRows] = useState<Record<number, any>>({});
    // Keyed by cellKey(mid, field) — each frozen date cell reports its own error.
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
    const [savingCell, setSavingCell] = useState<string | null>(null);
    const [bantPoaModal, setBantPoaModal] = useState<{ mid: number; leadId: number; value: string; status: string; edc: string; mode: 'edit' | 'new' } | null>(null);
    const [poaModalTab, setPoaModalTab] = useState<'edit' | 'history'>('edit');
    const [paymentHistoryModal, setPaymentHistoryModal] = useState<{ mid: number; leadId: number } | null>(null);
    const [collectionModal, setCollectionModal] = useState<{ mid: number; leadId: number; company: string; project: string | null; product: string | null; milestone: string; expectedAmount: number; pendingAmount: number } | null>(null);
    const [collectionModalTab, setCollectionModalTab] = useState<'add' | 'history'>('add');
    const [collectionAmount, setCollectionAmount] = useState('');
    const [collectionDate, setCollectionDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [collectionRemarks, setCollectionRemarks] = useState('');
    const [collectionError, setCollectionError] = useState('');
    const bdeDefaultApplied = useRef<number | null>(null);

    const setSelectedBdeId = (v: number | null) => {
        setSelectedBdeIdState(v);
        setFilters({ bde_id: v !== null ? String(v) : '' });
    };

    const setClientCompanyId = (v: string) => { setClientCompanyIdState(v); setFilters({ client_company_id: v }); };
    const setEdcStatus = (v: string) => setFilters({ edc_status: v });
    const setPeriodFilter = (v: string) => setFilters({ quick_filter: v, month: '' });
    const setQuarterFilter = (v: string) => setFilters({ quarter: v });
    const setFromDate = (v: string) => setFilters({ from_date: v });
    const setToDate = (v: string) => setFilters({ to_date: v });
    const setCollectionStatusFilter = (v: string) => setFilters({ collection_status: v });
    const setPoaStatusFilter = (v: string) => setFilters({ poa_status: v });
    const resetDateFilters = () => setFilters({
        edc_status: 'all', quick_filter: '', month: '', quarter: '', from_date: '', to_date: '',
        collection_status: '', poa_status: '', not_overdue: '',
    });

    // Drives both the "N active" badge and the disabled state of Clear Filters, so the
    // button never looks clickable when there is nothing left to clear. A date range
    // counts once — the two endpoints are one filter to the user.
    const activeFilterCount = [
        !!selectionKey,
        selectedBdeId !== null,
        !!clientCompanyId,
        normalizeEdcStatus(filters.edc_status) !== 'all',
        !!filters.quick_filter,
        !!filters.quarter,
        !!filters.from_date || !!filters.to_date,
        !!filters.collection_status,
        !!filters.poa_status,
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        handleProductChange('');
        setSelectedBdeId(null);
        setClientCompanyId('');
        resetDateFilters();
    };

    const handleProductChange = (val: string) => {
        if (!val) {
            setSelectedProductIdState(null);
            setSelectionKey('');
            setFilters({ sel_id: '' });
            return;
        }
        setSelectedProductIdState(Number(val));
        setSelectionKey(val);
        setFilters({ sel_id: val });
    };

    // Mapped products
    const { data: mappedItems = [] } = useQuery({
        queryKey: ['cf-tracker-mapped-products', authUser?.id],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/seal/poas/mapped-products`, { headers: authHeaders() });
            return res.data as { id: number | string; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // BDEs — scoped to the selected product when one is chosen, otherwise all active BDEs in scope
    const { data: bdes = [] } = useQuery({
        queryKey: ['cf-tracker-bdes', selectedProductId],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/lead-gen/bdes`, {
                headers: authHeaders(),
                params: selectedProductId ? { product_id: selectedProductId } : {},
            });
            return res.data;
        },
    });

    // Auto-select logged-in user
    useEffect(() => {
        if (bdes.length === 0 || !authUser?.id) return;
        if (bdeDefaultApplied.current === selectedProductId) return;
        bdeDefaultApplied.current = selectedProductId;
        if (selectedBdeId !== null) return;
        const match = (bdes as any[]).find((b: any) => b.id === authUser.id);
        if (match) setSelectedBdeId(match.id);
    }, [bdes.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Client Company filter (clientcomFilter.md) — only client companies with at
    // least one Order Won milestone matching the current Product/BDE selection,
    // refreshed dynamically as those filters change.
    const { data: clientCompanies = [] } = useQuery({
        queryKey: ['cf-tracker-client-companies', selectedProductId, selectedBdeId],
        queryFn: async () => {
            const params: any = {};
            if (selectedProductId) params.product_id = selectedProductId;
            if (selectedBdeId) params.bde_id = selectedBdeId;
            const res = await axios.get(`${API_BASE}/leads/order-won/milestones/client-companies`, {
                headers: authHeaders(),
                params,
            });
            return res.data as { id: number; name: string }[];
        },
    });

    // Order Won Leads with milestones
    const { data: trackerData, isLoading, error, refetch } = useQuery({
        queryKey: ['cf-tracker-leads', selectedProductId, selectedBdeId, clientCompanyId, filters.edc_status, filters.quick_filter, filters.month, filters.quarter, filters.from_date, filters.to_date, filters.collection_status, filters.poa_status, filters.not_overdue],
        queryFn: async () => {
            const params: any = {};
            if (selectedProductId) params.product_id = selectedProductId;
            if (selectedBdeId) params.bde_id = selectedBdeId;
            if (clientCompanyId) params.client_company_id = clientCompanyId;
            const edcStatus = normalizeEdcStatus(filters.edc_status);
            if (edcStatus !== 'all') params.edc_status = edcStatus;
            if (filters.quick_filter) params.quick_filter = filters.quick_filter;
            else if (filters.month) params.month = filters.month;
            if (filters.quarter) params.quarter = filters.quarter;
            if (filters.from_date) params.from_date = filters.from_date;
            if (filters.to_date) params.to_date = filters.to_date;
            if (filters.collection_status) params.collection_status = filters.collection_status;
            if (filters.poa_status) params.poa_status = filters.poa_status;
            if (filters.not_overdue) params.not_overdue = '1';
            const res = await axios.get(`${API_BASE}/leads/order-won/milestones`, {
                headers: authHeaders(),
                params,
            });
            return res.data as { summary: { total_expected: number; total_collected: number; balance_amount: number; stuck_amount: number }; leads: any[] };
        },
    });

    const leads: any[] = trackerData?.leads || [];
    const summary = trackerData?.summary || { total_expected: 0, total_collected: 0, balance_amount: 0, stuck_amount: 0 };

    // Payment collection history for the milestone shown in the history popup
    const { data: paymentHistory = [], isLoading: paymentHistoryLoading } = useQuery({
        queryKey: ['milestone-payment-history', paymentHistoryModal?.mid],
        enabled: !!paymentHistoryModal,
        queryFn: async () => {
            const res = await axios.get(
                `${API_BASE}/leads/${paymentHistoryModal!.leadId}/milestones/${paymentHistoryModal!.mid}/payment-history`,
                { headers: authHeaders() }
            );
            return res.data.data as any[];
        },
    });

    // Payment collection history for the History tab inside the Add Collection popup
    const { data: collectionHistory = [], isLoading: collectionHistoryLoading } = useQuery({
        queryKey: ['milestone-payment-history', collectionModal?.mid],
        enabled: !!collectionModal && collectionModalTab === 'history',
        queryFn: async () => {
            const res = await axios.get(
                `${API_BASE}/leads/${collectionModal!.leadId}/milestones/${collectionModal!.mid}/payment-history`,
                { headers: authHeaders() }
            );
            return res.data.data as any[];
        },
    });

    // BANT POA update history for the milestone shown in the BANT POA popup
    const { data: bantPoaHistory = [], isLoading: bantPoaHistoryLoading } = useQuery({
        queryKey: ['milestone-bant-poa-history', bantPoaModal?.mid],
        enabled: !!bantPoaModal,
        queryFn: async () => {
            const res = await axios.get(
                `${API_BASE}/leads/${bantPoaModal!.leadId}/milestones/${bantPoaModal!.mid}/bant-poa-history`,
                { headers: authHeaders() }
            );
            return res.data.data as any[];
        },
    });

    // One row per milestone, company shown as a normal column (UI_changes_3).
    const flatRows = useMemo(() => {
        const out: any[] = [];
        for (const lead of leads) {
            for (const m of lead.milestones || []) {
                const expectedNum = Number(m.expected_amount || 0);
                const alreadyReceived = Number(m.already_received ?? m.actual_amount ?? 0);
                out.push({
                    m,
                    lead,
                    expectedNum,
                    alreadyReceived,
                    periodExpected: Number(m.period_expected ?? expectedNum),
                    periodCollected: Number(m.period_collected ?? alreadyReceived),
                    periodPending: Number(m.period_pending ?? (expectedNum - alreadyReceived)),
                    isFullyCollected: !!m.is_fully_collected,
                });
            }
        }
        return out;
    }, [leads]);

    const dateVal = (d: any) => (d ? new Date(d).getTime() : null);
    const SORT_ACCESSORS: Record<string, (r: any) => any> = {
        company: r => (r.lead.company_name || '').toLowerCase(),
        project: r => (r.lead.project_name || '').toLowerCase(),
        milestone: r => (r.m.payment_type?.name || '').toLowerCase(),
        period_expected: r => r.periodExpected,
        period_collected: r => r.periodCollected,
        period_pending: r => r.periodPending,
        edc: r => dateVal(r.m.edc),
        aging: r => (r.m.aging ?? null),
        revised_edc: r => dateVal(r.m.revised_edc),
        collection_status: r => (r.m.collection_status || '').toLowerCase(),
    };

    const sortedRows = useMemo(() => {
        if (!sortConfig) return flatRows;
        const accessor = SORT_ACCESSORS[sortConfig.key];
        if (!accessor) return flatRows;
        const dir = sortConfig.dir === 'asc' ? 1 : -1;
        return [...flatRows].sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
            if (bv === null || bv === undefined) return -1;
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [flatRows, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const pagedRows = useMemo(
        () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
        [sortedRows, page, pageSize]
    );

    useEffect(() => { setPage(1); }, [pageSize, clientCompanyId, sortConfig, selectedProductId, selectedBdeId, filters.edc_status, filters.quick_filter, filters.month, filters.quarter, filters.from_date, filters.to_date, filters.collection_status, filters.poa_status, filters.not_overdue]);

    const handleSort = (key: string) => {
        setSortConfig(prev => (prev && prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    };

    // Milestone id → lead id, so edits/modals know which lead to hit.
    const midToLeadId = useMemo(() => {
        const map = new Map<number, number>();
        for (const r of flatRows) map.set(r.m.id, r.lead.id);
        return map;
    }, [flatRows]);

    // Milestone id → milestone object, so the save handler can validate against the
    // right row's current expected/received amounts.
    const midToMilestone = useMemo(() => {
        const map = new Map<number, any>();
        for (const r of flatRows) map.set(r.m.id, r.m);
        return map;
    }, [flatRows]);

    const handleEditChange = (mid: number, field: string, value: string) => {
        setEditingRows(prev => ({ ...prev, [mid]: { ...(prev[mid] || {}), [field]: value } }));
    };

    // Revised EDC and POA EDC each save themselves from their own cell, which is what
    // let the shared Actions column go. Only the edited field is sent — an untouched
    // field is left out of the payload entirely, so the API keeps its stored value.
    const fieldSaveMutation = useMutation({
        mutationFn: async ({ mid, field, value }: { mid: number; field: EditableDateField; value: string }) => {
            const leadId = midToLeadId.get(mid);
            const res = await axios.put(
                `${API_BASE}/leads/${leadId}/milestones/${mid}`,
                { [field]: value || null },
                { headers: authHeaders() }
            );
            return res.data as { success: boolean; message: string; data: any };
        },
        onMutate: ({ mid, field }) => {
            setSavingCell(cellKey(mid, field));
            setRowErrors(prev => ({ ...prev, [cellKey(mid, field)]: '' }));
        },
        onSuccess: (resp, { mid, field }) => {
            toast.success(resp.message || 'Milestone saved successfully');
            clearEditedField(mid, field);
            queryClient.invalidateQueries({ queryKey: ['cf-tracker-leads'] });
        },
        onError: (err: any, { mid, field }) => {
            const msg = err?.response?.data?.message || 'Failed to save milestone. Please try again.';
            setRowErrors(prev => ({ ...prev, [cellKey(mid, field)]: msg }));
            toast.error(msg);
        },
        onSettled: () => setSavingCell(null),
    });

    // Drops one field from a row's pending edits, and the row itself once nothing is
    // left pending — `editingRows` having no entry is what marks a row as clean.
    const clearEditedField = (mid: number, field: EditableDateField) => {
        setEditingRows(prev => {
            const row = prev[mid];
            if (!row) return prev;
            const nextRow = { ...row };
            delete nextRow[field];
            const next = { ...prev };
            if (Object.keys(nextRow).length === 0) delete next[mid];
            else next[mid] = nextRow;
            return next;
        });
    };

    const handleSaveField = (mid: number, field: EditableDateField) => {
        const patch = editingRows[mid];
        const m = midToMilestone.get(mid);
        if (!patch || !m || patch[field] === undefined) return;
        const errMsg = validateMilestonePatch(m, { [field]: patch[field] });
        if (errMsg) {
            setRowErrors(prev => ({ ...prev, [cellKey(mid, field)]: errMsg }));
            toast.error(errMsg);
            return;
        }
        fieldSaveMutation.mutate({ mid, field, value: patch[field] });
    };

    const handleCancelField = (mid: number, field: EditableDateField) => {
        clearEditedField(mid, field);
        setRowErrors(prev => ({ ...prev, [cellKey(mid, field)]: '' }));
    };

    // Click-to-edit status badges (POA Status / Collection Status) auto-save on
    // change via their own PUT call, independent of the batched row Save button
    // used for amount/revised EDC/BANT POA notes.
    const statusMutation = useMutation({
        mutationFn: async ({ mid, field, value }: { mid: number; field: 'poa_status' | 'collection_status' | 'bant_poa'; value: string }) => {
            const leadId = midToLeadId.get(mid);
            const res = await axios.put(`${API_BASE}/leads/${leadId}/milestones/${mid}`, { [field]: value }, { headers: authHeaders() });
            return res.data as { success: boolean; message: string; data: any };
        },
        onSuccess: (resp, { mid, field }) => {
            toast.success(resp.message || 'Status updated');
            queryClient.invalidateQueries({ queryKey: ['cf-tracker-leads'] });
            if (field === 'bant_poa') {
                queryClient.invalidateQueries({ queryKey: ['milestone-bant-poa-history', mid] });
            }
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'Failed to update status. Please try again.';
            toast.error(msg);
        },
    });

    // Saves POA Notes, POA Status and POA EDC together from the Add/Edit POA
    // popup, same pattern as the Add Collection popup bundling its fields into
    // one PUT rather than saving each field separately.
    const bantPoaSaveMutation = useMutation({
        mutationFn: async () => {
            const res = await axios.put(
                `${API_BASE}/leads/${bantPoaModal!.leadId}/milestones/${bantPoaModal!.mid}`,
                { bant_poa: bantPoaModal!.value, poa_status: bantPoaModal!.status, bant_poa_edc: bantPoaModal!.edc || null },
                { headers: authHeaders() }
            );
            return res.data as { success: boolean; message: string; data: any };
        },
        onSuccess: (resp) => {
            toast.success(resp.message || 'POA saved successfully');
            queryClient.invalidateQueries({ queryKey: ['cf-tracker-leads'] });
            queryClient.invalidateQueries({ queryKey: ['milestone-bant-poa-history', bantPoaModal?.mid] });
            setBantPoaModal(null);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to save POA. Please try again.');
        },
    });

    // POA notes and POA EDC travel together: the date becomes mandatory as soon as notes
    // exist, so a POA is never saved without the date it is promised for. Mirrored by the
    // same rule in updateMilestone, which is what actually enforces it.
    const poaEdcRequired = !!bantPoaModal?.value.trim();
    const poaEdcMissing = poaEdcRequired && !bantPoaModal?.edc;

    // Live check in the Add Collection popup: the entered amount cannot exceed what is
    // still pending on the milestone. Flagged while typing, not only on submit.
    const collectionAmountNum = parseFloat(collectionAmount);
    const collectionExceedsPending = !!collectionModal
        && !isNaN(collectionAmountNum)
        && collectionAmountNum > collectionModal.pendingAmount + 0.01;

    const openCollectionModal = (mid: number, leadId: number, company: string, project: string | null, product: string | null, milestone: string, expectedAmount: number, pendingAmount: number) => {
        setCollectionModal({ mid, leadId, company, project, product, milestone, expectedAmount, pendingAmount });
        setCollectionModalTab('add');
        setCollectionAmount('');
        setCollectionDate(dayjs().format('YYYY-MM-DD'));
        setCollectionRemarks('');
        setCollectionError('');
    };

    const collectionMutation = useMutation({
        mutationFn: async () => {
            const res = await axios.put(
                `${API_BASE}/leads/${collectionModal!.leadId}/milestones/${collectionModal!.mid}`,
                { actual_amount: collectionAmount, collection_date: collectionDate, remarks: collectionRemarks },
                { headers: authHeaders() }
            );
            return res.data as { success: boolean; message: string; data: any };
        },
        onSuccess: (resp) => {
            toast.success(resp.message || 'Collection saved successfully');
            queryClient.invalidateQueries({ queryKey: ['cf-tracker-leads'] });
            queryClient.invalidateQueries({ queryKey: ['milestone-payment-history', collectionModal?.mid] });
            setCollectionModal(null);
        },
        onError: (err: any) => {
            setCollectionError(err?.response?.data?.message || 'Failed to save collection. Please try again.');
        },
    });

    // Every rejected save both fills the in-popup alert and raises a toast — a blocked
    // save used to leave only a thin line of red text at the bottom of the form, which
    // read as "the button did nothing".
    const failCollection = (msg: string) => {
        setCollectionError(msg);
        toast.error(msg);
    };

    const handleSaveCollection = () => {
        if (!collectionModal) return;
        const amt = parseFloat(collectionAmount);
        if (!collectionAmount || isNaN(amt) || amt <= 0) {
            failCollection('Enter a valid collection amount.');
            return;
        }
        if (amt > collectionModal.pendingAmount + 0.01) {
            failCollection(
                `Collected Amount ${fmt(amt)} cannot exceed the Pending Amount ${fmt(collectionModal.pendingAmount)}.`
            );
            return;
        }
        if (!collectionDate) {
            failCollection('Collection Date is required.');
            return;
        }
        if (dayjs(collectionDate).startOf('day').isAfter(dayjs().startOf('day'))) {
            failCollection("Collection Date cannot be greater than today's date.");
            return;
        }
        setCollectionError('');
        collectionMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 lg:p-4 space-y-3">

            {/* ── Header / Toolbar — kept tight so the table gets the vertical space ── */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/25 shrink-0">
                        <Wallet size={16} className="text-white" />
                    </div>
                    <h1 className="text-sm font-extrabold text-slate-800 leading-tight uppercase tracking-wide">Cashflow Tracker</h1>
                    <p className="hidden lg:block text-[11px] text-slate-400 border-l border-slate-200 pl-2.5">Monitor your milestone collections across won orders.</p>
                </div>

                {/* All filters in a single wrapping row, ordered Entity → Period → Status →
                    Date range, matching the Cashflow Report bar. Every control is one 32px
                    pill so the row stays on a shared baseline however it wraps. */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    {/* ── Entity ── */}
                    <EntityFilter icon={Package} active={!!selectionKey}>
                        <select
                            className="text-[11px] font-semibold text-slate-700 bg-transparent outline-none pr-5 cursor-pointer appearance-none w-[132px]"
                            value={selectionKey}
                            onChange={e => handleProductChange(e.target.value)}
                        >
                            <option value="">All Products</option>
                            {(mappedItems as any[]).map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </EntityFilter>

                    {/* BDE selector — hidden for SalesPerson (they only see their own data) */}
                    {authUser?.role !== 'SalesPerson' && (
                        <EntityFilter icon={UserCircle} active={selectedBdeId !== null}>
                            <select
                                className="text-[11px] font-medium text-slate-700 bg-transparent outline-none pr-5 cursor-pointer appearance-none w-[118px]"
                                value={selectedBdeId ?? ''}
                                onChange={e => setSelectedBdeId(Number(e.target.value) || null)}
                            >
                                <option value="">All Users</option>
                                {(bdes as any[]).map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                        </EntityFilter>
                    )}

                    {/* Client Company — searchable dropdown, limited to companies with milestone data (clientcomFilter.md) */}
                    <EntityFilter icon={Building2} active={!!clientCompanyId}>
                        <SearchableSelect
                            options={(clientCompanies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            value={clientCompanyId}
                            onChange={setClientCompanyId}
                            placeholder="All Companies"
                            searchPlaceholder="Search company…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>

                    {/* ── Period ── */}
                    <ActivePill active={normalizeEdcStatus(filters.edc_status) !== 'all'}>
                        <EdcStatusSelect value={normalizeEdcStatus(filters.edc_status)} onChange={setEdcStatus} />
                    </ActivePill>
                    <ActivePill active={!!filters.quick_filter}>
                        <PeriodSelect value={filters.quick_filter || ''} onChange={setPeriodFilter} />
                    </ActivePill>
                    <ActivePill active={!!filters.quarter}>
                        <QuarterSelect value={filters.quarter || ''} onChange={setQuarterFilter} />
                    </ActivePill>

                    {/* ── Status — compact so the triggers hold the same 32px row height ── */}
                    <div className={clsx('w-[172px] shrink-0 rounded-lg transition-all', filters.collection_status && 'ring-2 ring-indigo-200')}>
                        <MultiSelect
                            compact
                            options={COLLECTION_STATUS_MULTI_OPTIONS}
                            value={filters.collection_status || ''}
                            onChange={setCollectionStatusFilter}
                            placeholder="All Collection Status"
                        />
                    </div>
                    <div className={clsx('w-[140px] shrink-0 rounded-lg transition-all', filters.poa_status && 'ring-2 ring-indigo-200')}>
                        <MultiSelect
                            compact
                            options={POA_STATUS_MULTI_OPTIONS}
                            value={filters.poa_status || ''}
                            onChange={setPoaStatusFilter}
                            placeholder="All POA Status"
                        />
                    </div>

                    {/* ── Date range — last, because it is the widest control and the one
                        reached for least often; the dropdowns before it keep their
                        positions from wrapping around it. ── */}
                    <ActivePill active={!!filters.from_date || !!filters.to_date}>
                        <DateRangeFields
                            fromDate={filters.from_date || ''}
                            toDate={filters.to_date || ''}
                            onFromChange={setFromDate}
                            onToChange={setToDate}
                        />
                    </ActivePill>

                    {/* Sits inline after the last filter — pushing it to the far right left a
                        gap across the wrapped row and read as a detached, misaligned control. */}
                    <button
                        onClick={clearAllFilters}
                        disabled={activeFilterCount === 0}
                        className={clsx(
                            'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[11px] font-medium transition-colors shrink-0',
                            activeFilterCount > 0
                                ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        )}
                    >
                        <RefreshCw size={12} /> Clear
                        {activeFilterCount > 0 && (
                            <span className="ml-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 leading-[15px]">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Dashboard summary cards */}
                {!isLoading && !error && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <StatCard label="Total Expected" value={fmt(summary.total_expected)} icon={TrendingUp} tone="blue" />
                        <StatCard label="Total Collected" value={fmt(summary.total_collected)} icon={IndianRupee} tone="emerald" />
                        <StatCard label="Balance Amount" value={fmt(summary.balance_amount)} icon={Scale} tone="amber" />
                        <StatCard label="Stuck Amount" value={fmt(summary.stuck_amount)} icon={AlertTriangle} tone="rose" />
                    </div>
                )}
            </div>

            {isLoading && <Skeleton />}

            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <span className="flex-1">Failed to load data.</span>
                    <button onClick={() => refetch()} className="text-xs px-3 py-1 rounded-lg border border-red-300 hover:bg-red-100 transition-colors">Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Milestones</span>
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sortedRows.length}</span>
                        </div>
                        {/* Rows-per-page lives above the table, where it is visible without
                            scrolling to the bottom first */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Rows</span>
                            <select
                                value={pageSize}
                                onChange={e => setPageSize(Number(e.target.value))}
                                className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-blue-400"
                            >
                                {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    {sortedRows.length === 0 ? (
                        <div className="py-14 px-4 text-center">
                            <Building2 size={28} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">{clientCompanyId ? 'No matches.' : 'No Order Won leads found.'}</p>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[62vh]">
                            {/* The box needs its own height for the sticky header to have something
                                to stick to — in a container that only grows, `top-0` never engages. */}
                            {/* border-separate, not border-collapse: a collapsed table owns its
                                borders, so they stay behind while a sticky cell moves and the grid
                                appears to fall apart mid-scroll. Row rules are drawn per cell below. */}
                            <table
                                className="border-separate border-spacing-0 table-fixed"
                                style={{ width: TABLE_WIDTH, minWidth: TABLE_WIDTH }}
                            >
                                <colgroup>
                                    {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                                </colgroup>
                                <thead className="sticky top-0 z-20">
                                    {/* Background per cell, not on the row: a transparent sticky th lets
                                        the rows passing underneath show through. The two teal POA headers
                                        and the frozen cells set their own and are unaffected. */}
                                    <tr className="text-[11px] font-bold uppercase tracking-wider text-white shadow-sm [&>th]:bg-blue-700 [&>th]:border-b-2 [&>th]:border-blue-900/40">
                                        {/* Frozen block: Company → Expected stay put while the rest scrolls
                                            sideways. z-30 keeps these above both the sticky header row and the
                                            frozen body cells. */}
                                        <SortTh
                                            label="Company"
                                            sortKey="company"
                                            style={FROZEN.company}
                                            className="sticky z-30 bg-blue-700"
                                            sortConfig={sortConfig}
                                            onSort={handleSort}
                                        />
                                        <SortTh
                                            label="Project"
                                            sortKey="project"
                                            style={FROZEN.project}
                                            className="sticky z-30 bg-blue-700"
                                            sortConfig={sortConfig}
                                            onSort={handleSort}
                                        />
                                        <SortTh
                                            label="Milestone"
                                            sortKey="milestone"
                                            style={FROZEN.milestone}
                                            className="sticky z-30 bg-blue-700"
                                            sortConfig={sortConfig}
                                            onSort={handleSort}
                                        />
                                        <th className="px-3 py-3.5 text-center sticky z-30 bg-blue-700" style={FROZEN.percent}>%</th>
                                        <SortTh
                                            label="Expected"
                                            sortKey="period_expected"
                                            align="right"
                                            style={FROZEN.expected}
                                            className="sticky z-30 bg-blue-700 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.35)]"
                                            sortConfig={sortConfig}
                                            onSort={handleSort}
                                        />
                                        <SortTh label="Collected" sortKey="period_collected" align="right" sortConfig={sortConfig} onSort={handleSort} />
                                        <SortTh label="Pending" sortKey="period_pending" align="right" sortConfig={sortConfig} onSort={handleSort} />
                                        <th className="px-3 py-3.5 text-center text-white">
                                            EDC & <br />
                                            Aging
                                        </th>

                                        {/* <SortTh label="EDC" sortKey="edc" sortConfig={sortConfig} onSort={handleSort} />
                                        <SortTh label="Aging" sortKey="aging" align="center" sortConfig={sortConfig} onSort={handleSort} /> */}
                                        <SortTh label="Revised EDC" sortKey="revised_edc" style={{ width: 120 }} sortConfig={sortConfig} onSort={handleSort} />
                                        <th className="px-3 py-3.5 text-center !bg-teal-700">Cash Flow POA</th>
                                        <th className="px-3 py-3.5 text-center !bg-teal-700" style={{ width: 140 }}>
                                            POA EDC <br />
                                            &amp; Status
                                        </th>
                                        <SortTh label="Collection Status" sortKey="collection_status" align="center" style={{ width: 140 }} sortConfig={sortConfig} onSort={handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedRows.map((row: any, idx: number) => {
                                        const { m, lead, expectedNum, alreadyReceived, periodExpected, periodCollected, periodPending, isFullyCollected } = row;
                                        const company = lead.company_name || '—';
                                        const editing = editingRows[m.id] || {};
                                        const hasPending = Object.keys(editing).length > 0;
                                        const isStuck = !isFullyCollected && m.collection_status === 'Stuck';
                                        // Every frozen cell needs the row's fill on itself, not just on the <tr>
                                        // — a sticky cell paints over the scrolling columns, so a transparent one
                                        // would let them show through as it passes underneath.
                                        const rowBg = isFullyCollected ? 'bg-emerald-50 group-hover:bg-emerald-100/70' :
                                            isStuck ? 'bg-red-50 group-hover:bg-red-100/70' :
                                                hasPending ? 'bg-amber-50' :
                                                    idx % 2 === 1 ? 'bg-slate-50 group-hover:bg-slate-100' : 'bg-white group-hover:bg-slate-50';
                                        const frozenCell = clsx('sticky z-10 transition-colors', rowBg);
                                        // Status stripe rides on the first cell now — a <tr> border is not painted
                                        // under border-separate.
                                        const accent = isFullyCollected ? 'border-l-emerald-400' : isStuck ? 'border-l-red-400' : 'border-l-transparent';
                                        return (
                                            <tr key={m.id} className={clsx(
                                                'group transition-colors [&>td]:border-b-2 [&>td]:border-slate-100',
                                                isFullyCollected ? 'bg-emerald-50/50 hover:bg-emerald-50' :
                                                    isStuck ? 'bg-red-50/50 hover:bg-red-50' :
                                                        hasPending ? 'bg-amber-50/40' : (idx % 2 === 1 ? 'bg-slate-50/70 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50/60')
                                            )}>
                                                {/* Frozen while scrolling sideways: Company → Expected */}
                                                <td className={clsx('px-4 py-3 border-l-4', accent, frozenCell)} style={FROZEN.company}>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{company}</p>
                                                        {lead.owner && (
                                                            <p className="text-[11px] text-slate-400 truncate">
                                                                {`${lead.owner.first_name || ''} ${lead.owner.last_name || ''}`.trim()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Project gets its own sortable column, with the product beneath it */}
                                                <td className={clsx('px-4 py-3', frozenCell)} style={FROZEN.project}>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 truncate" title={lead.project_name || ''}>
                                                            {lead.project_name || '—'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 truncate">{lead.product?.name || '—'}</p>
                                                    </div>
                                                </td>
                                                <td className={clsx('px-4 py-3', frozenCell)} style={FROZEN.milestone}>
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 leading-snug">{m.payment_type?.name || '—'}</p>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[11px] text-slate-400 tabular-nums">{fmt(alreadyReceived)} / {fmt(expectedNum)}</p>
                                                            <button
                                                                onClick={() => setPaymentHistoryModal({ mid: m.id, leadId: lead.id })}
                                                                title="View collection history"
                                                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                                                            >
                                                                <History size={13} />
                                                            </button>
                                                        </div>
                                                        {isFullyCollected && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">🟢 Fully Paid</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={clsx('px-3 py-3 text-center text-sm text-slate-500 tabular-nums', frozenCell)} style={FROZEN.percent}>
                                                    {m.percentage != null ? `${m.percentage}%` : '—'}
                                                </td>
                                                {/* Last frozen column — its shadow marks the seam with the scrolling area */}
                                                <td
                                                    className={clsx('px-3 py-3 text-right text-sm font-semibold text-slate-800 tabular-nums shadow-[2px_0_4px_-2px_rgba(15,23,42,0.25)]', frozenCell)}
                                                    style={FROZEN.expected}
                                                >
                                                    {fmt(periodExpected)}
                                                </td>
                                                <td className="px-3 py-3 text-right" style={{ width: 130 }}>
                                                    {isFullyCollected ? (
                                                        <span className="text-sm font-semibold text-slate-700 tabular-nums">{fmt(periodCollected)}</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCollectionModal(m.id, lead.id, company, lead.project_name || null, lead.product?.name || null, m.payment_type?.name || '—', expectedNum, expectedNum - alreadyReceived)}
                                                            title="Add a new collection"
                                                            className="w-full text-right group"
                                                        >
                                                            <span className="text-sm font-semibold text-blue-700 tabular-nums group-hover:underline">{fmt(periodCollected)}</span>
                                                            <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                                                                {m.last_collection_date ? `Last Collected: ${dayjs(m.last_collection_date).format('DD-MMM-YY')}` : 'Click to add collection'}
                                                            </p>
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-amber-700">
                                                    {fmt(periodPending)}
                                                </td>
                                                <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap text-center">
                                                    <span>{m.edc ? dayjs(m.edc).format('DD-MMM-YY') : '—'} </span><br />
                                                    <span><AgingBadge days={m.aging} pendingAmount={periodPending} /></span>

                                                </td>
                                                {/* <td className="px-3 py-3 text-center">
                                                    <AgingBadge days={m.aging} pendingAmount={periodPending} />
                                                </td> */}
                                                <td className="px-3 py-3" style={{ width: 120 }}>
                                                    {isFullyCollected ? (
                                                        <span className="text-xs text-slate-400">{m.revised_edc ? dayjs(m.revised_edc).format('DD-MMM-YY') : '—'}</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1.5">
                                                            <input
                                                                type="date"
                                                                min={dayjs().format('YYYY-MM-DD')}
                                                                value={editing.revised_edc ?? (m.revised_edc ? dayjs(m.revised_edc).format('YYYY-MM-DD') : '')}
                                                                onChange={e => handleEditChange(m.id, 'revised_edc', e.target.value)}
                                                                onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                                                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer"
                                                            />
                                                            {editing.revised_edc !== undefined && (
                                                                <CellSaveControls
                                                                    saving={savingCell === cellKey(m.id, 'revised_edc')}
                                                                    error={rowErrors[cellKey(m.id, 'revised_edc')]}
                                                                    onSave={() => handleSaveField(m.id, 'revised_edc')}
                                                                    onCancel={() => handleCancelField(m.id, 'revised_edc')}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {(() => {
                                                        const poaVal = editing.bant_poa ?? m.bant_poa ?? '';
                                                        const truncated = poaVal.length > 25 ? poaVal.slice(0, 25) + '…' : poaVal;
                                                        const poaStatusVal = m.poa_status || 'Pending';
                                                        const poaEdcVal = m.bant_poa_edc ? dayjs(m.bant_poa_edc).format('YYYY-MM-DD') : '';
                                                        return (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => { setBantPoaModal({ mid: m.id, leadId: lead.id, value: poaVal, status: poaStatusVal, edc: poaEdcVal, mode: 'edit' }); setPoaModalTab('edit'); }}
                                                                    title={poaVal}
                                                                    className={clsx(
                                                                        'text-left text-xs max-w-[110px] truncate rounded-md px-2 py-1 border transition-colors',
                                                                        poaVal
                                                                            ? 'border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                                                                            : 'border-dashed border-slate-200 text-slate-400 hover:bg-slate-50'
                                                                    )}
                                                                >
                                                                    {truncated || 'Add POA…'}
                                                                </button>
                                                                <button
                                                                    onClick={() => { setBantPoaModal({ mid: m.id, leadId: lead.id, value: '', status: poaStatusVal, edc: poaEdcVal, mode: 'new' }); setPoaModalTab('edit'); }}
                                                                    title="Add new POA"
                                                                    className="p-1 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors shrink-0"
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => { setBantPoaModal({ mid: m.id, leadId: lead.id, value: poaVal, status: poaStatusVal, edc: poaEdcVal, mode: 'edit' }); setPoaModalTab('history'); }}
                                                                    title="View POA history"
                                                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                                                                >
                                                                    <ClipboardList size={13} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                {/* POA Status and POA EDC share one column — they describe the same
                                                    POA and are read together. Badge on top, date below; both stay
                                                    individually editable exactly as before. */}
                                                <td className="px-3 py-3" style={{ width: 140 }}>
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <input
                                                            type="date"
                                                            value={editing.bant_poa_edc ?? (m.bant_poa_edc ? dayjs(m.bant_poa_edc).format('YYYY-MM-DD') : '')}
                                                            onChange={e => handleEditChange(m.id, 'bant_poa_edc', e.target.value)}
                                                            onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                                                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer"
                                                        />
                                                        {editing.bant_poa_edc !== undefined && (
                                                            <CellSaveControls
                                                                saving={savingCell === cellKey(m.id, 'bant_poa_edc')}
                                                                error={rowErrors[cellKey(m.id, 'bant_poa_edc')]}
                                                                onSave={() => handleSaveField(m.id, 'bant_poa_edc')}
                                                                onCancel={() => handleCancelField(m.id, 'bant_poa_edc')}
                                                            />
                                                        )}
                                                        <EditableStatusBadge
                                                            variant="poa"
                                                            status={m.poa_status}
                                                            options={POA_STATUS_OPTIONS}
                                                            onSave={async value => { await statusMutation.mutateAsync({ mid: m.id, field: 'poa_status', value }); }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center" style={{ width: 140 }}>
                                                    <EditableStatusBadge
                                                        variant="collection"
                                                        status={isFullyCollected ? 'Fully Paid' : m.collection_status}
                                                        options={COLLECTION_STATUS_OPTIONS}
                                                        disabled={isFullyCollected}
                                                        onSave={async value => { await statusMutation.mutateAsync({ mid: m.id, field: 'collection_status', value }); }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Shown whenever there are rows — the range and the rows-per-page control
                        are useful on a single page too, not only once it overflows. */}
                    {sortedRows.length > 0 && (
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <p className="text-xs text-slate-500">
                                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} milestones
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    title="First page"
                                    className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    title="Previous page"
                                    className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-xs font-semibold text-slate-600 px-2">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    title="Next page"
                                    className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page >= totalPages}
                                    title="Last page"
                                    className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BANT POA Modal */}
            {bantPoaModal && (
                <div className="modal-overlay" onClick={() => setBantPoaModal(null)}>
                    <div className="modal-box w-full sm:max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-sm font-bold text-slate-800">
                                {poaModalTab === 'edit' ? (bantPoaModal.mode === 'new' ? 'Add New POA' : 'Edit POA') : 'BANT POA'}
                            </h3>
                            <button
                                onClick={() => setBantPoaModal(null)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-6 pt-3 flex items-center gap-5 border-b border-slate-100">
                            <button
                                onClick={() => setPoaModalTab('edit')}
                                className={clsx(
                                    'text-xs font-semibold pb-2.5 border-b-2 transition-colors -mb-px',
                                    poaModalTab === 'edit' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                                )}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setPoaModalTab('history')}
                                className={clsx(
                                    'text-xs font-semibold pb-2.5 border-b-2 transition-colors -mb-px',
                                    poaModalTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                                )}
                            >
                                History
                            </button>

                            {/* Add New POA — same action as the "+" in the table row, reachable
                                without closing the popup first. Only on the Edit tab; the notes
                                box is cleared so the entry is written fresh, while Status and EDC
                                carry over (matching the table's "+" behavior). The previous POA
                                is kept in History by the save. */}
                            {poaModalTab === 'edit' && (
                                bantPoaModal.mode === 'edit' ? (
                                    <button
                                        onClick={() => setBantPoaModal(prev => prev ? { ...prev, value: '', mode: 'new' } : null)}
                                        title="Add new POA"
                                        className="ml-auto mb-2 flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add New POA
                                    </button>
                                ) : (
                                    <span className="ml-auto mb-2 flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1">
                                        <Plus size={12} /> New POA
                                    </span>
                                )
                            )}
                        </div>

                        {poaModalTab === 'edit' ? (
                            <>
                                <div className="px-6 py-5 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                            {bantPoaModal.mode === 'new' ? 'New POA Notes' : 'BANT POA Notes'}
                                        </label>
                                        {bantPoaModal.mode === 'new' && (
                                            <p className="text-[11px] text-slate-400 mb-2">
                                                This replaces the current POA with a fresh entry — the previous one stays visible in History.
                                            </p>
                                        )}
                                        <textarea
                                            // Remounts when Add New POA flips the mode, so autoFocus
                                            // fires again and the cursor lands in the cleared box.
                                            key={bantPoaModal.mode}
                                            autoFocus
                                            rows={6}
                                            value={bantPoaModal.value}
                                            onChange={e => setBantPoaModal(prev => prev ? { ...prev, value: e.target.value } : null)}
                                            placeholder="Enter BANT POA notes..."
                                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">POA Status</label>
                                            <select
                                                value={bantPoaModal.status}
                                                onChange={e => setBantPoaModal(prev => prev ? { ...prev, status: e.target.value } : null)}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer"
                                            >
                                                {POA_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                                POA EDC{poaEdcRequired && <span className="text-red-500 ml-0.5">*</span>}
                                            </label>
                                            <input
                                                type="date"
                                                value={bantPoaModal.edc}
                                                onChange={e => setBantPoaModal(prev => prev ? { ...prev, edc: e.target.value } : null)}
                                                onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                                                className={clsx(
                                                    'w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all cursor-pointer',
                                                    poaEdcMissing
                                                        ? 'border-red-300 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                                                        : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
                                                )}
                                            />
                                            {poaEdcMissing && (
                                                <p className="text-[11px] text-red-500 mt-1">POA EDC is required once POA notes are entered.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        onClick={() => setBantPoaModal(null)}
                                        disabled={bantPoaSaveMutation.isPending}
                                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={bantPoaSaveMutation.isPending || poaEdcMissing || (bantPoaModal.mode === 'new' && !bantPoaModal.value.trim())}
                                        onClick={() => bantPoaSaveMutation.mutate()}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                                    >
                                        {bantPoaSaveMutation.isPending ? 'Saving…' : (bantPoaModal.mode === 'new' ? 'Add POA' : 'Save POA')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="px-6 py-4">
                                {bantPoaHistoryLoading ? (
                                    <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-[11px] uppercase text-slate-500">
                                                <th className="text-left px-2 py-1.5">Updated On</th>
                                                <th className="text-left px-2 py-1.5">BANT POA</th>
                                                <th className="text-left px-2 py-1.5">BANT POA EDC</th>
                                                <th className="text-left px-2 py-1.5">Updated By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {bantPoaHistory.map((h: any) => (
                                                <tr key={h.id}>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{dayjs(h.updated_on).format('DD-MMM-YYYY HH:mm')}</td>
                                                    <td className="px-2 py-1.5 max-w-[200px] truncate" title={h.bant_poa || ''}>{h.bant_poa || '—'}</td>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{h.bant_poa_edc ? dayjs(h.bant_poa_edc).format('DD-MMM-YYYY') : '—'}</td>
                                                    <td className="px-2 py-1.5">{h.updated_by || '—'}</td>
                                                </tr>
                                            ))}
                                            {bantPoaHistory.length === 0 && (
                                                <tr><td colSpan={4} className="text-center text-slate-400 py-6">No updates recorded yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payment Collection History Modal */}
            {paymentHistoryModal && (
                <div className="modal-overlay" onClick={() => setPaymentHistoryModal(null)}>
                    <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-sm font-bold text-slate-800">Payment Collection History</h3>
                            <button
                                onClick={() => setPaymentHistoryModal(null)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            {(() => {
                                const m = midToMilestone.get(paymentHistoryModal.mid);
                                if (!m) return null;
                                const expected = Number(m.expected_amount || 0);
                                const alreadyReceived = Number(m.already_received ?? m.actual_amount ?? 0);
                                const pending = expected - alreadyReceived;
                                return (
                                    <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Expected Amount</p>
                                            <p className="text-sm font-bold text-blue-700 tabular-nums">{fmt(expected)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Collected Amount</p>
                                            <p className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(alreadyReceived)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Amount</p>
                                            <p className="text-sm font-bold text-amber-700 tabular-nums">{fmt(pending)}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                            {paymentHistoryLoading ? (
                                <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[11px] uppercase text-slate-500">
                                            <th className="text-left px-2 py-1.5">Collection Date</th>
                                            <th className="text-right px-2 py-1.5">Collected Amount</th>
                                            <th className="text-left px-2 py-1.5">Collected By</th>
                                            <th className="text-left px-2 py-1.5">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paymentHistory.map((h: any) => (
                                            <tr key={h.id}>
                                                <td className="px-2 py-1.5 whitespace-nowrap">{dayjs(h.collection_date).format('DD-MMM-YYYY')}</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">{fmt(h.collected_amount)}</td>
                                                <td className="px-2 py-1.5">{h.collected_by || '—'}</td>
                                                <td className="px-2 py-1.5 max-w-[160px] truncate" title={h.remarks || ''}>{h.remarks || '—'}</td>
                                            </tr>
                                        ))}
                                        {paymentHistory.length === 0 && (
                                            <tr><td colSpan={4} className="text-center text-slate-400 py-6">No payments recorded yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Collection Modal (collectamt.md) */}
            {collectionModal && (
                <div className="modal-overlay" onClick={() => !collectionMutation.isPending && setCollectionModal(null)}>
                    <div className={clsx('modal-box w-full', collectionModalTab === 'add' ? 'sm:max-w-md' : 'sm:max-w-lg')} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-sm font-bold text-slate-800">{collectionModalTab === 'add' ? 'Add Collection' : 'Collection History'}</h3>
                            <button
                                onClick={() => setCollectionModal(null)}
                                disabled={collectionMutation.isPending}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-6 pt-3 flex items-center gap-5 border-b border-slate-100">
                            <button
                                onClick={() => setCollectionModalTab('add')}
                                className={clsx(
                                    'text-xs font-semibold pb-2.5 border-b-2 transition-colors -mb-px',
                                    collectionModalTab === 'add' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                                )}
                            >
                                Add Collection
                            </button>
                            <button
                                onClick={() => setCollectionModalTab('history')}
                                className={clsx(
                                    'text-xs font-semibold pb-2.5 border-b-2 transition-colors -mb-px',
                                    collectionModalTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                                )}
                            >
                                History
                            </button>
                        </div>
                        <div className="px-6 pt-4">
                            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                                <div className="col-span-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Company</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{collectionModal.company}</p>
                                </div>
                                {/* Project Name and Product each get their own labelled field */}
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Project Name</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate" title={collectionModal.project || ''}>
                                        {collectionModal.project || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Product</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate" title={collectionModal.product || ''}>
                                        {collectionModal.product || '—'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Milestone</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate">{collectionModal.milestone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expected Amount</p>
                                    <p className="text-sm font-bold text-blue-700 tabular-nums">{fmt(collectionModal.expectedAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Amount</p>
                                    <p className="text-sm font-bold text-amber-700 tabular-nums">{fmt(collectionModal.pendingAmount)}</p>
                                </div>
                            </div>
                        </div>
                        {collectionModalTab === 'add' ? (
                            <>
                                <div className="px-6 py-5 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Collected Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">₹</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoFocus
                                                placeholder="0"
                                                value={collectionAmount}
                                                onChange={e => setCollectionAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                                className={clsx(
                                                    'w-full rounded-xl border pl-7 pr-3 py-2.5 text-sm tabular-nums outline-none transition-all',
                                                    collectionExceedsPending
                                                        ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-100'
                                                        : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
                                                )}
                                            />
                                        </div>
                                        {collectionExceedsPending && (
                                            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-red-600 mt-1.5">
                                                <AlertTriangle size={12} className="shrink-0 mt-px" />
                                                Collected Amount cannot exceed the Pending Amount ({fmt(collectionModal.pendingAmount)}).
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Collection Date</label>
                                        <input
                                            type="date"
                                            max={dayjs().format('YYYY-MM-DD')}
                                            value={collectionDate}
                                            onChange={e => setCollectionDate(e.target.value)}
                                            onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { } }}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Remarks (Optional)</label>
                                        <textarea
                                            rows={3}
                                            value={collectionRemarks}
                                            onChange={e => setCollectionRemarks(e.target.value)}
                                            placeholder="Received via Bank Transfer"
                                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none"
                                        />
                                    </div>
                                    {collectionError && (
                                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3.5 py-2.5 text-xs font-medium">
                                            <AlertTriangle size={14} className="shrink-0 mt-px" />
                                            <span>{collectionError}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button
                                        onClick={() => setCollectionModal(null)}
                                        disabled={collectionMutation.isPending}
                                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCollection}
                                        disabled={collectionMutation.isPending}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                                    >
                                        {collectionMutation.isPending ? 'Saving…' : 'Save Collection'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="px-6 py-4">
                                {collectionHistoryLoading ? (
                                    <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-[11px] uppercase text-slate-500">
                                                <th className="text-left px-2 py-1.5">Collection Date</th>
                                                <th className="text-right px-2 py-1.5">Collected Amount</th>
                                                <th className="text-left px-2 py-1.5">Collected By</th>
                                                <th className="text-left px-2 py-1.5">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {collectionHistory.map((h: any) => (
                                                <tr key={h.id}>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{dayjs(h.collection_date).format('DD-MMM-YYYY')}</td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(h.collected_amount)}</td>
                                                    <td className="px-2 py-1.5">{h.collected_by || '—'}</td>
                                                    <td className="px-2 py-1.5 max-w-[160px] truncate" title={h.remarks || ''}>{h.remarks || '—'}</td>
                                                </tr>
                                            ))}
                                            {collectionHistory.length === 0 && (
                                                <tr><td colSpan={4} className="text-center text-slate-400 py-6">No payments recorded yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                                <div className="modal-footer -mx-6 -mb-0 mt-2">
                                    <button
                                        onClick={() => setCollectionModal(null)}
                                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
