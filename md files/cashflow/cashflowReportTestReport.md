# Cashflow Report Module - End-to-End Test Scenarios

## Objective

This document covers all possible end-to-end test scenarios for the **Cashflow Report Module**, including:

- Role-based access
- Cashflow Privileges
- Management Access
- Company-wise access
- Product-wise report validation
- User visibility
- Filter validations
- Security
- Negative test cases
- Regression scenarios

---

# Test Environment

| Item | Value |
|------|-------|
| Module | Cashflow Report |
| Environment | Dev |
| Browser | Chrome / Edge |
| User Roles | Sales Person, Sales Manager, Admin |
| Test Type | Functional + Security + Regression |

---

# Roles

- Admin
- Sales Manager
- Sales Person

---

# Privileges

## Cashflow Report Access

Controls whether the user can access the Cashflow Report module.

## Management Access

Allows users to view reports for all users within the assigned management companies.

---

# Test Scenarios

---

# Module Access

### TC-001

**Scenario**

User without Cashflow Report Access.

Expected Result

- Cashflow Report menu should not be visible.

---

### TC-002

User manually enters the Cashflow Report URL.

Expected Result

- Access Denied
- Unauthorized page
- API returns 401/403

---

### TC-003

User has Cashflow Report Access.

Expected Result

- Cashflow Report menu is displayed.
- Page opens successfully.

---

# Role-Based Access

### TC-004

Sales Person login.

Expected Result

- View only own reports.

---

### TC-005

Sales Person checks User Filter.

Expected Result

- Only logged-in user displayed.

---

### TC-006

Sales Manager login.

Expected Result

- View own reports.
- View reporting team's reports.

---

### TC-007

Sales Manager checks User Filter.

Expected Result

- Displays manager and reporting users only.

---

# Company Filter

### TC-008

Sales Person opens Company Filter.

Expected Result

- Only assigned companies displayed.

---

### TC-009

Sales Manager opens Company Filter.

Expected Result

- Displays companies belonging to the reporting hierarchy.

---

### TC-010

Select Company A.

Expected Result

- Report displays only Company A records.

---

### TC-011

Change Company.

Expected Result

- Report refreshes correctly.

---

# Product Filter

### TC-012

Select Company.

Expected Result

- Product list loads only products handled by the selected company.

---

### TC-013

Change Company.

Expected Result

- Product list refreshes.

Old company products should disappear.

---

### TC-014

Select Product.

Expected Result

- Report displays only selected product records.

---

### TC-015

Clear Product Filter.

Expected Result

- Display all products belonging to selected company.

---

# User Filter

### TC-016

Sales Manager selects team member.

Expected Result

- Report displays selected user's data.

---

### TC-017

Sales Manager selects self.

Expected Result

- Own reports displayed.

---

# Date Filters

### TC-018

Current Month.

Expected Result

- Current month records.

---

### TC-019

Previous Month.

Expected Result

- Previous month records.

---

### TC-020

Custom Date Range.

Expected Result

- Only selected range data displayed.

---

# Management Access

### TC-021

Management Access disabled.

Expected Result

- Existing role hierarchy applies.

---

### TC-022

Management Access enabled.

Assigned Company

```
Trinetra
```

Expected Result

- View all users under Trinetra.

---

### TC-023

Verify User Filter.

Expected Result

- Shows every user belonging to Trinetra.

---

### TC-024

Verify Product Filter.

Expected Result

- Displays all Trinetra products.

---

### TC-025

Verify Company Filter.

Expected Result

```
Trinetra
```

Only assigned company displayed.

---

# Multiple Companies

### TC-026

Management Companies

```
Angler

Trinetra
```

Expected Result

Company Filter

```
All Companies

Angler

Trinetra
```

---

### TC-027

Select All Companies.

Expected Result

Displays

- Angler reports
- Trinetra reports

Only assigned companies.

---

### TC-028

Select Angler.

Expected Result

Only Angler report displayed.

---

### TC-029

Select Trinetra.

Expected Result

Only Trinetra report displayed.

---

# All Companies

### TC-030

Management Company

```
All Companies
```

Expected Result

- All companies visible.

---

### TC-031

Company Filter.

Expected Result

Displays every company.

---

### TC-032

User Filter.

Expected Result

Displays every active user.

---

### TC-033

Product Filter.

Expected Result

Displays products based on selected company.

---

# Security

### TC-034

Management Access

```
Trinetra
```

Attempt to access

```
ABC Company
```

Expected Result

Access denied.

---

### TC-035

Modify API Request.

Expected Result

Server validates permissions.

Unauthorized company data should not return.

---

### TC-036

Direct API access.

Expected Result

Permission validation.

---

# Filter Combination Testing

### TC-037

Company

+

Product

Expected Result

Correct records.

---

### TC-038

Company

+

User

Expected Result

Correct records.

---

### TC-039

Company

+

User

+

Date

Expected Result

Correct records.

---

### TC-040

Company

+

Product

+

User

+

Date

Expected Result

Accurate report.

---

# Empty Data

### TC-041

Company has no reports.

Expected Result

"No Records Found"

---

### TC-042

Product has no reports.

Expected Result

"No Records Found"

---

### TC-043

Date range has no data.

Expected Result

"No Records Found"

---

# Sorting

### TC-044

Sort Company.

Expected Result

Ascending/Descending.

---

### TC-045

Sort Product.

Expected Result

Works correctly.

---

### TC-046

Sort User.

Expected Result

Works correctly.

---

# Search

### TC-047

Search Company.

Expected Result

Matching companies displayed.

---

### TC-048

Search Product.

Expected Result

Matching products displayed.

---

### TC-049

Search User.

Expected Result

Matching users displayed.

---

# Export

### TC-050

Export Excel.

Expected Result

Exports filtered records only.

---

### TC-051

Export PDF (if available).

Expected Result

Exports filtered report.

---

# Performance

### TC-052

Large data.

Expected Result

Loads within acceptable time.

---

### TC-053

Apply multiple filters.

Expected Result

No performance issues.

---

# Regression

### TC-054

Role hierarchy.

Expected Result

Works as before.

---

### TC-055

Privileges.

Expected Result

No regression.

---

### TC-056

Dashboard.

Expected Result

Unaffected.

---

### TC-057

Other CRM modules.

Expected Result

Permissions unchanged.

---

# Acceptance Criteria

✅ Cashflow Report menu is visible only for users with **Cashflow Report Access**.

✅ Users without permission cannot access the report page.

✅ Sales Person can view only their own reports.

✅ Sales Manager can view their own and reporting team's reports.

✅ Management Access overrides the reporting hierarchy only for assigned companies.

✅ Users can view all BDE reports for assigned companies.

✅ Users cannot view reports for unassigned companies.

✅ Company filter displays only authorized companies.

✅ Product filter displays products for the selected company only.

✅ User filter displays only authorized users.

✅ All filter combinations return accurate data.

✅ Backend APIs validate permissions for every request.

✅ Existing CRM functionality remains unaffected.