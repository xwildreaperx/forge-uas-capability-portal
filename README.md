# FORGE — UAS Capability Portal

FORGE is a local, fictional prototype for discovering UAS capability problems, the projects attempting to solve them, the units doing the work, and the evidence and lessons those efforts produce.

## Product philosophy

Problems are enduring capability gaps. Projects are attempts to solve Problems. Multiple Projects can address the same Problem, and one Project can address multiple Problems. Failed or alternative work remains valuable institutional knowledge rather than disappearing.

## Stack and architecture

- Vinext / React 19 / TypeScript
- Tailwind CSS with a product-specific operational theme
- Lucide icons
- Seeded TypeScript records with browser `localStorage` for prototype-created Problems
- Component-level client state for navigation, filters, comparison, and Executive/Technical views

The prototype is intentionally local-first. Its record shapes and relationship-driven UI are ready to move behind a relational data access layer (SQLite for the next local phase, PostgreSQL later) without changing the core experience.

## Run locally

Requirements: Node.js 22.13+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Production validation:

```bash
pnpm build
pnpm lint
```

## Implemented

- Operational dashboard with activity, maturity, help requests, and current problem areas
- Forgiving global search for RF problems, projects, and capabilities
- Problem detail and side-by-side Project comparison
- Project Executive and Technical views
- Linked Problems, participating Units, phases, artifacts, repository metadata, tests, and Lessons Learned
- Unit portfolio and capability profile
- Project maturity/capability/location filters
- Geographic capability exploration
- Related Work and Capability Graph prototypes
- Activity feed
- Functional new Problem workflow with possible-existing-work detection
- Device-local persistence for newly created Problems
- Responsive tablet/mobile behavior
- Small WebMCP action for opening the visible Problem-creation workflow where supported

## Mocked

All organizations, locations, operational details, repositories, files, and results are fictional and non-sensitive. Map geometry is illustrative. Repository and file links do not call external services.

## Known limitations

- The first pass uses seeded records rather than Prisma/SQLite.
- New Problems persist locally; other creation/edit workflows are represented in the connected information architecture but are not yet persisted.
- Authentication, access control, file storage, and external integrations are intentionally omitted.
- The map and capability graph are lightweight prototypes rather than full MapLibre/graph-library integrations.

## Recommended next steps

1. Introduce SQLite with a relational schema for Problems, Projects, Units, phases, lessons, locations, links, artifacts, and activity.
2. Move all mutations to validated server actions and add edit/delete workflows.
3. Expand the seed to the complete 12/20/12+ dataset and add Vitest coverage for relationship, search, filtering, and tracking-ID logic.
4. Add visibility markings and role-ready authorization boundaries.
5. Replace the illustrative map with MapLibre and implement durable file/object storage.
