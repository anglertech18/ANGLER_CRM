# Enquiry Tracker Module

Feature reference document for the Enquiry Tracker submodule (part of the
SEAL module group — see `[[seal-dashboard-module]]`).

---

## Overview

The Enquiry Tracker manages raw prospect enquiries prior to lead
qualification — a lighter-weight intake stage than `[[lead-module]]`. An
enquiry can be manually created, allocated to a BDE, and eventually
converted either into a `Lead` or into a `[[call-tracker-module]]` record.

**Do not confuse with `[[call-tracker-module]]`'s "Move to Enquiry" pipeline
action** — that's the reverse direction (a Call Tracker record spawning an
Enquiry). Both directions exist and link back to each other 1:1 via
`Enquiry.call_tracker_id`.

---

## Location

| Layer | Path |
|---|---|
| List page | `client/src/pages/seal/EnquiryTracker.tsx` |
| Form | `client/src/pages/seal/EnquiryForm.tsx` |
| Backend controller | `server/src/controllers/enquiryController.ts` |
| Routes | `server/src/routes/enquiryRoutes.ts`, mounted at `/api/enquiries` (**not** under `/api/seal`, unlike the rest of this module group) |

---

## Database Model

**Table:** `Enquiry` (Prisma, `server/prisma/schema.prisma`)

| Field | Type | Description |
|---|---|---|
| `id` | Int (PK) | Auto-incremented primary key |
| `date` | DateTime | Enquiry date (defaults to `now()`) |
| `lead_source_id` | Int? (FK → LeadSource) | Source master |
| `country_id` / `state_id` / `city_id` | Int? | Cascading address |
| `company_name` / `contact_name` | String? | Prospect identity |
| `mobile_number` / `email` | String? | Contact details |
| `requirement` | Text? | Free-text requirement |
| `lead_qualification` | String? | Qualification status label |
| `created_by_id` | Int? (FK → User, `"EnquiryCreator"`) | Who created the enquiry |
| `validated_by_id` | Int? (FK → User, `"EnquiryValidator"`) | Who validated it |
| `allocated_to_id` | Int? (FK → User, `"EnquiryAssignee"`) | UI label **"Lead Allocated To"** |
| `enquiry_allocated_to` | Int? (FK → User, `"EnquiryAllocatedTo"`) | UI label **"Enquiry Allocated To"** — a separate field from `allocated_to_id`, added later specifically to drive the Allocated Enquiry tab |
| `product_id` | Int? (FK → Product) | "Lead Category" |
| `service_department` | String? | `"EIT Services"` \| `"IM Services"` |
| `linkedin_status` | String? | LinkedIn profile connection status |
| `sales_stage_id` | Int? (FK → SalesStage) | Current stage |
| `remarks` | Text? | Free-text notes |
| `frequency` / `name` / `mktg_effectiveness` | String? | Additional marketing-context fields |
| `is_converted` | Boolean | Whether this enquiry has been converted |
| `converted_to` | String? | `"Lead"` \| `"CallTracker"` — which side the conversion went to |
| `converted_at` | DateTime? | Stamped once, never overwritten (see `[[lead-module]]`'s equivalent pattern) |
| `call_tracker_id` | Int? @unique (FK → CallTracker) | Set either when this enquiry was converted to a Call Tracker record, or when it was itself created from one |

`allocated_to_id` ("Lead Allocated To") and `enquiry_allocated_to`
("Enquiry Allocated To") are **two distinct fields with overlapping
purposes** — the former predates the latter and still drives lead-conversion
ownership (`[[lead-module]]`'s Enquiry Conversion section uses
`allocated_to_id`), while `enquiry_allocated_to` was added specifically to
back the "Allocated Enquiry" tab described below. When both are set they can
point at different users; don't assume they're kept in sync.

---

## API Endpoints

All routes are under `/api/enquiries` (`server/src/routes/enquiryRoutes.ts`)
and require `authenticate` only — **no `checkPrivilege` middleware and no
role-based query scoping** beyond the optional `view=allocated` filter (see
RBAC below).

### GET `/enquiries`
Returns enquiries matching the query filters, unpaginated.

| Param | Type | Description |
|---|---|---|
| `product_id` / `productId` | number | Filter by product |
| `isConverted` / `is_converted` | `'true'` | Restrict to converted enquiries (Converted Lead tab) |
| `view` | `'allocated'` | Restrict to `enquiry_allocated_to = current user` (Allocated Enquiry tab) |
| `search` | string | Matches company_name, contact_name, email, mobile_number, requirement (case-insensitive) |
| `startDate` / `endDate` | date | Range on `date` |
| `lead_source_id` | number | Source filter |
| `company_name` / `contact_name` | string | Partial match |
| `allocated_to_id` | number | Filter by "Lead Allocated To" |
| `sales_stage_id` | number | Stage filter |
| `lead_qualification` | string | Qualification filter |

### GET `/enquiries/:id`
Single enquiry with relations expanded.

### POST `/enquiries`
Creates an enquiry. If `is_converted` is sent as `true` on create, the
Enquiry→Lead or Enquiry→CallTracker conversion described in
`[[lead-module]]`/`[[call-tracker-module]]` fires immediately.

### PUT `/enquiries/:id`
Updates an enquiry. Conversion fires the moment `is_converted` transitions
`false → true` on this call (whether that's the first save with
`converted_to` set, or a later edit that flips the flag).

### DELETE `/enquiries/:id`
Deletes the enquiry record.

---

## RBAC — no server-side scoping beyond `view=allocated`

Unlike every other module documented so far, `getEnquiries` performs **no
role-based row scoping at all** except the explicit `view=allocated` filter.
There's no `SalesPerson`/`SalesManager`/`CEO` branch in the controller, and
no `checkPrivilege('Enquiry', ...)` on the routes.

In practice, the frontend keeps this contained: the product dropdown only
ever offers products the current user is mapped to
(`GET /api/seal/poas/mapped-products`), and the "All Enquiry" tab queries
with whatever `product_id` that dropdown yields — so a normal user, through
the UI, only ever sees enquiries for their own mapped products, not scoped
further by owner/team.

**This is a real gap, not a documentation simplification**: any authenticated
user who calls `GET /api/enquiries?product_id=X` directly with an arbitrary
`product_id` sees every enquiry for that product across the whole company,
regardless of role or team — there is no equivalent of `[[lead-module]]`'s
`lead_owner_id`-based scoping or `[[call-tracker-module]]`'s
`reporting_manager_id`-based scoping here. Flagging for whoever owns this
module to confirm whether that's intentional (enquiries are pre-qualification
and maybe meant to be visible company-wide within a product) or an oversight
that should mirror the Lead/Call Tracker RBAC pattern.

The only enforced per-user scoping is:
- **Allocated Enquiry tab** (`view=allocated`) — hard-filters to
  `enquiry_allocated_to = current user`, so this one tab genuinely shows only
  "mine."

---

## Frontend — Tabs (`client/src/pages/seal/EnquiryTracker.tsx`)

| Tab | `activeTab` value | Query params sent | Visibility |
|---|---|---|---|
| All Enquiry | `active` | `product_id` only | Every enquiry for the selected product, regardless of allocation or owner (see RBAC gap above) |
| Allocated Enquiry | `allocated` | `product_id`, `view=allocated` | Enquiries where `enquiry_allocated_to = current user` |
| Converted Lead | `converted` | `product_id`, `is_converted=true` | Converted enquiries for the selected product |

Additional client-side filters (BDE, date range, lead source, company name,
sales stage, lead qualification) layer on top of whichever tab is active,
all sent as query params to the same `GET /enquiries` endpoint.

### Product Selection
- Dropdown from `GET /api/seal/poas/mapped-products` — same RBAC-scoped
  source every other SEAL submodule uses.
- Restored from the `product_id` URL param on load, else auto-selects the
  first mapped product.
- Persisted via `usePersistentFilters('enquiry')`.

### BDE Filter (Admin / Manager only)
- Populated from `GET /api/seal/poas/mapped-bdes?productId=X`, scoped to the
  selected product.
- Sent as `allocated_to_id` (filters on "Lead Allocated To", not
  `enquiry_allocated_to`).

### Form Fields (`EnquiryForm.tsx`)
- **Lead Allocated To** (`allocated_to_id`) — existing field, renamed from
  the earlier generic "Allocated To" label.
- **Enquiry Allocated To** (`enquiry_allocated_to`) — newer field, positioned
  above the Sales Team section; defaults to empty/null; drives the Allocated
  Enquiry tab only.

---

## Conversion Behaviour

An enquiry converts one of two ways, chosen via `converted_to`:

- **`converted_to = "Lead"`** — see `[[lead-module]]`'s "Enquiry Conversion"
  section for the full field mapping. Ownership follows
  `Enquiry.allocated_to_id` ("Lead Allocated To").
- **`converted_to = "CallTracker"`** — see `[[call-tracker-module]]`'s
  `createCallTrackerFromEnquiry()`. Ownership falls back through
  `allocated_to_id` → `enquiry_allocated_to` → the triggering user. Failure
  here is swallowed — an Enquiry save never fails because the linked Call
  Tracker creation failed.

Both directions stamp `converted_at` once and never overwrite it, and both
link back via `Enquiry.call_tracker_id` when the CallTracker side is
involved.

---

## Related

- `[[lead-module]]` — the Enquiry → Lead conversion mapping and RBAC pattern
  this module's gap is measured against.
- `[[call-tracker-module]]` — both directions of Enquiry ⇄ CallTracker
  conversion.
- `[[seal-dashboard-module]]`, `[[poas-module]]` — shared `mapped-products`/`mapped-bdes` lookups.
