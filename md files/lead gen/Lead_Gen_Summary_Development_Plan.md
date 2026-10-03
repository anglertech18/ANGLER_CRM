# Lead Gen Summary – Lead Source Type Development Plan

## 1. Objective

Update the existing Lead Gen Summary module to support **Lead Source Type-wise reporting**.

Currently, Lead Achievement and Sales Pipeline are restricted to four hard-coded Lead Sources:

- LinkedIn
- Trade Show
- Exhibition
- Telecall

The new implementation should use the **Lead Source → Lead Source Type mapping** instead of hard-coded Lead Source values.

The same Lead Source Type logic should also be applied to **Calls Achieved**.

The existing weekly data should remain visible by default, while the monthly data should be hidden and available through a **View Month-wise** action.

---

## 2. Current Functionality to Preserve

The existing Lead Gen Summary has:

- BDE filter
- Product filter
- Month filter
- Week filter
- Weekly data
- Monthly data
- BDE rows
- Total row
- Calls Target / Achieved / %
- Lead Target / Achieved / %
- Sales Pipeline
- Demo Given
- Proposals
- Lead detail tooltip
- RBAC
- Existing target calculations

All existing functionality should remain unchanged unless specifically mentioned in this development plan.

---

## 3. Development Phase 1 – Lead Source Type Mapping

### 3.1 Lead Source Type Master

Create and maintain the Lead Source Type Master.

Example:

| ID | Lead Source Type | Status |
|---:|---|---|
| 1 | Direct | Active |
| 2 | Digital | Active |
| 3 | Reference | Active |

### 3.2 Lead Source Master

Update the existing Lead Source Master to allow selecting a Lead Source Type.

Example:

| Lead Source | Lead Source Type |
|---|---|
| Telecall | Direct |
| Trade Show | Direct |
| Exhibition | Direct |
| LinkedIn | Digital |
| Google Ads | Digital |
| Customer Reference | Reference |

The Lead Source Type must be selected from the Lead Source Type Master.

---

## 4. Development Phase 2 – Dynamic Lead Source Type Retrieval

Remove the dependency on hard-coded Lead Source names inside Lead Gen Summary.

### Current

The Lead logic currently uses:

```text
LinkedIn
Trade Show
Exhibition
Telecall
```

### New

Use the following flow:

```text
Lead Source Type
       ↓
Get all Lead Sources mapped to that type
       ↓
Use the mapped Lead Sources for calculations
```

Example:

```text
Direct
 ├── Telecall
 ├── Trade Show
 └── Exhibition
```

```text
Digital
 ├── LinkedIn
 ├── Google Ads
 └── Website
```

Lead Source names must not be hard-coded for this functionality.

---

## 5. Development Phase 3 – Lead Achievement

Update Lead Achievement to use Lead Source Type.

### Current

Lead Achievement counts Leads whose Lead Source belongs to the existing hard-coded Lead Source list.

### New

Lead Achievement should be calculated using all Lead Sources mapped to the relevant Lead Source Type.

Example:

```text
Direct
 ↓
Telecall + Trade Show + Exhibition
 ↓
Lead Achievement
```

For Digital:

```text
Digital
 ↓
LinkedIn + Google Ads + Website
 ↓
Lead Achievement
```

Existing filters must continue to apply:

- BDE
- Product
- Date range
- RBAC

The existing Lead Achievement calculation itself should not otherwise change.

---

## 6. Development Phase 4 – Sales Pipeline

Sales Pipeline must use the **same Lead Source Type filtered Lead set** used for Lead Achievement.

Existing pipeline stages must remain unchanged:

- Order Won
- Q4
- Q3
- Q2
- Q1
- Nurturing
- Order Lost
- Total

The Pipeline Total must continue to equal Lead Achievement because both are calculated from the same filtered Lead set.

Example:

```text
Lead Source Type
       ↓
Mapped Lead Sources
       ↓
Filtered Leads
       ├── Order Won
       ├── Q4
       ├── Q3
       ├── Q2
       ├── Q1
       ├── Nurturing
       └── Order Lost
```

---

## 7. Development Phase 5 – Lead Tooltip

Existing Lead Achievement and Pipeline hover functionality must continue working.

The tooltip should continue to show:

- Lead ID
- Lead Name
- Created Date
- Lead Source

The tooltip data must represent Leads belonging to the relevant Lead Source Type.

No unnecessary UI change is required for the tooltip.

---

## 8. Development Phase 6 – Calls Logic

This is a required functional change.

Currently, Calls Achieved is calculated from CallTracker based on:

- Call status
- Date
- User
- Product

Calls Achieved must now also respect Lead Source Type.

### New flow

```text
Lead Source Type
       ↓
Mapped Lead Sources
       ↓
Related CallTracker records
       ↓
Calls Achieved
```

Example:

```text
Direct
 ↓
Telecall
Trade Show
Exhibition
 ↓
Related calls
 ↓
Direct Calls Achieved
```

```text
Digital
 ↓
LinkedIn
Google Ads
Website
 ↓
Related calls
 ↓
Digital Calls Achieved
```

### Important Implementation Rule

Before implementation, verify the existing **CallTracker → Lead relationship**.

Do not invent a new relationship or field if the existing application already provides the required relationship.

The current implementation reference confirms the existing CallTracker filtering logic but does not document the exact Lead relationship. Therefore, inspect the actual backend models/query before changing the Calls query.

---

## 9. Development Phase 7 – Calls Target

Do **not** change the existing Calls Target calculation.

Calls Target currently comes from:

```text
UserProductTarget.calls_target
```

and is scaled using actual Monday-Friday working days.

Keep this calculation unchanged.

Lead Source Type should affect **Calls Achieved**, not the existing Calls Target calculation.

---

## 10. Development Phase 8 – Lead Target

Do **not** change the existing Lead Target calculation.

Lead Target currently uses:

```text
UserProductTarget.leads_target
+
product.lead_q1_multiplier
+
actual working days
```

Keep this calculation unchanged.

Lead Source Type should affect **Lead Achievement**, not the existing Lead Target calculation.

---

## 11. Development Phase 9 – Lead Source Type-wise Tables

The current Lead Gen Summary has one table.

Update the UI so the same existing table structure is displayed separately for each active Lead Source Type.

Example:

```text
DIRECT MARKETING DETAIL

[same existing table]


DIGITAL MARKETING DETAIL

[same existing table]


REFERENCE DETAIL

[same existing table]
```

Each Lead Source Type section must use the same:

- BDE rows
- Total row
- Calls Target
- Calls Achieved
- Calls %
- Lead Target
- Lead Achievement
- Lead %
- Sales Pipeline
- Demo Given
- Proposals
- Lead tooltips
- Existing date/filter behavior

Only the Lead Source Type filtering should differ between sections.

### Dynamic Requirement

Do not hard-code:

```text
Direct
Digital
Reference
```

in the frontend.

The sections must be generated from the active Lead Source Type Master records.

If a new Lead Source Type is created later, it should automatically be available in Lead Gen Summary without code changes.

---

## 12. Development Phase 10 – Weekly Data

Weekly data should remain the default visible data.

The existing week calculation must remain unchanged:

- Monday-Sunday calendar weeks
- Week clipped to the selected month
- Partial first/last weeks supported
- Existing selected week/date range behavior preserved

The existing weekly table logic should not be changed except for the new Lead Source Type filtering.

---

## 13. Development Phase 11 – Month-wise Data

Currently the Lead Gen Summary displays both Weekly and Monthly sections together.

Change this behavior.

### Default State

Only weekly data should be displayed.

```text
DIRECT MARKETING DETAIL

Weekly Data
[table]

[ View Month-wise ]
```

### On Click

When the user clicks:

```text
View Month-wise
```

display the monthly data.

Example:

```text
DIRECT MARKETING DETAIL

Weekly Data
[table]

[ Hide Month-wise ]

Month-wise Data
[table]
```

### On Hide

When the user clicks:

```text
Hide Month-wise
```

the monthly section should collapse again.

---

## 14. Month-wise UI Requirement

The month-wise data should use the existing monthly calculation logic.

Do not create a new calculation system for monthly data.

Only change its visibility.

The monthly section should be:

- Hidden by default
- Expandable using View Month-wise
- Collapsible using Hide Month-wise
- Based on the existing selected month/product/BDE filters
- Available independently for each Lead Source Type section

---

## 15. Development Phase 12 – Backend Response

Update the backend response structure so the frontend can render multiple Lead Source Type sections.

The response should provide data grouped by Lead Source Type.

Conceptually:

```json
{
  "lead_source_types": [
    {
      "id": 1,
      "name": "Direct",
      "weekly": {
        "bde_rows": [],
        "total": {}
      },
      "monthly": {
        "bde_rows": [],
        "total": {}
      }
    },
    {
      "id": 2,
      "name": "Digital",
      "weekly": {
        "bde_rows": [],
        "total": {}
      },
      "monthly": {
        "bde_rows": [],
        "total": {}
      }
    }
  ]
}
```

The exact response structure can be adjusted to fit the existing implementation, but it must support:

```text
Lead Source Type
    ↓
Weekly Data
    ↓
Monthly Data
```

for every active Lead Source Type.

---

## 16. Development Phase 13 – Performance

The existing implementation intentionally fetches the combined week/month range once and slices data in memory to avoid duplicate queries.

Preserve this approach where possible.

Do not create separate database queries for every Lead Source Type if the same data can be fetched once and grouped in memory.

Preferred approach:

```text
Fetch required data once
        ↓
Group by Lead Source Type
        ↓
Group by BDE
        ↓
Calculate Weekly / Monthly metrics
        ↓
Return response
```

Avoid:

```text
Direct → separate complete query
Digital → separate complete query
Reference → separate complete query
...
```

unless required by the actual data relationship.

---

## 17. Development Phase 14 – Existing RBAC

Do not change existing RBAC behavior.

The existing Lead Gen Summary supports:

- SalesPerson
- SalesManager
- CEO / other roles

The current BDE scope and access rules must remain unchanged.

Lead Source Type filtering must happen **after applying the existing RBAC scope**.

Expected flow:

```text
RBAC Scope
    ↓
BDE/User Scope
    ↓
Product Scope
    ↓
Date Scope
    ↓
Lead Source Type
    ↓
Lead Source
    ↓
Metrics
```

---

## 18. Development Phase 15 – Frontend Changes

Update:

```text
client/src/pages/LeadGenSummary.tsx
```

Required changes:

### Existing

```text
One table
 ├── Weekly
 └── Monthly
```

### New

```text
Lead Source Type 1
 ├── Weekly
 └── Month-wise [hidden]

Lead Source Type 2
 ├── Weekly
 └── Month-wise [hidden]

Lead Source Type 3
 ├── Weekly
 └── Month-wise [hidden]
```

Each section should have a clear heading.

Example:

```text
DIRECT MARKETING DETAIL
```

```text
DIGITAL MARKETING DETAIL
```

```text
REFERENCE DETAIL
```

The heading should be generated from the Lead Source Type name.

---

## 19. Development Phase 16 – Backend Changes

Update:

```text
server/src/controllers/leadGenController.ts
server/src/routes/leadGenRoutes.ts
```

The controller should:

1. Resolve existing RBAC scope.
2. Resolve selected BDE/product/date filters.
3. Retrieve active Lead Source Types.
4. Retrieve Lead Sources mapped to each Lead Source Type.
5. Group Lead data by Lead Source Type.
6. Group Call data by Lead Source Type.
7. Calculate weekly metrics.
8. Calculate monthly metrics.
9. Return data grouped by Lead Source Type.

Existing target calculations should remain unchanged.

---

## 20. Development Phase 17 – Remove Hard-coded Lead Source Logic

Remove the dependency on:

```text
LinkedIn
Trade Show
Exhibition
Telecall
```

as a hard-coded Lead Source list.

Replace it with:

```text
Lead Source Type
        ↓
Lead Source mapping
```

This is important because adding a new Lead Source should not require a code change.

Example:

If the administrator adds:

```text
Lead Source Type: Digital

Lead Source: Instagram
```

then Lead Gen Summary should automatically include Instagram under Digital.

---

## 21. Development Phase 18 – Testing

### Lead Source Type

- [ ] Create Lead Source Type
- [ ] Edit Lead Source Type
- [ ] Activate/Deactivate Lead Source Type
- [ ] Duplicate validation
- [ ] Active types appear correctly

### Lead Source

- [ ] Map Lead Source to Lead Source Type
- [ ] Edit mapping
- [ ] Existing Lead Sources remain functional
- [ ] Inactive types cannot be newly selected

### Lead Achievement

- [ ] Direct count is correct
- [ ] Digital count is correct
- [ ] Reference count is correct
- [ ] Lead Source Type mapping is respected
- [ ] BDE filter works
- [ ] Product filter works
- [ ] Week filter works
- [ ] Month filter works

### Sales Pipeline

- [ ] Order Won
- [ ] Q4
- [ ] Q3
- [ ] Q2
- [ ] Q1
- [ ] Nurturing
- [ ] Order Lost
- [ ] Total equals Lead Achievement
- [ ] Tooltip displays correct Leads

### Calls

- [ ] Calls are filtered by Lead Source Type
- [ ] Direct calls are correct
- [ ] Digital calls are correct
- [ ] Reference calls are correct
- [ ] Calls Target remains unchanged
- [ ] Calls % remains correct

### UI

- [ ] Each Lead Source Type has its own section
- [ ] Weekly data visible by default
- [ ] Monthly data hidden by default
- [ ] View Month-wise works
- [ ] Hide Month-wise works
- [ ] Multiple sections render correctly
- [ ] Total rows work
- [ ] Existing UI styling is preserved

### RBAC

- [ ] SalesPerson
- [ ] SalesManager
- [ ] CEO
- [ ] BDE scope remains correct

---

## 22. Development Phase 19 – Regression Testing

Verify that the following existing functionality is not broken:

- BDE dropdown
- Product dropdown
- Month selection
- Week selection
- Reset
- Persistent filters
- RBAC
- Calls Target
- Lead Target
- Demo Given
- Proposals
- Lead tooltip
- Pipeline totals
- Loading state
- Empty state
- API error handling

No unrelated Lead Gen Summary functionality should be modified.

---

## 23. Development Phase 20 – Update `leadgensum.md`

After development and testing are completed, update:

```text
leadgensum.md
```

The updated file must become the **new source of truth** for the Lead Gen Summary implementation.

The documentation must be updated to reflect:

### Filters

Document the existing filters and behavior.

### Lead Source Type

Document:

```text
Lead Source Type
    ↓
Lead Source mapping
    ↓
Lead Achievement
    ↓
Sales Pipeline
```

### Calls

Document the new Lead Source Type-based Calls Achieved logic.

### Targets

Clearly document that:

- Calls Target remains based on `UserProductTarget.calls_target`.
- Lead Target remains based on `UserProductTarget.leads_target` and `lead_q1_multiplier`.

### UI

Document:

```text
Lead Source Type sections
        ↓
Weekly data visible by default
        ↓
Month-wise data hidden by default
        ↓
View Month-wise → expand
        ↓
Hide Month-wise → collapse
```

### Response Shape

Update the API response documentation to reflect the new Lead Source Type-wise structure.

### Remove Obsolete Documentation

Remove the old statement that Lead Achievement and Sales Pipeline are restricted to:

```text
LinkedIn
Trade Show
Exhibition
Telecall
```

because this will no longer be the implementation.

Replace it with the dynamic Lead Source Type mapping behavior.

---

# 24. Final Expected Architecture

```text
Lead Source Type Master
        │
        ├── Direct
        │      ├── Telecall
        │      ├── Trade Show
        │      └── Exhibition
        │
        ├── Digital
        │      ├── LinkedIn
        │      ├── Google Ads
        │      └── Website
        │
        └── Reference
               ├── Customer Reference
               └── Employee Reference
                         │
                         ↓
                  Lead Gen Summary
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       Direct         Digital        Reference
          │              │              │
       Weekly         Weekly         Weekly
          │              │              │
       Calls          Calls          Calls
       Leads          Leads          Leads
       Pipeline       Pipeline       Pipeline
       Demo           Demo           Demo
       Proposal       Proposal       Proposal
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                 View Month-wise
                         ↓
                  Monthly Data
```

---

# 25. Final Acceptance Criteria

Development is considered complete only when:

1. Lead Source Type Master is available.
2. Lead Sources can be mapped to a Lead Source Type.
3. Lead Achievement uses Lead Source Type mapping.
4. Sales Pipeline uses the same Lead Source Type filtered Lead set.
5. Calls Achieved uses Lead Source Type mapping.
6. Calls Target remains unchanged.
7. Lead Target remains unchanged.
8. All active Lead Source Types generate their own Lead Gen Summary section dynamically.
9. Existing BDE/Product/Month/Week/RBAC behavior remains intact.
10. Weekly data is displayed by default.
11. Monthly data is hidden by default.
12. View Month-wise expands monthly data.
13. Hide Month-wise collapses monthly data.
14. Existing tooltip behavior continues working.
15. Existing Lead Gen Summary functionality is not broken.
16. No hard-coded Lead Source list remains for Lead Source Type-based calculations.
17. `leadgensum.md` is updated at the end of development with the final implemented behavior.
18. The updated `leadgensum.md` accurately reflects the actual code and API behavior after deployment.
