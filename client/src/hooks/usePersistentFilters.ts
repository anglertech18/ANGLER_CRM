import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation, type NavigateFunction } from 'react-router-dom';

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

/*
 * ── Query-string write batcher ────────────────────────────────────────────────
 * React Router's setSearchParams / navigate is imperative, not a reducer: two
 * calls fired synchronously in the same handler both read the *same* pre-render
 * URL, so the second navigate clobbers the first. That breaks any screen that
 * updates more than one filter at once — notably the SEAL global filter, which
 * sets Product and clears BDE (and sometimes resets a submodule's local filters)
 * in a single click, across two or three different usePersistentFilters
 * instances.
 *
 * So every write goes through one shared microtask-batched buffer: the first
 * write in a tick snapshots the live query string, each write mutates that one
 * buffer, and a single navigate() flushes it. All instances share the buffer, so
 * cross-namespace updates compose too.
 */
let batchParams: URLSearchParams | null = null;
let batchNavigate: NavigateFunction | null = null;
let batchPathname = '';
let batchScheduled = false;

function flushParamUpdates() {
    const params = batchParams;
    const navigate = batchNavigate;
    const pathname = batchPathname;
    batchParams = null;
    batchNavigate = null;
    batchPathname = '';
    batchScheduled = false;
    if (!params || !navigate) return;
    const qs = params.toString();
    // Absolute pathname (router-relative, basename already stripped) so the nav
    // stays on the current page — `navigate` is scoped to whichever hook instance
    // called it, and a bare `{search}` would resolve against that route (e.g. the
    // SEAL provider sits on `/seal`, which would bounce POA back to the index).
    navigate({ pathname, search: qs ? `?${qs}` : '' }, { replace: true });
}

function queueParamUpdate(navigate: NavigateFunction, pathname: string, mutate: (p: URLSearchParams) => void) {
    if (!batchScheduled) {
        batchParams = new URLSearchParams(window.location.search);
        batchScheduled = true;
        queueMicrotask(flushParamUpdates);
    }
    batchNavigate = navigate;
    batchPathname = pathname;
    mutate(batchParams!);
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
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    // Freeze keys array so it's stable across renders
    const keys = useMemo(() => Object.keys(defaults) as (keyof T & string)[], []); // eslint-disable-line react-hooks/exhaustive-deps

    // Write this namespace's non-default keys (as currently in `p`) to localStorage.
    const persist = useCallback((p: URLSearchParams) => {
        const toStore: Record<string, string> = {};
        keys.forEach(k => {
            const val = p.get(k);
            if (val !== null) toStore[k] = val;
        });
        if (Object.keys(toStore).length > 0) lsSave(namespace, toStore);
        else lsClear(namespace);
    }, [keys, namespace]);

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
                queueParamUpdate(navigate, pathname, p => {
                    keys.forEach(k => {
                        if (stored[k] !== undefined && stored[k] !== String(defaults[k])) {
                            p.set(k, stored[k]);
                        }
                    });
                });
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
        queueParamUpdate(navigate, pathname, p => {
            Object.entries(updates).forEach(([k, v]) => {
                if (!keys.includes(k as any)) return;
                if (v === undefined || v === null || String(v) === String(defaults[k])) {
                    p.delete(k);
                } else {
                    p.set(k, String(v));
                }
            });
            persist(p);
        });
    }, [navigate, pathname, keys, persist]); // eslint-disable-line react-hooks/exhaustive-deps

    const resetFilters = useCallback(() => {
        queueParamUpdate(navigate, pathname, p => {
            keys.forEach(k => p.delete(k));
        });
        lsClear(namespace);
    }, [navigate, pathname, keys, namespace]);

    return { filters, setFilters, resetFilters };
}
