import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface TablePaginationProps {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
    itemLabel?: string;
    pageSizeOptions?: number[];
    onPageSizeChange?: (size: number) => void;
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

export default function TablePagination({
    page,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    isLoading = false,
    itemLabel = 'records',
    pageSizeOptions,
    onPageSizeChange,
}: TablePaginationProps) {
    const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRecord = Math.min(page * pageSize, totalCount);
    const pageNumbers = getPageNumbers(page, totalPages);

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                    {totalCount === 0
                        ? <>0 {itemLabel}</>
                        : <>Showing <span className="font-semibold text-slate-700">{startRecord}–{endRecord}</span> of <span className="font-semibold text-slate-700">{totalCount}</span> {itemLabel}</>}
                </span>
                {pageSizeOptions && onPageSizeChange && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Rows:</span>
                        <select
                            value={pageSize}
                            onChange={e => onPageSizeChange(Number(e.target.value))}
                            className="form-select py-1 text-xs"
                            style={{ width: 64 }}
                        >
                            {pageSizeOptions.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                        disabled={page <= 1 || isLoading}
                        className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:border-slate-200 border border-transparent disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={13} /> Prev
                    </button>
                    {pageNumbers.map((n, i) =>
                        n === '...' ? (
                            <span key={`el-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
                        ) : (
                            <button
                                key={n}
                                onClick={() => onPageChange(n)}
                                className={clsx(
                                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                                    n === page
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                        : 'text-slate-600 hover:bg-white border-transparent hover:border-slate-200'
                                )}
                            >
                                {n}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages || isLoading}
                        className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:border-slate-200 border border-transparent disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                    >
                        Next <ChevronRight size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}
