# Company / Product Filters — Main Dashboard

## Overview

Two dropdowns sit in the Dashboard header next to the BDE filter: **Company**
and **Product**. Unlike the BDE filter, they're visible to **every role**
(SalesPerson included) — they only ever narrow a user's own scope further,
never widen it.

"Company" here is the BU/master Company (`product.company_id`, reached
through each Lead/CallTracker's `product` relation) — the same field the
Cash Flow Report's Company filter uses — not the client-facing Client
Company (`client_company_id`). `Lead.company_id` looks like the obvious
field but is legacy/unused — every row in production has it `null` — so
filtering on it directly returns zero regardless of which company is
picked; don't reintroduce that.

Selecting a Company or Product re-scopes every section, including Categories
4 and 5 (Product-wise / Opportunity-value-wise quadrant charts) — unlike the
BDE filter's md file previously claimed, those two charts are built from the
same lead fetch as Category 1, so they were already narrowed by the BDE
filter too; Company/Product follow the same rule intentionally.

Filter order in the header is **Company → BDE → Product**. Picking a Company
resets any selected Product (it may not belong to the new company) and
narrows the Product dropdown's own option list to that company's products,
mirroring the Cash Flow Report's Company → Product cascade.

Picking a **BDE** narrows the Product dropdown further to that BDE's
**mapped products** — the ones they hold a `UserProductTarget` row for
(same "mapped" concept as the SEAL/Sales summary). A selected Product that
isn't among the BDE's mapped products is cleared, same as the BDE filter
clears itself when a Company/Product change drops it out of its own list.

"All Companies" / "All Products" (the default, empty selection) leaves the
role/BDE scope untouched.

## Dropdown options

- Company — `GET /api/masters/company`, filtered client-side to
  `is_active !== false`.
- Product — `GET /reports/dashboard-products` (`getDashboardProducts`,
  `reportController.ts`), filtered client-side to `is_active !== false`.
  Passes `company_id` when a Company is selected and `bde_id` when a BDE is
  selected. With no `bde_id` it returns the same set as the old
  `/masters/product` call (active products, optionally company-scoped); with
  a `bde_id` it returns only that user's `UserProductTarget` products.
  `bde_id` is RBAC-validated via `buildRoleScope(user, bdeId)` — a
  SalesManager asking for a BDE outside their team gets 403.

## Backend

- `GET /reports/dashboard`, `GET /reports/sales-activities` — accept
  `company_id` / `product_id` alongside the existing `bde_id`.
  `applyDashboardFilters()` (`reportController.ts`) merges them into the
  `leadWhere` returned by `buildRoleScope`, and into `callTrackerWhere` too.
  Neither Lead nor CallTracker has a populated `company_id` of its own, so
  the Company filter reaches both via their `product` relation
  (`product: { company_id }`) instead. The CR12 Existing EDC Milestones
  raw-SQL count mirrors the same condition as a `product_id IN (SELECT id
  FROM product WHERE company_id = …)` subquery.
- `GET /cashflow-report/dashboard-activities` — same two params, applied by
  `buildLeadScope(user, managementAccess, companyId, bdeId)` for company (as
  it already did for the main Cash Flow Report) plus a manual
  `l.product_id = ?` condition for product, mirroring
  `getCashflowReportBdes`'s own product_id handling.

Both filters apply for every role — there's no team-membership check to make
(unlike `bde_id`, which a SalesManager can only narrow to their own team).

## Category 4 slice labels

The Product-wise pie slices (`renderSliceLabel`, `Dashboard.tsx`) print the
lead **count** on each slice, not a percentage — matching Category 5's
Opportunity-value pies (`renderOpportunitySliceLabel`), which already showed
count. The tooltip for both charts still shows count and percentage
together; only the on-slice label changed.

## Drill-through links

Product carries across to every card's link: `product_id` (Lead Report),
`productId` (Call Tracker), `product_id` (Cash Flow Report). Company carries
across only to the Cash Flow Report's link (`company_id`) — the Lead Report
and Call Tracker pages have no Company filter of their own to receive it, so
a card counted with a Company selected can, after this gap is closed, show a
wider list than the card counted when drilling into either of those two
pages. Flagged here rather than silently working around it; closing it means
adding a Company filter to `Leads.tsx` and `CallTracker.tsx`, which is
outside this change's scope.
