# Lead Source & Lead Source Type Masters

## 1. Objective

Create a new **Lead Source Type Master** and map each Lead Source to an existing Lead Source Type.

The **Lead Source Type** will be maintained separately as a master.

The existing **Lead Source Master** will have a dropdown to select the Lead Source Type.

### Example

```text
Lead Source Type Master

Direct
Digital
Reference
Exhibition
```

While creating a Lead Source:

```text
Lead Source      : Telecall
Lead Source Type : Direct
```

After saving:

```text
Telecall → Direct
```

---

# 2. Lead Source Type Master

## 2.1 Master Name

**Lead Source Type Master**

## 2.2 Fields

| Field            | Description          |
| ---------------- | -------------------- |
| ID               | Unique identifier    |
| Lead Source Type | Name of the type     |
| Status           | Active / Inactive    |
| Created Date     | Record creation date |
| Updated Date     | Last updated date    |

---

## 2.3 Lead Source Type List

Display:

| S.No | Lead Source Type | Status | Action |
| ---- | ---------------- | ------ | ------ |
| 1    | Direct           | Active | Edit   |
| 2    | Digital          | Active | Edit   |
| 3    | Reference        | Active | Edit   |
| 4    | Exhibition       | Active | Edit   |

Actions:

* Add
* Edit
* Activate / Deactivate

---

## 2.4 Add Lead Source Type

Form:

```text
Lead Source Type
[________________________]

Status
[ Active ▼ ]

[ Save ]
```

Example:

```text
Lead Source Type : Direct
Status           : Active
```

---

## 2.5 Validation

* Lead Source Type is mandatory.
* Duplicate Lead Source Type should not be allowed.
* Leading and trailing spaces should be removed.
* Inactive Lead Source Types should remain in the master but should not be available for new mappings.

---

# 3. Lead Source Master

The existing **Lead Source Master** should continue to be used.

Add one field:

```text
Lead Source Type
```

The value must be selected from the **Lead Source Type Master**.

---

## 3.1 Add Lead Source

Form:

```text
Lead Source
[________________________]

Lead Source Type
[ Select Lead Source Type ▼ ]

Status
[ Active ▼ ]

[ Save ]
```

Example:

```text
Lead Source      : Telecall
Lead Source Type : Direct
Status           : Active
```

---

# 4. Lead Source Type Dropdown

The Lead Source Type field must be a **dropdown**, not a text field.

Example:

```text
Lead Source Type
┌─────────────────────┐
│ Select              │
│ Direct              │
│ Digital             │
│ Reference           │
│ Exhibition          │
└─────────────────────┘
```

The dropdown values must come from the **Lead Source Type Master**.

Only **Active** Lead Source Types should be available for selection.

---

# 5. Lead Source List

The Lead Source Master list should display the mapped Lead Source Type.

Example:

| S.No | Lead Source        | Lead Source Type | Status | Action |
| ---- | ------------------ | ---------------- | ------ | ------ |
| 1    | Telecall           | Direct           | Active | Edit   |
| 2    | LinkedIn           | Digital          | Active | Edit   |
| 3    | Customer Reference | Reference        | Active | Edit   |
| 4    | Trade Show         | Exhibition       | Active | Edit   |

---

# 6. Edit Lead Source

When editing an existing Lead Source, the previously selected Lead Source Type should automatically be displayed.

Example:

```text
Lead Source
[ Telecall ]

Lead Source Type
[ Direct ▼ ]

Status
[ Active ▼ ]

[ Update ]
```

The user should be able to change the Lead Source Type.

Example:

```text
Before:

Telecall → Direct


After:

Telecall → Reference
```

---

# 7. Lead Source Type Relationship

Relationship:

```text
Lead Source Type
       │
       │ One
       │
       ▼
Multiple Lead Sources
```

Example:

```text
Direct
 ├── Telecall
 ├── Cold Call
 └── Sales Call

Digital
 ├── LinkedIn
 ├── Google Ads
 └── Website

Reference
 ├── Customer Reference
 └── Employee Reference
```

One Lead Source Type can be mapped to multiple Lead Sources.

Each Lead Source should have one Lead Source Type.

---

# 8. Deactivation Rules

## Lead Source Type

If a Lead Source Type is already mapped to one or more Lead Sources:

* Do not hard delete it.
* Allow only Active / Inactive status change.
* Existing Lead Source mappings should remain unchanged.

Example:

```text
Direct → Inactive
```

Existing mappings:

```text
Telecall → Direct
Cold Call → Direct
```

should remain available as existing data.

However, `Direct` should not appear as a selectable option when creating a new Lead Source.

---

## Lead Source

Existing Lead Source status functionality should remain unchanged.

Deactivating a Lead Source should not remove its Lead Source Type mapping.

---

# 9. Initial Master Data Example

### Lead Source Type Master

```text
Direct
Digital
Reference
Exhibition
```

### Lead Source Master

```text
Telecall           → Direct
Cold Call          → Direct
LinkedIn           → Digital
Google Ads         → Digital
Customer Reference → Reference
Trade Show         → Exhibition
Exhibition         → Exhibition
```

---

# 10. Final UI Flow

### Step 1 — Create Lead Source Type

```text
Masters
   ↓
Lead Source Type
   ↓
Add
   ↓
Name: Direct
   ↓
Save
```

### Step 2 — Create Lead Source

```text
Masters
   ↓
Lead Source
   ↓
Add
   ↓
Lead Source: Telecall
Lead Source Type: Direct
   ↓
Save
```

### Final Result

```text
Lead Source Type Master
        │
        ├── Direct
        ├── Digital
        ├── Reference
        └── Exhibition
                 │
                 ↓
Lead Source Master
        │
        ├── Telecall → Direct
        ├── LinkedIn → Digital
        ├── Customer Reference → Reference
        └── Trade Show → Exhibition
```

## Requirement Summary

1. Create **Lead Source Type Master**.
2. Existing **Lead Source Master** remains.
3. Add **Lead Source Type dropdown** to Lead Source Master.
4. Dropdown values come from Lead Source Type Master.
5. User selects an existing type while creating/editing a Lead Source.
6. One Lead Source Type can have multiple Lead Sources.
7. One Lead Source should map to one Lead Source Type.
8. Do not add or modify any other module functionality.
