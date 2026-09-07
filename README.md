# FORGE — UAS Capability Portal

FORGE is a local relational prototype for discovering fictional UAS capability Problems, the Solution Efforts attempting to solve them, the Units doing the work, and the evidence and Lessons those efforts produce.

## Product philosophy

Problems are enduring capability gaps. Projects are broad Solution Efforts: organic development, vendor evaluation, tactics/techniques, training, integration/configuration, process/policy, or hybrid work. Multiple efforts can address the same Problem, one effort can address multiple Problems, and unsuccessful or alternative work remains valuable institutional knowledge.

## Stack and architecture

- Vinext, React 19, TypeScript, Tailwind CSS, and Lucide icons
- Prisma ORM 6 with local SQLite
- Node's built-in test runner

Persistent operations are server-side:

- `prisma/schema.prisma` defines the relational model; `prisma/migrations/` contains reproducible migrations; `prisma/seed.ts` creates the fictional network.
- `lib/db.ts` owns the Prisma singleton. `lib/data/portal.ts` queries narrow UI projections. `lib/data/mutations.ts` contains validated transactional mutations.
- `lib/domain/` contains pure matching, search, validation, and tracking-ID logic.
- `app/api/` exposes mutations and duplicate-work lookup. `app/page.tsx` loads the initial server projection.

The database—not browser storage—is the source of truth. Client state is limited to navigation, filters, and view preferences.

## Important relationships

- `ProblemProject`: explicit many-to-many Problem ↔ Project junction with `isPrimary` metadata.
- `ProjectUnit`: explicit many-to-many Project ↔ Unit junction with Lead, Supporting, and Testing roles.
- `Project.leadUnitId`: distinct required Lead Unit.
- `ProblemUnit`: Reporter/Affected Unit relationships.
- Explicit tag and location junctions connect Problems, Projects, Units, and Lessons.
- Phases, Lessons, repository links, activities, and help requests use foreign keys.

Internal integer keys and public tracking IDs are separate. `TrackingCounter` allocates IDs transactionally as `PRB-000001`, `PRJ-000001`, `UNIT-000001`, and `LES-000001`. SQLite serializes writes for this prototype. A concurrent production deployment should use PostgreSQL row locking or a database sequence while preserving the format.

## Clean local setup

Requirements: Node.js 22.13+ and pnpm.

```bash
pnpm install
copy .env.example .env
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

On macOS/Linux, use `cp .env.example .env`. Open `http://localhost:3000`.

For a new schema change:

```bash
pnpm db:migrate --name descriptive_change
```

Other useful commands are `pnpm db:generate`, `pnpm db:seed`, and `pnpm db:reset`. For an existing relational prototype database, `pnpm db:upgrade-solutions` applies the idempotent pathway demonstration data without resetting local records.

## Quality checks

```bash
pnpm exec prisma validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Tests cover both many-to-many relationships, the Lead Unit, tracking formats, persisted Problem/Project creation, conditional organic/vendor/TTP/training detail persistence, multi-Problem and multi-Unit links, exact ID/keyword search, solution-type/vendor filtering, and deterministic duplicate detection.

## Seed and persistence

The fictional seed contains 12 Problems, 20 Solution Efforts, 12 Units across 8 locations, 40 phases, 20 Lessons Learned, and 44 activities. `PRB-000001 — Short RF Range` has five deliberately different pathways: organic relay development, a commercial radio evaluation, a directional-antenna technique, an RF-planning training package, and an existing-radio configuration improvement.

Dashboard, search, comparison, Units, map markers, Related Work, Capability Graph, Executive/Technical views, phases, lessons, repositories, activity, and help requests derive from SQLite. New Problems and conditional Solution Efforts persist through server routes and survive refresh/restart. Detail pages are addressable at `/problems/[id]`, `/projects/[id]`, and `/units/[id]`; project pages expose edit, phase, Lesson, and repository forms.

All records are fictional and non-sensitive.

## Remaining limitations

- Conditional create forms currently focus on the highest-value identifying and evaluation fields; the schema retains additional context fields for progressive UI expansion.
- Map geometry and graph layout are illustrative; their records and relationships are persisted.
- Authentication, permissions, file storage, synchronization, and external integrations are omitted.
- SQLite is local-only. PostgreSQL migration requires changing the datasource provider/URL, creating a new migration baseline, and strengthening counter allocation; the relational model and data services can remain.

## Recommended next pass

1. Add URL-addressable Problem, Project, and Unit detail routes with missing-record states.
2. Build forms over existing server mutations for Projects, edits, phases, Lessons, and repositories.
3. Run integration tests against an isolated temporary database.
4. Add visibility-aware authorization boundaries before authentication.
5. Replace illustrative map/graph rendering only after relational workflows are complete.
