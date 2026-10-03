# Task: Update Enquiry Tracker Module and EnquiryTracker.md Documentation

## Objective

Enhance the Enquiry Tracker module by introducing enquiry allocation functionality, updating enquiry listing tabs, and revising the module documentation accordingly.

---

# 1. Enquiry Form Update

## Requirements

### Add New Field

* Add a new field named **`enquiry_allocated_to`** in the enquiry creation/edit form.
* Position this field **above the Sales Team section**.

### Field Behavior

* **Field Name:** `enquiry_allocated_to`
* **Display Label:** `Lead Allocated To`
* **Default Value:** Empty / Null
* The field should allow selecting a user from the available users list.

### Rename Existing Label

* Rename the label **"Allocated To"** to **"Lead Allocated To"** throughout the Enquiry Tracker module.

---

# 2. Enquiry Creation Flow

## Requirements

When a user:

1. Creates a new enquiry,
2. Enters all required details,
3. Submits the enquiry form,

the system should:

* Save the enquiry successfully.
* Store the selected **`enquiry_allocated_to`** user.
* If no user is selected, keep the field value as **NULL/Empty**.

---

# 3. Enquiry Index Page Updates

## Current Behavior

* The index page contains an **"Active Enquiry"** tab.

## Required Changes

### Rename Tab

Rename:

```text
Active Enquiry
```

to:

```text
All Enquiry
```

---

# 4. All Enquiry Tab Logic

## Tab Name

```text
All Enquiry
```

## Requirements

Display all enquiries satisfying the following conditions:

* Enquiries belonging to the products mapped to the logged-in user.
* Include enquiries irrespective of allocation status.
* Show complete enquiry details according to existing permissions.

### Expected Result

Users should be able to view **all enquiries related to their mapped products**.

---

# 5. Allocated Enquiry Tab

## New/Updated Tab Name

```text
Allocated Enquiry
```

## Requirements

Display enquiries where:

```text
enquiry_allocated_to = Logged-in User
```

### Expected Result

Users should only see enquiries specifically allocated to them.

---

# 6. Converted Lead Tab Logic

## Tab Name

```text
Converted Lead
```

## Requirements

Display enquiries satisfying the following conditions:

* The enquiry has been converted into a lead.
* The converted lead has moved into a quadrant.
* The enquiry belongs to products mapped to the logged-in user.

### Expected Result

Users should be able to view all converted enquiries that have progressed into the lead management process.

---

# 7. Access Rules Summary

| Tab               | Visibility Logic                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------- |
| All Enquiry       | Display all enquiries related to products mapped to the logged-in user                       |
| Allocated Enquiry | Display enquiries where `enquiry_allocated_to` equals the logged-in user                     |
| Converted Lead    | Display converted enquiries with quadrant movement for products mapped to the logged-in user |

---

# 8. Database Changes

## Add New Column

```text
Table: enquiries
Column: enquiry_allocated_to
Type: Integer (User Reference)
Default: NULL
```

## Foreign Key Relationship

```text
enquiry_allocated_to → users.id
```

---

# 9. Application Changes

The following areas should be updated:

* Enquiry Add Form
* Enquiry Edit Form
* Enquiry Validation Rules
* Enquiry Save Logic
* Enquiry Listing Queries
* All Enquiry Tab
* Allocated Enquiry Tab
* Converted Lead Tab
* Permission Handling
* UI Labels
* Navigation/Menu Configuration (if applicable)

---

# 10. Documentation Update

Update the **EnquiryTracker.md** file to include:

* New `enquiry_allocated_to` field details.
* Updated enquiry creation workflow.
* Revised enquiry tab definitions.
* Allocation logic.
* Converted lead visibility rules.
* Database schema changes related to enquiry allocation.

---

# Acceptance Criteria

* A new **Lead Allocated To** field is available above the Sales Team section.
* The field remains empty by default during enquiry creation.
* Selected allocation values are saved correctly.
* **Active Enquiry** tab is renamed to **All Enquiry**.
* **All Enquiry** displays all enquiries related to the user's mapped products.
* **Allocated Enquiry** displays enquiries assigned to the logged-in user.
* **Converted Lead** displays converted enquiries moved to quadrants for mapped products.
* The `enquiry_allocated_to` database field is implemented.
* All related application logic is updated successfully.
* The **EnquiryTracker.md** file reflects all the above changes.
