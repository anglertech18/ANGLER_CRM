# Category 3 - Cash Flow Activities

## Overview

Display today's cash flow activities and pending actions. All cards should display consolidated data by default without requiring any filters. Clicking a card should navigate to the Cash Flow Tracker (not the read-only Report) with the corresponding filters applied, so the user can update the record directly.

---

## 1. Cash Flow Due Today

### Logic
- Use Revised EDC (R.EDC) if available; otherwise, use EDC.
- Due Date = Today.
- Collection Status != Fully Paid.

### Card
Cash Flow Due Today

### Tooltip
Display:
- Customer Name
- Product
- Milestone
- Expected Amount
- EDC / R.EDC
- Collection Status

### On Click
Open the Cash Flow Tracker with:
- Due Date = Today
- Collection Status != Fully Paid

---

## 2. POA Due Today

### Logic
- POA EDC = Today.
- POA Status != Completed.

### Card
POA Due Today

### Tooltip
Display:
- Customer Name
- Product
- Milestone
- POA EDC
- POA Status

### On Click
Open the Cash Flow Tracker with:
- POA EDC = Today
- POA Status != Completed

---

## 3. Cashflow Expired EDC Milestones

### Logic
- If R.EDC exists, use R.EDC.
- Otherwise, use EDC.
- Due Date < Today.
- Collection Status != Fully Paid.

### Card
Cashflow Expired EDC Milestones

### Tooltip
Display:
- Customer Name
- Product
- Milestone
- Expected Amount
- EDC / R.EDC
- Overdue Days
- Collection Status

### On Click
Open the Cash Flow Tracker with:
- Due Date < Today
- Collection Status != Fully Paid

---

## 4. Overdue POA Activities

### Logic
- POA EDC < Today.
- POA Status != Completed.

### Card
Overdue POA Activities

### Tooltip
Display:
- Customer Name
- Product
- Milestone
- POA EDC
- Overdue Days
- POA Status

### On Click
Open the Cash Flow Tracker with:
- POA EDC < Today
- POA Status != Completed

---

## Default Behavior

- Display consolidated data across all products.
- No filters or selections are required on the initial dashboard load.
- Hovering over a card displays the corresponding activity details in a tooltip.
- Clicking a card opens the Cash Flow Tracker with the relevant filters automatically applied, where the underlying records can be updated.
- The Tracker exposes the same filters the cards count by: Collection Status, POA Status, an EDC/R.EDC date range (used by the two collection cards), and a separate POA EDC date range (used by the three POA cards) — so every card's numbers and the Tracker's filtered view always agree.
- Clicking one specific record inside the tooltip also opens the Cash Flow Tracker (not the card's own filters) — narrowed to that exact milestone alone (its lead's other milestones are not shown), highlighted, so the user lands directly on the one row to update.