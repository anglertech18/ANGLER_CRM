import React from 'react';
import { ChevronUp, ChevronDown, Inbox, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export interface TableColumn<T> {
    key: string;
    header: React.ReactNode;
    render: (row: T, index: number) => React.ReactNode;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    /** Header-only alignment override; defaults to `align` when omitted so body cells are unaffected. */
    headerAlign?: 'left' | 'center' | 'right';
    width?: string;
    className?: string;
    thClassName?: string;
    sticky?: boolean;
}

export interface TableSort {
    field: string;
    order: 'asc' | 'desc';
}

interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    getRowKey: (row: T, index: number) => React.Key;
    isLoading?: boolean;
    isFetching?: boolean;
    isError?: boolean;
    error?: any;
    sort?: TableSort;
    onSort?: (field: string) => void;
    onRowClick?: (row: T) => void;
    rowClassName?: (row: T) => string;
    skeletonRows?: number;
    emptyIcon?: React.ReactNode;
    emptyTitle?: string;
    emptySubtitle?: string;
    className?: string;
    /** Bounds the table in a scrollable region (e.g. 'max-h-[65vh]') so the sticky header sticks within the card instead of the page. */
    maxHeight?: string;
}

const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

function SortIcon({ field, sort }: { field: string; sort?: TableSort }) {
    if (!sort || sort.field !== field) return null;
    return sort.order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

export default function Table<T>({
    columns,
    data,
    getRowKey,
    isLoading = false,
    isFetching = false,
    isError = false,
    error,
    sort,
    onSort,
    onRowClick,
    rowClassName,
    skeletonRows = 6,
    emptyIcon,
    emptyTitle = 'No records found',
    emptySubtitle,
    className,
    maxHeight,
}: TableProps<T>) {
    if (isError) {
        return (
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">
                    {(error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong'}
                </span>
            </div>
        );
    }

    return (
        <div className={clsx('overflow-auto', maxHeight, className)}>
            <table className="table-base">
                <thead className="table-head">
                    <tr>
                        {columns.map(col => {
                            const headerAlign = col.headerAlign ?? col.align;
                            return (
                                <th
                                    key={col.key}
                                    className={clsx(
                                        col.sortable ? 'table-th-sortable' : 'table-th',
                                        alignClass(headerAlign),
                                        col.width,
                                        col.sticky && 'sticky right-0 bg-slate-50',
                                        col.thClassName
                                    )}
                                    onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                                >
                                    <span className={clsx('flex items-center gap-1', headerAlign === 'center' && 'justify-center', headerAlign === 'right' && 'justify-end')}>
                                        {col.header}
                                        {col.sortable && <SortIcon field={col.key} sort={sort} />}
                                    </span>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className={clsx('divide-y divide-slate-50', (isLoading || isFetching) && 'opacity-60')}>
                    {isLoading ? (
                        [...Array(skeletonRows)].map((_, i) => (
                            <tr key={i} className="table-tr">
                                {columns.map(col => (
                                    <td key={col.key} className="table-td">
                                        <div className="skeleton h-4 rounded w-20" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length}>
                                <div className="empty-state">
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                        {emptyIcon ?? <Inbox size={22} className="text-slate-400" />}
                                    </div>
                                    <p className="text-sm font-semibold text-slate-600">{emptyTitle}</p>
                                    {emptySubtitle && <p className="text-xs text-slate-400 mt-1">{emptySubtitle}</p>}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        data.map((row, i) => (
                            <tr
                                key={getRowKey(row, i)}
                                className={clsx('table-tr', onRowClick && 'cursor-pointer', 'group', rowClassName?.(row))}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                            >
                                {columns.map(col => (
                                    <td
                                        key={col.key}
                                        className={clsx(
                                            'table-td',
                                            alignClass(col.align),
                                            col.sticky && 'sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]',
                                            col.className
                                        )}
                                    >
                                        {col.render(row, i)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
