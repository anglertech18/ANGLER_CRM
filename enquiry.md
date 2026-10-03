# Enquiry Tracker Module

Feature reference document for the Enquiry Tracker in the Angler CRM.

---

## Overview

The Enquiry Tracker captures inbound enquiries and manages them through a pipeline toward lead conversion. Every enquiry is scoped to either a **product** or a **service department** and is subject to role-based access control. When an enquiry is marked as converted, a Lead record is automatically created.

The module follows the same POA-style workflow: Product/Service selection gates all data loading, the BDE filter is role-based, and all enquiry records are strictly segregated by the selected scope — cross-product visibility is never allowed.

---

## Initial Page Load

When the user opens the Enquiry Tracker:

- Display **only** the selection bar containing:
  - **Product / Service dropdown** (populated from the user's mapped items only)
  - **BDE dropdown** (visible only to Admin / SalesManager — see BDE Selection Logic)
- Do NOT fetch or display any enquiry records until a Product/Service is selected.
- Do NOT show the global product/service list or unmapped items.
- The "Add Enquiry" button and filter panel are hidden until a selection is made.

---

## Product/Service Selection Logic

The Product/Service dropdown is populated from `/api/seal/poas/mapped-product-services` — it returns only the products and service departments the logged-in user is mapped to via `UserProductTarget` / `UserServiceTarget`.

**Rules:**
- Show only mapped Products/Services for the logged-in user.
- Dropdown uses `<optgroup>` to separate **Products** from **Services**.
- No item is auto-selected on page load (not even the first item).
- URL params (`?product_id=` or `?service_department=`) can restore a previous selection on load.
- Changing the selection resets the BDE filter and clears any active row-level filters.

**After the user selects a Product/Service:**
- Load only the enquiry records mapped to that Product/Service.
- The selected scope is maintained during search, tab switching, and filter changes.
- Cross-product records are never shown.

### Segregation Examples

| Selected | Records Shown | Records Hidden |
|----------|---------------|----------------|
| Timecheck (Product) | Only Timecheck enquiries | Vendora, IM Service, all others |
| IM Service | Only IM Service enquiries | Timecheck, Vendora, all others |
| Vendora (Product) | Only Vendora enquiries | Timecheck, IM Service, all others |

---

## BDE Selection Logic

The BDE dropdown appears **only for Admin (CEO) and SalesManager** roles. It is populated by `/api/seal/poas/mapped-bdes` scoped to the currently selected product/service.

| Role           | BDE Dropdown  | Behaviour                                                    |
|----------------|---------------|--------------------------------------------------------------|
| `CEO`          | Visible        | Can select any BDE mapped to the product/service             |
| `SalesManager` | Visible        | Can select themselves or any of their direct subordinates    |
| `SalesPerson`  | Hidden         | Automatically scoped to their own records — no selection needed |

Selecting a BDE narrows the enquiry list to only that BDE's records within the selected product/service scope.

---

## Data Filtering Rules

Every enquiry query is filtered by the combination of:

1. **Logged-in User ID** (RBAC scope — enforced server-side)
2. **Selected Product/Service** (`product_id` or `service_department`)
3. **Selected BDE ID** (if Admin/Manager has chosen a specific BDE)

These three filters are always active together. Additional row-level filters (date range, source, sales stage, company search) layer on top of this base scope.

**Prevent:**
- Mixed enquiry records from multiple products/services
- Global listing without a product/service context
- Records from products/services the user is not mapped to

**Maintain the scope filter during:**
- Text search
- Tab switching (Active ↔ Converted)
- Advanced filter changes
- Pagination (if added)

---

## Role-Based Access Control (RBAC)

| Role           | Visible Data                                                                    |
|----------------|---------------------------------------------------------------------------------|
| `CEO`          | All enquiries across all users, products, and services                          |
| `SalesManager` | Own enquiries + enquiries allocated to direct subordinates (`reporting_manager_id`) |
| `SalesPerson`  | Only enquiries allocated to themselves (`allocated_to_id = authUser.id`)        |

RBAC is enforced server-side in `getEnquiries`. When a `SalesPerson` requests data, the filter `allocated_to_id = user.id` is applied unconditionally regardless of query params.

---

## Database Model

**Table:** `Enquiry` (Prisma)

| Field               | Type       | Required | Description                                              |
|---------------------|------------|----------|----------------------------------------------------------|
| `id`                | Int (PK)   | Auto     | Auto-incremented primary key                             |
| `date`              | DateTime   | Yes      | Date the enquiry was received                            |
| `company_name`      | String?    | No       | Name of the enquiring company                            |
| `contact_name`      | String?    | No       | Primary contact person                                   |
| `mobile_number`     | String?    | No       | Contact mobile number                                    |
| `email`             | String?    | No       | Contact email address                                    |
| `requirement`       | String?    | No       | Description of the requirement                           |
| `lead_qualification`| String?    | No       | Qualification level (e.g. Hot, Warm, Cold)               |
| `linkedin_status`   | String?    | No       | LinkedIn connection status                               |
| `service_department`| String?    | No       | `"EIT Services"` or `"IM Services"` (null if product)   |
| `remarks`           | String?    | No       | Internal notes                                           |
| `frequency`         | String?    | No       | Follow-up frequency                                      |
| `name`              | String?    | No       | Additional name field                                    |
| `mktg_effectiveness`| String?    | No       | `Excellent` / `Good` / `Average` / `Poor`                |
| `is_converted`      | Boolean    | Yes      | Whether the enquiry has been converted to a lead         |
| `converted_at`      | DateTime?  | No       | Timestamp of conversion (set automatically)              |
| `lead_source_id`    | Int? (FK)  | No       | Source of the enquiry                                    |
| `country_id`        | Int? (FK)  | No       | Country                                                  |
| `state_id`          | Int? (FK)  | No       | State                                                    |
| `city_id`           | Int? (FK)  | No       | City                                                     |
| `validated_by_id`   | Int? (FK)  | No       | User who validated the enquiry                           |
| `allocated_to_id`   | Int? (FK)  | No       | BDE the enquiry is assigned to                           |
| `product_id`        | Int? (FK)  | No       | Linked product (null for service enquiries)              |
| `sales_stage_id`    | Int? (FK)  | No       | Current sales stage                                      |
| `created_at`        | DateTime   | Auto     | Record creation timestamp                                |
| `updated_at`        | DateTime   | Auto     | Last update timestamp                                    |

An enquiry is scoped to **either** `product_id` **or** `service_department` — never both.

---

## API Endpoints

All routes are under `/api/enquiries` and require a valid JWT.

### GET `/enquiries`
Returns all enquiries matching the given filters. RBAC is applied automatically.

**Base scope params (always required after selection):**

| Param               | Type    | Description                                             |
|---------------------|---------|---------------------------------------------------------|
| `product_id`        | number  | Filter by product (mutually exclusive with service_department) |
| `service_department`| string  | Filter by service department                            |
| `allocated_to_id`   | number  | Filter by BDE (Admin/Manager BDE filter; for SalesPerson, enforced server-side) |

**Additional row-level filter params:**

| Param               | Type    | Description                                             |
|---------------------|---------|---------------------------------------------------------|
| `is_converted`      | boolean | `true` for converted leads, `false` for active          |
| `search`            | string  | Full-text search across company, contact, email, mobile, requirement |
| `startDate`         | date    | Filter from date (inclusive)                            |
| `endDate`           | date    | Filter to date (inclusive, time set to 23:59:59)        |
| `lead_source_id`    | number  | Filter by lead source                                   |
| `company_name`      | string  | Case-insensitive partial match on company name          |
| `contact_name`      | string  | Case-insensitive partial match on contact name          |
| `sales_stage_id`    | number  | Filter by sales stage                                   |

**Includes:** `lead_source`, `country`, `state`, `city`, `validated_by`, `allocated_to`, `product`, `sales_stage`

### GET `/seal/poas/mapped-product-services`
Returns the products and service departments mapped to the logged-in user. Used to populate the Product/Service dropdown. See [POA.md](POA.md) for full documentation of this endpoint.

### GET `/seal/poas/mapped-bdes?productId=&serviceDept=`
Returns BDEs mapped to the selected product/service, scoped by the caller's role. Used to populate the BDE dropdown for Admin/Manager. See [POA.md](POA.md) for full documentation.

### GET `/enquiries/:id`
Returns a single enquiry by ID with all relations included.

### POST `/enquiries`
Creates a new enquiry. If `is_converted` is `true`, a Lead record is automatically created from the enquiry data. The `product_id` or `service_department` must match the tracker's current selection — enforced via context lock in the form.

**Auto Lead Creation on Conversion:**
- `contact_name` is split into `first_name` / `last_name`
- `lead_owner_id` ← `allocated_to_id`
- `lead_source_id`, `where_find_them_id`, location fields, and `sales_stage_id` are copied directly
- `product_or_service` is inferred: `"Product"` if `product_id` is set, `"EitService"` or `"ImService"` from `service_department`

### PUT `/enquiries/:id`
Updates an existing enquiry. If the enquiry transitions from `is_converted: false → true`, a Lead is automatically created (same logic as POST).

### DELETE `/enquiries/:id`
Hard-deletes the enquiry record.

---

## Expected User Flow

```
1. User opens Enquiry Tracker
         │
         ▼
2. System shows only Product/Service dropdown + BDE dropdown (Admin/Manager)
   Data: /seal/poas/mapped-product-services → dropdown (user-scoped)
   Data: /seal/poas/mapped-bdes → BDE dropdown (after product/service selected)
         │
         ▼ (user selects Product/Service)
3. BDE dropdown populates (Admin/Manager only)
   Enquiry list loads for selected scope
   Data: GET /enquiries?product_id=X&is_converted=false
         │
         ▼ (user optionally selects a BDE)
4. Enquiry list re-fetches scoped to BDE
   Data: GET /enquiries?product_id=X&allocated_to_id=Y&is_converted=false
         │
         ▼ (user clicks "Add Enquiry")
5. Navigate to /seal/enquiry-tracker/new?product_id=X&context_name=Name
   Form opens with product/service locked — cannot be changed
         │
         ▼ (user submits form)
6. POST /enquiries → new record created, scoped to selected product/service
   React Query invalidates ['enquiries'] → list refreshes
```

---

## Frontend Flow

**Files:**
- List page: [client/src/pages/seal/EnquiryTracker.tsx](client/src/pages/seal/EnquiryTracker.tsx)
- Create/Edit form: [client/src/pages/seal/EnquiryForm.tsx](client/src/pages/seal/EnquiryForm.tsx)

### Step 1 — Selection Bar (always visible)

The page opens showing a selection bar with:
- **Product / Service** dropdown — optgroups separating Products from Services, mapped items only
- **BDE** dropdown — Admin/Manager only, populated by `/seal/poas/mapped-bdes` after product/service is chosen

Until a Product/Service is selected:
- No enquiry data is fetched
- Filters and Add Enquiry button are hidden
- An empty-state card prompts the user to select

### Step 2 — View Enquiries

After selection, the enquiry list loads filtered to the chosen scope. Two tabs:
- **Active Enquiries** (`is_converted: false`)
- **Converted Leads** (`is_converted: true`)

The product/service + BDE scope is preserved when switching tabs.

### Step 3 — Advanced Filters

An expandable filter panel (toggled by "Filters" button) layers on top of the scope filter:
- Date range (From / To)
- Lead source
- Allocated BDE (row-level, separate from the BDE scope filter above)
- Sales stage
- Company name (text search)

"Reset All" clears all row-level filters but **does not** reset the product/service scope.

### Step 4 — Create Enquiry

"Add Enquiry" navigates to `new?product_id=X&context_name=Name` or `new?service_department=Y&context_name=Name`. The form locks the product/service to the current selection.

### Step 5 — Edit / Delete

Each row has:
- **Edit** icon → navigates to `/:id/edit`
- **Delete** icon → confirm dialog then `DELETE /enquiries/:id`

---

## EnquiryForm — Product/Service Locking

The form (`EnquiryForm.tsx`) uses a single unified **Product / Service** field, populated from `/seal/poas/mapped-product-services` — same as the tracker.

**Context lock (create mode from tracker):**
When the URL contains `product_id` or `service_department` params, the field is replaced with a read-only locked pill showing the product/service name. The form header subtitle shows "Scoped to: [Name]". This prevents creating an enquiry outside the current scope.

**Edit mode:**
A unified dropdown (with optgroups) is fully editable. The current `product_id` or `service_department` from the record is decoded and pre-selected. Selecting one clears the other (mutually exclusive).

**Standalone create (no URL params):**
Unified dropdown shown with all the user's mapped items. No value pre-selected.

---

## Table Columns

| Column             | Description                                                        |
|--------------------|--------------------------------------------------------------------|
| #                  | Enquiry ID                                                         |
| Date               | Date and time of enquiry (DD MMM YYYY / h:mm A)                   |
| Source             | Lead source badge                                                  |
| Company & Contact  | Company name, contact name, phone/email icons, city               |
| Requirement        | Truncated requirement text (2 lines)                               |
| Category           | Product name or service department badge                           |
| Status & Stage     | Sales stage + lead qualification                                   |
| Assignments        | Allocated BDE avatar and name                                      |
| Marketing Tool     | `mktg_effectiveness` badge (Active tab) or conversion date (Converted tab) |
| Actions            | Edit / Delete buttons                                              |

**Marketing Effectiveness badge colours:**
- `Excellent` → green
- `Good` → blue
- `Average` → amber
- `Poor` → red

---

## Auto Lead Conversion Logic

When an enquiry's `is_converted` flag is set to `true` (on create or update), the server automatically creates a `Lead` record:

```
Enquiry.contact_name     →  Lead.first_name + last_name (split on first space)
Enquiry.allocated_to_id  →  Lead.lead_owner_id
Enquiry.lead_source_id   →  Lead.lead_source_id + Lead.where_find_them_id
Enquiry.product_id       →  Lead.product_id
Enquiry.service_department  →  Lead.product_or_service ("EitService" / "ImService")
Enquiry.sales_stage_id   →  Lead.sales_stage_id
Location fields (country/state/city) copied directly
```

`converted_at` is stamped at the moment of transition and never overwritten on subsequent updates.

---

## State Management

The page uses **React Query** for all server state:

- Query key: `['enquiries', activeTab, filters, selection?.item.id, selectedBdeId]`
- BDE list key: `['poas', 'mapped-bdes', authUser?.id, selection?.item.id]`
- Mutations invalidate `['enquiries']` on success, refreshing the list.
- `mappedItems` has a 5-minute `staleTime` (stable data, prevents flicker on navigation).
- `leadSources`, `users`, and `salesStages` are fetched once for filter dropdowns.

Local UI state: `selection`, `selectedBdeId`, `activeTab`, `showFilters`, `filters` — all managed with `useState`.

---

## Technical Notes

- Reuse POA module filtering logic (`/seal/poas/mapped-product-services` and `/seal/poas/mapped-bdes`)
- Use AJAX/dynamic loading — no data is fetched before product/service selection
- Scope filter (`product_id` / `service_department` / `allocated_to_id`) must be included in every enquiry API call
- Scope is maintained during: search, tab switching, filter changes, and pagination
- Cross-product enquiry visibility is prevented at both the frontend query level and server-side RBAC

---

## Related Modules

- **POA Module** — shares `/seal/poas/mapped-product-services` and `/seal/poas/mapped-bdes` endpoints; see [POA.md](POA.md)
- **Weekly Progress Summary** — uses the same selection-gated pattern
- **Leads** — auto-created from enquiries on conversion
