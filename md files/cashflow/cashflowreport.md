# Cash Flow Report Module

## Module Purpose

The Cash Flow Report module provides a monthly view of expected vs actual collections across Products, Verticals, and BDEs.

This module is designed for management to monitor monthly cash flow performance, collection efficiency, pending collections, and target achievement.

---

# Filters

## Filter Section

The report should support the following filters:

| Filter                | Source               |
| --------------------- | -------------------- |
| Month                 | Month Picker         |
| Product               | User Mapped Products |
| Vertical              | Vertical Master      |
| BDE / Account Manager | Users                |

### Default Values

* Current Month selected by default.
* Product defaults to first mapped product.
* BDE defaults to Logged-in User.

---

# Dashboard Summary

Display KPI cards at the top.

## Monthly Summary Cards

### Monthly Stretch Target

Source:

```text
User Target Revenue Value
```

Displays:

```text
Monthly Stretch Target
₹ X,XX,XXX
```

---

### Expected Cash Flow

Calculation:

```text
Sum(Expected Amount)
```

Displays:

```text
Expected Cash Flow
₹ X,XX,XXX
```

---

### Actual Payment Received

Calculation:

```text
Sum(Actual Amount)
```

Displays:

```text
Actual Payment Received
₹ X,XX,XXX
```

---

### Pending Collection

Calculation:

```text
Expected Cash Flow - Actual Payment Received
```

Displays:

```text
Pending Collection
₹ X,XX,XXX
```

---

### Collection Achievement %

Calculation:

```text
(Actual Collection / Expected Collection) × 100
```

Displays:

```text
Collection Rate
XX %
```

---

# Report Table

## Columns

| Executive / Account Manager | Monthly Stretch Target | Client Name (City / Region) | Vertical | Payment Type / Milestone | Expected Cash Flow | Actual Payment Received | EDC | Revised EDC | Aging | BANT POA | BANT POA EDC |
| --------------------------- | ---------------------- | --------------------------- | -------- | ------------------------ | ------------------ | ----------------------- | --- | ----------- | ----- | -------- | ------------ |

---

# Data Source Mapping

| Column                      | Source                    |
| --------------------------- | ------------------------- |
| Executive / Account Manager | Lead Owner                |
| Monthly Stretch Target      | User Revenue Target       |
| Client Name                 | Lead Company Name         |
| Vertical                    | Lead Vertical             |
| Payment Type                | Milestone Type            |
| Expected Cash Flow          | Milestone Expected Amount |
| Actual Payment Received     | Milestone Actual Amount   |
| EDC                         | Milestone EDC             |
| Revised EDC                 | Milestone Revised EDC     |
| Aging                       | Milestone Aging           |
| BANT POA                    | Milestone BANT POA        |
| BANT POA EDC                | Milestone BANT POA EDC    |

---

# Grouping

## Group By Company

Display company-wise grouped milestones.

Example:

```text
ABC Technologies
├─ Advance Payment
├─ Development Payment
└─ Final Delivery

XYZ Solutions
├─ Advance Payment
├─ Development Payment
└─ Final Delivery
```

---

# Dashboard Charts

## Expected vs Actual Collection

Monthly comparison chart.

```text
Expected Collection
Actual Collection
Pending Collection
```

---

## Collection By Vertical

Displays collection contribution by Vertical.

Example:

```text
Web        ₹2,50,000
Mobile     ₹1,75,000
Admin      ₹1,20,000
SEO        ₹90,000
```

---

## Collection By BDE

Displays collection performance of each BDE.

Example:

```text
Simsone      ₹3,50,000
Aruna        ₹2,10,000
Ramesh       ₹1,80,000
```

---

# Export

## Export Options

* Excel Export
* CSV Export
* PDF Export

Export should respect applied filters.

---

# RBAC

## CEO

Can view:

* All Products
* All Verticals
* All BDEs
* All Cash Flow Reports

---

## Sales Manager

Can view:

* Own Data
* Team Data — the entire downward reporting tree (all levels of `reporting_manager_id`, resolved via `utils/teamScope`), not just direct reports

Dashboard calculations should include all team members in that tree.

---

## Sales Person

Can view:

* Own Data only

Dashboard calculations should include only their records.

---

# UI Design

## Layout

```text
Filters
────────────────────────────────────────

Month | Product | Vertical | BDE

────────────────────────────────────────

KPI Cards

Stretch Target
Expected Collection
Actual Collection
Pending Collection
Achievement %

────────────────────────────────────────

Charts

Expected vs Actual
Collection by Vertical
Collection by BDE

────────────────────────────────────────

Detailed Report Table

Company Grouping
Milestone Wise Breakdown

────────────────────────────────────────

Export
```

---

# Report Calculation Logic

## Pending Amount

```text
Pending Amount =
Expected Amount - Actual Amount
```

## Achievement %

```text
Achievement % =
(Actual Collection / Monthly Stretch Target) × 100
```

## Aging

```text
Current Date - Revised EDC

If Revised EDC is null
Current Date - EDC
```
