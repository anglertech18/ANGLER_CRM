# Daily Report Module - CRM

## Objective

The Daily Report Module allows users to submit their daily lead activities and automatically send a summarized email report to the CEO and selected recipients.


## Navigation
Reports
 └── Daily Report

---

# Module Flow

## Step 1: Open Daily Report Module

### Default Values

| Field         | Description                      |
| ------------- | -------------------------------- |
| To            | CEO (Auto-selected by default)   |
| CC            | Sales Manager(s) (Auto-selected) |
| Additional CC | User can select additional users |

---

## Step 2: Select Product

### Rules

* Display only products mapped to the logged-in user.
* Product selection is mandatory.

### Example

```text
Products
---------
CRM
ERP
HRMS
Digital Marketing
Web Development
```

---

## Step 3: Display Lead List

After selecting a product, display all mapped leads.

### Lead Grid

| Select | Lead Name   | Quadrant | Remarks             |
| ------ | ----------- | -------- | ------------------- |
| ☑      | ABC Pvt Ltd | Hot      | User enters remarks |
| ☑      | XYZ Ltd     | Warm     | User enters remarks |
| ☑      | Delta Corp  | Cold     | User enters remarks |

### Rules

* Lead Name should be auto-populated.
* Quadrant should be auto-populated from Lead Master.
* Remarks should be entered by the user.
* Multiple leads can be selected.
* Remarks are mandatory for selected leads.

---

## Step 4: Add Additional Product

User can click:

```text
+ Add Another Product
```

### Flow

1. Select Product
2. Select Leads
3. Enter Remarks

User can repeat this process multiple times before submission.

---

## Step 5: Review Summary

Display selected records before submission.

### Example

| Product | Lead Name   | Quadrant | Remarks             |
| ------- | ----------- | -------- | ------------------- |
| CRM     | ABC Pvt Ltd | Hot      | Interested in Demo  |
| CRM     | XYZ Ltd     | Warm     | Proposal Shared     |
| ERP     | Delta Corp  | Cold     | Follow-up Next Week |

---

## Step 6: Submit Report

### Actions

* Save Daily Report.
* Save Selected Products.
* Save Selected Leads and Remarks.
* Generate Email Content.
* Send Email to CEO and CC Users.

---

# Database Structure

## daily_reports

| Field       |
| ----------- |
| id          |
| report_date |
| created_by  |
| to_user_id  |
| created_at  |
| updated_at  |

---

## daily_report_entries

| Field           |
| --------------- |
| id              |
| daily_report_id |
| product_id      |
| lead_id         |
| quadrant        |
| remarks         |

---

# Email Configuration

## Recipients

### To

* CEO (Default)

### CC

* Sales Manager(s) (Default)
* Additional Selected Users

---

# Email Subject

```text
Daily Lead Activity Report - DD-MMM-YYYY
```

Example:

```text
Daily Lead Activity Report - 18-Jun-2026
```

---

# Email Body Format

The email should be generated in HTML table format.

## Sample Email

| Product | Lead Name   | Quadrant | Remarks             |
| ------- | ----------- | -------- | ------------------- |
| CRM     | ABC Pvt Ltd | Hot      | Interested in Demo  |
| CRM     | XYZ Ltd     | Warm     | Proposal Shared     |
| ERP     | Delta Corp  | Cold     | Follow-up Next Week |

---

# Validation Rules

1. Product selection is mandatory.
2. At least one Lead must be selected.
3. Remarks are mandatory for selected leads.
4. CEO should be auto-selected as recipient.
5. Duplicate Lead selection within the same report should not be allowed.
6. User can select multiple products before submission.

---

# Buttons

| Button              | Action                            |
| ------------------- | --------------------------------- |
| Add Another Product | Add another product section       |
| Save Draft          | Save report without sending email |
| Submit & Send Mail  | Save report and send email        |

---

# Expected Outcome

* Users can submit daily lead activities.
* Multiple products can be included in a single report.
* Lead Name and Quadrant are automatically displayed.
* Users enter activity remarks for each lead.
* A structured HTML table report is emailed to the CEO and CC recipients.
* All submitted data is stored for audit and reporting purposes.
