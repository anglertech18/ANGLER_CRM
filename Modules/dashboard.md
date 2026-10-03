# Dashboard Module

Feature reference document for the CRM Dashboard (`client/src/pages/Dashboard.tsx`, route `/dashboard`).

---

## Overview

The Dashboard is a read-only, role-scoped landing page that summarizes a user's
pipeline, calls, sales engagement activity, and (where privileged) cash flow
collections/POA status. It has no filters of its own — every card/chart shows
"everything the signed-in user is RBAC-allowed to see" — and every clickable
element (card, quadrant row, pie slice) deep-links into the report/list it was
counted from, carrying the same conditions, so the number on the dashboard and
the list it opens always agree.

It is built from **three independent queries**, each gated by its own
privilege check, so a user missing one privilege simply doesn't see that
section rather than seeing zeros:

| Query | Endpoint | Gate | React Query key |
|---|---|---|---|
| Core stats + charts | `GET /api/reports/dashboard` | none beyond `authenticate` | `dashboard-stats` |
| Sales Activities (calls + leads) | `GET /api/reports/sales-activities` | `hasPrivilege('Reports','can_view')` | `dashboard-sales-activities` |
| Cash Flow Activities | `GET /api/cashflow-report/dashboard-activities` | `hasPrivilege('CashflowReport','can_view')` | `dashboard-cashflow-activities` |

Backend logic lives in `server/src/controllers/reportController.ts`
(`getDashboardStats`, `getSalesActivities`) and
`server/src/controllers/cashflowReportController.ts`
(`getCashflowDashboardActivities`). Routes: `server/src/routes/reportRoutes.ts`,
`server/src/routes/cashflowReportRoutes.ts`.

---

## RBAC / Role Scope

All three endpoints apply the same shape of scoping, each re-implemented
locally (per the repo's "no shared scope helper" convention):

| Role | Leads / Calls scope |
|---|---|
| `SalesPerson` | Own records only (`lead_owner_id = user.id` / `CallTracker.user_id = user.id`) |
| `SalesManager` | Self + direct reports (`reporting_manager_id = user.id`) |
| `CEO` | Unscoped |

`reportController.buildRoleScope(user)` returns `{ leadWhere, callTrackerWhere }`
Prisma fragments and is shared by `getDashboardStats`, `getLeadCategoryReport`,
and `getSalesActivities`. `cashflowReportController.getCashflowDashboardActivities`
builds its own scope via `getManagementAccess` + `buildLeadScope` (the same
helper the Cash Flow Report uses).

Section-level gating on the frontend (`client/src/pages/Dashboard.tsx`):

- **Call Activities** section: `canViewReports && canViewCalls && !salesActivitiesError`
- **Lead Sales Activities** section: `canViewReports && !salesActivitiesError`
- **Cash Flow Activities** section: `canViewCashflow`

If `sales-activities` errors (e.g. privilege denied), the whole section is
hidden rather than showing a wall of zeros — a `retry: false` query.

---

## Layout — Categories 1–5

### Category 1 — Call Activities (left) + Lead Pipeline Overview (right)

**Call Activities** (6 KPI cards, `/reports/dashboard` + `/reports/sales-activities`):

| Card | Source | Meaning |
|---|---|---|
| Calls Made Today | `stats.todayCalls` | `CallTracker` rows created today with `call_status_id` set |
| Today Pending Calls | `salesActivities.todayCalls` | Follow-up due today, not yet moved to pipeline |
| Last Week Pending | `salesActivities.lastWeekCalls` | Follow-up due last week, not moved to pipeline |
| This Week Pending | `salesActivities.thisWeekCalls` | Follow-up due this week, not moved to pipeline |
| Next Week Calls | `salesActivities.nextWeekCalls` | Follow-up due next week, not moved to pipeline |
| Overdue Calls | `salesActivities.overdueCalls` | Follow-up date passed, not moved to pipeline |

Clicking a call card opens `/call-management/tracker` with matching
`nextFollowUpFrom` / `nextFollowUpTo` / `notMovedToPipeline=1` and
`salespersonId=all` (the tracker defaults to "me only"; the dashboard counted
everyone the user can see, so the link must too).

**Lead Pipeline Overview** (two cards, right 2/3 of the row):

- **Pipeline Breakdown** — `stats.quadrantStats`, one `QuadrantRow` per Q1–Q4,
  percentage = share of the active pipeline (`quadrantTotal` = sum of Q1–Q4
  only). Nurturing is shown separately beneath, measured against **all**
  leads (`allLeadsTotal = quadrantTotal + nurturingCount`) since dividing it
  into the pipeline total would exceed 100%. Clicking a row opens
  `/leads?quadrant=X&ownerId=all`.
- **Requalification Breakdown** — `stats.requalificationQuadrantStats`, same
  per-quadrant shape but scoped to `requires_requalification = true` leads
  (Nurturing or nightly auto-degraded — see `[[lead-module]]`'s quadrant cron).
  Clicking a row adds `&requiresRequalification=1`.

### Category 2 — Lead Sales Activities (left) + Category 3 — Cash Flow Activities (right)

**Lead Sales Activities** (6 cards, all from `salesActivities`, filtered by
`Lead.follow_up_datetime` — the "Sales Engagement Date"):

| Card | Bucket | Window | Excludes closed? |
|---|---|---|---|
| Today's Lead Activities | `todayLeads` | today | yes |
| Over Due Activities | `dateExitLeads` | none — every lead with any engagement date | no |
| This Week's Lead Activities | `thisWeekLeads` | this week | yes |
| Next Week's Lead Activities | `nextWeekLeads` | next week | yes |
| This Month's Lead Activities | `thisMonthLeads` | this month | yes |
| Next Month's Lead Activities | `nextMonthLeads` | next month | yes |

"Excludes closed" means leads whose sales stage is `Order Won` or
`Order Lost` are dropped (`CLOSED_SALES_STAGES`) — a lead with no stage yet
still counts as open. Clicking opens `/leads?engagementFrom=&engagementTo=&excludeClosed=1&ownerId=all`
(or `?engagementNotNull=1` for the Over Due card) — the same filters
`getLeadCategoryReport` (the Lead Report) understands, via
`GET /api/reports/lead-category`.

**Cash Flow Activities** (5 cards, `cashflow-report/dashboard-activities`,
documented in full in `md files/Dashboard/cashflowSection.md`):

| Card | Bucket | Rule |
|---|---|---|
| Cash Flow Due This Week | `dueThisWeek` | Effective EDC (Revised EDC if set, else EDC) falls between today and end of this week; excludes Fully Paid / Stuck |
| Cashflow Expired EDC/REDC Milestones | `overdueCollections` | Effective EDC before today; excludes Fully Paid / Stuck |
| POA Due Today | `poaDueToday` | `bant_poa_edc` is today; `poa_status` not Completed |
| POA Due This Week | `poaDueThisWeek` | `bant_poa_edc` between today and end of week; not Completed |
| Overdue POA Activities | `overduePoa` | `bant_poa_edc` before today; not Completed |

Each collection card shows a `pendingAmount` subtitle
(`expected_amount − already_received`, summed). Clicking opens
`/cashflow/report` with `from_date`/`to_date`/`collection_status` or
`poa_from_date`/`poa_to_date`/`poa_status` — multi-select statuses are sent as
the comma-joined "not yet done" set (`Pending,Partial Paid,Stuck` /
`Pending,In Progress`) since the Cash Flow Report's status filters are
inclusion lists, not exclusion lists.

### Category 4 — Product-wise Quadrant Count

One donut/pie per product (`stats.productQuadrantStats`), each slice a
quadrant (Q4/Q3/Q2/Q1/Nurturing). Leads without a `product_id` roll into
service buckets (`EIT Services` / `IM Services` from `product_or_service`) or
`Other Products` if neither is set. Product order is fixed
(`TimeCheck, Aura, Vendora, FMS, IWay, Tsense, EIT Services, IM Services`,
then anything else by pipeline size, `Other Products` last). Clicking a slice
opens `/leads?quadrant=X` (unscoped by owner — Category 4/5 links don't add
`ownerId=all`, unlike Categories 1–3).

### Category 5 — Opportunity Value-wise Quadrant Count

Inverse pivot of Category 4: one pie per opportunity-value bucket
(`stats.opportunityQuadrantStats`), sliced by quadrant. Buckets (evaluated
top-down, highest first): `Above ₹10L`, `₹8L–₹10L`, `₹5L–₹8L`, `₹2.5L–₹5L`,
`Below ₹2.5L`. Opportunity value is `Lead.opportunities_values` (free text,
sanitized to a number) falling back to `order_value` for Order Won leads;
leads with no usable value are excluded entirely (never bucketed as "0").
Hovering a slice lists the individual leads behind it (name, product, amount),
capped at 25, sorted biggest-first.

---

## Backend Computation Notes

- **`totalLeads`** (unused directly on the current UI, still returned): count
  of role-scoped leads with `quadrant IN (Q1,Q2,Q3,Q4)` — excludes Nurturing,
  Order Won, Order Lost.
- **Existing EDC Milestones** (`existingEdcMilestonesCount`, CR12, returned
  but not currently rendered): raw SQL count of milestones on Order Won leads
  still on their original (never-revised) EDC, EDC not yet due, balance
  outstanding, not Stuck.
- **`quadrantStats` / `requalificationQuadrantStats`**: built in-memory from a
  single `leadsWithCompany` fetch (not per-quadrant queries) — Q1–Q4 keys are
  pre-seeded so a 0-count quadrant still appears in the response.
- **Sales Activities counts** reuse `PRODUCT_CATEGORY_CONDITION` and
  `CLOSED_SALES_STAGES` — the exact filters `getLeadCategoryReport` (Product
  category) applies — so a dashboard card's count can never disagree with the
  Lead Report it opens.
- Each card's hover/tap detail panel shows a capped preview
  (`SALES_ACTIVITY_PREVIEW_LIMIT = 8`, `ACTIVITY_PREVIEW_LIMIT` for cash flow)
  of the same records the count was computed from, with a "+N more — click to
  open the full list" footer once the bucket exceeds the preview.
- Sales Engagement Date/time (`Lead.follow_up_datetime`) is stored tagged as
  UTC (see `LeadForm.tsx`) and must be read back via its UTC components
  (`dayjs.utc(...)`) on the frontend, or the display shifts by the viewer's
  local timezone.

---

## Frontend Structure

| Component | Purpose |
|---|---|
| `KpiCard` / `KpiSkeleton` | Simple icon + value card (Calls Made Today) |
| `QuadrantRow` | Labeled progress bar for one quadrant, used in Pipeline/Requalification Breakdown |
| `SalesActivityCard` | Call/Lead bucket card with hover/tap detail panel (Categories 1–2) |
| `ActivityCard` | Cash flow bucket card with hover/tap detail panel (Category 3) |
| `ProductQuadrantPie` / `OpportunityQuadrantPie` | Per-product / per-value-range pie with custom tooltip (Categories 4–5) |

All money is formatted via `inr()` (`₹` + `en-IN` locale grouping). Quadrant
colors are centralized in `QUADRANT_COLORS` and shared across every chart on
the page so Q1–Q4/Nurturing read consistently everywhere.

---

## Related

- `[[lead-module]]` — quadrant/scoring logic and RBAC the dashboard's lead
  cards are built on top of.
- `md files/Dashboard/cashflowSection.md` — original spec for Category 3.
- `md files/Dashboard/salesactivities.md` — original spec for Categories 1–2's
  call/lead cards.
