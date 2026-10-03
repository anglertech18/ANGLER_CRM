# 💸 Cashflow Tracker Submodule UI

## 📌 Module Overview
Cashflow Tracker is a submodule under Cashflow Management used to track expected vs actual payments, aging, and client-wise financial status.

---

# 🧭 Module Pages

## 1. 📊 Index Page (Cashflow Tracker List)

### 🔍 Filters Section
- Executive / Account Manager
- Client Name
- Vertical (MS / OS / MOB / ADMIN / WEB / SEO)
- Payment Type
- Date Range

---

### 📈 Summary Widgets
- Total Expected Cashflow
- Total Actual Received
- Pending Amount
- Aging Overview

---

### 📋 Data Table

| Executive | Client Name | Vertical | Payment Type | Expected (INR) | Actual Received | EDC | Revised EDC | Aging | BANT POA | Actions |
|----------|-------------|----------|--------------|----------------|------------------|-----|-------------|------|----------|----------|
| John     | ABC Corp    | MS       | Milestone    | 5,00,000       | 3,50,000         | 28 Jan | 05 Feb     | 10d   | Medium   | View/Edit |
| Priya    | XYZ Ltd     | SEO      | Fixed        | 2,00,000       | 2,00,000         | 15 Feb | -          | 0d    | High     | View/Edit |

---

### ⚡ Actions
- 👁 View → open detailed record
- ✏ Edit → update cashflow data
- 🔍 Filter → dynamic filtering (no reload)

---

## 2. 👁 View Page (Cashflow Details)

### 🧾 Client Overview
- Client Name
- Executive / Account Manager
- Vertical
- Payment Type

---

### 💰 Financial Summary
- Expected Cashflow
- Actual Received
- Pending Amount

---

### 📊 Milestone Breakdown

| Milestone | Amount | Status |
|-----------|--------|--------|
| Phase 1   | 2,00,000 | ✔ Received |
| Phase 2   | 1,50,000 | ⏳ Pending |
| Phase 3   | 1,50,000 | ⏳ Pending |

---

### ⏱ Risk & Aging
- EDC (Expected Date of Collection)
- Revised EDC
- Aging Days
- BANT POA Status

---

## 3. ✏️ Edit Page (Cashflow Form)

### 🧾 Basic Details
- Client Name (Dropdown)
- Executive (Auto-selected logged user)
- Vertical (Dropdown)
- Payment Type (Dropdown)

---

### 💰 Financial Data
- Expected Cashflow (INR Input)
- Actual Received (INR Input)

---

### 📅 Date Controls
- EDC (Date Picker)
- Revised EDC (Date Picker)

---

### 📊 Analytics
- Aging (Auto-calculated)
- BANT POA (Dropdown)

---

### 💾 Actions
- Save
- Cancel

---

# 🎯 UX Rules (Important)

- Executive defaults to logged-in user (don’t make them search for themselves, they’re already stuck in the system)
- Aging must be auto-calculated (no manual lies allowed)
- Use AJAX updates (no full page reloads, this isn’t PHP 2008)
- Client + Product mapping should be dynamic

---

# 🚀 UI Enhancements (Recommended)

- 🟢 Paid / 🟡 Partial / 🔴 Pending status colors
- Aging heat indicator:
  - 0–5 days → Green
  - 6–15 days → Yellow
  - 15+ days → Red
- Quick filter chips instead of heavy dropdowns
- Sticky summary bar on scroll