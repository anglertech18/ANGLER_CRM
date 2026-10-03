# Cash Flow Management Enhancement

## 1. Milestone Master Table

### Table Name

`milestones`

### Fields

| Field Name      | Type         | Description                            |
| --------------- | ------------ | -------------------------------------- |
| id              | Integer (PK) | Auto Increment ID                      |
| lead_id         | Integer (FK) | Reference to Lead                      |
| milestone_id    | Integer (FK) | Reference to Payment Type Master       |
| percentage      | Decimal      | Milestone Percentage                   |
| expected_amount | Decimal      | Expected Payment Amount                |
| actual_amount   | Decimal      | Actual Received Amount                 |
| edc             | Date         | Expected Date of Collection            |
| revised_edc     | Date         | Revised Expected Date of Collection    |
| aging           | Integer      | Auto-calculated Aging Days             |
| bant_poa        | Varchar      | BANT POA Value                         |
| bant_poa_edc    | Date         | BANT POA EDC                           |
| status          | Enum         | Yet To Start / In Progress / Completed |
| created_at      | Timestamp    | Created Date                           |
| updated_at      | Timestamp    | Modified Date                          |

### Status Logic

#### Yet To Start

```
actual_amount IS NULL
OR
actual_amount = 0
```

#### In Progress

```
actual_amount > 0
AND
actual_amount < expected_amount
```

#### Completed

```
actual_amount = expected_amount
```

---

# 2. Lead Module Enhancement

## Sales Engagement Section

Add the following field after:

```
Customer Order Attachment *
```

### Vertical

| Field       | Type     |
| ----------- | -------- |
| vertical_id | Dropdown |

#### Source

* Vertical Master

#### Database

Add new field in Lead table:

```
vertical_id
```

---

## Milestones Section

Create a new section called:

### Milestones

Fields:

| Field           | Source              |
| --------------- | ------------------- |
| Milestone Type  | Payment Type Master |
| Percentage      | User Input          |
| Expected Amount | User Input          |
| EDC             | Date Picker         |

### Requirements

* User can add multiple milestone rows for a single lead.
* One lead can contain multiple milestones.
* Data should be stored in the `milestones` table.
* Edit and delete milestone rows before saving the lead.
* Percentage entry is clamped on input so a row plus all other rows can never exceed 100%; Expected Amount is likewise clamped to the remaining Order Value. When a value is capped, an inline notice appears immediately ("Percentage capped at X% — total across milestones cannot exceed 100%." / "Expected Amount capped at X — milestones cannot exceed the Order Value.") and auto-dismisses after 4s. Save is additionally blocked if the total percentage exceeds 100%. This applies to both the milestone form on the Lead form (`LeadForm.tsx`) and the Order Won lead view (`OrderWonLeadView.tsx`).

Example:

| Milestone Type | Percentage | Expected Amount | EDC         |
| -------------- | ---------- | --------------- | ----------- |
| Advance        | 20%        | 100000          | 30-Jun-2026 |
| Development    | 40%        | 200000          | 30-Jul-2026 |
| Delivery       | 40%        | 200000          | 30-Aug-2026 |

---

# 3. Cashflow Tracker Module Enhancement

## Default Product Selection

When user enters Cashflow Tracker:

* Display only mapped products.
* Automatically select the first mapped product by default.

---

## Company Dropdown

Upon Product Selection:

* Load companies (Leads with Sales Stage = Order Won) associated with the selected product.
* Populate Company dropdown dynamically.

Flow:

```
Product
    ↓
Company (Lead)
```

---

## Milestone Data Loading

Upon Company Selection:

Fetch all milestone records mapped to the selected Lead.

Display the following columns:

| Milestone Type | Percentage | Expected Amount | Actual Amount | EDC | Revised EDC | Aging | BANT POA | BANT POA EDC | Status |
| -------------- | ---------- | --------------- | ------------- | --- | ----------- | ----- | -------- | ------------ | ------ |

---

## Editable Fields

User can update:

* Actual Amount
* Revised EDC
* BANT POA
* BANT POA EDC

System Auto Calculates:

* Aging
* Status

---

## Save Functionality

On Save:

* Update corresponding milestone records.
* Recalculate Status.
* Recalculate Aging.

---

## Module Flow

Cashflow Tracker
↓
Load User Mapped Products
↓
Auto Select First Product
↓
Load Companies (Leads - Sales Stage = Order Won)
↓
Select Company
↓
Load Lead Milestones
↓
Update Actual Amount / EDC Details
↓
Save
↓
Update Milestone Table
