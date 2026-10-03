import { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface Column {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface Props {
  columns: Column[];
  visible: Record<string, boolean>;
  onChange: (visible: Record<string, boolean>) => void;
}

export function ColumnPicker({ columns, visible, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggle = (key: string) => {
    onChange({ ...visible, [key]: !visible[key] });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'btn btn-ghost text-[12px] flex items-center gap-1.5',
          open && 'bg-slate-100',
        )}
      >
        <SlidersHorizontal size={13} />
        Columns
        <span className="text-[10px] text-slate-400">▾</span>
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-48"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
            Toggle Columns
          </p>
          {columns.map((col) => {
            const isVisible = visible[col.key] ?? col.defaultVisible ?? true;
            return (
              <label
                key={col.key}
                htmlFor={`col-picker-${col.key}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <input
                  id={`col-picker-${col.key}`}
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggle(col.key)}
                  className="rounded accent-indigo-600 cursor-pointer"
                />
                <span className="text-[12px] text-slate-700 select-none">{col.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
