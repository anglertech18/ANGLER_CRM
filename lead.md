# Lead Module

Feature reference document for the Lead module in the Angler CRM.

---

## Overview

The Lead module is the core sales pipeline management system. It captures, qualifies, and tracks prospects from initial entry through to order closure. Every lead is scored across 14 criteria (max 28 points), placed in a quadrant (Q1–Q4 or Nurturing), and progresses through a structured BANT-based qualification process.

Leads can be created manually, converted from Enquiries, or generated from the Call Tracker. Once a lead reaches "Order Won" sales stage it is permanently frozen — no edits are allowed.

---

## Database Model

**Table:** `Lead` (Prisma)

### Ownership & Assignment

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int (PK) | Auto-incremented primary key |
| `created_by_id` | Int (FK → User) | User who created the lead (audit) |
| `lead_owner_id` | Int (FK → User) | Assigned salesperson/owner |
| `sales_sbu_id` | Int (FK → SBU) | Strategic Business Unit |
| `company_id` | Int (FK → Company) | Master company reference |

### Contact Information

| Field | Type | Description |
|-------|------|-------------|
| `salutation` | Enum | Mr, Mrs, Ms, Dr |
| `first_name` | String | Contact first name |
| `last_name` | String | Contact last name |
| `job_title_id` | Int (FK → JobTitle) | Job title — can be created on-the-fly |
| `avatar_id` | Int (FK → Avatar) | Persona visual avatar |
| `email` | String | Primary email |
| `mobile_number` | String | Primary mobile |
| `whatsapp_number` | String | WhatsApp contact |
| `company_name` | String | Lead company name (denormalized) |

### Address

| Field | Type | Description |
|-------|------|-------------|
| `address` | Text | Street address |
| `country_id` | Int (FK → Country) | Country (cascades to state/city) |
| `state_id` | Int (FK → State) | State (filtered by country) |
| `city_id` | Int (FK → City) | City (filtered by state) |
| `pin_code` | String | Postal code |
| `annual_turnover` | Decimal | Company annual turnover |
| `website` | String | Company website URL |
| `other_info` | Text | Additional company information |

### Product / Service Context

| Field | Type | Description |
|-------|------|-------------|
| `product_or_service` | String | `"Product"`, `"EitService"`, or `"ImService"` |
| `product_id` | Int (FK → Product) | Set when `product_or_service = "Product"` |
| `eit_service_id` | Int (FK → EitService) | Set when `product_or_service = "EitService"` |
| `im_service_id` | Int (FK → ImService) | Set when `product_or_service = "ImService"` |
| `persona_id` | Int (FK → Persona) | Customer persona |
| `where_find_them_id` | Int (FK → LeadSource) | Where the lead was sourced from |
| `lead_source_id` | Int (FK → LeadSource) | Lead source master |
| `industry_id` | Int (FK → Industry) | Industry classification |
| `telecalling_qualified` | Boolean | Passed telecalling qualification |

### Qualification & Sizing

| Field | Type | Description |
|-------|------|-------------|
| `device_count` | String | Number of devices/units |
| `employee_count` | String | Total employee count |
| `vendor_count` | String | Vendor count |
| `branch_unit` | String | Branch or unit count |
| `license_count` | String | License/user count |
| `custom_count_type` | String | Custom count type label |
| `requirement_desc` | Text | Detailed requirement description |
| `pain_points` | Text | Identified pain points |
| `pain_points_files` | Text | JSON array of attachment file paths |
| `demo_completed` | Boolean | Demo has been conducted |
| `pilot_provided` | Boolean | Pilot has been provided |

### Demo, Pilot & Authority Engagement

| Field | Type | Description |
|-------|------|-------------|
| `demo_done_authority` | Boolean | Demo conducted with decision maker |
| `post_demo_feedback_sent` | Boolean | Post-demo feedback sent to client |
| `post_demo_feedback_received` | Boolean | Feedback received from client |
| `post_demo_feedback_file` | String | Feedback document file path |
| `probing_discussion_authority` | Boolean | Probing discussion held with authority |
| `direct_visit_authority` | Boolean | Direct visit made to authority |
| `pilot_given` | Boolean | Pilot license/version provided |
| `mgmt_call_completed` | Boolean | Management call done post-demo/pilot |
| `utilized_mgmt_urgency` | Boolean | Management leveraged for urgency |
| `utilized_presales_timeline` | Boolean | Presales leveraged for timeline |
| `authority_champion_influencer_identified` | Boolean | Key stakeholders identified |
| `competitor_details` | Text | Competitor analysis notes |
| `opportunities_values` | Decimal | Estimated opportunity value |
| `order_won_attachment` | String | Order document path (Order Won only) |
| `order_value` | Decimal | Confirmed order value |
| `sales_device` | Int | Device count at order (Order Won only) |

### BANT Qualification

| Field | Type | Description |
|-------|------|-------------|
| `budget_yes_no` | Boolean | Budget confirmed |
| `budget_allocated` | String | Budget details or amount |
| `approval_stage` | String | Current approval stage |
| `authority_yes_no` | Boolean | Decision maker identified |
| `decision_maker` | String | Decision maker name/details |
| `need_yes_no` | Boolean | Need clearly established |
| `pain_points_desc` | Text | Need details and pain points |
| `timeline_yes_no` | Boolean | Timeline defined |
| `expected_closure_date` | DateTime | Expected closure date |

### Quadrant Management

| Field | Type | Description |
|-------|------|-------------|
| `quadrant` | String | Current quadrant: `Q1`, `Q2`, `Q3`, `Q4`, `Nurturing` |
| `quadrant_updated_at` | DateTime | Timestamp of last quadrant change |
| `quadrant_start_date` | DateTime | When lead entered the current quadrant |
| `last_positive_movement_at` | DateTime | Last upward quadrant movement |

### Follow-up & Activity

| Field | Type | Description |
|-------|------|-------------|
| `follow_up_activity_id` | Int (FK → Activity) | Current follow-up activity type |
| `follow_up_datetime` | DateTime | Scheduled follow-up date/time |
| `sales_stage_id` | Int (FK → SalesStage) | Current sales stage |
| `next_activity_id` | Int (FK → Activity) | Next planned activity type |
| `next_activity_datetime` | DateTime | Next activity date/time |

### Farming & Audit

| Field | Type | Description |
|-------|------|-------------|
| `is_farming` | Boolean | Lead is in farming/nurturing pipeline |
| `farming_moved_at` | DateTime | Timestamp when farming was activated |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

---

## Lead Scoring System

Leads are scored across **14 criteria**, each rated **0, 1, or 2** (max score = 28). The score automatically determines the quadrant.

### A. Organisation Needs (max 10)

| Criterion | Field | Description |
|-----------|-------|-------------|
| Reduce Cost | `reduce_cost_score` | Headcount / maintenance / time savings |
| Efficiency | `efficiency_score` | Response time / service improvements |
| Automation | `automation_score` | Manual activity automation / brand upgrade |
| Compliance | `compliance_score` | Mandatory certifications / loan requirements |
| Others | `others_score` | Custom/dynamic need (label in `others_score_label`) |

### B. BANT / Critical Qualification (max 8)

| Criterion | Field | Description |
|-----------|-------|-------------|
| Established Need | `established_need_score` | Client clearly recognises the need |
| Urgency | `urgency_score` | Defined timelines in place |
| Budget Allocated | `budget_allocated_score` | Budget is confirmed and allocated |
| Decision Maker | `decision_maker_score` | Responsible decision maker is identified |

### C. Other Key Information (max 6)

| Criterion | Field | Description |
|-----------|-------|-------------|
| Competition | `competition_score` | No competition = 2, competition present = 0 |
| Champion | `champion_score` | Internal champion identified within org/group |
| Influencer | `influencer_score` | Internal or external influencer engaged |

### D. Lead Source Details (max 4)

| Criterion | Field | Description |
|-----------|-------|-------------|
| Lead Source Quality | `lead_source_quality` | Quality/reliability of the source |
| Decision Contact | `decision_contact_score` | Quality of decision maker contact |

### Calculated Fields

| Field | Description |
|-------|-------------|
| `lead_score` | Auto-sum of all 14 criteria (0–28) |
| `cp_score` | Customer Potential score (0–10, manually entered) |

Score is automatically recalculated on every create and update. A `LeadScore` history record is created each time the score changes.

---

## Quadrant Logic

### Quadrant Values

| Quadrant | Meaning | Criteria |
|----------|---------|----------|
| **Q1** | Interested — Early Stage | Score < 10, all BANT = No |
| **Q2** | Progressing — Nurturing Needed | Score 11–20, Need=Yes, Timeline=Yes (Budget/Authority=No) |
| **Q3** | Warm — High Potential | Score 11–20, Budget=Yes, Authority=Yes, Need=Yes, Timeline=No |
| **Q4** | Hot — Ready to Close | Score > 20, all BANT = Yes |
| **Nurturing** | Default / Fallback | Leads that don't meet Q1–Q4 criteria |

### Auto-Calculation

Quadrant is **automatically calculated** by `calculateQuadrant()` in `server/src/utils/leadScoring.ts` on every create and update. Manual override is possible via `quadrant_manual` parameter — if provided, the manual value is used and logged as a `MANUAL` movement.

### Quadrant History

Every quadrant change (auto or manual) is recorded in `LeadQuadrantHistory`:

| Field | Description |
|-------|-------------|
| `old_quadrant` | Previous quadrant |
| `new_quadrant` | New quadrant |
| `movement_type` | `AUTO` (system-calculated) or `MANUAL` (user override) |
| `moved_at` | Timestamp of movement |
| `user_id` | User who triggered the change (null if auto) |

When quadrant changes:
- `quadrant_start_date` resets to current time
- `quadrant_updated_at` is stamped
- `last_positive_movement_at` updates if the movement is upward (Q1→Q2→Q3→Q4)

---

## Frozen Lead Rules (Order Won)

When a lead's `sales_stage.name === 'Order Won'`, it enters a **permanently frozen** state:

- ❌ Cannot edit any field (backend returns `403 Forbidden`)
- ❌ Cannot update score
- ❌ Cannot add documents
- ❌ Cannot add pricing negotiation logs
- ❌ Cannot change farming status
- ✅ All tabs and data are fully visible (read-only)
- The Edit button in the UI changes to "View / Review"

---

## API Endpoints

All routes are under `/api/leads` and require a valid JWT + privilege check.

### GET `/leads`
Returns a paginated list of leads with RBAC applied.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search: first_name, last_name, company_name, email |
| `quadrant` | string | Filter by Q1 / Q2 / Q3 / Q4 / Nurturing |
| `company_name` | string | Partial match on company name |
| `product_or_service` | string | Filter by type: Product, EitService, ImService |
| `product_id` | number | Filter by specific product |
| `eit_service_id` | number | Filter by EIT service |
| `im_service_id` | number | Filter by IM service |
| `ownerId` | number | Filter by lead owner user ID |
| `startDate` | date | Lead created on or after |
| `endDate` | date | Lead created on or before |
| `minValue` | number | Minimum order value |
| `maxValue` | number | Maximum order value |
| `page` | number | Page number (default: 1) |
| `limit` | number | Records per page (default: 10) |
| `sortBy` | string | Sort field |
| `sortOrder` | string | `asc` or `desc` |

**Includes:** company_master, owner, contacts, documents, calls, score_history, quadrant_history, sbu, pricing_negotiations, follow_up_logs (latest only)

### GET `/leads/:id`
Returns a single lead with all relations fully expanded.

### POST `/leads`
Creates a new lead. Supports multipart form-data for file uploads.

**Key behaviours on create:**
- `lead_owner_id` defaults to `created_by_id` if not provided
- Company and JobTitle records are auto-created if a text name is sent instead of an ID
- `lead_score` and `quadrant` are calculated automatically
- `LeadContact` records are created if a contacts array is included
- Initial `FollowUpLog` is created if follow-up fields are set
- File uploads (pain_points_files, order_won_attachment, post_demo_feedback_file) are stored under `/uploads/`

### PUT `/leads/:id`
Updates a lead. Blocked with `403` if sales stage is "Order Won".

**Key behaviours on update:**
- Score and quadrant are recalculated
- Quadrant movements are logged automatically (AUTO or MANUAL)
- `quadrant_start_date` resets when quadrant changes
- `LeadContact` records are replaced if a contacts array is included
- A new `FollowUpLog` is created if activity or datetime changes

### DELETE `/leads/:id`
Hard-deletes a lead and all child records in a cascading transaction:
1. LeadContact → 2. LeadDocument → 3. CallLog → 4. LeadScore → 5. LeadQuadrantHistory → 6. PricingNegotiationLog → 7. FollowUpLog → 8. Lead

### POST `/leads/:id/documents`
Uploads a document and creates a `LeadDocument` record. Locked if Order Won.

### PUT `/leads/:id/score`
Updates all 14 scoring criteria, recalculates total and quadrant, creates a `LeadScore` history record.

### POST `/leads/:id/pricing-negotiations`
Appends an entry to the pricing negotiation log. Append-only — no edits. Locked if Order Won.

### GET `/leads/search-company?q=<query>`
Returns matching companies with their latest lead details for auto-fill.

---

## Role-Based Access Control (RBAC)

| Role | Visible Leads |
|------|--------------|
| `SalesPerson` | Only their own leads (as `lead_owner_id` OR `created_by_id`) |
| `SalesManager` | Leads from their assigned SBU **or** leads they own directly |
| `CEO` | All leads — no filter applied |

RBAC is enforced server-side in `getLeads()`. It cannot be bypassed via query params.

Privilege checks (`can_add`, `can_view`, `can_edit`, `can_delete`) are enforced on every route via the `checkPrivilege('Leads', ...)` middleware.

---

## Lead Creation Sources

### 1. Manual Creation (LeadForm)
User fills in the full form at `/leads/new`. All fields available.

### 2. Enquiry Conversion
When an `Enquiry.is_converted` transitions `false → true` (on create or update), the server automatically creates a Lead:

```
Enquiry.contact_name      →  Lead.first_name + last_name (split on first space)
Enquiry.company_name      →  Lead.company_name
Enquiry.mobile_number     →  Lead.mobile_number
Enquiry.email             →  Lead.email
Enquiry.requirement       →  Lead.requirement_desc
Enquiry.allocated_to_id   →  Lead.lead_owner_id
Enquiry.lead_source_id    →  Lead.lead_source_id + Lead.where_find_them_id
Enquiry.country_id        →  Lead.country_id
Enquiry.state_id          →  Lead.state_id
Enquiry.city_id           →  Lead.city_id
Enquiry.sales_stage_id    →  Lead.sales_stage_id
Enquiry.product_id        →  Lead.product_id
Enquiry.service_department →  Lead.product_or_service ("EitService" / "ImService")
```

Lead ownership (`lead_owner_id`) follows `Enquiry.allocated_to_id` — the person the enquiry was assigned to becomes the lead owner.

### 3. Call Tracker Conversion
A `CallTracker` record with `is_converted = true` creates a Lead via the same mapping. Lead is linked back via `call_tracker_id`.

---

## Expected User Flow

```
1. User opens Leads page (/leads)
   │
   ▼
2. Paginated list loads — scoped by RBAC
   Filters: quadrant, product/service, owner, date range, value range, search
   │
   ▼ (Click "Add Lead")
3. Navigate to /leads/new
   Form: contact → company → product/service → requirements
         → pain points → BANT → demo/pilot → score → contacts → documents
         → follow-up activity → sales stage
   │
   ▼ (Submit form)
4. POST /leads — lead created, score + quadrant calculated automatically
   React Query invalidates ['leads'] → list refreshes
   │
   ▼ (Click lead row)
5. Navigate to /leads/:id (LeadDetail)
   5 tabs: Overview · Qualification · Activities · Documents · Contacts
   │
   ▼ (Ongoing updates)
6. Update qualification fields → score recalculates → quadrant may change
   Log activities → FollowUpLog created
   Add pricing negotiations → appended to log
   Upload documents → stored in /uploads/
   │
   ▼ (On closure)
7. Set sales stage = "Order Won" → lead freezes permanently
   Enter order_value and sales_device
   Upload order_won_attachment
```

---

## Frontend Files

| File | Purpose |
|------|---------|
| `client/src/pages/Leads.tsx` | Sales pipeline list — table view with filters, inline quadrant edit, score modal, actions |
| `client/src/pages/LeadDetail.tsx` | Full detail view — 5 tabs (Overview, Qualification, Activities, Documents, Contacts) |
| `client/src/pages/LeadForm.tsx` | Create / Edit form — all sections, file uploads, multi-contact |
| `client/src/components/LeadScoreCard.tsx` | Reusable 14-criterion score card — read-only and editable modes |

---

## Leads List — Table Columns

| Column | Content |
|--------|---------|
| Account Manager | Avatar + owner name |
| Company / Contact | Company name, contact name, location |
| Type / Value | Product/service type, opp value, lead score, CP score, lead age |
| Source | Lead source badge |
| Quadrant | Current quadrant badge + days in quadrant |
| BANT | B / A / N / T indicator chips |
| Next Activity | Next activity type + datetime |
| Follow-up | Scheduled follow-up date/time |
| Actions | View, Edit, Delete, Add Opportunity, Log Call |

---

## LeadDetail — Tab Structure

### Tab 1: Overview
- Lead owner, creator, SBU
- Contact information section
- Company information section (address, industry, website, turnover)
- Opportunity details: product/service, requirements, pain points, attachments, demo/pilot status, collaterals

### Tab 2: Qualification
- BANT grid (Budget, Authority, Need, Timeline — each with Yes/No and details)
- Demo, Pilot & Authority Engagement checklist (10 boolean items)
- Score Card (4 collapsible sections, editable inline, shows per-section progress bars)

### Tab 3: Activities
- Sales Stage banner (stage name, next activity, order value/device count if won)
- Pricing Negotiation Log (add new entry — append only)
- Sales Engagement & Activity Log (reverse-chronological timeline of all FollowUpLog records + creation event)

### Tab 4: Documents
- Pain point attachments
- Proposals & Estimations (upload/download)
- Add new document (disabled if Order Won)

### Tab 5: Contacts
- Primary contact (from lead's own fields)
- Additional contacts (LeadContact records — name, designation, email, mobile)

---

## Related Models

### LeadContact
Multiple secondary contacts per lead. Fields: name, designation, email, mobile, whatsapp, avatar_id, persona_id.

### LeadDocument
Uploaded files attached to a lead. Linked optionally to a FollowUpLog entry.

### FollowUpLog
Chronological activity log. Auto-created whenever follow-up activity or datetime changes on save. Fields: activity_id, sales_stage_id, next_activity_id, date, notes, created_by. Never deleted — permanent audit trail.

### LeadScore (History)
Audit trail of every score change. Stores the full breakdown as JSON. Created by `PUT /leads/:id/score`.

### LeadQuadrantHistory
Audit trail of every quadrant movement. Movement type is `AUTO` (system-calculated) or `MANUAL` (user override). Used for reporting on pipeline velocity.

### PricingNegotiationLog
Append-only log of pricing discussions. Fields: details, date, created_by. Shown in the Activities tab.

### CallTracker
One-to-one optional relation. A CallTracker linked to a lead means the lead originated from or is tracked via the call tracker pipeline.

---

## Auto-Calculated Behaviours Summary

| Field | Trigger | Logic |
|-------|---------|-------|
| `lead_score` | Create, Update, Score change | Sum of all 14 criteria (0–28) |
| `quadrant` | Create, Update, Score change | `calculateQuadrant()` based on score + BANT flags |
| `quadrant_start_date` | Quadrant changes | Reset to `now()` |
| `quadrant_updated_at` | Quadrant changes | Stamp `now()` |
| `last_positive_movement_at` | Upward quadrant movement | Stamp `now()` |
| `farming_moved_at` | `is_farming` changes to `true` | Stamp `now()` |
| `converted_at` (Enquiry) | `is_converted` becomes `true` | Stamp `now()` — never overwritten |
| `lead_owner_id` | On create (if not provided) | Defaults to `created_by_id` |

---

## Technical Notes

- Quadrant is **computed**, never manually assigned unless `quadrant_manual` is explicitly sent
- Leads **freeze permanently** when `sales_stage.name === 'Order Won'` — enforced at both backend (403) and frontend (UI locks)
- Score uses **14 criteria (0–28)**, not a 0–10 scale
- Enquiry → Lead conversion is **one-way** — no reverse mapping exists
- File uploads are stored under `/uploads/` and referenced by path string in the DB
- `FollowUpLog` records are **never deleted** — they form a permanent activity history
- `LeadQuadrantHistory` is **never deleted** — used for pipeline velocity reporting
- Country → State → City is a **cascading dropdown** (state filtered by country, city filtered by state)
- `company_name` is denormalized on the lead itself; `company_master.name` is used as fallback for display
