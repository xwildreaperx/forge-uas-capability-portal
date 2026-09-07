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

## Three knowledge experiences

- **Executive** is a one-minute, plain-language brief with the problem, approach, demonstrated result, risk, next step, and leadership action.
- **Technical** retains implementation detail, evidence, phases, Lessons Learned, artifact metadata, and relationship context.
- **AI Handoff** generates a versioned, timestamped, portable Project package in Markdown, plain text, or JSON. Copy and download are explicit user actions; FORGE never transmits a handoff automatically.

The canonical platform handoff is [`docs/FORGE_AI_USER_MANUAL.md`](docs/FORGE_AI_USER_MANUAL.md). It is available in the app through **Help & guidance** and **Give FORGE to My AI**.

## Information handling and reference-only knowledge

FORGE is designed for UNCLASSIFIED INFORMATION ONLY and is not a classification, declassification, sanitization, release, or security-review authority. Sensitive operational context should move through an authorized review and become an approved capability-level requirement before it is entered into FORGE.

Projects and artifacts carry a Documentation Availability status. A record may deliberately contain only metadata, an originator, and access instructions. This is valid institutional knowledge: users and receiving AIs must contact the originator or approved source and must not reconstruct intentionally absent procedures.

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

Tests cover both many-to-many relationships, the Lead Unit, tracking formats, persisted Problem/Project creation, conditional organic/vendor/TTP/training detail persistence, multi-Problem and multi-Unit links, exact ID/keyword search, solution-type/vendor filtering, deterministic duplicate detection, governed reference-only metadata, and portable handoff formats.

## Seed and persistence

The fictional seed contains 12 Problems, 20 Solution Efforts, 12 Units across 8 locations, 40 phases, 20 Lessons Learned, and 44 activities. `PRB-000001 — Short RF Range` has five deliberately different pathways: organic relay development, a commercial radio evaluation, a directional-antenna technique, an RF-planning training package, and an existing-radio configuration improvement.

Dashboard, search, comparison, Units, map markers, Related Work, Capability Graph, Executive/Technical/AI Handoff views, phases, lessons, repositories, activity, and help requests derive from SQLite. New Problems and conditional Solution Efforts persist through server routes and survive refresh/restart. Detail pages are addressable at `/problems/[id]`, `/projects/[id]`, and `/units/[id]`; project pages expose edit, phase, Lesson, and repository forms. `/guide` explains the operating model and provides the portable platform manual.

All records are fictional and non-sensitive.

## Remaining limitations

- Conditional create forms currently focus on the highest-value identifying and evaluation fields; the schema retains additional context fields for progressive UI expansion.
- Map geometry and graph layout are illustrative; their records and relationships are persisted.
- Authentication, permissions, file storage, synchronization, and external integrations are omitted.
- SQLite is local-only. PostgreSQL migration requires changing the datasource provider/URL, creating a new migration baseline, and strengthening counter allocation; the relational model and data services can remain.

## Recommended next pass

1. Run integration tests against an isolated temporary database.
2. Add review/approval history for curated executive and AI-context fields.
3. Add visibility-aware authorization boundaries before authentication.
4. Replace illustrative map/graph rendering only after relational workflows are complete.
