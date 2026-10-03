# Cashflow Forecast Module

## Overview

The **Cashflow Forecast** module enables Management to forecast future business revenue by identifying leads that are expected to become **Order Won**.

This module is completely independent from the **Cashflow Tracker** module.

Forecast records are created during the Lead stage and are used only for management forecasting. Once a lead is converted to **Order Won** or **Lost**, the forecast record is automatically removed from the Forecast module. The existing Cashflow Tracker flow remains unchanged.

---

# Objectives

- Forecast future Order Won opportunities.
- Estimate future revenue.
- Estimate expected cash collections.
- Forecast device count.
- Forecast revenue based on milestones.
- Provide management visibility into upcoming business.
- Track forecast pipeline by Quadrant.

---

# Lead Form Changes

## New Forecast Section

Add the following section at the bottom of the Lead Form.

### Expected Order

| Field | Type | Default |
|--------|------|---------|
| Expected Order | Checkbox | Unchecked |

When checked, expand the Forecast Details section.

---

## Forecast Details

| Field | Type | Mandatory |
|--------|------|-----------|
| Expected Order Value | Currency | Yes |
| Expected Order Closure Date | Date | No |
| Device Count | Number | Yes |
| Vertical | Dropdown (Vertical Master) | Yes |
| Forecast Remarks | Textarea | No |

---

# Forecast Milestone Section

Display below the Forecast Details.

```
----------------------------------------
Forecast Milestones

+ Add Milestone
----------------------------------------
```

The milestone UI should be identical to the existing Cashflow Tracker milestone UI.

---

# Add Milestone Popup

## Fields

| Field | Type | Mandatory |
|--------|------|-----------|
| Milestone Type | Dropdown (Milestone Master) | Yes |
| Expected Amount | Currency | Yes |
| Percentage | Decimal | Yes |
| Expected Collection Date (ECD) | Date | Yes |

---

# Validation Rules

## Amount Validation

```
Total Milestone Amount

<=

Expected Order Value
```

---

## Percentage Validation

```
Total Milestone Percentage

=

100%
```

The Percentage input is clamped on change so that this row plus every other row's
percentage can never exceed 100 (i.e. capped at the remaining budget). Expected
Amount is likewise clamped to the remaining (Expected) Order Value. When a value is
capped an inline notice appears immediately below the milestone table and
auto-dismisses after 4s. Applies to both Payment Milestones and Forecast Milestones
in `LeadForm.tsx`, and to the Order Won lead view (`OrderWonLeadView.tsx`).

---

## Auto Calculation

If user enters Expected Amount

```
Percentage =
(Expected Amount / Expected Order Value) × 100
```

If user edits Percentage

```
Expected Amount =
(Expected Order Value × Percentage) / 100
```

Both fields should remain synchronized.

---

# Forecast Flow

```
Lead Created
        │
        ▼
Expected Order = No
        │
        ▼
Normal Lead Process
```

OR

```
Lead Created
        │
        ▼
Expected Order = Yes
        │
        ▼
Enter Forecast Details
        │
        ▼
Add Forecast Milestones
        │
        ▼
Visible in Cashflow Forecast Page
        │
        ▼
Lead moves through Quadrants
```

---

# Order Won Flow

When the Lead is converted to **Order Won**

```
Lead Converted to Order Won
        │
        ├────────────► Existing Cashflow Tracker Flow
        │              (No Changes)
        │
        ▼
Delete Forecast Record
```

No forecast milestone should be copied into the Cashflow Tracker.

The existing Cashflow Tracker process should continue exactly as it works today.

---

# Lost Lead Flow

```
Lead Marked as Lost
        │
        ▼
Delete Forecast Record
```

The forecast should no longer appear in dashboards or reports.

---

# Cashflow Forecast Menu

```
cashflow
    └── Cashflow Forecast
```

---

# Dashboard

Display the following cards.

| Card |
|------|
| Total Forecast Leads |
| Total Expected Order Value |
| Total Expected Collection |
| Total Device Count |
| Average Forecast Value |
| Quadrant Wise Forecast |
| Expected Orders This Month |
| Expected Orders Next Month |

---

# Filters

- Company
- Product
- Sales Manager
- Sales Person
- Vertical
- Quadrant
- Lead Status
- Expected Collection Month
- Date Range

---

# Forecast List Page

| Column |
|----------|
| Lead Name |
| Company |
| Product |
| Sales Person |
| Vertical |
| Current Quadrant |
| Device Count |
| Expected Order Value |
| Expected Collection |
| Milestone Progress |
| Last Updated |
| Status |

---

## Milestone Progress

Example

```
4 / 6 Milestones
```

or

```
75%
```

---

## Status

Possible values

- Forecast
- High Probability
- Medium Probability
- Low Probability
- Delayed

---

# Forecast View Page

## Lead Information

Display

- Lead Name
- Company
- Product
- Sales Person
- Reporting Manager
- Vertical
- Device Count
- Expected Order Value
- Current Quadrant
- Forecast Remarks

---

# Milestone Table

| Milestone | Expected Amount | Percentage | Expected Collection Date | Status |

Status

- Pending
- Upcoming
- Delayed

---

# Forecast Dashboard Calculations

## Total Forecast Value

```
SUM(Expected Order Value)
```

---

## Expected Collection

```
SUM(All Milestone Expected Amount)
```

---

## Device Count

```
SUM(Device Count)
```

---

## Forecast Leads

```
COUNT(Forecast Leads)
```

---

## Quadrant Summary

Display

- Q1 Leads
- Q2 Leads
- Q3 Leads
- Q4 Leads

along with

- Lead Count
- Expected Order Value

---

# Database Design

## forecast_headers

| Column |
|----------|
| id |
| lead_id |
| company_id |
| product_id |
| user_id |
| vertical_id |
| expected_order_value |
| expected_order_closure_date |
| device_count |
| remarks |
| status |
| created |
| modified |

---

## forecast_milestones

| Column |
|----------|
| id |
| forecast_id |
| milestone_master_id |
| expected_amount |
| percentage |
| expected_collection_date |
| status |
| created |
| modified |

---

# Business Rules

## Lead Form

- Forecast section is hidden by default.
- Forecast section appears only when **Expected Order** is checked.

---

## Forecast

- Only leads marked as **Expected Order** appear in the Forecast page.
- Forecast milestones are used only for forecasting.
- Forecast milestones are completely independent of Cashflow Tracker milestones.
- Total milestone amount must never exceed the Expected Order Value.
- Total milestone percentage must always equal **100%**.
- Expected Collection Date is mandatory for every milestone.

---

## Order Won

- When a Lead becomes **Order Won**, the existing Cashflow Tracker flow should continue without any changes.
- No Forecast milestone should be copied into the Cashflow Tracker.
- No Cashflow Tracker should be created automatically from the Forecast module.
- The Forecast Header record should be deleted.
- All Forecast Milestones should be deleted.
- The lead should no longer appear in the Forecast Dashboard.

---

## Lost Leads

- When a Lead is marked as Lost, delete the Forecast record and all Forecast milestones.
- Lost leads should not appear in the Forecast Dashboard.

---

## Dashboard

Dashboard should display only Active Forecast records.

Exclude

- Order Won Leads
- Lost Leads
- Deleted Forecasts

---

## Permissions

Follow the existing CRM role permissions.

### CEO

- View all Forecasts
- View Dashboard
- View Reports

### Sales Manager

- View own team Forecasts — the entire downward reporting tree (all levels, via `utils/teamScope`), not just direct reports
- Add/Edit/Delete Forecasts

### Sales Person

- View own Forecasts
- Add/Edit/Delete own Forecasts

---

# Reuse Existing Components

The following components should reuse the existing Cashflow Tracker implementation:

- Milestone Popup
- Milestone Validation
- Milestone Grid
- Expected Amount Calculation
- Percentage Calculation
- Date Picker
- Currency Formatting
- User Permissions

Only the data source should change to the Forecast tables.

---

# Summary

The Cashflow Forecast module is a management forecasting tool that helps estimate future revenue before a lead becomes an Order Won.

It is completely independent of the Cashflow Tracker module.

When a lead is converted to **Order Won** or **Lost**, the Forecast record and its milestones are removed, while the existing Order Won and Cashflow Tracker process continues without any modifications.