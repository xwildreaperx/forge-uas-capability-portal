# FORGE Prototype — Stakeholder Review Guide

## Review purpose

FORGE is an early local prototype for preserving and discovering UAS capability problem-solving work. This review should determine whether the product model, language, workflows, and knowledge experiences are useful enough to guide continued development. It is not a production-readiness or accreditation review.

Repository: <https://github.com/xwildreaperx/forge-uas-capability-portal>

Review baseline: Git checkpoint `6494cb4` — **Add executive and portable AI knowledge experiences**

Previous stable baseline: `0a41ece` — **Expand projects into broad solution efforts**

## What FORGE is intended to do

FORGE connects four kinds of institutional knowledge:

- **Problems** describe enduring capability gaps.
- **Projects / Solution Efforts** record the different ways teams attempt to address those gaps, including organic development, vendor products, tactics and techniques, training, integration, policy, and hybrid approaches.
- **Units** identify who originated, supported, or tested the work.
- **Lessons Learned and artifacts** preserve evidence, results, limitations, and references so unsuccessful or alternative approaches remain discoverable.

One Problem can have several competing or complementary Solution Efforts, and one effort can address several Problems. The database explicitly preserves those relationships.

## Information-handling boundary

The prototype contains fictional data and is intended for **UNCLASSIFIED INFORMATION ONLY**.

FORGE is not a classification, declassification, sanitization, authorization, or release authority. Sensitive operational context should follow this path:

> Sensitive context → authorized review → approved capability abstraction → FORGE

Reference-only records are intentional and valid. When Documentation Availability indicates that authoritative content is external, controlled, metadata-only, or available from an originator, reviewers and AI systems should use the recorded contact/access path. They must not reconstruct or invent the withheld detail.

## Run the prototype locally

Requirements: Git, Node.js 22.13 or newer, and pnpm.

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

Open <http://localhost:3000>.

The repository is private. The owner must grant the reviewer GitHub access before cloning.

## Suggested 30-minute review

### 1. Orient to the network — 5 minutes

1. Review the Dashboard’s activity and distribution summaries.
2. Open **PRB-000001 — Short RF Range**.
3. Confirm that several distinct pathways address the same Problem.
4. Follow links between the Problem, its efforts, and participating Units.

### 2. Evaluate the three Project experiences — 10 minutes

Open **PRJ-000001 — Airborne Communications Relay**.

1. Read the **Executive** view without opening Technical content. Decide whether a leader can understand the problem, approach, status, demonstrated result, risk, next step, and requested action in about one minute.
2. Open **Technical** and assess whether the phases, evidence, lessons, relationships, and artifact metadata provide enough continuity for a practitioner.
3. Open **AI Handoff**. Switch among Markdown, plain text, and JSON. Check the timestamp, version, completeness label, provenance, explicit uncertainty, security reminder, and copy/download controls.

### 3. Review reference-only behavior — 5 minutes

Open **PRJ-000008 — Directional Antenna Employment Technique**.

1. Confirm that the Project is discoverable and useful at the capability level.
2. Confirm that Documentation Availability and access instructions are prominent.
3. Use **Contact Originator · Copy Instructions**.
4. Inspect its AI Handoff and confirm it directs the receiving AI to the approved source without inventing the absent procedure.

### 4. Review AI and platform continuity — 5 minutes

1. Open **Help & guidance**.
2. Review the separation between Executive, Technical, and AI knowledge experiences.
3. Use **Give FORGE to My AI** to copy the canonical platform handoff.
4. Decide whether a new AI or developer could understand the product model and continue safely from the supplied context.

### 5. Test one edit — 5 minutes

1. Edit a fictional Project’s executive or AI-context field.
2. Save it and reopen **AI Handoff**.
3. Confirm the new value appears immediately and that refresh/restart persistence is understandable.
4. Do not enter real sensitive, controlled, proprietary, personal, or classified information.

## Questions for the reviewer

Please distinguish high-priority product findings from future production-infrastructure needs.

1. Can a leader understand the value and state of an effort quickly? Which statements remain too technical or vague?
2. Does the Problem-to-many-Solution-Efforts model match how work is actually pursued?
3. Does the Technical view preserve enough context for another team to evaluate or continue the work?
4. Is the AI Handoff useful, appropriately bounded, and clear about provenance and uncertainty?
5. Is reference-only knowledge discoverable without encouraging unauthorized reconstruction?
6. Are the Documentation Availability terms understandable and operationally useful?
7. Are security warnings placed where users make information-handling decisions, without becoming background noise?
8. What information is missing from the executive brief, technical record, or AI package?
9. Which workflow would deliver the most value in the next development pass?
10. What would prevent your organization from adopting this operating model?

## Requested feedback format

For each finding, capture:

- **Area:** Executive, Technical, AI Handoff, discovery, data model, governance, usability, or other
- **Observation:** What happened or was unclear
- **Impact:** Why it matters
- **Priority:** Blocker, high, medium, or low
- **Recommendation:** Proposed change, if known
- **Evidence:** Project ID, Problem ID, screen, or workflow

Please avoid placing sensitive operational details in GitHub issues or review notes. Describe the capability-level concern and coordinate protected context through an authorized channel.

## Current prototype boundaries

This pass intentionally does not prioritize authentication, authorization, PostgreSQL deployment, cloud storage, file upload, external synchronization, or production hosting. The prototype uses a local SQLite database and fictional seed data. Map geometry and capability-graph layout remain illustrative.

Those omissions are known production gaps, not discoveries that need to dominate this product review. Feedback should concentrate first on the product model, executive communication, technical continuity, AI portability, reference-only behavior, and information-handling guidance.

## Existing quality evidence

At checkpoint `6494cb4`:

- Prisma schema validation passes.
- All migrations are applied and migration status is current.
- TypeScript and lint checks pass.
- All 9 automated tests pass.
- The optimized production build passes.
- Manual acceptance covered executive briefs, three AI formats, copy actions, platform handoff, reference-only behavior, originator instructions, and immediate regeneration after edits.

## Supporting material

- `README.md` — architecture, setup, data model, and quality commands
- `docs/FORGE_AI_USER_MANUAL.md` — canonical platform handoff for people and AI systems
- `prisma/schema.prisma` — relational source of truth
- `prisma/migrations/` — reproducible database evolution
- `tests/domain.test.ts` — focused domain and persistence verification
