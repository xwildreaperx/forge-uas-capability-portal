# FORGE UAS Capability Portal — Standalone AI Handoff

Document purpose: transfer sufficient product, architecture, governance, and development context to a capable AI system or coding agent that has no access to prior conversations.

Repository: `xwildreaperx/forge-uas-capability-portal`  
Branch inspected: `master`  
Current checkpoint at inspection: `eb89d97`  
Information boundary: fictional, non-sensitive prototype data; UNCLASSIFIED INFORMATION ONLY

## 1. Executive Summary

FORGE is a capability problem-solving and institutional-knowledge portal focused on unmanned aircraft system (UAS) work. It connects enduring capability Problems, the Projects or Solution Efforts attempting to address them, the organizations involved, development phases, evidence, lessons, outcomes, and references to existing knowledge.

FORGE exists because useful capability work is often decentralized and difficult to discover. Separate teams may investigate the same gap, repeat a vendor evaluation, rediscover a failed approach, or lose context when personnel and tools change. Leaders may see individual projects without seeing the underlying capability gap or the portfolio of alternative responses.

FORGE is therefore not merely a project tracker or document repository. Its intended value is unified visibility: what Problems exist, who is working on them, which approaches have been tried, what was learned, how mature each approach is, where authoritative knowledge resides, and what decision or collaboration is needed next. Over time, this should improve reuse, cross-unit collaboration, organizational memory, leadership understanding, and progression of promising local work toward broader adoption.

## 2. Core Product Philosophy

The following principles define the product:

- A **Problem** is a durable capability gap. It is not closed merely because one Project finishes.
- A **Project** is a broad Solution Effort: an attempt to solve, mitigate, investigate, or learn about one or more Problems.
- One Problem can have many Projects. Those Projects may compete, complement one another, or operate under different conditions.
- One Project can address many Problems.
- Failed, cancelled, superseded, incomplete, and alternative efforts remain useful institutional knowledge when their evidence and limitations are preserved.
- FORGE should make decentralized innovation visible; it does not require innovation itself to be centralized.
- A useful answer may be built, bought, integrated, configured, trained, procedural, policy-based, or hybrid. “Project” must not be interpreted as “software development project.”
- FORGE need not physically contain all underlying knowledge. Knowing that material exists, its availability status, its originator, and the approved path to obtain it can itself prevent duplication and restore continuity.
- The relational database is the source of truth. Browser state is for navigation and presentation, not durable records.

These principles are more stable than individual screen layouts or optional fields and should not be casually discarded.

## 3. Organizational Problem FORGE Addresses

The current problem state is fragmented visibility. Project knowledge may live in local drives, collaboration sites, repositories, email, presentations, individual memory, vendor correspondence, or controlled channels. Consequences include:

- duplicate development and experimentation;
- repeated commercial-product and vendor evaluations;
- lessons and negative results remaining local;
- failed approaches being repeated after personnel turnover;
- difficulty finding teams working on similar capability needs;
- poor leadership visibility into gaps, competing approaches, maturity, evidence, and resource needs;
- slow movement from local experimentation to broader evaluation or adoption;
- overemphasis on new technology when training, configuration, procedure, or policy may be the better response; and
- loss of continuity when people, AI tools, development environments, or repositories change.

The desired future state is a discoverable network of approved capability-level knowledge. A user should be able to find a Problem, see every linked Solution Effort, compare unlike pathways, identify participating Units, inspect results and lessons, find the authoritative source, and resume work without reconstructing history from scratch. Leaders should see what matters without having to interpret technical detail; practitioners should still have access to that detail; and an external AI should receive structured, reviewed context when a user deliberately exports it.

## 4. Core Information Model

The Prisma schema is relational and uses explicit records for important relationships.

- **Problem**: durable capability gap with public tracking ID, descriptions, problem statement, category, priority, status, owner, visibility, dates, tags, locations, Units, Projects, and activity.
- **Project / Solution Effort**: name, summaries, approach, Solution Type, documentation status, executive fields, AI context, scope and architecture fields, status, maturity, completion, outcome, dates, Lead Unit, linked Problems and Units, phases, lessons, repositories, activities, help requests, and conditional pathway detail.
- **Unit / Organization**: public tracking ID, name, abbreviation, type, parent organization, location, capabilities, reported/affected Problems, Project participation, lead Projects, lessons, and activity.
- **Location**: name, region, latitude, and longitude; linked to Units and through junctions to Problems and Projects.
- **Tag / Capability**: reusable controlled labels connected through separate junctions to Problems, Projects, Units, and Lessons.
- **ProjectPhase**: ordered development stage with objective, status, completion, executive and technical summaries, result, accomplishment, blocker, risk, action, and dates.
- **LessonLearned**: stable public ID, finding, recommendation, date, Project, and optional phase, Unit, and tags.
- **RepositoryLink**: reference metadata rather than stored file content: name, URL, description, artifact type, Documentation Availability, and whether metadata should appear in AI Handoff.
- **ActivityEvent**: timestamped event with description, type, actor, and optional Problem, Project, or Unit relationships.
- **HelpRequest**: a Project-linked request with description, status, and creation date.
- **VendorDetail**: one-to-one conditional Project record for vendor/product identity, availability, cost, procurement and evaluation status, integration, sustainment, result, and recommendation.
- **TacticDetail**: one-to-one conditional record for a tactic or technique, conditions, prerequisites, equipment, training, effect, limitations, validation, environment, and recommendation.
- **TrainingDetail**: one-to-one conditional record for objective, audience, prerequisites, method, materials, validation, observed effect, and recurrence.
- **DocumentationAvailability**: an enum on Projects and Repository Links describing where authoritative information is available.

True many-to-many relationships are explicit. `ProblemProject` links Problems and Projects and records whether a Problem is primary for that Project. `ProjectUnit` links Projects and Units with roles such as Lead, Supporting, and Testing. `ProblemUnit` records relationships such as Reporter or Affected. Separate junctions handle tags and locations.

For example, `PRB-000001 — Short RF Range` is linked to several efforts of different Solution Types. `PRJ-000001 — Airborne Communications Relay` links to more than one Problem and more than one Unit, while also having a distinct required Lead Unit.

## 5. Solution Pathways

The implemented `SolutionType` enum supports seven pathways:

1. **Organic Development** (`ORGANIC_DEVELOPMENT`): build or adapt a solution internally.
2. **Vendor Solution** (`VENDOR_SOLUTION`): evaluate a commercial product and preserve vendor, cost, procurement, integration, sustainment, result, and recommendation context.
3. **Tactic / Technique** (`TACTIC_TECHNIQUE`): change how existing capability is employed; authoritative procedural detail may remain with an originator.
4. **Training** (`TRAINING`): improve capability through instruction, practice, qualification, or recurring reinforcement.
5. **Integration / Configuration** (`INTEGRATION_CONFIGURATION`): combine or configure existing systems differently.
6. **Process / Policy** (`PROCESS_POLICY`): change governance, coordination, standards, or process.
7. **Hybrid** (`HYBRID`): combine pathways; the current schema permits associated vendor, tactic, and training detail for hybrid work.

Solution Type describes the nature of an approach. It is deliberately separate from Project status, maturity, completion, and outcome. A vendor evaluation can be only a Concept or can be Validated; a training package can be Planning or Transitioning; an organic Project can be complete but unsuccessful. These dimensions must not be collapsed.

Multiple pathways may address the same Problem. They may compete for adoption, apply in different environments, or work together—for example, a commercial radio, a configuration change, an antenna-employment technique, and operator training may all reduce the effects of one communications gap.

## 6. Problem Lifecycle

Problems persist independently of Projects. In the current seed and UI, implemented Problem statuses are **Open** and **Monitoring**. Priority is separate and seeded as High, Medium, or Low. The schema stores status as a string rather than a database enum, so future lifecycle expansion is possible but should be deliberate and validated consistently.

A Problem can exist before a Solution Effort, remain active while several efforts run, and remain open after one or more efforts complete. The current implementation does not automatically change Problem status when Project status, maturity, or completion changes. This is intentional: an effort may only mitigate part of the gap, work under limited conditions, or produce a negative result.

## 7. Project Lifecycle, Status, Maturity, and Outcome

The create/edit UI currently offers these Project values:

- **Status**: Planning, Active, Transitioning.
- **Maturity**: Concept, Prototype, Field Tested, Validated.
- **Completion**: integer percentage from 0 through 100.
- **Outcome**: free-text persisted field, projected independently from the other dimensions.

Status is workflow state. Maturity is strength or development level of the approach. Completion is progress against the current effort plan. Outcome describes what happened or what evidence is available. None can safely substitute for another. In particular, 100 percent completion does not mean validation or success, and “Validated” does not automatically mean enterprise adoption.

Project phases currently use string statuses seeded as Complete or In Progress, while newly added phases begin as Planned. Outcome vocabulary is not an enum; seed examples use phrases such as “Evaluation ongoing,” “Promising field result,” and “Validated result available.”

## 8. Executive Experience

The Executive Splash Page is for senior leaders, resource decision-makers, program managers, and nontechnical stakeholders. Its explicit goal is to let someone unfamiliar with drones understand an effort in approximately one minute.

The page uses curated plain-language fields rather than exposing the detailed description as the primary narrative. It presents:

- a one-sentence executive summary and why the effort matters;
- status, maturity, completion, current phase, and last update;
- the Problem in plain language and linked Problem IDs;
- what the team is doing and the Solution Type;
- the latest demonstrated result and up to three lessons;
- the key risk or limitation, with uncertainty retained;
- the next meaningful step;
- the leadership action requested, including an explicit “no action required” state;
- ownership, Lead Unit, Documentation Availability, and access instructions; and
- related-work navigation.

For reference-only records, the Executive view shows a Contact Originator action that copies the originator and access instructions. This view is intentionally nontechnical. Future changes should improve decision clarity without turning it into a compressed Technical View.

## 9. Technical Experience

Technical View is separate because practitioners need context that would burden or confuse a one-minute leadership brief. It presents detailed solution information, linked Problems and Units, tags, locations, development phases, test/result context, lessons and recommendations, repository/artifact metadata, and conditional pathway details.

Vendor efforts expose product identity, costs, procurement and evaluation status, integration requirements, sustainment notes, evaluation results, and recommendation. Tactic/technique efforts expose conditions, prerequisites, equipment, training, demonstrated effect, limitations, validation event, applicable environments, and recommendation. Training efforts expose audience, prerequisites, method, materials, validation, effect, and recurrence.

Technical and edit areas carry UNCLASSIFIED-only and information-handling warnings. Repository support is currently metadata/reference storage; there is no real file upload or object storage.

## 10. AI Project Handoff

Each Project has an **AI Handoff** experience intended to rapidly restore approved Project context in another capable AI system. The user selects the AI view and explicitly copies or downloads one of three formats:

- Markdown (`.md`);
- plain text (`.txt`); or
- formatted JSON (`.json`).

The generated package includes identity, Project and Problem relationships, participating Units and roles, Solution Type, status, maturity, completion, documentation status, scope and exclusions, intended users, success criteria, constraints, assumptions, pathway-specific overview, architecture/configuration, methodology and decisions, phases, lessons, included artifact metadata, outcome, latest result, risk, open issues, next steps, leadership action, and user-entered AI Context Notes.

Each package records generation time, Project last-updated time, handoff version 1.0, and a Basic/Partial/Comprehensive completeness indicator based on context presence. Completeness is explicitly not a correctness score. Reference-only handoffs add the originator, access path, and an instruction not to reconstruct or invent missing material.

The browser creates a new generation timestamp when the Project’s `updatedAt` changes. Project detail routes key the portal instance by `updatedAt`, so a successful edit and router refresh regenerate the view with current persisted data. Automated and manual acceptance checks cover this behavior.

The handoff does not transmit automatically. It is a context-transfer mechanism, not an authority on accuracy, classification, sanitization, release, or releasability. The user must review it before sharing; aggregation itself may alter sensitivity.

## 11. FORGE Platform AI Handoff

The platform-level handoff is the canonical manual at `docs/FORGE_AI_USER_MANUAL.md`. It explains the product model, pathways, knowledge experiences, information-handling boundary, reference-only semantics, operating workflow, and current prototype status.

The UI entry point is **Help & guidance**, which opens `/guide`. The guide’s **Give FORGE to My AI** button fetches `/api/platform-handoff` and copies the canonical Markdown manual to the clipboard. **Download manual** retrieves the same file as an attachment. A stakeholder can give this text to another AI and ask it to explain FORGE, teach a workflow, or compare the product model to the stakeholder’s current process.

This standalone handoff is more implementation-complete than the shorter platform user manual; the manual remains the user-facing platform orientation.

## 12. Reference-Only / Metadata-Only Knowledge

`DocumentationAvailability` has six implemented values:

- **Available in FORGE** (`AVAILABLE_IN_FORGE`): approved documentation is represented within the FORGE environment.
- **External Reference** (`EXTERNAL_REFERENCE`): FORGE points to an external authoritative source.
- **Available From Originator** (`AVAILABLE_FROM_ORIGINATOR`): contact the originating Unit or office.
- **Controlled Access** (`CONTROLLED_ACCESS`): an approved access process applies outside the open record.
- **Metadata Only** (`METADATA_ONLY`): the record deliberately contains discovery metadata rather than the underlying content.
- **Not Yet Documented** (`NOT_YET_DOCUMENTED`): authoritative documentation has not yet been produced.

The first four nonlocal/controlled states except Not Yet Documented are treated as reference-only by the handoff generator. A Project remains valid when FORGE does not contain the authoritative technical document. The record can still prevent duplicate work by describing the capability effect, owner, availability, and access path.

The Executive view displays availability and instructions and offers **Contact Originator · Copy Instructions** when the Project is not Available in FORGE. Repository links also carry Documentation Availability and an opt-in/opt-out flag for inclusion of their metadata in AI Handoff.

Receiving AIs must not infer, reconstruct, or invent intentionally absent details. “Not stored here” is a governance fact, not an invitation to fill a gap.

## 13. Information Security and Capability Abstraction

The current prototype is intended for **UNCLASSIFIED INFORMATION ONLY**. Its operating principle is:

> Sensitive Context → Authorized Review / Abstraction → Approved Capability Requirement → FORGE

Sensitive operational context should not be entered merely to explain why a capability is needed. An authorized process should abstract it to an approved capability-level statement before entry.

- FORGE is not a classification, declassification, sanitization, authorization, or security-review authority.
- An AI system is not such an authority either.
- AI Handoffs require user review before sharing.
- Aggregating individually acceptable facts may change sensitivity or releasability.
- Controlled or intentionally missing information must not be inferred or reconstructed.
- References or future file uploads must be appropriate for the deployed environment and approved information-handling policy.
- The current prototype does not inspect content, enforce classification, or implement production authorization boundaries.

Warnings appear near Problem/Project creation, editing, lessons, technical content, repository metadata, platform guidance, and AI Handoff. They are guardrails, not controls sufficient for production accreditation.

## 14. Search and Discovery

Discovery is the central value proposition: users should find existing effort before creating duplicate effort.

The UI supports global navigation and search across record IDs and visible Project/Problem/Unit terms. Project filtering in `lib/domain/search.ts` supports:

- exact or partial Project ID and keyword query;
- maturity;
- capability/tag;
- location;
- status;
- Solution Type;
- vendor;
- procurement status; and
- vendor or tactic recommendation.

Project keyword search currently indexes Project ID, name, Lead Unit, Solution Type label, vendor/product, tactic title, training objective, and tags. Tests verify ID, keyword, maturity, capability, location, Solution Type, and vendor filtering.

Problem search/creation uses deterministic related-work matching over title/category/tags, and the Problem detail page exposes linked efforts. **Related Work**, Unit views, Map, Capability Graph, and Project comparison provide alternate discovery paths.

Comparison is currently centered on `PRB-000001`. Its table compares unlike pathways by Solution Type, Lead Unit, vendor/product, cost/procurement, contextual approach, maturity, completion, advantages, limitations, outcome/result, and update date. It deliberately avoids forcing vendor, training, tactic, and organic work into identical detail fields.

## 15. Capability Graph and Map

The Map communicates geographic distribution using persisted Unit location coordinates and Project/Problem associations. The Capability Graph communicates relationships among capability Problems, Projects, and organizations. They support orientation and discovery rather than rigorous geospatial or network analysis.

Current layouts and geometry are illustrative. The records and many relationships are real database projections, but visual placement, interaction depth, filtering, and analysis are prototype-level. Future possibilities include richer spatial filtering, clustering, dependency analysis, and portfolio relationships; none is a committed requirement.

## 16. User Workflows

### Problem discovery workflow

Dashboard → global search or Problems → Problem Detail → review all linked Solution Efforts → Compare Solution Efforts → open a Project → inspect its Unit or Related Work.

### Project creation workflow

Create → Solution effort → choose one or more Problems → select a required Lead Unit → select supporting Units → select Solution Type → enter common and pathway-specific details → save → add phases, Lessons Learned, and repository/artifact references.

The Lead Unit is automatically included among participating Units if it was not separately checked. Conditional vendor, tactic, and training records are created transactionally with the Project.

### Executive workflow

Project → Executive → understand the capability Problem, impact, approach, state, evidence, risk, next step, and leadership decision/action.

### AI continuity workflow

Project → AI Handoff → choose Markdown/plain text/JSON → review → copy or download → provide deliberately to an approved external AI → restore context.

### Reference-only workflow

Discover a tactic, technique, or other knowledge record → inspect Documentation Availability and capability-level metadata → use Contact Originator/access instructions → obtain authoritative information through the approved channel. Do not reconstruct it from the metadata.

## 17. Current Technical Architecture

The current application is TypeScript with React 19.2.6 and Next.js 16.1.0 App Router behavior. The UI uses custom CSS plus Lucide React 1.31.0; Tailwind CSS 4.2.1, shadcn-related packages, Base UI, and other UI dependencies are installed, but the primary portal component is custom JSX/CSS. Prisma and `@prisma/client` are 6.16.3. The local database is SQLite.

Important boundaries:

- App route files are server components by default and load projections with `getPortalData()`.
- `components/portal.tsx`, forms, AI export controls, and the platform guide are client components.
- `lib/db.ts` owns a development-safe Prisma singleton.
- `lib/data/portal.ts` performs server-side relational queries and maps them into explicit UI projection types.
- `lib/data/mutations.ts` validates and persists transactional changes.
- `lib/domain/` contains pure tracking, matching, filtering, Solution Type, documentation, and handoff logic.
- API route handlers expose Problem/Project creation and Project edit/phase/lesson/repository mutations.

The original `7c4d5c6` checkpoint used `vinext dev`, `vinext build`, Wrangler, Cloudflare/Vite tooling, and `.openai/hosting.json`. The relational migration changed active scripts to `next dev --webpack`, `next build --webpack`, and `next start`; `next.config.ts` uses `.next-local`. This Node runtime was needed for Prisma’s native SQLite client, which is not suitable for the original Edge-oriented execution approach. Vinext and Cloudflare-related dependencies remain installed, but they are not the current run path.

Persistence is server-side SQLite, not localStorage. Testing uses Node’s built-in test runner with TypeScript type stripping. TypeScript uses `tsc --noEmit`, lint uses Oxlint, and formatting uses Oxfmt.

## 18. Database Architecture

The Prisma schema uses normalized core records, one-to-many child records, one-to-one pathway details, and explicit many-to-many junctions. Important junctions are `ProblemProject`, `ProjectUnit`, `ProblemUnit`, `ProblemTag`, `ProjectTag`, `UnitTag`, `LessonTag`, `ProblemLocation`, and `ProjectLocation`. Cascade behavior removes dependent link/detail records when their owning Project or linked record is deleted; Lead Unit is a distinct required foreign key.

Internal database IDs are integers. Stable human-facing IDs are separate strings:

- `PRB-000001` for Problems;
- `PRJ-000001` for Projects;
- `UNIT-000001` for Units; and
- `LES-000001` for Lessons.

`TrackingCounter` allocates the next value inside a Prisma transaction using upsert and increment, and `formatTrackingId` pads to six digits. SQLite serializes the current local workflow. A concurrent PostgreSQL deployment should use row locking or a database sequence while preserving public-ID semantics.

Three migrations exist: the initial relational schema, Solution Pathways/detail tables, and AI handoff/governance fields plus repository metadata.

## 19. Current Routes

URL-addressable application routes are:

- `/` — force-dynamic dashboard and in-app views for Explore, Problems, Projects, Units, Map, Capability Graph, Activity, comparison, and related work;
- `/problems/[id]` — server-validated Problem detail;
- `/projects/[id]` — server-validated Project detail with Executive, Technical, AI Handoff, and edit/add actions;
- `/units/[id]` — server-validated Unit detail; and
- `/guide` — platform guidance and platform AI handoff controls.

There are no dedicated `/explore`, `/map`, `/compare`, or graph URLs; those are client-side views within the portal shell.

API routes are:

- `GET/POST /api/problems` for related-work lookup and Problem creation;
- `POST /api/projects` for Project creation;
- `PATCH /api/projects/[id]` for Project edits;
- `POST /api/projects/[id]/phases`;
- `POST /api/projects/[id]/lessons`;
- `POST /api/projects/[id]/repositories`; and
- `GET /api/platform-handoff` for the canonical platform manual.

## 20. Current Seed Data

All seed data is explicitly fictional and non-sensitive. The README describes 12 Problems, 20 Solution Efforts, 12 Units across 8 locations, 40 phases, 20 Lessons Learned, and 44 activity records. Local databases may also contain manually created acceptance-test records because the prototype preserves data across restarts; a clean seed reset returns the canonical scenario.

The primary demonstration is `PRB-000001 — Short RF Range`, which has multiple pathways: an organic airborne relay, a commercial radio evaluation, a directional-antenna employment technique, an RF-planning training package, and an existing-radio configuration improvement. This demonstrates why Problem and Project are not synonymous.

`PRJ-000001 — Airborne Communications Relay` has strong executive, technical, relational, and AI-handoff context. The commercial pathway uses fictional vendor **Aegis Wave Systems** and product **RavenLink NR-4**. `PRJ-000008 — Directional Antenna Employment Technique` demonstrates Available From Originator/reference-only behavior; FORGE preserves approved capability-level metadata and does not claim to contain the authoritative procedure.

No seed record should be interpreted as real operational activity, evaluation, organization, location, cost, or recommendation.

## 21. Current Git Checkpoints

The inspected Git history contains these stable milestones:

- `7c4d5c6` — **Build initial FORGE UAS capability portal prototype**. Established the first functional, primarily visual portal and Edge/Vinext-oriented project structure.
- `b316404` — **Add relational Prisma persistence and server-side data layer**. Introduced SQLite, Prisma schema/migration/seed, server projections and mutations, tracking IDs, search/matching domain logic, and tests; active execution moved to Node/Next.
- `0a41ece` — **Expand projects into broad solution efforts**. Added seven Solution Types, pathway-specific detail tables, richer routes/forms, comparison, related work, and expanded fictional scenarios.
- `6494cb4` — **Add executive and portable AI knowledge experiences**. Added curated Executive pages, Project AI Handoff, platform manual/guide, Documentation Availability, reference-only governance, security guidance, migration, seed enrichment, and tests.
- `eb89d97` — **Add stakeholder prototype review guide**. Added the structured prototype review package.

`eb89d97` is current `HEAD` and matches `origin/master` at the time of inspection. This document is intentionally uncommitted by request.

## 22. Development History

The prototype evolved in layers rather than through a clean-room redesign:

1. The initial pass established the visual product concept: dashboard, discovery surfaces, Problems, Projects, Units, activity, map, graph, and sample navigation.
2. The relational migration replaced presentation-only data with Prisma/SQLite persistence, explicit relationships, stable tracking IDs, server data access, mutations, and automated checks. The execution path moved away from Edge-oriented Vinext scripts to Node/Next for native Prisma support.
3. The Solution Effort pass corrected the meaning of Project. Projects became broad attempts across build, buy, tactic, training, integration, policy, and hybrid pathways. Conditional tables avoided forcing unlike approaches into one field set.
4. Addressable detail routes and create/edit/add forms made the relational model operational. Comparison and related-work discovery reinforced the many-efforts-per-Problem model.
5. The knowledge-experience pass separated Executive, Technical, and AI audiences; introduced portable handoff generation and a platform manual; added curated communication fields; and added reference-only semantics and information-security guidance.
6. A stakeholder review guide was added to support product validation before further implementation.

This history explains why the portal shell remains a large client component while persistence and domain logic are already separated. Future refactoring may improve component boundaries, but it must preserve the relational and product semantics.

## 23. How to Run FORGE

Prerequisites from `package.json`: Node.js 22.13.0 or newer and pnpm.

```powershell
git clone https://github.com/xwildreaperx/forge-uas-capability-portal.git
cd forge-uas-capability-portal
pnpm install
Copy-Item .env.example .env
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

`.env.example` contains `DATABASE_URL="file:./dev.db"`. Open `http://localhost:3000` after the server starts. On macOS/Linux, use `cp .env.example .env`.

Quality and build commands verified from `package.json` and README:

```powershell
pnpm exec prisma validate
pnpm exec prisma migrate status
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Other scripts:

- `pnpm db:migrate --name descriptive_change` for a development migration;
- `pnpm db:upgrade-solutions` to enrich an existing relational database without resetting it; and
- `pnpm db:reset` for a destructive local migration reset and reseed.

The private GitHub repository requires collaborator access before cloning.

## 24. How Another AI Should Approach This Repository

Before modifying FORGE:

1. Read this handoff.
2. Read repository-root `AGENTS.md` if one exists. None existed at the inspected checkpoint; also check parent/workspace instructions supplied by the execution environment.
3. Read `README.md` and treat implementation as authoritative where it differs.
4. Inspect `prisma/schema.prisma` and all relevant migrations.
5. Inspect the relevant current route, UI component, projection, mutation, domain helper, and test before editing.
6. Preserve correct many-to-many relationships and the distinct Lead Unit.
7. Preserve the Executive / Technical / AI separation.
8. Preserve reference-only and metadata-only knowledge semantics.
9. Preserve information-security and capability-abstraction guidance.
10. Run Prisma validation/migration status, typecheck, lint, tests, and production build after meaningful changes.
11. Commit stable, tested milestones so prior benchmarks remain recoverable.

Minor implementation details, layout, and optional fields can evolve. Core product philosophy and governance should not be casually discarded. Do not assume that a conventional software-project model, document-management model, or single-solution workflow is an adequate replacement.

## 25. Design Decisions That Must Be Preserved

- Problem ↔ Project is true many-to-many through `ProblemProject`.
- Project ↔ Unit is true many-to-many through `ProjectUnit`.
- Lead Unit is a distinct required Project relationship, not merely inferred from a participant list.
- Stable human-readable tracking IDs remain separate from internal integer primary keys.
- Projects represent broad Solution Efforts, not only software or hardware builds.
- Failed, incomplete, superseded, and alternative work remains discoverable institutional knowledge.
- Metadata-only and reference-only records are valid.
- The relational database is the durable source of truth.
- Executive View is intentionally plain-language and nontechnical.
- Technical View intentionally retains detailed evidence and pathway context.
- AI Handoff is intentionally comprehensive, explicit, reviewed, and portable.
- Handoffs are not transmitted automatically.
- Intentionally withheld or controlled material must not be inferred or reconstructed.
- Documentation Availability applies independently of Project validity.
- Project status, maturity, completion, and outcome remain separate concepts.
- Completing a Project does not automatically close its Problems.
- The current prototype is for UNCLASSIFIED information only.

## 26. Current Known Limitations

- No authentication, role-based authorization, or visibility enforcement.
- No production classification, release, sanitization, or security-control implementation; warnings are advisory.
- SQLite is local-only and counter allocation is not designed for high-concurrency multi-user deployment.
- No PostgreSQL deployment or production migration baseline.
- No real file/object storage; repository/artifact support stores metadata and URLs only.
- No external repository synchronization, vendor-system integration, or general public API.
- Optional schema fields are richer than some create/edit forms; editing is not yet granular or complete for every field and pathway.
- No approval/version history for curated executive fields or AI Context Notes.
- No production audit trail for every mutation, permission decision, or export.
- No notifications or subscription workflow beyond displayed Activity and Help Requests.
- Related-work matching is deterministic keyword/tag logic, not semantic search.
- Project comparison is hard-coded around the primary demo Problem rather than a generalized selectable comparison workflow.
- Map and Capability Graph layouts are illustrative and not production geospatial/network analysis.
- The portal UI is concentrated in a large `components/portal.tsx`, which increases maintenance cost.
- Automated tests cover domain/persistence behavior against the local database but not a fully isolated integration database, browser end-to-end suite, accessibility audit, or multi-user concurrency.
- Deployment, backup, recovery, observability, secrets handling, and operational support are not production-ready.

## 27. Recommended Next Steps

These are recommendations, not committed requirements.

### Product validation

- Conduct the structured stakeholder review in `docs/STAKEHOLDER_REVIEW_GUIDE.md`.
- Run a limited pilot with representative leaders, practitioners, and knowledge managers using approved fictional or sanitized data.
- Test whether users find related work before creating new work.
- Refine executive language, Documentation Availability vocabulary, Project lifecycle, comparison, and originator workflows from observed use.
- Define measurable pilot outcomes for discovery time, duplicate-effort avoidance, cross-unit contact, knowledge continuity, and decision clarity.

### Technical hardening

- Design authentication and role-/attribute-based authorization around visibility and documentation semantics.
- Obtain an information-security and deployment architecture review.
- Move to PostgreSQL with safe concurrent tracking-ID allocation.
- Add approved object storage and malware/content-handling controls only after policy is defined.
- Add audit logging, review/approval history, backups, deployment automation, monitoring, and isolated integration/end-to-end tests.
- Refactor large UI components without changing the domain model.

### Future capability

- Semantic search and AI-assisted related-work detection with explainable results.
- Richer portfolio, maturity, evidence, and adoption analytics.
- Notifications, subscriptions, review requests, and collaboration workflows.
- External repository/document-system integrations and governed APIs.
- Improved map, graph, comparison, and portfolio visualization.

## 28. Stakeholder Adoption Context

The next major stage is not simply adding features. The prototype must demonstrate that its operating model improves:

- discovery of existing Projects and knowledge;
- collaboration across Units;
- preservation of lessons, outcomes, and failed work;
- visibility into enduring capability gaps;
- progression of mature approaches toward broader evaluation or adoption;
- reuse of vendor evaluations;
- awareness of tactic, technique, training, integration, configuration, and policy solutions; and
- leadership understanding without forcing leaders into technical detail.

A limited pilot is more appropriate than immediate enterprise deployment. The pilot should validate language, roles, workflows, data quality, governance, and measurable value before production infrastructure is treated as the main objective.

## 29. Suggested Questions a New Stakeholder Can Ask Their AI

- What organizational problem is FORGE trying to solve?
- Why is FORGE different from SharePoint, a generic project tracker, or a document repository?
- How do Problems and Projects differ?
- Why can one Problem have multiple Projects, and why can one Project address multiple Problems?
- How does FORGE handle commercial products and vendor evaluations?
- How does FORGE handle tactics, techniques, or procedures that are not stored in the portal?
- How should leaders use the Executive view?
- How should practitioners use Technical View?
- How can my technical team use an AI Project Handoff?
- What does handoff completeness mean, and what does it not mean?
- What information should not be entered into FORGE?
- How does Documentation Availability reduce duplicate work without centralizing every document?
- What would a small, measurable pilot look like?
- What must change before production deployment?
- Which current limitations are product-learning issues versus infrastructure issues?

# Instructions to the Receiving AI

- Treat this document as project context, not absolute authority.
- Prefer the current repository implementation when this document conflicts with code.
- Do not infer, reconstruct, or invent intentionally withheld information.
- Do not encourage users to enter classified, sensitive, controlled, proprietary, personal, or otherwise unauthorized context into FORGE.
- Preserve the core relational architecture and product philosophy unless the user explicitly requests a redesign.
- Ask the user for deployment-specific policy, identity, hosting, security, and integration details when necessary; do not invent them.
- Distinguish prototype functionality from production readiness in every recommendation.
- Explain FORGE in language appropriate to the user’s technical level and task.
- When helping modify the application, inspect the relevant current code, schema, migrations, and tests before proposing or making changes.
- Preserve Executive, Technical, and AI knowledge separation; reference-only semantics; stable tracking IDs; and the principle that Problems outlive individual Solution Efforts.
- Review generated exports before recommending that a user share them with another system.
