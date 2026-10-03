import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
    TrendingUp, Wallet, Layers, Building2, Package, UserCircle, ClipboardList,
    RefreshCw, Eye, ChevronDown, ChevronLeft, ChevronRight,
    AlertTriangle, Download, FileSpreadsheet, FileText, SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import api from '../../services/api';
import { usePersistentFilters } from '../../hooks/usePersistentFilters';
import { SearchableSelect } from '../../components/FilterDropdown';
import {
    EdcStatusSelect, DurationSelect, DateRangeFields, durationLabel,
    normalizeEdcStatus, EntityFilter, ActivePill, FORECAST_EDC_STATUS_OPTIONS,
} from '../../components/CashflowFilterFields';
import {
    HEAD_ROW_H, FROZEN, FROZEN_EDGE, Z_FROZEN, Z_FROZEN_BAND, Z_FROZEN_HEAD,
    GRAND_TOTAL_TD, COMPANY_CELL, LEVEL_BAR, ROW_FOCUS,
    DepthControl, SortTh, ScopeCount, KpiCard, GroupCell, SubtotalRow,
    useHierarchyCollapse,
    type SortConfig,
} from '../../components/CashflowHierarchy';
import { fmt } from './CashflowTracker';

/* ── Quadrant badge colours — the same reading as the Leads list and Lead Report ── */
const QUADRANT_STYLES: Record<string, string> = {
    Q1: 'badge-blue', Q2: 'badge-amber', Q3: 'badge-orange',
    Q4: 'badge-green', Nurturing: 'badge-purple', 'Order Won': 'badge-emerald', 'Order Lost': 'badge-red',
};
const qBadge = (q: string) => QUADRANT_STYLES[q] ?? 'badge-gray';

// The forecast is a flat table — one row per forecast milestone, every attribute in
// its own column — wrapped in the Cashflow Report's Company → BDE → Client → Project
// hierarchy. The header band, each company block and the Grand Total render as their
// own <table>s, so the column geometry lives in one place: identical table-fixed
// colgroups, plus a shared min-width on the single scroll container, keep every column
// aligned down the page.
const FORECAST_MIN_WIDTH = 1270; // 1060 fixed columns + ≥210 for Sales Activity Remarks

function ForecastColgroup() {
    return (
        <colgroup>
            {/* Company and BDE are band rows above their own rows rather than columns —
                they are the levels that would otherwise repeat down the whole page. */}
            <col style={{ width: 150 }} />{/* Client — carries the project name beneath it */}
            <col style={{ width: 120 }} />{/* Product / Vertical */}
            <col style={{ width: 150 }} />{/* Milestone Type */}
            <col style={{ width: 120 }} />{/* Expected Amount — the measure every band rolls up */}
            {/* Quadrant, BANT Score and CP Score are one column: all three are the same
                judgement — how well qualified this lead is — and are read together. */}
            {/* The three parts stack one per line, so the column only has to be as wide
                as the widest single line, plus room around the badges. */}
            <col style={{ width: 130 }} />{/* BANT Details & Score */}
            <col style={{ width: 95 }} />{/* Device / License Count */}
            <col style={{ width: 120 }} />{/* Opportunity Value */}
            <col style={{ width: 105 }} />{/* EDC */}
            <col />{/* Sales Activity Remarks — absorbs remaining width */}
            <col style={{ width: 70 }} />{/* View */}
        </colgroup>
    );
}

// Columns up to and including Expected Amount stay put while the rest scroll
// sideways: the money you are reading has to keep its labels next to it. Each frozen
// cell needs its own left offset, and those offsets are the running sum of the
// colgroup widths above — 150 + 120 + 150, freezing 540px in total. The band and
// subtotal rows span the first three columns in one cell, which is why `label` is the
// offset they use.
const FREEZE_LEFT = {
    label: 0,        // Client / Project — also the colSpan-3 band label
    productVertical: 150,
    milestone: 270,
    expected: 420,
};

// Every column, so the tail colSpan on the band rows cannot drift from the header.
// Must equal the number of <col> entries in ForecastColgroup: one too many here and
// the band rows build a wider table than the header, and the whole grid shears.
const COL_COUNT = 10;
// Columns after Expected Amount — one cell carries them on the band and total rows.
const TAIL_COLS = COL_COUNT - 4;

// The single column header for the whole table. Every column that names something
// sorts, including the hierarchy levels — sorting one of them reorders the runs
// beneath it.
function ForecastHeadRow({ sortConfig, onSort }: { sortConfig: SortConfig; onSort: (key: string) => void }) {
    // Labels sit on the blue gradient: resting ink is blue-100 and the active sort
    // steps up to white, so the sorted column is legible without a second hue. The
    // frozen block needs its own solid fill — the gradient lives on the wrapper, which
    // a sticky cell would let the scrolling columns show through.
    const frozen = clsx(FROZEN, 'bg-blue-700 print:bg-transparent');
    return (
        <tr className="text-[10px] font-semibold uppercase tracking-wider text-blue-100 print:text-slate-700" style={{ height: HEAD_ROW_H }}>
            <SortTh label={<>Client /<br />Project</>} sortKey="client" sortConfig={sortConfig} onSort={onSort}
                className={frozen} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<>Product /<br />Vertical</>} sortKey="product" align="center" sortConfig={sortConfig} onSort={onSort}
                className={frozen} style={{ left: FREEZE_LEFT.productVertical, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<>Milestone<br />Type</>} sortKey="milestone" align="center" sortConfig={sortConfig} onSort={onSort}
                className={frozen} style={{ left: FREEZE_LEFT.milestone, zIndex: Z_FROZEN_HEAD }} />
            <SortTh label={<>Expected<br />Amount</>} sortKey="expected_amount" align="center" sortConfig={sortConfig} onSort={onSort}
                className={clsx(frozen, FROZEN_EDGE)} style={{ left: FREEZE_LEFT.expected, zIndex: Z_FROZEN_HEAD }} />
            {/* One column for the whole qualification picture; it sorts by the BANT
                score, the figure the column is named for. */}
            <SortTh label={<>BANT Details<br />&amp; Score</>} sortKey="bant_score" align="center" sortConfig={sortConfig} onSort={onSort} />
            <SortTh label={<>Device /<br />License Count</>} sortKey="device_count" align="center" sortConfig={sortConfig} onSort={onSort} />
            <SortTh label={<>Opportunity<br />Value</>} sortKey="opportunity_value" align="center" sortConfig={sortConfig} onSort={onSort} />
            <SortTh label="EDC" sortKey="edc" align="center" sortConfig={sortConfig} onSort={onSort} />
            <th className="px-2 py-2.5 text-left leading-tight">Sales Activity<br />Remarks</th>
            <th className="px-2 py-2.5 text-center leading-tight print:hidden">View</th>
        </tr>
    );
}

// A zero drops to muted ink rather than the measure hue — it is information, but it
// is not a figure worth colouring, and a column of coloured zeros reads as noise.
function Amount({ value, weight = 'semibold', muted = false }: { value: any; weight?: 'semibold' | 'bold'; muted?: boolean }) {
    const zero = !Number(value || 0);
    return (
        <span
            className={clsx(
                'text-[12px] tabular-nums',
                weight === 'bold' ? 'font-bold' : 'font-semibold',
                zero ? 'text-slate-500' : muted ? 'text-slate-700' : 'text-emerald-700'
            )}
        >
            {fmt(value)}
        </span>
    );
}

// The cells a band row shares with the column geometry: the rolled-up Expected Amount
// in its own frozen column, then one tail cell carrying the milestone count across the
// columns that only mean something on a leaf row.
function GroupMoneyCells({ expected, milestones, cellClass, frozenZ = Z_FROZEN }: {
    expected: number; milestones?: number; cellClass?: string; frozenZ?: number;
}) {
    // A row that fills its cells (the bands, Grand Total) passes cellClass; one that
    // fills its <tr> falls back to bg-inherit so the cell is still opaque.
    const fill = cellClass || 'bg-inherit';
    return (
        <>
            <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap', FROZEN, FROZEN_EDGE, fill)} style={{ left: FREEZE_LEFT.expected, zIndex: frozenZ }}>
                <Amount value={expected} weight="bold" />
            </td>
            {/* The tail is not frozen sideways, but on the Company band it is still
                stuck to the top, so it needs the same z as the rest of that band. */}
            <td colSpan={TAIL_COLS} className={clsx('px-2 py-1 text-left align-middle whitespace-nowrap', cellClass)} style={{ zIndex: frozenZ }}>
                {milestones !== undefined && (
                    <span className="text-[10.5px] text-slate-500">
                        {milestones} {milestones === 1 ? 'Milestone' : 'Milestones'}
                    </span>
                )}
            </td>
        </>
    );
}

// Four-level hierarchy, matching the Cashflow Report: Company (the product's BU
// company) → BDE → Client Company → Project/Order → forecast milestone. Every group
// carries its own Expected rollup in the same column as the rows beneath it, so a
// level can be read without expanding it.
interface Rollup { expected: number }

interface ProjectGroup extends Rollup {
    key: string; project: string; vertical: string; product: string; rows: any[];
}
interface ClientGroup extends Rollup {
    key: string; client: string; projects: ProjectGroup[]; milestones: number;
}
interface BdeGroup extends Rollup {
    key: string; bde: string; clients: ClientGroup[]; clientCount: number; projects: number; milestones: number;
}
interface CompanyGroup extends Rollup {
    key: string; company: string; bdes: BdeGroup[]; clients: number; projects: number; milestones: number;
}

const PAGE_SIZE = 3; // master companies per page — a company table spans many rows

export default function CashflowForecast() {
    const { filters, setFilters } = usePersistentFilters('cashflow-forecast', {
        company_id: '', product_id: '', bde_id: '', client_company_id: '', edc_status: 'all', quick_filter: '', month: '',
        quarter: '', from_date: '', to_date: '',
    });

    const [companyId, setCompanyId] = useState(filters.company_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [bdeId, setBdeId] = useState(filters.bde_id || '');
    const [clientCompanyId, setClientCompanyId] = useState(filters.client_company_id || '');
    // A persisted `due_revised`/`expired` predates or postdates this screen's own
    // option set — read back as All rather than left set to a value that can never match.
    const [edcStatus, setEdcStatus] = useState(() => normalizeEdcStatus(filters.edc_status, FORECAST_EDC_STATUS_OPTIONS));
    const [quickFilter, setQuickFilter] = useState(filters.quick_filter || '');
    const [month, setMonth] = useState(filters.month || '');
    const [quarter, setQuarter] = useState(filters.quarter || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    // The filter section is its own block below the header, open by default and
    // toggled by the Filters button on every screen size.
    const [showFilters, setShowFilters] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const syncFilters = (patch: Partial<typeof filters>) =>
        setFilters({ company_id: companyId, product_id: productId, bde_id: bdeId, client_company_id: clientCompanyId, edc_status: edcStatus, quick_filter: quickFilter, month, quarter, from_date: fromDate, to_date: toDate, ...patch });

    const { data: companies = [] } = useQuery({ queryKey: ['masters', 'company'], queryFn: () => api.get('/masters/company').then(r => r.data) });
    // Client Company filter (clientcomFilter.md) — only client companies with at
    // least one forecasted milestone matching the current Company/Product/BDE
    // selection, refreshed dynamically as those filters change.
    const { data: clientCompanies = [] } = useQuery({
        queryKey: ['cashflow-forecast-client-companies', companyId, productId, bdeId],
        queryFn: () => api.get('/cashflow-forecast/client-companies', { params: { company_id: companyId || undefined, product_id: productId || undefined, bde_id: bdeId || undefined } }).then(r => r.data),
    });
    const { data: products = [] } = useQuery({
        queryKey: ['masters', 'product', companyId],
        queryFn: () => api.get('/masters/product', { params: companyId ? { company_id: companyId } : undefined }).then(r => r.data),
    });
    const { data: bdes = [] } = useQuery({
        queryKey: ['cashflow-forecast-bdes', companyId, productId],
        queryFn: () => api.get('/cashflow-forecast/bdes', { params: { company_id: companyId || undefined, product_id: productId || undefined } }).then(r => r.data),
    });

    const params = {
        company_id: companyId || undefined,
        product_id: productId || undefined,
        bde_id: bdeId || undefined,
        client_company_id: clientCompanyId || undefined,
        edc_status: edcStatus !== 'all' ? edcStatus : undefined,
        quick_filter: quickFilter || undefined,
        month: !quickFilter && month ? month : undefined,
        quarter: quarter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
    };

    const { data: listData, isLoading, error, refetch } = useQuery({
        queryKey: ['cashflow-forecast-list', params],
        queryFn: () => api.get('/cashflow-forecast', { params }).then(r => r.data),
    });

    const rows: any[] = listData?.data || [];

    const handleCompanyChange = (val: string) => {
        setCompanyId(val);
        setProductId('');
        setBdeId('');
        syncFilters({ company_id: val, product_id: '', bde_id: '' });
    };
    const handleProductChange = (val: string) => {
        setProductId(val);
        setBdeId('');
        syncFilters({ product_id: val, bde_id: '' });
    };
    const handleBdeChange = (val: string) => { setBdeId(val); syncFilters({ bde_id: val }); };
    const handleClientCompanyChange = (val: string) => { setClientCompanyId(val); syncFilters({ client_company_id: val }); };
    const handleEdcStatusChange = (val: string) => { setEdcStatus(val); syncFilters({ edc_status: val }); };
    // One Duration control drives both params — picking a quarter clears the week/month
    // choice and vice versa, so the two can never be live at once. Either one supersedes
    // an explicit month, exactly as the week/month select always has.
    // Duration and the From/To range are two ways of asking the same question, and
    // combining them intersects into results nobody predicted — so choosing one clears
    // the other. Clearing a control (Duration → All, or emptying a date box) is not a
    // choice of period, so it leaves the other side alone.
    const handleDurationChange = ({ quick_filter, quarter: q }: { quick_filter: string; quarter: string }) => {
        const picked = !!(quick_filter || q);
        setQuickFilter(quick_filter);
        setQuarter(q);
        setMonth('');
        if (picked) { setFromDate(''); setToDate(''); }
        syncFilters({
            quick_filter, quarter: q, month: '',
            ...(picked ? { from_date: '', to_date: '' } : {}),
        });
    };
    // Clearing the Duration alongside a date pick has to clear `month` too — it is the
    // third period param, and a persisted month would otherwise still narrow the range.
    const clearDurationForRange = () => {
        setQuickFilter('');
        setQuarter('');
        setMonth('');
        return { quick_filter: '', quarter: '', month: '' };
    };
    const handleFromDateChange = (val: string) => {
        setFromDate(val);
        syncFilters({ from_date: val, ...(val ? clearDurationForRange() : {}) });
    };
    const handleToDateChange = (val: string) => {
        setToDate(val);
        syncFilters({ to_date: val, ...(val ? clearDurationForRange() : {}) });
    };
    const handleReset = () => {
        setCompanyId(''); setProductId(''); setBdeId(''); setClientCompanyId(''); setEdcStatus('all');
        setQuickFilter(''); setMonth(''); setQuarter(''); setFromDate(''); setToDate('');
        setFilters({
            company_id: '', product_id: '', bde_id: '', client_company_id: '', edc_status: 'all', quick_filter: '', month: '',
            quarter: '', from_date: '', to_date: '',
        });
    };

    // Drives the filter-count badge and hides Clear entirely when nothing is applied —
    // the toolbar stays quiet on a first visit, where every filter defaults to "All".
    const activeFilterCount =
        [companyId, productId, bdeId, clientCompanyId, quickFilter, month, quarter, fromDate, toDate]
            .filter(Boolean).length + (edcStatus && edcStatus !== 'all' ? 1 : 0);

    const SORT_ACCESSORS: Record<string, (r: any) => any> = {
        company: r => (r.company || '').toLowerCase(),
        bde: r => (r.bde || '').toLowerCase(),
        client: r => (r.lead_company || '').toLowerCase(),
        project: r => (r.lead_project_name || r.product || '').toLowerCase(),
        product: r => (r.product || '').toLowerCase(),
        milestone: r => (r.milestone_type || '').toLowerCase(),
        expected_amount: r => Number(r.expected_amount || 0),
        opportunity_value: r => Number(r.opportunity_value || 0),
        device_count: r => (r.device_count ?? null),
        quadrant: r => (r.quadrant || '').toLowerCase(),
        bant_score: r => Number(r.bant_score || 0),
        cp_score: r => Number(r.cp_score || 0),
        edc: r => (r.edc ? new Date(r.edc).getTime() : null),
    };

    // Sorting runs before grouping so the chosen sort drives both the order of the
    // groups and the milestones inside them.
    const viewRows = useMemo(() => {
        if (!sortConfig) return rows;
        const accessor = SORT_ACCESSORS[sortConfig.key];
        if (!accessor) return rows;
        const dir = sortConfig.dir === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
            if (bv === null || bv === undefined) return -1;
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [rows, sortConfig]); // eslint-disable-line react-hooks/exhaustive-deps

    // Rollups are computed over the full filtered result set, not just the current
    // page, so they stay correct regardless of pagination.
    const companyGroups = useMemo(() => {
        const list: CompanyGroup[] = [];
        const companyByKey = new Map<string, CompanyGroup>();
        const bdeByKey = new Map<string, BdeGroup>();
        const clientByKey = new Map<string, ClientGroup>();
        const projectByKey = new Map<string, ProjectGroup>();
        // Distinct client companies per company and per BDE — the same client can be
        // worked by two executives, so the counts are sets rather than sums.
        const companyClients = new Map<string, Set<string>>();
        const bdeClients = new Map<string, Set<string>>();

        for (const r of viewRows) {
            const company = r.company && r.company !== '—' ? r.company : '—';
            const bde = r.bde || '—';
            const client = r.lead_company || '—';
            const project = r.lead_project_name || r.product || '—';
            // Keyed by id wherever one exists so two rows sharing a name never collapse.
            // A project/order *is* a lead, so the project key is the lead id.
            const companyKey = `${r.company_id ?? '0'}||${company}`;
            const bdeKey = `${companyKey}||${r.bde_id ?? '0'}||${bde}`;
            const clientKey = `${bdeKey}||${client}`;
            const projectKey = `${clientKey}||${r.lead_id}`;

            let cg = companyByKey.get(companyKey);
            if (!cg) {
                cg = { key: companyKey, company, bdes: [], clients: 0, projects: 0, milestones: 0, expected: 0 };
                companyByKey.set(companyKey, cg);
                companyClients.set(companyKey, new Set());
                list.push(cg);
            }

            let bg = bdeByKey.get(bdeKey);
            if (!bg) {
                bg = { key: bdeKey, bde, clients: [], clientCount: 0, projects: 0, milestones: 0, expected: 0 };
                bdeByKey.set(bdeKey, bg);
                bdeClients.set(bdeKey, new Set());
                cg.bdes.push(bg);
            }

            let clg = clientByKey.get(clientKey);
            if (!clg) {
                clg = { key: clientKey, client, projects: [], milestones: 0, expected: 0 };
                clientByKey.set(clientKey, clg);
                bg.clients.push(clg);
            }
            companyClients.get(companyKey)!.add(client);
            bdeClients.get(bdeKey)!.add(client);

            let pg = projectByKey.get(projectKey);
            if (!pg) {
                pg = { key: projectKey, project, vertical: r.vertical || '—', product: r.product || '—', rows: [], expected: 0 };
                projectByKey.set(projectKey, pg);
                clg.projects.push(pg);
                bg.projects += 1;
                cg.projects += 1;
            }
            pg.rows.push(r);

            const expected = Number(r.expected_amount || 0);
            for (const g of [pg as Rollup, clg as Rollup, bg as Rollup, cg as Rollup]) g.expected += expected;
            clg.milestones += 1;
            bg.milestones += 1;
            cg.milestones += 1;
        }

        for (const [key, set] of companyClients) companyByKey.get(key)!.clients = set.size;
        for (const [key, set] of bdeClients) bdeByKey.get(key)!.clientCount = set.size;

        // Companies read alphabetically by default. Once a column sort is active it
        // drives the block order instead — the groups are built in the sorted row
        // order, so first appearance already reflects the chosen sort.
        return sortConfig ? list : list.sort((a, b) => a.company.localeCompare(b.company));
    }, [viewRows, sortConfig]);

    const allCompanyKeys = useMemo(() => companyGroups.map(c => c.key), [companyGroups]);
    const allBdeKeys = useMemo(() => companyGroups.flatMap(c => c.bdes.map(b => b.key)), [companyGroups]);
    const allClientKeys = useMemo(
        () => companyGroups.flatMap(c => c.bdes.flatMap(b => b.clients.map(cl => cl.key))),
        [companyGroups]
    );
    const allProjectKeys = useMemo(
        () => companyGroups.flatMap(c => c.bdes.flatMap(b => b.clients.flatMap(cl => cl.projects.map(p => p.key)))),
        [companyGroups]
    );

    // Parent → child key lists, so expanding a band knows which children to close.
    const childKeys = useMemo(() => {
        const bdesOf = new Map<string, string[]>();
        const clientsOf = new Map<string, string[]>();
        const projectsOf = new Map<string, string[]>();
        for (const cg of companyGroups) {
            bdesOf.set(cg.key, cg.bdes.map(b => b.key));
            for (const bg of cg.bdes) {
                clientsOf.set(bg.key, bg.clients.map(cl => cl.key));
                for (const clg of bg.clients) projectsOf.set(clg.key, clg.projects.map(p => p.key));
            }
        }
        return { bdesOf, clientsOf, projectsOf };
    }, [companyGroups]);

    const {
        collapsedCompanies, collapsedBdes, collapsedClients, collapsedProjects,
        toggleCompany, toggleBde, toggleClient, toggleProject,
        depthHint, expandToDepth,
    } = useHierarchyCollapse(
        { companies: allCompanyKeys, bdes: allBdeKeys, clients: allClientKeys, projects: allProjectKeys },
        childKeys,
        rows,
    );

    const companyCount = companyGroups.length;
    const bdeCount = useMemo(() => new Set(viewRows.map(r => r.bde_id ?? r.bde)).size, [viewRows]);
    const clientCount = useMemo(() => new Set(viewRows.map(r => r.lead_company || '—')).size, [viewRows]);
    const projectCount = allProjectKeys.length;
    const leadCount = useMemo(() => new Set(viewRows.map(r => r.lead_id)).size, [viewRows]);

    const totalExpected = useMemo(() => viewRows.reduce((s, r) => s + (Number(r.expected_amount) || 0), 0), [viewRows]);
    // Opportunity value belongs to the lead, so it is summed once per lead — summing
    // the rows would multiply it by that lead's milestone count.
    const totalOpportunity = useMemo(() => {
        const byLead = new Map<number, number>();
        for (const r of viewRows) byLead.set(r.lead_id, Number(r.opportunity_value) || 0);
        return [...byLead.values()].reduce((s, v) => s + v, 0);
    }, [viewRows]);
    // Pagination runs over companies so a company table — its executives, clients,
    // projects and milestones — is never split across two pages.
    const totalPages = Math.max(1, Math.ceil(companyGroups.length / PAGE_SIZE));
    const pagedCompanies = useMemo(
        () => companyGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [companyGroups, page]
    );
    useEffect(() => { setPage(1); }, [rows, sortConfig]);

    // Company and BDE get a band row each; Client and Project get a ∑ line that opens
    // their run — naming the group, carrying its total and acting as its toggle in one
    // row. Everything under a project is flattened into one row per milestone.
    type DisplayItem =
        | { kind: 'row'; r: any; key: string; zebra: boolean; vertical: string; product: string; firstOfProject: boolean }
        | { kind: 'projectTotal'; key: string; groupKey: string; label: string; meta: string; group: Rollup; collapsed: boolean }
        | { kind: 'clientTotal'; key: string; groupKey: string; label: string; meta: string; group: Rollup; collapsed: boolean };

    const displayBlocks = useMemo(() => {
        return pagedCompanies.map(cg => ({
            cg,
            collapsed: collapsedCompanies.has(cg.key),
            bdeBlocks: cg.bdes.map(bg => {
                const out: DisplayItem[] = [];
                let zebraIndex = 0;
                for (const clg of bg.clients) {
                    // The client total opens its run rather than closing it, so it reads
                    // as the heading for the rows beneath — and it names the client, so
                    // the rows themselves never repeat the name.
                    const clientCollapsed = collapsedClients.has(clg.key);
                    out.push({
                        kind: 'clientTotal', key: `${clg.key}||total`, groupKey: clg.key,
                        label: clg.client,
                        meta: `${clg.projects.length} ${clg.projects.length === 1 ? 'Project' : 'Projects'} · ${clg.milestones} ${clg.milestones === 1 ? 'Milestone' : 'Milestones'}`,
                        group: clg, collapsed: clientCollapsed,
                    });
                    if (clientCollapsed) continue;
                    for (const pg of clg.projects) {
                        const projectCollapsed = collapsedProjects.has(pg.key);
                        out.push({
                            kind: 'projectTotal', key: `${pg.key}||total`, groupKey: pg.key,
                            label: pg.project,
                            meta: `${pg.rows.length} ${pg.rows.length === 1 ? 'Milestone' : 'Milestones'}`,
                            group: pg, collapsed: projectCollapsed,
                        });
                        if (!projectCollapsed) {
                            let firstOfProject = true;
                            for (const r of pg.rows) {
                                out.push({
                                    kind: 'row',
                                    r, key: `${pg.key}||${r.milestone_id}`, zebra: zebraIndex++ % 2 === 1,
                                    vertical: pg.vertical, product: pg.product, firstOfProject,
                                });
                                firstOfProject = false;
                            }
                        }
                    }
                }
                return { bg, rows: out, collapsed: collapsedBdes.has(bg.key) };
            }),
        }));
    }, [pagedCompanies, collapsedCompanies, collapsedBdes, collapsedClients, collapsedProjects]);

    const handleSort = (key: string) => {
        setSortConfig(prev => (prev && prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    };

    // What the figures are scoped to, named the same way in the KPI tile and the page
    // subtitle. Quarter and week/month are one control, so both feed this label.
    const durationLbl = durationLabel(quickFilter, quarter);

    // Exports carry the full filtered set in the current sort order, so the file
    // matches what is on screen rather than only the companies on this page.
    const flatRows = useMemo(() => viewRows.map((r: any) => ({
        'Company': r.company || '',
        'BDE': r.bde || '',
        'Client Company': r.lead_company || '',
        'Project Name': r.lead_project_name || '',
        'Product': r.product || '',
        'Vertical': r.vertical || '',
        'Milestone Type': r.milestone_type || '',
        'Quadrant': r.quadrant || '',
        'BANT Score': r.bant_score ?? 0,
        'CP Score': r.cp_score ?? 0,
        'Device / License Count': r.device_count ?? '',
        'Opportunity Value': r.opportunity_value || 0,
        'Expected Amount': r.expected_amount || 0,
        'EDC': r.edc ? dayjs(r.edc).format('DD-MMM-YYYY') : '',
        'Sales Activity Remarks': r.sales_activity_remarks || '',
    })), [viewRows]);

    const exportLabel = (quarter || quickFilter || month || 'AllTime').replace(/,/g, '_');

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(flatRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Forecast');
        XLSX.writeFile(wb, `CashflowForecast_${exportLabel}.xlsx`);
        setShowExportMenu(false);
    };

    const exportCSV = () => {
        const ws = XLSX.utils.json_to_sheet(flatRows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `CashflowForecast_${exportLabel}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const exportPDF = () => {
        window.print();
        setShowExportMenu(false);
    };

    return (
        // A flex column that owns the viewport: the table section takes whatever height
        // the sections above it leave, so hiding the filters grows the table instead of
        // leaving a gap under it. Below lg the page scrolls normally.
        <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-slate-50/70 p-3 lg:p-4 space-y-3 print:h-auto print:overflow-visible print:p-2 print:space-y-2">

            {/* ── Section 1 · Header — page title, Filters toggle and Export ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden print:shadow-none print:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 print:hidden">
                            <ClipboardList size={17} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">Cash Flow Forecast</h1>
                            <p className="text-[11px] text-slate-400 leading-tight truncate">
                                Expected order milestones — {durationLbl || (month ? dayjs(month).format('MMMM YYYY') : 'All Time')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 print:hidden">
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            title={showFilters ? 'Hide filters' : 'Show filters'}
                            className={clsx(
                                'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 h-8 rounded-lg border transition-colors',
                                showFilters
                                    ? 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                                    : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
                            )}
                        >
                            <SlidersHorizontal size={13} className={showFilters ? 'text-indigo-500' : 'text-slate-400'} />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown size={12} className={clsx('transition-transform', showFilters && 'rotate-180')} />
                        </button>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 px-2.5 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                title="Clear all filters"
                            >
                                <RefreshCw size={12} />
                                Clear
                                <span className="min-w-[16px] h-4 px-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            </button>
                        )}

                        {rows.length > 0 && (
                            <div className="relative" ref={exportMenuRef}>
                                <button
                                    onClick={() => setShowExportMenu(v => !v)}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 h-8 rounded-lg transition-colors"
                                >
                                    <Download size={13} /> Export
                                    <ChevronDown size={11} className={clsx('transition-transform', showExportMenu && 'rotate-180')} />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 z-30 overflow-hidden min-w-[150px] py-1">
                                        <button onClick={exportExcel} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                                            <FileSpreadsheet size={14} className="text-emerald-600" /> Excel
                                        </button>
                                        <button onClick={exportCSV} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                                            <FileText size={14} className="text-blue-600" /> CSV
                                        </button>
                                        <button onClick={exportPDF} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                                            <FileText size={14} className="text-rose-600" /> PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Section 2 · Filters — one wrapping row of pills, opened and closed by
                the Filters button above. The controls name themselves, so the group
                labels that cost a row each are gone. ── */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-3 py-2 flex flex-wrap items-center gap-1.5 print:hidden">
                    {/* A forecast milestone has no Revised EDC, so Expired R.EDC is not
                        offered here — it could only ever return an empty table. */}
                    <ActivePill active={edcStatus !== 'all'}>
                        <EdcStatusSelect value={edcStatus} onChange={handleEdcStatusChange} excludeRevised />
                    </ActivePill>
                    <ActivePill active={!!quickFilter || !!quarter}>
                        <DurationSelect quickFilter={quickFilter} quarter={quarter} onChange={handleDurationChange} />
                    </ActivePill>

                    <EntityFilter icon={Building2} active={!!companyId}>
                        <SearchableSelect
                            options={(companies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            value={companyId}
                            onChange={handleCompanyChange}
                            placeholder="All Companies"
                            searchPlaceholder="Search company…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>

                    {/* Client Company — limited to companies with forecast data (clientcomFilter.md) */}
                    <EntityFilter icon={Building2} active={!!clientCompanyId}>
                        <SearchableSelect
                            options={(clientCompanies as any[]).map((c: any) => ({ value: String(c.id), label: c.name }))}
                            value={clientCompanyId}
                            onChange={handleClientCompanyChange}
                            placeholder="All Client Companies"
                            searchPlaceholder="Search client company…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[132px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>

                    <EntityFilter icon={Package} active={!!productId}>
                        <SearchableSelect
                            options={(products as any[]).map((p: any) => ({ value: String(p.id), label: p.name }))}
                            value={productId}
                            onChange={handleProductChange}
                            placeholder="All Products"
                            searchPlaceholder="Search product…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[118px] [&>span]:!text-[11px] [&>span]:font-semibold text-slate-700"
                        />
                    </EntityFilter>

                    <EntityFilter icon={UserCircle} active={!!bdeId}>
                        <SearchableSelect
                            options={(bdes as any[]).map((u: any) => ({ value: String(u.id), label: `${u.first_name} ${u.last_name || ''}`.trim() }))}
                            value={bdeId}
                            onChange={handleBdeChange}
                            placeholder="All BDEs"
                            searchPlaceholder="Search BDE…"
                            className="!border-none !p-0 !bg-transparent !py-0 h-full w-[112px] [&>span]:!text-[11px] [&>span]:font-medium text-slate-700"
                        />
                    </EntityFilter>

                    {/* Date range last — the widest control and the one reached for least
                        often; the dropdowns before it keep their positions from wrapping
                        around it. */}
                    <ActivePill active={!!fromDate || !!toDate}>
                        <DateRangeFields fromDate={fromDate} toDate={toDate} onFromChange={handleFromDateChange} onToChange={handleToDateChange} />
                    </ActivePill>
                </div>
            )}

            {/* Loading skeleton — mirrors the real layout: four tiles, then company blocks */}
            {isLoading && (
                <div className="animate-pulse space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-[62px] bg-white rounded-xl border border-slate-200/80" />)}
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                        <div className="h-10 border-b border-slate-100" />
                        <div className="h-11 bg-gradient-to-r from-blue-700 to-blue-800 border-b-2 border-blue-900/40" />
                        {[...Array(3)].map((_, i) => (
                            <React.Fragment key={i}>
                                <div className="h-11 bg-slate-200/80" />
                                <div className="h-10 bg-slate-50 border-b border-slate-200" />
                                <div className="h-11 border-b border-slate-100" />
                            </React.Fragment>
                        ))}
                        <div className="h-11 bg-slate-200/60" />
                    </div>
                </div>
            )}

            {/* Error */}
            {!isLoading && error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span className="flex-1 font-medium">Failed to load forecast data.</span>
                    <button onClick={() => refetch()} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 transition-colors">Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <>
                    {/* ── Section 3 · Dashboard counts ── */}
                    {/* Opportunity Value leads: the whole deal is what a forecast is read
                        for, and Total Expected is the milestone-plan slice of it. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch shrink-0">
                        <KpiCard label="Opportunity Value" value={fmt(totalOpportunity)} sub={`Across ${leadCount} ${leadCount === 1 ? 'lead' : 'leads'}`} icon={Wallet} tone="emerald" />
                        <KpiCard label="Total Expected" value={fmt(totalExpected)} sub={`${projectCount} projects · ${viewRows.length} milestones`} icon={TrendingUp} tone="blue" />
                        <KpiCard label="Forecast Leads" value={String(leadCount)} sub={`${clientCount} ${clientCount === 1 ? 'client' : 'clients'} · ${bdeCount} ${bdeCount === 1 ? 'BDE' : 'BDEs'}`} icon={Layers} tone="violet" />
                    </div>

                    {/* ── Section 4 · Forecast table — takes the height the sections above
                        leave over, so the scroll area ends at the bottom of the screen
                        whether the filters are open or hidden. ── */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden flex flex-col lg:flex-1 lg:min-h-0 print:block">
                        <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
                            <span className="text-[12px] font-bold text-slate-900 tracking-tight shrink-0">Forecast Milestones</span>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                                <ScopeCount value={companyCount} singular="Company" plural="Companies" />
                                <ScopeCount value={bdeCount} singular="BDE" plural="BDEs" />
                                <ScopeCount value={clientCount} singular="Client" plural="Clients" />
                                <ScopeCount value={projectCount} singular="Project" plural="Projects" />
                                <ScopeCount value={viewRows.length} singular="Milestone" plural="Milestones" />
                            </div>

                            <span className="xl:hidden text-[10px] text-slate-400 whitespace-nowrap print:hidden">
                                — scroll sideways for more columns
                            </span>

                            {companyGroups.length > 0 && (
                                <DepthControl depthHint={depthHint} onPick={expandToDepth} />
                            )}
                        </div>

                        {/* The table renders even with no rows: the columns stay visible and
                            the page keeps its shape while filters are being changed, so
                            narrowing a filter to nothing does not make the whole grid
                            vanish and reappear. */}
                        <div className="overflow-auto flex-1 min-h-[240px] overscroll-x-contain print:overflow-visible print:min-h-0">
                                {/* One scroll container for the whole table. Every block inside is
                                    its own table sharing ForecastColgroup and this min-width, so a
                                    single horizontal scrollbar moves all columns in step. A tinted
                                    canvas makes the gap between company blocks read as a deliberate
                                    separator rather than a rendering seam. */}
                                <div className="bg-slate-100/70" style={{ minWidth: FORECAST_MIN_WIDTH }}>

                                    {/* Column header — once for the whole table, pinned to the top of
                                        the scroll area, carrying its own solid fill so the rows
                                        scrolling beneath it never show through. */}
                                    <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-700 to-blue-800 border-b-2 border-blue-900/40 shadow-sm print:static print:bg-none print:bg-slate-100 print:border-slate-300">
                                        <table className="w-full border-collapse table-fixed">
                                            <ForecastColgroup />
                                            <thead>
                                                <ForecastHeadRow sortConfig={sortConfig} onSort={handleSort} />
                                            </thead>
                                        </table>
                                    </div>

                                    {/* Empty state sits under the live column header, on the same
                                        white canvas the company blocks use. */}
                                    {viewRows.length === 0 && (
                                        <div className="bg-white py-14 text-center">
                                            <span className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <ClipboardList size={20} className="text-slate-300" />
                                            </span>
                                            <p className="text-[13px] font-semibold text-slate-700">No forecasted milestones for the selected filters</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {activeFilterCount > 0 ? 'Try widening the date range or clearing a filter.' : 'Nothing has been forecast for this scope yet.'}
                                            </p>
                                            {activeFilterCount > 0 && (
                                                <button
                                                    onClick={handleReset}
                                                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 px-3 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                                >
                                                    <RefreshCw size={12} /> Clear all filters
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* One block per company: a band naming the company, then a band
                                        per BDE inside it, then that BDE's clients, projects and
                                        milestones. */}
                                    {displayBlocks.map(({ cg, bdeBlocks, collapsed: companyCollapsed }) => (
                                        <div key={cg.key} className="bg-white mb-2 last:mb-0 print:break-inside-auto">
                                            <table className="w-full border-collapse table-fixed">
                                                <ForecastColgroup />
                                                <tbody>
                                                    {/* ── Company band — sticks beneath the column header so
                                                        the company stays named while its rows scroll, and
                                                        toggles its whole block open or closed. ── */}
                                                    <tr
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => toggleCompany(cg.key)}
                                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCompany(cg.key); } }}
                                                        className={clsx('cursor-pointer select-none', ROW_FOCUS)}
                                                        style={{ height: 54 }}
                                                        title={`${companyCollapsed ? 'Expand' : 'Collapse'} ${cg.company}`}
                                                    >
                                                        <td colSpan={3} className={clsx('px-2 py-1.5 align-middle leading-tight', FROZEN, COMPANY_CELL, LEVEL_BAR.company)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN_BAND }}>
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <ChevronRight
                                                                    size={13}
                                                                    className={clsx('shrink-0 text-blue-600 transition-transform duration-200', !companyCollapsed && 'rotate-90')}
                                                                />
                                                                <Building2 size={13} className="text-blue-700 shrink-0" />
                                                                <span className="text-[13.5px] font-bold uppercase tracking-tight text-blue-950 truncate" title={cg.company}>
                                                                    {cg.company}
                                                                </span>
                                                            </div>
                                                            <span className="block text-[12px] text-blue-900 truncate mt-px">
                                                                {cg.bdes.length} {cg.bdes.length === 1 ? 'BDE' : 'BDEs'} · {cg.clients} {cg.clients === 1 ? 'Client' : 'Clients'} · {cg.projects} {cg.projects === 1 ? 'Project' : 'Projects'} · {cg.milestones} {cg.milestones === 1 ? 'Milestone' : 'Milestones'}
                                                            </span>
                                                        </td>
                                                        <GroupMoneyCells expected={cg.expected} cellClass={COMPANY_CELL} frozenZ={Z_FROZEN_BAND} />
                                                    </tr>

                                                    {!companyCollapsed && bdeBlocks.map(({ bg, rows: blockRows, collapsed: bdeCollapsed }) => (
                                                        <React.Fragment key={bg.key}>
                                                            {/* ── BDE band — the executive who owns the rows
                                                                beneath it, and the toggle for them. ── */}
                                                            <tr
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => toggleBde(bg.key)}
                                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBde(bg.key); } }}
                                                                style={{ height: 50 }}
                                                                className={clsx('cursor-pointer select-none bg-indigo-100 hover:bg-indigo-200 border-y border-indigo-200 transition-colors', ROW_FOCUS)}
                                                                title={`${bdeCollapsed ? 'Expand' : 'Collapse'} ${bg.bde}`}
                                                            >
                                                                <td colSpan={3} className={clsx('px-2 py-1 align-middle leading-tight bg-inherit', FROZEN, LEVEL_BAR.bde)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN }}>
                                                                    <span className="flex items-center gap-1.5 min-w-0">
                                                                        <ChevronRight
                                                                            size={12}
                                                                            className={clsx('shrink-0 text-indigo-500 transition-transform duration-200', !bdeCollapsed && 'rotate-90')}
                                                                        />
                                                                        <span className="text-[13px] font-bold uppercase tracking-wide text-slate-800 truncate" title={bg.bde}>
                                                                            {bg.bde}
                                                                        </span>
                                                                    </span>
                                                                    <span className="block text-[12px] text-slate-700 truncate mt-px">
                                                                        {bg.clientCount} {bg.clientCount === 1 ? 'Client' : 'Clients'} · {bg.projects} {bg.projects === 1 ? 'Project' : 'Projects'} · {bg.milestones} {bg.milestones === 1 ? 'Milestone' : 'Milestones'}
                                                                    </span>
                                                                </td>
                                                                <GroupMoneyCells expected={bg.expected} />
                                                            </tr>

                                                            {!bdeCollapsed && blockRows.map(item => {
                                                                if (item.kind === 'projectTotal') {
                                                                    return (
                                                                        <SubtotalRow
                                                                            key={item.key}
                                                                            label={item.label}
                                                                            meta={item.meta}
                                                                            tint="bg-amber-50 hover:bg-amber-100 border-amber-200 transition-colors"
                                                                            accent="text-amber-600"
                                                                            labelClass="text-amber-900"
                                                                            accentBar={LEVEL_BAR.project}
                                                                            indent={30}
                                                                            labelLeft={FREEZE_LEFT.label}
                                                                            onToggle={() => toggleProject(item.groupKey)}
                                                                            collapsed={item.collapsed}
                                                                        >
                                                                            <GroupMoneyCells expected={item.group.expected} />
                                                                        </SubtotalRow>
                                                                    );
                                                                }
                                                                if (item.kind === 'clientTotal') {
                                                                    return (
                                                                        <SubtotalRow
                                                                            key={item.key}
                                                                            label={item.label}
                                                                            meta={item.meta}
                                                                            tint="bg-sky-100 hover:bg-sky-200 border-sky-300 transition-colors"
                                                                            accent="text-sky-700"
                                                                            labelClass="text-sky-950"
                                                                            accentBar={LEVEL_BAR.client}
                                                                            indent={8}
                                                                            labelLeft={FREEZE_LEFT.label}
                                                                            onToggle={() => toggleClient(item.groupKey)}
                                                                            collapsed={item.collapsed}
                                                                        >
                                                                            <GroupMoneyCells expected={item.group.expected} />
                                                                        </SubtotalRow>
                                                                    );
                                                                }
                                                                const d = item;
                                                                const r = d.r;
                                                                const isDelayed = !!r.edc && dayjs(r.edc).isBefore(dayjs().startOf('day'));
                                                                return (
                                                                    <tr
                                                                        key={d.key}
                                                                        // Taller than the Report's rows: the BANT cell
                                                                        // stacks three lines, and they need room to
                                                                        // breathe inside the row rather than stretch it.
                                                                        style={{ height: 78 }}
                                                                        className={clsx(
                                                                            'border-b border-slate-100 transition-colors duration-150',
                                                                            // A row's own tint is reserved for the one state
                                                                            // that needs attention at a glance; everything
                                                                            // else gets a subtle zebra stripe so a long run
                                                                            // stays scannable across empty cells.
                                                                            isDelayed
                                                                                ? 'bg-rose-50 hover:bg-rose-100'
                                                                                : d.zebra
                                                                                    ? 'bg-slate-50 hover:bg-slate-100'
                                                                                    : 'bg-white hover:bg-slate-50'
                                                                        )}
                                                                    >
                                                                        {/* Client and Project both name themselves in the
                                                                            lines that open their runs, so a milestone row
                                                                            leaves this column empty. */}
                                                                        <td className={clsx('px-2 py-1 align-middle bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN }} />
                                                                        {/* Product and Vertical describe the project, so
                                                                            they print once per run. */}
                                                                        <GroupCell
                                                                            show={d.firstOfProject}
                                                                            title={
                                                                                <span className="text-[11.5px] text-slate-700 truncate" title={d.product}>
                                                                                    {d.product}
                                                                                </span>
                                                                            }
                                                                            meta={d.vertical}
                                                                            left={FREEZE_LEFT.productVertical}
                                                                        />
                                                                        {/* The milestone is the row itself — always printed. */}
                                                                        <td className={clsx('px-2 py-1 align-middle leading-tight text-center bg-inherit', FROZEN)} style={{ left: FREEZE_LEFT.milestone, zIndex: Z_FROZEN }}>
                                                                            <span className="block text-[12.5px] font-medium text-slate-700 truncate" title={r.milestone_type}>
                                                                                {r.milestone_type}
                                                                            </span>
                                                                        </td>
                                                                        <td className={clsx('px-2 py-1 text-center align-middle whitespace-nowrap bg-inherit', FROZEN, FROZEN_EDGE)} style={{ left: FREEZE_LEFT.expected, zIndex: Z_FROZEN }}>
                                                                            <Amount value={r.expected_amount} />
                                                                        </td>
                                                                        {/* Quadrant, then BANT, then CP — one per line, each
                                                                            centred on the same axis, so the three read down
                                                                            the cell instead of competing across it. The
                                                                            badges are trimmed from the default pill to keep
                                                                            three lines inside the row height. Both scores
                                                                            carry their denominator, so a bare number can
                                                                            never be read against the wrong scale. */}
                                                                        <td className="px-2 py-2 align-middle">
                                                                            <div className="flex flex-col items-center gap-1.5 leading-tight">
                                                                                <span className={clsx('badge !px-2.5 !py-0.5 !text-[10px]', qBadge(r.quadrant || ''))}>
                                                                                    {r.quadrant || 'N/A'}
                                                                                </span>
                                                                                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                                                    BANT <span className="text-[11px] font-bold text-slate-800 tabular-nums">{r.bant_score ?? 0}</span>
                                                                                    <span className="text-slate-400">/28</span>
                                                                                </span>
                                                                                <span className={clsx('badge !px-2.5 !py-0.5 !text-[10px]', (r.cp_score || 0) > 6 ? 'badge-green' : 'badge-red')}>
                                                                                    CP {r.cp_score || 0}/10
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center align-middle text-[11.5px] text-slate-600 tabular-nums">
                                                                            {r.device_count ?? <span className="text-slate-300">—</span>}
                                                                        </td>
                                                                        {/* The opportunity is the whole deal; the milestone
                                                                            amount is a slice of it, so it sits in plainer ink. */}
                                                                        <td className="px-2 py-1 text-center align-middle whitespace-nowrap">
                                                                            {r.opportunity_value
                                                                                ? <Amount value={r.opportunity_value} muted />
                                                                                : <span className="text-slate-300 text-[12px]">—</span>}
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center align-middle whitespace-nowrap text-[11px] text-slate-600 tabular-nums">
                                                                            {r.edc ? dayjs(r.edc).format('DD-MMM-YY') : <span className="text-slate-300">—</span>}
                                                                        </td>
                                                                        <td className="px-2 py-1 align-middle text-[11px] text-slate-600 truncate" title={r.sales_activity_remarks || ''}>
                                                                            {r.sales_activity_remarks || <span className="text-slate-300">—</span>}
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center align-middle print:hidden">
                                                                            <Link
                                                                                to={`/cashflow/forecast/${r.forecast_id}`}
                                                                                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-2 py-1 rounded-lg transition-colors"
                                                                            >
                                                                                <Eye size={11} /> View
                                                                            </Link>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}

                                    {/* Grand Total — pinned to the bottom of the scroll area: every
                                        company on this page's parent set rolled up. Nothing to total
                                        means no bar; the column header alone carries the empty view. */}
                                    {viewRows.length > 0 && (
                                    <div className="sticky bottom-0 z-10 print:static">
                                        <div className="border-t-2 border-blue-400 shadow-[0_-4px_12px_-6px_rgba(16,24,40,0.25)]">
                                            <table className="w-full border-collapse table-fixed">
                                                <ForecastColgroup />
                                                <tbody>
                                                    <tr style={{ height: 52 }}>
                                                        <td colSpan={3} className={clsx('px-2 py-1.5 align-middle', FROZEN, GRAND_TOTAL_TD)} style={{ left: FREEZE_LEFT.label, zIndex: Z_FROZEN }}>
                                                            <span className="block text-[12px] font-bold uppercase tracking-wider text-blue-950 leading-tight">
                                                                Grand Total
                                                            </span>
                                                            <span className="block text-[11px] text-blue-900 leading-tight truncate">
                                                                {companyCount} {companyCount === 1 ? 'Company' : 'Companies'} · {bdeCount} {bdeCount === 1 ? 'BDE' : 'BDEs'} · {clientCount} {clientCount === 1 ? 'Client' : 'Clients'} · {projectCount} {projectCount === 1 ? 'Project' : 'Projects'} · {viewRows.length} {viewRows.length === 1 ? 'Milestone' : 'Milestones'}
                                                            </span>
                                                        </td>
                                                        <GroupMoneyCells expected={totalExpected} cellClass={GRAND_TOTAL_TD} />
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    )}
                                </div>
                        </div>

                        {viewRows.length > 0 && totalPages > 1 && (
                            <div className="px-3 sm:px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
                                <p className="text-[11px] text-slate-500">
                                    Showing companies {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, companyGroups.length)} of {companyGroups.length}
                                    <span className="text-slate-400"> · {bdeCount} BDEs · {clientCount} clients · {projectCount} projects · {viewRows.length} milestones total</span>
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 disabled:hover:bg-white hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-xs font-semibold text-slate-600 px-2">Page {page} of {totalPages}</span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-500 bg-white border border-slate-200 disabled:opacity-40 disabled:hover:bg-white hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
