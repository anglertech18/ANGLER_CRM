Task: Implement Auto Save Functionality for SWAT Performance Activity Log

Important:
- Do NOT break existing manual save functionality
- Keep existing activity log flow intact
- Follow current architecture and coding standards
- Maintain backward compatibility
- Use scalable and optimized implementation

Tech Stack:
- React frontend
- Node.js backend
- MySQL database

==================================================
MODULE
==================================================

SWAT Performance Activity Log

==================================================
CURRENT BEHAVIOR
==================================================

Currently:
- User manually saves activity log entries

New Requirement:
- Add automatic end-of-day auto save functionality

==================================================
AUTO SAVE REQUIREMENT
==================================================

Required Behavior:

1. User can still manually save activity logs
2. If user does NOT manually save:
   - system should automatically save entries
   - at end of every day
3. Auto save should:
   - save draft/current activity data
   - avoid duplicate entries
   - maintain data integrity

==================================================
AUTO SAVE LOGIC
==================================================

Requirements:

1. Detect unsaved activity data
2. Automatically trigger save process:
   - end of day
   OR
   - scheduled background process
3. Ensure:
   - only unsaved records are auto saved
   - already saved records are skipped
4. Prevent duplicate insertions
5. Add proper save status tracking

==================================================
DATABASE REQUIREMENTS
==================================================

If needed, add fields like:

- is_auto_saved
- is_manually_saved
- draft_status
- last_auto_saved_at

But:
- avoid unnecessary schema changes
- reuse existing structure wherever possible

==================================================
BACKEND REQUIREMENTS
==================================================

Create/Update:

1. Auto save service
2. Scheduler/Cron job
3. Save validation logic
4. Duplicate prevention logic
5. Draft detection logic

Requirements:
- Use optimized queries
- Proper transaction handling
- Error logging
- Retry-safe logic
- Scalable scheduler implementation

==================================================
FRONTEND REQUIREMENTS
==================================================

Requirements:

1. Maintain existing manual save button
2. Show save status:
   - Saved
   - Auto Saved
   - Unsaved Changes
3. Optional:
   - auto save indicator/loading
4. Prevent UI freezing
5. Avoid unnecessary API calls

==================================================
AUTO SAVE CONDITIONS
==================================================

Auto save should happen only when:

<!-- 1. User has entered/modified data -->
2. Data is not already saved
3. Required minimum fields are available
4. User session/activity is valid

==================================================
DUPLICATE PREVENTION
==================================================

System must prevent:

1. Multiple auto saves for same entry
2. Duplicate daily records
3. Duplicate manual + auto saved entries

Use:
- unique validation
- update-or-create logic
- transaction-safe operations

==================================================
SCHEDULER REQUIREMENTS
==================================================

Implement:
- Node cron job
OR
- background scheduler

Schedule:
- Run end of every day

Example:
11:59 PM daily

Requirements:
- configurable timing
- proper timezone handling
- logging support

==================================================
PERMISSION & SECURITY
==================================================

1. Users can only auto save their own logs
2. Admin can monitor all logs
3. Prevent unauthorized updates

==================================================
EXPECTED OUTPUT
==================================================

Provide:
1. Scheduler/Cron implementation
2. Backend auto save logic
3. Database changes if needed
4. Duplicate prevention logic
5. React frontend updates
6. Save status handling
7. API updates
8. Auto save flow explanation
9. Full code snippets
10. Step-by-step implementation guide

==================================================
IMPORTANT DEVELOPMENT RULES
==================================================

1. Do NOT remove manual save
2. Do NOT create duplicate records
3. Keep existing APIs stable where possible
4. Use scalable architecture
5. Add proper comments
6. Use async/await
7. Handle failures safely
8. Optimize performance
9. Avoid excessive auto save requests
10. Keep production-ready implementation

Manual Save → Preferred
Forgot to Save → System saves automatically