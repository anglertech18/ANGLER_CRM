# POAs (Plan of Action)

Feature reference document for the POAs submodule (part of the SEAL module
group — see `[[seal-dashboard-module]]`).

## Overview

The POAs module manages Plans of Action linked to products and BDEs within
the SEAL framework. POAs define structured action items with
responsibilities, deadlines, and completion status, providing accountability
tracking across the sales team. It also supplies the shared
`mapped-products` / `mapped-bdes` lookups every other SEAL submodule's
product/BDE dropdown depends on.

---

## Location
- **Frontend:** `client/src/pages/seal/POAs.tsx`
- **Modal component:** `client/src/components/POAModal.tsx`
- **Backend:** `server/src/controllers/poaController.ts`
- **API routes:** `GET/POST/PUT/DELETE /api/seal/poas`
- **Supporting:** `GET /api/seal/poas/mapped-products`, `GET /api/seal/poas/mapped-bdes`

Mounted under `/api/seal` (`server/src/routes/sealRoutes.ts`) with
`authenticate` only — no `checkPrivilege` middleware; RBAC is enforced
inline in `poaController.ts`.

---

## Key Features

### Product Selection
- Dropdown populated from `GET /api/seal/poas/mapped-products` — CEO gets
  every active product; SalesManager gets the union of their own and their
  subordinates' `UserProductTarget` mappings; SalesPerson gets only their
  own.
- Selection persisted via `usePersistentFilters('poas')`.
- On selection change, BDE filter and all other filters are reset.

### BDE Filter
- Dropdown populated from `GET /api/seal/poas/mapped-bdes?productId=X`.
- Auto-defaults to logged-in user's ID on page open.
- Available to Admin/CEO/SalesManager roles.

### Filters
| Filter | Description |
|---|---|
| From Date / To Date | Date range on POA date field |
| Responsibility | Filter by responsible party |
| Status | Filter by POA completion status |

All filters persisted and resettable.

### POA List Table
Displays all POAs for the selected product/BDE combination.

| Column | Description |
|---|---|
| # | Serial number |
| Date | POA date |
| BDE | Assigned BDE name |
| Product | Product name badge |
| Action Item | Description of the planned action |
| Responsibility | Who is responsible |
| Target Date | Expected completion date |
| Status | Completion status badge |
| Notes | Tooltip on hover (via React portal) showing full notes text |
| Actions | Edit (modal) / Delete |

### Add / Edit POA (Modal)
Opens `POAModal` component in add or edit mode. The modal form captures:
- Date
- Product (pre-filled from selection)
- BDE / User
- Action item description
- Responsibility
- Target date
- Status
- Notes

### Tooltip (Notes)
Long notes are truncated in the table. Hovering the notes cell shows a React portal tooltip with the full text, positioned above the cursor.

### Delete
Calls `DELETE /api/seal/poas/:id` with window confirmation. Invalidates `['poas']` query cache.

---

## RBAC
| Role | Behaviour |
|---|---|
| CEO / Admin | Full access — all products, all BDEs, can create/edit/delete |
| SalesManager | Scoped to own products + team BDEs |
| SalesPerson | Sees only own POAs |

---

## API Contract

### `GET /api/seal/poas`
| Param | Type | Description |
|---|---|---|
| `product_id` | number | Filter by product |
| `user_id` | number | Filter by BDE |
| `from_date` / `to_date` | date string | Date range |
| `responsibility` | string | Responsibility filter |
| `status` | string | Status filter |

### `POST /api/seal/poas`
Creates a new POA. Body fields: `date`, `product_id`, `user_id`, `action_item`, `responsibility`, `target_date`, `status`, `notes`.

### `PUT /api/seal/poas/:id`
Updates an existing POA.

### `DELETE /api/seal/poas/:id`
Deletes a POA.

### `GET /api/seal/poas/mapped-products`
Returns RBAC-scoped products: `[{ id, name }]`. This is the shared endpoint
every SEAL submodule's product dropdown calls — see `[[seal-dashboard-module]]`.

### `GET /api/seal/poas/mapped-bdes?productId=X`
Returns BDEs with active targets on the product, scoped by role.

---

## Navigation
- Route: `/poas`
