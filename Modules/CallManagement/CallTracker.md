# Call Tracker Module

## 1. Purpose

The Call Tracker is a sub-module of the Calls module (`Calls.tsx` tabs: "Call Tracker" / "KRA Tracker" / "SWAT Meeting"). It is used to log outbound/inbound sales prospecting calls and track prospect engagement (email/LinkedIn outreach, call outcome, follow-ups), with the ability to graduate a call record into the Lead pipeline (Quadrant / Nurturing) or into the Enquiry tracker — and vice versa, an Enquiry can be converted back into a Call Tracker record.

**Do not confuse with "Call Log"** (`callController.ts` / `callRoutes.ts`, `CallLog` model) — that is a separate feature for logging actual phone calls against an existing Lead for BANT/KRA tracking. Both controllers happen to export a function named `getCalls`, but they operate on different tables and routes.

Rows that arrive via bulk upload but lack a resolvable Call Status don't land
here directly — they're held in staging and reviewed through the companion
`[[db-upload-module]]` before becoming Call Tracker records.

## 2. Frontend

| File | Role |
|---|---|
| `client/src/pages/Calls.tsx` | Tabbed container (Call Tracker / KRA Tracker / SWAT Meeting), persists active tab via `usePersistentFilters('calls_tab', …)` |
| `client/src/pages/CallTrackerPage.tsx` | Thin standalone wrapper around `CallTracker` |
| `client/src/pages/calls/CallTracker.tsx` | Paginated list/grid view with filters and row actions |
| `client/src/pages/calls/CallTrackerForm.tsx` | Create / Edit / Follow-Up form |
| `client/src/pages/calls/CallTrackerView.tsx` | Read-only detail view |
| `client/src/pages/calls/BulkUploads.tsx` | Staged bulk-upload review/claim UI — see `[[db-upload-module]]` |

### List view
- Columns: S.No, Enquiry Date, Created (+ creator), Company/Contact Person (+ Product badge, location, email/mobile), Industry, Source DB, Business Potential, Email/LinkedIn/Call Status, Remarks/Next Follow-up (+ "Move to {pipeline_action}" badge), Actions.
- Filters: date range (`dateFrom`/`dateTo`), Next Follow-up window (`nextFollowUpFrom`/`nextFollowUpTo` — how the dashboard's "This Week's Call Activities" card links in, see `[[dashboard-module]]`), "Not in Pipeline" checkbox (`notMovedToPipeline=1` → `pipeline_action IS NULL`), Product, Industry, Call Status, company search, and (CEO/Sales Manager only) an Owner multi-select (`salespersonId`, supports an explicit "All Users" option). Sales Person has no Owner filter and is implicitly scoped to their own records.
- Filters persisted via `usePersistentFilters('calltracker', …)`.
- Row actions (kebab menu): View, Edit, Follow Up (`/calls/:id/update`), Delete. Delete is replaced with an "In Pipeline" badge once `is_converted` is true.
- "Add Call Entry" → `/calls/new`.

### Form
- **New** (no id): `POST /call-tracker`
- **Edit** (id, not `/update`): `PUT /call-tracker/:id`
- **Update/Follow-Up** (`/update` path): also `PUT /call-tracker/:id`, labeled "Call Update" / "Save as New Record" — same mutation as Edit, just different UI framing.
- Sections:
  - **Classification** — Call Date, Product (restricted to the user's mapped products via `/users/:id/targets`; new entries auto-select the user's first mapped product), Industry, Lead Source, Source of Database.
  - **Company & Contact Details** — Company Name is the only required field; Location, Contact Person Name, Designation, Company Email, Personal Email, Mobile No.
  - **Engagement & Outcome** — Business Potential, Email Status, LinkedIn Sent toggle, Call Status, Remarks, Next Follow-up Date, Follow Up Status, Follow Up Note, "Move to Pipeline" dropdown.
- Next Follow-up Date: `min` is tomorrow. Marked required visually (amber label + asterisk) when Call Status = "Follow Up Required", but **not actually enforced** in `validateForm()` — cosmetic only; `validateForm()` checks `company_name` and `product_id`.
- Follow Up Status: dropdown (`Pending` default / `InProgress` shown as "In Progress" / `Closed`), sits next to Next Follow-up Date. Follow Up Note: free-text textarea for what the next follow-up is about — both independent of `remarks` (the call summary) and `pipeline_action`.
- Product is a required field (`validateForm()` + backend `createCall`/`updateCall` both reject a missing `product_id` with a 400).
- "Move to Pipeline" values: `Quadrant`, `Nurturing`, `Enquiry`, or blank.
- On success: invalidates `call-tracker`/`leads`/`enquiries` query caches, shows a toast specific to the chosen pipeline action, navigates to `/call-management/tracker`.

### View
- Read-only, shows classification/contact/engagement/follow-up fields plus status badges (Call Status, "Move to {pipeline_action}", LinkedIn Sent, "Converted to Lead"). Edit button → `/calls/:id/edit`.

## 3. API Endpoints

All routes require `authenticate` + `checkPrivilege('Calls', <action>)`. CEO bypasses all privilege checks.

**`server/src/routes/callTrackerRoutes.ts`** (base `/call-tracker`):

| Method | Path | Controller fn | Privilege | Purpose |
|---|---|---|---|---|
| GET | `/` | `getCalls` | can_view | List/paginate call records with RBAC scoping + filters |
| GET | `/template` | `downloadTemplate` | can_add | Download Excel bulk-upload template with dropdown validation |
| GET | `/staged` | `getStagedUploads` | can_view | List staged bulk-upload rows pending review (paginated, filtered) — see `[[db-upload-module]]` |
| POST | `/transfer` | `transferStagedRecords` | can_add | Bulk-move selected staged rows into CallTracker |
| PUT | `/staged/:id` | `updateStagedRecord` | can_edit | Edit a staged row; promotes to CallTracker once Call Status is set |
| DELETE | `/staged` | `deleteStagedRecords` | can_delete | Delete selected staged rows (`{ids:[]}`) |
| DELETE | `/staged/all` | `clearAllStagedRecords` | can_delete | Delete all of the current user's staged rows |
| GET | `/:id` | `getCallById` | can_view | Fetch one call record with relations |
| POST | `/` | `createCall` | can_add | Create a call record; may trigger pipeline conversion |
| POST | `/bulk-upload` | `bulkUpload` | can_add | Upload Excel file (`multer`, field `file`, 10 MB limit), imports/stages rows |
| PUT | `/:id` | `updateCall` | can_edit | Update a call record; may trigger pipeline conversion |
| DELETE | `/:id` | `deleteCall` | can_delete | Delete a call record (blocked if `is_converted`) |

**`server/src/routes/callRoutes.ts`** (base `/calls`, separate `CallLog` feature — listed for disambiguation only):

| Method | Path | Controller fn | Purpose |
|---|---|---|---|
| POST | `/` | `logCall` | Create a `CallLog` against a `lead_id`; auto-increments today's `KraEntry.calls_actual` |
| GET | `/` | `getCalls` | List `CallLog` rows, optional `?lead_id=` |
| GET | `/kra/:userId` | `getKRA` | Fetch today's `KraEntry` for a user |

## 4. Data Model

### `CallTracker` (`@@map("calltracker")`)

```
id                   Int      @id @default(autoincrement())
date                 DateTime @default(now())
product_id           Int?
product_or_service   String?  // Product, EitService, ImService (comment only — not exposed in UI)
eit_service_id       Int?     // not exposed in current form
im_service_id        Int?     // not exposed in current form
service_department   String?  // populated when created from an Enquiry
industry_id          Int?
lead_source_id       Int?
source_of_db_id      Int?

company_name         String   // required
location             String?
contact_person_name  String?
designation           String?
email_address         String?  // company email
personal_email        String?
mobile_no             String?
business_potential    String?

email_status_id       Int?
linkedin_sent         Boolean  @default(false)

call_status_id        Int?
remarks                String?  @db.Text
next_follow_up_date    DateTime?
follow_up_note         String?  @db.Text
follow_up_status       String   @default("Pending")  // 'Pending'|'InProgress'|'Closed' (free string, not enum)
moved_to_quad          String?  // 'Q1'|'Q2'|'Q3'|'Q4'|'Nurturing' (free string, not enum)
pipeline_action        String?  // 'Quadrant'|'Nurturing'|'Enquiry' (free string, not enum)
quadrant_moved_date    DateTime?

user_id                Int      // owner/creator
is_converted            Boolean  @default(false)
converted_at            DateTime?

created_at              DateTime @default(now())
updated_at              DateTime @updatedAt

Relations: product, eit_service, im_service, industry, lead_source,
source_of_db, email_status, call_status, user, lead (1:1), enquiry (1:1)
```

### Related tables
- `LeadSource` (`leadsource`): `id, name (unique), is_active`. Shared master with Lead/Enquiry/Partner sourcing — selectable in the Classification section as of the `20260723` migration.
- `CallStatus` (`callstatus`): `id, name (unique), is_active`. Values referenced in code: "Converted to Lead", "Connected", "Interested", "Follow Up Required".
- `EmailStatus` (`emailstatus`): `id, name (unique), is_active`. Value referenced in code: "Sent".
- `CallActivityLog` (`callactivitylog`): `id, call_id, user_id, action_type (CREATE|UPDATE), action_date, created_at`. No Prisma FK on `call_id` — deleting a CallTracker record raw-deletes matching log rows first.
- `ActivityLog` (`activitylog`): generic log (`type`: 'LinkedIn Sent' | 'Email Sent', `status`: 'Sent'|'Pending'), tied to user not call.
- `BulkUploadStaging` (`bulkuploadstaging`): staging table for bulk-uploaded rows lacking a resolvable Call Status — full field list and workflow documented in `[[db-upload-module]]`.

### Downstream links
- `Lead.call_tracker_id Int? @unique` + `Lead.call_tracker` — Lead created from a call links back 1:1.
- `Enquiry.call_tracker_id Int? @unique` + `Enquiry.call_tracker` — Enquiry created via "Move to Enquiry" **or** the call created from an Enquiry ("Enquiry Converted To" = "Call Tracker") links back 1:1 either direction.

### Related migrations
- `database/migrations/20260704/add_call_tracker_pipeline_action.sql` (mirrored in `server/prisma/migrations/`) adds `calltracker.pipeline_action VARCHAR(20) NULL` and `enquiry.call_tracker_id INT NULL` (FK to `calltracker.id`, `ON DELETE SET NULL`, `ON UPDATE CASCADE`, unique index).
- `database/migrations/20260723_add_enquiry_converted_to_and_calltracker_lead_source.sql` adds `enquiry.converted_to` (routes Enquiry conversion to Lead vs. CallTracker) and `calltracker.lead_source_id` (FK to `leadsource.id`).
- `database/migrations/20260805_add_sales_activity_indexes.sql` adds supporting indexes touching call/activity tables (performance only, no schema shape change).
- `database/migrations/20260808_add_calltracker_followup_note_status.sql` adds `calltracker.follow_up_note TEXT NULL` and `calltracker.follow_up_status VARCHAR(20) NOT NULL DEFAULT 'Pending'`, both placed after `next_follow_up_date`.

> Note: two copies of the `20260704` migration exist with differing table/column casing (lowercase `calltracker` vs PascalCase `CallTracker`) — `database/migrations/20260704/add_call_tracker_pipeline_action.sql` and `server/prisma/migrations/20260704_add_call_tracker_pipeline_action.sql`. Prisma's `@@map` uses lowercase — confirm which copy is authoritative in production to avoid drift.

## 5. RBAC

- Route level: `authenticate` + `checkPrivilege('Calls', <can_view|can_add|can_edit|can_delete>)`. CEO bypasses all checks.
- Row-level scoping (inside `getCalls`/`getCallById`/`deleteCall`):
  - **Sales Person**: hard-scoped to `user_id = own id`; no Owner filter in UI.
  - **Sales Manager**: scoped to self + direct reports (`reporting_manager_id`); Owner filter intersects requested IDs with allowed team IDs (empty intersection → forces `user_id = -1`, i.e. no results, rather than erroring).
  - **CEO**: unrestricted; can filter to any salesperson.
  - `getCallById` / `deleteCall`: additional ownership check — Sales Person gets 403 "Access denied" on a record that isn't theirs.
  - `deleteCall`: blocks deleting any `is_converted = true` record, regardless of role.
- **Staging list / claim rules**: distinct from the row-level rules above — see `[[db-upload-module]]` §RBAC for the full breakdown (uploader-default scoping for the list vs. product-mapping-based scoping for claim/edit/delete/transfer).
- No RBAC differentiation on the "Move to Pipeline" action itself — any role able to edit/create a call can trigger a conversion.

## 6. "Move to Pipeline" Business Logic

Three possible `pipeline_action` values, chosen via form dropdown, evaluated in `createCall`/`updateCall`:

1. **`Quadrant`** — sets `moved_to_quad` (defaults to `'Q1'` since the current UI doesn't expose quadrant selection), `quadrant_moved_date = now()`. Triggers `convertToLeadLogic()`.
2. **`Nurturing`** — sets `moved_to_quad = 'Nurturing'`. Triggers `convertToLeadLogic()`, which also assigns the Lead's `sales_stage_id` to the "Nurturing" `SalesStage` and applies `getQualificationResetData()` (BANT/qualification reset), mirroring `[[lead-module]]` Nurturing logic.
3. **`Enquiry`** — does not touch quadrant fields. Triggers `convertToEnquiryLogic()`, creating an `Enquiry` row (no Lead is created).

**Trigger conditions** (both `createCall` and `updateCall`):
- `pipeline_action === 'Enquiry'` → `convertToEnquiryLogic`.
- else if `call_status.name === 'Converted to Lead'` OR `moved_to_quad` is truthy → `convertToLeadLogic`.
- `updateCall` guards with `!call.is_converted` to avoid re-converting an already-converted record.
- Conversion only fires after the Prisma write succeeds inside the request handler, and the frontend dropdown only sets local form state (API call happens on Save) — no side effects fire before the record is actually saved.

### `convertToLeadLogic(callId, userId)`
- Finds or creates a Client Company via `findOrCreateClientCompany(call.company_name)` (Client Company Master — never the plain Company Master).
- Creates a `Lead`: `created_by_id/lead_owner_id = userId`, `first_name = contact_person_name || 'Converted Prospect'`, `company_name`, `client_company_id`, `industry_id`, `product_id`, `email = email_address`, `mobile_number = mobile_no`, `quadrant = moved_to_quad || 'Q4'`, `call_tracker_id = call.id`.
- If `pipeline_action === 'Nurturing'`: also sets Sales Stage to Nurturing + applies qualification reset.
- Marks `CallTracker.is_converted = true`, `converted_at = now()`.
- Logs quadrant history via `logQuadrantMovement({ leadId, userId, oldQuadrant: null, newQuadrant, movementType: 'AUTO' })`.

### `convertToEnquiryLogic(callId, userId)`
- Creates `Enquiry` linked via `call_tracker_id` (`date, company_name, contact_name, mobile_number, email, product_id, service_department, remarks, created_by_id`), marks `CallTracker.is_converted = true`. Never touches Lead/Quadrant/SalesStage.

### `createCallTrackerFromEnquiry(enquiry, userId)` — reverse direction
- Fires from `enquiryController` when an Enquiry's "Enquiry Converted To" = "Call Tracker" (on create, or on update the moment `is_converted` flips true with `converted_to === 'CallTracker'`).
- Owner of the new record: `enquiry.allocated_to_id` ("Lead Allocated To") → falls back to `enquiry.enquiry_allocated_to` ("Enquiry Allocated To", since Lead Allocated To is often blank) → falls back to the triggering user, so it always lands in someone's account.
- Creates a `CallTracker` row (`company_name, date, contact_person_name, email_address, mobile_no, remarks, product_id, service_department, lead_source_id, user_id`), logs a `CallActivityLog` CREATE entry, and links back via `Enquiry.call_tracker_id`. Does **not** set `pipeline_action`/`is_converted` on the new call — it starts as a fresh, unconverted Call Tracker record.
- Failure is swallowed by the caller (`enquiryController` logs and continues) — an Enquiry save never fails because the linked Call Tracker creation failed.

### Editing a converted call
If a call is already linked to a Lead and `moved_to_quad` changes on update, the linked Lead's `quadrant`/`quadrant_updated_at` are updated too; if `pipeline_action === 'Nurturing'`, Sales Stage + qualification reset are re-applied. A `logQuadrantMovement` entry is recorded with `movementType: 'MANUAL'`.

### Delete rules
`deleteCall` prevents deleting any `is_converted` call (UI also hides Delete for converted rows, showing "In Pipeline" instead). Deletion manually purges `CallActivityLog` rows first via raw SQL (no Prisma FK/cascade on that relation).

### Activity logging side effects
- Every create/update writes a `CallActivityLog` (`CREATE`/`UPDATE`).
- `linkedin_sent` newly true (create: any true; update: false→true transition) → `ActivityLog` "LinkedIn Sent" entry.
- Email Status resolving to "Sent" (create: any; update: on transition) → `ActivityLog` "Email Sent" entry.
- These feed KRA/SWAT performance dashboards elsewhere (see `[[swat-performance-module]]`).

## 7. Bulk Upload (entry point only)

`bulkUpload` (`POST /call-tracker/bulk-upload`) and its template
(`GET /call-tracker/template`) are the front door into two different
destinations depending on each row's Call Status — full detail on
validation rules, routing, the staging table, and the review/claim/transfer
workflow lives in `[[db-upload-module]]`. In short:

- A row with a **resolvable Call Status** is created directly in
  `CallTracker`, with the same activity-log/conversion side effects as a
  manual create.
- A row **without** a Call Status is parked in `BulkUploadStaging` for
  manual review.

## 8. Known Issues / Follow-ups

- **Cosmetic-only required field**: Next Follow-up Date is marked required in the UI when Call Status = "Follow Up Required" but not enforced in `validateForm()` (only `company_name` is checked). Decide whether to enforce or remove the asterisk.
- **Quadrant selection not exposed**: the "Quadrant" pipeline action always defaults `moved_to_quad` to `'Q1'` because the current form never sends an explicit quadrant value.
- **Debug logging left in code**: `createCall`/`updateCall` write raw payload dumps to a hardcoded absolute path (`f:/crm/angler_crm/server/tmp/payload_debug.log`), which is machine-specific and silently fails elsewhere (wrapped in `try/catch`). Should be removed.
- **Verbose console logging**: `getCalls` logs the requesting user/role and raw filter query on every call, plus a result-count debug line — noisy for production, no sensitive data exposed but should be trimmed per the project's logging rules.
- **Duplicate migration files**: `database/migrations/20260704/add_call_tracker_pipeline_action.sql` and the Prisma-mirrored copy differ in table/column casing — confirm which is authoritative.
- **`eit_service_id`/`im_service_id`/`product_or_service`**: present in the schema but not exposed anywhere in the current Call Tracker form or bulk-upload template — dead columns until a UI is built for them.
- **Naming collision**: `callController.getCalls` (CallLog) and `callTrackerController.getCalls` (CallTracker) share a name across unrelated features — keep this in mind when searching the codebase.

## 9. History

- `md files/call/pipeline.md` — original spec introducing the 3-way "Move to Pipeline" dropdown, replacing a legacy "Moved to Quadrant" Yes/No toggle. Required existing Quadrant behavior to be preserved, added Nurturing and Enquiry paths.
- `md files/call/bug1.md` — follow-up fix: (1) pipeline action was firing on dropdown selection instead of after Save, causing orphaned Leads/Enquiries on Cancel — fixed by gating conversion inside the create/update handlers after a successful write; (2) verified "Move to Enquiry" creates only an Enquiry with no Lead/Sales Stage side effects.
- `md files/call/dbUpload.md` — earlier bulk-upload / DB Upload (staging) module notes (superseded by `[[db-upload-module]]`).
- `20260723_add_enquiry_converted_to_and_calltracker_lead_source.sql` — added the reverse Enquiry → Call Tracker conversion path (`Enquiry.converted_to`) and the `Lead Source` field on Call Tracker.
