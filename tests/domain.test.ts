import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { db } from '../lib/db.ts';
import {
  createProblem,
  createProject,
  submitProblem,
} from '../lib/data/mutations.ts';
import { getPortalData } from '../lib/data/portal.ts';
import { findRelatedProblems } from '../lib/domain/matching.ts';
import { filterProjects } from '../lib/domain/search.ts';
import { formatTrackingId } from '../lib/domain/tracking.ts';
import {
  handoffCompleteness,
  projectHandoffJson,
  projectHandoffMarkdown,
  projectHandoffText,
} from '../lib/domain/handoff.ts';
import type { CurrentUserContext } from '../lib/auth/permissions.ts';
import {
  canAccessUnit,
  canEditProject,
  hasPermission,
  requirePermission,
} from '../lib/auth/permissions.ts';
import { isDevUserSwitcherEnabled } from '../lib/auth/config.ts';

const createdProblemIds: number[] = [];
const createdProjectIds: number[] = [];

async function testUser(trackingId: string): Promise<CurrentUserContext> {
  const user = await db.user.findUniqueOrThrow({
    where: { trackingId },
    include: { unitMemberships: true, projectMemberships: true },
  });
  return {
    id: user.id,
    trackingId: user.trackingId,
    displayName: user.displayName,
    identifier: user.identifier,
    role: user.role,
    status: user.status,
    primaryUnitId: user.primaryUnitId,
    unitIds: user.unitMemberships.map((x) => x.unitId),
    administeredUnitIds: user.unitMemberships
      .filter((x) => x.isAdmin)
      .map((x) => x.unitId),
    projectIds: user.projectMemberships.map((x) => x.projectId),
  };
}

after(async () => {
  if (createdProjectIds.length)
    await db.project.deleteMany({ where: { id: { in: createdProjectIds } } });
  if (createdProblemIds.length)
    await db.problem.deleteMany({ where: { id: { in: createdProblemIds } } });
  await db.$disconnect();
});

describe('relational seed', () => {
  it('supports both many-to-many relationships and a distinct Lead Unit', async () => {
    const problem = await db.problem.findUniqueOrThrow({
      where: { trackingId: 'PRB-000001' },
      include: { projectLinks: true },
    });
    const project = await db.project.findUniqueOrThrow({
      where: { trackingId: 'PRJ-000001' },
      include: { problemLinks: true, unitLinks: true, leadUnit: true },
    });
    const unit = await db.unit.findUniqueOrThrow({
      where: { trackingId: 'UNIT-000001' },
      include: { projectLinks: true },
    });
    assert.ok(problem.projectLinks.length >= 4);
    assert.ok(project.problemLinks.length >= 2);
    assert.ok(project.unitLinks.length >= 3);
    assert.ok(
      project.unitLinks.some(
        (link) => link.unitId === project.leadUnit.id && link.role === 'Lead',
      ),
    );
    assert.ok(unit.projectLinks.length > 1);
  });

  it('preserves distinct solution pathways for one Problem', async () => {
    const problem = await db.problem.findUniqueOrThrow({
      where: { trackingId: 'PRB-000001' },
      include: { projectLinks: { include: { project: true } } },
    });
    const types = new Set(
      problem.projectLinks.map((x) => x.project.solutionType),
    );
    for (const expected of [
      'ORGANIC_DEVELOPMENT',
      'VENDOR_SOLUTION',
      'TACTIC_TECHNIQUE',
      'TRAINING',
      'INTEGRATION_CONFIGURATION',
    ])
      assert.ok(types.has(expected as never));
  });
});

describe('tracking IDs and creation', () => {
  it('formats stable public IDs separately from primary keys', () => {
    assert.equal(formatTrackingId('Problem', 23), 'PRB-000023');
    assert.equal(formatTrackingId('Project', 7), 'PRJ-000007');
  });

  it('persists a Problem with a unique tracking ID', async () => {
    const problem = await createProblem(await testUser('USR-000004'), {
      title: 'Test persistent capability gap',
      description: 'Created by automated persistence verification.',
      detailedDescription: 'Detailed evidence created by automated persistence verification.',
      problemStatement: 'A canonical persistence path must be verified.',
      category: 'Guidance',
      duplicateReviewed: true,
    });
    createdProblemIds.push(problem.id);
    assert.match(problem.trackingId, /^PRB-\d{6}$/);
    assert.ok(
      await db.problem.findUnique({
        where: { trackingId: problem.trackingId },
      }),
    );
  });

  it('persists a Project linked to multiple Problems and Units', async () => {
    const problems = await db.problem.findMany({
      take: 2,
      orderBy: { id: 'asc' },
    });
    const units = await db.unit.findMany({ take: 3, orderBy: { id: 'asc' } });
    const project = await createProject(await testUser('USR-000002'), {
      name: 'Test multi-link project',
      executiveSummary: 'Persistence test.',
      detailedDescription: 'Tests explicit junction records.',
      solutionApproach: 'Test safely.',
      completion: 10,
      leadUnitId: units[0].id,
      problemIds: problems.map((x) => x.id),
      unitIds: units.map((x) => x.id),
    });
    createdProjectIds.push(project.id);
    const persisted = await db.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { problemLinks: true, unitLinks: true },
    });
    assert.equal(persisted.problemLinks.length, 2);
    assert.equal(persisted.unitLinks.length, 3);
  });

  it('persists organic, vendor, tactic, and training effort details', async () => {
    const problem = await db.problem.findFirstOrThrow();
    const units = await db.unit.findMany({ take: 2 });
    const cases = [
      { solutionType: 'ORGANIC_DEVELOPMENT' },
      {
        solutionType: 'VENDOR_SOLUTION',
        vendor: { vendorName: 'Test Vendor', productName: 'Test Radio' },
      },
      {
        solutionType: 'TACTIC_TECHNIQUE',
        tactic: {
          techniqueTitle: 'Test Technique',
          techniqueDescription: 'Repeatable technique.',
        },
      },
      {
        solutionType: 'TRAINING',
        training: {
          trainingObjective: 'Train operators',
          intendedAudience: 'Test operators',
        },
      },
    ];
    for (const [index, specific] of cases.entries()) {
      const project = await createProject(await testUser('USR-000002'), {
        name: `Pathway persistence ${index}`,
        executiveSummary: 'Test effort.',
        detailedDescription: 'Conditional record persistence.',
        solutionApproach: 'Evaluate safely.',
        leadUnitId: units[0].id,
        unitIds: units.map((x) => x.id),
        problemIds: [problem.id],
        ...specific,
      });
      createdProjectIds.push(project.id);
    }
    const persisted = await db.project.findMany({
      where: { id: { in: createdProjectIds } },
      include: { vendorDetail: true, tacticDetail: true, trainingDetail: true },
    });
    assert.ok(
      persisted.some((x) => x.vendorDetail?.vendorName === 'Test Vendor'),
    );
    assert.ok(
      persisted.some(
        (x) => x.tacticDetail?.techniqueTitle === 'Test Technique',
      ),
    );
    assert.ok(
      persisted.some(
        (x) => x.trainingDetail?.trainingObjective === 'Train operators',
      ),
    );
  });
});

describe('search, filtering, and related work', () => {
  it('supports exact IDs, keywords, maturity, capability, and location', async () => {
    const data = await getPortalData();
    assert.ok(
      filterProjects(data.projects, { query: 'PRJ-000001' }).some(
        (x) => x.id === 'PRJ-000001',
      ),
    );
    assert.ok(filterProjects(data.projects, { query: 'relay' }).length > 0);
    assert.ok(
      filterProjects(data.projects, { maturity: 'Validated' }).every(
        (x) => x.maturity === 'Validated',
      ),
    );
    assert.ok(
      filterProjects(data.projects, {
        capability: 'RF / Communications',
      }).every((x) => x.tags.includes('RF / Communications')),
    );
    assert.ok(
      filterProjects(data.projects, { location: 'Ridgeview, CO' }).every((x) =>
        x.locations.includes('Ridgeview, CO'),
      ),
    );
    assert.ok(
      filterProjects(data.projects, { solutionType: 'VENDOR_SOLUTION' }).every(
        (x) => x.solutionType === 'VENDOR_SOLUTION',
      ),
    );
    assert.ok(
      filterProjects(data.projects, { vendor: 'Aegis Wave Systems' }).every(
        (x) => x.vendor?.vendorName === 'Aegis Wave Systems',
      ),
    );
  });

  it('detects possible existing work deterministically', () => {
    const matches = findRelatedProblems({ title: 'RF range limitation' }, [
      {
        id: 'PRB-000001',
        title: 'Short RF Range',
        category: 'RF / Communications',
        tags: ['RF / Communications'],
      },
    ]);
    assert.equal(matches[0]?.id, 'PRB-000001');
  });
});

describe('portable AI handoff and governed knowledge', () => {
  it('persists curated executive, AI-context, and reference-only metadata', async () => {
    const problem = await db.problem.findFirstOrThrow();
    const unit = await db.unit.findFirstOrThrow();
    const project = await createProject(await testUser('USR-000002'), {
      name: 'Reference-only handoff test',
      executiveSummary: 'Tests governed portable context.',
      detailedDescription: 'The authoritative procedure is held outside FORGE.',
      solutionApproach:
        'Record discoverable metadata without sensitive detail.',
      leadUnitId: unit.id,
      problemIds: [problem.id],
      unitIds: [unit.id],
      documentationAvailability: 'AVAILABLE_FROM_ORIGINATOR',
      executiveSummaryPlainLanguage:
        'Leaders can discover the effort without exposing its procedure.',
      problemPlainLanguage:
        'Useful work becomes invisible when it cannot be described safely.',
      solutionPlainLanguage:
        'FORGE stores the approved capability-level description.',
      impactPlainLanguage:
        'Teams avoid duplicate effort and contact the right originator.',
      aiContextNotes:
        'Preserve the distinction between discoverability and possession.',
      scope: 'Metadata, ownership, and approved capability effect.',
      nextStep: 'Request the authoritative material through the originator.',
      keyRisk: 'A receiving AI could invent intentionally withheld detail.',
      leadershipAction: 'Reinforce approved information-handling channels.',
      originatorContact: 'Test Unit knowledge manager',
      accessInstructions:
        'Contact the originator and follow the approved access process.',
    });
    createdProjectIds.push(project.id);

    const persisted = await db.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    assert.equal(
      persisted.documentationAvailability,
      'AVAILABLE_FROM_ORIGINATOR',
    );
    assert.match(persisted.aiContextNotes ?? '', /discoverability/);

    const data = await getPortalData();
    const projected = data.projects.find(
      (item) => item.id === project.trackingId,
    )!;
    const generated = new Date('2026-09-07T20:30:00.000Z');
    const markdown = projectHandoffMarkdown(projected, generated);
    const plain = projectHandoffText(projected, generated);
    const json = JSON.parse(projectHandoffJson(projected, generated));

    assert.match(markdown, /FORGE AI PROJECT HANDOFF/);
    assert.match(markdown, /Do not reconstruct or invent it/);
    assert.match(markdown, /Test Unit knowledge manager/);
    assert.match(markdown, /UNCLASSIFIED INFORMATION ONLY/);
    assert.doesNotMatch(plain, /\*\*/);
    assert.equal(json.project.id, project.trackingId);
    assert.equal(json.generated, generated.toISOString());
    assert.ok(
      ['Partial', 'Comprehensive'].includes(handoffCompleteness(projected)),
    );
  });
});

describe('role and scope authorization', () => {
  it('forces the development identity switcher off in production', () => {
    const original = process.env.NODE_ENV;
    Object.assign(process.env, { NODE_ENV: 'production' });
    assert.equal(isDevUserSwitcherEnabled(), false);
    Object.assign(process.env, { NODE_ENV: original });
  });
  it('allows Contributors to submit but not create Projects or administer', async () => {
    const contributor = await testUser('USR-000001');
    assert.equal(hasPermission(contributor, 'problem:submit'), true);
    assert.equal(hasPermission(contributor, 'project:create'), false);
    assert.equal(hasPermission(contributor, 'user:manage'), false);
    const submission = await submitProblem(contributor, {
      title: 'Automated permission test submission',
      description: 'Verifies the governed intake path.',
    });
    assert.match(submission.trackingId, /^SUB-\d{6}$/);
    await db.problemSubmission.delete({ where: { id: submission.id } });
  });

  it('limits Project Users to assigned or created Projects', async () => {
    const projectUser = await testUser('USR-000002');
    const assigned = await db.project.findUniqueOrThrow({
      where: { trackingId: 'PRJ-000001' },
      select: { id: true, leadUnitId: true, createdByUserId: true },
    });
    const other = await db.project.findUniqueOrThrow({
      where: { trackingId: 'PRJ-000003' },
      select: { id: true, leadUnitId: true, createdByUserId: true },
    });
    assert.equal(canEditProject(projectUser, assigned), true);
    assert.equal(canEditProject(projectUser, other), false);
  });

  it('limits Unit Administrators to explicitly administered Units', async () => {
    const unitAdmin = await testUser('USR-000003');
    const administered = await db.unit.findUniqueOrThrow({
      where: { trackingId: 'UNIT-000001' },
    });
    const other = await db.unit.findUniqueOrThrow({
      where: { trackingId: 'UNIT-000002' },
    });
    assert.equal(canAccessUnit(unitAdmin, administered.id), true);
    assert.equal(canAccessUnit(unitAdmin, other.id), false);
  });

  it('grants System Administrators global scope and denies disabled accounts', async () => {
    const systemAdmin = await testUser('USR-000004');
    const lastUnit = await db.unit.findFirstOrThrow({
      orderBy: { id: 'desc' },
    });
    assert.equal(canAccessUnit(systemAdmin, lastUnit.id), true);
    const disabled = { ...systemAdmin, status: 'DISABLED' as const };
    assert.equal(hasPermission(disabled, 'platform:admin'), false);
    assert.throws(
      () => requirePermission(disabled, 'portal:read'),
      /not active/,
    );
  });
});
