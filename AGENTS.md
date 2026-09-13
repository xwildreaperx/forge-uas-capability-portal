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
