import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

interface Option {
  value: string | number;
  label: string;
}

interface Props {
  options: Option[];
  value: string | number | '';
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Find currently selected option
  const selectedOption = options.find((o) => o.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-1.5 text-left border rounded-lg text-[12px] bg-white transition-all',
          disabled ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 hover:border-slate-300 text-slate-700',
          isOpen && 'ring-2 ring-indigo-500/20 border-indigo-500'
        )}
      >
        <span className={clsx(!selectedOption && 'text-slate-400', 'truncate')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1.5 pl-2">
          {value !== '' && !disabled && (
            <span
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[200px]">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/50">
            <Search size={12} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent border-0 outline-none text-[11px] p-0 text-slate-700 placeholder-slate-400 focus:ring-0"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={10} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 transition-colors truncate',
                      isSelected ? 'bg-indigo-50/50 text-indigo-600 font-semibold' : 'text-slate-600'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
