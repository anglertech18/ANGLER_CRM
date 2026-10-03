# Daily Report Module – Development Prompt

## Role

You are working on an existing CRM application.

Implement the Daily Report feature by first understanding the existing project architecture, database schema, API structure, authentication, user/product/company mapping, SWAT logic, Sales Activity logic, Cashflow logic, Lead logic, and existing email infrastructure.

IMPORTANT:
- Do NOT rewrite existing business logic unnecessarily.
- Reuse existing services, queries, APIs, utilities, and calculations wherever possible.
- Do NOT assume database/table/field names.
- Inspect the existing codebase before making changes.
- Follow the existing project coding conventions.
- Do not break existing functionality.
- Do not create duplicate business logic if an existing implementation already exists.

---

# 1. Business Objective

Currently the daily report is manually sent through WhatsApp.

Upgrade this functionality so the CRM automatically generates and sends the Daily Report by email at the end of every working day.

There must be NO manual trigger required from the BDE/user.

The backend scheduler/cron/job must automatically generate and send the report.

---

# 2. Important Existing Logic

The existing Company → Product mapping is mandatory.

DO NOT remove or bypass this logic.

A BDE can handle products belonging to multiple companies.

Example:

Selvam handles:

- Aura → Angler Technologies
- Vendora → Angler Technologies
- FMS → Trinetra

Therefore the generated report must be:

Angler Technologies
    Aura
    [Aura report data]

    Vendora
    [Vendora report data]

Trinetra
    FMS
    [FMS report data]

Do NOT combine Aura, Vendora and FMS into one product report.

Every product must have its own data filtered correctly.

---

# 3. Daily Report Enable/Disable

Not every BDE/user should receive a Daily Report.

Some users may be:
- Interns
- Test users
- Users with dummy data
- Users who should not receive reports

Add/use a configuration such as:

daily_report_enabled

Only users where:

daily_report_enabled = true

should be processed by the Daily Report scheduler.

This setting must be independent of the normal user active/inactive status.

Example:

| User | Daily Report |
|------|--------------|
| Selvam | Enabled |
| Antony | Enabled |
| Intern | Disabled |
| Test User | Disabled |

If this setting already exists, reuse it.

Do NOT create a duplicate field.

Add an appropriate enable/disable UI in the existing user/BDE management area if required.

---

# 4. Email Recipient

The Daily Report recipient already exists in Company Master.

DO NOT hardcode the CEO email address.

Use the existing Company Master Daily Report recipient configuration.

The implementation must resolve the recipient based on the company associated with the product.

If a BDE handles multiple companies, correctly handle each company's existing recipient configuration according to the current application/business rules.

Do not invent a new recipient system if one already exists.

---

# 5. Email Subject

Use:

DD/MM/YYYY Day Report - {BDE Name}

Example:

20/08/2026 Day Report - Selvam

---

# 6. Email Structure

> **Current layout (updated 2026-08-27).** The rendered email
> (`server/src/services/dailyReportService.ts` → `renderReportHtml`) is now
> **section-wise consolidated**, not one card per product. Each section is a
> single table with one row per product for that company:
>
> 1. **SWAT Performance** — Product | Calls | Activities | Email Campaign |
>    LinkedIn Conn Sent | Demo | Proposal | Direct Visit (each cell
>    `achieved/target`, colored by % achievement).
> 2. **Lead Sales Activities** (was "Today's Sales Activities") — Product |
>    Total | Achieved | Pending | Overdue.
> 3. **Cashflow Milestone Activities** — Product | (Count / Amount) | Due This
>    Week | Achieved | Pending | Expired | Overall (two rows per product,
>    product cell spans both).
> 4. **Cashflow POA Activities** — Product | Due Today | Achieved | Pending | Overdue.
> 5. **Consolidated Lead Count** — Product | Q4 | Q3 | Q2 | Q1 | Nurturing.
> 6. **Q4 Lead Activities** — Product | Lead Name | Sales Engagement | Sales
>    Engagement Date | Status (per-lead rows, product cell spans its rows).
>
> The body is sized to an A4 portrait content width (~720px) and the preview
> page (`client/src/pages/dailyReport/DailyReportPreview.tsx`) prints/exports to
> A4. The underlying per-product data aggregation (sections 7–13) is unchanged.

The report must follow this hierarchy:

BDE
  ↓
Company
  ↓
Product
  ↓
Daily Report Sections

Example:

Good Evening Sir,

Angler Technologies

Aura

SWAT Performance
...

Today's Sales Activities : 3/4
...

Expired Sales Activities : 2
...

This Week Cashflow Activities
Milestone : 4/6
...
POA : 2/3
...

Expired Cashflow Activities
Milestone : 2
...
POA : 1
...

Consolidated Lead Count
Q4 : 5
Q3 : 8
Q2 : 10
Q1 : 12

Q4 Lead Activities
...


Vendora

SWAT Performance
...

Today's Sales Activities : 2/3
...


Trinetra

FMS

SWAT Performance
...

Today's Sales Activities : 2/3
...

---

# 7. Report Sections

Every Product must contain the following sections.

## 7.1 SWAT Performance

Use the existing SWAT calculation/target/achievement logic.

Display (same metric set/order as the SWAT Performance report page,
SwatPerformanceIndex.tsx):

- Calls
- Activities
- Email Campaign
- LinkedIn Connection Sent
- Q1 Lead Gen
- LinkedIn Acceptance
- Demo
- Proposal
- Direct Visit
- Sales Order Won
- Revenue Collected

Plus an overall % column — this MUST be the SwatPerformance row's own
`performance_percentage` (as saved/computed by swatController.ts), not a sum
re-derived from the metrics above, so it always agrees with the SWAT
Performance report page.

Format:

Achievement / Total

Example:

SWAT Performance

Calls               : 25/30
Activities          : 18/20
Email Campaign      : 28/30
LinkedIn Conn Sent   : 42/50
Q1 Lead Gen         : 6/8
LinkedIn Acceptance : 10/15
Demo                : 4/5
Proposal            : 3/5
Direct Visit        : 2/3
Sales Order Won     : 1/2
Revenue Collected   : 150000/200000

IMPORTANT:
Do not duplicate the existing SWAT calculation logic.
Find and reuse the existing implementation.

---

# 8. Today's Sales Activities

The heading MUST show:

Today's Sales Activities : Achievement/Total

Example:

Today's Sales Activities : 3/4

Where:

3 = today's achieved/completed activities
4 = today's total activities

Below the heading display the activity list.

Required fields:

- Lead Name
- Quadrant
- Sales Engagement
- Sales Engagement Date
- Status

Example:

Lead Name | Quadrant | Sales Engagement | Sales Engagement Date | Status

Lead A | Q4 | Follow-up | 20/08/2026 | Completed
Lead B | Q3 | Demo | 20/08/2026 | Completed
Lead C | Q4 | Call | 20/08/2026 | Pending

Use the existing Sales Activity/Sales Engagement business logic.

Do NOT create a second definition of "today's sales activity".

---

# 9. Expired Sales Activities

Display:

Expired Sales Activities : {Total}

Then display the expired activity list.

Required fields:

- Lead Name
- Quadrant
- Sales Engagement
- Sales Engagement Date
- Status

Example:

Expired Sales Activities : 2

Lead D | Q4 | Follow-up | 18/08/2026 | Expired
Lead E | Q3 | Call | 19/08/2026 | Expired

Use the existing CRM expiry logic.

---

# 10. This Week Cashflow Activities

Cashflow MUST be separated into:

1. Milestone
2. POA

Do NOT combine them.

## 10.1 Milestone

Display:

This Week Cashflow Activities - Milestone : Achievement/Total

Example:

This Week Cashflow Activities - Milestone : 4/6

Then display the milestone list using the existing Cashflow fields/logic.

## 10.2 POA

Display:

This Week Cashflow Activities - POA : Achievement/Total

Example:

This Week Cashflow Activities - POA : 2/3

Then display the POA activity list.

Reuse the existing Cashflow logic.

Do not invent a new definition of Milestone or POA.

---

# 11. Expired Cashflow Activities

Separate expired Cashflow activities into:

## Expired Milestone

Expired Cashflow Activities - Milestone : {Total}

Display the expired milestone list.

## Expired POA

Expired Cashflow Activities - POA : {Total}

Display the expired POA list.

Reuse the existing Cashflow expiry logic.

---

# 12. Consolidated Lead Count

Display ONLY:

Q4
Q3
Q2
Q1

Example:

Consolidated Lead Count

Q4 : 5
Q3 : 8
Q2 : 10
Q1 : 12

IMPORTANT:

The report must NOT create separate categories for:

- Nurturing
- Order Won
- Order Lost

The inclusion condition is the Lead Quadrant.

Include:

Q4
Q3
Q2
Q1

Exclude leads where the quadrant is not Q1-Q4.

Example:

Q4 + Order Won → Include
Q4 + Nurturing → Include
Q4 + Order Lost → Include
Q3 + Order Won → Include
Q2 + Nurturing → Include
Q1 + any status → Include

Do NOT use Order Won as the filter.

The core condition is equivalent to:

quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')

Use the actual existing field/value implementation discovered from the project.

---

# 13. Q4 Lead Activities

Display activities for Q4 leads only.

Heading:

Q4 Lead Activities

Required fields:

- Lead Name
- Sales Engagement
- Sales Engagement Date
- Status

Example:

Lead A | Follow-up | 20/08/2026 | Completed
Lead B | Demo | 20/08/2026 | Pending

Filter by:

- Current BDE
- Current Company
- Current Product
- Q4

Reuse the existing Sales Activity/Sales Engagement logic.

---

# 14. Mandatory Product Filtering

This is extremely important.

Every report query must correctly respect:

BDE
+
Company
+
Product

Do NOT retrieve all leads for a BDE and then blindly display them under every product.

Example:

Selvam:

Aura → Angler Technologies
Vendora → Angler Technologies
FMS → Trinetra

Aura report must contain Aura data only.

Vendora report must contain Vendora data only.

FMS report must contain FMS data only.

Validate the product/company mapping before implementing the queries.

---

# 15. Recommended Backend Flow

Implement the overall process approximately as:

1. Scheduler starts at end of day.
2. Retrieve users where Daily Report is enabled.
3. For each user:
   - Retrieve assigned products.
   - Resolve each product's company.
   - Group products by company.
4. For each company:
   - Resolve existing Company Master report recipient.
5. For each product:
   - Retrieve SWAT Performance.
   - Retrieve Today's Sales Activities.
   - Retrieve Expired Sales Activities.
   - Retrieve Weekly Cashflow Milestones.
   - Retrieve Weekly Cashflow POA.
   - Retrieve Expired Milestones.
   - Retrieve Expired POA.
   - Retrieve Q1-Q4 consolidated lead counts.
   - Retrieve Q4 Lead Activities.
6. Build HTML email.
7. Send email.
8. Store report execution/sending log.
9. Continue processing the next user even if one report fails.

---

# 16. Suggested Service Separation

Do not put everything into one giant controller.

Follow the existing architecture.

If the project structure supports services, separate responsibilities similar to:

DailyReportService

Responsible for orchestration.

DailyReportDataService

Responsible for retrieving report data.

DailyReportTemplateService

Responsible for generating email HTML.

DailyReportEmailService

Responsible for sending email.

DailyReportScheduler

Responsible for scheduled execution.

Use the project's existing naming and architecture instead of blindly creating these exact files.

---

# 17. Scheduler

The report must be generated automatically.

Do NOT use:

- React timers
- Browser timers
- setInterval()
- setTimeout()
- Manual button trigger

Use the existing backend scheduler/cron/job mechanism.

If the project already has scheduled jobs, extend that mechanism.

If no scheduler exists, implement the appropriate backend cron/scheduler according to the project's current deployment architecture.

The scheduler must be safe to run repeatedly.

---

# 18. Duplicate Prevention

The same BDE must not receive duplicate Daily Reports for the same report date.

Before sending:

Check whether the report was already successfully generated/sent for:

user + report date

If already sent:

Skip.

If not sent:

Generate and send.

Reuse an existing logging mechanism if available.

Otherwise create an appropriate Daily Report execution log.

---

# 19. Error Handling

One failed BDE report must not stop all other reports.

Example:

Selvam → Success
Antony → Failed
Kumar → Success

The Antony failure should be logged, but Kumar's report must still be processed.

Store:

- User
- Report Date
- Recipient
- Status
- Error Message
- Sent Time

Use the existing application logging approach where possible.

---

# 20. Empty Data

Do not hide a mapped Product because it has no data.

Example:

Aura

SWAT Performance
Calls : 0/0

Today's Sales Activities : 0/0
No activities found.

Expired Sales Activities : 0

This Week Cashflow Activities
Milestone : 0/0
No milestone activities.

POA : 0/0
No POA activities.

Expired Cashflow Activities
Milestone : 0
POA : 0

Consolidated Lead Count
Q4 : 0
Q3 : 0
Q2 : 0
Q1 : 0

Q4 Lead Activities
No Q4 activities found.

The product must still be displayed.

---

# 21. Important Development Rules

Before coding:

1. Inspect the existing database schema.
2. Identify the existing user/BDE model.
3. Identify BDE-product mapping.
4. Identify product-company mapping.
5. Identify Company Master recipient field.
6. Identify existing email service.
7. Identify existing scheduler/cron.
8. Identify existing SWAT calculation.
9. Identify Sales Activity implementation.
10. Identify Cashflow implementation.
11. Identify Lead Quadrant implementation.
12. Identify existing report modules that can be reused.

Do not guess table names.

Do not guess field names.

Do not create duplicate APIs.

Do not duplicate existing business logic.

Do not modify unrelated modules.

---

# 22. Implementation Order

Follow this order:

## Step 1
Analyze the existing project architecture.

## Step 2
Identify all existing business logic required for the report.

## Step 3
Identify Company → Product → BDE relationships.

## Step 4
Implement/verify Daily Report enable/disable configuration.

## Step 5
Implement Daily Report data aggregation.

## Step 6
Implement Company → Product report grouping.

## Step 7
Implement email HTML template.

## Step 8
Implement scheduler.

## Step 9
Implement duplicate prevention/logging.

## Step 10
Test with a multi-company BDE.

---

# 23. Mandatory End-to-End Test

Create/identify a test BDE with:

BDE:
Selvam

Company/Product:

Angler Technologies
- Aura
- Vendora

Trinetra
- FMS

Enable:

daily_report_enabled = true

Run the Daily Report manually through the backend job/service ONLY for testing.

Verify the generated email:

Angler Technologies

Aura
→ Aura data only

Vendora
→ Vendora data only


Trinetra

FMS
→ FMS data only

Verify that no FMS data appears under Aura/Vendora and no Aura/Vendora data appears under FMS.

Then test the actual scheduler.

---

# 24. Final Validation Checklist

Before completing the implementation verify:

- [ ] Existing Company → Product mapping is preserved.
- [ ] Multi-company BDE works.
- [ ] Multi-product BDE works.
- [ ] Daily Report enable/disable works.
- [ ] Disabled BDE receives no report.
- [ ] Company Master recipient is used.
- [ ] Subject format is correct.
- [ ] SWAT Performance is correct.
- [ ] Today's Sales Activities Achievement/Total is correct.
- [ ] Sales Engagement Date is displayed.
- [ ] Expired Sales Activities total/list is correct.
- [ ] Cashflow Milestone is separate from POA.
- [ ] Cashflow Achievement/Total is correct.
- [ ] Expired Milestone is correct.
- [ ] Expired POA is correct.
- [ ] Lead counts show only Q4/Q3/Q2/Q1.
- [ ] Nurturing is not treated as a separate lead category.
- [ ] Order Won is not used as the lead inclusion filter.
- [ ] Order Lost is not used as the lead inclusion filter.
- [ ] Q4 Lead Activities are correct.
- [ ] Product filtering is correct.
- [ ] Empty sections are handled.
- [ ] Scheduler works automatically.
- [ ] Duplicate reports are prevented.
- [ ] Errors are logged.
- [ ] One failed report does not stop other users.
- [ ] Existing CRM functionality remains unaffected.

---

# Final Requirement

Implement this feature in the existing CRM.

Do not just create a mock UI or static email.

The final implementation must work end-to-end:

Database
→ Existing CRM Business Logic
→ Daily Report Data Aggregation
→ Company/Product Grouping
→ HTML Email Generation
→ Company Master Recipient
→ Automatic Scheduler
→ Email Sending
→ Report Logging

After implementation, provide:

1. Files changed.
2. Database changes.
3. APIs/services added or modified.
4. Scheduler/cron changes.
5. Email template location.
6. Business logic reused.
7. Test cases performed.
8. Any assumptions made.
9. Any issues that still require manual configuration.