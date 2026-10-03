import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useAuth } from './AuthContext';

const SEAL_GLOBAL_DEFAULTS = {
    company_id: 0,
    product_id: 0,
    bde_id: 0,
};

interface SealFilterContextValue {
    companyId: number | null;
    productId: number | null;
    bdeId: number | null;
    setCompanyId: (id: number | null) => void;
    setProductId: (id: number | null) => void;
    setBdeId: (id: number | null) => void;
    resetGlobalFilters: () => void;
}

const SealFilterContext = createContext<SealFilterContextValue | null>(null);

/**
 * Centralized SEAL "global filters" state (Company + Product + BDE) — shared across
 * every SEAL submodule (Dashboard, Weekly Summary, Lead Gen Summary, POA, Enquiry
 * Tracker). See Modules/seal_filter.md. Backed by the same usePersistentFilters
 * hook every other page already uses, just under one shared namespace so the
 * selection survives navigation between submodules.
 *
 * Company is the BU company that owns the product (product.company_id), the same
 * concept as the main Dashboard / Cash Flow Report "Company" filter — not the
 * customer/lead company.
 */
export function SealFilterProvider({ children }: { children: React.ReactNode }) {
    const { user: authUser } = useAuth();
    const { filters, setFilters, resetFilters } = usePersistentFilters('seal-global', SEAL_GLOBAL_DEFAULTS);

    const companyId = filters.company_id || null;
    const productId = filters.product_id || null;
    const bdeId = filters.bde_id || null;

    // Default BDE to the logged-in user only when no BDE is currently persisted
    // (single implementation — previously duplicated per-page).
    useEffect(() => {
        if (authUser?.id && !filters.bde_id) {
            setFilters({ bde_id: authUser.id });
        }
    }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const value = useMemo<SealFilterContextValue>(() => ({
        companyId,
        productId,
        bdeId,
        // Changing the Company drops the Product + BDE — they may not belong to the
        // new company (mirrors the Dashboard's Company → Product cascade). Batched
        // through usePersistentFilters' shared write buffer so it lands in one nav.
        setCompanyId: (id: number | null) => setFilters({ company_id: id ?? 0, product_id: 0, bde_id: 0 }),
        // Note: does NOT auto-clear bdeId — pages whose "change product clears BDE"
        // behavior predates this shared context (e.g. Dashboard, POA, Enquiry
        // Tracker) call setBdeId(null) alongside this explicitly. Coupling it here
        // would break Lead Gen Summary's BDE-first cascade, where changing the BDE
        // itself re-derives/sets the product.
        setProductId: (id: number | null) => setFilters({ product_id: id ?? 0 }),
        setBdeId: (id: number | null) => setFilters({ bde_id: id ?? 0 }),
        resetGlobalFilters: resetFilters,
        // setFilters / resetFilters must be in the deps: their identity changes when
        // the route pathname changes (usePersistentFilters batches its write to the
        // *current* pathname), so a stale closure here would navigate a global-filter
        // change back to whichever SEAL page the provider last re-rendered on.
    }), [companyId, productId, bdeId, setFilters, resetFilters]);

    return (
        <SealFilterContext.Provider value={value}>
            {children}
        </SealFilterContext.Provider>
    );
}

export function useSealFilters(): SealFilterContextValue {
    const ctx = useContext(SealFilterContext);
    if (!ctx) throw new Error('useSealFilters must be used within a SealFilterProvider');
    return ctx;
}
