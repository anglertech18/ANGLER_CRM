# Lead Gen Summary Module — Implementation Reference

This document reflects the **actual implemented behavior** of the Lead Gen Summary
module (supersedes the original functional spec). Source of truth:

- Backend: `server/src/controllers/leadGenController.ts`, `server/src/routes/leadGenRoutes.ts`
- Frontend: `client/src/pages/LeadGenSummary.tsx`
- Privilege module name: `LeadGenSummary` (`can_view` gates all three endpoints)

---

# Endpoints

| Method | Path                    | Handler              | Purpose                                      |
| ------ | ------------------------ | --------------------- | --------------------------------------------- |
| GET    | `/api/lead-gen`          | `getLeadGenSummary`   | Main dashboard payload, grouped by Lead Source Type (weekly + monthly per type) |
| GET    | `/api/lead-gen/bdes`     | `getLeadGenBdes`      | BDE dropdown options, RBAC-scoped              |
| GET    | `/api/lead-gen/products` | `getLeadGenProducts`  | Product dropdown options, reloads on BDE change |

All three require `authenticate` + `checkPrivilege('LeadGenSummary', 'can_view')`.

---

# Filters (as implemented)

Order in the UI: **Company → Lead Source Type → BDE → Product → Month → Week**.

## Company filter (2026-08-20)
- Optional, first in the filter row — the same BU/master Company used by the
  Dashboard and Cash Flow Report Company filters (`Product.company_id`).
- Options: `GET /masters/company`, filtered client-side to `is_active !== false`.
- Picking a Company:
  - Resets the selected Product (`sel_id`) — it may not belong to the new
    company — mirroring the Dashboard's Company → Product cascade.
  - Narrows `GET /lead-gen/products` to that company's active products
    (`company_id` param, applied on top of any `bde_id` filter already there).
  - Narrows `GET /lead-gen/bdes` to users mapped, via `UserProductTarget`, to
    any active product under that company (`company_id` param) — only used
    when no `product_id`/`service_department` is also passed.
- `"All Companies"` (default, empty) leaves Product/BDE scope untouched by
  this filter.

## Lead Source Type filter (2026-08-20)
- Optional, sits next to Company — options are the active rows from
  Masters → Lead Source Type (`GET /masters/leadsourcetype`).
- Picking a type:
  - Narrows `GET /lead-gen/bdes` to the **mapped BDEs list** for that type:
    unrestricted BDEs (no `userleadsourcetype` rows — see every type) plus
    BDEs explicitly assigned that type via Manage Privileges → Lead Source
    Types. Same allow logic as the per-BDE restriction described below,
    applied here for dropdown narrowing rather than row filtering.
  - Narrows `GET /api/lead-gen` (`lead_source_type_id` param) to return just
    that one entry in `lead_source_types[]` instead of every active type.
- `"All Lead Source Types"` (default, empty) restores the full per-type card
  list and the unnarrowed BDE dropdown.

## BDE filter
- Defaults to the logged-in user (`authUser.id`) on first load.
- Populated from `GET /lead-gen/bdes`, RBAC-scoped (see RBAC section) and
  further narrowed by the Company and Lead Source Type filters above when set.
- `"All BDEs"` is a valid selection (`bde_id` omitted) — falls back to an
  aggregate view scoped by role.
- A Company/Lead Source Type change that drops the currently selected BDE out
  of the narrowed list clears the selection (`bdesLoaded` reconciliation
  effect in `LeadGenSummary.tsx`), mirroring the Dashboard's BDE filter.

## Product filter
- Always enabled (never disabled), independent control from BDE.
- `GET /lead-gen/products`:
  - No `bde_id` → all active products (`Product.is_active = true`), optionally
    narrowed by `company_id` (see Company filter above).
  - With `bde_id` → only products mapped to that BDE via `UserProductTarget`,
    optionally narrowed by `company_id` too.
- Frontend reconciliation effect (`LeadGenSummary.tsx`): whenever the mapped
  product list changes (i.e. BDE or Company changed), if the currently
  selected product is no longer in the list it is cleared and the first
  mapped product is auto-selected; if the list is empty, selection is cleared
  and the dropdown shows **"No Products Available"**.
- Note: the current implementation is **product-only** — there is no
  service-department UI control on this page, though the controller still
  contains `service_department` handling (`isServiceMode`) as shared/legacy
  logic mirrored from the SEAL controller pattern. It is not wired up from the
  frontend today.

## Month filter
- Options: January through the current month of the current year
  (`availableMonths`), i.e. future months are not selectable.
- Changing month resets the week selection to `1`.

## Week filter
- Real **calendar weeks (Monday–Sunday)**, clipped to the selected month —
  computed by `buildCalendarWeeks()` on the backend and mirrored client-side.
- First/last week of a month may be a partial week; a week never spans into
  the previous/next month.
- Label shown is the actual date range, e.g. `01 Aug – 07 Aug` (backend
  returns `week_label` for the currently selected week).
- Default week on load = the calendar week containing today's date, when the
  selected month/year is the current month; otherwise week 1.

## Reset
- Resets BDE to the logged-in user, clears the Company and Lead Source Type
  selections, and clears the product selection (returns to the empty state).

## Persistence
- Filter state is persisted via `usePersistentFilters('leadgen', …)`
  (`sel_type`, `sel_id`, `bde_id`, `company_id`, `lead_source_type_id`,
  `sel_month`, `sel_year`, `sel_week`).

---

# RBAC (as implemented)

Resolved once per request into a scoped `userIds: number[]` array.

| Role         | Behavior                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------- |
| SalesPerson  | Always scoped to `[authUser.id]`, regardless of `bde_id` passed.                               |
| SalesManager | If `bde_id` given: must be self or anywhere in their downward reporting tree (all levels, via `utils/teamScope`), else `403`. If no `bde_id`: aggregate view over self + full downward reporting tree. |
| CEO / other  | If `bde_id` given: that user, no ownership check. If no `bde_id`: aggregate view, all `ACTIVE` non-CEO users (`role != 'CEO'`) mapped to the product/proxy product. |

For a CEO/other caller's aggregate view, only actual BDEs (`SalesPerson` /
`SalesManager`) are included — CEO/admin accounts are excluded even if
mapped to the product via `UserProductTarget`. SalesPerson/SalesManager
scoping is unaffected (a SalesManager's own scope is never a CEO account).

`getLeadGenBdes` mirrors the same role scoping for the dropdown itself
(including the CEO exclusion above), plus one additional opt-in override: if
the caller passes `company_ids` **and** `authUser.cashflow_management_access`
is true, BDE scope is overridden to users belonging to those companies (used
by the Cashflow Report Management Access feature) — otherwise `company_ids`
is ignored.

**Privilege-gated (2026-08-19):** on top of the role scope, both the BDE
dropdown (`getLeadGenBdes`) and the "All BDEs" aggregate view
(`getLeadGenSummary`) only include users who hold the `LeadGenSummary`
`can_view` privilege themselves (`Privilege` row, `module_name =
'LeadGenSummary'`). Access to this privilege is deny-by-default per user
(granted from **Manage Privileges → Lead Gen Summary** on a user), so a BDE
without that grant no longer appears in the dropdown, and their numbers are
no longer folded into the "All BDEs" total.

`getLeadGenProducts` enforces the same self/direct-report check when a
specific `bde_id` is requested by a non-CEO caller.

## Per-BDE Lead Source Type restriction

Independent of the role scoping above: some BDEs only work specific Lead
Source Types (e.g. Selvam → Direct + Reference only, Ramasamy → Digital
only). Stored in `userleadsourcetype` (`user_id`, `lead_source_type_id`),
managed from **Manage Privileges → Lead Source Types** for a user
(`client/src/pages/admin/Privileges.tsx`), via
`GET/POST /api/privileges/:userId/lead-source-types`
(`PrivilegeMaster` `can_view`/`can_edit`).

- **No rows for a user = unrestricted** — that BDE is still included under
  every active Lead Source Type section (the prior/default behavior).
- **Rows present = restricted** — the BDE is only included in the
  `lead_source_types[]` sections matching an assigned `lead_source_type_id`;
  they're left out of every other type's `bde_rows` and totals entirely
  (not shown with zeroed metrics).
- **A type's whole table is dropped when no in-scope BDE applies to it** —
  not just the individual rows. E.g. selecting Selvam alone (restricted to
  Direct + Reference) returns `lead_source_types` containing only Direct and
  Reference; Digital isn't in the array at all. Same for "All BDEs": a type
  only appears if at least one in-scope BDE is applicable to it (unrestricted,
  or explicitly assigned that type) — Selvam only shows up under
  Direct/Reference, Ramasamy only under Digital.
- Applied in `getLeadGenSummary` per Lead Source Type section, after the role
  scoping resolves `userIds` — it narrows, never widens, that set.

---

# Data sources & calculation logic

All calculations share one **batch window** per request:
`batchStart = min(weekStart, monthStart)`, `batchEnd = max(weekEnd, monthEnd)`
— records are fetched once for the union of the week and month ranges, then
sliced in memory per period per BDE (`aggSwat`, `countCalls`, `leadBreakdown`)
to avoid duplicate queries.

## 1. Direct Marketing Calls

**Target** — from `UserProductTarget.calls_target` (per user, per product),
a **daily** figure, scaled by the count of actual Monday–Friday working days
in the selected range (`countWorkingDays()`), not a fixed ×5 / ×20 multiplier.

**Achieved** — `CallTracker` records where `call_status_id IS NOT NULL`,
`date` within range, same product/user filter. Count of matching rows.

**%** — `round(achieved / target * 100)`, `0` if target is `0`.

## 2. Lead Target (Q1 Lead Target)

Derived from `UserProductTarget.leads_target` and the product's
`lead_q1_multiplier`:

```
dailyQ1Target = round(leads_target * product.lead_q1_multiplier / 22)
```

then scaled by actual working days in the range, same as Calls Target.

### 2a. Exception — the "Digital" section's Lead Target/Achieved

The **Digital** Lead Source Type's Lead Target/Achieved columns are sourced
differently from every other section: they come from converted Enquiries
directly (below), independent of whichever `enquiry_date` the resulting Lead
ends up with, since Lead Achievement there needs to be counted by
`converted_at` (when the conversion happened) rather than the Lead's own
enquiry date.

**Historical note (fixed 2026-08-20):** until this date, a Lead created by
converting an Enquiry (`enquiryController.ts` `createEnquiry`/`updateEnquiry`)
never got `Lead.enquiry_date` set at all — so on top of Lead Achievement using
the Enquiry-conversion count above, that Lead's **Sales Pipeline** entry (§4,
which is always enquiry_date-based, Digital included) silently never
appeared in any range either, since leads with no `enquiry_date` are excluded
from every range. Enquiry conversion now carries the Enquiry's own `date`
field over as the new Lead's `enquiry_date`, so its Sales Pipeline entry
surfaces normally going forward. **Leads converted before this fix still have
no `enquiry_date` and remain invisible in Sales Pipeline for their historical
period** — this needs a one-off data backfill (not done here) to backdate
`enquiry_date` from `Lead.created_at` or `Enquiry.date` for those existing
rows.

**Target** — `UserProductTarget.digital_leads_target` (per user, per
product), a **daily** figure scaled by working days — same mechanism as
Calls Target (§1), not the Q1-multiplier formula above.

**Achieved** — count of `Enquiry` rows where `is_converted = true`,
`converted_to = 'Lead'`, `converted_at` within the selected range,
`lead_source_id` mapped to the "Digital" `LeadSourceType`, `created_by_id`
in the scoped BDE set, and `product_id`/`service_department` matching the
selection. Counted by `converted_at` (when the conversion actually
happened), not the Enquiry's own `date`.

Attributed to `created_by_id` — the BDE who originated the Enquiry — not
`allocated_to_id`, which can be reassigned to a different user afterwards;
the achievement stays with whoever logged it, regardless of later
reallocation. `created_by_id` is nullable on older rows (pre-dates the field
being populated consistently) — those enquiries don't count toward anyone,
same as any other unattributed record.

Every other Lead Source Type section is unaffected — Lead Target/Achieved
there still come from `leads_target`/the Lead-table pipeline set as
described below.

## 3. Lead Source Type mapping (drives Lead Achievement, Sales Pipeline, and Calls)

Lead Achievement, Sales Pipeline, and Calls Achieved are **no longer
restricted to a hard-coded Lead Source list**. Instead, the module renders
one full section per active `LeadSourceType` (Masters → Lead Source Type),
and each section is scoped to whichever `LeadSource` rows are mapped to that
type (`LeadSource.lead_source_type_id`, set via Masters → Lead Source):

```
Lead Source Type (active)
       ↓
Lead Sources mapped to it
       ↓
Leads / CallTracker rows whose lead_source_id is one of those sources
       ↓
Lead Achievement / Sales Pipeline / Calls Achieved (per section)
```

Adding a new `LeadSourceType` or mapping a new `LeadSource` to one takes
effect immediately with no code change. A `LeadSource` left unmapped
(`lead_source_type_id = NULL`) does not appear in any section.

The controller resolves this once per request: it loads all active
`LeadSourceType` rows with their mapped `LeadSource` ids, fetches the leads
and CallTracker rows for the batch window filtered to any mapped source id,
then splits both in memory per type (`leadsByType` / `callsByType`) — no
extra query per type (see §7 Performance).

## 4. Lead Achievement & Sales Pipeline

Both are computed from **the same filtered lead set for a given Lead Source
Type section** — a lead only counts toward that section's Lead Achievement
or pipeline breakdown if its `lead_source_id` is mapped to that section's
type.

Filter: `lead_owner_id IN userIds`, `enquiry_date` within range, `product_id`
matches selection, `lead_source_id` in the type's mapped sources. Leads with
no `enquiry_date` are excluded from every range (they never match `gte`/`lte`).

- **Lead Achievement** = count of leads in that filtered set for the range.
- **Lead % ** = `round(achieved / target * 100)`.
- **Sales Pipeline** = the same filtered leads grouped by `quadrant`, in
  fixed display order:

  | Column     | `Lead.quadrant` value |
  | ---------- | ---------------------- |
  | Order Won  | `Order Won`            |
  | Q4         | `Q4`                   |
  | Q3         | `Q3`                   |
  | Q2         | `Q2`                   |
  | Q1         | `Q1`                   |
  | Nurturing  | `Nurturing`             |
  | Order Lost | `Order Lost`           |

  Pipeline `Total` always equals Lead Achievement, by construction (same
  set) — **except the "Digital" section**, whose Lead Achievement instead
  comes from converted Enquiries (§2a); its Sales Pipeline block still
  reflects the Lead-table/`enquiry_date` set as usual, so the two numbers can
  differ there.

Each pipeline cell and the Lead Achievement cell carry a `lead_details` list
(id, display name, enquiry date, lead source) surfaced as a hover tooltip in
the UI (`PipelineTooltip`), capped at 12 rows shown with a "+N more" footer.
For the Digital section's Lead Achievement cell specifically, the tooltip
list is the converted-Enquiry list (`row.leads.details`) instead — see §2a.

## 5. Calls Achieved — also Lead Source Type scoped

Calls Achieved now applies the same mapping as Lead Achievement: a
`CallTracker` row only counts toward a given section if its `lead_source_id`
is mapped to that section's `LeadSourceType`. `CallTracker.lead_source_id`
is a **direct FK to `LeadSource`**, independent of `Lead` — no join through
the `Lead` table is needed or used.

**Calls Target is unaffected** — it stays exactly `UserProductTarget.calls_target`
scaled by working days (§1), unchanged and identical across every Lead
Source Type section. Only *Achieved* is scoped per type.

## 6. Demo Given

`SwatPerformance.demos_achieved`, summed over the range for the
user/product filter. Simple `Sum(demos_achieved)`. Not scoped by Lead Source
Type — identical across every section (SWAT records aren't tied to a Lead
Source).

## 7. Proposals Submitted

`SwatPerformance.proposals_achieved`, summed over the range for the
user/product filter. Simple `Sum(proposals_achieved)`. Not scoped by Lead
Source Type, same as Demo Given.

## 8. Performance — fetch once, group in memory

Leads and CallTracker rows are each fetched **once** per request (already
scoped to any mapped source id, across the whole batch window), then split
in memory per Lead Source Type (`leadsByType` / `callsByType` in
`leadGenController.ts`) before being sliced again per BDE/period by the
existing `leadBreakdown` / `countCalls` helpers. No per-type database query
is issued.

---

# Response shape (`GET /api/lead-gen`)

```jsonc
{
  "product_name": "Vendora",
  "service_dept": null,
  "is_product_mode": true,
  "sel_month": 8, "sel_year": 2026, "sel_week": 2,
  "total_weeks": 5,
  "week_day_start": 8, "week_day_end": 14,
  "week_label": "08 Aug – 14 Aug",
  "lead_source_types": [
    {
      "id": 1,
      "name": "Direct",
      "sources": ["Telecall", "Exhibition", "Trade Show", "LinkedIn"],
      "weekly":  { "bde_rows": [ /* one row per userId */ ], "total": { /* summed metrics */ } },
      "monthly": { "bde_rows": [ ... ], "total": { ... } }
    },
    { "id": 2, "name": "Digital",  "sources": [], "weekly": { ... }, "monthly": { ... } },
    { "id": 3, "name": "Referral", "sources": ["Reference - Client", "Reference - Management"], "weekly": { ... }, "monthly": { ... } }
  ]
}
```

One entry per active `LeadSourceType`, in ascending `id` order. Each entry's
`weekly`/`monthly` carries the same shape the old top-level `weekly`/
`monthly` used to (this replaced that top-level pair — there is no
type-agnostic combined total anymore). `sources` lists the `LeadSource`
names currently mapped to that type — used by the UI footer and empty for a
type with nothing mapped yet.

Each row (`BdeRow`) and the `total` object share the same `Metrics` shape:

```jsonc
{
  "calls":        { "target": 0, "achieved": 0, "percent": 0 },
  "leads":        { "target": 0, "achieved": 0, "percent": 0 },
  "lead_count":   { "order_won": 0, "q4": 0, "q3": 0, "q2": 0, "q1": 0, "nurturing": 0, "order_lost": 0, "total": 0 },
  "lead_details": { /* same keys as lead_count, each an array of {id,name,created_at,source} */ },
  "demos":        { "achieved": 0 },
  "proposals":    { "submitted": 0 }
}
```

If RBAC resolves to an empty `userIds` list, every `lead_source_types[].weekly`/
`.monthly` returns empty `bde_rows` with a zeroed `total` (`emptyMetrics()`)
rather than an error. If there are no active Lead Source Types at all,
`lead_source_types` is `[]`.

---

# UI layout

One card per entry in `lead_source_types`, heading generated dynamically as
`"{NAME} DETAIL — {product}"` (no hard-coded type names). Inside each card:
a single table with a `PeriodSection` for Week (always visible) and, when
expanded, one for Month — collapsed by default behind a **View Month-wise**
/ **Hide Month-wise** toggle in the card header (state is per-card, kept in
the page's `expandedTypes` set). Each `PeriodSection` renders one row per BDE
in scope plus a highlighted **Total** row. Column groups, left to right: BDE
→ "{Type} Calls" (Target/Achieved/%, header dynamic per Lead Source Type —
e.g. "Direct Calls", "Digital Calls" — not hard-coded) → Lead Target
(Target/Achieved/%) → Sales Pipeline (7 stage columns + Total) → Demo Given →
Proposals. `%`
cells render as a colored badge + progress bar (`pctColor`: ≥90 green, ≥60
amber, else red). Pipeline and Lead-Achieved cells are hoverable to reveal
the underlying lead list via a single page-level, fixed-position tooltip
shared by every card. Dismissal isn't left to `onMouseLeave` alone — a
`mousemove` listener double-checks (via `elementFromPoint`) that the pointer
is still over a `[data-hover-count]` cell and clears the tooltip otherwise, so
it can't get stuck on screen if the leave event is ever missed (e.g. the
hovered row is reconciled out from under the pointer by a refetch).

Empty state (no product selected) and loading skeleton are shown in place of
the cards; a retry banner is shown on fetch error; a notice is shown instead
of any cards if `lead_source_types` is empty.

---

# Notes / divergences from the original spec

- The Week filter previously showed "Week 1, Week 2…" labels; now shows real
  clipped calendar-week date ranges — implemented as specified.
- Calls/Lead Target no longer use fixed ×5 (weekly) / ×20 (monthly)
  multipliers from the original business-sheet formula; they scale by actual
  Mon–Fri working days in the selected range instead, so a partial first/last
  week is scaled correctly.
- Lead Target is computed via `lead_q1_multiplier`, not a separate
  "Q1 Lead Target" field — see SWAT module for where that multiplier is
  configured per product.
- Lead Achievement, Sales Pipeline, and Calls Achieved were previously
  restricted to four hard-coded Lead Sources (LinkedIn, Trade Show,
  Exhibition, Telecall). This has been replaced with the dynamic Lead
  Source Type mapping described in §3 above — a `LeadSource` only
  contributes to a section if it is mapped to that section's active
  `LeadSourceType`.
- Lead Achievement / Sales Pipeline date filter was switched from
  `Lead.created_at` to `Lead.enquiry_date` (2026-08-14) — leads without an
  `enquiry_date` no longer count toward any range.
- Service-department mode (`service_department` filter) exists in the
  controller but is not exposed in the current frontend — product is the only
  selectable mode today.
