# FORGE — UAS Capability Portal

FORGE is a local relational prototype for discovering fictional UAS capability Problems, the Solution Efforts attempting to solve them, the Units doing the work, and the evidence and Lessons those efforts produce.

Project Operations Part 4 adds collaboration-oriented Help Requests with controlled categories, preserved resolution history, contact context, Activity/freshness, dashboard discovery, Executive support signals, and distinct AI Handoff semantics. Comparison is selected-Problem-specific, Related Work is current-Project-specific and explainable, direct artifact actions respect Documentation Availability, and **My Projects** provides a personal work surface without replacing the global portfolio.

Unit Administration Part 1 adds responsibility-aware personnel profiles, controlled primary/additional Unit membership, derived continuity warnings, System Administrator recovery for Units without an active administrator, and administrative Activity provenance. Account disablement preserves attribution and is allowed after a clear impact warning; it never silently rewrites Project ownership. Help Requests that follow the Project Lead move with a valid lead reassignment, while explicitly named alternate contacts remain unchanged.

Unit Administration Part 2 adds a scoped stewardship workspace that derives led and supported Project portfolios, factual attention needs, Problem coverage, Help Requests, Lessons, meaningful Unit Activity, maturity/outcome summaries, and responsibility visibility from existing records. Unit Administrators can switch among explicitly administered Units, filter the portfolio, maintain Unit POC information, and reach existing remediation workflows without recreating a parallel leadership report.

System Administration Part 2 adds governed canonical Unit and Problem registries. System Administrators can create and maintain immutable-ID Unit profiles, controlled Problem lifecycle/priority/category records, named Problem stewardship, supersession and lightweight relationships, and a reusable tag inventory. Submission approval as a new canonical Problem is atomic: FORGE reruns duplicate discovery, creates the Problem, links and retains the original submission, records the final review stage, and writes Activity provenance. Unit review remains distinct from final System governance.

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

`lib/auth/` is the future-authentication adapter and centralized authorization boundary. The local prototype resolves a development identity only when the switcher is enabled and `NODE_ENV` is not production. This is a role-testing aid, not login or authentication.

## Roles and account lifecycle

- **Contributor** reads permitted knowledge and submits potential Problems for review.
- **Project User** also creates Projects and edits Projects they created or are assigned to.
- **Unit Administrator** also manages users, submissions, and Project work only for explicitly administered Units.
- **System Administrator** has platform-wide administrative scope.

Accounts are Pending, Active, or Disabled. Unit membership, Unit-administrator scope, and Project membership are separate relational concepts. Disabled users retain attribution but cannot exercise permissions. Server mutations enforce permissions even when a UI control is hidden. Candidate Problem submissions remain separate from canonical Problem records until review.

System administration prevents supported role or status changes from leaving FORGE with zero active System Administrators and advises when only one remains. Maintain at least one active System Administrator and preferably two verified trusted administrators. A `UNIT_ADMIN` must retain an active administered-Unit scope; downgrades remove administrative scopes transactionally. Platform Integrity presents derived, automatically clearing responsibility checks without scoring Units, users, or Projects.

Unit deactivation preserves the Unit, tracking ID, Activity, and historical relationships. A Unit cannot be deactivated while it leads a Planning, Active, Paused, or Transitioning Project; transfer or close that responsibility first. The confirmation also reports supported active work, active primary users, Unit Administrators, and open Help Requests.

Every Project has exactly one current Project Lead and may have multiple Contributors. Creation records the creator as the initial Lead; later Lead changes preserve the creator and all historical authorship. Current Project Leads, the Lead Unit's administrators, and System Administrators may manage the team. Assigned active contributors may maintain Project content, while removing an assignment removes that edit scope. Disabled members remain visible as inactive historical participants until an authorized maintainer reassigns or removes them.

## Project lifecycle and institutional knowledge

Project status (Planning, Active, Paused, Transitioning, Completed, Cancelled, or Superseded), maturity (Concept, Prototype, Field Tested, or Validated), completion, current Phase, and outcome are intentionally separate. Phases are progressively editable. A Project Update can progress its associated Phase and serve as evidence for a Field Tested or Validated maturity change without duplicate entry. These maturity labels are FORGE knowledge-management indicators, not acquisition or doctrinal certification.

Closeout records a controlled outcome—Successful, Partially Successful, Unsuccessful, Inconclusive, Superseded, or Cancelled—plus final result, what worked, what did not, recommended next action, optional successor, and documentation availability. Closeout never closes a related Problem or removes team, Unit, Phase, Update, Lesson, or artifact history. Negative and inconclusive results remain searchable.

Lessons are typed as Confirmed Finding, Working Hypothesis, Failed Approach, Recommendation, or Unresolved Question. New Lessons retain author, date, Phase, Unit, and originating Update provenance where available. Problem pages reference Lessons Across Solution Efforts without duplicating records or implying automated consensus.

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
- `ProjectMembership`: explicit Project ↔ User assignment with exactly one current Project Lead maintained by application transactions.
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
pnpm db:seed:demo
pnpm dev
```

On macOS/Linux, use `cp .env.example .env`. Open `http://localhost:3000`.

For a new schema change:

```bash
pnpm db:migrate --name descriptive_change
```

Other useful commands are `pnpm db:generate`, `pnpm db:seed`, and `pnpm db:reset`. For an existing relational prototype database, `pnpm db:upgrade-solutions` applies the idempotent pathway demonstration data without resetting local records.

Use `pnpm db:seed:demo` for fictional review history. Use `pnpm db:seed:clean` only when intentionally resetting the current database to the approved sparse operational baseline described below. It creates no credentials or secrets. Set `FORGE_BOOTSTRAP_IDENTIFIER` before clean seeding and map or replace that identity during future authentication integration.

Both seed commands are destructive and operate against the currently configured `DATABASE_URL`. Verify that URL and the intended demo-versus-operational mode before running either command. The bootstrap administrator is an identity profile, not a credential. Do not retire it until production authentication is integrated, replacement administrator access is verified, and another active System Administrator exists. Recovery from an externally corrupted zero-admin database remains a deployment-owner emergency procedure; supported product mutations prevent that state.

## Quality checks

```bash
pnpm exec prisma validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Tests cover both many-to-many relationships, Lead Unit and Project Lead invariants, scoped team management, contributor edit access, Unit membership transfer, administrator-scope recovery, role/status validation, administrative provenance, Help contact continuity, phase progression, Update-driven Phase and maturity evidence, typed Lesson provenance, lifecycle status/outcome separation, closeout, failed-work preservation, tracking formats, persisted Problem/Project creation, editable multi-Problem and multi-Unit links, deterministic duplicate detection, governed reference-only metadata, and portable handoff formats.

## Seed and persistence

### Initial operational dataset

`pnpm db:seed:clean` is a destructive, deterministic reset to the controlled initial operational portfolio. It removes prior records, then creates exactly nine approved organizations, twelve stakeholder-supplied canonical capability Problems, zero Projects, six high-level category tags, and one generic bootstrap System Administrator profile. It creates no locations, Unit–Problem assignments, owners, inferred priorities, Project artifacts, or operational activity.

Detailed Problem statements intentionally remain **Pending Stakeholder Refinement**. These summaries are discovery aids, not final requirements. Participating Units are expected to associate existing work and create their own Solution Efforts after stakeholder refinement.

```bash
# Demo — fictional development/test data; never use for operational initialization
pnpm db:seed:demo

# Clean Operational — resets to 9 Units, 12 Problems, and 0 Projects
pnpm db:seed:clean
```

The clean operational initializer contains no fictional operational records. The demo initializer remains development-only. Both environments remain **UNCLASSIFIED INFORMATION ONLY**.

The fictional seed contains 12 Problems, 20 Solution Efforts, 12 Units across 8 locations, 40 phases, 20 Lessons Learned, and 44 activities. `PRB-000001 — Short RF Range` has five deliberately different pathways: organic relay development, a commercial radio evaluation, a directional-antenna technique, an RF-planning training package, and an existing-radio configuration improvement.

Dashboard, search, comparison, Units, map markers, Related Work, Capability Graph, Executive/Technical/AI Handoff views, phases, lessons, repositories, activity, and help requests derive from SQLite. New Problems and conditional Solution Efforts persist through server routes and survive refresh/restart. Detail pages are addressable at `/problems/[id]`, `/projects/[id]`, and `/units/[id]`; project pages expose edit, phase, Lesson, and repository forms. `/guide` explains the operating model and provides the portable platform manual.

Problem intake performs deterministic, server-backed canonicalization checks using the proposed title and description. It explains Possible Duplicate and Related Problem suggestions, preserves directional and aircraft-type distinctions, and lets Contributors either link an observation to an existing canonical Problem or deliberately continue into governed review. Solution Effort creation separately surfaces Projects already linked to selected Problems; parallel Projects remain permitted.

Routine maintenance uses first-class Project Updates. One concise entry records chronological progress, author and optional Phase, refreshes Latest Result and optional Project state, drives meaningful activity/freshness, and contributes automatically to Executive facts and portable AI Handoff history. Project pages also expose governed team and relationship management: searchable user, Problem, and Unit selection; explicit Lead/Contributor and Lead/Supporting/Testing roles; existing-work awareness; human-readable activity events; and consistent team context across Executive, Technical, and AI views.

Demo-seed records are fictional and non-sensitive. Clean-seed records are controlled stakeholder-supplied capability abstractions and approved organization names.

## Remaining limitations

- Conditional create forms currently focus on the highest-value identifying and evaluation fields; the schema retains additional context fields for progressive UI expansion.
- Map geometry and graph layout are illustrative; their records and relationships are persisted.
- Passwords, CAC/SSO/Entra/AD/LDAP/SAML/OIDC/MFA, production sessions, file storage, synchronization, and external integrations are intentionally omitted. Identity and authorization groundwork is implemented; production authentication must replace the development adapter without weakening server checks.
- SQLite is local-only. PostgreSQL migration requires changing the datasource provider/URL, creating a new migration baseline, and strengthening counter allocation; the relational model and data services can remain.

## Recommended next pass

1. Run integration tests against an isolated temporary database.
2. Add review/approval history for curated executive and AI-context fields.
3. Add visibility-aware authorization boundaries before authentication.
4. Replace illustrative map/graph rendering only after relational workflows are complete.
