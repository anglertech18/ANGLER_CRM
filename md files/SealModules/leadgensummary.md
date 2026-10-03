# Task: Implement Lead Gen Summary Module - Target & Achievement Calculation Logic

## Objective

Implement the Lead Gen Summary calculations based on the provided business sheet and dashboard layout.

The module should calculate values dynamically using selected:

* Product
* User(s)
* Month
* Week

while respecting RBAC permissions.

---

# Filters

The Lead Gen Summary should support:

* Product Filter
* User Multi-Select Filter
* Month Filter
* Week Filter

All calculations below should use the currently selected filters.

---

# 1. Direct Marketing Calls

## Weekly Target

### Formula

```text
User Call Target × 5
```

### Example

| User   | Daily Target |
| ------ | ------------ |
| Selvam | 40           |

```text
Weekly Target
=
40 × 5
=
200
```

---

## Weekly Achievement

Retrieve from:

```text
Call Tracker Module
```

Conditions:

```sql
Call Date within selected week
AND
Call Status IS NOT NULL
AND
Product = Selected Product
AND
User = Selected User
```

### Formula

```text
Weekly Achievement
=
Count(Call Tracker Records)
```

---

## Weekly Percentage

### Formula

```text
Achievement / Target × 100
```

Example:

```text
10 / 200 × 100
=
5%
```

---

# 2. Monthly Direct Marketing Calls

## Monthly Target

### Formula

```text
User Call Target × 20
```

### Example

```text
40 × 20
=
800
```

---

## Monthly Achievement

Retrieve from:

```text
Call Tracker Module
```

Conditions:

```sql
Call Date within selected month
AND
Call Status IS NOT NULL
AND
Product = Selected Product
AND
User = Selected User
```

### Formula

```text
Monthly Achievement
=
Count(Call Tracker Records)
```

---

## Monthly Percentage

### Formula

```text
Monthly Achievement / Monthly Target × 100
```

---

# 3. Leads Section

## Weekly Lead Target

Retrieve from:

```text
User Product Mapping Target
```

or configured lead target master.

Conditions:

```text
Selected Product
Selected User
Selected Week
```

---

## Weekly Lead Achievement

Retrieve from:

```text
Lead Module
```

Conditions:

```sql
Lead Created Date within selected week
AND
Product = Selected Product
AND
Lead Owner = Selected User
```

### Formula

```text
Weekly Lead Achievement
=
Count(Leads)
```

---

## Weekly Lead Percentage

### Formula

```text
Lead Achievement / Lead Target × 100
```

---

# 4. Monthly Lead Achievement

Retrieve from:

```text
Lead Module
```

Conditions:

```sql
Lead Created Date within selected month
AND
Product = Selected Product
AND
Lead Owner = Selected User
```

### Formula

```text
Monthly Lead Achievement
=
Count(Leads)
```

---

# 5. Lead Count (Pipeline)

The counts should come from the Lead Module.

---

## Weekly Q1 Count

```sql
Lead Created Date within selected week
AND
Product = Selected Product
AND
Lead Owner = Selected User
AND
Quadrant = Q1
```

### Result

```text
Count(Q1 Leads)
```

---

## Weekly Q2 Count

```sql
Quadrant = Q2
```

### Result

```text
Count(Q2 Leads)
```

---

## Weekly Q3 Count

```sql
Quadrant = Q3
```

### Result

```text
Count(Q3 Leads)
```

---

## Weekly Q4 Count

```sql
Quadrant = Q4
```

### Result

```text
Count(Q4 Leads)
```

---

## Weekly Total

### Formula

```text
Q1 + Q2 + Q3 + Q4
```

---

# 6. Monthly Lead Count (Pipeline)

Use the same logic as Weekly Lead Count.

Change only:

```text
Selected Week
```

to

```text
Selected Month
```

---

# 7. Demo Given

Retrieve from:

```text
SWAT Performance Module
```

---

## Weekly Demo Achievement

Conditions:

```sql
Demo Date within selected week
AND
Product = Selected Product
AND
User = Selected User
```

### Formula

```text
Sum(Demo Value)
```

---

## Monthly Demo Achievement

Conditions:

```sql
Demo Date within selected month
AND
Product = Selected Product
AND
User = Selected User
```

### Formula

```text
Sum(Demo Value)
```

---

# 8. Proposals Submitted

Retrieve from:

```text
SWAT Performance Module
```

---

## Weekly Proposal Achievement

Conditions:

```sql
Proposal Date within selected week
AND
Product = Selected Product
AND
User = Selected User
```

### Formula

```text
Sum(Proposal Value)
```

---

## Monthly Proposal Achievement

Conditions:

```sql
Proposal Date within selected month
AND
Product = Selected Product
AND
User = Selected User
```

### Formula

```text
Sum(Proposal Value)
```

---

# RBAC Rules

## CEO / Admin

Can view:

```text
All Users
All Products
```

---

## Sales Manager

Can view:

```text
Own Data
+
Subordinate Users Data  (entire downward reporting tree, all levels — via utils/teamScope)
```

---

## Sales Person

Can view:

```text
Only Own Data
```

---

# Totals Row

The Total row should display:

### Direct Marketing Calls

```text
Sum(Target)
Sum(Achievement)
Calculated %
```

### Leads

```text
Sum(Target)
Sum(Achievement)
Calculated %
```

### Pipeline

```text
Sum(Q1)
Sum(Q2)
Sum(Q3)
Sum(Q4)
Sum(Total)
```

### Demo Given

```text
Sum(Demo Value)
```

### Proposals

```text
Sum(Proposal Value)
```

---

# Acceptance Criteria

* Weekly and Monthly sections calculate independently.
* Direct Marketing Calls Achievement comes from Call Tracker.
* Leads Achievement comes from Lead Module.
* Pipeline counts come from Quadrant values.
* Demo Given comes from SWAT Performance Demo Value.
* Proposal Submitted comes from SWAT Performance Proposal Value.
* Product filter works correctly.
* User multi-select filter works correctly.
* RBAC rules are enforced.
* Totals row displays correct aggregated values.
* All calculations update dynamically when filters change.
