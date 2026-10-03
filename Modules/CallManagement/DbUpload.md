# DB Upload Module

Feature reference document for the DB Upload (bulk-upload staging) module —
`client/src/pages/calls/BulkUploads.tsx`, route `/call-management/db-upload`
(reached from the Call Tracker's Bulk Upload action).

---

## Overview

DB Upload is the review/claim workspace for prospect rows imported via Excel
that couldn't be routed straight into `[[call-tracker-module]]` because the
row had no resolvable Call Status. Rather than reject them, `bulkUpload`
parks them in the `BulkUploadStaging` table so a user can fill in the missing
fields (most importantly Call Status) and either save them in place, promote
one at a time, or bulk-transfer a selection into `CallTracker`.

The same import pass also handles the rows that *do* carry a Call Status —
those go straight into `CallTracker` with the normal create side effects
(`[[call-tracker-module]]` §6) and never touch this module at all.

Backend: `server/src/controllers/callTrackerController.ts`
(`downloadTemplate`, `bulkUpload`, `getStagedUploads`, `updateStagedRecord`,
`deleteStagedRecords`, `clearAllStagedRecords`, `transferStagedRecords`).
Routes: `server/src/routes/callTrackerRoutes.ts`, all under `/call-tracker`
(there is no separate `/db-upload` route prefix — it's the same router as
Call Tracker).

---

## 1. Template Download — `GET /call-tracker/template`

Generates an `.xlsx` (via `ExcelJS`) with:

- **Header row** (12 columns): `S No, Date, Product, Industry, Source of DB,
  Company Name, Location, Contact Person Name, Designation, Company Email,
  Personal Email, Mobile No`.
- **Hidden `Masters` sheet** carrying the active `Product` / `Industry` /
  `SourceOfDB` master names, used as the source lists for three dropdown
  data validations on the main sheet (columns C/D/E, rows 2–1001).
- **Date column** (`B`) formatted `dd/mm/yyyy` and validated to reject
  non-date values — whatever a user types is expected to import as
  `DD/MM/YYYY`.
- A sample row (`S No = 1`, today's date) pre-filled on row 2.

Downloaded from the UI via the "Download Template" button
(`handleDownloadTemplate` in `BulkUploads.tsx`).

---

## 2. Upload & Row Routing — `POST /call-tracker/bulk-upload`

`multer` single-file upload, field name `file`, capped at 10 MB
(enforced client-side before the request is even sent, and again by
`multer`'s server-side limit). Parses the workbook with `XLSX`, preferring a
sheet literally named `Call Tracker Upload`, else the first non-`Masters`
sheet.

For every row:

1. **Empty-row check** — a row with no Company Name, Mobile No, Contact
   Person Name, *and* no Call Status is rejected outright (counted as
   failed, written to the error report).
2. **Date** — parsed against `IMPORT_DATE_FORMATS` (`DD/MM/YYYY`,
   `YYYY-MM-DD`, `DD-MM-YYYY`, `MM/DD/YYYY`); must not be a future date.
3. **Product / Industry / Source of DB** — case-insensitive name lookup
   against the active master tables; an unresolvable name throws (row
   fails) — these are **not** silently dropped like some other optional
   fields.
4. **Company Name** — falls back to `"Unknown Company"` if blank (never
   blocks the row on its own).
5. **Mobile No** — non-digit characters stripped.
6. **Company Email / Personal Email** — validated against a basic email
   regex if present; invalid format fails the row.
7. **Email Sent / LinkedIn conn sent** — parsed as booleans (`yes`/`1`/`true`
   case-insensitive); `Email Sent = true` resolves to the `EmailStatus`
   named `"Sent"` if that master row exists.
8. **Call Status** — case-insensitive lookup against active `CallStatus`
   rows; if the column has a value that doesn't match any status name, the
   row fails (rather than silently staging it).
9. **Next Follow Up Date** — parsed the same way as Date; rejected if before
   the row's own Call Date.
10. **Moved to Quad** — accepts `Q1`–`Q4`, `NURTURING`, or the legacy
    shorthand `YES` (→ `Q4`) / `NO` (→ null); anything else fails the row.

**Routing decision**, once a row parses cleanly:

| Row has a resolvable Call Status? | Destination |
|---|---|
| Yes | Created directly as a `CallTracker` row — same `CallActivityLog`/`ActivityLog` side effects and pipeline-conversion trigger (`moved_to_quad` truthy or status = "Converted to Lead") as a manual create, per `[[call-tracker-module]]` §6 |
| No | Created as a `BulkUploadStaging` row — this is the "DB Upload" queue |

**Per-row failures** are collected and, if any exist, written to a
downloadable Excel error report at `/uploads/ErrorReport_<timestamp>.xlsx`
(dates reformatted to `DD/MM/YYYY` for readability); the response includes
`{ totalRows, imported, failed, errorReportUrl }`. The uploaded temp file is
deleted from disk after processing regardless of outcome.

---

## 3. Data Model — `BulkUploadStaging` (`@@map("bulkuploadstaging")`)

```
id                       Int       PK
user_id                  Int       FK → User          (original uploader)
product_id               Int?      FK → Product
claimed_by_id            Int?      FK → User           (set once moved to CallTracker)
moved_to_calltracker     Boolean   @default(false)
moved_at                 DateTime?
file_name                String?
original_row_data        String?   @db.Text            (raw JSON snapshot of the source Excel row)
mapped_data               String?   @db.Text            (legacy JSON field — superseded by individual columns below)
has_validation_error     Boolean   @default(false)
error_message            String?   @db.Text
created_at               DateTime  @default(now())

// Individual columns (replaces JSON storage in mapped_data)
date                     DateTime?
industry_id              Int?      FK → Industry
source_of_db_id          Int?      FK → SourceOfDB
company_name             String?
location                 String?
contact_person_name      String?
designation              String?
email_address            String?
personal_email           String?
mobile_no                String?
alternate_mobile_number  String?
business_potential       String?
email_status_id          Int?      FK → EmailStatus
linkedin_sent            Boolean   @default(false)
call_status_id           Int?      FK → CallStatus     (the field that determines staged vs. promotable)
next_follow_up_date      DateTime?
moved_to_quad            String?
remarks                  String?   @db.Text
```

`mapped_data` and `original_row_data` are legacy/audit fields — all reads and
writes in the current controller go through the individual columns, not JSON
parsing.

---

## 4. API Endpoints

All routes require `authenticate` + `checkPrivilege('Calls', <action>)`
(same route group as Call Tracker). CEO bypasses all privilege checks.

### GET `/call-tracker/staged`
Paginated, filtered list of staging rows still pending
(`moved_to_calltracker: false, call_status_id: null`).

**Query params:** `page`, `pageSize` (5–50, default 10), `uploadedById`,
`search` (company/contact name), `location`, `dateFrom`/`dateTo`,
`productId`, `industryId`.

See §5 RBAC for how `uploadedById` behaves per role.

### PUT `/call-tracker/staged/:id`
Updates one staging row's fields from the edit modal. Behaviour branches on
whether the submitted `call_status_id` ends up set:

- **No Call Status** → the staging row is updated in place (still pending);
  response `{ moved: false, converted: false }`.
- **Call Status present** → the row is promoted: a `CallTracker` record is
  created from the merged data, the usual `CallActivityLog`/`ActivityLog`
  side effects fire, and — if `moved_to_quad` resolves truthy (the UI's
  `'yes'` shorthand maps to `'Q1'`) or the resolved Call Status is
  "Converted to Lead" — `convertToLeadLogic()` runs, creating a Lead. The
  staging row itself is then updated with `moved_to_calltracker: true,
  claimed_by_id, moved_at` (kept for audit, not deleted). Response
  `{ moved: true, converted: <bool> }`.

Access is restricted to: the original uploader, a user mapped to the row's
`product_id` via `UserProductTarget`, or CEO. A row that's already been
claimed/moved (`moved_to_calltracker: true`) or doesn't match is a `404`.

### DELETE `/call-tracker/staged` (body `{ ids: number[] }`)
Deletes selected staging rows outright ("Discard"). Same access rule as
above (uploader, product-mapped user, or CEO) intersected with
`moved_to_calltracker: false`.

### DELETE `/call-tracker/staged/all`
Deletes **all** of the current user's own pending staging rows — no
product-mapping fallback, self only.

### POST `/call-tracker/transfer` (body `{ ids: number[] }`)
Bulk-moves selected staging rows straight into `CallTracker` — **regardless
of whether `call_status_id` is set** (unlike `updateStagedRecord`, which only
promotes once a Call Status has been chosen). Each row runs through the same
create + activity-log + conversion pipeline. Ownership on the new
`CallTracker` record always transfers to the user performing the transfer,
even if they weren't the original uploader.

- Excludes rows already flagged `has_validation_error: true` or already
  `moved_to_calltracker: true`.
- Per-row failures during transfer don't abort the batch — the row is left
  in staging with `has_validation_error: true` and an
  `Internal Transfer Error: ...` message, and the loop continues.
- Successfully transferred rows are marked `moved_to_calltracker: true,
  claimed_by_id, moved_at` (not deleted).
- Response: `{ transferred, failed, duplicates }` (`duplicates` is currently
  always `0` — no duplicate-detection logic exists in this path).

---

## 5. RBAC

Two different scoping shapes apply within this module — read them together,
since they don't match:

### List scope (`GET /staged`) — role-default, `uploadedById`-adjustable

| Role | Behaviour |
|---|---|
| `SalesPerson` | Always own uploads (`user_id = self`) — `uploadedById` is ignored |
| `SalesManager` | `uploadedById = 'all'` → self + direct reports; a specific team-member id → validated against that team set, falls back to self if not a subordinate; no param → defaults to own uploads only |
| `CEO` | Unrestricted, unless `uploadedById` narrows to a specific user |

### Claim / edit / delete / transfer scope — uploader-or-product-mapped, not manager/subordinate

`updateStagedRecord`, `deleteStagedRecords`, `transferStagedRecords` all use
a **different** rule than the list above: a non-CEO user may act on a row
if **either**

- they were the original uploader (`user_id = self`), **or**
- the row's `product_id` matches one of their own `UserProductTarget`
  mappings — regardless of who uploaded it or any manager/subordinate
  relationship.

`clearAllStagedRecords` is the one exception — strictly self-uploaded rows
only, no product-mapping fallback.

**Practical effect:** a `SalesPerson` mapped to "Aura" can claim/edit/delete
*any* unclaimed "Aura" row, even one uploaded by a completely unrelated
teammate or manager — this is intentional (it's how the "review and claim"
workflow is meant to work), not a scoping bug, but it means the list view's
default scope and the claim/edit/delete/transfer scope can disagree: a
`SalesManager` might see only their own team's rows by default, yet still be
able to act on a product-matched row uploaded by someone outside their team
if they specifically navigate to it.

---

## 6. Frontend (`BulkUploads.tsx`)

### Upload flow
- "Download Template" → `GET /call-tracker/template`, saved as
  `CallTracker_Template.xlsx`.
- File picker + "Upload" → client rejects files over 10 MB before sending;
  on success shows `{ totalRows, imported, failed, errorReportUrl }` and
  invalidates the staged-rows query so the list refreshes.

### List (server-side paginated, `refetchInterval: 30000`)
- Filters (all server-side, persisted via `usePersistentFilters('bulkuploads', …)`):
  search, location, date range, product, industry, and — CEO/SalesManager
  only — an uploader selector (`showUploaderFilter`). The uploader dropdown
  options differ by role: CEO gets "All Users" + every Manager/Person;
  SalesManager gets "Me (Default)" / "All Team" / each direct report.
- Row actions: **Edit** (opens a modal pre-filled from the staged row's
  individual columns — dates reformatted to `YYYY-MM-DD` for the date
  inputs, `moved_to_quad` collapsed to a `'yes'`/`''` toggle in the form
  state), **Discard** (single or bulk via checkbox selection), and bulk
  **Transfer Selected**.
- Selection (`selectedIds`) is cleared automatically whenever filters/page
  change, so a stale selection can't act across an unrelated result set.

---

## 7. Known Issues / Follow-ups

- **`duplicates` is always 0** in `transferStagedRecords`'s response — no
  duplicate-detection logic is actually implemented in that path, despite
  the field existing in the response shape.
- **List scope vs. claim scope mismatch** (see §5) — worth confirming with
  product ownership whether this is the intended "anyone mapped to the
  product can claim it" model or should be tightened to match the list's
  manager/subordinate scoping.
- **`mapped_data` / `original_row_data` are effectively dead** for anything
  written after the migration to individual columns — kept for
  audit/debugging only; don't add new logic that parses them.
- Shares its known issues around debug logging / duplicate migration files
  with `[[call-tracker-module]]`, since both live in the same controller and
  route file.

---

## Related

- `[[call-tracker-module]]` — the destination table for both the auto-routed
  (Call Status present) and staged-then-promoted rows.
- `md files/call/dbUpload.md` — placeholder for an earlier spec of this
  module (currently empty in the repo).
