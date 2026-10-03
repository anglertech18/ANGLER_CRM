# SEAL Dashboard

## Overview
The SEAL (Sales, Engagement & Activity Ledger) Dashboard is the central performance analytics screen for the SEAL module. It aggregates sales, licence/device, partner sign-up, and lead quadrant data for a selected product and fiscal year, presented as summary cards, performance tables, charts, and a weekly breakdown.

---

## Location
- **Frontend:** `client/src/pages/seal/SealDashboard.tsx`
- **Backend controller:** `server/src/controllers/sealController.ts` — `getSealData`, `getBdes`
- **API routes:** `GET /api/seal`, `GET /api/seal/bdes`, `GET /api/seal/poas/mapped-products`

---

## Key Features

### Filters
| Filter | Description |
|---|---|
| Product | RBAC-filtered dropdown — CEO sees all, Manager sees own+team products, SalesPerson sees own |
| BDE | Enabled only after a product is selected; scoped to users with active targets for that product |
| Fiscal Year | Offset selector: previous, current, next FY (Apr–Mar calendar) |

- Filters are persisted via `usePersistentFilters('seal-dashboard')`.
- On first load, the logged-in user's ID is auto-defaulted as the BDE, and the first mapped product is auto-selected.

### Summary Cards
Four stat cards at the top:
1. **Target to Date** — cumulative monthly sales target up to current month
2. **Actual to Date** — cumulative actual sales + performance % badge
3. **Total Licenses** — sum of device/licence achieved vs target
4. **Total Leads** — count of all leads across Q1–Q4 quadrants

### Zone of Performance
A visual band showing DANGER (<60%), REASONABLE (60–90%), EXCELLENT (>90%) based on `perfPct = actualToDate / targetToDate`.

### Three Performance Tables (Monthly, side by side)
1. **Monthly Performance** — Sales target vs actual vs % per fiscal month
2. **Device | Licence | New Clients** — licence target vs achieved vs % per month
3. **Partner Sign-Up** — partner target vs achieved vs % per month

Future months (after current date) display `—` for all values.

### Weekly Breakdown
Shows the current fiscal month broken into 4 weeks (day 1–7, 8–14, 15–21, 22–end).

| Column | Description |
|---|---|
| Week | Week 1–4 within the current fiscal month |
| Weekly Target | Monthly sales target ÷ 4 |
| Achievement | `SUM(order_value)` of Order Won leads whose `updated_at` (i.e. Order Won date) falls within that week |

**Achievement calculation formula:**
```
Achievement = SUM(order_value)
WHERE  sales_stage = 'Order Won'
  AND  order_won_date BETWEEN week_start AND week_end
  AND  product_id = selected_product
  AND  lead_owner_id IN (RBAC-scoped user IDs)
```

RBAC scope mirrors the rest of the dashboard:
- **CEO / Admin** — all users
- **SalesManager** — self + entire downward reporting tree (all levels, via `utils/teamScope`)
- **SalesPerson** — own leads only

### Quadrant Leads Snapshot
Shows current lead counts per quadrant (Q1–Q4) and planned movements from the current week's Weekly Report (Q1→Q2, Q2→Q3, Q3→Q4). Hovering a count shows a tooltip with individual lead names and companies via React portal.

### Charts
- **Sales Performance Chart** — Line chart: Sales Target (dashed) vs Sales Actual (blue solid)
- **Licence Performance Chart** — Line chart: Licence Target (dashed) vs Licence Achieved (purple solid)
Both use Recharts `LineChart` with `ResponsiveContainer`.

---

## RBAC
| Role | Behaviour |
|---|---|
| CEO / Admin | Sees all products and all BDEs |
| SalesManager | Sees own + full downward reporting tree's products; aggregate or individual BDE view |
| SalesPerson | Always sees only own data; user filter locked to self |

---

## API Contract

### `GET /api/seal`
| Param | Type | Required | Description |
|---|---|---|---|
| `product_id` | number | Yes | Product to load data for |
| `fiscal_year` | number | No | FY start year (default: current FY) |
| `user_id` | number | No | BDE filter; null = aggregate all scoped users |

**Response shape:**
```json
{
  "product": { "id": 21, "name": "EIT Services" },
  "user": { "first_name": "All", "last_name": "Mapped BDEs", "role": "Group" },
  "fiscalYear": "2025-2026",
  "monthlyData": [ { "month": "Apr-25", "salesTarget": 200000, "actual": 0, "variancePct": 0, "licenseTarget": 5, "licenseAchieved": 0, "licensePct": 0, "partnerTarget": 3, "partnerAchieved": 0, "partnerPct": 0 } ],
  "quadrantData": [ { "quadrant": "Q1", "currentLeads": 5, "leads": [...], "quadrantMovement": 2, "movementLeads": [...] } ],
  "weeklyData": [ { "week": "Week 1", "salesTarget": 50000, "salesAchieved": 0 } ],
  "weeklyMonth": "Jun-26",
  "summary": { "targetToDate": 600000, "actualToDate": 40000, "perfPct": 7, "zone": "DANGER" },
  "totals": { "salesTarget": 600000, "actual": 40000, "licenseTarget": 15, "licenseAchieved": 2, "licensesPct": 13, "partnerTarget": 9, "partnerAchieved": 0, "partnersPct": 0 }
}
```

### `GET /api/seal/bdes?product_id=X`
Returns list of `{ id, first_name, last_name }` for users with active targets on the product, scoped by RBAC.

### `GET /api/seal/poas/mapped-products`
Returns list of `{ id, name }` products mapped to the current user via POA assignments.

---

## Known Issues / Notes
- `weeklyMonth` defaults to the first fiscal month (April) for past fiscal years instead of the last month (March). This means the Weekly Breakdown always shows April data when viewing a prior FY.
- Invalid `product_id` returns HTTP 200 with `product: null` instead of a 404.
- The quadrant tooltip shows `company_name` only; falls back to empty string if null, even when a `company_master` relation exists.
