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
