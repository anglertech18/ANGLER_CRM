import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type Primitive = string | number | boolean;
type FilterDefaults = Record<string, Primitive>;

const LS_PREFIX = 'crm_filters_';

function lsSave(ns: string, data: Record<string, string>) {
    try { localStorage.setItem(LS_PREFIX + ns, JSON.stringify(data)); } catch {}
}

function lsLoad(ns: string): Record<string, string> | null {
    try {
        const raw = localStorage.getItem(LS_PREFIX + ns);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function lsClear(ns: string) {
    try { localStorage.removeItem(LS_PREFIX + ns); } catch {}
}

/** Clear every persisted filter namespace — call on logout */
export function clearAllPersistedFilters() {
    try {
        Object.keys(localStorage)
            .filter(k => k.startsWith(LS_PREFIX))
            .forEach(k => localStorage.removeItem(k));
    } catch {}
}

function coerce<T extends Primitive>(val: string, ref: T): T {
    if (typeof ref === 'number') return (isNaN(Number(val)) ? ref : Number(val)) as T;
    if (typeof ref === 'boolean') return (val === 'true') as T;
    return val as T;
}

/**
 * Persists filter / pagination / sort state in URL query params (primary)
 * and localStorage (backup for link-based navigation).
 *
 * @param namespace  Unique key per page — e.g. 'leads', 'enquiry', 'report'
 * @param defaults   Default values; also defines which keys are tracked
 */
export function usePersistentFilters<T extends FilterDefaults>(
    namespace: string,
    defaults: T
): {
    filters: T;
    setFilters: (updates: Partial<T>) => void;
    resetFilters: () => void;
} {
    const [searchParams, setSearchParams] = useSearchParams();
    // Freeze keys array so it's stable across renders
    const keys = useMemo(() => Object.keys(defaults) as (keyof T & string)[], []); // eslint-disable-line react-hooks/exhaustive-deps

    // On mount: if URL has none of our tracked keys, restore from localStorage
    useEffect(() => {
        const hasUrlState = keys.some(k => searchParams.has(k));
        if (hasUrlState) {
            // URL already has state — sync it to localStorage so future link-navigations
            // can restore the same state.
            const toStore: Record<string, string> = {};
            keys.forEach(k => {
                const v = searchParams.get(k);
                if (v !== null) toStore[k] = v;
            });
            if (Object.keys(toStore).length > 0) lsSave(namespace, toStore);
        } else {
            // URL has no state — restore from localStorage if available
            const stored = lsLoad(namespace);
            if (stored && Object.keys(stored).length > 0) {
                const newParams = new URLSearchParams(searchParams);
                let changed = false;
                keys.forEach(k => {
                    if (stored[k] !== undefined && stored[k] !== String(defaults[k])) {
                        newParams.set(k, stored[k]);
                        changed = true;
                    }
                });
                if (changed) setSearchParams(newParams, { replace: true });
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Derive typed filter values — URL params are primary; fall back to localStorage
    // synchronously when URL has none of our keys (e.g. fresh navigation).
    // This ensures the FIRST render already reflects saved state so that component
    // effects (e.g. BDE auto-default guards on `!ef.selectedBdeId`) see the real
    // persisted value and don't overwrite it with the default before the restore
    // useEffect above has a chance to populate the URL.
    const filters = useMemo((): T => {
        const result = { ...defaults };
        const hasUrlState = keys.some(k => searchParams.has(k));
        if (hasUrlState) {
            keys.forEach(k => {
                const v = searchParams.get(k);
                if (v !== null) result[k] = coerce(v, defaults[k]) as T[typeof k];
            });
        } else {
            const stored = lsLoad(namespace);
            if (stored) {
                keys.forEach(k => {
                    if (stored[k] !== undefined) {
                        result[k] = coerce(stored[k], defaults[k]) as T[typeof k];
                    }
                });
            }
        }
        return result as T;
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    const setFilters = useCallback((updates: Partial<T>) => {
        const newParams = new URLSearchParams(searchParams);

        Object.entries(updates).forEach(([k, v]) => {
            if (!keys.includes(k as any)) return;
            if (v === undefined || v === null || String(v) === String(defaults[k])) {
                newParams.delete(k);
            } else {
                newParams.set(k, String(v));
            }
        });
        setSearchParams(newParams, { replace: true });

        // Persist non-default values to localStorage
        const toStore: Record<string, string> = {};
        keys.forEach(k => {
            const v = newParams.get(k);
            if (v !== null) toStore[k] = v;
        });
        if (Object.keys(toStore).length > 0) lsSave(namespace, toStore);
        else lsClear(namespace);
    }, [searchParams, setSearchParams, namespace]); // eslint-disable-line react-hooks/exhaustive-deps

    const resetFilters = useCallback(() => {
        const newParams = new URLSearchParams(searchParams);
        keys.forEach(k => newParams.delete(k));
        setSearchParams(newParams, { replace: true });
        lsClear(namespace);
    }, [searchParams, setSearchParams, namespace]); // eslint-disable-line react-hooks/exhaustive-deps

    return { filters, setFilters, resetFilters };
}
