# SWAT Target Management & Activity Log Update

## 1. Target Management – Add Activities Target Fields

Update **User Target Management** to include target fields for the SWAT activities.

The target values configured for each user in Target Management should be used as the source for the corresponding SWAT Activity Log targets.

### Requirement

* Add the required **Activity Target** fields in Target Management.
* Targets must be maintained user-wise.
* Use the existing Target Management structure and flow.
* Do not change existing target-related functionality.

---

## 2. SWAT Performance Form – Activity Log

The **SWAT Activity Log table already contains the required target fields**.

Use these existing fields to display the activity targets.

### Requirement

For each activity listed in the SWAT Activity Log:

* Fetch the user's configured activity target from **Target Management**.
* Display the target value in the existing **Target** field/column in the SWAT Activity Log table.
* Do not create duplicate target fields in the SWAT table.
* Use the existing SWAT table target fields.

### Target Flow

```text
User Target Management
        ↓
User-wise Activity Target
        ↓
SWAT Performance Form
        ↓
Activity Log → Target
```

---

## 3. Activity Achievement Values

The **existing achievement value flow must remain unchanged**.

Do not modify how achievement values are currently calculated, fetched, entered, or saved.

### Important

* Existing achievement logic → **KEEP AS-IS**
* Existing achievement calculations → **KEEP AS-IS**
* Existing achievement manual-entry flow → **KEEP AS-IS**
* Existing achievement save/update flow → **KEEP AS-IS**

Only update the **Target** value display.

---

## 4. Important Constraints

* Do **not** change existing SWAT Activity Log achievement functionality.
* Do **not** change existing achievement calculations.
* Do **not** create duplicate fields in the SWAT table.
* Use the target fields that already exist in the SWAT table.
* Add the required activity target fields only in Target Management.
* Fetch targets based on the logged-in/user-mapped user.
* Preserve all existing validations and save/update functionality.
* Do not affect any unrelated SWAT functionality.

---

## 5. Expected Outcome

### Target Management

Users have activity-specific target fields that can be configured.

### SWAT Activity Log

The existing **Target** column displays the corresponding user target.

### Achievement

The existing achievement values and their complete flow remain unchanged.

### Final Flow

```text
Target Management
      ↓
Configure User Activity Targets
      ↓
SWAT Performance Form
      ↓
Activity Log
      ↓
Display Target
      +
Existing Achievement Value Flow
```

**Scope:** Update activity target management and target display only. Do not modify existing achievement functionality or unrelated SWAT logic.
