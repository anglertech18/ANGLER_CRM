# SEAL Module — Global + Individual Filter Development Prompt

## Objective

Update the **SEAL Module** to support both:

1. **Global Product + BDE filters**
2. **Individual submodule-specific filters**

The Global Product and BDE filters selected from the SEAL Dashboard must automatically apply across all SEAL submodules, while each submodule must continue to maintain its own existing individual filters.

---

## SEAL Submodules

The global filters must apply to:

1. SEAL Dashboard
2. Weekly Summary
3. Lead Gen Summary
4. POA
5. Enquiry Tracker

---

# 1. Global Filters

The SEAL Dashboard should contain the common/global filters:

* **Product**
* **BDE**

Example:

```text id="s4xk3h"
Global SEAL Filters

Product: Vendora
BDE: John
```

These two filters must be maintained in a **centralized SEAL filter state**.

The selected Product and BDE values must automatically be available to every SEAL submodule.

---

# 2. Individual Submodule Filters

Do **not remove the existing individual filters** from the submodules.

Each submodule should continue to maintain its own filters that are specific to that screen.

Example:

### Weekly Summary

```text id="g9n6fc"
Global Filters:
Product: Vendora
BDE: John

Individual Filters:
Week: Current Week
Status: Completed
```

### Lead Gen Summary

```text id="z0o1rt"
Global Filters:
Product: Vendora
BDE: John

Individual Filters:
Date Range
Lead Type
Source
```

### POA

```text id="3e6x1m"
Global Filters:
Product: Vendora
BDE: John

Individual Filters:
POA Status
Due Date
```

### Enquiry Tracker

```text id="i2p1qv"
Global Filters:
Product: Vendora
BDE: John

Individual Filters:
Enquiry Status
Date Range
Stage
```

The exact individual filters should remain based on the existing implementation/business requirements.

---

# 3. Filter Combination Logic

The final data displayed in each submodule must be filtered using:

```text id="kq9k4j"
Global Product
        +
Global BDE
        +
Submodule Individual Filters
        ↓
Final Filtered Data
```

For example:

```text id="n6f7bc"
Product = Vendora
BDE = John
POA Status = Pending
Due Date = This Week
```

The POA API should return only records matching **all four conditions**.

---

# 4. Filter Persistence

When navigating between SEAL submodules:

### Global filters

Product and BDE must persist.

Example:

```text id="j5j4xu"
Dashboard
Product = Vendora
BDE = John

        ↓ Weekly Summary

Product = Vendora
BDE = John

        ↓ Lead Gen Summary

Product = Vendora
BDE = John

        ↓ POA

Product = Vendora
BDE = John
```

### Individual filters

Individual filters should remain specific to their respective submodule.

For example:

```text id="d8e2nw"
Weekly Summary
    └── Week = Current Week

POA
    └── Status = Pending
```

The Weekly Summary filter must not affect the POA filter.

---

# 5. Changing Global Filters

When the user changes Product or BDE from the SEAL Dashboard:

```text id="g1qv3n"
User changes Product/BDE
        ↓
Update Global Filter State
        ↓
All SEAL submodules use new Product/BDE
        ↓
Each submodule retains its own individual filters
```

Example:

```text id="1r6x8t"
Before:

Global:
Product = Vendora
BDE = John

POA:
Status = Pending

After changing Product:

Global:
Product = Aura
BDE = John

POA:
Status = Pending
```

The POA **Status = Pending** filter must remain unchanged.

Only the global Product filter changes.

---

# 6. API Filter Structure

Use a common global filter object:

```javascript id="4o5r2a"
{
  productId,
  bdeId
}
```

Each submodule should combine the global filters with its own local filters.

Example:

```javascript id="9t3k5p"
{
  productId,
  bdeId,
  status,
  fromDate,
  toDate
}
```

The exact local parameters depend on the respective submodule.

---

# 7. State Management

Implement centralized state only for the common filters:

```text id="u2n8kp"
Global SEAL Filter State

productId
bdeId
```

Individual filters must remain local to their respective submodules unless there is already an established shared state architecture.

Avoid creating multiple independent copies of:

```text
productId
bdeId
```

inside every SEAL component.

---

# 8. Reset Behavior

### Global Reset

If the user resets the global Product/BDE filters:

* Reset Product.
* Reset BDE.
* Refresh the current submodule.
* Apply the reset/default values to all SEAL submodules.

**Do not reset individual submodule filters.**

Example:

```text id="4u8g6s"
Before:

Global:
Product = Vendora
BDE = John

POA:
Status = Pending

After Global Reset:

Global:
Product = All
BDE = All

POA:
Status = Pending
```

---

### Individual Reset

Each submodule should have its own reset option for its local filters.

Example:

```text id="v6h1sd"
POA

Global:
Product = Vendora
BDE = John

Local:
Status = Pending
Due Date = This Week

Click "Reset Local Filters"

Result:

Global:
Product = Vendora
BDE = John

Local:
Status = All
Due Date = All
```

The global filters must remain unchanged.

---

# 9. UI Requirements

Clearly distinguish between:

### Global Filters

```text
SEAL Filters

Product [ Vendora ▼ ]
BDE     [ John ▼ ]
```

and:

### Individual Filters

```text
POA Filters

Status   [ Pending ▼ ]
Due Date [ This Week ▼ ]
```

Use clear visual separation so users understand which filters affect the entire SEAL module and which affect only the current submodule.

---

# 10. Important Implementation Rules

* Do not remove existing individual filters.
* Do not convert all filters into global filters.
* Only **Product and BDE** are global filters.
* Preserve existing submodule-specific filters.
* Global Product/BDE filters must be applied to every SEAL API.
* Individual filters must only affect their respective submodule.
* Global and individual filters must work together.
* Changing Product/BDE must not reset local filters.
* Resetting local filters must not reset Product/BDE.
* Resetting global filters must not reset local filters.
* Preserve existing RBAC and business logic.
* Avoid unnecessary API calls.
* Reuse existing filter logic where possible.

---

# 11. Acceptance Criteria

* [ ] Product is a global SEAL filter.
* [ ] BDE is a global SEAL filter.
* [ ] Global Product/BDE state is maintained centrally.
* [ ] Dashboard uses global Product/BDE filters.
* [ ] Weekly Summary uses global Product/BDE + its own local filters.
* [ ] Lead Gen Summary uses global Product/BDE + its own local filters.
* [ ] POA uses global Product/BDE + its own local filters.
* [ ] Enquiry Tracker uses global Product/BDE + its own local filters.
* [ ] Existing individual filters remain available.
* [ ] Individual filters remain independent between submodules.
* [ ] Changing Product/BDE updates all submodules.
* [ ] Changing a local filter affects only the current submodule.
* [ ] Global filter reset does not reset local filters.
* [ ] Local filter reset does not reset global filters.
* [ ] Navigation between submodules preserves global Product/BDE selections.
* [ ] Existing business logic and RBAC remain unchanged.

## Final Expected Architecture

```text id="e6w0pa"
                 SEAL MODULE
                     │
          ┌──────────┴──────────┐
          │                     │
    GLOBAL FILTERS         LOCAL FILTERS
          │                     │
    Product + BDE          Per Submodule
          │                     │
          └──────────┬──────────┘
                     │
             Combined Filters
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
   Dashboard   Weekly Summary   Lead Gen
        │            │            │
        └────────────┼────────────┘
                     ↓
                  POA
                     ↓
             Enquiry Tracker
```

### Final Goal

**Product + BDE = Global filters shared across the entire SEAL module.**

**All other existing filters = Individual filters maintained independently by each submodule.**

Both must work together to produce the final filtered data.

---

## Implementation Notes

- Global state lives in `client/src/context/SealFilterContext.tsx` (`SealFilterProvider`
  wraps the `seal` route in `App.tsx`), backed by `usePersistentFilters('seal-global', …)`
  with URL keys `company_id` / `product_id` / `bde_id`.
- **Company filter (2026-08-29):** `Company` is a third global SEAL filter — the BU
  company that owns the product (`product.company_id`), the same concept as the main
  Dashboard's Company filter, **not** the customer/lead company. It's optional ("All
  Companies"); choosing one narrows the Product dropdown to that company's mapped
  products and drops the current Product + BDE (`setCompanyId` batches all three).
  Wired on Dashboard, Weekly Summary, Lead Gen Summary, POA, Enquiry Tracker.
  - Product options come from `GET /api/seal/poas/mapped-products?company_id=` —
    RBAC scope unchanged, just filtered by `product.company_id`; response now
    includes `company_id` per item.
  - Company options: `GET /api/masters/company` (active), every role (mirrors Dashboard).
  - Each SEAL data API takes `company_id` and guards by the product's BU company:
    `/seal`, `/seal/bdes`, `/seal/weekly-reports`, `/seal/poas[/summary|/weekly-summary]`,
    `/enquiries`, `/lead-gen`. WeeklyReport / UserProductTarget carry only
    `product_id` (no `product` relation), so those intersect on
    `resolveCompanyProductIds()` in `sealController.ts`.
- **Fix (2026-08-29):** changing the global Product appeared to do nothing (and could
  wipe a submodule's local filters). Pages update several filter keys in one handler —
  `setProductId(...)` + `setBdeId(null)` (+ sometimes a local `setFilters(...)`), often
  across two/three separate `usePersistentFilters` instances. React Router's
  `setSearchParams` / `navigate` is imperative, not a reducer: every call in the same
  tick reads the same pre-render URL, so the last `navigate` clobbered the earlier ones
  and the Product change was lost. `usePersistentFilters` now funnels every write through
  one shared microtask-batched `URLSearchParams` buffer (module-level `queueParamUpdate`
  in `client/src/hooks/usePersistentFilters.ts`) and flushes it with a single
  `navigate()`, so multi-key / multi-namespace updates compose. The flush passes an
  **absolute** `{ pathname: useLocation().pathname, search }` — `useNavigate()` is
  route-scoped, and the SEAL provider sits on `/seal`, so a bare `{ search }` from
  its instance bounced submodules (e.g. POA) back to the `/seal` index. For the same
  reason `SealFilterContext`'s `value` memo lists `setFilters` / `resetFilters` in its
  deps — their identity tracks the pathname, and a stale closure otherwise carried a
  previous page's pathname into the flush (bouncing a global-filter change to whatever
  SEAL page the provider last rendered on, e.g. Enquiry Tracker).
- **Filter UI:** each SEAL page's filter bar is split into a tinted "SEAL Filters"
  group (Company / Product / BDE — shared) and a plain "Page Filters" group (the
  submodule's own local filters), so users can see which control affects every SEAL
  page and which is scoped to the current one.
