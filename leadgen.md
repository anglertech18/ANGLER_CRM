Task: Create New Module - Lead Gen Summary

Important:
- Create this module similar to existing SEAL Dashboard module
- Reuse existing architecture, UI patterns, APIs, and coding standards
- Do NOT break existing functionality
- Follow scalable and reusable coding practices
- Avoid duplicate queries and duplicate business logic
- Keep module performance optimized

Tech Stack:
- React frontend
- Node.js backend
- MySQL database

==================================================
MODULE NAME
==================================================

Lead Gen Summary

==================================================
MODULE PURPOSE
==================================================

This module is used to display Lead Generation summary data based on:
- Product/Service
- BDE/User
- Weekly and Monthly performance

The module should work similar to SEAL Dashboard summary/report style.

==================================================
FILTER SECTION
==================================================

Add top filter section with:

1. Product / Service Dropdown
2. BDE Name Dropdown
3. Report Type:
   - Weekly
   - Monthly
4. Date filter if required
5. Reset filter button

Requirements:
- Filters should dynamically refresh data
- No page reload
- Use async API calls
- Use reusable filter components

==================================================
DATA SOURCES
==================================================

--------------------------------------------------
1. Direct Marketing Calls
--------------------------------------------------

Source:
Target Management module

Logic:
- Weekly Calls Target
- Monthly Calls Target
- Calls Achieved Count

Fields:
- target_calls
- achieved_calls

==================================================
ACHIEVEMENT CALCULATION
==================================================

Calculate:
- Weekly Achievement %
- Monthly Achievement %

Formula:

Achievement % =
(Calls Achieved / Calls Target) * 100

Example:
Target = 100
Achieved = 80

Achievement = 80%

==================================================
LEADS TARGET
==================================================

Currently:
- Leads target logic will be developed later

Requirement:
- Keep placeholder section ready
- Avoid hardcoded temporary values

==================================================
LEADS COUNT SECTION
==================================================

Lead counts should come from:
- Quadrant based lead data

Filter:
- Based on selected Product/Service

Example:
If Product = Vendora

Display:
- Vendora Q1 Count
- Vendora Q2 Count
- Vendora Q3 Count
- Vendora Q4 Count

Logic:
- Count leads grouped by quadrant
- Respect selected filters
- Respect user permissions

==================================================
PROPOSALS SECTION
==================================================

Proposal counts should come from:
- SWAT Module

Requirements:
- Show proposal count
- Filter based on:
   - selected product/service
   - selected BDE
   - selected period

==================================================
DASHBOARD UI REQUIREMENTS
==================================================

Create dashboard cards/widgets similar to SEAL Dashboard.

Required sections:

1. Direct Marketing Calls Summary
2. Weekly Achievement Summary
3. Monthly Achievement Summary
4. Quadrant Lead Counts
5. Proposal Summary
6. Future Leads Target Placeholder

==================================================
UI DESIGN REQUIREMENTS
==================================================

1. Modern responsive dashboard UI
2. Reusable summary cards
3. Tooltip support where needed
4. Hover effects
5. Proper loading skeletons/spinners
6. Mobile responsive
7. Avoid overcrowded UI

==================================================
PERMISSION REQUIREMENTS
==================================================

1. Users should only see:
   - permitted product/service data
   - permitted BDE data
2. Admin can see all data
3. Apply role-based filtering

==================================================
BACKEND REQUIREMENTS
==================================================

Create:
1. Routes
2. Controllers
3. Service layer
4. Query layer
5. Aggregation logic

Requirements:
- Use optimized SQL queries
- Avoid query inside loops
- Use reusable helper functions
- Proper error handling
- Modular API structure

==================================================
FRONTEND REQUIREMENTS
==================================================

Create:
1. Dashboard page
2. Summary cards
3. Filter components
4. API integration
5. State management
6. Loading states
7. Empty states

Use:
- React functional components
- Hooks
- Async/Await

==================================================
DATABASE REQUIREMENTS
==================================================

1. Reuse existing tables where possible
2. Avoid unnecessary new tables
3. Explain if any schema changes are required

==================================================
EXPECTED OUTPUT
==================================================

Provide:
1. Module folder structure
2. Backend API code
3. SQL/query logic
4. React frontend implementation
5. Dashboard UI structure
6. Aggregation logic
7. Achievement calculation logic
8. Quadrant count logic
9. SWAT proposal integration
10. Role-based filtering
11. Full code snippets
12. Step-by-step explanation
13. Reusable architecture approach

==================================================
IMPORTANT DEVELOPMENT RULES
==================================================

1. Do NOT hardcode values
2. Do NOT duplicate existing dashboard logic
3. Reuse SEAL dashboard structure wherever possible
4. Maintain clean architecture
5. Use scalable naming conventions
6. Keep APIs reusable for future dashboards
7. Optimize performance for large datasets
8. Add comments where necessary
9. Handle null/empty values safely
10. Keep code production-ready