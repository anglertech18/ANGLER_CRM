# KRA Performance Tracker

Feature reference document for the KRA Tracker — a sub-module of the Calls
module (`Calls.tsx` tabs: "Call Tracker" / "KRA Tracker" / "SWAT Meeting"),
alongside `[[call-tracker-module]]` and `[[db-upload-module]]`.

---

## 1. Files

| Path | Purpose |
|------|---------|
| `client/src/pages/calls/KraTracker.tsx` | Main page component + `TableRow` sub-component |
| `client/src/pages/KraTrackerPage.tsx` | Thin standalone wrapper around `KraTracker` |
| `server/src/routes/kraRoutes.ts` | Route registration (`GET /`), mounted at `/api/kra-tracker` |
| `server/src/controllers/kraController.ts` | Single controller: `getKraMonthlyData` |

Routes require `authenticate` only — no `checkPrivilege` middleware (unlike
`[[call-tracker-module]]`'s `/call-tracker` group, which requires
`checkPrivilege('Calls', ...)`).

**Do not confuse with `[[swat-performance-module]]`** — the KRA Tracker
reads `SwatPerformance` rows as one of several data sources but is a
different grid with a different shape (daily columns across a month vs.
SWAT's per-day/per-product form), and a different underlying question: KRA
answers "how did this BDE do, day by day, this month" across revenue,
devices, leads, and activity; SWAT answers "did today's targets get hit."

---

## 2. Frontend Flow

```
KraTracker (page load)
│
├─ useEffect #1 — fetchFilters
│   ├─ GET /users  (admin/manager only)
│   └─ GET /seal/poas/mapped-product-services
│       → setMappedItems(items)
│       → auto-select first item: setSelectedMappedKey(`${type}:${id}`)
│
├─ useMemo — derives { apiType, apiProductId } from selectedMappedKey
│   "product:3"        → { apiType: 'Product', apiProductId: '3' }
│   "service:IM Services"  → { apiType: 'IM Service', apiProductId: '' }
│   "service:EIT Services" → { apiType: 'EIT Service', apiProductId: '' }
│
└─ useEffect #2 — fetchKraData
    deps: [selectedMonth, selectedUserId, apiType, apiProductId]
    GET /kra-tracker?month=YYYY-MM&user_id=X&type=...&product_id=...
    → setTrackerData(response.data)
```

**Filter controls**
- **User** — disabled (shows self) for SalesPerson; dropdown list for CEO/SalesManager
- **Product / Service** — single `<select>` with `<optgroup>` for Products and Services, populated from the logged-in user's mapped items only (not all products)
- **Period** — `<input type="month">` defaulting to current month

**Grid rendering**
`sections` array defines 6 section blocks (see §7). Each block renders a blue header row followed by data rows via `<TableRow>`. The table has:
- Sticky first column (metric label, 280 px)
- Sticky second column (monthly target or achieved total)
- Day columns 1–N (N = days in selected month)

---

## 3. API Endpoint

```
GET /api/kra-tracker
```

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `month` | yes | `YYYY-MM` format |
| `user_id` | no | defaults to authenticated user |
| `type` | yes | `Product` \| `EIT Service` \| `IM Service` |
| `product_id` | conditional | required when `type = Product` |

**Authentication**: JWT via `authenticate` middleware.

**RBAC**
- `SalesPerson` — always sees own data only (`user_id` param is ignored, forced to self server-side)
- `SalesManager` — can see self + direct subordinates (`reporting_manager_id`); returns `403` for anyone outside that set
- `CEO` — unrestricted

---

## 4. Backend Controller Logic (`getKraMonthlyData`)

The controller executes the following steps in sequence:

1. **Parse month** → derive `startOfMonth` / `endOfMonth` (UTC)
2. **Resolve targetUserId** from query param; apply RBAC override
3. **Fetch targets** — based on `type`:
   - `Product`: query `UserProductTarget` (unique by `user_id + product_id`)
   - `EIT Service` / `IM Service`: query `UserServiceTarget` (first match by `user_id + service_department`)
4. **Fetch multipliers** — based on `type`:
   - `Product`: query `Product` master record → 8 multiplier fields (`device_q1–q4_multiplier`, `lead_q1–q4_multiplier`)
   - `EIT Service`: query `EitService` → `lead_q1_multiplier` only
   - `IM Service`: query `ImService` → `lead_q1_multiplier` only
5. **Fetch SwatPerformance records** — filtered by `user_id + date range + product_id/service_department`; grouped by day of month; multiple records on the same day are **summed** (all numeric fields except IDs)
6. **Fetch Order Won leads** (`leadsDailyData`, `salesDeviceDailyData`) — leads with `sales_stage.name = 'Order Won'` updated in the month; day key = `updated_at` day; device count taken from `sales_device || device_count || license_count`
7. **Build CallTracker base filter** — `user_id + date range + product/service`
8. **Emails Sent** (`emailDailyData`) — CallTracker rows where `email_status_id IS NOT NULL`; count per day
9. **LinkedIn Requests** (`linkedinReqDailyData`) — CallTracker rows where `linkedin_sent = true`; count per day
10. **Calls Achieved** (`callsAchievedDailyData`) — CallTracker rows where `call_status_id IS NOT NULL`; count per day
11. **Leads Created** (`leadsCreatedDailyData`) — Leads created in month by `lead_owner_id`; day key = `created_at` day
12. **Quarterly leads + devices** (`q1–q4LeadsDailyData`, `q1–q4DevicesDailyData`) — Leads where `quadrant IN [Q1,Q2,Q3,Q4]` and `quadrant_updated_at` in month; day key = `quadrant_updated_at ?? created_at`; count and device sum split by quadrant value

**Response shape**

```json
{
  "month": "2026-05",
  "user_id": 12,
  "monthly_targets": { "revenue_target": 0, "device_target": 0, "leads_target": 0, ... },
  "multipliers": { "device_q4": 1.5, "device_q3": ..., "lead_q1": 2 },
  "dailyData": { "1": { "calls_achieved": 5, ... }, "2": { ... } },
  "leadsDailyData": { "3": 2, "10": 1 },
  "salesDeviceDailyData": { "3": 4, "10": 2 },
  "emailDailyData": { "1": 3 },
  "linkedinReqDailyData": { "1": 2 },
  "callsAchievedDailyData": { "1": 8 },
  "leadsCreatedDailyData": { "2": 1 },
  "q1LeadsDailyData": { ... },
  "q2LeadsDailyData": { ... },
  "q3LeadsDailyData": { ... },
  "q4LeadsDailyData": { ... },
  "q1DevicesDailyData": { ... },
  "q2DevicesDailyData": { ... },
  "q3DevicesDailyData": { ... },
  "q4DevicesDailyData": { ... }
}
```

---

## 5. Data Model (DB Tables Used)

| Table | Used For |
|-------|---------|
| `User` | RBAC subordinate lookup |
| `UserProductTarget` | Revenue, device, leads, calls, linkedin, visit targets per user per product |
| `UserServiceTarget` | Same targets but for EIT/IM service departments |
| `Product` | 8 quarterly multiplier fields (`device_q1–q4_multiplier`, `lead_q1–q4_multiplier`) |
| `EitService` | `lead_q1_multiplier` |
| `ImService` | `lead_q1_multiplier` |
| `SwatPerformance` | Daily achieved metrics (calls, activities, demos, proposals, linkedin, etc.) — see `[[swat-performance-module]]` |
| `Lead` | Order Won count, device count, created count, quadrant distribution |
| `SalesStage` | Joined to filter `name = 'Order Won'` leads |
| `CallTracker` | Email sent count, LinkedIn request count, calls achieved count — see `[[call-tracker-module]]` |

**Key `SwatPerformance` fields read by the KRA grid**

| Field | KRA Row |
|-------|---------|
| `revenue_collected_achieved` | Revenue – Achieved |
| `sales_order_won_achieved` | Sales Lead – Achieved |
| `calls_achieved` | (overridden by CallTracker count; fallback) |
| `linkedin_achieved` | LinkedIn Connections Achieved |
| `demos_achieved` | Number of Demos Given |
| `proposals_achieved` | Number of Proposals Submitted |
| `direct_visit_achieved` | Direct Visit Achieved |

---

## 6. Business Logic

### Target Column

The `Target` sticky column in the grid shows a **monthly total** or **per-day target**:

| Row | Logic |
|-----|-------|
| `revenue_target` | `monthly_targets.revenue_target` direct |
| `sales_device_target` | `monthly_targets.device_target` direct |
| `sales_lead_target` | `monthly_targets.sales_target` direct |
| `leads_target` | `monthly_targets.leads_target` direct |
| `eff_calls_target` | `monthly_targets.calls_target × days_in_month` |
| `email_target` | `monthly_targets.calls_target` (reuses calls target) |
| `linkedin_target` | `monthly_targets.linkedin_target` |
| `visit_target` | `monthly_targets.direct_visit_target` |
| `qN_devices_target` | `leads_target × multipliers.device_qN` |
| `qN_leads_target` | `leads_target × multipliers.lead_qN` |

For **services** only `lead_q1_multiplier` exists; Q2–Q4 device/lead targets will render as 0.

### Day Cells (`getValue`)

Each day cell routes to one of two sources:

1. **External daily data map** — pre-keyed dictionaries keyed by `day` integer, returned directly from the API (e.g. `leadsDailyData[day]`)
2. **SwatPerformance `dailyData`** — indexed by day, field resolved via internal `mapping` object

`eff_calls_target` is special: every day cell shows the raw per-day target (`monthly_targets.calls_target`).

### Achieved Total Column

Sums the same source used by `getValue` across all 31 possible day slots.

---

## 7. KRA Grid Structure

The grid has **6 section blocks**, each rendered as a blue header row + data rows:

### Section 1 — Core Measures
| Row ID | Label | Source |
|--------|-------|--------|
| `revenue_target` | Revenue – Target | `UserProductTarget.revenue_target` |
| `revenue_achieved` | Revenue – Achieved | `SwatPerformance.revenue_collected_achieved` |
| `sales_device_target` | Sales Device – Target | `UserProductTarget.device_target` |
| `sales_device_achieved` | Sales Device – Achieved | `Lead` (Order Won, device count) |
| `sales_lead_target` | Sales Lead – Target | `UserProductTarget.sales_target` |
| `sales_lead_achieved` | Sales Lead – Achieved | `SwatPerformance.sales_order_won_achieved` |
| `leads_target` | Leads – Target | `UserProductTarget.leads_target` |
| `leads_achieved` | Leads – Achieved | `Lead` (Order Won, count) |

### Sections 2–5 — Q4, Q3, Q2, Q1 Devices (one section per quarter)
| Row ID | Label | Source |
|--------|-------|--------|
| `qN_devices_target` | QN Devices - Target | `leads_target × device_qN_multiplier` |
| `qN_devices_actuals` | QN Devices - Actuals | `Lead.device_count` grouped by quadrant + day |
| `qN_leads_target` | QN Leads Target | `leads_target × lead_qN_multiplier` |
| `qN_prospect_count` | QN Prospect Count | `Lead` count grouped by quadrant + day |

Leads are attributed to a day using `quadrant_updated_at` (falls back to `created_at`).

### Section 6 — Activity Tracking
| Row ID | Label | Source |
|--------|-------|--------|
| `eff_calls_target` | Effective Calls Target per Day | `monthly_targets.calls_target` |
| `eff_calls_achieved` | Calls Achieved | `CallTracker` (call_status_id IS NOT NULL) |
| `q1_direct_lead` | Q1 Direct Lead Achieved | `Lead` created in month (by `created_at`) |
| `industry_campaigns` | Industry Campaigns | **not implemented — always 0** |
| `email_target` | Direct Marketing Emails Target | `monthly_targets.calls_target` (shared field) |
| `email_sent` | Direct Marketing Emails Sent | `CallTracker` (email_status_id IS NOT NULL) |
| `linkedin_target` | LinkedIn Connections Target per Day | `monthly_targets.linkedin_target` |
| `linkedin_req` | LinkedIn Request Given | `CallTracker` (linkedin_sent = true) |
| `linkedin_achieved` | LinkedIn Connections Achieved | `SwatPerformance.linkedin_achieved` |
| `demos_given` | Number of Demos Given | `SwatPerformance.demos_achieved` |
| `demo_duration` | Duration of Demo | **not implemented — always 0** |
| `proposals` | Number of Proposals Submitted | `SwatPerformance.proposals_achieved` |
| `visit_target` | Direct Visit Target per Day | `monthly_targets.direct_visit_target` |
| `visit_achieved` | Direct Visit Achieved | `SwatPerformance.direct_visit_achieved` |
| `visit_duration` | Duration | **not implemented — always 0** |

---

## 8. External Data Sources

| Data Set | DB Table | Filter | Day Key |
|----------|----------|--------|---------|
| Order Won leads count | `Lead` | `sales_stage.name = 'Order Won'`, `updated_at` in month | `updated_at` day |
| Order Won device count | `Lead` | same as above | `updated_at` day |
| Emails sent | `CallTracker` | `email_status_id IS NOT NULL` | `date` day |
| LinkedIn requests | `CallTracker` | `linkedin_sent = true` | `date` day |
| Calls achieved | `CallTracker` | `call_status_id IS NOT NULL` | `date` day |
| Leads created (Q1 direct) | `Lead` | `created_at` in month, `lead_owner_id` | `created_at` day |
| Q1–Q4 prospect counts | `Lead` | `quadrant IN [Q1–Q4]`, `quadrant_updated_at` in month | `quadrant_updated_at ?? created_at` |
| Q1–Q4 device actuals | `Lead` | same | same |

All queries additionally filter by `product_id` or `service_department` to scope results to the selected product/service.

---

## 9. Known Edge Cases

**Service name singular/plural mismatch**
The mapped-product-services API returns `"IM Services"` and `"EIT Services"` (plural). The KRA API expects `"IM Service"` and `"EIT Service"` (singular). The frontend resolves this via a `serviceMap` lookup in `useMemo` before building the request:
```ts
const serviceMap: Record<string, string> = {
    'EIT Services': 'EIT Service',
    'IM Services': 'IM Service',
};
```

**Services only have Q1 multiplier**
`EitService` and `ImService` tables only carry `lead_q1_multiplier`. Q2–Q4 device and lead target rows will show `0` for service-type selections because the multiplier keys are absent from the response.

**SwatPerformance multi-record days**
If a BDE logs SWAT performance more than once on the same day (e.g. for different products under the same filter), the controller sums all numeric fields. ID and foreign key columns are excluded from summing.

**Calls Achieved source**
`eff_calls_achieved` is sourced from `CallTracker` (calls with a call status), not from `SwatPerformance.calls_achieved`. The `SwatPerformance` mapping for `eff_calls_achieved` exists in the code but is bypassed by the `externalSources` check in `getValue`.

**Unimplemented rows**
Three rows always display `0` — `industry_campaigns`, `demo_duration`, and `visit_duration` — because no backend data is wired for them.

**Product-scoped vs service-scoped lead queries**
Leads are filtered differently based on type:
- Product: `product_id = N`
- EIT Service: `product_or_service = 'EitService'`
- IM Service: `product_or_service = 'ImService'`
This means a lead must have the correct `product_or_service` value set at creation time to appear in service KRA reports.

**Email target reuses calls target field**
`email_target` reads `monthly_targets.calls_target`, not a dedicated email target field. This is intentional — the same per-day target is used for both effective calls and direct marketing emails.

---

## Related

- `[[call-tracker-module]]` — source of Calls Achieved, Emails Sent, LinkedIn Requests.
- `[[swat-performance-module]]` — source of Revenue/Sales Lead/LinkedIn/Demos/Proposals/Direct Visit achieved figures; a different grid answering a different question, not to be confused with this one.
- `[[lead-module]]` — source of Order Won counts/devices and Q1–Q4 quadrant distribution.
- Separate `CallLog`/`KraEntry` feature (`callController.ts`'s `logCall`/`getKRA`, `POST/GET /api/calls`) tracks a simpler daily `calls_target`/`calls_actual` counter per user against a `Lead` — unrelated to this monthly grid despite the shared "KRA" name; see `[[call-tracker-module]]` §3 for the disambiguation between `CallLog` and `CallTracker`.
