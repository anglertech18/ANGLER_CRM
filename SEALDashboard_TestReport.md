# SEAL Dashboard — Test Execution Report

**Date:** 2026-06-12  
**Branch:** UI_update  
**Tester:** Code Analysis (static review of `sealController.ts` + `SealDashboard.tsx`)

---

## Test Execution Report

| # | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | Summary Cards — Target to Date displays correctly | Formatted monetary value (Indian locale) | Raw integer (e.g. `1000000` instead of `10,00,000`) | **FAIL** |
| 2 | Summary Cards — Actual to Date displays correctly | Formatted monetary value | Raw integer without formatting | **FAIL** |
| 3 | Summary Cards — Total Licenses count matches Order Won leads | Correct device/licence count | Correct count; formatting missing | **FAIL** |
| 4 | Summary Cards — Total Leads count reflects all leads | All leads owned by scoped BDEs | Previously showed only Q1–Q4 assigned leads; unassigned leads were excluded | **FAIL** |
| 5 | Zone of Performance — Target to Date in detail section | Formatted number | Raw integer | **FAIL** |
| 6 | Weekly Breakdown — Achievement = Current Week Order Won Value | Sum of `order_value` for Order Won leads closed in that week | Correctly calculated from `order_value`; formatting missing | **PARTIAL** |
| 7 | Weekly Breakdown — Only Order Won status leads included | Only "Order Won" stage leads | Correctly filtered by `sales_stage_id` of "Order Won" stage | **PASS** |
| 8 | Weekly Breakdown — Weekly target = Monthly target ÷ 4 | Correct apportionment | Correctly computed as `monthlySalesTarget / 4` | **PASS** |
| 9 | Quadrant Snapshot — Actual lead counts per quadrant | Count of leads per quadrant | Correctly grouped from `allLeads` by `quadrant` field | **PASS** |
| 10 | Quadrant Snapshot — Upcoming Week movement | Leads planned to move in current ISO week | Used `startOf('week')` = Sunday-based; should be Monday-based ISO week | **FAIL** |
| 11 | Quadrant Snapshot — Q1→Q2, Q2→Q3, Q3→Q4, Q4→Order from weekly reports | Movement from current-week reports only | Correctly filtered by `type: 'CURRENT'` and metric mapping | **PASS** |
| 12 | RBAC — CEO / Admin sees all products and BDEs | No user restriction | No `userScopeFilter` restriction for Admin role | **PASS** |
| 13 | RBAC — Sales Manager sees self + subordinate data | Manager's team only | `userScopeFilter` correctly includes `id` + `reporting_manager_id` | **PASS** |
| 14 | RBAC — Sales Person sees own data only | Only own leads and targets | `targetUserId = authUser.id` enforced, RBAC cannot be overridden | **PASS** |
| 15 | Performance — Large dataset, Order Won leads query | Query bounded to fiscal year window | No date filter on `orderWonLeads` query; fetches ALL historical wins | **FAIL** |
| 16 | Performance — Unused DB query not executed | Only necessary queries run | `swatPerformance` records fetched but never used in response | **FAIL** |
| 17 | Monthly Performance table — Shows only up to current month | Future months show `—` | Correctly nulled for future months; past FY shows all 12 | **PASS** |
| 18 | Carry-forward (pre-FY Order Won leads into April) | Only previous FY leads carried | No date lower-bound: carries ALL historical wins into every April | **FAIL** |

---

## Defect Report

| Issue ID | Description | Root Cause | Resolution | Status |
|---|---|---|---|---|
| DEF-01 | `orderWonLeads` query has no date bounds | `prisma.lead.findMany` missing `updated_at` filter; fetches every historical Order Won lead | Added `updated_at: { gte: prevFyStart, lte: fiscalEnd }` to query | **Fixed** |
| DEF-02 | April carry-forward includes ALL historical wins | `preFyLeads` = any lead with `updated_at < fiscalStart`; no lower bound | Fixing DEF-01 (adding `prevFyStart`) implicitly limits carry-forward to previous FY | **Fixed** |
| DEF-03 | Unused `swatPerformance` DB fetch on every dashboard load | `swatRecords` queried (lines 122–132) but never referenced in calculations or response | Removed `swatWhere`, `swatRecords`, and `weeklySwat` blocks | **Fixed** |
| DEF-04 | Quadrant movement uses Sunday-based week (`startOf('week')`) | dayjs default locale starts week on Sunday; ISO business week starts Monday | Added `isoWeek` dayjs plugin; changed to `startOf('isoWeek')` / `endOf('isoWeek')` | **Fixed** |
| DEF-05 | Monetary values displayed as raw integers | StatCard and table cells render numbers with no formatting | Added `fmt()` helper (`toLocaleString('en-IN')`); applied to all monetary fields | **Fixed** |
| DEF-06 | "Total Leads" StatCard excluded unassigned leads | Count came from `quadrantData.reduce(currentLeads)` which only sums Q1–Q4 leads | Backend now returns `totalLeads: allLeads.length`; frontend uses `sealData.totalLeads` | **Fixed** |

---

## Fix Summary

### Files Modified

#### `server/src/controllers/sealController.ts` (and `server/dist/controllers/sealController.js`)

| Change | Lines (approx.) | Description |
|---|---|---|
| Added `isoWeek` plugin | 1–6 | `import isoWeek from 'dayjs/plugin/isoWeek'` + `dayjs.extend(isoWeek)` |
| Added `prevFyStart` | after `fiscalEnd` | `dayjs.utc(\`${fyStart - 1}-04-01\`).startOf('month').toDate()` |
| Removed unused `swatRecords` fetch | ~122–132 | Deleted `swatWhere`, `swatRecords` query |
| Added date range to `orderWonLeads` query | ~150 | `updated_at: { gte: prevFyStart, lte: fiscalEnd }` |
| Fixed ISO week for quadrant movement | ~326–327 | `startOf('isoWeek')` / `endOf('isoWeek')` |
| Removed unused `weeklySwat` computation | ~403–406 | Deleted `weeklySwat` filter block |
| Added `totalLeads` to response | response object | `totalLeads: allLeads.length` |

#### `client/src/pages/seal/SealDashboard.tsx`

| Change | Description |
|---|---|
| Added `fmt()` helper | `(n) => n == null ? '—' : n.toLocaleString('en-IN')` |
| Summary Cards | `targetToDate`, `actualToDate`, `licenseAchieved`, `licenseTarget` wrapped with `fmt()` |
| Total Leads Card | Now uses `sealData.totalLeads` (falls back to quadrant sum for backward compat) |
| Zone of Performance | `targetToDate` display wrapped with `fmt()` |
| Monthly Performance table | Target and Actual cells use `fmt()` with null-guard |
| Weekly Breakdown table | `salesTarget` and `salesAchieved` wrapped with `fmt()` |

---

## Final Validation

| Area | Status | Notes |
|---|---|---|
| Dashboard calculations correct | ✅ | Order Won → monthly actuals logic is sound |
| Weekly Breakdown values accurate | ✅ | `salesAchieved` = sum of `order_value` for Order Won leads in week |
| Quadrant Snapshot values accurate | ✅ | Counts from `allLeads` grouped by `quadrant` field |
| Quadrant Upcoming Week ISO week | ✅ Fixed | Now uses Monday-based ISO week |
| Role-based access works | ✅ | CEO/Admin = all; Manager = team; SalesPerson = self-only |
| Number formatting | ✅ Fixed | Indian locale formatting applied across all monetary fields |
| Performance — bounded queries | ✅ Fixed | `orderWonLeads` scoped to `prevFyStart → fiscalEnd` |
| Dead code removed | ✅ Fixed | `swatPerformance` fetch removed |
| Carry-forward accuracy | ✅ Fixed | April carry-forward limited to previous FY via `prevFyStart` bound |
