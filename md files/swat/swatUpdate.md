# SWAT Module & Target Management – Enhancement Requirements

## Overview

This document describes the enhancements required for the **Target Management** and **SWAT Performance Form** modules. These changes should be implemented without affecting any existing business logic or functionality.

---

# 1. Target Management Updates

## New Target Fields

Add the following fields to **User Target Management**:

| Field Name | Type | Description |
|------------|------|-------------|
| Email Target | Numeric | Daily email campaign target for the user |
| LinkedIn Connection Target | Numeric | Daily LinkedIn connection target for the user |

### Requirements

- Add both fields to the Target Management screen.
- Store values per user.
- Follow the existing target management flow and validations.
- Do **not** modify existing target calculations.

---

# 2. SWAT Performance Form Updates

## 2.1 Add New Activities

Add the following activities to the SWAT Performance Form.

### Email Campaign

| Field | Value |
|--------|-------|
| Target | Automatically fetch from **User Target Management → Email Target** |
| Achievement | Manual Entry |
| Remarks | Manual Entry |

---

### LinkedIn Connection Sent

| Field | Value |
|--------|-------|
| Target | Automatically fetch from **User Target Management → LinkedIn Connection Target** |
| Achievement | Manual Entry |
| Remarks | Manual Entry |

---

# 3. Display Hidden Target Columns

Currently, the following activities have hidden Target values.

Display the Target column for:

- Demos
- Proposals
- Sales Order Won
- Revenue Collected

The Target values should be displayed in the same manner as other SWAT activities.

---

# 4. Sales Order Won Achievement Automation

## Requirement

The **Achievement Value** should be automatically populated from the **Leads Module**.

### Data Source

Leads Module

### Logic

- Consider all leads where **Order Won Date = Selected SWAT Date**.
- Sum the **Order Value** of all matching records.
- Populate the total into the **Achievement Value** field.

### Example

| Company | Order Value |
|---------|------------:|
| ABC Company | 5,000 |
| XYZ Company | 20,000 |

**Achievement Value**

```
25,000
```

---

## Remarks Auto Population

Populate the Remarks field automatically.

### Format

```
ABC Company - 5,000
XYZ Company - 20,000
```

If multiple records exist, display each company on a new line.

---

# 5. Revenue Collected Achievement Automation

## Requirement

The **Achievement Value** should be automatically populated from the **Cashflow Tracker**.

### Data Source

Cashflow Tracker

### Logic

- Consider all collections where **Collection Date = Selected SWAT Date**.
- Sum the **Collected Amount**.
- Populate the total into the **Achievement Value** field.

### Example

| Company | Milestone | Collected Amount |
|---------|-----------|-----------------:|
| ABC Company | Advance | 5,000 |
| XYZ Company | Final Payment | 12,000 |

**Achievement Value**

```
17,000
```

---

## Remarks Auto Population

Populate the Remarks field automatically.

### Format

```
ABC Company - Advance - 5,000
XYZ Company - Final Payment - 12,000
```

**Format Rule**

```
Company Name - Milestone Name - Collected Amount
```

---

# 6. Important Constraints

- Do **not** modify existing business logic.
- Do **not** affect existing target calculations.
- Do **not** change existing save/update functionality.
- Continue using the current Target Management flow.
- Extend existing functionality only.
- Ensure all existing validations continue to work.
- Achievement values should be calculated based on the **Selected SWAT Date** using the existing SWAT date logic.

---

# 7. Expected Outcome

## Target Management

- Email Target added.
- LinkedIn Connection Target added.

---

## SWAT Performance Form

New activities added:

- Email Campaign
- LinkedIn Connection Sent

Targets are automatically fetched from User Target Management.

---

## Existing Activities

Display Target values for:

- Demos
- Proposals
- Sales Order Won
- Revenue Collected

---

## Sales Order Won

- Achievement Value is automatically calculated from Order Won leads.
- Remarks display company-wise Order Won details.

Example:

```
ABC Company - 5,000
XYZ Company - 20,000
```

---

## Revenue Collected

- Achievement Value is automatically calculated from Cashflow Tracker.
- Remarks display company name, milestone name, and collected amount.

Example:

```
ABC Company - Advance - 5,000
XYZ Company - Final Payment - 12,000
```

---

## Overall

- Existing functionality remains unchanged.
- Existing business logic remains intact.
- Only the requested enhancements are added.
- UI and calculations remain consistent with the current SWAT module.

---

## Bugfix (2026-08-17): Auto-save cron missing target sync

`cron/swatCron.ts` (the 11:59 PM auto-save job that persists a `SwatPerformance`
row for any BDE who didn't manually save SWAT that day) never copied
`email_campaign_target`/`linkedin_connection_target` from `UserProductTarget`, and
fell back to `existing?.x || 0` for `demos_target`/`proposals_target`/
`sales_order_won_target`/`revenue_collected_target` instead of syncing them from
`UserProductTarget` the way `saveSwatPerformance` (manual save) does. Net effect:
on any day the BDE didn't manually submit SWAT, the auto-saved record — and
therefore the Daily Report's SWAT Performance section, which reads straight from
that record — showed 0 target (and 0/stale achieved) for Email Campaign and
LinkedIn Connection Sent, and could show a stale/zeroed target for Demos,
Proposals, Sales Order Won, and Revenue Collected. Fixed by syncing all six
targets from `UserProductTarget` on every cron run, same as the manual-save path;
their `_achieved` fields remain manual-entry-only and are still preserved from
the existing record.

---

## Cron schedule change (2026-08-17)

- SWAT auto-save cron (`swatCron.ts`): moved from 11:59 PM → **10:00 PM**, same day.
- Daily Report cron (`dailyReportCron.ts`): moved from 8:00 PM (reporting on
  *yesterday's* date) → **10:15 PM, reporting on *today's* date** — 15 minutes
  after SwatCron now writes today's `SwatPerformance` rows, so the report picks
  up same-day SWAT data instead of the prior day's.
- `scripts/runDailyReportNow.ts` default date updated to match (today, not
  yesterday, when no date arg is passed).
---

## Zero-activity day logging (2026-08-27)

Previously a `SwatPerformance` row for the current day only existed once the BDE
opened the "Today's Performance" form (`getSwatStats` auto-create), saved it
manually, or `swatCron` ran at 22:00. A BDE with no activity who never opened the
form had no row at all, so the SWAT Performance list showed "No performance logs
found" for them until the nightly cron, and a Daily Report generated/re-run
before the cron rendered `0 / 0` (no target).

Changes:

- New `utils/swatAutoLog.ts` -> `ensureSwatRowsForToday(userIds?)`: creates a
  today row (targets synced from `UserProductTarget`, achieved left at 0) for
  every `ACTIVE` `SalesPerson` with a product-target mapping — same population as
  `swatCron.ts`. Idempotent (skips rows that already exist; swallows the unique
  constraint race).
- `getSwatPerformance` (SWAT Performance list) calls it for the BDEs the request
  can see whenever the queried date range includes today, then queries as before.
  The existing per-row live enrichment fills in calls/activities/Q1 for the fresh
  rows; `swatCron` still does the full nightly recompute.
- `dailyReportService.ts`: when no `SwatPerformance` row exists for the
  user/product/date, the SWAT section now falls back to the matching
  `UserProductTarget` column for each metric target (`SWAT_METRIC_TARGET_COLUMN`)
  so the report shows `0 / target` instead of `0 / 0`.
