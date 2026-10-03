# QuadrantMovement_E2E_Test.md

# End-to-End Browser Testing - Lead Quadrant Movement

## Objective

Act as a **Senior QA Manual Tester**.

Test the application **only through the browser UI**. Do not review or modify the source code unless a bug is identified during testing.

Validate that the newly implemented Lead Quadrant Movement, Sales Stage synchronization, Lead Score, BANT logic, Auto-Degradation, and Requalification workflow function correctly from an end-user perspective.

---

# Test Credentials

## CEO

Email
```
ceo@crm.com
```

Password
```
angler
```

---

## Sales Manager

Email
```
simsone@angleritech.com
```

Password
```
angler
```

---

## Sales Person

Email
```
boopathi.r@angleritech.com
```

Password
```
angler
```

---

# Browser Testing Scope

Test the application exactly as an end user would.

Do not inspect code.

Do not assume functionality.

Verify everything through the UI.

---

# 1. Lead Creation

Create multiple leads.

Verify

- Lead saves successfully.
- Initial Quadrant is calculated correctly.
- Sales Stage displays correctly.
- Lead Score is correct.
- BANT values are saved.
- Quadrant Age starts correctly.

---

# 2. Quadrant Movement

Verify every transition using the UI.

- Q1 → Q2
- Q1 → Q3
- Q1 → Q4
- Q2 → Q3
- Q2 → Q4
- Q3 → Q4

Verify

- Quadrant changes correctly.
- Sales Stage updates correctly.
- Score remains correct.
- BANT values remain correct.
- No unexpected reset occurs.

---

# 3. Order Won

Update Sales Stage to

```
Order Won
```

Verify

- Quadrant becomes Order Won.
- Lead displays correctly in all related pages.
- Dashboard updates.
- Reports update.

---

# 4. Order Lost

Update Sales Stage to

```
Order Lost
```

Verify

- Quadrant becomes Order Lost.
- Dashboard updates.
- Reports update.

---

# 5. Nurturing

Update Sales Stage to

```
Nurturing
```

Verify

- Quadrant becomes Nurturing.
- Score resets.
- BANT resets.
- Quadrant Age resets.
- Requalification label appears.

---

# 6. Requalification

Click

```
Auto Degraded

or

Requalification Required
```

Verify

- Lead Edit opens.
- Score Card is visible.
- User can update Score.
- User can update BANT.

Save.

Verify

- New Quadrant calculated.
- Sales Stage updated.
- Label removed.
- Dashboard updated.

---

# 7. Auto Degradation

Run or wait for the scheduled degradation.

Verify

Q4 → Q3

- Timeline reset only

Q3 → Q2

- Budget reset
- Authority reset

Q2 → Q1

- All BANT reset

Verify

- Lead Score remains.
- Quadrant changes.
- Sales Stage changes.
- Requalification label appears.

---

# 8. Lead Listing

Verify

- Quadrant column
- Sales Stage column
- Auto Degraded label
- Requalification label
- Sorting
- Filters
- Pagination

---

# 9. Lead View

Verify

- Lead Score
- BANT
- Quadrant
- Sales Stage
- Quadrant Age
- Activity Timeline

All values should match the Lead Edit page.

---

# 10. Dashboard Validation

## SEAL Dashboard

Verify

- Pipeline Counts
- Order Won
- Order Lost
- Weekly Breakdown
- Quadrant Snapshot
- Achievement

---

## Lead Gen Summary

Verify

- Q1
- Q2
- Q3
- Q4
- Lead Achievement
- Direct Marketing Calls
- Totals

---

# 11. Reports

Verify

- Lead Reports
- Dashboard Reports
- Export Reports

Confirm Quadrant and Sales Stage values are correct.

---

# 12. Weekly Summary

Verify

- Lead Name
- Quadrant
- Sales Stage

---

# 13. Call Tracker

Verify

- Converted Lead
- Lead linkage
- Lead status

---

# 14. Enquiry Tracker

Verify

- Converted enquiries
- Lead creation
- Lead mapping

---

# 15. SWAT Activity Log

Verify

- Lead counts
- Call achievements
- Dashboard values

---

# 16. RBAC Testing

## CEO

Verify

- All records visible.
- All dashboards correct.

---

## Sales Manager

Verify

- Own records.
- Team records.
- Product filters.

---

## Sales Person

Verify

- Own records only.

---

# 17. Navigation Testing

Verify

- View → Back returns to Lead List.
- Filters remain selected.
- Pagination remains.
- Sorting remains.

---

# 18. Cross Module Validation

After every Quadrant change verify it reflects in:

- Lead Module
- Lead View
- Dashboard
- SEAL Dashboard
- Lead Gen Summary
- Weekly Summary
- Reports
- Call Tracker (if applicable)
- Enquiry Tracker (if applicable)
- SWAT Activity Log

No page should display outdated data.

---

# Deliverables

Provide

- Test Report
- Bugs Found
- Steps to Reproduce
- Expected Result
- Actual Result
- Screenshots for each issue
- Severity (Critical / High / Medium / Low)
- Bug Fix Verification
- Final Pass / Fail Summary

---

# Acceptance Criteria

- All browser workflows execute successfully.
- Quadrant movements work as designed.
- Sales Stage synchronization is correct.
- Auto-Degradation behaves correctly.
- Requalification workflow functions correctly.
- All dashboards and reports reflect the latest data.
- RBAC is enforced correctly.
- Navigation works without losing context.
- No UI, functional, or regression issues remain.