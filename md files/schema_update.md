The UAT database contains existing data. Do not delete or recreate any tables.

My development database is the desired schema.

Tasks:

1. Compare the development and UAT database schemas.
2. Identify differences in:
   - Table names
   - Column names
   - Column types
   - Indexes
   - Foreign keys
   - Constraints
3. Generate a safe SQL migration script to make the UAT schema match the development schema.
4. If only the table name casing differs (e.g. PlanOfAction → planofaction), generate a safe rename strategy that preserves all data.
5. Do not use DROP TABLE, TRUNCATE, or DELETE.
6. Back up the UAT database before making any changes.
7. Show me the migration plan and SQL for review before executing anything.
8. After the schema update, verify that all Prisma queries and foreign keys still work.
9. If any step is risky, stop and ask for confirmation instead of making changes.


Do not execute any SQL automatically.

First:
- Compare the schemas.
- Produce a report of all differences.
- Generate the SQL migration.
- Wait for my approval before executing it.