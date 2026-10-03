# Daily Report Module – Updated Development Plan

## 1. Objective

Upgrade the CRM Daily Report functionality so that the system automatically generates and emails an end-of-day report for only the BDE/users who are enabled for Daily Reports.

The report must use existing CRM data and must not require manual report creation.

## 2. Daily Report Automation

### Expected Flow

```text
End of Working Day
        ↓
Scheduler / Cron
        ↓
Get Daily Report Enabled Users
        ↓
Generate Report for Each User
        ↓
Get Company Daily Report Recipient
        ↓
Send Email
        ↓
Store Send Status
```

Users should not manually trigger or submit the report.

## 3. BDE Daily Report Enable/Disable

Not every CRM user should receive a Daily Report.

Example:

```text
BDE / User       Daily Report
--------------------------------
Selvam           Enabled
Antony           Enabled
Kumar            Enabled
Intern           Disabled
Test User        Disabled
```

Add a Daily Report enable/disable configuration for BDE/users.

Suggested field:

```text
daily_report_enabled
```

Type:

```text
BOOLEAN
```

Recommended default:

```text
false
```

Only users with:

```text
daily_report_enabled = true
```

should be processed by the scheduler.

Do not use the user's general active/inactive status as the Daily Report setting.

## 4. Email Recipient

Use the existing Company Master configuration for the Daily Report recipient.

Do not hardcode the CEO email address.

```text
Company Master
    ↓
Daily Report Recipient
    ↓
Email To
```

Validate that the recipient exists before sending.

## 5. Email Subject

Use:

```text
DD/MM/YYYY Day Report - {BDE Name}
```

Example:

```text
12/08/2026 Day Report - Selvam
```

## 6. Lead Report Logic

### Critical Requirement

The lead section must include **all leads whose current quadrant is Q1, Q2, Q3, or Q4**.

Lead status must NOT be used as the inclusion condition.

### Include

```text
Q4
Q3
Q2
Q1
```

### Exclude

```text
Any lead without a Q1-Q4 quadrant
```

Nurturing, Order Won, and Order Lost are **not filters**. If a lead has Q1-Q4, it is included regardless of status.

Example:

```text
Lead A → Q4 → Order Won       → Include
Lead B → Q4 → Nurturing       → Include
Lead C → Q3 → Order Lost      → Include
Lead D → Q2 → Open            → Include
Lead E → Q1 → Order Won       → Include

Lead F → Nurturing → No Q     → Exclude
Lead G → Order Lost → No Q    → Exclude
```

Core filtering concept:

```text
BDE/User
AND
Quadrant IN (Q1, Q2, Q3, Q4)
```

Do not add `status = Order Won` to the lead selection logic.

## 7. Company + Product + Quadrant Grouping

A BDE can handle multiple companies.

Do not assume:

```text
BDE → One Company
```

Instead use:

```text
BDE
 ↓
Lead
 ↓
Product
 ↓
Product → Company Mapping
```

The company should be determined from the existing product/company mapping in the CRM.

## 8. Multi-Company Example

Example:

```text
BDE: Selvam

Product       Company
-----------------------------
Aura          Angler Technologies
Vendora       Angler Technologies
FMS           Trinetra
```

Selvam's report should be:

```text
Angler Technologies

Aura
    Q4
    Q3
    Q2
    Q1

Vendora
    Q4
    Q3
    Q2
    Q1


Trinetra

FMS
    Q4
    Q3
    Q2
    Q1
```

Only products actually mapped to the company should appear under that company.

Do not hardcode product/company mappings inside the Daily Report code.

## 9. Report Hierarchy

```text
BDE
 ↓
Company
 ↓
Product
 ↓
Quadrant
 ↓
Lead
```

Example:

```text
Selvam

Angler Technologies

Aura

Q4
Lead 1
Lead 2

Q3
Lead 3

Q2
Lead 4

Q1
Lead 5


Vendora

Q4
Lead 6

Q2
Lead 7


Trinetra

FMS

Q3
Lead 8

Q1
Lead 9
```

## 10. Lead Details

Each lead row should contain:

```text
Lead Name
Quadrant
Sales Engagement Remarks
Sales Engagement Date
Status
```

Status should be displayed but must not control whether the lead is included.

## 11. SWAT Performance

Add the existing SWAT performance values to the email:

```text
SWAT Performance

Calls              : XX
Activities         : XX
Email Campaign     : XX
LinkedIn Conn Sent : XX
Demo               : XX
Proposal           : XX
Direct Visit       : XX
```

Use existing SWAT/activity/achievement data. Do not create another manual data-entry source.

## 12. Today's Sales Activity

Add:

```text
Today's Sales Activity
```

Display:

```text
Lead Name | Quadrant | Sales Engagement | Status
```

Use the existing CRM Sales Engagement/activity logic and filter according to the report date and BDE/user.

## 13. Backend Architecture

Keep data retrieval, report generation and email sending separate.

### 13.1 Daily Report Data Service

Suggested responsibilities:

```text
getDailyReportUsers()
getLeadReport(userId, reportDate)
getSwatPerformance(userId, reportDate)
getSalesActivities(userId, reportDate)
```

The lead service must apply:

```text
user_id = current BDE
AND
quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')
```

Then resolve:

```text
Product → Company
```

and return structured data.

### 13.2 Daily Report Generator

Responsible for:

- Greeting
- Company grouping
- Product grouping
- Quadrant grouping
- Lead table
- SWAT Performance
- Today's Sales Activity
- Date formatting
- Empty states
- Email HTML

Do not mix HTML generation with database queries.

### 13.3 Email Service

Responsible for:

- Recipient lookup
- Subject
- HTML body
- Sending
- Returning success/failure

Use the existing CRM email infrastructure if available.

## 14. Scheduler

Use a server-side scheduler/cron.

Do not depend on:

```text
setInterval()
setTimeout()
browser tab
frontend application
```

The scheduler should:

```text
Get users
 ↓
Filter daily_report_enabled = true
 ↓
For each user
 ↓
Generate report
 ↓
Send email
 ↓
Log result
```

## 15. Duplicate Prevention

Create/reuse a Daily Report Log.

Suggested fields:

```text
id
user_id
report_date
recipient
status
sent_at
error_message
created
modified
```

Recommended uniqueness:

```text
user_id + report_date
```

Before sending:

```text
Already sent?
    ↓
 Yes → Skip
 No  → Generate + Send
```

## 16. Error Handling

One BDE's failure must not stop other reports.

Example:

```text
Selvam  → Sent
Antony  → Failed
Kumar   → Sent
```

Log the failure reason and continue processing remaining enabled users.

## 17. Empty Data Handling

If an enabled BDE has no Q1-Q4 leads, the report should still be sent.

Example:

```text
Company & Product & Quadrant-wise Lead List

No Q1-Q4 leads available for today.
```

SWAT values should display zero where appropriate.

## 18. Development Phases

### Phase 1 – Existing Logic Analysis

- [ ] Identify Company Master and Daily Report recipient.
- [ ] Identify BDE/user table.
- [ ] Identify product/company mapping.
- [ ] Identify lead assignment to BDE.
- [ ] Identify quadrant field and values.
- [ ] Identify Sales Engagement fields.
- [ ] Identify existing lead status logic.
- [ ] Identify SWAT performance source.
- [ ] Identify Sales Activity source.
- [ ] Identify existing email service.
- [ ] Identify existing scheduler/cron.
- [ ] Check for existing report/log table.

### Phase 2 – Daily Report Enable Setting

- [ ] Add Daily Report enable/disable field if required.
- [ ] Add UI control in the appropriate user/BDE management screen.
- [ ] Default new users to disabled.
- [ ] Verify only enabled BDEs are selected by scheduler.

### Phase 3 – Lead Report Data

- [ ] Retrieve leads assigned to the BDE.
- [ ] Filter only Q1/Q2/Q3/Q4.
- [ ] Do not filter based on Order Won/Order Lost/Nurturing status.
- [ ] Resolve product/company mapping.
- [ ] Group by Company.
- [ ] Group by Product.
- [ ] Group by Quadrant.
- [ ] Retrieve required lead details.
- [ ] Verify multiple-company BDE handling.

### Phase 4 – SWAT Data

- [ ] Retrieve Calls.
- [ ] Retrieve Activities.
- [ ] Retrieve Email Campaign.
- [ ] Retrieve LinkedIn Connection Sent.
- [ ] Retrieve Demo.
- [ ] Retrieve Proposal.
- [ ] Retrieve Direct Visit.
- [ ] Apply correct BDE and report-date filters.

### Phase 5 – Sales Activity Data

- [ ] Retrieve today's Sales Engagement activities.
- [ ] Apply BDE filter.
- [ ] Apply report-date filter.
- [ ] Return Lead Name.
- [ ] Return Quadrant.
- [ ] Return Sales Engagement.
- [ ] Return Status.

### Phase 6 – Email Generation

- [ ] Create HTML email template.
- [ ] Add greeting.
- [ ] Add Company/Product/Quadrant lead section.
- [ ] Add SWAT Performance.
- [ ] Add Today's Sales Activity.
- [ ] Add empty-state handling.
- [ ] Apply subject format.
- [ ] Retrieve recipient from Company Master.

### Phase 7 – Automation

- [ ] Configure end-of-day scheduler.
- [ ] Get Daily Report enabled users.
- [ ] Generate one report per enabled user.
- [ ] Send email automatically.
- [ ] Prevent duplicate sending.
- [ ] Continue processing after individual failures.
- [ ] Log success/failure.

### Phase 8 – Report Monitoring

If required, add Daily Report history/status UI.

Display:

```text
Report Date
BDE
Recipient
Status
Sent Time
Failure Reason
```

Add filters for date, BDE and status.

## 19. Testing Plan

### User Eligibility

- [ ] Enabled BDE receives report.
- [ ] Disabled BDE does not receive report.
- [ ] Intern/test user remains excluded.
- [ ] Active CRM user with Daily Report disabled is excluded.

### Lead Filtering

- [ ] Q1 lead appears.
- [ ] Q2 lead appears.
- [ ] Q3 lead appears.
- [ ] Q4 lead appears.
- [ ] Nurturing + Q4 appears.
- [ ] Order Won + Q3 appears.
- [ ] Order Lost + Q2 appears.
- [ ] Lead without Q1-Q4 is excluded.
- [ ] Status does not affect lead inclusion.

### Multi-Company

Test:

```text
Selvam

Aura    → Angler
Vendora → Angler
FMS     → Trinetra
```

Verify:

```text
Angler
├── Aura
└── Vendora

Trinetra
└── FMS
```

Verify each product's Q1-Q4 leads appear under the correct company.

### SWAT

- [ ] Calls correct.
- [ ] Activities correct.
- [ ] Email Campaign correct.
- [ ] LinkedIn Connections correct.
- [ ] Demo correct.
- [ ] Proposal correct.
- [ ] Direct Visit correct.
- [ ] Zero values handled correctly.

### Sales Activity

- [ ] Today's activities appear.
- [ ] Previous day's activity does not incorrectly appear.
- [ ] Correct BDE activities appear.
- [ ] Lead name correct.
- [ ] Quadrant correct.
- [ ] Sales Engagement correct.
- [ ] Status correct.

### Email

- [ ] Recipient comes from Company Master.
- [ ] Subject format correct.
- [ ] HTML renders correctly.
- [ ] Company grouping correct.
- [ ] Product grouping correct.
- [ ] Quadrant grouping correct.
- [ ] Empty sections handled correctly.

### Scheduler

- [ ] Scheduler executes at configured end-of-day time.
- [ ] All enabled BDEs are processed.
- [ ] Disabled users are skipped.
- [ ] Duplicate execution does not send duplicate emails.
- [ ] One failed BDE does not stop other reports.
- [ ] Success/failure is logged.

## 20. Final Acceptance Criteria

The Daily Report implementation is complete when:

1. Reports are generated automatically at the end of the day.
2. No manual report submission is required.
3. Only users with Daily Report enabled receive reports.
4. The recipient is taken from Company Master.
5. The email subject follows `DD/MM/YYYY Day Report - BDE Name`.
6. The lead section includes **all Q1-Q4 leads**, regardless of lead status.
7. Leads without Q1-Q4 are excluded.
8. Nurturing, Order Won and Order Lost statuses do not independently control lead inclusion.
9. BDEs handling multiple companies are supported.
10. Company is determined from the existing Product → Company mapping.
11. Products appear under the correct company.
12. Products are grouped by Q1-Q4.
13. SWAT Performance uses existing achievement/activity data.
14. Today's Sales Activity uses existing CRM activity data.
15. Duplicate emails are prevented.
16. Failed reports are logged without stopping other users.
17. The complete scheduler → data → report → email flow is tested end-to-end.

## 21. Core Business Logic

The most important rule is:

```text
Daily Report Enabled User
        ↓
User's Leads
        ↓
Quadrant = Q1/Q2/Q3/Q4
        ↓
Product
        ↓
Product's Company Mapping
        ↓
Company
        ↓
Product
        ↓
Quadrant
        ↓
Lead Details
```

Do not use:

```text
User → Company
```

because one BDE can handle multiple companies.

Do not use:

```text
Status = Order Won
```

because the report must include Q1-Q4 leads regardless of status.

The two important filters are:

```text
daily_report_enabled = true
```

and:

```text
quadrant IN (Q1, Q2, Q3, Q4)
```

## 22. v2 — Extended Sections (implemented against Modules/dailyreport.md)

The plan above (sections 1-21) was implemented and deployed first. A follow-up
spec (`Modules/dailyreport.md`) added the following per-product sections on
top of it, all in `server/src/services/dailyReportService.ts`:

- **Today's Sales Activities : Achieved/Total** — leads with `follow_up_datetime`
  falling on the report date; Achieved = latest Sales Engagement log already
  `Completed`. Not quadrant-restricted (superset of the old Q1-Q4-only list).
- **Expired Sales Activities : Total** — leads with `follow_up_datetime` before
  the report date whose latest log is still not `Completed`.
- **This Week / Expired Cashflow Activities — Milestone + POA** — reuses
  `getFilteredMilestonesForLeads` / `computeMilestonePeriodAmounts` /
  `effectiveCollectionStatus` from `utils/cashflowMilestones.ts`, the same
  due-window and overdue rules as the Cash Flow Report dashboard's activity
  cards (`cashflowReportController.ts#getCashflowDashboardActivities`), scoped
  to the product's leads (all quadrants — milestones/POA live on Order Won
  leads, so the Q1-Q4 filter does not apply here).
- **Consolidated Lead Count** — Q4/Q3/Q2/Q1 counts from the same lead set used
  for the old lead list, unchanged filter.
- **Q4 Lead Activities** — Q4 leads' latest Sales Engagement (Lead Name,
  Sales Engagement, Sales Engagement Date, Status).

The old flat "Lead Activity" table (grouped by quadrant, one combined
"Today's Sales Activity" section per company) was replaced by these
per-product sections to match the new spec's exact hierarchy.

## 23. Cashflow Milestone Activities — Amount row + Overall column

The Cashflow Milestone Activities stat table (Due This Week/Achieved/Pending/
Expired) now carries the money behind each count, not just the count:

- Each column keeps its existing count in a "Count" row and gains a second
  "Amount" row below it (`milestoneStatTable` in `dailyReportService.ts`,
  replacing the plain `statTable` used for this section only).
  `due_this_week`/`achieved`/`expired` amounts are summed per-milestone in the
  same loop that produces the counts (`expected_amount` for Due This Week,
  `already_received` for Achieved, `max(expected - already_received, 0)` for
  Expired); `pending_amount` is `due_this_week_amount - achieved_amount`,
  mirroring how the `pending` count is already derived.
- A 5th **Overall** column was added, reusing the Dashboard's "Cashflow
  Overall" card logic verbatim
  (`cashflowReportController.ts#getCashflowDashboardActivities`'s
  `overallCashflow` bucket): every milestone in the product's `filtered.milestones`
  that is not yet `Fully Paid`/`Stuck`, regardless of whether it even has an
  EDC/REDC — count plus `sum(max(expected - already_received, 0))` — so it is
  not scoped to this week the way Due This Week/Expired are.

`DailyReportMilestoneSummary` (`dailyReportService.ts`) carries the new
`due_this_week_amount`/`achieved_amount`/`pending_amount`/`expired_amount`/
`overall`/`overall_amount` fields alongside the existing counts.
