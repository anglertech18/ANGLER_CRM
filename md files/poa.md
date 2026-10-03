# POA (Plans of Action) Module

Feature reference document for the Plans of Action module in the Angler CRM.

---

## Overview

The POA module lets BDEs record and track meeting outcomes and action items for each product they are mapped to. Every POA entry is scoped to a **product** and belongs to the logged-in user. Managers and admins can view POA records across their team (managers see their entire downward reporting tree, all levels). The page follows a product-selection-gated pattern — no data loads until a product is chosen.

EIT Services and IM Services are treated as normal Products (they exist in the Product Master). There is no service-based logic anywhere in this module.

---

## Initial Page Load

When the user opens the POA page:

- Display only the **selection bar** with:
  - **Product dropdown** (populated from the user's mapped products only)
  - **BDE dropdown** (visible only to CEO and SalesManager)
- Do NOT fetch or display any POA records until a product is selected.
- The "Create New POA" button is hidden until a selection is made.

---

## Product Selection Logic

The Product dropdown is populated from `GET /api/seal/poas/mapped-products`.

**Rules by role:**

| Role           | Products shown                                                                             |
|----------------|--------------------------------------------------------------------------------------------|
| `CEO`          | All active products from the Product Master                                                |
| `SalesManager` | Products mapped to themselves and their full downward reporting tree via User Product Mapping       |
| `SalesPerson`  | Only products mapped to themselves                                                         |

**Updated rules:**

- Products are loaded only from the **Product Master**.
- Only user-mapped products are displayed — no global product list.
- No `UserServiceTarget` lookup is performed.
- No `service_department` mapping is used.
- EIT Services and IM Services are treated as normal Products because they exist in the Product Master.
- On page load, the first mapped product is automatically selected (or the previously persisted selection is restored).
- Changing the product resets the BDE filter and all row-level filters.

---

## BDE Filter Logic

The BDE dropdown is visible **only for CEO and SalesManager**. It is populated from `GET /api/seal/poas/mapped-bdes?productId=`.

| Role           | Behaviour                                                             |
|----------------|-----------------------------------------------------------------------|
| `CEO`          | Can select any BDE mapped to the selected product                     |
| `SalesManager` | Can select themselves or anyone in their downward reporting tree (all levels)             |
| `SalesPerson`  | No BDE dropdown — scoped to their own records automatically           |

Selecting a BDE narrows the POA list to only that BDE's records for the selected product.

---

## Role-Based Access Control (RBAC)

RBAC is enforced server-side in `getPOAs` and `getPOASummary`.

| Role           | Visible POA Records                                                            |
|----------------|--------------------------------------------------------------------------------|
| `CEO`          | All records across all users                                                   |
| `SalesManager` | Own records + records of their entire downward reporting tree (all levels of `reporting_manager_id`, via `utils/teamScope`)      |
| `SalesPerson`  | Only their own records                                                         |

---

## Row-Level Filters

After a product is selected, the following filters are available:

| Filter         | Type        | Behaviour                                                     |
|----------------|-------------|---------------------------------------------------------------|
| From           | Date        | Filters records where `date_of_meeting >= from`               |
| To             | Date        | Filters records where `date_of_meeting <= to`                 |
| Responsibility | Text search | Case-insensitive partial match on the `responsibility` field  |
| Status         | Dropdown    | `All` / `Pending` / `In Progress` / `Completed`               |

Filters are applied client-side on the already-loaded POA list. A **Reset** button clears all row-level filters without changing the product selection.

---

## Summary Panels

Two summary cards are displayed once a product is selected.

### Overall POA Summary (`GET /api/seal/poas/summary`)

| Column      | Description                                         |
|-------------|-----------------------------------------------------|
| Generated   | Total POA records for the selected scope            |
| Completed   | Count of records with `status = 'Completed'`        |
| Pending     | Count of records with `status = 'Pending'`          |
| In Progress | Count of records with `status = 'In Progress'`      |
| %           | `(Completed / Total) * 100` rounded to nearest int  |

### Current Week Summary (`GET /api/seal/poas/weekly-summary`)

Breaks the current month into 5 week buckets by day of month:

| Week   | Days   |
|--------|--------|
| Week 1 | 1 – 7  |
| Week 2 | 8 – 14 |
| Week 3 | 15 – 21|
| Week 4 | 22 – 28|
| Week 5 | 29+    |

The panel shows only the **current week's** row (determined by today's day of month). Columns are the same as the overall summary.

---

## Database Model

**Table:** `PlanOfAction` (Prisma)

| Field             | Type       | Required | Description                                                    |
|-------------------|------------|----------|----------------------------------------------------------------|
| `id`              | Int (PK)   | Auto     | Auto-incremented primary key                                   |
| `user_id`         | Int (FK)   | Yes      | Owner — the BDE who created the record                         |
| `product_id`      | Int? (FK)  | No       | Linked product — the only product reference used               |
| `service_department` | String? | No      | **Legacy field — do not use.** Not shown in UI, not used in filtering, reporting, or validations |
| `date_of_meeting` | DateTime   | Yes      | Date the meeting took place (`@db.Date`)                       |
| `poa_description` | String     | Yes      | Description of the action item / meeting outcome (`@db.Text`)  |
| `responsibility`  | String     | Yes      | Name of the person responsible for the action                  |
| `edc`             | DateTime?  | No       | Estimated Date of Completion                                   |
| `revised_edc`     | DateTime?  | No       | Revised Estimated Date of Completion                           |
| `status`          | String     | Yes      | `Pending` (default) / `In Progress` / `Completed`             |
| `adc`             | DateTime?  | No       | Actual Date of Completion                                      |
| `created_at`      | DateTime   | Auto     | Record creation timestamp                                      |
| `updated_at`      | DateTime   | Auto     | Last update timestamp                                          |

**Model rules:**
- All product references use `product_id` only.
- `service_department` must not be used for filtering, reporting, validations, or UI display.
- New records are created using `product_id` only.

---

## API Endpoints

All routes are under `/api/seal/poas` and require a valid JWT (`authenticate` middleware).

### GET `/seal/poas/mapped-products`
Returns products mapped to the logged-in user. Used to populate the Product dropdown.

> **Note:** Previously named `/seal/poas/mapped-product-services`. All references must use the new name.

**Response:** Array of `{ id: number, name: string }`

```json
[
  { "id": 1, "name": "FMS" },
  { "id": 2, "name": "EIT Services" }
]
```

**Rules:**
- Returns only products mapped to the logged-in user.
- Data source is the Product Master only.
- No Product/Service segregation logic.
- No `UserServiceTarget` lookup.

---

### GET `/seal/poas/mapped-bdes?productId=`
Returns BDEs mapped to a product, scoped by the caller's RBAC role. Used to populate the BDE dropdown for Admin/Manager.

**Query params:**

| Param       | Type   | Required | Description                |
|-------------|--------|----------|----------------------------|
| `productId` | number | Yes      | ID of the selected product |

**Response:** Array of `{ id, first_name, last_name, role }`

---

### GET `/seal/poas`
Returns POA records for the caller's allowed scope.

**Query params:**

| Param       | Type   | Required | Description                             |
|-------------|--------|----------|-----------------------------------------|
| `productId` | number | No       | Filter by product                       |
| `userId`    | number | No       | Filter by BDE (Admin/Manager use only)  |

**Response:** Array of `PlanOfAction` records, each including `product { id, name }`. Ordered by `date_of_meeting` descending.

---

### GET `/seal/poas/summary`
Returns aggregate counts for the caller's scope.

**Query params:** Same as `GET /seal/poas`.

**Response:**
```json
{
  "totallyGenerated": 12,
  "totallyCompleted": 5,
  "inProgress": 4,
  "pending": 3,
  "completionPct": "42%"
}
```

---

### GET `/seal/poas/weekly-summary`
Returns per-week breakdown for the **current month**.

**Query params:** Same as `GET /seal/poas`.

**Response:** Array of 5 week objects:
```json
[
  { "week": "Week 1", "totalGenerated": 3, "totalCompleted": 2, "inProgress": 1, "pending": 0, "completionPct": "67%" },
  ...
]
```

---

### POST `/seal/poas`
Creates a new POA record owned by the logged-in user.

**Required body fields:** `date_of_meeting`, `poa_description`, `responsibility`, `status`

**Optional body fields:** `product_id`, `edc`, `revised_edc`, `adc`

**Response:** `201` with the created `PlanOfAction` record including `product`.

---

### PUT `/seal/poas/:id`
Updates an existing POA record.

**Body:** Any subset of POA fields. `null` values for date fields (`edc`, `revised_edc`, `adc`) explicitly clear those dates.

**Response:** Updated `PlanOfAction` record including `product`.

---

### DELETE `/seal/poas/:id`
Hard-deletes a POA record.

**Response:** `{ message: 'POA deleted successfully' }`

---

## POA Form (Modal)

The form is rendered in a modal (`POAModal.tsx`) and handles both create and edit.

**Fields:**

| Field           | Type          | Required | Default (create)           |
|-----------------|---------------|----------|----------------------------|
| Date of Meeting | date          | Yes      | Today's date               |
| Responsibility  | select / text | Yes      | Logged-in user's full name |
| POA Description | textarea      | Yes      | —                          |
| EDC             | date          | No       | —                          |
| Revised EDC     | date          | No       | —                          |
| Status          | select        | Yes      | `Pending`                  |
| ADC             | date          | No       | —                          |

- **No Service field.** No Service Department field.
- The product is inherited from the currently selected product in the tracker — passed as a hidden `product_id` field.
- Only mapped products are available — no service-based selection.
- The **Responsibility** field renders as a dropdown (populated from all active users) if `responsibilityOptions` are passed, otherwise as a free-text input.
- On edit, all existing field values are pre-populated and dates are formatted as `YYYY-MM-DD` for the date inputs.

---

## POA Table Columns

| Column         | Description                                                              |
|----------------|--------------------------------------------------------------------------|
| Date           | `date_of_meeting` formatted as `DD/MM/YYYY`                              |
| Description    | `poa_description` truncated; hover shows full text in a tooltip          |
| Responsibility | Name of responsible person (highlighted in primary colour)               |
| EDC            | Estimated Date of Completion (`DD/MM/YYYY` or `—`)                       |
| Revised EDC    | Revised EDC (`DD/MM/YYYY` or `—`)                                        |
| Status         | Badge: green = Completed, blue = In Progress, amber = Pending            |
| ADC            | Actual Date of Completion (`DD/MM/YYYY` or `—`, shown in italic)         |
| Actions        | Edit (pencil) and Delete (trash) icon buttons                            |

---

## Expected User Flow

```
1. User opens POA page
        │
        ▼
2. Product dropdown loads (mapped products for logged-in user)
   First product auto-selected (or persisted selection restored)
   Data: GET /seal/poas/mapped-products
        │
        ▼
3. POA list, summary, and weekly summary load for selected product
   Data: GET /seal/poas?productId=X
   Data: GET /seal/poas/summary?productId=X
   Data: GET /seal/poas/weekly-summary?productId=X
        │
        ▼ (Admin/Manager selects a BDE)
4. Data re-fetches scoped to BDE
   Data: GET /seal/poas?productId=X&userId=Y
        │
        ▼ (user clicks "Create New POA")
5. POA modal opens with today's date and current user pre-filled
   product_id is locked to the currently selected product
        │
        ▼ (user submits form)
6. POST /seal/poas → new record created (product_id only, no service_department)
   React Query invalidates ['poas'] → list and summaries refresh
        │
        ▼ (user clicks edit icon)
7. POA modal opens pre-filled with existing record values
   PUT /seal/poas/:id → record updated
        │
        ▼ (user clicks delete icon)
8. Confirm dialog → DELETE /seal/poas/:id → record removed
```

---

## State Management

The page uses **React Query** for all server state and `usePersistentFilters` for persisting selection and filter state across navigation.

**React Query keys:**

| Key                                                                   | Data                                  |
|-----------------------------------------------------------------------|---------------------------------------|
| `['poas', 'mapped-products', authUser.id]`                           | Product dropdown items                |
| `['poas', 'mapped-bdes', authUser.id, selection.item.id]`            | BDE dropdown items                    |
| `['poas', 'list', authUser.id, selection.item.id, bdeId]`            | POA records list                      |
| `['poas', 'summary', authUser.id, selection.item.id, bdeId]`         | Overall summary counts                |
| `['poas', 'weekly-summary', authUser.id, selection.item.id, bdeId]`  | Weekly breakdown                      |
| `['users', 'all']`                                                   | All users for Responsibility dropdown |

- Mutations invalidate `['poas']` on success, refreshing all POA queries.
- `mappedItems` has a 5-minute `staleTime` to prevent flicker on navigation.
- Persistent filters key: `'poas'` — stores `sel_type`, `sel_id`, `selectedBdeId`, `fromDate`, `toDate`, `responsibility`, `status`.

---

## Frontend Files

| File                                        | Description              |
|---------------------------------------------|--------------------------|
| `client/src/pages/seal/POAs.tsx`           | Main POA list page       |
| `client/src/components/POAModal.tsx`       | Create / Edit modal form |

## Backend Files

| File                                              | Description                              |
|---------------------------------------------------|------------------------------------------|
| `server/src/controllers/poaController.ts`        | All POA controller functions             |
| `server/src/routes/sealRoutes.ts`                | Route definitions (under `/seal/poas`)   |
| `server/prisma/schema.prisma`                    | `PlanOfAction` model (line ~951)         |

---

## Application-Wide Rules

The following have been removed from all business logic across the application:

- `service_department` field usage (filtering, reporting, validations, UI display)
- `UserServiceTarget` lookups
- Product/Service selection or segregation
- Service filters, service reports, service workflows
- Any dropdown or label that reads "Product / Service"

**New standard:**
- **Product** is the only business entity.
- EIT Services and IM Services are Products in the Product Master — handled identically to any other product.
- All dropdowns, reports, dashboards, APIs, and validations operate using Products only.
- Only products mapped to the logged-in user are displayed throughout the application.
- User (BDE) defaults to the logged-in user wherever applicable.

---

## Related Modules

- **Enquiry Tracker** — uses `GET /seal/poas/mapped-products` (updated from `mapped-product-services`) for its own product/BDE selection logic; all service references removed
- **Seal Dashboard** — displays POA summary data as part of the overall Seal section overview
- **Weekly Summary** — uses the same product-selection-gated pattern
