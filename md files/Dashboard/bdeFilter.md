# BDE Filter — Main Dashboard

## Overview

A "BDE" dropdown sits in the Dashboard header, next to the greeting. It lets a
**CEO** or **SalesManager** narrow every section of the Dashboard down to one
BDE's own records instead of their full RBAC scope. A **SalesPerson** never
sees the dropdown — they only ever have their own records to look at.

Selecting a BDE re-scopes:
- Category 1 — Lead Pipeline Overview (Pipeline Breakdown, Requalification Breakdown)
- Category 2 — Sales Activities (call + lead cards)
- Category 3 — Cash Flow Activities (collections + POA cards)
- Categories 4 and 5 — Product-wise / Opportunity-value-wise quadrant charts,
  since they're built from the same role/BDE-scoped lead fetch as Category 1.

"All BDEs" (the default, empty selection) restores the normal RBAC scope
(CEO → everyone, SalesManager → self + their entire downward reporting tree, all levels).

See also `companyProductFilter.md` — the Company/Product filters sitting next
to this one, which narrow every category (1-5) the same way, for every role.

## Dropdown options

Populated from `GET /reports/dashboard-bdes` — role-scoped the same way
`buildRoleScope` scopes everything else (CEO → everyone, SalesManager →
self + full downward reporting tree), server-side filtered to `role in (SalesPerson,
SalesManager)`, and further narrowed to only the BDEs with at least one
lead or call tracker entry matching the current Company/Product selection
(`companyProductFilter.md`) — the same "only BDEs with matching records"
narrowing the Cash Flow Report's own BDE filter applies. Re-fetches whenever
Company or Product changes; if the currently selected BDE falls out of the
new list, the selection is cleared rather than silently kept.

## Backend

- `GET /reports/dashboard`, `GET /reports/sales-activities` — accept an
  optional `bde_id` query param. `buildRoleScope(user, bdeId)`
  (`reportController.ts`) applies it: CEO → that one BDE; SalesManager → that
  one BDE **only if they're on the manager's own team**, otherwise the request
  is refused rather than silently falling back to the manager's full team.
- `GET /cashflow-report/dashboard-activities` — same `bde_id` param, applied
  by `buildLeadScope(user, managementAccess, companyId, bdeId)`
  (`cashflowReportController.ts`), mirroring the validation
  `getCashflowReport`'s own `bde_id` handling already does (including the
  Management Access company check).
- `GET /reports/dashboard-bdes` (the dropdown's own endpoint) — no `bde_id`
  param (it produces the BDE list itself); takes `company_id`/`product_id`,
  scopes leads/call tracker entries the same way `buildRoleScope` +
  `applyDashboardFilters` do for the other endpoints, then returns the
  distinct set of lead owners / call tracker users among them.

## Drill-through links

Every card still opens the same report it counted from, and that report is
opened with the same BDE scope: `ownerId` (Lead Report) / `salespersonId`
(Call Tracker) is `'all'` when no BDE is selected, otherwise the selected
BDE's id — so the number on the card and the list it opens never disagree.
The Cash Flow Report link additionally carries `bde_id` when a BDE is
selected.
