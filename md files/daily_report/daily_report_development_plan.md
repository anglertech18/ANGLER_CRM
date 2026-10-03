# Daily Report Module -- Development Plan

## 1. Objective

Upgrade the existing Daily Report process so that the CRM automatically
generates and sends each user's end-of-day activity report to the
configured company daily report recipient.

The process must not require the user to manually create or submit a
report.

### Expected Flow

``` text
End of Working Day
        ↓
Server Scheduler / Cron
        ↓
Get Active BDE / Users
        ↓
Collect CRM Data for Each User
        ↓
Generate Daily Report
        ↓
Get Daily Report Recipient from Company Master
        ↓
Send Email
        ↓
Store Send Status / Error Log
```

------------------------------------------------------------------------

## 2. Recipient Configuration

Use the existing **Company Master** configuration for the email
recipient.

### Requirement

-   Do not hardcode the CEO/email address.
-   Read the existing **Company Daily Report Recipient** value from
    Company Master.
-   Use this recipient for the daily report email.
-   Validate that a recipient is configured before attempting to send.

------------------------------------------------------------------------

## 3. Email Subject

The email subject must follow this format:

``` text
DD/MM/YYYY Day Report - {BDE Name}
```

Example:

``` text
12/08/2026 Day Report - John
```

------------------------------------------------------------------------

## 4. Report Generation

The report must be generated separately for each active BDE/user.

### User Context

For every report:

-   Identify the BDE/user.
-   Fetch only the relevant CRM data belonging to that user.
-   Use the existing CRM relationships and business logic.
-   Do not create duplicate or separate data sources only for the Daily
    Report.

------------------------------------------------------------------------

# 5. Report Content

## 5.1 Greeting

The email should start with:

``` text
Good Evening Sir,
```

------------------------------------------------------------------------

## 5.2 Company, Product and Quadrant-wise Lead List

Generate the lead section using the hierarchy:

``` text
Company
    ↓
Product
    ↓
Quadrant
    ↓
Lead Details
```

### Example

``` text
Angler Technologies

Aura

Q4

Lead Name | Quadrant | Sales Engagement Remarks | Sales Engagement Date | Status
--------------------------------------------------------------------------------
Test 1    | Q4       | Discussed requirement     | 12/08/2026             | Open
Test 2    | Q4       | Follow-up completed       | 12/08/2026             | Won


Q3

Lead Name | Quadrant | Sales Engagement Remarks | Sales Engagement Date | Status
--------------------------------------------------------------------------------
Test 3    | Q3       | Demo discussion           | 12/08/2026             | Open
Test 4    | Q3       | Requirement discussion   | 12/08/2026             | Lost


Q2

Lead Name | Quadrant | Sales Engagement Remarks | Sales Engagement Date | Status
--------------------------------------------------------------------------------
Test 5    | Q2       | Follow-up                 | 12/08/2026             | Open


Q1

Lead Name | Quadrant | Sales Engagement Remarks | Sales Engagement Date | Status
--------------------------------------------------------------------------------
Test 6    | Q1       | Proposal discussion       | 12/08/2026             | Open
```

### Lead Fields

The report must display:

-   Lead Name
-   Quadrant
-   Sales Engagement Remarks
-   Sales Engagement Date
-   Status

### Data Rules

-   Use existing Lead data.
-   Use existing Company/Product relationships.
-   Use existing Quadrant values.
-   Use the existing Sales Engagement fields.
-   Use existing lead status logic.
-   Filter data according to the current BDE/user.
-   Avoid introducing duplicate lead/business logic.

------------------------------------------------------------------------

# 6. SWAT Performance

Add a SWAT Performance section using the existing SWAT
activity/achievement data.

### Fields

``` text
Calls
Activities
Email Campaign
LinkedIn Conn Sent
Demo
Proposal
Direct Visit
```

### Example

``` text
SWAT Performance

Calls              : 10/25
Activities         : 5/12
Email Campaign     : /530
LinkedIn Conn Sent : 2/18
Demo               : 1/3
Proposal           : 1/2
Direct Visit       : 2/4
```

### Important

The Daily Report must read these values from the existing
SWAT/activity/target/achievement flow.

Do not create a second manual data-entry mechanism for these values.

------------------------------------------------------------------------

# 7. Today's Sales Activity

Add a section for today's sales activities.

### Display Fields

``` text
Lead Name | Quadrant | Sales Engagement | Status
```

### Example

``` text
Today's Sales Activity

Lead Name | Quadrant | Sales Engagement | Status
-------------------------------------------------
Test 1    | Q4       | Requirement Call  | Open
Test 3    | Q3       | Product Demo      | Open
Test 5    | Q2       | Follow-up         | Won
```

### Data Rule

Use the existing CRM Sales Engagement/activity data.

The primary date condition should be based on today's Sales Engagement
Date and the current BDE/user.

Reuse existing activity/status logic wherever available.

------------------------------------------------------------------------

# 8. Backend Architecture

Keep report generation separated into clear responsibilities.

## 8.1 Daily Report Data Service

Create/reuse a backend service responsible for collecting report data.

Suggested responsibilities:

``` text
getBdeLeadReport(userId, reportDate)
getSwatPerformance(userId, reportDate)
getSalesActivities(userId, reportDate)
```

The service should return structured data rather than HTML.

------------------------------------------------------------------------

## 8.2 Daily Report Generator

Create a report generator responsible for converting the structured data
into an email-ready HTML report.

Responsibilities:

-   Build greeting.
-   Build company/product/quadrant sections.
-   Build SWAT Performance section.
-   Build Today's Sales Activity section.
-   Format dates.
-   Handle empty sections.
-   Produce consistent email HTML.

Do not place large HTML templates directly inside database
query/controller logic.

------------------------------------------------------------------------

## 8.3 Email Service

Use the application's existing email infrastructure if available.

Responsibilities:

-   Get recipient from Company Master.
-   Set email subject.
-   Set HTML body.
-   Send email.
-   Return success/failure result.

------------------------------------------------------------------------

# 9. Scheduler / Cron

The Daily Report must run automatically at the end of the working day.

### Requirements

-   Use server-side scheduling.
-   Do not depend on a browser being open.
-   Do not use frontend `setInterval()` or `setTimeout()` for the actual
    scheduled report.
-   Configure the scheduled execution time according to the company's
    working-day requirement.

### Scheduled Flow

``` text
Cron
 ↓
Daily Report Job
 ↓
Get Active Users / BDEs
 ↓
For Each User
    ↓
Collect Data
    ↓
Generate Report
    ↓
Send Email
    ↓
Log Result
```

------------------------------------------------------------------------

# 10. Duplicate Email Prevention

The scheduler must prevent duplicate reports.

Create/use a Daily Report Log table.

Suggested fields:

``` text
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

### Duplicate Rule

A user should have only one successfully generated/sent report for a
particular date.

Recommended unique combination:

``` text
user_id + report_date
```

Before sending:

``` text
Check existing report log
        ↓
Already sent?
   ├── Yes → Skip
   └── No  → Generate and Send
```

------------------------------------------------------------------------

# 11. Error Handling

A failure for one BDE must not stop reports for other BDEs.

### Example

``` text
John   → Failed
Kumar  → Sent
Antony → Sent
David  → Sent
```

Store the failure reason in the Daily Report Log.

Possible failure reasons:

-   Recipient not configured
-   Data retrieval error
-   Email generation error
-   SMTP/email service failure

The job should continue processing the remaining users.

------------------------------------------------------------------------

# 12. Empty Data Handling

The email must still be generated if one section has no data.

Example:

``` text
SWAT Performance

Calls              : 0
Activities         : 0
Email Campaign     : 0
LinkedIn Conn Sent : 0
Demo               : 0
Proposal           : 0
Direct Visit       : 0
```

For lead/activity lists with no records, display a clear message such
as:

``` text
No records available for today.
```

Do not break the entire email because one section is empty.

------------------------------------------------------------------------

# 13. Frontend / CRM Module

The Daily Report module does not need a manual report creation form.

Recommended CRM navigation:

``` text
Daily Report
    ├── Report History
    └── Report Logs / Status
```

### Report History

Allow authorized users/managers to view:

-   Report date
-   BDE/User
-   Recipient
-   Sent status
-   Sent time
-   Failure reason, if any

The frontend is mainly for monitoring/history; automatic generation
remains a backend responsibility.

------------------------------------------------------------------------

# 14. Access Control

Apply existing CRM role-based access control.

### BDE / Sales Person

Can view their own report history if required.

### Sales Manager

Can view reports for their assigned sales users.

### CEO / Authorized Management

Can view team-level report history/status.

The scheduled job must operate independently of frontend permissions
while still respecting user/data ownership when collecting report data.

------------------------------------------------------------------------

# 15. Date and Time Handling

Use the CRM/server's configured business timezone consistently.

The report date must represent the business day for which the report is
generated.

Example:

``` text
Report Date: 12/08/2026
```

All of the following must use the same report date:

-   Lead filtering
-   Sales Engagement Date
-   SWAT achievement date
-   Sales Activity date
-   Email subject
-   Daily Report Log

Avoid mixing UTC date and local business date.

------------------------------------------------------------------------

# 16. Email Template

Create a reusable HTML email template.

Suggested structure:

``` text
Good Evening Sir,

[Company & Product & Quadrant-wise Lead List]

[SWAT Performance]

[Today's Sales Activity]

Regards,
CRM System
```

Use an HTML table layout suitable for Outlook/Gmail/email clients.

Do not rely on complex CSS unsupported by email clients.

------------------------------------------------------------------------

# 17. Database Changes

Before creating new tables/fields:

1.  Check whether Company Master already contains the Daily Report
    Recipient.
2.  Check whether an existing report/log table already exists.
3.  Reuse existing fields where possible.

Only add database changes that are actually required.

Potential new table:

``` text
daily_report_logs
```

with:

``` text
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

Add an appropriate unique constraint/index for duplicate prevention.

------------------------------------------------------------------------

# 18. API Requirements

If report history/status is exposed through the CRM UI, add APIs such
as:

``` text
GET /daily-reports
GET /daily-reports/:id
```

Optional administrative endpoint:

``` text
POST /daily-reports/run
```

If a manual run endpoint is created for testing/admin purposes, it must
not replace the automatic scheduler.

------------------------------------------------------------------------

# 19. Development Steps

## Phase 1 -- Existing Logic Analysis

-   [ ] Identify Company Master implementation.
-   [ ] Identify Daily Report Recipient field.
-   [ ] Identify BDE/user relationships.
-   [ ] Identify Lead → Company → Product relationships.
-   [ ] Identify existing Quadrant logic.
-   [ ] Identify Sales Engagement fields.
-   [ ] Identify existing lead status logic.
-   [ ] Identify SWAT performance/achievement source.
-   [ ] Identify today's Sales Activity source.
-   [ ] Identify existing email service.
-   [ ] Identify existing scheduler/cron infrastructure.
-   [ ] Check whether a report/log table already exists.

## Phase 2 -- Backend Data Collection

-   [ ] Implement lead report data query/service.
-   [ ] Implement company/product/quadrant grouping.
-   [ ] Implement SWAT performance data collection.
-   [ ] Implement today's sales activity collection.
-   [ ] Apply BDE/user filtering.
-   [ ] Apply report-date filtering.
-   [ ] Reuse existing CRM business rules.

## Phase 3 -- Email Report

-   [ ] Create HTML email template.
-   [ ] Add greeting.
-   [ ] Add Company/Product/Quadrant lead section.
-   [ ] Add SWAT Performance section.
-   [ ] Add Today's Sales Activity section.
-   [ ] Add empty-state handling.
-   [ ] Add email subject generation.
-   [ ] Read recipient from Company Master.

## Phase 4 -- Automation

-   [ ] Create scheduled Daily Report job.
-   [ ] Get active BDE/users.
-   [ ] Generate report for each user.
-   [ ] Send email automatically.
-   [ ] Continue processing if one user's report fails.
-   [ ] Add duplicate prevention.

## Phase 5 -- Logging

-   [ ] Create/reuse Daily Report Log.
-   [ ] Store report date.
-   [ ] Store user.
-   [ ] Store recipient.
-   [ ] Store sent status.
-   [ ] Store sent timestamp.
-   [ ] Store failure reason.
-   [ ] Add duplicate protection.

## Phase 6 -- Frontend Monitoring

-   [ ] Add Daily Report menu/page if required.
-   [ ] Add report history.
-   [ ] Add sent/failed status.
-   [ ] Add report date filter.
-   [ ] Add BDE/user filter.
-   [ ] Add failure reason display.

## Phase 7 -- Testing

-   [ ] Test one BDE report.
-   [ ] Test multiple BDE reports.
-   [ ] Test correct recipient from Company Master.
-   [ ] Test subject format.
-   [ ] Test company/product grouping.
-   [ ] Test Q1/Q2/Q3/Q4 grouping.
-   [ ] Test Sales Engagement details.
-   [ ] Test SWAT values.
-   [ ] Test today's Sales Activity.
-   [ ] Test zero-data scenarios.
-   [ ] Test frozen/closed lead records if applicable.
-   [ ] Test failed email for one user.
-   [ ] Verify other users still receive reports after one failure.
-   [ ] Test duplicate scheduler execution.
-   [ ] Test timezone/date boundary.
-   [ ] Test actual email in Outlook/Gmail.
-   [ ] Test end-to-end from scheduler → database → email.

------------------------------------------------------------------------

# 20. End-to-End Acceptance Criteria

The feature is complete only when:

1.  The user does not need to manually create a Daily Report.
2.  The scheduler automatically runs at the configured end-of-day time.
3.  Each active BDE receives a separately generated report for their
    activity.
4.  The recipient is taken from Company Master.
5.  The email subject follows:

``` text
DD/MM/YYYY Day Report - BDE Name
```

6.  The email contains:
    -   Company/Product/Quadrant-wise Lead List
    -   SWAT Performance
    -   Today's Sales Activity
7.  Existing CRM data/business rules are reused.
8.  No duplicate report is sent for the same BDE/date.
9.  One failed report does not stop other BDE reports.
10. Every execution is logged with success/failure status.
11. The report displays correct data for the correct business date.
12. The actual production email is verified end-to-end.

------------------------------------------------------------------------

# 21. Important Implementation Rule

**Do not build Daily Report as a new manual data-entry system.**

The source of truth remains:

``` text
Existing CRM Modules
        ↓
Daily Report Data Service
        ↓
Daily Report Generator
        ↓
Email Service
        ↓
Company Daily Report Recipient
```

The Daily Report module is an **automated reporting layer over existing
CRM data**, not another place for users to enter the same activities
again.
