# Cashflow Tracker Module

Feature reference document for the Cashflow Tracker (part of the Cashflow
module group alongside `[[cashflow-report-module]]` and
`[[cashflow-forecast-module]]`).

---

## Overview

Cashflow Tracker is where collections against **Order Won** leads are
recorded and tracked — expected vs. actual payments per milestone, aging,
POA (plan of action) follow-up, and collection status. It operates directly
on `[[lead-module]]`'s `LeadMilestone` records (the milestones a lead
accumulates once its sales stage reaches Order Won), **not** on a
standalone cashflow table — see "⚠️ Naming trap" below.

Route group: `/cashflow` (`client/src/App.tsx`), landing on
`/cashflow/order-won` by default.

| Route | Page | Purpose |
|---|---|---|
| `/cashflow/order-won` | `OrderWonLeads.tsx` | Simple list of Order Won leads (reuses `GET /leads`, filtered) — an entry point, not a milestone view |
| `/cashflow/order-won/:id` | `OrderWonLeadView.tsx` | Read-only detail for one Order Won lead |
| `/cashflow/tracker` | `CashflowTracker.tsx` | **The actual milestone tracker** — grid of every Order Won lead's milestones, editable inline |

---

## ⚠️ Naming trap: two unrelated "Cashflow Tracker" implementations exist

The codebase has **two separate systems** both named "Cashflow Tracker."
Only one is live. Know which is which before touching either:

| | Live system (what `/cashflow/tracker` actually uses) | Orphaned system |
|---|---|---|
| Data model | `LeadMilestone` (+ `LeadMilestonePaymentHistory`, `LeadMilestoneBantPoaHistory`) — tied 1:many to `Lead` | `CashflowTracker` + `CashflowMilestone` — standalone Prisma models with their own `executive_id`/`client_company_id`, not linked to `Lead` at all |
| Backend | `server/src/controllers/milestoneController.ts` (`getOrderWonLeadsWithMilestones`, `updateMilestone`, etc.), mounted under `/api/leads/...` | `server/src/controllers/cashflowTrackerController.ts`, mounted at `/api/cashflow-tracker` |
| Frontend | `client/src/pages/cashflow/CashflowTracker.tsx` (the list/grid, routed at `/cashflow/tracker`) — calls `/leads/order-won/milestones` and `/leads/:id/milestones/:mid` | `CashflowTrackerForm.tsx` / `CashflowTrackerView.tsx` — call `/cashflow-tracker/:id` CRUD |
| Reachable from the UI? | Yes — this is the whole point of the Cashflow Tracker page | **No.** `App.tsx` still routes `tracker/new`, `tracker/:id`, `tracker/:id/edit` to these components, but `CashflowTracker.tsx` contains no `navigate()`/`Link` to any of them — they're dead routes with no way in from the live UI |

**Practical implication:** if you're asked to change "Cashflow Tracker"
behavior, it almost certainly means `milestoneController.ts` /
`CashflowTracker.tsx` (the `LeadMilestone`-based grid), not
`cashflowTrackerController.ts`. The standalone `CashflowTracker`/
`CashflowMilestone` tables and their CRUD routes appear to predate the
current milestone-grid design and were left in place rather than removed —
flag this to whoever owns the module before deleting anything, since dead
code isn't the same as safe-to-delete code without confirming nothing else
depends on it (e.g. a report, an export, external integration).

The rest of this document covers the **live** system only.

---

## Data Model — `LeadMilestone` (`@@map("lead_milestone")`)

Already introduced in `[[lead-module]]`'s "Related Models" section; full
field list and business rules here since this module is where they're
actually edited.

```
id                Int       PK
lead_id           Int       FK → Lead (cascade delete)
payment_type_id   Int?      FK → PaymentType (the "Milestone Type" master)
percentage        Decimal?  Milestone's share of the order value
expected_amount   Decimal?  Amount expected for this milestone
actual_amount     Decimal?  Cumulative amount received — recomputed from
                            payment history on every update, never trusted
                            as a directly-written source of truth
edc               DateTime? Original Expected Date of Collection
revised_edc       DateTime? Revised EDC — the "effective due date" once set
bant_poa          String?   Free-text plan of action for collecting this milestone
bant_poa_edc      DateTime? POA's own expected date
poa_status        String    'Pending' | 'In Progress' | 'Completed' (default 'Pending')
collection_status String    'Pending' | 'Partial Paid' | 'Fully Paid' | 'Stuck' (default 'Pending')
status            String    'Yet To Start' | 'In Progress' | 'Completed' — legacy/simple status, superseded by collection_status for reporting
```

### Companion audit tables
- **`LeadMilestonePaymentHistory`** — one row per collection event
  (`collected_amount`, `collection_date`, `collected_by_id`, `remarks`).
  `actual_amount` on the parent milestone is recomputed as `SUM()` over this
  table on every save — the column is a cache, not the source of truth.
- **`LeadMilestoneBantPoaHistory`** — one row per change to
  `bant_poa`/`bant_poa_edc`/`poa_status`, logged whenever any of the three
  actually changes on an update.

---

## Milestone Plan — creating/editing a lead's milestones

`GET/POST /api/leads/:id/milestones` (`getLeadMilestones`,
`saveLeadMilestones` in `milestoneController.ts`) manage the **plan** — how
many milestones a lead has, their payment type, percentage, expected amount,
and EDC. This is distinct from `PUT /api/leads/:id/milestones/:mid`
(`updateMilestone`), which records **collections against** an existing
milestone.

`saveLeadMilestones` validation:
- Every milestone needs `expected_amount > 0` and an `edc`.
- `SUM(expected_amount)` across all milestones must not exceed the lead's
  `order_value` (+ a 0.01 rounding tolerance).
- `SUM(percentage)` must not exceed 100%.

**Upsert-by-id, not delete-and-reinsert:** existing milestones are matched
by their own `id` (not `payment_type_id`, so several milestones can share a
payment type). A milestone dropped from the resubmitted plan is only
actually deleted if it has **zero** collected amount and **zero** payment/POA
history rows — otherwise the delete is silently skipped (logged as a
warning) so a re-save of the plan can never destroy collection history.

---

## Recording a Collection — `PUT /api/leads/:id/milestones/:mid`

`updateMilestone` handles every in-place edit: new collection amount,
Revised EDC, BANT POA fields, Collection Status, POA Status.

Key rules:

- **`actual_amount` in the request body is a new payment, not the
  cumulative total** — it's appended to `LeadMilestonePaymentHistory` and
  the stored `actual_amount` is then recomputed as the full history sum.
- **Fully collected → read-only for financial fields.** Once
  `actual_amount >= expected_amount` (within a 0.01 epsilon), any further
  attempt to add a payment, set a Revised EDC, or change Collection Status
  is rejected with `400` — only `bant_poa`/`bant_poa_edc`/`poa_status` may
  still change. Enforced server-side, not just as a frontend disable.
- **Payment amount bounds:** a new payment can't be negative, can't exceed
  the current pending balance (`expected − already received`), and the
  resulting cumulative total can't exceed `expected_amount`.
- **Revised EDC can't be in the past** (`isPastDate` check) — collection
  dates, by contrast, can't be in the future (`isFutureDate` check on
  `collection_date`).
- **Collection Status is "sticky" for `Stuck`**: once a user manually sets
  a milestone to `Stuck`, it stays `Stuck` through further
  auto-recalculation until the user explicitly picks a different status —
  *except* `Fully Paid` always wins the moment the milestone completes,
  since it becomes read-only at that point and `Stuck` can no longer apply.
- **POA notes and POA EDC travel together**: if `bant_poa` or
  `bant_poa_edc` changes, the resulting state must not have notes without a
  paired EDC — rejected with `400` if it would. This only fires when the
  request actually touches a POA field, so legacy rows saved before this
  rule (notes with no EDC) don't block unrelated saves.
- Any actual change to `bant_poa`/`bant_poa_edc`/`poa_status` (comparing
  before vs. after) writes a `LeadMilestoneBantPoaHistory` row.

### RBAC on a single milestone (`assertMilestoneAccess`)
- `SalesPerson` — only if they own the milestone's lead.
- `SalesManager` — only if the lead's owner is themselves or a direct
  report.
- `CEO` — unrestricted.
Returns `403`/`404` and writes the response itself, so every caller can
just early-return on a `null` result.

---

## List/Grid View — `GET /leads/order-won/milestones`

Backs `CashflowTracker.tsx`. Returns every Order Won lead (role-scoped) that
has at least one milestone, each with its milestones expanded and a set of
lead-level rollups.

**Query params:** `product_id`, `bde_id`, `client_company_id`, `edc_status`
(`all`/`upcoming`/`expired`), `quick_filter`, `month`, `quarter`,
`from_date`/`to_date`, `collection_status`, `poa_status` (multi-select,
comma-separated), `not_overdue` (mirrors the Dashboard's "Existing EDC
Milestones" KPI — original EDC not yet passed and never revised).

**RBAC** (inline, `getOrderWonLeadsWithMilestones`):
| Role | Scope |
|---|---|
| `SalesPerson` | Own leads only — `bde_id` query param is silently ignored |
| `SalesManager` | Self + direct reports; an explicit `bde_id` outside the team returns an empty response rather than `403` |
| `CEO` | Unrestricted; `bde_id` honored as-is |

**Filtering and amount math are shared with `[[cashflow-report-module]]`**
via `server/src/utils/cashflowMilestones.ts`
(`getFilteredMilestonesForLeads`, `computeMilestonePeriodAmounts`,
`effectiveCollectionStatus`, `matchesStatusFilters`) — deliberately, so the
Tracker grid and the Report can never disagree on a number. See
`[[cashflow-report-module]]` for the full period-ledger formula
(Period Expected/Collected/Pending, the EDC-vs-Revised-EDC "effective due
date" rule, and the Stuck-status carve-out).

**Response summary block:**
```json
{
  "summary": { "total_expected": 0, "total_collected": 0, "balance_amount": 0, "stuck_amount": 0 },
  "leads": [ { "id": 1, "company_name": "...", "total_milestones": 3, "expected_amount": 0, "already_received": 0, "current_period_collection": 0, "pending_amount": 0, "last_edc": "...", "milestones": [ "...same shape as GET /leads/:id/milestones plus period_expected/period_collected/period_pending..." ] } ]
}
```
Leads are sorted by their latest milestone's effective EDC, most recent
first.

### Companion lookups
- `GET /leads/order-won/milestones/client-companies` — Client Company
  dropdown, scoped to companies with at least one milestone matching the
  current Product/BDE filter (rather than the full Client Company master).

---

## Related endpoints (already documented in `[[lead-module]]`)

- `GET /leads/:id/milestones/:mid/payment-history` — full collection
  history for one milestone.
- `GET /leads/:id/milestones/:mid/bant-poa-history` — full POA change
  history for one milestone.

---

## Related

- `[[lead-module]]` — owns the `LeadMilestone` data itself; milestones only
  exist once a lead reaches Order Won.
- `[[cashflow-report-module]]` — reads the same `LeadMilestone` data through
  the same shared filtering utility, for a management-facing report rather
  than an edit grid.
- `[[cashflow-forecast-module]]` — a completely separate, pre-Order-Won
  forecasting system; do not confuse `ForecastMilestone` with
  `LeadMilestone`.
- `[[dashboard-module]]` — "Existing EDC Milestones" KPI and the Cash Flow
  Activities cards both read from this same `LeadMilestone` data.
