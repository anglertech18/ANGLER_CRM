# Category 2 - Sales Activities

## Overview

Display sales activities based on follow-up schedules and lead engagement dates. All cards should display consolidated data by default without requiring any filters or selections.

Clicking a card should navigate to the Lead Report with the corresponding filters applied automatically.

---

## 1. Today Pending Calls

### Logic
- Next Follow-up Date = Today.
- Move to Pipeline is NULL.

### Card
Today Pending Calls

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Next Follow-up Date
- Lead Status

### On Click
Open the Call Tracker with:
- Next Follow-up Date = Today
- Move to Pipeline = NULL

---

## 1a. Last Week Pending

### Logic
- Next Follow-up Date falls within the previous week.
- Move to Pipeline is NULL.

### Card
Last Week Pending

### On Click
Open the Call Tracker with:
- Previous Week
- Move to Pipeline = NULL

---

## 2. This Week Pending

### Logic
- Next Follow-up Date falls within the current week.
- Move to Pipeline is NULL.

### Card
This Week Pending

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Next Follow-up Date

### On Click
Open the Call Tracker with:
- Current Week
- Move to Pipeline = NULL

---

## 2a. Next Week Calls

### Logic
- Next Follow-up Date falls within the next week.
- Move to Pipeline is NULL.

### Card
Next Week Calls

### On Click
Open the Call Tracker with:
- Next Week
- Move to Pipeline = NULL

---

## 2b. Overdue Calls

### Logic
- Next Follow-up Date < Today.
- Move to Pipeline is NULL. No lower bound — every still-pending call whose
  follow-up date has passed, regardless of how long ago.

### Card
Overdue Calls

### On Click
Open the Call Tracker with:
- Next Follow-up Date < Today
- Move to Pipeline = NULL

---

## 3. Today's Lead Activities

### Logic
- Sales Engagement Date = Today.
- Sales Stage != Order Won.
- Sales Stage != Order Lost.

### Card
Today's Lead Activities

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Sales Engagement Date
- Current Sales Stage

### On Click
Open Lead Report with:
- Sales Engagement Date = Today
- Exclude Order Won & Order Lost

---

## 4. Last Week's Lead Activities

### Logic
- Sales Engagement Date falls within the previous week.
- Sales Stage != Order Won.
- Sales Stage != Order Lost.

### Card
Last Week's Lead Activities

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Sales Engagement Date

### On Click
Open Lead Report with:
- Previous Week
- Exclude Order Won & Order Lost

---

## 5. This Week's Lead Activities

### Logic
- Sales Engagement Date falls within the current week.
- Sales Stage != Order Won.
- Sales Stage != Order Lost.

### Card
This Week's Lead Activities

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Sales Engagement Date

### On Click
Open Lead Report with:
- Current Week
- Exclude Order Won & Order Lost

---

## 6. This Month's Lead Activities

### Logic
- Sales Engagement Date falls within the current month.
- Sales Stage != Order Won.
- Sales Stage != Order Lost.

### Card
This Month's Lead Activities

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Sales Engagement Date

### On Click
Open Lead Report with:
- Current Month
- Exclude Order Won & Order Lost

---

## 7. Next Month's Lead Activities

### Logic
- Sales Engagement Date falls within the next month.
- Sales Stage != Order Won.
- Sales Stage != Order Lost.

### Card
Next Month's Lead Activities

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Sales Engagement Date

### On Click
Open Lead Report with:
- Next Month
- Exclude Order Won & Order Lost

---

## 8. Over Due Activities

### Logic
- Sales Engagement Date has already passed (before today).
- Sales Stage != Order Won.
- Sales Stage != Order Lost.
- The latest Activity Log entry is not marked Completed.

### Card
Over Due Activities

### Tooltip
Display:
- Lead Name
- Customer Name
- Product
- Sales Person
- Sales Engagement Date

### On Click
Open Lead Report with:
- Sales Engagement Date <= Yesterday
- Exclude Order Won & Order Lost

Note: the Lead Report has no "latest activity not Completed" filter, so the
click-through list can still be a few rows larger than the card count when a
lead's most recent activity is already Completed.

---

## Default Behavior

- Display consolidated data across all products and sales persons.
- No filters or selections are required on the initial dashboard load.
- Hovering over a card displays the corresponding activity details.
- Clicking a card opens the Lead Report with the relevant filters applied automatically.