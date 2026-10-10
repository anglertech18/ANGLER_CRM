import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, ArrowUpDown, Menu, Check, X } from 'lucide-react';
import clsx from 'clsx';

export interface DataTableHeaderFilterProps {
  title: string;
  field: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  allValues: string[];
  selectedValues: Set<string>;
  onFilterChange: (newSelected: Set<string>) => void;
  align?: 'left' | 'center' | 'right';
  popoverAlign?: 'left' | 'right';
  className?: string;
}

export default function DataTableHeaderFilter({
  title,
  field,
  sortField = '',
  sortOrder = 'asc',
  onSort,
  allValues = [],
  selectedValues = new Set(),
  onFilterChange,
  align = 'left',
  popoverAlign = 'left',
  className = '',
}: DataTableHeaderFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSorted = sortField === field;
  const isFiltered = selectedValues.size > 0 && selectedValues.size < allValues.length;

  const filteredValues = useMemo(() => {
    if (!menuSearch.trim()) return allValues;
    const q = menuSearch.toLowerCase();
    return allValues.filter(v => String(v).toLowerCase().includes(q));
  }, [allValues, menuSearch]);

  const handleToggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 256;
      let left = popoverAlign === 'right' ? rect.right - popoverWidth : rect.left;
      
      // Keep inside screen bounds
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      setPopoverCoords({
        top: rect.bottom + 6 + window.scrollY,
        left: left + window.scrollX,
      });
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const selectAll = () => onFilterChange(new Set(allValues));
  const deselectAll = () => onFilterChange(new Set());

  const toggleValue = (val: string) => {
    const next = new Set(selectedValues);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onFilterChange(next);
  };

  return (
    <th className={clsx('p-3 relative select-none font-bold text-[10px] tracking-wider uppercase text-slate-700 bg-slate-100 border-b border-slate-300', align === 'center' && 'text-center', align === 'right' && 'text-right', className)}>
      <div className={clsx('flex items-center gap-1.5', align === 'center' && 'justify-center', align === 'right' && 'justify-end')}>
        <span>{title}</span>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onSort && (
            <button
              type="button"
              onClick={() => {
                if (!isSorted) onSort(field, 'asc');
                else if (sortOrder === 'asc') onSort(field, 'desc');
                else onSort('', 'asc');
              }}
              className={clsx(
                'p-0.5 rounded hover:bg-slate-200 transition-colors',
                isSorted ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              )}
              title="Sort Column"
            >
              {isSorted ? (sortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
            </button>
          )}

          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggleOpen}
            className={clsx(
              'p-0.5 rounded transition-colors',
              isFiltered ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
            )}
            title="Column Filter Menu"
          >
            <Menu size={11} />
          </button>
        </div>
      </div>

      {/* Render Popover via React Portal on document.body to prevent table container overflow clipping! */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{ top: `${popoverCoords.top}px`, left: `${popoverCoords.left}px` }}
          className="absolute z-[9999] w-64 bg-white text-slate-800 rounded-2xl shadow-2xl p-3 text-xs text-left normal-case font-normal border border-slate-200 animate-in fade-in zoom-in-95"
        >
          {/* Select All / Deselect All Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px]">
            <button type="button" onClick={selectAll} className="text-blue-600 hover:text-blue-800 font-bold">
              Select ({allValues.length})
            </button>
            <button type="button" onClick={deselectAll} className="text-slate-500 hover:text-slate-700 font-medium">
              Deselect ({allValues.length - selectedValues.size})
            </button>
          </div>

          {/* Inner Filter Search Box */}
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search options..."
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Value Checkbox List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {filteredValues.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2 text-center">No matching options</p>
            ) : (
              filteredValues.map(val => {
                const checked = selectedValues.has(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleValue(val)}
                    className={clsx(
                      'w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors',
                      checked ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <span className="truncate">{val}</span>
                    {checked && <Check size={13} className="text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Sort & Reset Actions inside Popover */}
          <div className="pt-2 mt-2 border-t border-slate-100 space-y-1 text-[11px]">
            {onSort && (
              <>
                <button
                  type="button"
                  onClick={() => { onSort(field, 'asc'); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 font-medium"
                >
                  <ArrowUp size={11} className="text-slate-400" /> Sort Ascending
                </button>
                <button
                  type="button"
                  onClick={() => { onSort(field, 'desc'); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 font-medium"
                >
                  <ArrowDown size={11} className="text-slate-400" /> Sort Descending
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { onFilterChange(new Set(allValues)); if (onSort) onSort('', 'asc'); setIsOpen(false); }}
              className="w-full text-left px-2 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-red-600 font-semibold"
            >
              <X size={11} /> Clear sort & filters
            </button>
          </div>
        </div>,
        document.body
      )}
    </th>
  );
}
