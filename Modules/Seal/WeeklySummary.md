# Weekly Summary

Feature reference document for the Weekly Summary submodule (part of the
SEAL module group — see `[[seal-dashboard-module]]`).

## Overview

The Weekly Summary module displays and manages weekly sales activity reports
filed by BDEs. Each report captures planned and actual quadrant movements for
leads (Q1→Q2, Q2→Q3, Q3→Q4, Q4→Order) along with free-text notes. Reports
feed directly into the SEAL Dashboard's Quadrant Leads Snapshot.

---

## Location
- **List / container:** `client/src/pages/seal/WeeklySummary.tsx`
- **Form (add/edit):** `client/src/pages/seal/WeeklyReportForm.tsx`
- **Backend:** `server/src/controllers/sealController.ts` — `getWeeklyReports`, `getLatestWeeklyReport`, `createWeeklyReport`, `updateWeeklyReport`
- **API routes:** `GET/POST /api/seal/weekly-reports`, `PUT /api/seal/weekly-reports/:id`, `GET /api/seal/weekly-reports/latest`, `GET /api/seal/weekly-reports/leads`

Mounted under `/api/seal` with `authenticate` only — no `checkPrivilege`
middleware; RBAC is enforced inline in `sealController.ts`, same as
`[[seal-dashboard-module]]`.

---

## Key Features

### Product Selection
- Dropdown from `GET /api/seal/poas/mapped-products` (RBAC-filtered, shared with `[[poas-module]]`).
- Auto-selects first mapped product on load.
- Selection persisted via `usePersistentFilters('weekly')`.

### BDE and Date Filters
- BDE (`user_id`) — scoped to mapped BDEs for the selected product.
- From Date / To Date — date range on report `date` field.

### Reports List
Displays all weekly reports in reverse-chronological order.

| Column | Description |
|---|---|
| Date | Report date |
| BDE | Name of the BDE who filed the report |
| Product | Product context of the report |
| Q4→Order | Leads planned to convert to Order Won |
| Q3→Q4 | Leads planned to move from Q3 to Q4 |
| Q2→Q3 | Leads planned to move from Q2 to Q3 |
| Q1→Q2 | Leads planned to move from Q1 to Q2 |
| Notes | Truncated notes; hover for full text via React portal tooltip |
| Actions | View (read-only) / Edit / Add new |

### Add / Edit Report (Inline Form)
`WeeklyReportForm` is rendered inline (not a separate page). The form has two sections:

**Previous Week (PREVIOUS entries):**
- Q4→Order leads (multi-select from lead dropdown)
- Q3→Q4 leads
- Q2→Q3 leads
- Q1→Q2 leads
- Notes

**Current Week Plan (CURRENT entries):**
- Same four lead movement fields
- Notes

On add, the form auto-fills the previous week section from the latest existing report (`GET /api/seal/weekly-reports/latest`) to reduce data entry.

### Lead Dropdown
Populated from `GET /api/seal/weekly-reports/leads?user_id=X&product_id=Y`. Returns up to 500 leads owned by or created by the target user, filtered by product for non-SalesPerson roles.

### Notes Tooltip
Full notes text displayed via React portal when hovering the truncated notes cell in the table.

---

## RBAC
| Role | Behaviour |
|---|---|
| CEO / Admin | Sees all reports; can file reports for any user |
| SalesManager | Sees self + subordinates' reports; can file for self or subordinates |
| SalesPerson | Sees only own reports; user_id locked to self |

---

## API Contract

### `GET /api/seal/weekly-reports`
| Param | Type | Description |
|---|---|---|
| `user_id` | number | Filter by BDE; if omitted, RBAC aggregate view |
| `from_date` / `to_date` | date string | Date range |
| `product_id` | number | Filter to reports with leads matching product |

Returns reports with nested `details` (each detail has `type: CURRENT|PREVIOUS`, `metric: Q4_TO_ORDER|Q3_TO_Q4|Q2_TO_Q3|Q1_TO_Q2|NOTES`, and optionally a `lead` relation).

### `POST /api/seal/weekly-reports`
Creates a new report. Body fields:
- `date` — report date
- `user_id` — target BDE (managers only)
- `product_id`
- `curr_q4_to_order`, `curr_q3_to_q4`, `curr_q2_to_q3`, `curr_q1_to_q2` — comma/newline-separated lead IDs
- `curr_notes`
- `prev_q4_to_order`, `prev_q3_to_q4`, `prev_q2_to_q3`, `prev_q1_to_q2`, `prev_notes`

### `PUT /api/seal/weekly-reports/:id`
Updates an existing report. Replaces all details (delete-and-recreate). RBAC: owner or reporting manager only.

### `GET /api/seal/weekly-reports/latest`
Returns the most recent report for a user+product combination, used to pre-fill the Previous Week section of a new report.

### `GET /api/seal/weekly-reports/leads`
Returns leads available for selection in the report form, scoped by user and product.

---

## Integration with SEAL Dashboard
The current week's CURRENT-type report entries are used by `getSealData`
(`[[seal-dashboard-module]]`) to populate the **Quadrant Movement** column in
the SEAL Dashboard's Quadrant Leads Snapshot. Movement counts are
deduplicated across multiple reports for the same week using a `Set` of
`{metric}-{lead_id}` keys.

---

## Known Issues / Notes
- No uniqueness constraint prevents multiple reports being filed for the same user/date/product. The SEAL Dashboard deduplicates by lead ID at read time, but the report list itself will show all duplicates.

---

## Navigation
- Route: `/weekly-summary`
