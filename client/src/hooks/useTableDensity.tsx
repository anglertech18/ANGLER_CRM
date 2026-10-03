import { useState, useCallback } from 'react';

export type Density = 'compact' | 'comfortable' | 'spacious';

const DENSITY_STYLES: Record<Density, { rowClass: string; textClass: string; cellPadding: string }> = {
  compact:     { rowClass: 'table-tr-compact',     textClass: 'text-[11px]', cellPadding: 'py-1'   },
  comfortable: { rowClass: 'table-tr-comfortable', textClass: 'text-[12px]', cellPadding: 'py-1.5' },
  spacious:    { rowClass: 'table-tr-spacious',    textClass: 'text-[12.5px]', cellPadding: 'py-2'   },
};

export function useTableDensity(pageKey: string, defaultDensity: Density = 'comfortable') {
  const storageKey = `density_${pageKey}`;
  const [density, setDensityState] = useState<Density>(() => {
    try {
      return (localStorage.getItem(storageKey) as Density) || defaultDensity;
    } catch { return defaultDensity; }
  });

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try { localStorage.setItem(storageKey, d); } catch {}
  }, [storageKey]);

  return { density, setDensity, styles: DENSITY_STYLES[density] };
}

// ─── DensityToggle ─────────────────────────────────────────────────────────────

const DENSITY_OPTIONS: { value: Density; icon: string; title: string }[] = [
  { value: 'compact',     icon: '≡≡', title: 'Compact' },
  { value: 'comfortable', icon: '≡',  title: 'Comfortable' },
  { value: 'spacious',    icon: '⋮',  title: 'Spacious' },
];

export function DensityToggle({
  density,
  setDensity,
}: {
  density: Density;
  setDensity: (d: Density) => void;
}) {
  return (
    <div
      className="flex border border-slate-200 rounded-md overflow-hidden"
      role="group"
      aria-label="Table density"
    >
      {DENSITY_OPTIONS.map((opt) => {
        const isActive = density === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setDensity(opt.value)}
            title={opt.title}
            className={
              isActive
                ? 'px-2.5 py-1.5 text-[11px] font-medium cursor-pointer bg-slate-800 text-white'
                : 'px-2.5 py-1.5 text-[11px] font-medium cursor-pointer bg-white text-slate-500 border-r border-slate-200 last:border-r-0 hover:bg-slate-50 transition-colors'
            }
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
