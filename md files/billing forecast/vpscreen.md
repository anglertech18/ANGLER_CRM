# Billing Forecast — VP Screen Development Prompt

Design and develop the **Billing Forecast module UI screens** in the existing CRM. Focus only on the **VP screens/UI flow** and do not change existing business logic.

The module contains **3 screens**:

---

## Screen 1 — Billing Forecast Milestone Selection

### Header

**Billing Forecast Milestones Planning**

### Customer Search

Provide a searchable **Company / Client** autocomplete field.

* User must type minimum **3 characters**.
* Show matching company names.
* Selecting a company narrows the milestone list to that customer.

### Milestone List

By default (no company selected), show **every not-yet-added ("incomplete")
milestone** in the user's scope, so there's a full worklist to act on without
having to search first. Display the milestones in a table.

| Select | Client / Project | Vertical | Product   | Milestone   |    Amount |
| ------ | ---------------- | -------- | --------- | ----------- | --------: |
| □      | ABC Project      | IT       | Product A | Milestone 1 | ₹5,00,000 |
| □      | ABC Project      | IT       | Product A | Milestone 2 | ₹3,00,000 |

### Actions

* **Select All**
* Individual milestone checkbox
* **Add to Billing Forecast**

After clicking **Add to Billing Forecast**, selected milestones should appear in the Billing Forecast Tracker.

### UX Requirements

* Show selected milestone count.
* Prevent already-added milestones from being selected again.
* Paginate the milestone list (client-side). A "Rows:" page-size selector
  sits at the top of the table (5 / 10 / 25 / 50 / 100, default 5); page
  resets to 1 when filters or page size change.
* The milestone table scrolls both ways inside its own
  `overflow-auto max-h-[65vh]` wrapper (`min-w-[860px]`, sticky header) so
  the page body never overflows on narrow screens or with a large page
  size; the header and filter bar wrap. Screens 2 & 3 use the same
  `overflow-auto max-h`/sticky-header pattern with their own `min-w`
  (Tracker `820px`, Achieved Report `960px`).
* Show clear success/error notification.
* Keep the screen clean and management-friendly.

---

# Screen 2 — Billing Forecast Tracker

### Header

**Billing Forecast Tracker**

### Filter Section

Provide standard CRM filters:

* Company / Client
* Product
* Our Company
* Vertical
* BDE
* EDC Status (All / Upcoming / Expired) — `edc_status`, compares
  `COALESCE(bf.edc_payment_collection, lm.revised_edc, lm.edc)` against today
* Duration — same Week/Month + Quarter multi-select as the Cashflow Report
  (`quick_filter` / `quarter`), each checked option an OR window on that same
  shown-EDC expression
* EDC From / To date range — `from_date` / `to_date`, open-ended either side,
  on the same shown-EDC expression

Provide:

* **Apply Filter**
* **Reset**

### Forecast Table

| Client / Project | Vertical / Product  | Milestone   |    Amount | Milestone EDC | Invoice EDC | Invoice Details | Status   |
| ---------------- | ------------------- | ----------- | --------: | ------------- | ----------- | --------------- | -------- |
| ABC / Project A  | IT / Product A      | Milestone 1 | ₹5,00,000 | 12-Feb-26     | 30-Aug-26   | Edit            | Forecast |
| XYZ / Project B  | Finance / Product B | Milestone 2 | ₹3,00,000 | 05-Mar-26     | —           | Edit            | Forecast |

**Milestone EDC** shows `lm.edc`. **Invoice EDC** shows
`bf.edc_payment_collection` (the EDC for Payment Collection captured in the
invoice modal), `—` until it is set.

Client-side paginated (`TablePagination`) with a top-of-table "Rows:"
page-size selector (10 / 25 / 50 / 100, default 25); page resets to 1 when
filters or page size change. The "Total Forecast Amount" footer stays the
server's full-result total, not the visible page.

### Edit Action

Clicking **Edit** should open a modal/drawer containing:

**Invoice Details**

* Invoice Number
* Invoice Date
* EDC for Payment Collection

Buttons:

* **Save**
* **Cancel**

After invoice details are saved, the milestone should be reflected as **Billing Achieved**.

### Total

Display a total row at the bottom:

**Total Forecast Amount: ₹XX,XX,XXX**

The total must reflect the currently filtered records.

### Status

Use clear visual status indicators:

* **Pending** (badge label for the `Forecast` DB status — not yet invoiced)
* **Achieved**

---

# Screen 3 — Billing Achieved Report

### Header

**Billing Achieved Report**

### Filter Section

Use the same standard filters:

* Company / Client
* Product
* Our Company
* Vertical
* BDE
* EDC Status (All / Upcoming / Expired) — `edc_status`, same control as the
  Milestone Planning screen. Compares the EDC each row actually shows against
  today: `COALESCE(bf.edc_payment_collection, lm.revised_edc, lm.edc)` — so an
  Achieved row is judged on its recorded payment-collection date, a Pending row
  on its (revised) milestone EDC. Applied to both sections.
* Duration + EDC From / To date range — see the 2026-08-30 note below;
  both on that same shown-EDC expression.
* Status (All / Achieved / Pending) — client-side; hides the non-matching
  milestone section

Buttons:

* **Apply Filter**
* **Reset**

### Milestone Tables — Pending & Achieved

Every billing-forecast milestone in scope is shown, split into two
sections by `billing_forecast.status` (Achieved first, then Pending):

* **Achieved** — status `Achieved`. Footer: "Total Achieved Amount".
* **Pending** — status `Forecast` (not yet invoiced). Footer:
  "Total Pending Amount".

| Client / Project | Vertical / Product | Milestone   | Milestone Amount | Invoice Amount | Invoice No. / Date       | Milestone EDC | Invoice EDC | Status   |
| ---------------- | ------------------ | ----------- | ---------------: | -------------: | ----------------------- | ------------- | ----------- | -------- |
| ABC / Project A  | IT / Product A     | Milestone 1 |        ₹5,00,000 |      ₹5,00,000 | INV-001 / 15-Aug-2026   | 20-Aug-2026   | 30-Aug-2026 | Achieved |

Invoice Number (bold) and Invoice Date (muted, below) share one stacked
column.

The **Invoice Amount** column mirrors the Milestone Amount for Achieved
rows and shows `—` for Pending rows (no separate invoice-amount field is
stored). The total bar carries both a Milestone Amount total and an
Invoice Amount total (sum of Achieved rows only).

**Milestone EDC** shows `lm.edc`; **Invoice EDC** shows
`bf.edc_payment_collection`, `—` until it is set (i.e. always `—` for
Pending rows).

Each section is a `MilestoneSection` styled to match the Cash Flow Report
table: blue gradient header band (`from-blue-700 to-blue-800`,
`text-blue-100` uppercase labels), a frozen first "Client / Project"
column (`sticky left-0` + `FROZEN_EDGE` from `CashflowHierarchy`), zebra
white / `bg-slate-50` leaf rows, and a sticky `bg-blue-100` grand-total
bar (`border-t-2 border-blue-400`) carrying "Grand Total"-style label +
count and the section amount. Its own client-side `TablePagination` +
top-of-table "Rows:" selector (10 / 25 / 50 / 100, default 25); page
resets when its rows or page size change. Footer totals come from the
server's full-result summary.

`GET /billing-forecast/achieved` now returns `{ summary, pending,
achieved, rows }` — `rows` kept as an alias of `achieved` for
back-compat; `summary` adds `billing_pending`.

### Total

Display:

**Total Achieved Amount: ₹XX,XX,XXX**

---

# Forecast vs Achieved Section

At the top of the Billing Achieved Report, provide a compact summary section.

### Summary Cards (4)

**Billing Forecast** · **Billing Achieved** · **Billing Pending** ·
**Achievement %**

(The old **Balance** card and the Forecast-vs-Achieved progress-bar block
were removed.)

The summary must update based on the selected filters. `summary.balance`
is still returned by the API but no longer shown.

---

# Overall VP Screen Flow

```text
Billing Forecast
│
├── 1. Billing Forecast Milestones Planning
│       └── Search Company
│             └── Select Existing Milestones
│                    └── Add to Forecast
│
├── 2. Billing Forecast Tracker
│       ├── Filters
│       ├── Forecast Milestones
│       ├── Edit Invoice Details
│       └── Total Forecast
│
└── 3. Billing Achieved Report
        ├── Forecast vs Achieved
        ├── Filters
        ├── Achieved Milestones (+ Total Achieved)
        └── Pending Milestones  (+ Total Pending)
```

## Implementation Notes (2026-08-21)

Implemented as a new "Billing Forecast" module, reusing the existing Order Won
`lead_milestone` data (the same milestones behind Cashflow Tracker/Report)
rather than duplicating milestone entry — a new `billing_forecast` table just
tracks which milestones were pulled into the forecast and their invoice /
achievement state. One-directional: Forecast → Achieved only, once invoice
details are saved (no revert/delete in this version).

- **DB**: `billing_forecast` (migration `database/migrations/20260821/add_billing_forecast.sql`,
  logged in `DATABASE_CHANGELOG.md`). `lead_milestone_id` is unique, so a
  milestone can only ever be added once.
- **Backend**: `server/src/controllers/billingForecastController.ts` +
  `server/src/routes/billingForecastRoutes.ts`, mounted at `/api/billing-forecast`.
  RBAC follows the same SalesPerson-own / SalesManager-team / CEO-unscoped
  pattern as `leadController.ts`'s Order Won endpoints (SalesManager team =
  the full downward reporting tree, all levels, via `utils/teamScope`), gated by a new
  `BillingForecast` privilege module (added to `MODULES` in
  `client/src/pages/admin/Privileges.tsx`).
- **Frontend**: `client/src/pages/billingForecast/` —
  `BillingForecastMilestones.tsx` (Screen 1), `BillingForecastTracker.tsx`
  (Screen 2), `BillingAchievedReport.tsx` (Screen 3). Routed under
  `/billing-forecast/*` in `App.tsx`, new sidebar group in `Layout.tsx` gated
  by `hasPrivilege('BillingForecast', 'can_view')`.
- **Filters**: date filtering across all three screens is the EDC Status +
  Duration pair (see the 2026-08-30 note below); the standalone month
  "Forecast Period" / "Achievement Period" picker was removed. "Our Company"
  maps to the lead's `company_id` (the BU company), matching the Cashflow
  Report's same field.
- **Forecast vs Achieved summary**: the Billing Forecast total honours every
  entity filter so Balance / Achievement % compare like-for-like scopes.
- Kept deliberately flatter than the Cashflow Forecast/Report screens (no
  Company → BDE → Client → Project hierarchy/collapsing) — the spec calls for
  clean, flat, management-scannable tables.

## Implementation Notes (2026-08-24)

Screen 1 no longer requires searching a company before showing anything:
`GET /billing-forecast/milestones` now treats `client_company_id` as optional
— omitted, it returns every not-yet-added milestone in the user's RBAC scope
(`bf.id IS NULL`); passed, it behaves as before (all of that company's
milestones, `already_added` flag included). The frontend fetches this
default list on mount and refetches narrowed by company once one is picked,
instead of gating the whole table behind `selectedCompany`.

Screen 1's table: Client/Project stays one column (falls back to `-` when a
name isn't set); Vertical and Product are now combined into one "Vertical /
Product" column (stacked, same as Client/Project); EDC and Revised EDC each
have their own column (`DD-MMM-YYYY`, falls back to `-`); and a "Collection
Status" column shows the underlying `lead_milestone.collection_status`
(Pending / Partial Paid / Fully Paid / Stuck) via the existing
`CollectionStatusBadge` component, read-only here (editing collection status
stays on the Cashflow Tracker).

Screen 1 also picked up the Cashflow Tracker's entity/status filter bar (Our
Company, Product, Vertical, BDE — `SearchableSelect`/`EntityFilter` — plus
EDC Status via `EdcStatusSelect`, comparing `COALESCE(revised_edc, edc)`
against today, and a Collection Status multi-select), persisted via
`usePersistentFilters('billing-forecast-milestones', …)`. Since Screen 1
must show milestones *before* they're added to the forecast, its BDE option
list can't reuse Screen 2's `/billing-forecast/bdes` endpoint (that only
looks at rows already in `billing_forecast`) — a new
`getBillingForecastMilestoneBdes` endpoint (`/billing-forecast/milestone-bdes`)
scopes off `lead`/`lead_milestone` directly instead, same RBAC pattern.

**Project filter removed (2026-08-29):** the Project `SearchableSelect` is
gone from all three billing-forecast screens, along with the `project`
query param and the `/billing-forecast/projects` +
`/billing-forecast/milestone-projects` endpoints and their controllers.
The `project` (project name) column still shows in each table.

**Duration filter (2026-08-30):** all three billing-forecast screens now
carry the Cashflow Report's Duration multi-select (`DurationSelect` →
`quick_filter` / `quarter`, Week/Month + financial Quarter options). Each
checked option contributes its own OR window on the EDC the row shows —
`COALESCE(lm.revised_edc, lm.edc)` on Screen 1, and
`COALESCE(bf.edc_payment_collection, lm.revised_edc, lm.edc)` on Screens 2 & 3
(shared `buildTrackerRows`). Screens 2 & 3 also gained the `EdcStatusSelect`
(Upcoming / Expired) against the same expression. All three also carry an EDC
From / To date range (`DateRangeFields` → `from_date` / `to_date`,
`resolveDateRange`, open-ended on either side) against that same EDC
expression. The old standalone month "Forecast Period" / "Achievement Period"
picker was removed.

**Our Company filter (2026-08-29):** `GET /billing-forecast/milestone-companies`
(`getBillingForecastMilestoneCompanies`) returns the distinct `company`s the
caller actually has Order Won milestones under, same scope pattern.

**Our Company = product.company_id (2026-09-03):** Screen 1's Our Company filter
(both `getAvailableMilestones` and `getBillingForecastMilestoneCompanies`) now
scopes on `product.company_id` (the BU that owns the product — the same field
the Cashflow Report filters on) instead of the legacy `lead.company_id`, which
is not reliably populated and left the filter returning nothing. Screens 2 & 3
(`buildTrackerRows`) got the same fix: the Our Company filter now compares
`p.company_id`, and the SELECT joins `company co ON co.id = p.company_id`.
On all three screens the Product dropdown is now scoped to the selected Our
Company (`/masters/product?company_id=`) and changing Our Company clears
`product_id` — same pattern as the Cashflow Forecast screen. For a
regular BDE the UI shows the Our Company `SearchableSelect` only when that
list has more than one entry; with exactly one it hides the filter and
forces `our_company_id` to that lone company on every `/milestones` request
(`effectiveOurCompanyId`), and with zero it stays unscoped. Management users
(`role === 'CEO'` or `cashflow_management_access`) always get the filter,
populated from the full `/masters/company` list.

## Implementation Notes (2026-08-29)

Screen 1's milestone list now excludes **Fully Paid** milestones entirely:
`GET /billing-forecast/milestones` adds
`(lm.collection_status IS NULL OR lm.collection_status <> 'Fully Paid')` to its
WHERE clause, so a fully-collected milestone (nothing left to bill/forecast)
never appears regardless of the Collection Status filter. The frontend
Collection Status multi-select on this screen drops the "Fully Paid" option to
match (Pending / Partial Paid / Stuck only).

**Pending-only (2026-09-03):** Screen 1 now lists **only Pending** milestones.
`GET /billing-forecast/milestones` tightened its WHERE clause to
`(lm.collection_status IS NULL OR lm.collection_status = 'Pending')` (a
freshly-saved milestone has NULL and counts as Pending), and dropped the
`collection_status` query param. The frontend removed the Collection Status
multi-select from the filter bar entirely (Partial Paid / Stuck can no longer
appear). The read-only "Collection Status" column stays in the table. Labels
changed "Incomplete" → "Pending".

## UI Design Direction

Create a **clean, modern enterprise CRM interface**.

* Follow the existing CRM design system.
* Use consistent table, filter, modal and button styles.
* Keep information density high but readable.
* Make totals visually prominent.
* Clearly differentiate Forecast and Achieved states.
* Use responsive tables.
* Avoid unnecessary cards, animations or decorative elements.
* Prioritize fast scanning by CEO/COO/Admin users.
* Keep the entire workflow intuitive enough that a management user can understand the forecast → invoice → achieved flow without training.
