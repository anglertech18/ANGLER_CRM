# SWAT Performance Module

## 1. Overview

SWAT Performance is a daily activity tracking module for BDEs (Business Development Executives). Each BDE logs their daily work against targets set per product or service department. The module auto-calculates key fields from live data (CallTracker, Lead records) so BDEs cannot inflate numbers manually.

---

## 2. Files

| Layer | Path | Purpose |
|---|---|---|
| Frontend list | `client/src/pages/SwatPerformanceIndex.tsx` | List view with filters and export |
| Frontend form | `client/src/pages/SwatPerformanceForm.tsx` | Daily entry form (create / view) |
| Backend controller | `server/src/controllers/swatController.ts` | Business logic for all three endpoints |
| Backend controller (dist) | `server/dist/controllers/swatController.js` | Compiled JS — server runs this |
| Routes | `server/src/routes/swatRoutes.ts` | Registers the three REST endpoints |

---

## 3. API Endpoints

| Method | Path | Controller | Description |
|---|---|---|---|
| `GET` | `/api/swat-performance` | `getSwatPerformance` | Paginated list with date / user / status / product / service filters |
| `POST` | `/api/swat-performance` | `saveSwatPerformance` | Create or update today's record for a product or service |
| `GET` | `/api/swat-performance/stats` | `getSwatStats` | Live computed stats for the form; auto-creates today's record on first visit |

---

## 4. Data Model

### `SwatPerformance`

```
id                        Int      PK
bde_name                  String   Snapshot of the BDE's name at time of entry
date                      DateTime @db.Date  (UTC midnight — one record per user+date+product/service)
user_id                   Int      FK → User
product_id                Int?     FK → Product  (null when entry is service-based)
service_department        String?  "EIT Services" | "IM Services"  (null when product-based)
performance_percentage    Float    Computed overall % across active sections
```

Unique constraint: `[user_id, date, product_id, service_department]` — one entry per BDE per day per product-or-service.

### Sections stored on `SwatPerformance`

| Section | Fields stored |
|---|---|
| Calls | `calls_target`, `calls_achieved`, `calls_remarks` |
| Activities | `activities_target`, `activities_achieved`, `activities_remarks` |
| Q1 Lead Generation | `q1_lead_gen_target`, `q1_lead_gen_achieved`, `q1_lead_gen_remarks` |
| LinkedIn | `linkedin_target`, `linkedin_achieved`, `linkedin_remarks` |
| Demos | `demos_target`, `demos_achieved`, `demos_remarks` |
| Proposals | `proposals_target`, `proposals_achieved`, `proposals_remarks` |
| Direct Visit | `direct_visit_target`, `direct_visit_achieved`, `direct_visit_remarks` |
| Sales Order Won | `sales_order_won_target`, `sales_order_won_achieved`, `sales_order_won_remarks` |
| Revenue Collected | `revenue_collected_target`, `revenue_collected_achieved`, `revenue_collected_remarks` |
| Positive movements | `q1_to_q2`, `q2_to_q3`, `q3_to_q4`, `q4_to_order` |
| Negative movements | `q4_to_q3`, `q3_to_q2`, `q2_to_q1`, `any_to_nurturing` |

### `SwatKeyClosure`

```
id                    Int   PK
swat_performance_id   Int   FK → SwatPerformance (cascade delete)
closure_text          Text
```

Free-text notable outcomes attached to a SWAT entry; one entry can have many.

### Target tables (read-only by SWAT)

| Table | Used for |
|---|---|
| `UserProductTarget` | `calls_target`, `linkedin_target`, `leads_target`, `direct_visit_target` per user+product |
| `UserServiceTarget` | Same fields, keyed by `user_id + service_department` |
| `Product` | `lead_q1_multiplier` — used in Q1 lead gen target formula |
| `EitService` | `lead_q1_multiplier` — used when entry is for EIT Services |
| `ImService` | `lead_q1_multiplier` — used when entry is for IM Services |

---

## 5. Frontend Flow

### 5.1 Index page (`SwatPerformanceIndex`)

1. On mount: fetches `/api/users` (admin/manager only) and `/api/seal/poas/mapped-product-services` to populate filter dropdowns.
2. Whenever any filter changes: fetches `/api/swat-performance?startDate=&endDate=&user_id=&status=&product_id=&service_department=`.
3. Composite dropdown for Product / Service filter: key format `"product:3"` or `"service:EIT Services"` — `handleMappedItemChange` splits the key and sets the right filter field.
4. Table columns: BDE name, Product/Service badge (`log.product?.name || log.service_department`), Date, Calls, Activities, Q1 Lead Gen, LinkedIn, Demos, Proposals, Visits, Edit/View button.
5. **Edit/View navigation** passes the record's context in the URL:
   - Product record: `?date=YYYY-MM-DD&product_id=X`
   - Service record: `?date=YYYY-MM-DD&service_department=EIT%20Services`
6. Export to Excel (admin/manager only): uses `xlsx` library.

### 5.2 Form page (`SwatPerformanceForm`)

1. Reads URL params: `date`, `product_id`, `service_department`.
2. Fetches `/api/seal/poas/mapped-product-services` to build the Product / Service dropdown.
3. **Auto-selects** from URL params first (`product_id` → `product:X`, `service_department` → `service:EIT Services`); falls back to first item in list.
4. Derives two values from the composite key `selectedMappedKey`:
   - `selectedType`: `'Product'` | `'EIT Services'` | `'IM Services'`
   - `selectedProductId`: numeric string or `''`
5. On date or dropdown change: calls `GET /api/swat-performance/stats?date=&product_id=` or `?date=&service_department=`.
6. Response `{ targets, achievements, existing }` is spread into form state; `existing` provides editable manual fields (demos, proposals, remarks, etc.) when a record already exists.
7. Read-only rows (auto-computed): **Calls**, **Activities**, **Q1 Lead Generation**.
8. Manual entry rows: **Direct Visit**, **Demos** (target editable), **Proposals** (target editable), **Sales Order Won** (target editable), **Revenue Collected** (target editable).
9. LinkedIn Connections: displayed but sourced from existing record (`linkedin_achieved`).
10. Quadrant movement panels are read-only — values are auto-computed from `LeadQuadrantHistory`.
11. Past records open in view-only mode (`isViewOnly = true`).
12. On submit: `POST /api/swat-performance` with `product_id` or `service_department` appended to payload.

---

## 6. Backend Controller Logic

### 6.1 `saveSwatPerformance` (POST)

Triggered when the user submits the form. Steps:

1. Parse `product_id` and `service_department` from body; reject if both are absent.
2. Reject if `date` is before today (past records cannot be modified).
3. Compute `startOfDay` / `endOfDay` in **local timezone** (not UTC) — CallTracker and Lead timestamps are stored in local time.
4. Fetch user targets:
   - Product → `UserProductTarget` by `user_id + product_id`
   - Service → `UserServiceTarget` by `user_id + service_department`
5. **Calls achieved** — count of `CallTracker` records for the day:
   - Product: `WHERE product_id = X`
   - EIT Services: `WHERE eit_service_id IS NOT NULL`
   - IM Services: `WHERE im_service_id IS NOT NULL`
6. **Activities achieved** = LinkedIn sent count + Email sent count from same CallTracker filter (no `call_status_id` restriction).
7. **Q1 Lead Gen achieved** — count of `Lead` records created today:
   - Product: `WHERE product_id = X`
   - EIT Services: `WHERE eit_service_id IS NOT NULL`
   - IM Services: `WHERE im_service_id IS NOT NULL`
8. **Quadrant movements** — count of `LeadQuadrantHistory` records today, filtered by product or service on the linked lead.
9. **Multiplier** — fetched from DB:
   - Product: `Product.lead_q1_multiplier`
  
10. **Q1 Lead Gen target** = `round((leads_target × multiplier) / 22)`
11. **Activities target** = `calls_target + linkedin_target`
12. Build `data` object — auto-computed fields override anything posted by the client:
    - `calls_achieved`, `activities_achieved`, `activities_target`, `q1_lead_gen_achieved`, quadrant movements — always re-computed.
    - `linkedin_achieved` — taken from `body.linkedin_achieved` (manual entry).
    - `demos_target`, `proposals_target`, etc. — taken from body (user-editable).
13. **Performance %** = average of per-section `(achieved / target × 100)` capped at 100%, only for sections where `target > 0`.
14. Upsert: `findFirst` on `(user_id, date, product_id, service_department)` → `update` if exists, else `create`.
15. Handle `key_closures`: delete all existing closures for the record, then bulk-create new ones from body.

### 6.2 `getSwatPerformance` (GET — list)

1. Parse query: `startDate`, `endDate`, `user_id`, `status`, `product_id`, `service_department`.
2. Build Prisma `where`:
   - `product_id` filter if set (exclusive of `service_department`)
   - `service_department` filter if set
   - Date range
   - `user_id` if specified
3. RBAC:
   - `SalesPerson` → always scoped to own records only
   - `SalesManager` → own records + direct subordinates
   - `CEO` → all records
4. Fetch with `include: { user, product, key_closures }`.
5. Client-side status filter: `performance_percentage < 70` = Below Target, `70–99` = Achieved, `≥ 100` = Exceeded.

### 6.3 `getSwatStats` (GET — live stats for form)

Called every time the user changes the date or the product/service dropdown. Steps:

1. Parse `date`, `product_id`, `service_department` from query; return empty if neither product nor service is provided.
2. Compute `startOfDay` / `endOfDay` in local timezone.
3. Fetch `existing` SWAT record for `(user, date, product/service)`.
4. Fetch `userTargets` from `UserProductTarget` or `UserServiceTarget`.
5. Run all the same auto-computations as `saveSwatPerformance` (steps 5–11 above) to get live values.
6. **Auto-create today's record** if `existing` is null and date is today — stores current live values so the form has a DB row to update later.
7. Return:
   ```json
   {
     "targets":      { calls_target, activities_target, linkedin_target, q1_lead_gen_target, ... },
     "achievements": { calls_achieved, activities_achieved, linkedin_achieved, q1_lead_gen_achieved, ...quadrant_movements },
     "existing":     { full SwatPerformance record or null }
   }
   ```

---

## 7. Business Logic

### Target Formulas

| Field | Formula | Source |
|---|---|---|
| `calls_target` | Direct from user target table | `UserProductTarget` / `UserServiceTarget` |
| `linkedin_target` | Direct from user target table | Same |
| `direct_visit_target` | Direct from user target table | Same |
| `activities_target` | `calls_target + linkedin_target` | Computed |
| `q1_lead_gen_target` | `round((leads_target × multiplier) / 22)` | Computed; 22 = working days per month |

### Achievement Rules

| Field | How computed | Editable by BDE? |
|---|---|---|
| `calls_achieved` | Auto: count of today's CallTracker rows for this product/service | No |
| `activities_achieved` | Auto: count of CT rows with `linkedin_sent = true` + count with `email_status_id IS NOT NULL` | No |
| `q1_lead_gen_achieved` | Auto: count of Leads created today for this product/service | No |
| `linkedin_achieved` | Manual entry from form body | Yes |
| `demos_achieved` | Manual entry from form body | Yes |
| `proposals_achieved` | Manual entry from form body | Yes |
| `direct_visit_achieved` | Manual entry from form body | Yes |
| `sales_order_won_achieved` | Manual entry from form body | Yes |
| `revenue_collected_achieved` | Manual entry from form body | Yes |
| All quadrant movements | Auto: count of `LeadQuadrantHistory` rows for today | No |

### Performance Percentage

```
active_sections = sections where target > 0
section_pct     = min(100, achieved / target × 100)   for each active section
performance_%   = sum(section_pct) / active_sections
```

Sections included: Calls, Activities, Q1 Lead Gen, LinkedIn, Demos, Proposals, Direct Visit, Sales Order Won, Revenue Collected.

---

## 8. Product vs Service Data Retrieval

The same filter logic is applied consistently for products and services across all three data sources:

| Data Source | Product filter | EIT Services filter | IM Services filter |
|---|---|---|---|
| `CallTracker` | `product_id = X` | `eit_service_id IS NOT NULL` | `im_service_id IS NOT NULL` |
| `Lead` (Q1 created) | `product_id = X` | `eit_service_id IS NOT NULL` | `im_service_id IS NOT NULL` |
| `Lead` (movements) | `lead.product_id = X` | `lead.eit_service_id IS NOT NULL` | `lead.im_service_id IS NOT NULL` |
| Multiplier | `Product.lead_q1_multiplier` | `EitService.findFirst().lead_q1_multiplier` | `ImService.findFirst().lead_q1_multiplier` |
| User targets | `UserProductTarget` | `UserServiceTarget WHERE service_department = 'EIT Services'` | `UserServiceTarget WHERE service_department = 'IM Services'` |

**Important:** Call tracker entries must have `eit_service_id` (or `im_service_id`) set to be counted for the respective service. Entries with only `product_or_service` text and no FK will not be counted.

---

## 9. RBAC

| Role | Can view | Can edit |
|---|---|---|
| `SalesPerson` | Own records only | Own record for today only |
| `SalesManager` | Own + direct subordinates | Own today only |
| `CEO` | All records | Own today only |

The list endpoint enforces RBAC server-side. The stats/save endpoints enforce that a `SalesPerson` cannot view or edit another user's data.

---

## 10. Auto-Create Behaviour

When `getSwatStats` is called for today and no existing record exists, the backend automatically creates a `SwatPerformance` row with:
- All auto-computed current values (calls, activities, Q1, movements).
- Targets from `userTargets` (including `linkedin_target`, `direct_visit_target`).
- Editable fields (`demos_target`, `proposals_target`, etc.) set to 0.

This ensures `saveSwatPerformance` always performs an `update` rather than a `create`, preventing duplicate records on the unique constraint.

---

## 11. Edge Cases

| Scenario | Behaviour |
|---|---|
| No `UserProductTarget` / `UserServiceTarget` set for user | All targets default to 0; achievements still computed live |
| User visits a past date | Form opens in view-only mode; `saveSwatPerformance` rejects with 400 |
| User has multiple products | One SWAT record per product per day; dropdown selects which product to log |
| Duplicate save attempt | Upsert: `findFirst` finds existing row, runs `update` on its `id` |
| `performance_percentage` when all targets = 0 | Returns 0 (no active sections) |
| Key closures on update | Old closures deleted, new ones created in the same request |
| `eit_service_id` null on a call tracker entry | Entry is NOT counted toward EIT Services SWAT (must have the FK set) |
