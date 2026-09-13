# FORGE PLATFORM HANDOFF / AI USER MANUAL

Version: 1.0  
Environment: Unclassified local prototype

## Collaboration and pilot workflow

Project maintainers use **Request Help** to publish an approved capability-level assistance need. Select a practical category, enter a short description, and reuse the Project Lead or another existing contact. Move the request to In Progress when assistance begins, then resolve or cancel it with a short summary. Closed requests remain institutional history. FORGE does not provide internal messaging; collaborators use the displayed contact through approved channels.

Open a canonical Problem to compare all or selected linked Solution Efforts, including historical and unsuccessful work. Open **Related Work** from a Project for explainable shared-Problem, tag, Unit, or Solution-Type connections. Artifact links open only when Documentation Availability permits direct access; otherwise contact the originator. **My Projects**, assistance discovery, activity, and relevant Lessons make the dashboard useful to Project teams while preserving the portfolio view.

> You are being given the FORGE Platform Handoff. Read this document before analyzing or advising a user about FORGE. Use it to understand the platform’s purpose, information model, terminology, workflows, information-governance model, and design philosophy. Projects are not always technical-development efforts. Do not reconstruct missing technical information: some records intentionally contain metadata only and direct the user to an authorized owner.

## Purpose

FORGE is a capability problem-solving and institutional-knowledge network. It helps people discover what capability gaps exist, what has already been attempted, what exists now, what was learned, who owns relevant knowledge, and what should happen next. It is intentionally broader than a project tracker or engineering repository.

## Core information model

## Users, roles, and governed contribution

FORGE separates identity profiles from future authentication. Accounts have Pending, Active, or Disabled status and one platform role: Contributor, Project User, Unit Administrator, or System Administrator. Unit memberships and Project assignments are explicit relational records; Unit Administrators act only within explicitly administered Units. Disabling an account removes action authority without erasing attribution.

The Administration workspace shows each person’s primary and additional Unit memberships, explicit administrator scopes, current Project roles, open Help-contact responsibilities, and factual continuity warnings. “Needs attention” is a derived operational view, not a performance score or a stored lifecycle state. Disabling a user is permitted after reviewing the warning; Project Leads, active maintainers, Help contacts, and last-Unit-Administrator gaps remain visible for deliberate reassignment. Unit Administrators may manage ordinary memberships inside their scope but cannot grant administrator authority. System Administrators provide recovery when an active Unit has no active Unit Administrator and control Unit activation status.

Primary Unit transfers preserve Project membership and historical attribution. Administrator scope does not move implicitly with a primary Unit. Open Help Requests default to following the Project Lead; a lead change updates that contact. An explicitly entered alternate contact remains explicit and must be reassigned deliberately if it becomes inactive. Administrative changes are recorded in Activity with actor, affected record, Unit context, time, and a plain-language description.

## Unit stewardship

The Administration workspace opens with a per-Unit stewardship dashboard. A Unit Administrator selects one explicitly administered Unit at a time; this changes the people, attention, portfolio, Problem coverage, Help Requests, Lessons, submissions, and Activity shown in the stewardship surface without narrowing broad FORGE discovery.

Projects Led by My Unit and Projects Supported by My Unit are separate views, each preserving current and historical efforts. Last Meaningful Activity, lifecycle status, maturity, completion, outcomes, Help Requests, and Project Lead are derived from Project records. Problems Addressed means only that the Unit has a recorded Solution Effort against the canonical Problem; it does not mean the Problem affects the Unit. Lessons and resolved assistance history remain visible, including unsuccessful and inconclusive work. FORGE does not rank Units or users, calculate success percentages, or treat failed work as poor performance.

Needs Attention contains factual, automatically clearing conditions such as inactive leadership, no active maintainer, paused work, current blocker/risk, open assistance, pending users/submissions, inactive contacts, or no active Unit Administrator. Each signal links to the existing Project, user, submission, or recovery workflow. Project teams remain responsible for Project Updates; the Unit Administrator maintains continuity, scoped people, exceptions, and approved Unit POC data rather than a duplicate portfolio report.

Problem authority remains divided: Contributors submit potential Problems; Unit Administrators review Unit context and recommend an existing canonical relationship, likely duplicate, clarification, or global review; System/global governance controls creation and material edits of canonical Problems.

Parent-command inheritance, receiving-Unit transfer acknowledgment, Unit-level AI handoff, external notifications, advanced analytics, reminders, and portfolio export remain future enhancements for consideration after the controlled pilot.

Contributors submit potential Problems into a review queue rather than directly editing canonical Problems. Reviewers may accept and link a submission, associate it with existing work as a duplicate, or reject it. Project Users can create solution efforts and edit only created/assigned work. System Administrators have global scope. UI controls reflect these rules, but server mutations are the enforcement boundary.

The amber **Development Only — Not Authentication** switcher exists solely for local role acceptance. It is gated by environment and cannot operate in a production build. Do not mistake it for password, SSO, CAC, or session security.

`pnpm db:seed:demo` loads fictional demonstration history and representative users for every role. `pnpm db:seed:clean` destructively resets the database to nine approved organizations, twelve initial canonical capability Problems, zero Solution Efforts, and one generic bootstrap System Administrator identity. Set `FORGE_BOOTSTRAP_IDENTIFIER` for the intended deployment context, then replace or map that identity when a real authentication adapter is implemented. Neither seed contains credentials.

Missing detailed Problem information is intentional at this stage. A receiving AI should help stakeholders structure approved capability-level refinements when asked; it must not invent operational context, technical requirements, ownership, priority, Unit relationships, or proposed solutions. Demo records remain isolated in the development-only demo seed.

Problems → Solution Efforts / Projects → Units → Capabilities → Phases and tests → Lessons → Outcomes.

- A **Problem** is an enduring capability gap. It can outlive any individual attempt to solve it.
- A **Project** is a solution effort that addresses one or more Problems. It can succeed, partially succeed, fail, be superseded, or be abandoned; its knowledge still has value.
- A **Unit** originates, leads, supports, tests, or possesses relevant work.
- **Maturity** describes evidence/readiness: Concept, Prototype, Field Tested, or Validated.
- **Status** describes workflow state: Planning, Active, Transitioning, and related lifecycle states.
- **Outcome** records what resulted. It is not interchangeable with status or maturity.

## Project operations and lifecycle

Use Project Updates as the routine chronological record. One Update can record the result, next step, risk, Project status/maturity/completion change, progress an associated Phase, and—when selected—create a reviewed Lesson. A Field Tested or Validated change requires a supporting event/evaluation and date; the Update itself is the evidence record, with its author, result, Phase, and optional reference.

Phases support Planned, In Progress, and Complete states and remain editable as objectives, summaries, results, accomplishments, blockers, risks, dates, and next actions develop. Completing a Phase does not close its Project.

Closeout is an institutional-knowledge workflow, not administrative archiving. It records terminal status, controlled outcome, final result, what worked, what did not, next recommendation, documentation availability, and an optional successor. Closeout does not change the lifecycle of linked Problems. Closed and negative-result Projects stay discoverable.

Lesson Types are Confirmed Finding, Working Hypothesis, Failed Approach, Recommendation, and Unresolved Question. Treat them according to type; do not flatten hypotheses or unresolved questions into facts. Problem pages reference Lessons across linked efforts with originating Project, Lead Unit, Phase, author/date, and outcome context where known.

## Solution pathways

FORGE recognizes seven first-class pathways:

1. **Organic Development** — build and test something internally.
2. **Vendor / Commercial Solution** — evaluate something available from industry.
3. **Tactic / Technique** — employ existing people or equipment differently.
4. **Training** — improve capability through instruction and practice.
5. **Integration / Configuration** — connect or configure existing systems differently.
6. **Process / Policy** — change an organizational rule or workflow.
7. **Hybrid** — deliberately combine pathways.

The best answer is not necessarily new technology.

## Three knowledge experiences

- **Executive — “Explain it to me quickly.”** A curated, plain-language one-page brief: Problem, impact, simple approach, status, evidence, risk, next step, and leadership action.
- **Technical — “Show me the details.”** Phases, methodology, architecture/configuration, evidence, artifacts, lessons, and solution-specific context.
- **AI Handoff — “Give me enough context to continue intelligently.”** A portable aggregation of approved persisted context. It is available as Markdown, plain text, and JSON.

Automatically assembled text is a convenience, not an authoritative determination. User-entered AI Context Notes are labeled separately from structured records.

## Discovery

Start with global search or Problems. Use combined filters for solution type, vendor, procurement status, recommendation, maturity, capability, location, and status. Related Work highlights shared Problems, capabilities, and Units. Unit pages show portfolios, the Map shows geographic participation, and the Capability Graph shows relationships. A Problem comparison places unlike pathways side by side without pretending their evidence is identical.

## Institutional knowledge

FORGE preserves unsuccessful work, abandoned approaches, alternatives, vendor evaluations, TTP references, tests, and Lessons Learned. A failed approach can prevent duplicated effort. Missing information does not prove that no work exists.

## Documentation Availability

Every Project and artifact can state where authoritative knowledge resides:

- Available in FORGE
- External Reference
- Available From Originator
- Controlled Access
- Metadata Only
- Not Yet Documented

This distinguishes **knowing relevant knowledge exists** from **possessing the underlying knowledge**. Both have institutional value.

When a record is external, controlled, originator-held, or metadata-only:

1. Treat the absence as potentially intentional.
2. Explain where the authoritative information exists.
3. Direct the user to the originator or approved source.
4. Do not reconstruct or invent missing procedures or technical details.
5. Do not treat absence as evidence that the solution does not exist.

Contact Originator and Request Supporting Documentation facilitate human coordination; they do not bypass authorization or access-control processes.

## Information security and capability abstraction

**UNCLASSIFIED INFORMATION ONLY.** Do not enter, upload, reproduce, summarize, transform, or expose classified information in this prototype. FORGE is not a classified system and neither FORGE nor an AI model is a classification, declassification, sanitization, or security-review authority.

FORGE exists to help answer **“What capability do we need?”** without necessarily answering **“What sensitive operation, mission, target, intelligence source, or scenario caused us to need it?”**

Use this pattern:

Sensitive operational context → authorized review and abstraction → approved capability requirement → FORGE.

Do not place sensitive source context directly into FORGE. Record only an appropriately reviewed, authorized, releasable capability abstraction, such as a range, endurance, payload, interoperability, environmental, deployment-time, or navigation requirement. The sensitive reason remains in the environment authorized for it.

Detailed information is not automatically classified, and generic-looking information is not automatically safe. Follow organizational policy and authorized security guidance.

## AI handoff and aggregation

Project handoffs aggregate information from multiple fields and can become more sensitive in combination. Review every export before sharing it. A handoff does not determine releasability, even when each source field was entered separately. FORGE never automatically transmits a handoff to an external AI service; copy and download are intentional user actions.

Receiving AI systems must:

- Work only from approved information present in the handoff.
- Avoid asking for sensitive source context merely to improve analysis.
- Never invent intentionally omitted information.
- Recognize metadata-only records as valid.
- Direct users to listed information owners and approved sources.
- Treat exports as user-reviewed context, not automatically releasable information.

## Typical workflow

1. Search for the capability Problem before creating new work.
2. Review related Projects and compare different solution pathways.
3. Open Executive View for decision context, Technical View for evidence, or AI Handoff for portable continuity.
4. Check Documentation Availability before assuming detail should be in FORGE.
5. Contact the originator when authoritative material is maintained elsewhere.
6. Add appropriately releasable phases, Lessons, artifact metadata, executive language, and AI Context Notes.
7. Review any handoff or large export before copying it to another system.

## Current prototype

The local prototype supports relational SQLite persistence; many-to-many Problem/Project and Project/Unit relationships; seven solution pathways; vendor, TTP, and training details; stable entity URLs; search and combined filters; comparison; executive, technical, and AI experiences; phases; Lessons; artifact metadata; Unit/Map/Graph discovery; and copy/download handoffs.

It intentionally does not provide classification review, automated sanitization, external-AI transmission, authorization bypass, repository ingestion, automated document ingestion, a classified environment, or a cross-domain solution. Authentication, cloud deployment, and production infrastructure are outside the current pass.

## How to begin

Open the Dashboard, search the capability phrase or tracking ID, select a Problem, compare existing Solution Efforts, and choose the audience-appropriate Project view. Create new work only after checking related records. If detail is intentionally external, contact the listed originator instead of duplicating or reconstructing it.
