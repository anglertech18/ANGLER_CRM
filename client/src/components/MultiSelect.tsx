import React, { useState, useRef, useEffect } from 'react';
import { X, Search, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    value: string; // Comma-separated string
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    error?: string;
    // Compact variant — a shorter trigger (min-h 40px) so the control can sit
    // inline in a filter bar next to the other pill-shaped filters. Defaults to
    // the taller standalone form height so existing callers are unaffected.
    compact?: boolean;
    className?: string;
}

export default function MultiSelect({
    options,
    value,
    onChange,
    placeholder = 'Select options...',
    label,
    disabled = false,
    error,
    compact = false,
    className
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedValues = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleOption = (optionValue: string) => {
        let newValue: string[];
        if (selectedValues.includes(optionValue)) {
            newValue = selectedValues.filter(v => v !== optionValue);
        } else {
            newValue = [...selectedValues, optionValue];
        }
        onChange(newValue.join(', '));
    };

    const handleRemoveOption = (e: React.MouseEvent, optionValue: string) => {
        e.stopPropagation();
        const newValue = selectedValues.filter(v => v !== optionValue);
        onChange(newValue.join(', '));
    };

    return (
        <div className={clsx("w-full", className)} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">{label}</label>}

            <div className="relative">
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={clsx(
                        "w-full border transition-all cursor-pointer bg-white shadow-sm",
                        // Compact sits inline in a filter bar, so it holds one fixed row
                        // height and never wraps — a wrapping trigger grows taller than the
                        // pills beside it and breaks the row's alignment.
                        compact
                            ? "rounded-lg h-8 px-2 flex flex-nowrap items-center gap-1 overflow-hidden"
                            : "rounded-xl min-h-[42px] p-2 flex flex-wrap gap-1.5",
                        isOpen ? "border-orange-500 ring-4 ring-orange-500/10" : "border-gray-200 hover:border-orange-200",
                        disabled ? "bg-gray-100/50 cursor-not-allowed text-gray-400" : "bg-white",
                        error ? "border-red-300" : ""
                    )}
                >
                    {selectedValues.length > 0 ? (
                        selectedValues.map(v => {
                            const option = options.find(o => o.value === v);
                            const displayLabel = option ? option.label : v;
                            return (
                                <span
                                    key={v}
                                    className={clsx(
                                        'inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-100',
                                        compact ? 'px-1.5 py-0 text-[10px] shrink-0 max-w-[92px]' : 'px-2 py-0.5 text-xs'
                                    )}
                                >
                                    <span className={compact ? 'truncate' : undefined}>{displayLabel}</span>
                                    <button
                                        onClick={(e) => handleRemoveOption(e, v)}
                                        className="hover:text-blue-900 transition-colors shrink-0"
                                    >
                                        <X size={compact ? 11 : 12} />
                                    </button>
                                </span>
                            );
                        })
                    ) : (
                        <span className={clsx('text-gray-400 self-center truncate', compact ? 'text-[11px]' : 'text-sm ml-2')}>{placeholder}</span>
                    )}
                    
                    <div className={clsx('ml-auto self-center text-gray-400 shrink-0', compact ? 'pl-1' : 'pr-1')}>
                        <ChevronDown size={compact ? 13 : 16} className={clsx("transition-transform", isOpen && "rotate-180")} />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                            <Search size={14} className="text-gray-400 ml-1" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full text-sm bg-transparent outline-none py-1"
                                placeholder="Search leads..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto p-1 py-2">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(option => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleOption(option.value);
                                            }}
                                            className={clsx(
                                                "px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between transition-colors",
                                                isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                                            )}
                                        >
                                            {option.label}
                                            {isSelected && <Check size={14} />}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-400 text-xs italic">
                                    No leads available
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-[10px] mt-1 ml-1">{error}</p>}
        </div>
    );
}
