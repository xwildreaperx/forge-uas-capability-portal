import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { db } from '../lib/db.ts';
import { createProblem, createProject } from '../lib/data/mutations.ts';
import { getPortalData } from '../lib/data/portal.ts';
import { findRelatedProblems } from '../lib/domain/matching.ts';
import { filterProjects } from '../lib/domain/search.ts';
import { formatTrackingId } from '../lib/domain/tracking.ts';

const createdProblemIds: number[] = [];
const createdProjectIds: number[] = [];

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
    const problem = await createProblem({
      title: 'Test persistent capability gap',
      description: 'Created by automated persistence verification.',
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
    const project = await createProject({
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
      const project = await createProject({
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
