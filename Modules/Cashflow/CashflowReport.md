# Cashflow Report Module

Feature reference document for the Cashflow Report (part of the Cashflow
module group alongside `[[cashflow-tracker-module]]` and
`[[cashflow-forecast-module]]`).

---

## Overview

The Cashflow Report is the management-facing, one-row-per-milestone report
over Order Won leads' collections — the read/analyze counterpart to
`[[cashflow-tracker-module]]`'s edit grid. It's the same underlying
`LeadMilestone` data, filtered and aggregated with a richer set of period,
quarter, status, vertical, and company filters, plus export.

It's also the data source behind `[[dashboard-module]]`'s "Cash Flow
Activities" section (Category 3) — `getCashflowDashboardActivities` lives in
this same controller.

| Layer | Path |
|---|---|
| Frontend | `client/src/pages/cashflow/CashflowReport.tsx`, route `/cashflow/report` |
| Backend | `server/src/controllers/cashflowReportController.ts` |
| Routes | `server/src/routes/cashflowReportRoutes.ts`, mounted at `/api/cashflow-report` |

All routes require `authenticate` + `checkPrivilege('CashflowReport', 'can_view')`.

---

## RBAC — two independent scoping paths, deliberately kept in one function

`buildLeadScope(user, managementAccess, companyId)` is shared by
`getCashflowReport`, `getCashflowReportBdes`, and
`getCashflowReportClientCompanies` so all three can never disagree on
visibility.

### Normal path (no Management Access grant)
| Role | Scope |
|---|---|
| `SalesPerson` | `lead_owner_id = self` |
| `SalesManager` | `lead_owner_id IN (self + direct reports)` |
| `CEO` | Unrestricted |

### Cashflow Management Access — an override, not a role
A user with `user.cashflow_management_access = true` and one or more rows in
`CashflowManagementCompany` gets a **completely different scope**: the
reporting hierarchy is bypassed entirely, and visibility becomes "every BDE's
records within the assigned companies" (matched on `product.company_id`,
the same BU-company field the Company filter itself uses) — regardless of
the user's actual `role`. This is checked first; when enabled, the
role-based branch above never runs.

- Requesting a `company_id` outside the grant → the whole request returns an
  empty response (`{ denied: true }` internally), not a partial result.
- Requesting a `bde_id` under Management Access is validated against that
  BDE's own `company_id` (not the requester's) — this closes a real gap:
  without it, a user restricted to Company A could pass another company's
  BDE id (while omitting `company_id`) and see that BDE's records anyway.

Every request also validates numeric query params (`product_id`,
`vertical_id`, `bde_id`, `company_id`) up front and returns `400` on a
non-numeric value, rather than letting `NaN` flow into the raw SQL below.

---

## API Endpoints

### GET `/api/cashflow-report`
Main report. Only leads with `quadrant = 'Order Won'` are ever considered.

**Query params:** `month`, `product_id`, `vertical_id`, `bde_id`,
`company_id` (BU company, i.e. `product.company_id`), `client_company_id`,
`edc_status` (`all`/`upcoming`/`expired`), `quick_filter`
(`this_week`/`next_week`/`this_month`/`next_month`, comma-separated for
multi-select), `quarter` (`this_quarter`/`next_quarter`, FY Apr–Mar,
comma-separated), `from_date`/`to_date`, `collection_status` (multi-select),
`poa_status` (multi-select), `poa_from_date`/`poa_to_date`.

**Response:**
```json
{
  "summary": { "totalExpected": 0, "totalCollected": 0, "totalBalance": 0, "totalStuck": 0 },
  "rows": [ {
    "milestone_id": 1, "lead_id": 1, "bde_id": 1, "bde_name": "...",
    "monthly_stretch_target": 0, "company": "...", "city": "...", "project_name": "...",
    "product": "...", "vertical": "...", "bu_company_id": 1, "bu_company_name": "...",
    "milestone": "Advance", "expected_amount": 0,
    "already_received": 0, "period_expected": 0, "period_collected": 0, "period_pending": 0,
    "is_fully_collected": false, "last_collection_date": null,
    "edc": "...", "aging": 12, "revised_edc": null,
    "cashflow_poa": "...", "poa_status": "Pending", "poa_edc": null,
    "collection_status": "Pending", "show_bde": true, "show_company_group": true
  } ]
}
```
`show_bde`/`show_company_group` are pre-computed row-display flags — `true`
only on the first row of a consecutive run of the same BDE/Client Company,
so the frontend table can print the name once per group instead of every
row.

### GET `/api/cashflow-report/bdes`
BDE filter dropdown — lists only BDEs who own at least one milestone
matching the current Company/Product/Vertical selection (an `INNER JOIN` to
`lead_milestone`), not the full User master.

### GET `/api/cashflow-report/client-companies`
Same idea for the Client Company dropdown — only companies with at least one
matching milestone, scoped by Company/Product/Vertical/BDE.

### GET `/api/cashflow-report/dashboard-activities`
Feeds `[[dashboard-module]]`'s Cash Flow Activities cards — see that
module's doc for the five buckets (`dueThisWeek`, `overdueCollections`,
`poaDueToday`, `poaDueThisWeek`, `overduePoa`). Uses the same
`getFilteredMilestonesForLeads`/`effectiveCollectionStatus` machinery as the
main report, unwindowed (`'all'`), so a dashboard card's count and the
report it deep-links into can never disagree.

---

## Filtering & Amount Math — shared with Cashflow Tracker

Both the row-inclusion filtering and the money math come from
`server/src/utils/cashflowMilestones.ts`, shared verbatim with
`[[cashflow-tracker-module]]` — see that doc for the full breakdown. Key
points relevant to reading this report correctly:

- **Effective due date** = Revised EDC, falling back to EDC — used for Aging
  display and the `edc_status`/quarter/date-range filters.
- **The Period (`quick_filter`/`month`) filter is the one exception**: it
  matches if *either* the Original EDC *or* the Revised EDC falls in the
  window — a milestone stays visible in both the month it was originally
  promised for and the month it got pushed to, so a postponed collection is
  never silently hidden from its original month.
- **Period Expected** = `expected_amount − (amount collected before the
  window started)` — the balance the milestone carried *into* the selected
  period, not its full original expected amount, once any date window is
  active. With no window active, Period Expected = the full
  `expected_amount`.
- **Aging is measured against the original EDC only, never the revised
  one** — revising a date doesn't reset how long money has been
  outstanding against the date first committed to.
- **`Stuck` milestones**: their already-collected money still counts toward
  Total Collected, but they never contribute to Total Expected or Total
  Balance (the outstanding portion is written off as not expected). Their
  Period Pending is instead summed into `totalStuck`, reported separately.
- Collection Status shown in a row (`collection_status`) is the **effective**
  status — `Fully Paid` always overrides whatever's stored the moment
  `already_received >= expected_amount`, mirroring the precedence
  `updateMilestone` (`[[cashflow-tracker-module]]`) uses when persisting it.

---

## Frontend (`CashflowReport.tsx`)

- Filters: Month, Product, Vertical, BDE, Company (BU), Client Company, EDC
  Status, Quick/Quarter date filters, From/To Date, Collection Status
  (multi-select), POA Status (multi-select), POA From/To Date.
- Company (BU) and Client Company dropdowns are populated from the
  dedicated `/bdes` and `/client-companies` filter-option endpoints above,
  not a full master list.
- Grouped display: rows are pre-sorted by Client Company then BDE
  (`getCashflowReport`'s `sortedLeads`), with `show_company_group`/
  `show_bde` driving "print the header once per group" rendering, plus a
  running company-level subtotal.
- **Export**: Excel (`xlsx`), CSV, and PDF — all export the currently
  sorted/filtered rows exactly as displayed, respecting whatever filters are
  active. Export filename embeds the active quarter/quick-filter/month
  label (`CashflowReport_<label>.xlsx`).

---

## Related

- `[[cashflow-tracker-module]]` — the edit surface for the same
  `LeadMilestone` data this report reads; see that doc for the full
  `LeadMilestone` field list and `updateMilestone` business rules.
- `[[dashboard-module]]` — Cash Flow Activities cards deep-link straight
  into this report with matching filters.
- `[[cashflow-forecast-module]]` — pre-Order-Won forecasting; entirely
  separate data (`ForecastMilestone`), not included in this report.
