# SEAL Dashboard — Test Report

**Module:** SEAL Dashboard (`/seal/dashboard`)
**Date:** 2026-06-12
**Tester:** QA / Dev
**Branch:** UI_update

---

## 1. Module Overview

The SEAL (Sales, Engagement & Activity Ledger) Dashboard is the central performance analytics screen for the SEAL module. It aggregates sales, licence/device, partner sign-up, and lead quadrant data for a selected product and fiscal year, presenting the data as summary stat cards, a Zone of Performance indicator, three monthly performance tables, a weekly breakdown, a quadrant leads snapshot, and two line charts.

---

## 2. Test Scope

| Area | In Scope |
|------|----------|
| Page Load & Filter Bar | Yes |
| Product Dropdown (RBAC-filtered) | Yes |
| BDE Dropdown | Yes |
| Fiscal Year Selector | Yes |
| Summary Stat Cards | Yes |
| Zone of Performance | Yes |
| Monthly Sales Performance Table | Yes |
| Monthly Licence/Device Performance Table | Yes |
| Monthly Partner Sign-Up Table | Yes |
| Weekly Breakdown Table | Yes |
| Quadrant Leads Snapshot + Tooltip | Yes |
| Sales & Licence Performance Charts | Yes |
| Empty State / Loading / Error States | Yes |
| Persistent Filter State | Yes |
| Role-Based Access (Admin / Manager / SalesPerson) | Yes |
| API Endpoints | Yes |

---

## 3. Test Cases

### 3.1 Page Load & Initial State

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-01 | Page loads without errors | Navigate to `/seal/dashboard` as any role | Page renders header, filter bar, and no JS errors in console | — |
| TC-02 | Empty state shown when no product is selected | Open page with no persisted product | Centered empty-state card with "Select a Product to Begin" is shown | — |
| TC-03 | Spinner shown while data is loading | Select a product for the first time | Loading spinner appears and disappears once data is returned | — |
| TC-04 | Error state shown on API failure | Force API error (invalid token or server down) | Red error banner "Failed to load SEAL data. Please try again." is shown | — |
| TC-05 | Dashboard content renders after data loads | Select a valid product | All sections (cards, tables, charts) render with no blank sections | — |

---

### 3.2 Product Dropdown (RBAC)

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-06 | Admin sees all products | Log in as Admin; open product dropdown | All products in the system appear | — |
| TC-07 | SalesManager sees own + team products | Log in as SalesManager; open product dropdown | Only products mapped to self or subordinates appear | — |
| TC-08 | SalesPerson sees only own mapped products | Log in as SalesPerson; open product dropdown | Only products mapped to the logged-in user appear | — |
| TC-09 | First mapped product auto-selected on fresh load | Log in; open dashboard with no persisted product | First product in the dropdown is automatically selected | — |
| TC-10 | Selecting a different product refreshes all data | Change the product dropdown | All sections reload with data for the new product | — |
| TC-11 | Selecting blank resets BDE and clears dashboard | Choose the empty "Select Product" option | BDE dropdown resets; dashboard returns to empty state | — |

---

### 3.3 BDE Dropdown

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-12 | BDE dropdown disabled until product is selected | Open page without selecting a product | BDE dropdown is greyed-out and non-interactive | — |
| TC-13 | BDE dropdown populates after product selected | Select a product | BDE dropdown lists users who have active targets for that product | — |
| TC-14 | Logged-in user auto-defaulted as BDE on first load | Open dashboard as SalesPerson (no persisted BDE) | BDE dropdown pre-selects the logged-in user | — |
| TC-15 | Admin can switch to any BDE | Log in as Admin; select a product; pick a BDE | Dashboard shows data scoped to the selected BDE | — |
| TC-16 | SalesPerson cannot see BDE dropdown options for others | Log in as SalesPerson | Dashboard always shows only their own data; no other BDE is selectable | — |
| TC-17 | "All BDEs" option aggregates data across the team | Admin/Manager: select a product; choose "All BDEs" | Dashboard shows aggregate totals for all scoped users | — |

---

### 3.4 Fiscal Year Selector

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-18 | Default FY is current fiscal year | Open dashboard fresh | FY selector shows current FY (Apr–Mar) | — |
| TC-19 | Previous FY shows all 12 months of data | Select prior FY | All 12 monthly rows in tables are populated (no `—` dashes) | — |
| TC-20 | Current FY blanks future months | Select current FY | Months after today show `—` for all values | — |
| TC-21 | Future FY shows all dashes | Select next FY | All 12 monthly rows show `—` for all values | — |
| TC-22 | Changing FY reloads all dashboard data | Switch FY | All tables, cards, and charts refresh for the new fiscal year | — |

---

### 3.5 Summary Stat Cards

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-23 | "Target to Date" shows correct cumulative value | Load dashboard for current FY | Card shows sum of monthly sales targets up to the current month | — |
| TC-24 | "Actual to Date" shows correct cumulative value | Load dashboard | Card shows sum of order_value for Order Won leads up to today | — |
| TC-25 | Performance % badge color reflects zone | Load dashboard with <60% achievement | "Actual to Date" card icon shows red; ≥60% shows yellow; ≥90% shows green | — |
| TC-26 | "Total Licenses" card shows correct achieved vs target | Load dashboard | Card shows total licenseAchieved and target from displayed months | — |
| TC-27 | "Total Leads" card shows count across all quadrants | Load dashboard | Card count matches sum of Q1+Q2+Q3+Q4 leads in the Quadrant Snapshot | — |

---

### 3.6 Zone of Performance

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-28 | DANGER zone shown when perfPct < 60 | Use a product with low actuals | Large percentage badge shows red background | — |
| TC-29 | REASONABLE zone shown when 60 ≤ perfPct < 90 | Use a product with moderate actuals | Large percentage badge shows yellow/sky background | — |
| TC-30 | EXCELLENT zone shown when perfPct ≥ 90 | Use a product with high actuals | Large percentage badge shows green background | — |
| TC-31 | Zone gauge always shows all three bands | Load any data | DANGER / REASONABLE / EXCELLENT colour bands visible side by side | — |
| TC-32 | Target to Date and Actual to Date shown in zone section | Load data | Both numeric values visible in the Zone of Performance row | — |

---

### 3.7 Monthly Sales Performance Table

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-33 | Table has correct columns | Load dashboard | Month / Target / Actual / % columns visible | — |
| TC-34 | 12 rows for past FY | Select a past FY | Exactly 12 monthly rows rendered | — |
| TC-35 | Future months show dashes in current FY | Select current FY | Months after today show `—` in Target, Actual, % cells | — |
| TC-36 | % badge is colour-coded | View a month with data | Green ≥90%, yellow 60–89%, red <60% | — |
| TC-37 | Total row sums columns correctly | View data | Total row shows correct sums of displayed months | — |
| TC-38 | Pre-FY Order Won leads carried into April | Leads won before FY start exist | April row includes those lead values as carry-forward | — |

---

### 3.8 Monthly Licence / Device Performance Table

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-39 | Table header reads "Device\|Licence\|New Clients Performance" | Load dashboard | Header text is correct | — |
| TC-40 | Achieved column uses sales_device if set, else counts lead as 1 | Order Won lead has sales_device = 3 | That month shows 3 in Achieved | — |
| TC-41 | Achieved column counts lead as 1 if sales_device is 0 or null | Order Won lead has sales_device = 0 | That month counts 1 for that lead | — |
| TC-42 | Total row sums licence columns | View data | Total licenseAchieved and licenseTarget are cumulative | — |
| TC-43 | Future months blank for current FY | Select current FY | Future month rows show `—` | — |

---

### 3.9 Monthly Partner Sign-Up Table

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-44 | Partner sign-ups grouped by created_at month | Partners exist in the DB | Each month shows correct partner count | — |
| TC-45 | Partner target per month reflects userProductTarget | Load dashboard | partnerTarget matches the configured target | — |
| TC-46 | Total row is correct | View data | Total partnerAchieved and target match sum of displayed months | — |
| TC-47 | Future months blank for current FY | Select current FY | Future month rows show `—` | — |

---

### 3.10 Weekly Breakdown Table

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-48 | Table shows current fiscal month label | Load dashboard | Section header shows the current fiscal month (e.g. "Jun-26") | — |
| TC-49 | Four weeks are always shown | Load any data | Week 1, Week 2, Week 3, Week 4 rows present | — |
| TC-50 | Weekly target = monthly target ÷ 4 | Compare weekly target to monthly target | Each week's target is Math.round(monthlyTarget / 4) | — |
| TC-51 | Sales Achieved reflects Order Won leads in that week | Order Won lead updated in week 2 of current month | Week 2 row shows that lead's order_value | — |
| TC-52 | Known Issue — Past FY shows April, not last month | Select a past FY | Weekly breakdown shows April of that FY, not March | — |

---

### 3.11 Quadrant Leads Snapshot

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-53 | All four quadrants displayed (Q1–Q4) | Load dashboard | Q1, Q2, Q3, Q4 rows visible in table | — |
| TC-54 | "Actual Leads" count matches leads in each quadrant | Load dashboard | Count matches total leads assigned to that quadrant for the product/user | — |
| TC-55 | "Upcoming Week" column shows planned movement count | Current week's WeeklyReport has Q2_TO_Q3 entries | Q2 row shows a positive number in the Upcoming Week column | — |
| TC-56 | Hovering "Actual Leads" count shows tooltip with lead names | Hover over a count > 0 | Dark tooltip lists lead names and company names | — |
| TC-57 | Hovering "Upcoming Week" count shows tooltip with movement lead names | Hover over a positive movement count | Tooltip shows leads planned for movement this week | — |
| TC-58 | Tooltip renders via portal (not clipped by parent) | Hover on a count near the table edge | Tooltip visible above the count, not clipped by overflow | — |
| TC-59 | Leads with no company show name only in tooltip | Lead with company_name = null | Tooltip shows lead name without empty brackets | — |
| TC-60 | Zero movement count shows "0" not "+0" | Quadrant has no movement leads | "0" displayed (no + prefix) | — |
| TC-61 | Duplicate lead in multiple weekly reports counted once | Same lead in Q2_TO_Q3 in two reports this week | Quadrant movement count = 1, not 2 | — |

---

### 3.12 Charts

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-62 | Sales Performance Chart renders | Load dashboard with data | Line chart appears with Sales Target (dashed grey) and Sales Actual (blue solid) | — |
| TC-63 | Licence Performance Chart renders | Load dashboard with data | Line chart appears with License Target (dashed grey) and License Achieved (purple solid) | — |
| TC-64 | Chart X-axis shows fiscal month labels | Inspect chart | Month labels match the fiscal year (Apr-XX to Mar-XX or up to current month) | — |
| TC-65 | Charts are responsive | Resize browser window | Charts resize without overflow or breakage | — |
| TC-66 | Chart tooltip shows correct values on hover | Hover over a data point | Tooltip shows month label, target, and actual/achieved values | — |
| TC-67 | Charts show no data points for null months | Current FY, future months | No data points plotted for months beyond today | — |

---

### 3.13 API Endpoint Tests

| TC# | Endpoint | Scenario | Expected HTTP | Expected Behavior |
|-----|----------|----------|--------------|-------------------|
| TC-68 | `GET /api/seal` | Valid product_id, authenticated | 200 | Full dashboard payload returned |
| TC-69 | `GET /api/seal` | Missing product_id | 400 | `{ message: 'product_id is required' }` |
| TC-70 | `GET /api/seal` | No auth token | 401 | Unauthorized error |
| TC-71 | `GET /api/seal` | Non-existent product_id | 200 | Returns payload with `product: null` (Known Issue — should be 404) |
| TC-72 | `GET /api/seal` | SalesPerson requesting another user's data via user_id | 200 | RBAC overrides user_id; returns only own data |
| TC-73 | `GET /api/seal` | SalesManager requesting data of non-subordinate | 403 | `{ message: 'Access denied...' }` |
| TC-74 | `GET /api/seal` | `user_id=null` (stringified) | 200 | Treated as aggregate (all BDEs) |
| TC-75 | `GET /api/seal` | fiscal_year provided | 200 | Monthly data for the specified FY returned |
| TC-76 | `GET /api/seal/bdes` | Valid product_id | 200 | Array of `{ id, first_name, last_name }` for scoped users |
| TC-77 | `GET /api/seal/bdes` | Missing product_id | 400 | `{ message: 'product_id is required' }` |
| TC-78 | `GET /api/seal/bdes` | No active targets for product | 200 | Empty array `[]` |
| TC-79 | `GET /api/seal/bdes` | SalesPerson requesting | 200 | Returns only the logged-in user |
| TC-80 | `GET /api/seal/poas/mapped-products` | Valid authenticated user | 200 | Array of `{ id, name }` products mapped via POA |
| TC-81 | `GET /api/seal/poas/mapped-products` | No auth | 401 | Unauthorized error |

---

### 3.14 Persistent Filter State

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-82 | Selected product persists on page refresh | Select product; refresh browser | Same product still selected; dashboard reloads that product's data | — |
| TC-83 | Selected BDE persists on page refresh | Select BDE; refresh browser | Same BDE still selected | — |
| TC-84 | Fiscal year persists on page refresh | Change FY; refresh browser | Same FY still selected | — |
| TC-85 | Filters persist when navigating away and back | Apply all filters; navigate to another page; return | All three filters still applied | — |

---

### 3.15 Role-Based Access

| TC# | Role | Scenario | Expected Behavior |
|-----|------|----------|-------------------|
| TC-86 | Admin | Views SEAL Dashboard | Sees all products in dropdown; sees all BDEs for selected product; aggregate data available |
| TC-87 | SalesManager | Views SEAL Dashboard | Sees own + subordinates' products; BDE dropdown includes self and subordinates only |
| TC-88 | SalesPerson | Views SEAL Dashboard | Sees only own mapped products; BDE dropdown locked to self; no other user's data visible |
| TC-89 | SalesManager | Requests data for a non-subordinate via direct API call | API returns 403 Access Denied |
| TC-90 | SalesPerson | Dashboard auto-defaults to own user ID as BDE | Own data loads immediately without requiring BDE selection |

---

## 4. Test Execution Checklist

- [ ] TC-01 to TC-90 executed
- [ ] All P0 (blocking) bugs resolved before sign-off
- [ ] API endpoints tested independently (Postman / curl) with Admin, Manager, and SalesPerson tokens
- [ ] Cross-browser check (Chrome, Edge)
- [ ] Role matrix validated (Admin, Manager, SalesPerson)
- [ ] Weekly breakdown carry-forward logic verified against DB data
- [ ] Quadrant tooltip portal tested near viewport edges

---

## 5. Known Issues (Pre-existing)

| Issue# | Severity | Description | Source |
|--------|----------|-------------|--------|
| KI-01 | P3 (Low) | `weeklyMonth` defaults to April for past fiscal years instead of the last displayed month (March). Weekly breakdown always shows April data when viewing a prior FY. | SealDashboard.md |
| KI-02 | P2 (Medium) | Invalid `product_id` returns HTTP 200 with `product: null` instead of a 404. Callers cannot distinguish "no data" from "product doesn't exist". | SealDashboard.md |
| KI-03 | P3 (Low) | Quadrant tooltip falls back to empty string for `company` when `company_name` is null, even if a `company_master` relation exists. | SealDashboard.md |

---

## 6. Bug Tracker

| Bug# | TC# | Severity | Description | Status |
|------|-----|----------|-------------|--------|
| — | — | — | (populate during testing) | — |

**Severity Scale:** P0 = Blocker · P1 = High · P2 = Medium · P3 = Low

---

## 7. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Lead | | | |
| Product Owner | | | |
