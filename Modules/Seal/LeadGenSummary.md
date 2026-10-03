# Lead Gen Summary Module

Feature reference document for the Lead Gen Summary module.

**Structural note:** unlike the other five docs in this folder, Lead Gen
Summary is *not* wired the same way as the rest of the SEAL module group —
see "Where this sits" below. It's grouped in `Modules/Seal/` because it's
the same business area (per-BDE per-product performance reporting) and the
repo's own `md files/SealModules/leadgensummary.md` filed it there, but
don't assume it shares plumbing (routes, privilege model, shared dropdown
endpoints) with `[[seal-dashboard-module]]`, `[[poas-module]]`,
`[[partner-signup-module]]`, `[[weekly-summary-module]]`, or
`[[enquiry-tracker-module]]` — it doesn't.

---

## Where this sits

| | Rest of the SEAL group | Lead Gen Summary |
|---|---|---|
| Frontend location | `client/src/pages/seal/*.tsx` | `client/src/pages/LeadGenSummary.tsx` (top-level `pages/`) |
| API prefix | `/api/seal/...` | `/api/lead-gen` |
| Route middleware | `authenticate` only, no `checkPrivilege` | `authenticate` **+ `checkPrivilege('LeadGenSummary', 'can_view')`** on every route |
| Product/BDE dropdown source | `GET /api/seal/poas/mapped-products` / `mapped-bdes` (shared, `[[poas-module]]`) | Its own `GET /api/lead-gen/products` / `/bdes` — separate `UserProductTarget`-based logic, not the POA endpoints |

---

## Overview

Lead Gen Summary is a per-BDE, per-Lead-Source-Type performance table: for a
selected Product **or** Service Department, month, week, and (optionally) a
single BDE, it shows Calls and Leads target-vs-achieved, a 7-stage sales
pipeline breakdown (Order Won → Order Lost), Demos, and Proposals — split
into one section per active **Lead Source Type**, each with a Weekly and a
Monthly table. A Total row sums every BDE row within a section.

Backend: `server/src/controllers/leadGenController.ts`
(`getLeadGenSummary`, `getLeadGenBdes`, `getLeadGenProducts`).
Routes: `server/src/routes/leadGenRoutes.ts`, mounted at `/api/lead-gen`
(`server/src/index.ts`).

---

## 1. Filters (`LeadGenSummary.tsx`)

Persisted via `usePersistentFilters('leadgen')`.

| Filter | Behaviour |
|---|---|
| **BDE** | Selected *first* — defaults to the logged-in user. Fetched from `GET /api/lead-gen/bdes` (no product/service filter → all active BDEs in RBAC scope). |
| **Product / Service** | Fetched from `GET /api/lead-gen/products?bde_id=X` — **filtered by the selected BDE's own `UserProductTarget` mappings**, not the reverse. If no BDE is selected, returns all active products unfiltered. This is the opposite filter order from every other SEAL submodule, which is product-first. |
| **Month** | January through the current month only (no future months) |
| **Week** | Real calendar weeks (Monday–Sunday) within the selected month, clipped so no week spans into the previous/next month; defaults to the week containing today when the current month is selected, else Week 1 |

Selecting a BDE resets the product list; selecting a month resets the week
to 1.

---

## 2. API Endpoints

All require `authenticate` + `checkPrivilege('LeadGenSummary', 'can_view')`.

### GET `/api/lead-gen/bdes?product_id=X` or `?service_department=Y`
Returns `[{ id, first_name, last_name }]`. With neither param, returns all
active BDEs in the caller's RBAC scope. With a product/service, narrows to
BDEs holding a `UserProductTarget` for it (service mode resolves via a
"proxy product" — a `Product` row whose `name` matches the service
department string, e.g. a product literally named `"EIT Services"`).

Supports a **`company_ids` override**: if the caller has
`cashflow_management_access` and passes `company_ids`, the BDE scope becomes
"users belonging to those companies" instead of the normal role hierarchy —
gated so an arbitrary caller can't widen their own scope by just passing the
param.

### GET `/api/lead-gen/products?bde_id=X`
Returns `[{ id, name }]`. No `bde_id` → all active products. With `bde_id`
→ only that BDE's mapped products (`UserProductTarget`), and only after an
RBAC check: a `SalesPerson` can only query themselves (`403` otherwise), a
`SalesManager` can only query themselves or a direct report (`403`
otherwise).

### GET `/api/lead-gen?product_id=X|service_department=Y&bde_id=&month=&year=&week=`
Main data endpoint. `product_id` or `service_department` is required (400 if
both are absent). `bde_id` omitted → aggregate view over every BDE in RBAC
scope for that product/service.

**RBAC (resolving which user IDs are in scope), inline in the controller:**

| Role | Behaviour |
|---|---|
| `SalesPerson` | Always scoped to self, regardless of `bde_id` |
| `SalesManager` | A specific `bde_id` must be self or a direct report (`403` otherwise); omitted → aggregate over self + direct reports (via their `UserProductTarget` rows) |
| `CEO` | A specific `bde_id` is honored as-is; omitted → aggregate over every active user mapped to the product/service |

**Response shape:**
```json
{
  "product_name": "Aura",
  "service_dept": null,
  "is_product_mode": true,
  "sel_month": 8, "sel_year": 2026, "sel_week": 2,
  "total_weeks": 5, "week_day_start": 8, "week_day_end": 14,
  "week_label": "08 Aug – 14 Aug",
  "lead_source_types": [
    {
      "id": 1, "name": "Direct Marketing", "sources": ["Cold Call", "Email Campaign"],
      "weekly":  { "bde_rows": [ { "bde_id": 5, "bde_name": "Selvam", "calls": {...}, "leads": {...}, "lead_count": {...}, "lead_details": {...}, "demos": {...}, "proposals": {...} } ], "total": { "...same shape..." } },
      "monthly": { "bde_rows": [ "..." ], "total": { "...": "..." } }
    }
  ]
}
```

---

## 3. Data Sources & Formulas

### Lead Source Type sections
Every **active `LeadSourceType`** (Masters → Lead Source Type) gets its own
section, populated from whichever `LeadSource` rows are mapped to it. Leads
and Call Tracker rows are attributed to a section by their `lead_source_id`
→ `LeadSourceType`; anything with an unmapped or missing lead source is
excluded from every section entirely (not bucketed into an "Other" catch-all).

### Calls (per BDE, per section, per period)
- **Target** = `UserProductTarget.calls_target` (a **daily** figure) ×
  `countWorkingDays(from, to)` — actual Monday–Friday days in the selected
  week/month, not a fixed ×5/×20 multiplier.
- **Achieved** = count of `CallTracker` rows for that BDE in the period,
  filtered to `call_status_id IS NOT NULL` and `lead_source_id` in the
  section's mapped set, scoped to the product (`product_id = X`) or service
  (`eit_service_id`/`im_service_id` not null, or legacy `product_or_service`
  string match, or the "proxy product" `product_id`).

### Leads
- **Target** = `round((UserProductTarget.leads_target × Product.lead_q1_multiplier) / 22)`
  (the same SWAT Q1 Lead Target formula, see `[[swat-performance-module]]`
  §7) ×  working days in the period.
- **Achieved** = count of `Lead` rows created in the period, owned by that
  BDE, matching the product/service filter and the section's mapped lead
  sources. **Always equals the Sales Pipeline total** below, since both read
  the same filtered lead set.

### Sales Pipeline (7 stages)
`order_won, q4, q3, q2, q1, nurturing, order_lost` — mapped from
`Lead.quadrant` (`'Order Won'`, `'Q4'`...`'Q1'`, `'Nurturing'`,
`'Order Lost'`). Counted from the same lead set as Leads Achieved, split by
current quadrant. Each stage's hover tooltip lists the individual leads
(name, created date, source).

### Demos / Proposals
Summed straight from `SwatPerformance.demos_achieved` /
`proposals_achieved` (see `[[swat-performance-module]]`) for the BDE across
the period — no independent target or formula of its own here.

### Totals row
Each section's `total` is `sumMetrics()` over that section's `bde_rows` —
plain arithmetic sums for targets/achieved (percent is recomputed from the
summed target/achieved, not averaged), and `lead_details`/`calls.details`
are concatenated so the Total row's tooltip still lists every underlying
lead/call.

---

## 4. Frontend Table (`LeadGenSummary.tsx`)

- One collapsible block per `LeadSourceType` section, each containing a
  **Weekly** and a **Monthly** `PeriodSection` table.
- Columns: BDE name, Calls (target/achieved/%), Leads (target/achieved/%),
  7 pipeline-stage counts, Demos, Proposals.
- Percent badges are colour-coded: ≥90% green, 60–89% amber, <60% red
  (`pctColor()`), matching the Zone of Performance banding convention used
  in `[[seal-dashboard-module]]`.
- Hovering a pipeline-stage count (or the Calls-achieved cell) opens a
  fixed-position tooltip listing up to 12 underlying records (name, date,
  source) with a "+N more" footer — rendered at the page level via
  `position: fixed` so it isn't clipped by the table's horizontal scroll.

---

## Known Issues / Notes

- Product/BDE filter order is **reversed** relative to every other SEAL
  submodule (BDE chosen first, product list then depends on it) — worth
  knowing when comparing UX with `[[seal-dashboard-module]]`/`[[poas-module]]`,
  which are product-first.
- `getLeadGenBdes`'s `company_ids` override is a cashflow-management-access
  feature bolted onto a lead-gen endpoint — if `cashflow_management_access`
  semantics change elsewhere, check this code path too.
- Leads/calls whose `lead_source_id` isn't mapped to any active
  `LeadSourceType` are silently excluded from every section — they don't
  appear anywhere in the report, including the totals.
- The older spec at `md files/SealModules/leadgensummary.md` describes fixed
  ×5 (weekly) / ×20 (monthly) call-target multipliers and only 5 pipeline
  stages (no Order Lost, no working-day scaling) — the shipped
  implementation replaced both with `countWorkingDays()` scaling and the
  7-stage pipeline documented above. Treat that file as historical intent,
  not current behavior.

---

## Related

- `[[swat-performance-module]]` — source of Demos/Proposals achieved and the
  Q1 Lead Target formula reused here.
- `[[lead-module]]` — source of the quadrant values behind the Sales
  Pipeline breakdown.
- `[[call-tracker-module]]` — source of Calls Achieved.
- `[[seal-dashboard-module]]` — shares the DANGER/REASONABLE/EXCELLENT-style
  percent colour convention, but not its routes or dropdown endpoints.
