# FORGE AI Development Instructions

FORGE is a relational capability problem-solving and institutional-knowledge portal. Preserve the distinction between enduring Problems and the many Solution Efforts that may address them. Do not redesign the application from scratch or reduce Projects to software-development projects.

## Safety and information handling

- UNCLASSIFIED INFORMATION ONLY. Use fictional, non-sensitive examples.
- Record approved capability abstractions, not operationally sensitive scenario detail.
- Do not reconstruct intentionally absent technical detail. Preserve Documentation Availability, originator, and access guidance.
- Never add credentials, password storage, authentication secrets, or real personal data to seeds.

## Authorization architecture

- Keep identity resolution in `lib/auth/current-user.ts` and permission decisions in `lib/auth/permissions.ts`.
- UI visibility is usability only. Every mutation must enforce role, account status, and Unit/Project scope on the server.
- Preserve the four roles: Contributor, Project User, Unit Administrator, and System Administrator.
- Unit membership, administered-Unit scope, and Project membership are distinct.
- Disabled users retain historical attribution but cannot perform protected actions.
- The development user switcher is not authentication. It must remain labeled and unavailable in production.

## Data and validation

- Prisma/SQLite is the local prototype source of truth. Preserve migrations and stable tracking IDs.
- `prisma/seed.ts` is fictional demo data. `prisma/seed-clean.ts` is the empty operational baseline with only a generic bootstrap administrator.
- Validate with Prisma validation and migration status, TypeScript, lint, tests, and production build.
- Preserve Executive, Technical, AI Handoff, reference-only knowledge, and meaningful empty states.
- Demo and clean operational initialization are intentionally separate. Never merge or silently load demo records into a clean environment.
- The clean operational seed is a destructive reset to nine approved organizations, twelve stakeholder-supplied canonical Problems, zero Projects, and the generic bootstrap administrator.
- The initial Problem summaries are discovery-level records. Detailed statements, ownership, priority, affected/reporting Units, requirements, and relationships are intentionally pending stakeholder refinement.
- Do not invent Projects, Unit–Problem relationships, priorities, owners, locations, POCs, capabilities, requirements, solutions, or activity.
- Keep fictional test/demo users and operational content isolated in the demo seed. Preserve authorization while testing clean data with temporary isolated fixtures.
- Preserve the product rule that Problems are canonicalized while Projects remain free to overlap. Problem submission must provide explainable server-backed duplicate/related discovery and human governance; Project creation should surface existing work for awareness without blocking parallel experimentation.
- Treat Project Updates as the primary chronological maintenance record. Reuse them for activity, freshness, Latest Result, and AI continuity instead of asking users to re-enter the same event.
- Keep Project creator, current Project Lead, and Contributors distinct. Lead reassignment must never rewrite creator identity or historical authorship, and each Project must retain exactly one current Lead assignment.
- Project team changes are limited to the current Project Lead, the Lead Unit's administrators, and System Administrators. Relationship edits follow existing Project edit scope. Enforce both rules server-side.
- Preserve at least one related Problem, one primary Problem, one participating Unit, and one Lead Unit. Lead Unit changes do not imply Project Lead changes.
- Never collapse Project status, maturity, completion, Phase, and outcome into one concept. Status is lifecycle state; maturity is evidence/readiness; completion is planned-work progress; a Phase is the work portion underway; outcome is final disposition.
- Project closeout never closes or resolves a Problem. Completed, Cancelled, Superseded, Unsuccessful, and Inconclusive efforts remain discoverable institutional knowledge.
- Prefer one Project Update for routine progress, Phase progression, Project state, and maturity evidence. Avoid asking users to enter the same result into disconnected forms or generating redundant Activity.
- Field Tested and Validated maturity changes must retain supporting event, date, author, result, and optional Phase/reference provenance through their Project Update.
- Lesson Type changes interpretation, especially in AI Handoff. Preserve Confirmed Finding, Working Hypothesis, Failed Approach, Recommendation, and Unresolved Question distinctions and their known provenance.
- Help Requests are collaboration signals, not tickets or internal messages. Preserve category, contact, creator, lifecycle, resolution history, Activity, and Last Meaningful Activity; distinguish active assistance from resolved history in AI Handoff.
- Comparison must use the selected canonical Problem, and Related Work the currently viewed Project. Keep both deterministic, explainable, and inclusive of historical efforts.
- Open artifact links only when Documentation Availability explicitly permits direct access. For metadata-only, originator-held, and controlled records, preserve contact/access guidance.
- Treat Unit stewardship as a derived view over Projects, memberships, Problems, Lessons, Help Requests, submissions, and Activity. Project teams maintain underlying work; Unit Administrators manage continuity, scoped people, exceptions, and approved Unit contact data.
- Keep Unit-led and Unit-supported portfolios distinct, preserve active and historical work, and never infer that a Project-linked Problem affects a Unit. Unit dashboards must not rank Units or users, calculate success rates, or penalize unsuccessful work.
- Unit Administrators review Unit-originated Problem context and recommend canonical relationships. Only System/global governance controls creation and material edits of canonical Problems.
- Supported mutations must always retain at least one active System Administrator. Prefer two verified trusted administrators operationally.
- A Unit Administrator must have at least one active administered-Unit scope; non-Unit-Administrator roles must not retain Unit Admin scopes. Reconcile role and scope transactionally.
- System Administrator authority never bypasses controlled-value validation and does not imply access to underlying controlled documentation.
- An active Unit cannot be deactivated while it leads a nonterminal Project.
- Integrity and attention findings are derived from source data and clear automatically; they are continuity safeguards, not performance scores.
- Administrative recovery must preserve tracking IDs, historical authorship, and actor/record provenance.
