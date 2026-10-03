# Partner Sign-up Module

## Overview
The Partner Sign-up module manages the full lifecycle of channel partner onboarding — from initial enquiry interest through quadrant progression, engagement milestones, and lead conversion. It tracks partner companies, their assigned BDE, quadrant placement, lead score, and key milestone flags.

---

## Location
- **List page:** `client/src/pages/seal/PartnerSignup.tsx`
- **Form:** `client/src/pages/seal/PartnerForm.tsx`
- **Backend:** `server/src/controllers/partnerController.ts`
- **API routes:** `GET/POST/PUT/DELETE /api/seal/partners`

---

## Key Features

### Product Selection
- Dropdown populated from `GET /api/seal/poas/mapped-products` (RBAC-filtered).
- Auto-selects first mapped product on load.
- Selection persisted via `usePersistentFilters('partners')`.

### BDE Filter (Admin / Manager only)
- Appears after product is selected.
- Scoped to BDEs with active targets on the selected product.
- Auto-defaults to the logged-in user's ID on every page open.

### Advanced Filters (client-side)
Applied in-memory on the fetched partner list:
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

### Quadrant Legend (table footer)
- Q4 = Hot (red)
- Q3 = Warm (orange)
- Q2 = Progressing (blue)
- Q1 = Interested (gray)

### Quick View Modal
Slide-over modal showing detailed partner info in three sections:
1. **Engagement Lifecycle** — enquiry date, quadrant date, age of enquiry, age in quadrant
2. **Performance & Scoring** — quadrant badge, lead score, partner type, active leads
3. **Milestone Status** — boolean flags: RFI received, BP submitted, BP target agreed (+ value), training provided, monthly engagement started
4. **Partner Action PoA** — free-text plan of action

From the modal, users can navigate directly to the edit form.

### Actions
- **New Partner** — navigates to `PartnerForm` at `/partner-signup/new?product_id=X&context_name=Y`
- **Edit** — navigates to `/partner-signup/:id/edit`
- **Delete** — CEO/Admin only; calls `DELETE /api/seal/partners/:id` with window confirmation

---

## RBAC
| Role | Behaviour |
|---|---|
| CEO / Admin | Delete button visible; all BDEs visible |
| SalesManager | BDE filter visible; no delete button |
| SalesPerson | No BDE filter; sees only own partners |

---

## API Contract

### `GET /api/seal/partners?product_id=X`
Returns all partners for the selected product, scoped by RBAC. Response includes:
- Partner fields: `name`, `partner_company`, `region`, `quadrant`, `current_lead_score`, `enquiry_interest_date`, `active_leads_moved_to_quadrant`
- Milestone booleans: `is_rfi_received`, `is_business_plan_submitted`, `is_business_plan_target_agreed`, `is_training_provided`, `is_monthly_engagement_started`
- Relation: `user { first_name, last_name }`

### `DELETE /api/seal/partners/:id`
Deletes partner record. Restricted to CEO/Admin roles.

---

## Navigation
- Route: `/partner-signup`
- New partner form: `/partner-signup/new`
- Edit form: `/partner-signup/:id/edit`
