# Cashflow Forecast Module

Feature reference document for the Cashflow Forecast module (part of the
Cashflow module group alongside `[[cashflow-tracker-module]]` and
`[[cashflow-report-module]]`).

---

## Overview

Cashflow Forecast lets management estimate future revenue from leads that
are **expected to become Order Won but aren't yet** — a lead not yet
resolved to Order Won or Order Lost can carry a forecast (expected order
value, device count, vertical, and its own milestone plan) entirely
independent of `[[cashflow-tracker-module]]`'s `LeadMilestone` system.

**Fully independent data**: `ForecastHeader` + `ForecastMilestone` are
separate Prisma models from `LeadMilestone` — nothing here is copied into
or shared with the Cashflow Tracker. The moment a lead resolves to Order Won
or Order Lost, its forecast record is deleted outright (see "Lifecycle"
below); Order Won leads then get their *own* fresh `LeadMilestone` plan via
the ordinary Lead-module flow, with no data carried over from the forecast.

| Layer | Path |
|---|---|
| Frontend | `client/src/pages/cashflow/CashflowForecast.tsx`, `CashflowForecastView.tsx`; routes `/cashflow/forecast`, `/cashflow/forecast/:id` |
| Backend | `server/src/controllers/cashflowForecastController.ts` |
| Routes | `server/src/routes/cashflowForecastRoutes.ts`, mounted at `/api/cashflow-forecast` |

All routes require `authenticate` + `checkPrivilege('CashflowForecast', <action>)`.

---

## Data Model

### `ForecastHeader` (`@@map("forecast_headers")`)
```
id                     Int      PK
lead_id                Int      @unique  FK → Lead (cascade delete)
company_id             Int?     FK → Company
product_id             Int?     FK → Product
user_id                Int?     FK → User  (the lead's owner, snapshotted at save time)
vertical_id            Int?     FK → Vertical
expected_order_value   Decimal  Required, > 0
device_count           Int?
remarks                String?
status                 String   Default 'Forecast' — display status, see "Status derivation" below
```
One header per lead (`lead_id` is unique) — creating a forecast for a lead
that already has one overwrites it (upsert by `lead_id`).

### `ForecastMilestone` (`@@map("forecast_milestones")`)
```
id                        Int      PK
forecast_id               Int      FK → ForecastHeader (cascade delete)
milestone_master_id       Int?     FK → PaymentType (same master as LeadMilestone)
expected_amount           Decimal?
percentage                Decimal?
expected_collection_date  DateTime Required
remarks                   String?
status                    String   Default 'Upcoming' — derived, see below
```
No `actual_amount`, no payment history, no BANT POA fields — a forecast
milestone is a plan only, never a record of money actually collected.

---

## Status Derivation (computed on every read, never stored as truth)

### Milestone status
```
expected_collection_date < today  →  'Delayed'
otherwise                         →  'Upcoming'
```

### Header status
```
any milestone is 'Delayed'  →  'Delayed'
otherwise                   →  QUADRANT_PROBABILITY[lead.quadrant] ?? 'Forecast'
```
where
```
Q1 → 'High Probability'
Q2 → 'Medium Probability'
Q3 → 'Medium Probability'
Q4 → 'Low Probability'
```
Both derivations happen in `formatForecast()` at response time — the
`status` column stored on the row is not what's actually shown to the user.

---

## Lifecycle

- **Created** from the Lead Form when "Expected Order" is checked and saved
  — `POST /api/cashflow-forecast` (`upsertForecast`).
- **Blocked** if the lead is already `Order Won` or `Order Lost`
  (`400 Cannot forecast a lead that is already Order Won or Lost`).
- **Deleted automatically** — `deleteForecastForLead(leadId)` is called from
  `leadController.ts` whenever a lead's quadrant resolves to `Order Won` or
  `Order Lost`; it's a no-op if no forecast exists, and its milestones are
  removed via the model's cascade delete. No dashboard/report ever shows a
  forecast for a resolved lead.

---

## API Endpoints

### GET `/api/cashflow-forecast`
Forecast table — one row **per milestone** (not per header), built by the
shared `getFilteredForecastRows()` so the list and the dashboard never
diverge on which rows count. Sorted by BU company name.

**Query params:** `company_id` (BU company — `product.company_id`, the same
concept `[[cashflow-report-module]]` groups by, **not**
`lead.company_name` and **not** `ForecastHeader.company_id`), `product_id`,
`vertical_id`, `bde_id`, `client_company_id`, `edc_status`, `quick_filter`,
`month`, `quarter`, `from_date`/`to_date`, `search` (matches BU company
name, lead company name, product name, or milestone remarks).

Each row carries the lead's `quadrant`, `bant_score` (`lead_score`, out of
28), `cp_score` (out of 10), and `opportunity_value` alongside the milestone
plan — the forecast table doubles as a lead-qualification snapshot, not just
a milestone list.

**Forecast milestones have no Revised EDC concept** — unlike
`LeadMilestone`, `edc_status`/quarter/date-range filters compare directly
against `expected_collection_date`, with no "effective due date" fallback
logic. An `edc_status` value that implies a revised-EDC distinction
(`due_revised`) simply matches nothing here; `due_no_revised` collapses onto
plain `due`.

### GET `/api/cashflow-forecast/dashboard`
Two aggregate numbers over the same filtered row set:
`total_forecast_leads` (distinct `lead_id` count) and `expected_amount`
(sum of `expected_amount` across the filtered milestone rows).

### GET `/api/cashflow-forecast/bdes`
BDE filter — only BDEs who own at least one forecast matching the current
Company/Product selection, RBAC-scoped.

### GET `/api/cashflow-forecast/client-companies`
Client Company filter — only client companies with at least one forecast
milestone matching the current Company/Product/BDE selection. Requires
`lead.client_company_id IS NOT NULL` and at least one milestone.

### GET `/api/cashflow-forecast/by-lead/:leadId`
Fetch the forecast for a specific lead (used by the Lead Form to
show/prefill the Forecast section). Returns `{ success: true, data: null }`
if the lead has no forecast — not a 404.

### GET `/api/cashflow-forecast/:id`
Fetch one forecast by its own id (used by `CashflowForecastView.tsx`).
`403` if the caller isn't CEO and the lead's owner isn't in their team.

### POST `/api/cashflow-forecast` (`upsertForecast`)
Creates or replaces the forecast (header + full milestone plan) for a lead.

**Validation (`validateForecastPayload`):**
- `expected_order_value` required, `> 0`.
- `vertical_id` required.
- Every milestone needs `expected_collection_date` and `milestone_master_id`.
- **Deliberately unvalidated**: milestone `expected_amount`/`percentage`
  totals aren't checked against the order value or 100% — the comment in
  code notes not every product tracks device count, and BDEs commonly build
  the milestone plan incrementally across several saves rather than
  completing it in one pass. (Contrast with `[[cashflow-tracker-module]]`'s
  `saveLeadMilestones`, which *does* enforce both totals — the two systems
  differ here on purpose, not by oversight.)

**Save behavior**: full delete-and-recreate of the milestone set inside a
transaction (`deleteMany` + `createMany`) — unlike
`saveLeadMilestones`'s upsert-by-id approach, there's no collection history
to preserve here, so a clean replace is safe.

### DELETE `/api/cashflow-forecast/:id`
Deletes a forecast header (cascades to its milestones). Same ownership check
as `GET /:id`.

---

## RBAC

| Role | Scope |
|---|---|
| `SalesPerson` | Own leads' forecasts only |
| `SalesManager` | Self + direct reports |
| `CEO` | Unrestricted |

Enforced via `applyRbacWhere()` (list/dashboard/filter endpoints, scoping on
`lead.lead_owner_id`) and inline team-membership checks in
`getForecastById`/`upsertForecast`/`deleteForecast`. There is no Management
Access override here (unlike `[[cashflow-report-module]]`) — Cashflow
Forecast only recognizes the three ordinary roles.

---

## Related

- `[[lead-module]]` — the Lead Form's "Expected Order" checkbox is the entry
  point into this module; the same `Lead.quadrant` value drives both the
  header's derived probability status and the automatic forecast deletion
  on Order Won/Lost.
- `[[cashflow-tracker-module]]` — the unrelated, *actual*-collection system
  a lead moves into once Order Won; shares the `PaymentType` master with
  `ForecastMilestone.milestone_master_id` but no data or code path.
- `[[cashflow-report-module]]` — shares the BU-company (`product.company_id`)
  grouping concept and several filter shapes (`edc_status`, quick filter,
  quarter, date range), reimplemented independently in this controller
  rather than sharing `cashflowMilestones.ts` (which is
  `LeadMilestone`-specific).
