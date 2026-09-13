# FORGE AI User Manual

Canonical pre-pilot handoff · Repository checkpoint `19cdc5ba7651aaa4614ddd5fd7423aed9d8668e1`

This document gives a capable AI or technical stakeholder enough context to understand and safely continue the FORGE UAS Capability Portal without prior conversation history. Current code, Prisma schema, migrations, tests, `AGENTS.md`, and Git state remain authoritative if they differ from this manual.

## 1. FORGE purpose

FORGE is a relational capability problem-solving and institutional-knowledge portal. It addresses fragmented capability-development knowledge, limited Project sharing, duplicated effort, disconnected Unit development, lost Lessons, poor capability-gap visibility, and knowledge loss during personnel turnover.

- **Problems organize enduring capability gaps.**
- **Projects organize Solution Efforts attempting to address them.**
- Multiple Projects may address the same Problem, including parallel Unit efforts.
- Successful, partially successful, unsuccessful, inconclusive, cancelled, and superseded work can all produce valuable knowledge.
- Teams capture work once; FORGE reuses it for discovery, leadership, Unit stewardship, Activity, historical continuity, and AI handoff.

FORGE is not a performance-ranking system, certification authority, or security-review process.

## 2. Core terminology

**Problem:** A governed enduring capability gap with a durable `PRB-` ID. It is not a Unit failure or proposed solution.

**Project / Solution Effort:** A bounded attempt to address one or more Problems. **A FORGE Project is the record for a Solution Effort.** “Solution Effort” describes the capability-development work; “Project” identifies its record, ID, team, Updates, and responsibility.

**Unit:** A governed participating organization with a durable `UNIT-` ID. **Lead Unit** is the Project's organizational owner and must be a participating Unit.

**Project Lead:** The one current person responsible for maintaining a Project. The creator becomes initial Lead. Lead Unit and Project Lead are independent.

**Contributor:** A user who discovers knowledge and submits potential Problems; also a Project-team assignment. **Project User** can create Projects and edit within assigned/created scope.

**Unit Administrator:** Administers explicitly scoped Units, ordinary memberships, continuity, and scoped operations. **System Administrator:** Globally governs canonical data, elevated roles, integrity, and recovery.

**Project Update:** Preferred chronological routine-maintenance record. **Phase:** A portion of Project work with its own objective and state.

**Maturity:** Development/demonstration level. **Completion:** Planned-work percentage. **Status:** Entity-specific lifecycle state. **Outcome / disposition:** Final Project result, separate from status.

**Lesson:** Attributable reusable knowledge with explicit truth semantics and a `LES-` ID. **Help Request:** Discoverable Project-linked assistance signal, not messaging or ticketing.

**Problem Steward:** Named canonical steward; stewardship does not grant authority. **Submission:** Potential Problem undergoing governed review with a `SUB-` ID.

**Documentation Availability:** Where authoritative knowledge exists and whether direct access is appropriate. **Activity:** Attributable event provenance. **Last Meaningful Activity:** Derived Project freshness from substantive operations.

## 3. Information-handling boundary

**UNCLASSIFIED INFORMATION ONLY.** FORGE is not a classification, declassification, sanitization, release, or security-review authority.

Record approved capability abstractions, not classified/controlled operational scenarios, sources, tactics, credentials, secrets, or unnecessary identifying detail:

`Sensitive context → authorized review and abstraction → approved capability requirement → FORGE`

Documentation Availability values are Available in FORGE, External Reference, Available From Originator, Controlled Access, Metadata Only, and Not Yet Documented. External, originator-held, controlled, and metadata-only records remain valid knowledge. The UI exposes direct links only when permitted; otherwise it retains originator/access instructions. Humans and AIs must not reconstruct intentionally absent content. Review AI Handoffs and operational exports before sharing.

## 4. Role model

The principle is **Discover broadly. Administer narrowly.** Active users broadly read; server mutations require permission and scope.

### Contributor

Discovers Problems, Projects, Units, linked Lessons and Help Requests; searches before reporting; submits governed potential Problems and reviews matches. Cannot administer or maintain Projects without added authority.

### Project User / Project Lead

Has Contributor capabilities, creates Projects, and edits created/assigned Projects. Maintains Updates, Phases, Lessons, artifacts, Help Requests, relationships, and closeout. Current Leads manage Project teams.

### Unit Administrator

Has Project User capabilities and administers only explicitly scoped Units. Manages ordinary memberships, Unit POC, continuity, Unit-originated review, and recovery for Unit-led Projects. Cannot grant administrator authority or materially govern canonical Problems.

### System Administrator

Has global recovery/governance scope. Manages roles/scopes, canonical Units/Problems, Problem conversion and consolidation, Tags, Locations, corrections, integrity, and metadata export. The role does not grant access to controlled external documents.

Authentication is deployment-specific and not production-implemented. Authorization is server-side. **The development user switcher is not authentication** and is forced off in production.

## 5. Problem lifecycle

1. Search the canonical portfolio.
2. Submission runs deterministic normalized matching and distinguishes possible duplicates from related Problems with reasons.
3. Select an existing Problem or deliberately continue when distinct.
4. The `SUB-` record retains submitter, Unit, description, relationship, and history.
5. Unit Admin adds Unit context without global authority.
6. System Admin reruns matching and links, rejects, or approves.
7. New canonical approval atomically allocates `PRB-`, creates/links records, updates submission, and records Activity.
8. Refine title, descriptions, statement, impact, category, priority, status, steward, Tags, Units, Locations, and relationships.
9. `RELATED_TO` and `VARIANT_OF` express related-but-distinct families.
10. Consolidation preserves the old PRB as Superseded, transfers/deduplicates relationships, points to the replacement, prevents cycles, and records provenance.

Project lifecycle is independent. Project closeout never automatically closes a Problem.

## 6. Project / Solution Effort lifecycle

An authorized user selects one or more Problems and creates a Project. Existing linked efforts are shown for awareness, but parallel work remains allowed. The Project receives a durable `PRJ-` ID; its creator becomes initial Lead. It retains one Lead Unit, participating Units, exactly one Lead, optional Contributors, at least one Problem, and one primary Problem.

Teams progressively add Updates, Phases, evidence, Lessons, artifacts, Help Requests, Executive narrative, technical context, and AI context. Lead Unit transfer creates receiving-Unit review and does not silently change Lead. Closeout preserves terminal status, compatible outcome, final result, positive/negative knowledge, recommendation, documentation, actor/date, completion, and optional successor. Historical work remains discoverable everywhere relationally relevant.

Project statuses are Planning, Active, Paused, Transitioning, Completed, Cancelled, and Superseded. Closeout rules are:

- Completed → Successful, Partially Successful, Unsuccessful, or Inconclusive
- Cancelled → Cancelled or Inconclusive
- Superseded → Superseded or Partially Successful

## 7. Solution Types

| Persisted value | User-facing label | Specific context |
|---|---|---|
| `ORGANIC_DEVELOPMENT` | Organic Development | General Project technical/evidence fields |
| `VENDOR_SOLUTION` | Vendor Solution | Vendor/product, costs, procurement/evaluation, integration, sustainment, result, recommendation |
| `TACTIC_TECHNIQUE` | Tactic / Technique | Technique, conditions, prerequisites, equipment/training, effect, limitations, validation, environments, recommendation |
| `TRAINING` | Training | Objective, audience, prerequisites, method, materials, validation, effect, recurrence |
| `INTEGRATION_CONFIGURATION` | Integration / Configuration | General approach, architecture, phases, evidence, artifacts |
| `PROCESS_POLICY` | Process / Policy | General approach, decisions, phases, evidence, recommendations |
| `HYBRID` | Hybrid | Vendor, tactic, and training extensions may all apply |

Type classifies approach; it does not determine outcome or maturity.

## 8. Project Updates and one-entry reuse

Project Update is preferred routine maintenance. It requires what happened, result/finding, and next step; it may include blocker/risk, date, Project status, maturity, completion, associated Phase changes, maturity evidence, and a relational Lesson.

One Update can drive Latest Result, next step, blocker/risk, Project state, Phase progression, evidence, Lesson creation, Activity, Last Meaningful Activity, Executive facts/freshness, Technical chronology, AI Handoff, and Unit/Problem knowledge views. Curated Executive narrative, long-form technical summaries, and AI Context Notes remain intentional human context, not reasons to re-enter routine facts.

## 9. Maturity and evidence

Maturity is **Concept → Prototype → Field Tested → Validated**. Phase status is Planned, In Progress, or Complete. Maturity, completion, Project status, Phase status, and outcome are distinct: 100% completion does not mean Validated; Validated does not mean finished; Completed may be Unsuccessful.

An Update advancing to Field Tested or Validated requires a supporting event/evaluation and retains evidence date, author, result, optional Phase, and optional reference. This is attributable evidence, not external certification.

## 10. Lessons

Types are Confirmed Finding, Working Hypothesis, Failed Approach, Recommendation, and Unresolved Question. A Lesson retains `LES-` ID, Project, optional Phase/Unit, author/date, optional source Update, finding, recommendation, Tags, and knowledge status. Active, Withdrawn, Superseded, and Archived states enable correction while original authorship remains.

Problem pages aggregate Lessons Across Solution Efforts. Failed Approaches and unsuccessful efforts remain discoverable contributions. A receiving AI must never flatten hypotheses, failures, recommendations, questions, and confirmed findings into equivalent truth.

## 11. Help Requests

Categories are Technical Expertise, Hardware, Software Support, Testing Support / Location, Funding / Resourcing, Operator Feedback, Data, Manufacturing, Integration, Documentation, and Other. Lifecycle is Open → In Progress → Resolved or Cancelled; resolution retains summary, date, actor, and history.

Requests reuse Project, Problem, Lead Unit, and contact context. Contact may follow current Project Lead or be an explicit active user. Lead-following adapts to turnover; stale explicit contacts create integrity/attention findings. Organization and Unit views support discovery. Contact occurs through approved external channels.

## 12. Executive communication

Executive View is a rapid nontechnical brief. It combines derived facts—ID, ownership, status, maturity, completion, Latest Result, outcome, next step, blocker, Help Requests, and documentation—with curated Problem, solution, impact, risk, and leadership-action narrative. Derived facts reduce reporting duplication; editorial narrative remains human-controlled and must be reviewed for freshness.

## 13. Technical View

Technical View exposes approved pathway detail, architecture/configuration, methodology, decisions, Updates, Phases, evidence, limitations, results, Lessons, artifacts, Help Requests, and unresolved issues. It preserves technical chronology rather than the Executive View's brevity or AI Handoff's portable format.

## 14. AI Handoff

Project handoff is generated as Markdown, plain text, or JSON. It contains identity/timestamps, completeness, Problems, team, Units, scope, pathway, architecture, methodology, decisions, chronological Updates, Phases, evidence, typed Lessons, Help Requests, artifacts, current state, closeout, outcome, next step, and AI Context Notes.

Completeness measures presence, not correctness or release approval. A receiving AI must preserve provenance/truth semantics, distinguish responsibility from authorship, use chronology, honor Documentation Availability, avoid treating maturity as certification, never reconstruct withheld detail, and ask humans about ambiguous policy/security/governance. FORGE does not automatically transmit handoffs.

## 15. Unit stewardship

Unit Admin scope is explicit and may cover multiple Units. The derived dashboard separates Projects Led and Supported; active and historical work; people/responsibilities; Needs Attention; Problem coverage; maturity/outcomes; Unit and organization Help Requests; Lessons; Activity; submissions; and Unit POC/profile context.

Project teams maintain work; FORGE derives the Unit portfolio. It does not rank Units/users, infer that a linked Problem affects a Unit, or require a duplicate Unit report.

## 16. Personnel continuity

Account states are Pending, Active, and Disabled; only Active users mutate. Disablement preserves Updates, Lessons, reviews, closeouts, and Activity. Derived findings identify inactive/missing Leads, no active maintainer, inactive Help contacts, disabled responsibilities, pending users, and missing Unit Admins. Authorized administrators reassign current responsibility without rewriting history.

Primary Unit, additional memberships, Unit-admin scopes, and Project memberships are separate. Primary Unit transfer preserves other roles. Unit Admin succession assigns/activates a scoped replacement before removal. **Historical authorship and current responsibility are different concepts.**

## 17. System administration

System Admin controls lockout prevention/succession; user roles/accounts and Unit-admin scopes; Project responsibility/contact recovery; canonical Unit creation/edit and safe deactivation; Problem governance/conversion/relationships/consolidation; Tag creation/rename/merge; approved Location governance; Lesson/Help/artifact correction; receiving-Unit acknowledgment; Platform Integrity; system Needs Attention; filterable administrative Activity; and System-only UNCLASSIFIED metadata export.

An active Unit cannot be deactivated while leading nonterminal work. Supported mutations retain at least one active System Admin; two verified administrators are operationally preferred. Corrections retain original attribution and record actor provenance.

## 18. Platform Integrity

**Integrity failure** means internally inconsistent or unsafe data, such as invalid controlled canonical state, invalid relationships, incompatible role/scope, stale Help contact, or inactive Unit leading active work.

**Setup / Governance Attention** means legitimate incomplete work, such as one System Admin, missing Unit Admin, unprioritized/unstewarded Problem, pending profile/submission, paused Project, blocker, or open Help Request.

Both are derived and clear automatically. They are continuity safeguards—not corruption flags, stored states, performance scores, or rankings. A clean environment can have zero failures and multiple initialization advisories.

## 19. Tracking IDs

Transactionally allocated families are `PRB-000001` (Problem), `PRJ-000001` (Project), `UNIT-000001` (Unit), `LES-000001` (Lesson), `USR-000001` (User), and `SUB-000001` (Submission). Integer IDs are internal. Public IDs remain stable across name/title changes; consolidation preserves historical IDs.

## 20. Data model

Core entities are Problem, Project, Unit, User, ProblemSubmission, SubmissionReview, ProjectUpdate, ProjectPhase, LessonLearned, HelpRequest, RepositoryLink, Tag, Location, and ActivityEvent.

Junctions include ProblemProject (with primary Problem), ProjectUnit (separate from Lead Unit), ProblemUnit, UnitMembership (primary/additional/admin scope), ProjectMembership (Lead/Contributor), shared Tag junctions, Location junctions, and directional ProblemRelationship. VendorDetail, TacticDetail, and TrainingDetail extend pathways one-to-one. Project successor and Problem supersession are self-relations. Activity connects actors and affected entities.

## 21. Application architecture

FORGE is a Next.js 16 / React 19 / TypeScript full-stack application using Prisma 6 and local SQLite. `prisma/` owns schema/migrations/seeds; `lib/db.ts` the client; `lib/data/portal.ts` role-aware projections/derived state; `lib/data/mutations.ts` transactional mutations; `lib/auth/` identity/permissions; `lib/domain/` matching, search, IDs, types, documentation, validation, and handoff; `app/api/` server endpoints; and `components/` UI.

Stable pages are `/problems/[id]`, `/projects/[id]`, `/units/[id]`, and `/guide`; top-level views are query-addressable. Tests create isolated disposable demo/operational SQLite databases, apply migrations/seeds, execute, then delete them. Broad client projections/filtering are pilot-safe but should be monitored with growth.

## 22. Authorization architecture

Server context contains identity, role, account state, primary Unit, memberships, administered Units, and Project memberships. Role grants capability; scope limits it. Project edit covers System Admin, creator, Project member, or qualifying Lead-Unit Admin. Team management is narrower: current Lead, Lead-Unit Admin, or System Admin. Canonical governance requires platform administration.

UI gating is usability, never authority. Pending/Disabled users are denied server-side. Production identity must provide a stable trusted identifier mapped to an active record; never trust a client-provided role.

## 23. Search and discovery

Global search covers Problems, Projects, and Units. Submission matching is deterministic/explainable. Project creation surfaces existing work without blocking overlap. Explore filters Projects by query, maturity, capability, location, status, type, vendor, procurement, and recommendation. Problem comparison contrasts selected efforts. Related Work is current-Project driven, deterministic, explainable, and historical-inclusive. Problem/Unit views, map, graph, Lessons, Help Requests, and Activity provide linked discovery.

Limits: global search omits direct Lesson/Help/submission/user indexing; matching is not semantic; Activity lacks deep pagination; map/graph are lightweight; comparison is wide on phones.

## 24. Administrative provenance

Activity retains actor, description, type, timestamp, and relevant Problem, Project, Unit, affected user, source Update, or entity link. It covers Project work, responsibility, Lessons, Help, closeout, accounts/roles, Units, canonical governance, consolidation, Tags, Locations, corrections, and recovery. Problem governance history is distinct from routine activity; submission reviews are append-only; corrections preserve original creators/authors.

## 25. Clean versus demo data

`pnpm db:seed:demo` and legacy `pnpm db:seed` load fictional development data. `pnpm db:seed:clean` destructively resets to approved Units, discovery-level Problems, zero Projects, governed Tags, and one generic bootstrap System Admin without inferring priorities, stewards, links, locations, POCs, or activity.

Both commands are destructive against configured `DATABASE_URL`. Confirm target and mode. Never merge demo into operational data. Tests use temporary isolated databases.

## 26. Current operational baseline

Verified at this checkpoint: 9 Units; 12 canonical discovery-level Problems; 1 active generic bootstrap System Admin profile; 6 Tags; 0 Projects, submissions, Updates, Phases, Lessons, Help Requests, artifacts, Locations, or Activities; 0 fictional operational records; 0 blocking integrity failures; and 22 expected advisories (12 Problem refinements, 9 Unit-admin assignments, 1 System-admin redundancy). The bootstrap profile is not a credential.

## 27. Pilot readiness

**READY WITH MINOR INITIALIZATION.** Application development is substantially complete for a controlled local pilot. Remaining work: protect/push the stable checkpoint; establish two verified System Admins; select pilot Units; assign their Unit Admins; refine relevant Problems; add genuine approved Solution Efforts; confirm Leads; validate UNCLASSIFIED guidance; exercise backup/restore; run integrity/operational audits; and conduct brief role orientations. Never invent pilot content.

## 28. Recommended pilot scope

Recommendation, not a constraint: 2–3 Units, 3–6 Project teams, approximately 15–30 users, approximately 6–8 weeks. Start with administrators and Leads, seed genuine work, then add Contributors and leadership reviewers.

## 29. Pilot success measures

Measure duplicate Problems prevented/linked; cross-Unit discovery before repeated work; Lessons reused; Failed Approaches preventing repetition; Help Requests producing assistance; Lead/freshness continuity; turnover recovery; Executive View replacing separate briefs; AI Handoff continuity; and governance without database intervention. Do not optimize for success rate, login count, rankings, or activity leaderboards.

## 30. Deployment architecture and boundaries

Implemented: SQLite, Prisma migrations, relational authorization data, server enforcement, development identity switching, reference metadata, clean/demo initialization, tests/build, integrity, and metadata export.

Not production-implemented: trusted authentication, PostgreSQL deployment validation, file/blob storage, automated backup/disaster recovery, HTTPS/proxy, notifications, monitoring/observability, and operational support. SQLite is for prototype/controlled pilot, not intended production. External references may remain preferred for controlled material.

## 31. Deployment runbook summary

`docs/DEPLOYMENT_RUNBOOK.md` is canonical for trusted identity mapping, switcher disablement, System Admin succession/bootstrap retirement, SQLite backup/restore, seed warnings, PostgreSQL/file-storage boundaries, HTTPS/hosting responsibilities, and deployment checklist. Stop SQLite before copying, record matching commit, test restore, check migrations/counts/integrity, and never mistake JSON export for database backup.

## 32. Known limitations

- No production authentication; SQLite concurrency/recovery is prototype-grade.
- No internal production file blobs, notifications, messaging, or subscriptions.
- Global search does not index all knowledge domains; matching is deterministic, not semantic.
- Activity lacks deep server pagination; broad projections/client filters need scale monitoring.
- Comparison is best on tablet/desktop; map/graph are lightweight aids.
- Clean baseline intentionally lacks operational content, staffing, refinement, and Locations.
- Parent organization is textual; no inherited authority hierarchy or Unit AI Handoff.

## 33. Deferred enhancements

Production authentication, PostgreSQL, object storage, automated backups, notifications, relational parent hierarchy, inherited administration, advanced analytics, CSV import, Unit AI Handoff, semantic similarity, external repository synchronization, deep Activity pagination, and richer map/graph visualization are intentionally deferred and are not controlled-pilot blockers unless scope changes.

## 34. Developer modification guidance

1. Read `AGENTS.md`, this manual, and Git state.
2. Inspect current schema, migrations, domain/data/auth, UI, routes, tests, and deployment docs.
3. Preserve stable IDs; use migrations for schema changes.
4. Preserve clean/demo separation; never fabricate operations.
5. Enforce role, account, Unit, and Project scope server-side.
6. Preserve attribution; prefer correction/archive/supersession/consolidation over deletion.
7. Preserve independent Problem/Project lifecycles and permitted parallel Projects.
8. Keep Project Update the routine entry point and reuse facts downstream.
9. Preserve Documentation Availability, originator guidance, and UNCLASSIFIED boundary.
10. Test in disposable databases and restore/verify operational state.
11. Run Prisma validation/migration status, TypeScript, lint, tests, build, whitespace, operational, and sensitive-file checks.
12. Review, checkpoint, and push only when directed.

## 35. Critical invariants

- Problems and Projects have independent lifecycles; multiple Projects may address one Problem.
- Each Project retains a Problem, primary Problem, participating Unit, Lead Unit, and exactly one Lead.
- Project closeout never closes a Problem; status/outcome must be compatible.
- Failed/inconclusive/cancelled/superseded knowledge remains discoverable.
- Historical authorship remains; current responsibility may change.
- At least one active System Admin remains; two are operationally preferred.
- Unit Admin scope is explicit and separate from membership.
- Canonical IDs remain stable; Problem/Unit creation is governed.
- Consolidation preserves old PRBs and prevents cycles.
- Lead Unit change does not silently change Project Lead.
- UNCLASSIFIED only; capability abstraction precedes entry.
- Metadata-only knowledge is valid; withheld content is never reconstructed.
- Updates minimize duplicate maintenance; integrity/attention are safeguards, not scores.

## 36. Instructions to a future AI

1. Read this manual completely.
2. Read `AGENTS.md`.
3. Inspect Git HEAD, branch, status, and remote state.
4. Inspect relevant schema, migrations, domain, data, authorization, routes, UI, tests, and deployment code.
5. Treat current code as authoritative; this document does not override it.
6. Preserve security, governance, continuity, and cultural-safety invariants.
7. Make incremental scoped changes.
8. Validate before committing.
9. Never fabricate operational data.
10. Ask humans when policy, classification, ownership, or operational meaning is ambiguous.

Markdown remains canonical. A separate static plain-text copy is intentionally not maintained because it would duplicate and drift; runtime Project AI Handoffs already generate plain text where needed.
