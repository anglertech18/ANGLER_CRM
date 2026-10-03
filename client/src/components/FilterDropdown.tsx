import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import clsx from 'clsx';

export interface FilterOption { value: string; label: string; }

/* ── Searchable multi-select (checkbox list + type-to-search) ── */
interface MultiProps {
    options: FilterOption[];
    values: string[];
    onChange: (vals: string[]) => void;
    placeholder: string;
    className?: string;
    allLabel?: string; // when provided, shows a pseudo "All ..." row that clears the selection
    searchPlaceholder?: string;
}
export const SearchableMultiSelect = ({
    options, values, onChange, placeholder, className, allLabel, searchPlaceholder = 'Search…',
}: MultiProps) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const btnRef = React.useRef<HTMLButtonElement>(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

    const openDrop = () => {
        if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 4, left: r.left, width: r.width });
        }
        setOpen(v => !v);
        setSearch('');
    };

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggle = (val: string) => {
        const next = values.includes(val) ? values.filter(v => v !== val) : [...values, val];
        onChange(next);
    };

    const filteredOptions = search.trim()
        ? options.filter(o => o.label.toLowerCase().includes(search.trim().toLowerCase()))
        : options;

    const labels = values.map(v => options.find(o => o.value === v)?.label).filter(Boolean);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={openDrop}
                className={clsx('form-select py-2 text-left flex items-center gap-1 cursor-pointer', className)}
            >
                <span className="truncate text-sm flex-1 text-left">
                    {values.length === 0
                        ? <span className="text-slate-400">{placeholder}</span>
                        : values.length <= 2 ? labels.join(', ')
                        : `${values.length} selected`}
                </span>
                <ChevronDown size={11} className="text-slate-400 shrink-0" />
            </button>
            {open && createPortal(
                <div
                    style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 180), zIndex: 99999 }}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-64"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-100 shrink-0">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full text-xs outline-none bg-transparent"
                        />
                    </div>
                    <div className="overflow-auto">
                        {allLabel && (
                            <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-50">
                                <input
                                    type="checkbox"
                                    checked={values.length === 0}
                                    onChange={() => onChange([])}
                                    className="rounded border-slate-300 text-primary-600"
                                />
                                {allLabel}
                            </label>
                        )}
                        {filteredOptions.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-slate-400 text-center">No matches</p>
                        ) : filteredOptions.map(opt => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                            >
                                <input
                                    type="checkbox"
                                    checked={values.includes(opt.value)}
                                    onChange={() => toggle(opt.value)}
                                    className="rounded border-slate-300 text-primary-600"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

/* ── Searchable single-select (native-select replacement with type-to-search) ── */
interface SingleProps {
    options: FilterOption[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    className?: string;
    searchPlaceholder?: string;
}
export const SearchableSelect = ({
    options, value, onChange, placeholder, className, searchPlaceholder = 'Search…',
}: SingleProps) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const btnRef = React.useRef<HTMLButtonElement>(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

    const openDrop = () => {
        if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 4, left: r.left, width: r.width });
        }
        setOpen(v => !v);
        setSearch('');
    };

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const filteredOptions = search.trim()
        ? options.filter(o => o.label.toLowerCase().includes(search.trim().toLowerCase()))
        : options;

    const selectedLabel = options.find(o => o.value === value)?.label;

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={openDrop}
                className={clsx('form-select py-2 text-left flex items-center gap-1 cursor-pointer', className)}
            >
                <span className="truncate text-sm flex-1 text-left">
                    {!value || !selectedLabel
                        ? <span className="text-slate-400">{placeholder}</span>
                        : selectedLabel}
                </span>
                <ChevronDown size={11} className="text-slate-400 shrink-0" />
            </button>
            {open && createPortal(
                <div
                    style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 180), zIndex: 99999 }}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-64"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-100 shrink-0">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full text-xs outline-none bg-transparent"
                        />
                    </div>
                    <div className="overflow-auto">
                        <div
                            onClick={() => { onChange(''); setOpen(false); }}
                            className={clsx(
                                'px-3 py-2 cursor-pointer text-sm hover:bg-slate-50',
                                !value ? 'text-primary-700 font-semibold bg-primary-50/60' : 'text-slate-700'
                            )}
                        >
                            {placeholder}
                        </div>
                        {filteredOptions.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-slate-400 text-center">No matches</p>
                        ) : filteredOptions.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={clsx(
                                    'px-3 py-2 cursor-pointer text-sm hover:bg-slate-50',
                                    value === opt.value ? 'text-primary-700 font-semibold bg-primary-50/60' : 'text-slate-700'
                                )}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
