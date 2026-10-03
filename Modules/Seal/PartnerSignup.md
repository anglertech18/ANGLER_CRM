# Partner Sign-up Module

Feature reference document for the Partner Sign-up submodule (part of the
SEAL module group — see `[[seal-dashboard-module]]`).

---

## Overview

The Partner Sign-up module manages the full lifecycle of channel partner
onboarding — from initial enquiry interest through quadrant progression,
engagement milestones, and lead conversion. It tracks partner companies,
their assigned BDE (owner), quadrant placement, lead score, and a fixed set
of milestone flags (RFI received, business plan submitted/agreed, training
provided, monthly engagement started).

Unlike `[[lead-module]]`, a partner's quadrant is **not** auto-calculated —
`quadrant` and `current_lead_score` are plain form fields set by whoever
edits the record. There is no scoring formula, cron degradation, or
quadrant-history audit trail for partners.

---

## Location

| Layer | Path |
|---|---|
| List page | `client/src/pages/seal/PartnerSignup.tsx` |
| Form | `client/src/pages/seal/PartnerForm.tsx` |
| Quick-view modal | `client/src/components/PartnerModal.tsx` |
| Backend controller | `server/src/controllers/partnerController.ts` |
| Routes | `server/src/routes/sealRoutes.ts` (mounted under `/api/seal`) |

---

## Database Model

**Table:** `Partner` (Prisma, `server/prisma/schema.prisma`)

| Field | Type | Description |
|---|---|---|
| `id` | Int (PK) | Auto-incremented primary key |
| `user_id` | Int (FK → User) | Owning BDE — `relation("UserPartners")` |
| `reg_date` | DateTime | Registration date (defaults to `now()`) |
| `partner_company` | String? | Partner's company name |
| `name` | String | Partner contact name (required) |
| `region` | String? | City/region |
| `enquiry_interest_date` | DateTime? | When interest was first logged — basis for "Age of Enquiry" |
| `quadrant_allotted_date` | DateTime? | When the current quadrant was assigned — basis for "Age in Quadrant" |
| `current_lead_score` | Int? | Manually entered score (no formula) |
| `quadrant` | String? | `Q1`–`Q4` (defaults to `Q1` on create) |
| `partner_type` | String? | Partner classification |
| `current_end_client_opportunity` | String? | Free text/flag (defaults to `"No"`) |
| `source_id` | Int? (FK → LeadSource) | Lead source master |
| `product_id` | Int? (FK → Product) | `relation("PartnerProduct")` |
| `is_rfi_received` | Boolean | Milestone flag |
| `is_business_plan_submitted` | Boolean | Milestone flag |
| `is_business_plan_target_agreed` | Boolean | Milestone flag |
| `business_plan_target_value` | Int? | Agreed BP target value |
| `is_training_provided` | Boolean | Milestone flag |
| `is_monthly_engagement_started` | Boolean | Milestone flag |
| `partner_action_poa` | Text? | Free-text plan of action |
| `edc` | DateTime? | Expected date of completion for the current action |
| `active_leads_moved_to_quadrant` | Int? | Count of leads this partner has moved into the pipeline |
| `status` | String | `Active` / `Inactive` / `Pending` (default `Active`) |
| `signed_date` | Date? | Partner agreement signed date |
| `created_at` / `updated_at` | DateTime | Audit timestamps |

No dedicated history table exists for partners — quadrant/milestone changes
overwrite in place (contrast with `Lead`'s `LeadQuadrantHistory`/`LeadScore`).

---

## API Endpoints

All routes are under `/api/seal/partners` and require `authenticate` only —
**there is no `checkPrivilege('...')` middleware on this route group**; access
is gated purely by the role checks written inline in each controller
function (see RBAC below).

### GET `/api/seal/partners?product_id=X`
Returns all partners for the selected product, scoped by role. Response
includes partner fields, milestone booleans, and `user { id, first_name, last_name }`
and `lead_source` relations.

### GET `/api/seal/partners/:id`
Returns a single partner with `user` and `lead_source` included. A
`SalesPerson` gets `403` if the partner isn't their own (`user_id`).

### POST `/api/seal/partners`
Creates a partner. `name` is required (400 if missing).

**Ownership on create:**
- Default owner is the creating user (`authUser.id`).
- `CEO`/`ADMIN` can set any `user_id`.
- `SalesManager` can only set `user_id` to themselves or a direct report
  (`reporting_manager_id === authUser.id`); otherwise falls back to
  themselves rather than erroring.

### PUT `/api/seal/partners/:id`
Updates a partner.
- `SalesPerson` gets `403` unless it's their own partner.
- `SalesManager` gets `403` unless it's their own or a direct report's
  partner.
- Reassigning `user_id`: `CEO`/`ADMIN` can reassign to anyone; `SalesManager`
  can only reassign to themselves or a direct report — **returns `403`** (not
  a silent fallback) if they try to reassign outside their team.

### DELETE `/api/seal/partners/:id`
Deletes the partner record. Restricted to `CEO`/`ADMIN` — every other role
gets `403`.

---

## Role-Based Access Control (RBAC)

| Role | List scope (`GET /partners`) | Can edit | Can delete |
|---|---|---|---|
| `SalesPerson` | Own partners only (`user_id = self`) | Own only | No |
| `SalesManager` | Own + direct reports' partners | Own + direct reports' | No |
| `CEO` / `ADMIN` | All partners | All | Yes |

The list-scope filter and the edit/delete permission checks are two separate
pieces of logic in `partnerController.ts` — both must be read together, since
a query-string RBAC gap in one wouldn't be caught by the other.

---

## Frontend Behaviour

### Product Selection
- Dropdown populated from `GET /api/seal/poas/mapped-products` (RBAC-filtered, shared with `[[poas-module]]`).
- Auto-selects the first mapped product on load.
- Selection persisted via `usePersistentFilters('partners')`.

### BDE Filter (Admin / Manager only)
- Appears once a product is selected.
- Scoped to BDEs with active targets on the selected product.
- Auto-defaults to the logged-in user's ID on every page open.

### Advanced Filters (client-side, applied in-memory on the fetched list)
- Global search (name, partner company, region)
- Quadrant filter (Q1 / Q2 / Q3 / Q4)
- Partner company name (free-text)
- Partner name (free-text)
- Date range on `enquiry_interest_date`

### Table Columns

| Column | Description |
|---|---|
| # | Row index |
| Executive | BDE avatar + name |
| Partner Company | Company name with briefcase icon |
| Partner Name | Contact name, highlighted in primary colour |
| Region | City/region with map pin icon |
| Quadrant | Badge coloured by quadrant (Q4=red, Q3=orange, Q2=blue, Q1=gray) |
| Lead Score | Numeric score with trending-up icon |
| Age of Enquiry | Days since `enquiry_interest_date` |
| Active Leads | `active_leads_moved_to_quadrant` count |
| Actions | View (quick modal) / Edit / Delete |

### Quick View Modal (`PartnerModal.tsx`)
Slide-over showing detailed partner info in four sections:
1. **Engagement Lifecycle** — enquiry date, quadrant date, age of enquiry, age in quadrant
2. **Performance & Scoring** — quadrant badge, lead score, partner type, active leads
3. **Milestone Status** — the five boolean flags (RFI received, BP submitted, BP target agreed + value, training provided, monthly engagement started)
4. **Partner Action PoA** — free-text plan of action

From the modal, users can navigate directly to the edit form.

### Actions
- **New Partner** — navigates to `PartnerForm` at `/partner-signup/new?product_id=X&context_name=Y`
- **Edit** — navigates to `/partner-signup/:id/edit`
- **Delete** — CEO/Admin only; calls `DELETE /api/seal/partners/:id` with a window confirmation

---

## Navigation

| Route | Purpose |
|---|---|
| `/partner-signup` | List page |
| `/partner-signup/new` | New partner form |
| `/partner-signup/:id/edit` | Edit form |

---

## Technical Notes

- `quadrant` and `current_lead_score` are **manually entered**, not computed
  — do not assume Lead-module quadrant logic (`[[lead-module]]`'s
  `calculateQuadrant()`) applies here.
- The route group has no `checkPrivilege` middleware; if a future change adds
  one, verify it doesn't conflict with the inline role checks already
  enforcing ownership/reassignment rules in the controller.
- `SalesManager` create-time reassignment silently falls back to themselves
  on an invalid `user_id`, while update-time reassignment explicitly `403`s
  — an intentional asymmetry in the current controller, not a bug to "fix"
  without checking with whoever owns this module.
- `signed_date` is stored as `@db.Date` (no time component) while most other
  date fields on `Partner` are full `DateTime`.
