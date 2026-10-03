# Database Changelog

## 2026-09-19 — Add billing_forecast_management_access (Billing Forecast module)

### Migration File
`database/migrations/20260919/add_billing_forecast_management_access.sql`

### Modified Tables

#### `user`
| Column | Type | Details |
|--------|------|---------|
| `billing_forecast_management_access` | BOOLEAN NOT NULL DEFAULT false | When true, the Billing Forecast module bypasses the reporting-hierarchy scope for this user and instead scopes by the companies assigned in `billing_forecast_management_company` |

### New Tables

#### `billing_forecast_management_company`
| Column | Type | Details |
|--------|------|---------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `user_id` | INT NOT NULL | FK -> `user.id`, ON DELETE CASCADE |
| `company_id` | INT NOT NULL | FK -> `company.id`, ON DELETE CASCADE. The BU (`product.company_id`) this Management Access grant covers |
| `created_at` | DATETIME | |
| UNIQUE (`user_id`, `company_id`) | | |

### Purpose
Mirrors the existing Cashflow Report "Management Access" pattern
(`cashflow_management_access` / `cashflow_management_company`,
`20260717/add_cashflow_management_access.sql`) for the Billing Forecast module:
an admin can grant a user (e.g. a BU head) unrestricted, company-scoped visibility
across every BDE's Billing Forecast/Tracker/Achieved Report records for one or more
assigned companies, independent of who reports to whom.

## 2026-08-27 — Add expected_order_closure_date to forecast_headers

### Migration File
`database/migrations/20260827/add_expected_order_closure_date_to_forecast_headers.sql`

### Modified Tables

#### `forecast_headers`
| Column | Type | Details |
|--------|------|---------|
| `expected_order_closure_date` | DATETIME(3) NULL | Added after `expected_order_value`. Expected date the order closes, captured in Section 9 (Order & Cashflow Forecast) of the Lead form. Nullable — optional, existing rows unaffected |

### Purpose
Section 9 of the Lead form now captures an Expected Order Closure Date next to the
Expected Order Value. Persisted on the forecast header via `upsertForecast`
(`cashflowForecastController.ts`) and returned by the forecast read endpoints.

## 2026-08-21 — Add billing_forecast (Billing Forecast VP screens)

### Migration File
`database/migrations/20260821/add_billing_forecast.sql`

### New Tables

#### `billing_forecast`
| Column | Type | Details |
|--------|------|---------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `lead_milestone_id` | INT NOT NULL | FK -> `lead_milestone.id`, ON DELETE CASCADE. Unique — a milestone can only be added to the Billing Forecast once |
| `added_by_id` | INT NULL | FK -> `user.id`, ON DELETE SET NULL. Who added the milestone from the Milestone Selection screen |
| `invoice_number` | VARCHAR(100) NULL | Set when invoice details are saved from the Tracker's Edit action |
| `invoice_date` | DATETIME(3) NULL | |
| `edc_payment_collection` | DATETIME(3) NULL | EDC for Payment Collection, entered alongside the invoice |
| `status` | VARCHAR(20) NOT NULL DEFAULT 'Forecast' | `Forecast` or `Achieved` — becomes `Achieved` the moment invoice details are saved; one-directional, no revert path |
| `created_at` / `updated_at` | DATETIME(3) | |
| INDEX `idx_billing_forecast_status` | | |

### Purpose
Backs the three Billing Forecast VP screens (`md files/billing forecast/vpscreen.md`):
Billing Forecast Milestones (search a customer, add existing Order Won
`lead_milestone` rows to the forecast), Billing Forecast Tracker (filter/edit
invoice details on forecasted milestones), and Billing Achieved Report
(Forecast vs Achieved summary + achieved milestone list). Reuses the existing
`lead_milestone` data (the same milestones behind Cashflow Tracker/Report)
rather than duplicating milestone entry — `billing_forecast` only tracks which
milestones were pulled into this forecast and their invoice/achievement state.

## 2026-08-19 — Add digital_leads_target to userproducttarget

### Migration File
`database/migrations/20260819/add_digital_leads_target_to_userproducttarget.sql`

### Modified Tables

#### `userproducttarget`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `digital_leads_target` | INT NULL DEFAULT 0 | Placed after `calls_target`. Per-day Digital Leads target, configured alongside the existing Direct Marketing Calls Target |

### Purpose
Adds a Digital Leads Target field to the Target Configuration modal
(Target Management -> Edit User Performance), positioned directly after the
Direct Marketing Calls Target field, mirroring how `calls_target` is
configured today.

## 2026-08-18 — Add userleadsourcetype (per-BDE Lead Source Type restriction)

### Migration File
`database/migrations/20260818/add_userleadsourcetype.sql`

### New Tables

#### `userleadsourcetype`
| Column | Type | Details |
|--------|------|---------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `user_id` | INT NOT NULL | FK -> `user.id`, ON DELETE CASCADE |
| `lead_source_type_id` | INT NOT NULL | FK -> `leadsourcetype.id`, ON DELETE CASCADE |
| `created_at` | DATETIME(3) | Default `CURRENT_TIMESTAMP(3)` |
| UNIQUE (`user_id`, `lead_source_type_id`) | | One row per user/type pair |

### Purpose
BDEs are assigned specific Lead Source Types (e.g. Selvam -> Direct + Reference
only, Ramasamy -> Digital only). No rows for a user means unrestricted — the
Lead Gen Summary keeps showing every active Lead Source Type, matching prior
behavior. Where rows exist, the Lead Gen Summary (`/api/lead-gen`) only shows
that user under the Lead Source Type sections they're assigned to. Managed
from the Privileges admin page (Manage Privileges -> Lead Source Types),
mirroring the existing Cashflow Management Access pattern
(`cashflowmanagementcompany`), via new endpoints
`GET/POST /api/privileges/:userId/lead-source-types`.

## 2026-08-13 — Daily Report: per-user enable flag + per-company uniqueness

### Migration Files
`database/migrations/20260813/add_daily_report_enabled_to_user.sql`
`database/migrations/20260813/dailyreport_unique_per_company.sql`

### Modified Tables

#### `user`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `daily_report_enabled` | TINYINT(1) NOT NULL DEFAULT 0 | Per-user opt-in for the automated Daily Report cron, independent of `status`/`is_active` |

#### `dailyreport`
| Change | Details |
|--------|---------|
| DROP INDEX `uniq_dailyreport_user_date` | Replaced — no longer sufficient once a user can have multiple reports/date |
| ADD UNIQUE KEY `uniq_dailyreport_user_date_company` (`user_id`, `report_date`, `company_id`) | A BDE whose products map to more than one company now gets one Daily Report row (and one email, to that company's own recipient) per company per date |

### Purpose
The Daily Report cron previously ran for every `ACTIVE` user and assumed one
company per user (`user.company_id`), sending a single email. Per
`md files/daily_report/daily_report_updated_development_plan.md`: (1) only
users explicitly opted in via `daily_report_enabled` should be processed —
general active/inactive status is not the Daily Report setting; (2) a BDE's
company must be resolved per-product via the existing Product -> Company
mapping (`product.company_id`), not assumed from the user record, since one
BDE can carry products for multiple companies. The report is now generated
and emailed separately per company, each to that company's own
`report_recipient_email`.

## 2026-08-12 — Add status to dailyreportlead

### Migration File
`database/migrations/20260812/add_status_to_dailyreportlead.sql`

### Modified Tables

#### `dailyreportlead`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `status` | VARCHAR(20) NULL | Derived Open/Won/Lost status (from the lead's quadrant at report-generation time), stored alongside the existing `quadrant` snapshot |

### Purpose
The Daily Report email now shows a Status column (Open/Won/Lost) per lead in
the Company/Product/Quadrant lead list, derived from `Lead.quadrant`
(`Order Won` → Won, `Order Lost` → Lost, else Open). This persists that same
derived value on the stored `DailyReportLead` row so the structured record
stays consistent with the rendered `email_html`.

## 2026-08-12 — Add activities_target to userproducttarget

### Migration File
`database/migrations/20260812/add_activities_target_to_user_product_target.sql`

### Modified Tables

#### `userproducttarget`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `activities_target` | INT NULL DEFAULT 0 | Per-user, per-product Activities target, configured in Target Management |

### Purpose
Target Management gains a configurable "Activities Target" per user/product, following
the same pattern as Demos/Proposals/Calls/LinkedIn/Direct Visit/Email/LinkedIn Connection
targets. The SWAT Performance Form's Activity Log "Target" column now displays this
configured value directly instead of the previous computed `calls_target + linkedin_target`.
Activities achievement value/flow is unchanged.

## 2026-08-10 — Create Lead Source Type master and map Lead Source to it

### Migration File
`database/migrations/20260810/create_lead_source_type_master.sql`

### New Tables

#### `leadsourcetype`
| Column | Type | Details |
|--------|------|---------|
| `id` | INT, PK, AUTO_INCREMENT | |
| `name` | VARCHAR(191), UNIQUE, NOT NULL | Lead Source Type name, e.g. Direct, Digital, Reference, Exhibition |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | Deactivating hides it from new Lead Source mappings; existing mappings are unaffected |

### Modified Tables

#### `leadsource`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `lead_source_type_id` | INT NULL | Foreign key referencing `leadsourcetype.id` |
| ADD INDEX | `leadsource_lead_source_type_id_idx` | INDEX | Index on `lead_source_type_id` for FK join performance |
| ADD CONSTRAINT | `fk_leadsource_lead_source_type` | FOREIGN KEY | `leadsource.lead_source_type_id → leadsourcetype.id`, ON DELETE SET NULL |

### Purpose
Adds a new Lead Source Type master (Direct / Digital / Reference / Exhibition, etc.),
managed separately under Masters. The existing Lead Source master gains a Lead
Source Type dropdown (values sourced from the new master, active types only), so
each Lead Source maps to exactly one Lead Source Type while one Lead Source Type
can be reused across many Lead Sources. Deactivating a Lead Source Type removes it
from the dropdown for new/edited mappings but leaves existing Lead Source → Lead
Source Type mappings unchanged.

## 2026-08-08 — Add follow_up_note and follow_up_status to calltracker

### Migration File
`database/migrations/20260808/add_calltracker_followup_note_status.sql`

### Modified Tables

#### `calltracker`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `follow_up_note` | TEXT NULL | Free-text note captured alongside the next follow-up date |
| ADD COLUMN | `follow_up_status` | VARCHAR(20) NOT NULL DEFAULT 'Pending' | Tracks follow-up progress: `Pending`, `InProgress`, or `Closed` |

### Purpose
Adds a Follow Up Note and Follow Up Status to the Call Tracker's Engagement &
Outcome section, right after Next Follow-up Date, so a rep can record what the
next follow-up is about and track whether it's still pending, in progress, or
closed — shown on the Call Tracker Form and View.

## 2026-08-06 — Add status to followuplog

### Migration File
`database/migrations/20260806/add_followuplog_status.sql`

### Modified Tables

#### `followuplog`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `status` | VARCHAR(20) NOT NULL DEFAULT 'Pending' | Tracks entry progress: `Pending`, `In Progress`, or `Completed` |

### Purpose
Adds an editable Status field to each Sales Engagement & Activity Log entry, so a
log's progress can be tracked and updated inline from the Lead Detail and Lead
Form's activity log table, independent of the log's other (audit-trail) fields.

## 2026-08-05 — Indexes for Dashboard "Sales Activities" (Category 2)

### Migration File
`database/migrations/20260805/add_sales_activity_indexes.sql`

### Modified Tables

#### `lead`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD INDEX | `idx_lead_follow_up_datetime` | INDEX | On `follow_up_datetime` (Sales Engagement Date) |

#### `calltracker`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD INDEX | `idx_calltracker_next_follow_up_pipeline` | INDEX | Composite on (`next_follow_up_date`, `pipeline_action`) |

### Purpose
Dashboard Category 2 counts leads by their Sales Engagement Date and Call Tracker
follow-ups still outside the pipeline. Both columns were unindexed, so every
dashboard load produced a full table scan. The same indexes serve the new Lead
Report engagement-date filter and the Call Tracker follow-up window filter.
No columns, tables or data are added, changed or removed.

## 2026-08-05 — Repair orphaned master references on Lead (optional data fix)

### Migration File
`database/migrations/20260805/fix_orphan_lead_master_references.sql`

### New Tables

#### `lead_orphan_reference_backup`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| CREATE TABLE | `id` | INT AUTO_INCREMENT | Primary key |
| ADD COLUMN | `lead_id` | INT NOT NULL | The lead whose reference was cleared |
| ADD COLUMN | `company_id` | INT NULL | Old dangling value, NULL when that column was fine |
| ADD COLUMN | `city_id` | INT NULL | Old dangling value |
| ADD COLUMN | `state_id` | INT NULL | Old dangling value |
| ADD COLUMN | `backed_up_at` | DATETIME | Defaults to CURRENT_TIMESTAMP |
| ADD INDEX | `idx_lead_orphan_backup_lead` | INDEX | On `lead_id` |

### Modified Tables

#### `lead` (data only — no schema change)
| Change | Column | Details |
|--------|--------|---------|
| UPDATE | `company_id` | Set to NULL where the referenced `company` row no longer exists (55 rows at time of writing) |
| UPDATE | `city_id` | Set to NULL where the referenced `city` row no longer exists (18 rows) |
| UPDATE | `state_id` | Set to NULL where the referenced `state` row no longer exists (1 row) |

### Purpose
The geo masters were re-imported (`city` now holds ~148k rows under new ids) and the
company master was reduced to the Angler BU companies, leaving some leads pointing at
master rows that no longer exist. Saving such a lead failed outright, because the update
connects each relation by id and the missing row rejected the whole statement.

The application no longer depends on this fix: `updateLead` now validates the ids first
and answers "The selected City no longer exists. Please choose it again and save." This
script is the optional bulk alternative to re-picking each value by hand. **Not run
automatically** — audit and back up first; the cleared ids are not recoverable from the
application afterwards.

## 2026-07-28 — Project Name / Order Name added to Lead

### Migration File
`database/migrations/20260728/add_lead_project_name.sql`

### Modified Tables

#### `lead`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `project_name` | VARCHAR(255) NULL DEFAULT NULL | Optional "Project Name / Order Name" captured in Section 3: Opportunity & Lead Management, placed after `product_id` |

### Purpose
Added a free-text field to capture the customer's project or order reference, per `md files/lead/company_field.md`. No changes to Quadrant, Sales Stage, Lead Score, BANT, Auto-Degradation, or Requalification logic.

Application-layer files touched: `server/prisma/schema.prisma`, `client/src/pages/LeadForm.tsx` (Section 3, after Product), `client/src/pages/LeadDetail.tsx` (Opportunity Details), `client/src/pages/LeadReport.tsx` (Excel export). `server/src/controllers/leadController.ts` create/update/list/get endpoints require no changes — they pass Lead scalar fields through generically.

### Known Limitation
None — `ADD COLUMN IF NOT EXISTS` is idempotent.

## 2026-07-24 — Demo Target added; Sales/Revenue Order targets synced from Target Management

### Migration File
`database/migrations/20260724/add_demos_target_to_user_product_target.sql`

### Modified Tables

#### `userproducttarget`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `demos_target` | INT NULL DEFAULT 0 | New per-user daily "Demo Target" set from Target Management |

### Purpose
Added a Demo Target field to Target Management, matching the Proposals Target pattern — the SWAT form's Demos target now syncs from it instead of manual entry. Also wired the existing (monthly) Sales Target / Revenue Target fields into the SWAT Performance Form: "Sales Order Won" and "Revenue Collected" targets are now computed as `sales_target ÷ 22` and `revenue_target ÷ 22` (same working-days conversion already used for Q1 Lead Generation) instead of being blank/manual — Achievement and Remarks for these two remain auto-calculated from Leads/Milestone payments as before.

Application-layer files touched: `server/src/controllers/swatController.ts` (`saveSwatPerformance`/`getSwatStats` — `demos_target`, `sales_order_won_target`, `revenue_collected_target` now sourced from `UserProductTarget`), `server/src/controllers/userController.ts`, `client/src/pages/SwatPerformanceForm.tsx` (Demos/Sales Order Won/Revenue Collected rows no longer editable targets), `client/src/pages/admin/EditUserPerformanceModal.tsx`.

### Known Limitation
None — `ADD COLUMN IF NOT EXISTS` is idempotent.

## 2026-07-24 — Proposals Target added to Target Management

### Migration File
`database/migrations/20260724/add_proposals_target_to_user_product_target.sql`

### Modified Tables

#### `userproducttarget`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `proposals_target` | INT NULL DEFAULT 0 | New per-user daily "Proposals Target" set from Target Management |

### Purpose
The SWAT Performance Form's "Proposals" target was previously typed manually into the form each day with no central source of truth. Added a Proposals Target field to Target Management (matching the pattern already used for Calls/LinkedIn/Direct Visit/Email/LinkedIn Connection targets), and the SWAT form's Proposals target now syncs from this value instead of manual entry — the achieved/remarks fields for Proposals remain manual entry, unchanged.

Application-layer files touched: `server/src/controllers/swatController.ts` (`saveSwatPerformance`/`getSwatStats` — `proposals_target` now sourced from `UserProductTarget` instead of request body), `server/src/controllers/userController.ts` (`updateUserProductTargets`), `client/src/pages/SwatPerformanceForm.tsx` (Proposals row no longer editable target), `client/src/pages/admin/EditUserPerformanceModal.tsx`.

### Known Limitation
None — `ADD COLUMN IF NOT EXISTS` is idempotent.

## 2026-07-24 — SWAT Email/LinkedIn Connection Targets + Auto-Calculated Order Won / Revenue Collected

### Migration File
`database/migrations/20260724/add_swat_email_linkedin_connection_fields.sql`

### Modified Tables

#### `userproducttarget`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `email_target` | INT NULL DEFAULT 0 | New per-user daily "Email Target" set from Target Management |
| ADD COLUMN | `linkedin_connection_target` | INT NULL DEFAULT 0 | New per-user daily "LinkedIn Connection Target", distinct from the existing `linkedin_target` (which drives the SWAT "LinkedIn Acceptance" section) |

#### `swatperformance`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `email_campaign_target` | INT NOT NULL DEFAULT 0 | Synced from `userproducttarget.email_target` |
| ADD COLUMN | `email_campaign_achieved` | INT NOT NULL DEFAULT 0 | Manual entry |
| ADD COLUMN | `email_campaign_remarks` | TEXT NULL | Manual entry |
| ADD COLUMN | `linkedin_connection_target` | INT NOT NULL DEFAULT 0 | Synced from `userproducttarget.linkedin_connection_target` |
| ADD COLUMN | `linkedin_connection_achieved` | INT NOT NULL DEFAULT 0 | Manual entry |
| ADD COLUMN | `linkedin_connection_remarks` | TEXT NULL | Manual entry |

### Purpose
Implements `md files/swat/swatUpdate.md`: adds two new daily SWAT activities (Email Campaign, LinkedIn Connection Sent) with targets fetched from Target Management; un-hides the previously hidden Target column for Demos, Proposals, Sales Order Won, and Revenue Collected; and auto-calculates Sales Order Won (Achievement = sum of `Lead.order_value` where `order_won_at` matches the selected SWAT date, scoped by `Lead.lead_owner_id`; Remarks = company-wise breakdown) and Revenue Collected (Achievement = sum of `LeadMilestonePaymentHistory.collected_amount` where `collection_date` matches the selected SWAT date, scoped by `collected_by_id`; Remarks = company + milestone breakdown), removing manual re-entry for these two activities. No existing target calculations, save flow, or RBAC were changed.

Application-layer files touched: `server/src/controllers/swatController.ts` (`computeSalesOrderWonAuto`/`computeRevenueCollectedAuto` helpers, wired into `saveSwatPerformance` and `getSwatStats`), `server/src/controllers/userController.ts` (`updateUserProductTargets`), `client/src/pages/SwatPerformanceForm.tsx`, `client/src/pages/admin/EditUserPerformanceModal.tsx`.

### Known Limitation
None — `ADD COLUMN IF NOT EXISTS` is idempotent.

## 2026-07-23 — Enquiry "Converted To" dropdown + Call Tracker Lead Source

### Migration File
`database/migrations/20260723/add_enquiry_converted_to_and_calltracker_lead_source.sql`

### Modified Tables

#### `enquiry`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `converted_to` | VARCHAR(20) NULL | Records the conversion destination selected on the Enquiry form: `'Lead'` or `'CallTracker'` (NULL = not converted). Existing converted rows are backfilled to `'Lead'`. |

#### `calltracker`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `lead_source_id` | INT NULL | FK to `leadsource(id)`. New "Lead Source" dropdown on the Call Tracker form, placed after Industry. |

### Indexes / Foreign Keys
- `fk_calltracker_lead_source`: `calltracker.lead_source_id` → `leadsource.id` (ON DELETE SET NULL)
- `idx_calltracker_lead_source_id` on `calltracker.lead_source_id`

### Purpose
The Enquiry Tracker's "Enquiry Converted to Lead?" toggle was replaced with an "Enquiry Converted To" dropdown (Lead / Call Tracker) so an enquiry can be routed either into the existing Lead conversion flow or directly into the Call Tracker module, bypassing Lead creation. The Call Tracker module also gained a "Lead Source" dropdown (sourced from the Lead Source Master) to capture where a call-tracker-originated record came from, matching the field already present on Enquiry and Lead. See `md files/SealModules/enqtocall.md`.

Application-layer files touched: `server/src/controllers/enquiryController.ts` (`createEnquiry`/`updateEnquiry` now branch on `converted_to`), `server/src/controllers/callTrackerController.ts` (new `createCallTrackerFromEnquiry` helper, `lead_source_id` wired into `createCall`/`updateCall`), `client/src/pages/seal/EnquiryForm.tsx`, `client/src/pages/seal/EnquiryTracker.tsx`, `client/src/pages/calls/CallTrackerForm.tsx`.

### Known Limitation
None — `ADD COLUMN IF NOT EXISTS` is idempotent.

## 2026-07-22 — Backfill LeadGenSummary privilege

### Migration File
`database/migrations/20260722/backfill_leadgensummary_privilege.sql`

### Modified Tables

#### `privilege`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| DATA BACKFILL | `module_name = 'LeadGenSummary'` | — | Copies each user's existing `SealDashboard` privilege row (can_add/can_edit/can_delete/can_view) into a new `LeadGenSummary` row, keyed by `(user_id, module_name)` |

### Purpose
The Lead Gen Summary nav item and its `/api/lead-gen` routes previously inherited visibility from the `SealDashboard` privilege only, with no independent access control (test cases LGS-001, LGS-056). It now has its own `LeadGenSummary` privilege module, enforced via `checkPrivilege('LeadGenSummary', 'can_view')` on the server routes and gated in the sidebar. This backfill preserves existing users' access so the new gate doesn't silently lock anyone out; going forward, `LeadGenSummary` is managed independently from the Admin → Privileges screen.

## 2026-07-23 — Add remarks to Cashflow Forecast milestones

### Migration File
`database/migrations/20260723/add_remarks_to_forecast_milestones.sql`

### Modified Tables

#### `forecast_milestones`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `remarks` | TEXT NULL | Optional per-milestone remarks (e.g. "Waiting for PO"), entered from the Forecast Milestones editor on the Lead form |

### Purpose
The Cashflow Forecast Dashboard (`md files/forecast/forecastUI.md`) displays a per-milestone Remarks column in the Forecast Table, but `forecast_milestones` had no field to hold it. Added the column and wired it through `upsertForecast`/`formatForecast` and the milestone editor in `LeadForm.tsx`.

### Known Limitation
None — `ADD COLUMN IF NOT EXISTS` is idempotent.

## 2026-07-22 — Make Cashflow Forecast optional fields nullable

### Migration File
`database/migrations/20260722/make_forecast_fields_nullable.sql`

### Modified Tables

#### `forecast_headers`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| MODIFY COLUMN | `device_count` | INT NULL | Was `NOT NULL`; not every product has a device count |

#### `forecast_milestones`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| MODIFY COLUMN | `expected_amount` | DECIMAL(15,2) NULL | Was `NOT NULL`; milestones are commonly added/refined incrementally |
| MODIFY COLUMN | `percentage` | DECIMAL(5,2) NULL | Was `NOT NULL`, same reason |

### Purpose
Follow-up to the 2026-07-21 Cashflow Forecast tables migration: validation for Device Count, milestone Expected Amount and Percentage was relaxed in the app layer (`cashflowForecastController.ts`, `LeadForm.tsx`) but the original migration still defined these columns as `NOT NULL`. Saving a forecast/milestone without those values was failing with a 500 (NOT NULL constraint violation) if the original migration had already been applied. This migration relaxes the columns to match.

### Known Limitation
None — `MODIFY COLUMN ... NULL` is safe to run whether or not the original migration already executed.

## 2026-07-21 — Create Cashflow Forecast module tables

### Migration File
`database/migrations/20260721/create_cashflow_forecast_tables.sql`

### New Tables

#### `forecast_headers`
| Column | Type | Details |
|--------|------|---------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `lead_id` | INT NOT NULL | FK → `lead.id`, cascade delete, UNIQUE (one active forecast per lead) |
| `company_id` | INT NULL | FK → `company.id` |
| `product_id` | INT NULL | FK → `product.id` |
| `user_id` | INT NULL | FK → `user.id` (lead owner) |
| `vertical_id` | INT NULL | FK → `vertical.id` |
| `expected_order_value` | DECIMAL(15,2) NOT NULL | |
| `device_count` | INT NULL | Not all products have a device count, so this is optional |
| `remarks` | TEXT NULL | |
| `status` | VARCHAR(30) DEFAULT 'Forecast' | Derived: Forecast / High\|Medium\|Low Probability / Delayed |
| `created_at`, `updated_at` | DATETIME(3) | |

#### `forecast_milestones`
| Column | Type | Details |
|--------|------|---------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `forecast_id` | INT NOT NULL | FK → `forecast_headers.id`, cascade delete |
| `milestone_master_id` | INT NULL | FK → `paymenttype.id` (reuses the existing "Milestone Type" master, same one `lead_milestone.payment_type_id` uses) |
| `expected_amount` | DECIMAL(15,2) NULL | Optional — milestones can be added/refined incrementally without needing amounts upfront |
| `percentage` | DECIMAL(5,2) NULL | Optional, same reason |
| `expected_collection_date` | DATETIME NOT NULL | |
| `status` | VARCHAR(20) DEFAULT 'Upcoming' | Upcoming / Delayed |
| `created_at`, `updated_at` | DATETIME(3) | |

New Prisma models `ForecastHeader`/`ForecastMilestone`, with back-relations added to `Lead`, `Company`, `Product`, `User`, `Vertical`, `PaymentType`.

### Purpose
Implements the Cashflow Forecast module from `md files/forecast/forecast.md`: lets a BDE mark a Lead as "Expected Order" while it's still in the pipeline (pre–Order Won), forecast its value/device count/vertical, and plan payment milestones against it, purely for management forecasting visibility. Fully independent of `cashflow_tracker` and `lead_milestone` — no data is copied between them. The `forecast_headers` row (and its milestones, via cascade) is deleted automatically the moment the owning lead's quadrant resolves to `Order Won` or `Order Lost`, per the spec's Order Won/Lost flow diagrams.

### Known Limitation
Milestone/header `status` has no spec-given computation formula, so it's derived heuristically (see `server/src/controllers/cashflowForecastController.ts`): milestone status is `Delayed` once `expected_collection_date` has passed (otherwise `Upcoming` — there is no "collected" concept for a forecast milestone), and header status mirrors the lead's current Quadrant (Q1→High, Q2/Q3→Medium, Q4→Low, else→Forecast), overridden to `Delayed` if any milestone is delayed.

## 2026-07-20 — Replace manual Daily Report with automated cron-generated Daily Report

### Migration File
`database/migrations/20260720/replace_daily_report_with_automated_report.sql`

### Schema Changes
- Added `report_recipient_email VARCHAR(255) NULL` to `company`, and the matching `report_recipient_email String?` field on the `Company` Prisma model, plus `Company.daily_reports DailyReport[]`.
- Dropped the old `dailyreport`/`dailyreportentry` tables (manual SalesPerson-submitted report, one recipient + CC, no SWAT data) and the `DailyReport`/`DailyReportEntry` Prisma models backing them.
- Recreated `dailyreport` as the automated report record: `report_date` (per-day, unique per `user_id`+`report_date`), `user_id`, `company_id`, `recipient_email`, `subject`, `email_html` (`LONGTEXT`, exact HTML sent), `status` (`generated`/`sent`/`failed`), `error_message`, `sent_at`.
- Added `dailyreportproduct` (one row per employee+product covered by a report, snapshotting `product_name`), `dailyreportlead` (Lead Activity rows: `lead_id`, `lead_name`, `quadrant`, `follow_up_notes`), and `dailyreportswatmetric` (SWAT Activity Summary rows: `category`, `target`, `achieved`) — new Prisma models `DailyReportProduct`, `DailyReportLead`, `DailyReportSwatMetric`.
- Updated `User.daily_reports_created`/`daily_reports_received` relations to a single `User.daily_reports DailyReport[]`; `Product.daily_report_entries` renamed to `Product.daily_report_products`; `Lead.daily_report_entries` renamed to `Lead.daily_report_leads`.

### Purpose
Implements the automated Daily Report feature from `md files/daily_report/scopeForReport.md`: a scheduled job builds a per-employee, per-product activity report (Lead Activity from that day's `CallTracker` entries + SWAT Activity Summary from that day's `SwatPerformance` row) and emails it to the recipient configured on the employee's Company, instead of a user manually composing and sending a report. The old manual Daily Report feature (form, controller, routes, page) is fully replaced, not kept alongside the new one.

### Known Limitation
Delivery only happens for companies with `report_recipient_email` set; a report is still generated and persisted for browsing even if no recipient is configured, but `status` stays `failed` until the address is added.

## 2026-07-20 — Fix missing PRIMARY KEY on lead milestone history tables

### Migration File
`database/migrations/20260720/fix_history_tables_missing_primary_key.sql`

### Modified Tables

#### `lead_milestone_payment_history`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| MODIFY COLUMN | `id` | INT NOT NULL AUTO_INCREMENT | Was a plain non-key column |
| ADD | PRIMARY KEY | (`id`) | Was missing entirely |

#### `lead_milestone_bant_poa_history`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| MODIFY COLUMN | `id` | INT NOT NULL AUTO_INCREMENT | Was a plain non-key column |
| ADD | PRIMARY KEY | (`id`) | Was missing entirely |

### Purpose
Both tables were created by `20260707_create_lead_milestone_history_tables.sql` with `id` specified as `AUTO_INCREMENT PRIMARY KEY`, but on the deployed UAT database `id` ended up as a plain `NOT NULL` column with no key — likely because the tables pre-existed (from an earlier `prisma db push`) when that `CREATE TABLE IF NOT EXISTS` ran, so the correct DDL was skipped. Every insert into either table since then failed with a null-constraint violation on `id`; the app-layer logging calls (`logPaymentHistory` / `logBantPoaHistory` in `milestoneController.ts`) swallow the error, so payment collections and BANT POA edits kept saving to `lead_milestone` normally while their history trail silently stayed empty. Confirmed both tables had 0 rows before this fix, so no data was lost. Applied directly to the connected database in addition to the migration file.

### Known Limitation
None — fix is structural, no data migration needed since both tables were empty.

## 2026-07-17 — Cashflow Privileges: Management Access

### Migration File
`database/migrations/20260717/add_cashflow_management_access.sql`

### Schema Changes
- Added `cashflow_management_access BOOLEAN NOT NULL DEFAULT false` to `user`, and the matching `cashflow_management_access Boolean @default(false)` field on the `User` Prisma model.
- Added new table `cashflow_management_company` (`id`, `user_id`, `company_id`, `created_at`), with a unique key on `(user_id, company_id)` and cascading FKs to `user.id` and `company.id`, plus the matching `CashflowManagementCompany` Prisma model and its `User.cashflow_management_companies` / `Company.cashflow_managers` relations.

### Purpose
Implements the "Cashflow Privileges" section from `md files/30-6-26-taskFile/roleaccess.md`: a new **Management Access** permission, configurable per-user from User Management → Privileges, that grants company-scoped visibility into the Cashflow Report for all BDEs within the assigned companies, bypassing the normal Sales Person/Sales Manager reporting-hierarchy restriction. Deliberately kept independent of the existing `User.managed_companies` relation, which is unrelated (it scopes which companies a Sales Manager may invite new Sales Persons into, and is only ever set for the `SalesManager` role) — Management Access must be assignable to any role.

### Known Limitation
Scoped to the Cashflow Report only; the Cashflow Tracker's existing BDE-only filtering is unchanged. The BDE filter dropdown on the Cashflow Report is also unchanged (still sourced from `GET /lead-gen/bdes`, which remains role/hierarchy-scoped) — a Management Access user sees all BDEs' rows in the report body for their assigned companies, but the BDE dropdown itself will only list names from their own hierarchy.

## 2026-07-11 — Add POA Status to BANT POA History (CR11)

### Migration File
`database/migrations/20260711/add_poa_status_to_bant_poa_history.sql`

### Schema Changes
Added `poa_status VARCHAR(20) NULL` to `lead_milestone_bant_poa_history`, and the matching `poa_status String? @db.VarChar(20)` field on the `LeadMilestoneBantPoaHistory` Prisma model.

### Purpose
CR11 adds a "POA History" popup to the Cashflow Report (and enriches the existing BANT POA history tab on the Cashflow Tracker) showing Date / POA / POA Status / POA EDC / Updated By per entry. `poa_status` changes were previously not captured in this audit table at all (only `bant_poa`/`bant_poa_edc` changes triggered a history row) — `updateMilestone` now also logs a history row whenever `poa_status` changes on its own, and stores the POA Status value in effect at that point in time.

### Known Limitation
Rows logged before this migration have no `poa_status` value (shown blank in the history popup), since it was never recorded prior to this change — no backfill is possible since the historical value was never captured.

## 2026-07-10 — Add Remarks to Payment Collection History (CR9)

### Migration File
`database/migrations/20260710/add_remarks_and_backdated_collection.sql`

### Schema Changes
Added `remarks VARCHAR(255) NULL` to `lead_milestone_payment_history`, and the matching `remarks String? @db.VarChar(255)` field on the `LeadMilestonePaymentHistory` Prisma model.

### Purpose
CR9 moves payment collection entry into the Collection History popup (an "Add Collection" mini-form: Amount, Date, Remarks) instead of the old inline table input, and the popup's history table now displays a Remarks column per transaction (e.g. "Advance Collection", "Final Collection") to match the CR9 spec's example table. `collection_date` already existed and was already settable per-row; the Add Collection form simply starts passing an explicit date instead of relying on the column's `now()` default, so backdated collections can roll into the correct month/week for the new Period Expected/Collected/Pending calculation (see CR9.md).

### Known Limitation
No validation prevents a `remarks` value with only whitespace; treated as optional free text, consistent with `bant_poa`.

## 2026-07-09 — Add Collection Status to Lead Milestone (CR7)

### Migration File
`database/migrations/20260709/add_collection_status_to_lead_milestone.sql`

### Schema Changes
Added `collection_status VARCHAR(20) NOT NULL DEFAULT 'Pending'` to `lead_milestone`, and the matching `collection_status String @default("Pending")` field on the `LeadMilestone` Prisma model.

### Purpose
Cashflow Tracker enhancement (CR7): an auto-calculated Collection Status (`Pending` / `Partial Paid` / `Fully Paid`) derived from expected vs. total collected amount on every milestone save, with a manual `Stuck` override that a user can set at any time and which sticks (is never auto-recalculated away) until they manually change it to something else. Distinct from `poa_status` and the existing workflow `status` column. Computed and persisted in `updateMilestone` (`milestoneController.ts`) and surfaced on both the Cashflow Tracker detail page and the Cashflow Report.

### Known Limitation
No audit trail is kept for `collection_status` changes (unlike `bant_poa`/`bant_poa_edc`), consistent with how `poa_status` is also untracked — deliberate, since this status is expected to change freely as collections come in.

## 2026-07-08 — Add POA Status to Lead Milestone

### Migration File
`database/migrations/20260708/add_poa_status_to_lead_milestone.sql`

### Schema Changes
Added `poa_status VARCHAR(20) NOT NULL DEFAULT 'Pending'` to `lead_milestone`, and the matching `poa_status String @default("Pending")` field on the `LeadMilestone` Prisma model.

### Purpose
Cashflow Tracker UI enhancement: a per-milestone POA Status dropdown (Pending / In Progress / Completed) that users can update independently of the BANT POA text/EDC fields and the existing workflow `status` column. Persisted via the existing `PUT /leads/:id/milestones/:mid` endpoint (`updateMilestone` in `milestoneController.ts`).

### Known Limitation
No audit trail is kept for `poa_status` changes (unlike `bant_poa`/`bant_poa_edc`, which log to `lead_milestone_bant_poa_history`) — deliberate, since POA Status is meant to be freely editable at any time rather than tracked as a discrete event.

## 2026-07-07 — Lead Milestone Payment & BANT POA History (CR1)

### Migration File
`database/migrations/20260707/create_lead_milestone_history_tables.sql`

### New Tables
- `lead_milestone_payment_history` — `id, lead_milestone_id, lead_id, collected_amount, collection_date, collected_by_id, created_at`. FKs: `lead_milestone_id → lead_milestone(id)` CASCADE, `lead_id → Lead(id)` CASCADE, `collected_by_id → User(id)` RESTRICT.
- `lead_milestone_bant_poa_history` — `id, lead_milestone_id, lead_id, bant_poa (TEXT), bant_poa_edc, updated_by_id, updated_at`. Same FK pattern.

### Prisma Schema Changes
Added `LeadMilestonePaymentHistory` and `LeadMilestoneBantPoaHistory` models, plus reverse-relation arrays on `LeadMilestone`, `Lead`, and `User`.

### Purpose
`lead_milestone.actual_amount` and `bant_poa`/`bant_poa_edc` were being overwritten on every update instead of preserving prior values, which broke month-wise cashflow reporting (a payment collected in June and another in July both landed under whichever month was saved last) and left no audit trail for BANT POA changes. These new append-only tables record every payment collection and every BANT POA update as a separate row; `lead_milestone.actual_amount` itself is now always recomputed as the sum of its payment history rather than being written directly from user input.

### Backfill
Migration seeds one history row per existing milestone that already had a nonzero `actual_amount` (using `updated_at`/`created_at` as the collection date, since per-installment dates aren't recoverable from the old schema) and one row per milestone with an existing `bant_poa` value. Both inserts are idempotent (`NOT EXISTS` guarded) and safe to re-run.

### Known Limitation
Legacy multi-payment history collapses into a single lump-sum entry dated at the milestone's last update — true historical per-payment dates are not recoverable.

## 2026-07-07 — UAT schema sync: table casing, missing FKs/columns/types

### Migration File
`database/migrations/20260707/uat_schema_sync.sql` (UAT — reviewed, not yet executed)
`database/migrations/20260707/prod_table_casing_sync.sql` (production companion — **not verified against a live prod dump, do not run yet**)

### Schema Changes
Added explicit `@@map("lowercase_name")` in `schema.prisma` to the 52 models that previously had none (`User`, `Lead`, `PlanOfAction`, `Vertical`, `PaymentType`, `DailyReport`, `DailyReportEntry`, etc. — full list in the migration file header). This finally resolves the case-folding risk flagged in the 2026-07-04 entry below: Prisma no longer depends on the OS silently matching table names case-insensitively.

### UAT Changes (`angler_uat_crm`)
Compared UAT (via a structure-only `phpMyAdmin` dump supplied by the user, MariaDB 10.11 on Ubuntu — case-sensitive table names) against dev (`crm`, queried live via `information_schema`) and against `schema.prisma`. Findings and fixes:

- **52 tables renamed** from PascalCase to lowercase to match dev/the new `@@map` values (e.g. `PlanOfAction` → `planofaction`, `User` → `user`).
- **5 leftover objects renamed to `_deprecated_*`** (not dropped, no data loss): `Client_Company`, `Cashflow_Tracker`, `Cashflow_Milestone`, `Lead_Milestone` were orphaned duplicates left over from the botched 2026-07-04 baseline migration (see below) — UAT had both the old mis-cased copies *and* the correct lowercase ones. `User_old` was an unrelated pre-existing backup table not referenced anywhere in `schema.prisma`.
- **8 missing foreign keys added** on the correct lowercase `cashflow_tracker`/`cashflow_milestone`/`lead_milestone` tables — the 2026-07-05 production migration's `IF NOT EXISTS` FK statements never actually got applied to UAT's copies of these tables.
- **5 missing columns added**: `callactivitylog.action_type`, `lead.salutation`, `leadquadranthistory.movement_type`, `user.role`, `user.status`.
- **7 column type/precision fixes**: `bulkuploadstaging.original_row_data`/`mapped_data` (`LONGTEXT` → `TEXT`), and 5 datetime columns widened to `DATETIME(3)` to match dev's millisecond precision (`bulkuploadstaging.moved_at`/`date`/`next_follow_up_date`, `lead.quadrant_changed_at`/`enquiry_date`).

### Known Limitation
`Enquiry.converted_lead` (an `INT NULL` column) exists in UAT but not in dev or `schema.prisma` — looks like a leftover from before the field was renamed to `converted_lead_id`. Left untouched pending confirmation it's safe to drop; no `DROP COLUMN` was performed without explicit approval.

The production companion migration (`20260707_prod_table_casing_sync.sql`) only handles the table rename — it assumes production has none of UAT's leftover orphan tables and none of the 5 column/7 type diffs found in UAT, based on `DATABASE_CHANGELOG.md` history. That assumption has **not** been verified against a live production schema dump; do this before ever running it.

## 2026-07-05 — Create Cashflow, Lead Milestone & Daily Report tables on production

### Migration File
`database/migrations/20260705/create_cashflow_lead_milestone_tables.sql`

### New Tables
`client_company`, `Vertical`, `PaymentType`, `cashflow_tracker`, `cashflow_milestone`, `lead_milestone`, `DailyReport`, `DailyReportEntry`

### Purpose
Production was missing these 8 tables entirely, causing `PrismaClientKnownRequestError P2021` ("table does not exist") when saving a Lead (`client_company`, `lead_milestone`) and fetching Daily Reports. The tables existed in `schema.prisma` and in the dev database (added via `db push`/ad-hoc SQL) but the only migration file covering them, `server/prisma/migrations/20260704120000_create_cashflow_and_dailyreport_tables/migration.sql`, was a **dev-only baseline** (registered via `prisma migrate resolve --applied`, never actually executed) and was never copied into `database/migrations/` for production deployment.

That dev baseline file also has incorrect table-name casing for several tables (`Client_Company`, `Cashflow_Tracker`, `Cashflow_Milestone`, `paymenttype`, `dailyreport`, `dailyreportentry`, and an `ALTER TABLE Lead_Milestone` that doesn't match the table it creates). This didn't surface in dev because Windows MySQL is case-insensitive for table names, but would fail or silently mismatch on production's case-sensitive Ubuntu MySQL. The new migration uses the exact casing `schema.prisma` expects for each model (lowercase for models with an explicit `@@map`, PascalCase for models without one), so no `schema.prisma` changes were needed.

### Known Limitation
None — `IF NOT EXISTS` on tables and FKs makes this migration safe to re-run.

## 2026-07-04 — Baseline Prisma migration for Cashflow & Daily Report tables

### Migration File
`server/prisma/migrations/20260704120000_create_cashflow_and_dailyreport_tables/migration.sql`

### Purpose
No schema change. These 8 tables already existed in the dev database (added earlier via ad-hoc SQL scripts outside `prisma/migrations`), so `_prisma_migrations` had no record of them and `npx prisma migrate dev` could not be used safely without risking re-running unrelated pending migrations. This migration file was generated from the live `SHOW CREATE TABLE` output (uses `IF NOT EXISTS` so it is a no-op if ever run against a DB that already has these tables) and registered via `prisma migrate resolve --applied` so the migration history now matches `schema.prisma`. **No data was modified**; row counts were verified unchanged before/after.

### Tables Covered
`client_company`, `vertical`, `paymenttype`, `cashflow_tracker`, `cashflow_milestone`, `dailyreport`, `dailyreportentry`, `lead_milestone` — see migration.sql for full column/index/FK definitions.

### Known Limitation
The 9 pre-existing migrations under `server/prisma/migrations` (`20251126053014_init` through `20260627103001_os`) are still **not** marked as applied in this dev database (the `_prisma_migrations` table did not exist before this change). Running `prisma migrate deploy` against this database will attempt to apply all of them and will likely fail with "table/column already exists" errors, since the underlying schema was kept in sync via direct SQL/`db push` rather than through Prisma Migrate. Baselining the full history (marking all 9 as applied via `prisma migrate resolve --applied`, one at a time, after confirming each has no real drift) was out of scope for this task but is recommended before this database is treated as a migration-deploy target.

Separately, the `Vertical` and `PaymentType` Prisma models have no `@@map` attribute, so Prisma Client queries them using the literal model name (`Vertical`, `PaymentType`). The actual tables are lowercase (`vertical`, `paymenttype`). This works today because MySQL on Windows dev defaults to case-insensitive table name matching, but will break on a case-sensitive MySQL configuration (the common default on Ubuntu/Linux, per this project's production stack). Recommend adding `@@map("vertical")` and `@@map("paymenttype")` to `schema.prisma` before production deployment.

## 2026-07-04 — Add order_won_at to Lead

### Migration File
`database/migrations/20260704/add_lead_order_won_at.sql`

### Modified Tables

#### `Lead`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `order_won_at` | DATETIME(3) NULL | Stamped exactly once, when `sales_stage` transitions to "Order Won"; never overwritten afterward |

### Purpose
The SEAL Dashboard bucketed Order Won leads by `updated_at` for monthly/weekly achievement reporting. Since `updated_at` bumps on any field edit, a lead won last month but touched again this month (note added, correction, etc.) shifted into the wrong month's achievement figures. `order_won_at` is set once at the moment of the "Order Won" transition (in both lead creation and update flows in `leadController.ts`) and is not affected by later edits, giving an accurate, stable achievement date. `sealController.ts` now filters/buckets Order Won leads by `order_won_at` instead of `updated_at`.

### Known Limitation
Leads that were already marked "Order Won" **before** this change was deployed will have `order_won_at = NULL` and will not appear in SEAL achievement figures until backfilled. A one-time backfill (`order_won_at = updated_at` for existing Order Won leads, as a best-effort approximation) should be run before/at deployment if historical achievement data must remain visible.

## 2026-07-04 — Call Tracker "Move to Pipeline"

### Migration File
`database/migrations/20260704/add_call_tracker_pipeline_action.sql`

### Modified Tables

#### `CallTracker`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `pipeline_action` | VARCHAR(20) NULL | Selected "Move to Pipeline" route: `Quadrant`, `Nurturing`, or `Enquiry` |

#### `Enquiry`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `call_tracker_id` | INT NULL | Foreign key referencing `CallTracker.id`, set when a call is moved via "Move to Enquiry" |
| ADD CONSTRAINT | `fk_enquiry_call_tracker` | FOREIGN KEY | `Enquiry.call_tracker_id → CallTracker.id`, ON DELETE SET NULL |
| ADD INDEX | `idx_enquiry_call_tracker_id` | UNIQUE INDEX | Enforces one Enquiry per originating Call Tracker record |

### Purpose
Renames the Call Tracker "Moved to Quadrant" Yes/No field to "Move to Pipeline", replacing it with a dropdown (Move to Quadrant / Move to Nurturing / Move to Enquiry). "Move to Quadrant" preserves the existing Lead creation flow unchanged. "Move to Nurturing" creates a Lead with Quadrant and Sales Stage set to Nurturing. "Move to Enquiry" creates a record in the Enquiry Tracker instead of a Lead.

## 2026-07-01 — Add requires_requalification to Lead

### Migration File
`database/migrations/20260701/add_lead_requires_requalification.sql`

### Modified Tables

#### `Lead`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `requires_requalification` | BOOLEAN NOT NULL DEFAULT false | Flags leads reset by Nurturing stage or nightly auto-degradation until Lead Score + BANT are re-entered |

### Purpose
Supports the updated Quadrant/Sales Stage lifecycle: whenever a lead is moved to Nurturing or auto-degraded by the nightly cron, its Lead Score and BANT values are reset and it must be requalified. This flag drives the requalification notification shown on Lead View, Lead Edit, Dashboard widgets, and the lead listing badge/icon.

## 2026-06-29 — Add company_id to Product

### Migration File
`database/migrations/20260629/add_company_to_product_master.sql`

### Modified Tables

#### `Product`
| Change | Column | Type | Details |
|--------|--------|------|---------|
| ADD COLUMN | `company_id` | INT NULL | Foreign key referencing `Company.id` |
| ADD INDEX | `idx_product_company_id` | INDEX | Index on `company_id` for FK join performance |
| ADD CONSTRAINT | `fk_product_company` | FOREIGN KEY | `Product.company_id → Company.id`, ON DELETE SET NULL |

### Purpose
Products can now be mapped to a Company. This enables company-wise product filtering across the CRM, including Cashflow Reports and other report modules.
