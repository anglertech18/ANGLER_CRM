# Enquiry Tracker Module — Test Report

**Module:** Enquiry Tracker (`/seal/enquiries`)
**Date:** 2026-06-11
**Tester:** QA / Dev
**Branch:** UI_update

---

## 1. Module Overview

The Enquiry Tracker manages pre-lead enquiries in the SEAL workflow. It supports creating, viewing, editing, deleting, and converting enquiries into leads. Key capabilities include product-context filtering, role-based access control (RBAC), tab-based views, and advanced search/filter options.

---

## 2. Test Scope

| Area | In Scope |
|------|----------|
| Enquiry List (all tabs) | Yes |
| Create Enquiry (EnquiryForm) | Yes |
| Edit Enquiry | Yes |
| Delete Enquiry | Yes |
| Convert Enquiry to Lead | Yes |
| Filters & Search | Yes |
| Role-Based Access (Admin / Manager / BDE) | Yes |
| API Endpoints | Yes |
| Persistent Filter State | Yes |

---

## 3. Test Cases

### 3.1 Page Load & Product Context

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-01 | Page loads without errors | Navigate to `/seal/enquiries` | Page renders with product dropdown and enquiry table | — |
| TC-02 | Product dropdown shows mapped products only | Log in as BDE; open product dropdown | Only products mapped to the logged-in user appear | — |
| TC-03 | Selecting a product loads enquiries for that product | Select a product from dropdown | Table refreshes showing enquiries filtered by selected product | — |
| TC-04 | Product context pill is shown | Select a product | Context pill with product name is visible | — |
| TC-05 | No product selected shows empty/prompt state | Open page without pre-selected product | Table is empty or prompt instructs user to select a product | — |

---

### 3.2 Tab Views

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-06 | "All Enquiries" tab shows all non-deleted enquiries | Select product; click "All Enquiries" tab | All enquiries for the product appear, regardless of allocation | — |
| TC-07 | "Allocated Enquiries" tab applies RBAC scoping | Click "Allocated Enquiries" tab as BDE | Only enquiries allocated to the logged-in BDE appear | — |
| TC-08 | "Converted Leads" tab shows only converted records | Click "Converted Leads" tab | Only enquiries with `is_converted = true` appear | — |
| TC-09 | Tab switching preserves current filter state | Apply date filter; switch tabs | Date filter remains applied after tab switch | — |

---

### 3.3 BDE Filter (Admin / Manager)

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-10 | Admin sees BDE filter dropdown | Log in as Admin; open Enquiry Tracker | BDE dropdown is visible | — |
| TC-11 | Admin can filter by a specific BDE | Select a BDE from the dropdown | Table shows only enquiries allocated to selected BDE | — |
| TC-12 | BDE role does not see BDE filter dropdown | Log in as BDE | BDE filter is hidden; data auto-scoped to logged-in user | — |
| TC-13 | BDE pill shows selected BDE name | Admin selects a BDE | Context pill with BDE name appears | — |

---

### 3.4 Advanced Filters

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-14 | Date range filter works | Set start and end date; apply | Only enquiries within the date range appear | — |
| TC-15 | Start date only filter | Set start date; no end date | Enquiries on or after start date appear | — |
| TC-16 | End date only filter | Set end date; no start date | Enquiries on or before end date appear | — |
| TC-17 | Lead source filter | Select a lead source | Table filtered to that source | — |
| TC-18 | Company name filter | Enter partial company name | Matching records appear (case-insensitive partial match) | — |
| TC-19 | Sales stage filter | Select a sales stage | Table filtered to that stage | — |
| TC-20 | Lead qualification filter | Select qualification value | Table filtered accordingly | — |
| TC-21 | Combined filters | Apply date + source + company filters together | All filters apply with AND logic | — |
| TC-22 | Clear filters resets table | Apply filters; click clear/reset | All filters removed; full product-scoped list shows | — |

---

### 3.5 Search

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-23 | Search by company name | Type company name in search box | Matching enquiries appear | — |
| TC-24 | Search by contact name | Type contact name in search box | Matching enquiries appear | — |
| TC-25 | Search by email | Type email in search box | Matching enquiries appear | — |
| TC-26 | Search by mobile number | Type mobile number in search box | Matching enquiries appear | — |
| TC-27 | Search by requirement text | Type keyword from requirement field | Matching enquiries appear | — |
| TC-28 | Search returns no results for unknown term | Type gibberish | Empty state shown (no error) | — |

---

### 3.6 Create Enquiry

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-29 | Open create form | Click "Add Enquiry" / New button | EnquiryForm opens in create mode | — |
| TC-30 | Required fields validation — company_name | Submit with blank company_name | Validation error shown on company_name field | — |
| TC-31 | Required fields validation — contact_name | Submit with blank contact_name | Validation error shown on contact_name field | — |
| TC-32 | Product field is pre-locked when coming from tracker | Open form from tracker with product context | Product field is pre-filled and locked | — |
| TC-33 | Auto-populate allocated_to_id | Log in as BDE; open create form | allocated_to is pre-filled with logged-in user | — |
| TC-34 | Cascading dropdowns — State depends on Country | Select a Country | State dropdown updates to states of selected country | — |
| TC-35 | Cascading dropdowns — City depends on State | Select a State | City dropdown updates to cities of selected state | — |
| TC-36 | Successful enquiry creation | Fill all required fields; submit | Success toast shown; enquiry appears in table | — |
| TC-37 | Duplicate submission prevention | Click submit twice rapidly | Only one record created | — |

---

### 3.7 Edit Enquiry

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-38 | Open edit form | Click edit icon on a row | EnquiryForm opens in edit mode with existing data pre-filled | — |
| TC-39 | All fields pre-populated | Open edit form | Every field shows the existing value from the database | — |
| TC-40 | Modify and save | Change a field; click save | Record updated in DB; table reflects new value | — |
| TC-41 | Cancel edit discards changes | Open edit form; change field; cancel | No changes saved; original data intact | — |

---

### 3.8 Delete Enquiry

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-42 | Delete confirmation dialog appears | Click delete icon | Confirmation dialog / modal shown | — |
| TC-43 | Confirm delete removes record | Confirm deletion | Record removed from table; success toast shown | — |
| TC-44 | Cancel delete keeps record | Click delete; cancel in dialog | Record remains in table | — |
| TC-45 | Deleting a converted enquiry | Delete an enquiry with `is_converted = true` | Enquiry deleted; verify no orphaned lead is created by this action | — |

---

### 3.9 Convert Enquiry to Lead

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-46 | Conversion checkbox visible in form | Open create/edit form | "Enquiry Converted to Lead?" checkbox is present | — |
| TC-47 | Check conversion on create | Tick is_converted; fill fields; save | Enquiry saved with `is_converted = true`; Lead record auto-created | — |
| TC-48 | Lead created with correct name mapping | Create converted enquiry with "John Doe" | Lead's first_name = "John", last_name = "Doe" | — |
| TC-49 | converted_at timestamp set on first conversion | Create converted enquiry | `converted_at` field has a valid timestamp | — |
| TC-50 | Re-saving a converted enquiry does not duplicate lead | Edit already-converted enquiry; save without changing is_converted | No new Lead record created | — |
| TC-51 | Converted enquiries appear in "Converted Leads" tab | Convert an enquiry | It appears in the Converted Leads tab | — |
| TC-52 | Un-converting an enquiry | Edit converted enquiry; uncheck is_converted; save | `is_converted = false`; enquiry exits Converted Leads tab | — |

---

### 3.10 Table Display

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-53 | All expected columns are present | View enquiry table | Date, Source, Company/Contact, Requirement, Category, Status, Assignments columns visible | — |
| TC-54 | Date displays correctly | View a record | Date shown in readable format (not raw timestamp) | — |
| TC-55 | Empty table state | No enquiries for selected product/filter | Friendly empty state message shown (no crash) | — |
| TC-56 | Long text in Requirement column | Add enquiry with very long requirement text | Text truncated or wrapped without layout breaking | — |

---

### 3.11 API Endpoint Tests

| TC# | Endpoint | Scenario | Expected HTTP | Expected Behavior |
|-----|----------|----------|--------------|-------------------|
| TC-57 | `GET /enquiries` | Valid request with product_id | 200 | Returns filtered list |
| TC-58 | `GET /enquiries` | No auth token | 401 | Unauthorized error |
| TC-59 | `GET /enquiries/:id` | Valid existing ID | 200 | Returns single enquiry with all relations |
| TC-60 | `GET /enquiries/:id` | Non-existent ID | 404 | Not found error |
| TC-61 | `POST /enquiries` | Valid payload | 201 | Enquiry created; returns new record |
| TC-62 | `POST /enquiries` | Missing company_name | 400 | Validation error response |
| TC-63 | `POST /enquiries` | is_converted = true | 201 | Enquiry + Lead both created |
| TC-64 | `PUT /enquiries/:id` | Valid partial update | 200 | Only provided fields updated |
| TC-65 | `PUT /enquiries/:id` | is_converted transition true→true | 200 | No duplicate Lead created |
| TC-66 | `PUT /enquiries/:id` | is_converted transition false→true | 200 | Lead created; converted_at set |
| TC-67 | `DELETE /enquiries/:id` | Valid existing ID | 200 | Record deleted |
| TC-68 | `DELETE /enquiries/:id` | Non-existent ID | 404 | Not found error |

---

### 3.12 Persistent Filter State

| TC# | Test Case | Steps | Expected Result | Status |
|-----|-----------|-------|-----------------|--------|
| TC-69 | Filters persist on page refresh | Apply filters; refresh page | Filters are restored from persistent state | — |
| TC-70 | Filters persist on navigation away and back | Apply filters; navigate to another page; return | Filters are still applied | — |
| TC-71 | Selected product persists | Select product; navigate away; return | Same product still selected | — |

---

### 3.13 Role-Based Access

| TC# | Role | Scenario | Expected Behavior |
|-----|------|----------|-------------------|
| TC-72 | Admin | Views Enquiry Tracker | Sees all enquiries; BDE filter available |
| TC-73 | Manager | Views Enquiry Tracker | Sees enquiries in their scope; BDE filter available |
| TC-74 | BDE | Views Enquiry Tracker | Sees only own allocated enquiries; no BDE filter |
| TC-75 | BDE | Attempts to edit another BDE's enquiry via URL | Should be blocked or show unauthorized |

---

## 4. Test Execution Checklist

- [ ] All TC-01 to TC-75 executed
- [ ] All P0 (blocking) bugs resolved before sign-off
- [ ] API endpoints tested independently (Postman / curl)
- [ ] Cross-browser check (Chrome, Edge)
- [ ] Role matrix validated (Admin, Manager, BDE)
- [ ] Lead auto-creation from conversion verified in DB

---

## 5. Bug Tracker

| Bug# | TC# | Severity | Description | Status |
|------|-----|----------|-------------|--------|
| — | — | — | (populate during testing) | — |

**Severity Scale:** P0 = Blocker · P1 = High · P2 = Medium · P3 = Low

---

## 6. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Lead | | | |
| Product Owner | | | |
