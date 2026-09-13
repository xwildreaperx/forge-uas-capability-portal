import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { db } from '../lib/db.ts';
import { createProject, ProblemMatchReviewRequired, submitProblem } from '../lib/data/mutations.ts';
import { getPortalData } from '../lib/data/portal.ts';
import { canAccessUnit, hasPermission, type CurrentUserContext } from '../lib/auth/permissions.ts';
import { findProjectsForProblems, findRelatedProblems, isPotentiallySimilarProject } from '../lib/domain/matching.ts';

after(() => db.$disconnect());

const context = (user: { id: number; trackingId: string; displayName: string; identifier: string; role: CurrentUserContext['role']; status: CurrentUserContext['status']; primaryUnitId: number | null }, unitIds: number[] = []): CurrentUserContext => ({
  ...user, unitIds, administeredUnitIds: [], projectIds: [],
});

test('clean operational initialization, discovery, and authorization remain valid', async () => {
  const counts = {
    users: await db.user.count(), unitMemberships: await db.unitMembership.count(), projectMemberships: await db.projectMembership.count(),
    units: await db.unit.count(), problems: await db.problem.count(), submissions: await db.problemSubmission.count(),
    projects: await db.project.count(), problemProjects: await db.problemProject.count(), projectUnits: await db.projectUnit.count(),
    problemUnits: await db.problemUnit.count(), phases: await db.projectPhase.count(), lessons: await db.lessonLearned.count(),
    repositories: await db.repositoryLink.count(), activities: await db.activityEvent.count(), helpRequests: await db.helpRequest.count(),
    vendors: await db.vendorDetail.count(), tactics: await db.tacticDetail.count(), training: await db.trainingDetail.count(),
    locations: await db.location.count(), tags: await db.tag.count(),
  };
  assert.deepEqual(counts, { users: 1, unitMemberships: 0, projectMemberships: 0, units: 9, problems: 12, submissions: 0, projects: 0, problemProjects: 0, projectUnits: 0, problemUnits: 0, phases: 0, lessons: 0, repositories: 0, activities: 0, helpRequests: 0, vendors: 0, tactics: 0, training: 0, locations: 0, tags: 6 });

  const data = await getPortalData(null);
  assert.equal(data.datasetMode, 'operational');
  assert.equal(data.projects.length, 0);
  assert.equal(data.units.every((unit) => !unit.hasLocation && unit.projectIds.length === 0), true);
  assert.equal(data.problems.every((problem) => problem.projectIds.length === 0 && problem.owner === 'Unassigned'), true);

  const searchProblems = (query: string) => data.problems.filter((item) => `${item.id} ${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  assert.deepEqual(searchProblems('GPS').map((item) => item.title), ['GPS Denied Navigation']);
  assert.equal(searchProblems('RF').length, 4);
  assert.equal(searchProblems('fixed wing').length, 2);
  assert.equal(searchProblems('rotary wing').length, 2);
  assert.equal(searchProblems('target identification').length, 4);
  assert.equal(searchProblems('terminal guidance').length, 2);
  assert.equal(searchProblems('PRB-000012')[0]?.title, 'RF Signature Reduction — Prevent Aircraft Identification');
  assert.equal(data.units.filter((item) => `${item.name} ${item.abbreviation}`.includes('10th SFG')).length, 1);

  const candidates = data.problems.map((item) => ({ dbId: item.dbId, id: item.id, title: item.title, description: item.description, category: item.category, status: item.status, tags: item.tags }));
  const related = findRelatedProblems({ title: 'GPS navigation reliability' }, candidates);
  assert.equal(related[0]?.id, 'PRB-000001');
  assert.equal(findRelatedProblems({ title: 'GPS Denied Navigation' }, candidates)[0]?.classification, 'POSSIBLE_DUPLICATE');
  assert.equal(findRelatedProblems({ title: 'PRB-000012' }, candidates)[0]?.id, 'PRB-000012');
  assert.equal(findRelatedProblems({ title: 'gps DOESN’T work' }, candidates)[0]?.id, 'PRB-000001');
  assert.equal(findRelatedProblems({ title: 'fixed-wing control-link range' }, candidates)[0]?.id, 'PRB-000004');
  assert.equal(findRelatedProblems({ title: 'Range concern', description: "The fixed wing control link doesn't go far enough." }, candidates)[0]?.id, 'PRB-000004');
  assert.equal(findRelatedProblems({ title: 'unrelated catering request' }, candidates).length, 0);
  const realistic: [string, string][] = [
    ['short drone radio range', 'PRB-000003'],
    ["fixed wing control link doesn't go far enough", 'PRB-000004'],
    ['rotary wing RF range', 'PRB-000003'],
    ["GPS doesn't work", 'PRB-000001'],
    ['navigation without GPS', 'PRB-000001'],
    ['airborne target identification', 'PRB-000005'],
    ['air to ground identification', 'PRB-000005'],
    ['reduce ground station RF signature', 'PRB-000011'],
    ['drone RF detection', 'PRB-000012'],
    ['terminal guidance fixed wing', 'PRB-000010'],
  ];
  for (const [query, expected] of realistic)
    assert.equal(findRelatedProblems({ title: query }, candidates)[0]?.id, expected, query);
  const directional = findRelatedProblems({ title: 'air to ground identification' }, candidates);
  assert.ok(directional.findIndex((item) => item.id === 'PRB-000005') < directional.findIndex((item) => item.id === 'PRB-000007'));
  assert.ok(directional[0].reasons.includes('Air-to-Ground'));
  assert.equal(findRelatedProblems({ title: 'airborne target identification' }, candidates).filter((item) => item.id >= 'PRB-000005' && item.id <= 'PRB-000008').every((item) => item.classification === 'RELATED_PROBLEM'), true);
  assert.equal(new Set(data.problems.map((item) => item.id)).size, 12);
  assert.equal(new Set(data.units.map((item) => item.id)).size, 9);
  const counters = Object.fromEntries((await db.trackingCounter.findMany()).map((item) => [item.entity, item.value]));
  assert.deepEqual({ Problem: counters.Problem, Project: counters.Project, Unit: counters.Unit, Lesson: counters.Lesson }, { Problem: 12, Project: 0, Unit: 9, Lesson: 0 });

  const bootstrap = await db.user.findFirstOrThrow();
  const systemAdmin = context(bootstrap);
  assert.equal(hasPermission(systemAdmin, 'platform:admin'), true);
  const firstUnit = await db.unit.findUniqueOrThrow({ where: { trackingId: 'UNIT-000001' } });
  const contributorRecord = await db.user.create({ data: { trackingId: 'USR-000002', displayName: 'Temporary Acceptance Contributor', identifier: 'temporary-contributor', role: 'CONTRIBUTOR', status: 'ACTIVE', primaryUnitId: firstUnit.id, unitMemberships: { create: { unitId: firstUnit.id, isPrimary: true } } } });
  const contributor = context(contributorRecord, [firstUnit.id]);
  await assert.rejects(
    submitProblem(contributor, { title: 'GPS Denied Navigation', description: 'Temporary acceptance record.' }),
    ProblemMatchReviewRequired,
  );
  const gps = await db.problem.findUniqueOrThrow({ where: { trackingId: 'PRB-000001' } });
  const covered = await submitProblem(contributor, { title: 'GPS does not work', description: 'Temporary acceptance record.', coveredProblemId: gps.id });
  assert.equal(covered.relatedProblemId, gps.id);
  assert.equal(await db.problem.count(), 12);
  const submission = await submitProblem(contributor, { title: 'Temporary independent concern', description: 'Temporary acceptance record.', duplicateReviewed: true });
  assert.match(submission.trackingId, /^SUB-/);
  assert.equal(hasPermission(contributor, 'project:create'), false);

  const projectUserRecord = await db.user.create({ data: { trackingId: 'USR-000003', displayName: 'Temporary Acceptance Project User', identifier: 'temporary-project-user', role: 'PROJECT_USER', status: 'ACTIVE', primaryUnitId: firstUnit.id, unitMemberships: { create: { unitId: firstUnit.id, isPrimary: true } } } });
  const projectUser = context(projectUserRecord, [firstUnit.id]);
  const problem = await db.problem.findUniqueOrThrow({ where: { trackingId: 'PRB-000001' } });
  const project = await createProject(projectUser, { name: 'Temporary Acceptance Solution Effort', executiveSummary: 'Temporary acceptance test.', detailedDescription: 'Temporary acceptance test.', solutionApproach: 'Temporary acceptance test.', leadUnitId: firstUnit.id, unitIds: [firstUnit.id], problemIds: [problem.id] });
  assert.equal(project.trackingId, 'PRJ-000001');
  const secondProject = await createProject(projectUser, { name: 'Temporary Acceptance Parallel Effort', executiveSummary: 'Parallel work remains permitted.', detailedDescription: 'Temporary acceptance test.', solutionApproach: 'Temporary acceptance test.', leadUnitId: firstUnit.id, unitIds: [firstUnit.id], problemIds: [problem.id] });
  assert.equal(secondProject.trackingId, 'PRJ-000002');
  const withProjects = await getPortalData(projectUser);
  assert.equal(findProjectsForProblems(['PRB-000001'], withProjects.projects).length, 2);
  assert.equal(isPotentiallySimilarProject({ name: 'Temporary acceptance effort' }, { name: project.name }), true);

  const secondUnit = await db.unit.findUniqueOrThrow({ where: { trackingId: 'UNIT-000002' } });
  const unitAdmin = { ...projectUser, role: 'UNIT_ADMIN' as const, administeredUnitIds: [firstUnit.id] };
  assert.equal(canAccessUnit(unitAdmin, firstUnit.id), true);
  assert.equal(canAccessUnit(unitAdmin, secondUnit.id), false);
  assert.equal(hasPermission({ ...systemAdmin, status: 'DISABLED' }, 'platform:admin'), false);
});
