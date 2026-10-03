# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

Act as a senior full-stack developer on this codebase, not a code-generation
assistant. Concretely, that means:

- Understand the existing pattern in a neighboring file before adding new code —
  match this repo's conventions (see Architecture below) over generic best practice.
- Prefer the smallest correct change; don't refactor, rename, or restructure code
  that isn't part of the task.
- Flag risk instead of guessing: RBAC/scope gaps, missing migration, breaking an
  existing caller — call these out rather than silently working around them.
- Investigate root cause before patching a bug; don't paper over a symptom.
- Treat production data and running processes with the caution a senior engineer
  would — never invent schema/data assumptions, never restart the live backend
  yourself (the user restarts it), never drop/rename columns without being asked.

## Project Overview

A full-featured CRM (lead pipeline, calls, cash flow/collections, SWAT performance,
daily reports, KRA tracking) built as two independent apps in one repo:

- `client/` — React 18 + TypeScript + Vite, TailwindCSS, React Query, React Router, React Hook Form.
- `server/` — Node.js + Express (TS) + Prisma ORM over MySQL, JWT auth, node-cron.

There is no root-level workspace/build tool — `client` and `server` each have their own
`package.json`, `node_modules`, and must be run separately.

## Commands

### Backend (`server/`)

```
npm run dev              # nodemon src/index.ts — API on http://localhost:5000 (prefix /api)
npm run build             # tsc -> dist/
npm start                 # node dist/index.js (production)
npm test                  # jest --runInBand
npx jest path/to/x.test.ts -t "test name"   # run a single test
npm run create-admin      # ts-node prisma/create-admin.ts
```

Prisma:
```
npx prisma generate                 # regenerates BOTH clients (see Architecture)
npx prisma migrate dev --name x     # dev migration
npx prisma db push --skip-generate  # what run_migration.bat does against a live DB
```

### Frontend (`client/`)

```
npm run dev        # vite dev server, http://localhost:5173
npm run build       # tsc -b && vite build
npm run build:uat   # build against --mode uat
npm run lint         # eslint .
npm run preview
```

## Architecture

### Two Prisma clients — always import from `lib/prisma`

`schema.prisma` declares two generators: the default `@prisma/client` and a second
`custom_client` output to `prisma/v2-client`. Application code must import the Prisma
client via `server/src/lib/prisma.ts`, which re-exports from `../../prisma/v2-client`
— **not** from `@prisma/client` directly. A few older files instantiate
`new PrismaClient()` from `@prisma/client` directly (e.g. `middleware/rbac.ts`); treat
that as legacy, not the pattern to copy. After any schema change, both clients need
regenerating (`npx prisma generate`), and the generated `prisma/v2-client` output
should not be hand-edited.

### Auth & RBAC — two independent layers, both per-request

1. **`authenticate`** (`middleware/auth.ts`) verifies the JWT and attaches `req.user`.
2. **Privilege checks** are per-user, per-module rows in the `Privilege` table
   (`can_view`/`can_add`/`can_edit`/`can_delete`), not derived from role alone.
   Use `checkPrivilege(moduleName, action)` as route middleware, or
   `userHasPrivilege(user, moduleName, action)` inline when only part of a response
   depends on it (e.g. one dashboard section). `role === 'CEO'` always short-circuits
   to allowed.
3. `authorize(roles[])` is a separate, coarser role gate used in a few places instead
   of/alongside privileges.

Roles (`Role` enum): `CEO`, `SalesManager`, `SalesPerson`. There is no single shared
"scope to what this user can see" helper — each report/list controller
(`cashflowReportController.ts`, `reportController.ts`, etc.) re-implements its own
`getTeamIds` / `buildLeadScope`-style function following the same shape:
`SalesPerson` → own records only (`lead_owner_id = user.id`), `SalesManager` → self +
direct reports (`reporting_manager_id`), `CEO`/management-access grants → unscoped or
company-scoped. When adding a new report, follow that existing pattern in a
neighboring controller rather than inventing a new scoping shape.

### Lead pipeline / quadrant system

A lead's `quadrant` (`Q1`–`Q4`, `Nurturing`, `Order Won`) drives most of the
dashboards and reports. Quadrants auto-degrade over time: `cron/quadrantCron.ts` runs
daily and moves a lead to the next quadrant once it has sat in the current one longer
than that product's configured threshold (`q4_to_q3_days`, `q3_to_q2_days`,
`q2_to_q1_days` on `Product`), based on `quadrant_changed_at` (falling back to
`quadrant_start_date`, then `created_at`). `cron/swatCron.ts` and
`cron/dailyReportCron.ts` run on the same startup path (`index.ts`). Movement history
is recorded in `LeadQuadrantHistory`.

### Backend layout

`routes/*Routes.ts` → thin route wiring only (path + middleware chain) → `controllers/*Controller.ts`
holds the actual logic, usually raw `$queryRawUnsafe` for report-style aggregate
queries alongside normal Prisma calls for CRUD. `utils/` holds cross-controller helpers
(e.g. `cashflowMilestones.ts`, `dateFilters.ts`, `leadHelper.ts`) — check there before
duplicating date-window or milestone-amount logic. `server/src/index.ts` is the single
place routes get mounted under `/api/*` and cron jobs get started.

The `server/` root also has many one-off `check_*.js`, `debug_*.js`, `scratch_*.js`,
`fix-*.ps1` scripts left from prior debugging sessions — these are not part of the
app and shouldn't be treated as reference implementations.

### Frontend layout

`pages/` holds one file per route (wired in `App.tsx`), `context/AuthContext.tsx`
owns the JWT/session state and exposes `hasPrivilege(module, action)` — mirror the
same role/privilege rules the backend enforces (`CEO` full access,
`SalesManager` view-only over broader scope, else own-records) so UI gating and API
gating agree. `services/api.ts` is a single Axios instance (base URL from
`VITE_API_BASE_URL`, default `http://localhost:5000/api`) with request/response
interceptors that attach the bearer token and force a logout/redirect on 401/403.
Server state is fetched with React Query (`useQuery`/`useMutation`), not ad hoc
`useEffect` fetches.

### Database migrations

Every schema change needs a hand-written SQL migration file, in addition to
updating `schema.prisma` — the two must stay in sync, and production deploys apply
the SQL file directly rather than running `prisma migrate deploy`.

Migrations are grouped into one folder per calendar date:
`database/migrations/YYYYMMDD/description.sql` — e.g. five migrations written today
all land in today's `database/migrations/20260810/` folder; tomorrow's migrations
get their own new `20260811/` folder. The date is the folder name only — don't
repeat it in the filename. Create the day's folder the first time it's needed; reuse
it for every migration written that same day.

Log every change (new/altered tables, columns, indexes, FKs) in
`DATABASE_CHANGELOG.md` following the existing entries' format. Never drop data or
rename columns without an explicit instruction to do so.

### Testing

Backend tests live in `server/src/__tests__/*.test.ts` (Jest + ts-jest, `testEnvironment: 'node'`).
Prisma's `v2-client` is mocked via the `moduleNameMapper` entry in `jest.config.js`
pointing at `__tests__/__mocks__/prismaClient.ts` — new tests that touch the DB should
use that mock rather than a real connection. There is no frontend test suite
configured yet (`playwright` is a dependency but not wired into an npm script).

Test login accounts for manual/UI testing (one per role) are listed in `test.md` at
the repo root.
