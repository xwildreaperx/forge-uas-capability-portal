import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { db } from '../lib/db.ts';
import { addLesson, addProjectPhase, addProjectUpdate, closeOutProject, createProject, manageProjectTeam, ProblemMatchReviewRequired, submitProblem, updateProject, updateProjectPhase, updateProjectRelationships } from '../lib/data/mutations.ts';
import { getPortalData } from '../lib/data/portal.ts';
import { canAccessUnit, canEditProject, hasPermission, type CurrentUserContext } from '../lib/auth/permissions.ts';
import { findProjectsForProblems, findRelatedProblems, isPotentiallySimilarProject } from '../lib/domain/matching.ts';
import { projectHandoffMarkdown } from '../lib/domain/handoff.ts';

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
    repositories: await db.repositoryLink.count(), updates: await db.projectUpdate.count(), activities: await db.activityEvent.count(), helpRequests: await db.helpRequest.count(),
    vendors: await db.vendorDetail.count(), tactics: await db.tacticDetail.count(), training: await db.trainingDetail.count(),
    locations: await db.location.count(), tags: await db.tag.count(),
  };
  assert.deepEqual(counts, { users: 1, unitMemberships: 0, projectMemberships: 0, units: 9, problems: 12, submissions: 0, projects: 0, problemProjects: 0, projectUnits: 0, problemUnits: 0, phases: 0, lessons: 0, repositories: 0, updates: 0, activities: 0, helpRequests: 0, vendors: 0, tactics: 0, training: 0, locations: 0, tags: 6 });

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
  const phase = await addProjectPhase(projectUser, project.id, { phaseName: 'Field test', objective: 'Verify the update workflow.', executiveSummary: 'Test phase.', technicalSummary: 'Test phase.' });
  const update = await addProjectUpdate(projectUser, project.id, {
    summary: 'Field test completed.', result: 'Primary objective was met under the test conditions.',
    nextStep: 'Evaluate the revised configuration.', blockerRisk: 'One integration issue remains.',
    phaseId: phase.id, status: 'Active', maturity: 'Field Tested', completion: 60,
    phaseStatus: 'In Progress', phaseCompletion: 50, updatePhaseResult: true, updatePhaseRisk: true, updatePhaseNextAction: true,
    maturityEvidenceEvent: 'Temporary representative field evaluation', maturityEvidenceDate: '2026-09-07', maturityEvidenceReference: 'External temporary test reference',
    saveAsLesson: true, lessonType: 'CONFIRMED_FINDING', lessonTitle: 'Temporary confirmed finding', lessonRecommendation: 'Retain the tested configuration.',
  });
  const updatedProject = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  assert.equal(update.authorId, projectUser.id);
  assert.equal(update.projectId, project.id);
  assert.equal(update.phaseId, phase.id);
  assert.equal(updatedProject.latestResult, 'Primary objective was met under the test conditions.');
  assert.equal(updatedProject.nextStep, 'Evaluate the revised configuration.');
  assert.equal(updatedProject.keyRisk, 'One integration issue remains.');
  assert.equal(updatedProject.status, 'Active');
  assert.equal(updatedProject.maturity, 'Field Tested');
  assert.equal(updatedProject.completion, 60);
  assert.ok(updatedProject.lastMeaningfulActivityAt && updatedProject.lastMeaningfulActivityAt >= update.occurredAt);
  assert.ok(updatedProject.lastMeaningfulActivityAt && updatedProject.lastMeaningfulActivityAt > project.lastMeaningfulActivityAt!);
  assert.ok(await db.activityEvent.findUnique({ where: { projectUpdateId: update.id } }));
  const progressedPhase = await db.projectPhase.findUniqueOrThrow({ where: { id: phase.id } });
  assert.equal(progressedPhase.status, 'In Progress');
  assert.equal(progressedPhase.completion, 50);
  assert.equal(progressedPhase.result, update.result);
  assert.equal(progressedPhase.blocker, update.blockerRisk);
  assert.equal((await db.projectUpdate.findUniqueOrThrow({ where: { id: update.id } })).maturityEvidenceEvent, 'Temporary representative field evaluation');
  const updateLesson = await db.lessonLearned.findFirstOrThrow({ where: { sourceUpdateId: update.id } });
  assert.equal(updateLesson.lessonType, 'CONFIRMED_FINDING');
  assert.equal(updateLesson.createdByUserId, projectUser.id);
  await updateProjectPhase(projectUser, project.id, phase.id, { status: 'Complete', completion: 100, result: 'Phase objective complete.', accomplishment: 'Evidence captured.', nextAction: 'Review maturity.' });
  assert.equal((await db.projectPhase.findUniqueOrThrow({ where: { id: phase.id } })).completedAt instanceof Date, true);
  await assert.rejects(
    addProjectUpdate(contributor, project.id, { summary: 'Unauthorized update.', result: 'No result.', nextStep: 'None.' }),
    /permission|assigned, created, or administered-Unit Projects/,
  );
  const withProjects = await getPortalData(projectUser);
  assert.equal(findProjectsForProblems(['PRB-000001'], withProjects.projects).length, 2);
  assert.equal(isPotentiallySimilarProject({ name: 'Temporary acceptance effort' }, { name: project.name }), true);
  const projectedUpdate = withProjects.projects.find((item) => item.id === project.trackingId)!;
  assert.equal(projectedUpdate.updates[0]?.authorName, projectUser.displayName);
  assert.match(projectHandoffMarkdown(projectedUpdate), /Field test completed/);
  assert.match(projectHandoffMarkdown(projectedUpdate), /One integration issue remains/);

  const secondUnit = await db.unit.findUniqueOrThrow({ where: { trackingId: 'UNIT-000002' } });
  const unitAdmin = { ...projectUser, role: 'UNIT_ADMIN' as const, administeredUnitIds: [firstUnit.id] };
  assert.equal(canAccessUnit(unitAdmin, firstUnit.id), true);
  assert.equal(canAccessUnit(unitAdmin, secondUnit.id), false);
  assert.equal(hasPermission({ ...systemAdmin, status: 'DISABLED' }, 'platform:admin'), false);

  const teamUserRecord = await db.user.create({ data: { trackingId: 'USR-000004', displayName: 'Temporary Project Team Member', identifier: 'temporary-team-member', role: 'PROJECT_USER', status: 'ACTIVE', primaryUnitId: secondUnit.id, unitMemberships: { create: { unitId: secondUnit.id, isPrimary: true } } } });
  const teamUser = context(teamUserRecord, [secondUnit.id]);
  await manageProjectTeam(projectUser, project.id, { operation: 'ADD_CONTRIBUTOR', userId: teamUser.id });
  let memberships = await db.projectMembership.findMany({ where: { projectId: project.id } });
  assert.equal(memberships.find((item) => item.userId === projectUser.id)?.role, 'PROJECT_LEAD');
  assert.equal(memberships.find((item) => item.userId === teamUser.id)?.role, 'CONTRIBUTOR');
  const assignedTeamUser = { ...teamUser, projectIds: [project.id] };
  assert.equal(canEditProject(assignedTeamUser, { id: project.id, leadUnitId: firstUnit.id, createdByUserId: projectUser.id }), true);
  const contributorUpdate = await addProjectUpdate(assignedTeamUser, project.id, { summary: 'Contributor recorded a durable update.', result: 'Team access was verified.', nextStep: 'Continue acceptance testing.' });
  await manageProjectTeam(projectUser, project.id, { operation: 'REMOVE_CONTRIBUTOR', userId: teamUser.id });
  await assert.rejects(
    addProjectUpdate(teamUser, project.id, { summary: 'Removed contributor update.', result: 'No result.', nextStep: 'None.' }),
    /permission|assigned, created, or administered-Unit Projects/,
  );
  await manageProjectTeam(projectUser, project.id, { operation: 'ADD_CONTRIBUTOR', userId: teamUser.id });
  await manageProjectTeam(projectUser, project.id, { operation: 'CHANGE_LEAD', userId: teamUser.id });
  memberships = await db.projectMembership.findMany({ where: { projectId: project.id } });
  assert.equal(memberships.find((item) => item.userId === projectUser.id)?.role, 'CONTRIBUTOR');
  assert.equal(memberships.find((item) => item.userId === teamUser.id)?.role, 'PROJECT_LEAD');
  assert.equal((await db.projectUpdate.findUniqueOrThrow({ where: { id: contributorUpdate.id } })).authorId, teamUser.id);
  await assert.rejects(
    manageProjectTeam(projectUser, project.id, { operation: 'REMOVE_CONTRIBUTOR', userId: teamUser.id }),
    /Only the current Project Lead/,
  );
  const unrelatedUnitAdmin = { ...unitAdmin, administeredUnitIds: [secondUnit.id] };
  await assert.rejects(
    manageProjectTeam(unrelatedUnitAdmin, project.id, { operation: 'CHANGE_LEAD', userId: projectUser.id }),
    /Only the current Project Lead/,
  );
  await db.user.update({ where: { id: teamUser.id }, data: { status: 'DISABLED' } });
  const inactiveProjection = (await getPortalData(systemAdmin)).projects.find((item) => item.id === project.trackingId)!;
  assert.equal(inactiveProjection.team.find((member) => member.userId === teamUser.id)?.status, 'DISABLED');
  await manageProjectTeam(unitAdmin, project.id, { operation: 'CHANGE_LEAD', userId: projectUser.id });

  const thirdUserRecord = await db.user.create({ data: { trackingId: 'USR-000005', displayName: 'Temporary System-Assigned Contributor', identifier: 'temporary-system-assigned', role: 'PROJECT_USER', status: 'ACTIVE', primaryUnitId: firstUnit.id } });
  await manageProjectTeam(systemAdmin, project.id, { operation: 'ADD_CONTRIBUTOR', userId: thirdUserRecord.id });
  const secondProblem = await db.problem.findUniqueOrThrow({ where: { trackingId: 'PRB-000002' } });
  await updateProjectRelationships(projectUser, project.id, {
    problemIds: [problem.id, secondProblem.id], primaryProblemId: secondProblem.id,
    unitIds: [firstUnit.id, secondUnit.id], leadUnitId: secondUnit.id,
    unitRoles: { [firstUnit.id]: 'Testing' },
  });
  const relationships = await db.project.findUniqueOrThrow({
    where: { id: project.id },
    include: { problemLinks: true, unitLinks: true, userMemberships: true },
  });
  assert.equal(relationships.problemLinks.length, 2);
  assert.equal(relationships.problemLinks.find((link) => link.problemId === secondProblem.id)?.isPrimary, true);
  assert.equal(relationships.unitLinks.find((link) => link.unitId === secondUnit.id)?.role, 'Lead');
  assert.equal(relationships.unitLinks.find((link) => link.unitId === firstUnit.id)?.role, 'Testing');
  assert.equal(relationships.userMemberships.find((member) => member.role === 'PROJECT_LEAD')?.userId, projectUser.id);
  await assert.rejects(
    updateProjectRelationships(projectUser, project.id, { problemIds: [], primaryProblemId: 0, unitIds: [secondUnit.id], leadUnitId: secondUnit.id }),
    /at least one|Primary Problem/,
  );
  await updateProjectRelationships(projectUser, project.id, {
    problemIds: [secondProblem.id], primaryProblemId: secondProblem.id,
    unitIds: [secondUnit.id], leadUnitId: secondUnit.id,
  });
  assert.equal(await db.problemProject.count({ where: { projectId: project.id } }), 1);
  const finalProjection = (await getPortalData(systemAdmin)).projects.find((item) => item.id === project.trackingId)!;
  assert.equal(finalProjection.createdByUserId, projectUser.id);
  assert.equal(finalProjection.team.find((member) => member.role === 'PROJECT_LEAD')?.userId, projectUser.id);
  const handoff = projectHandoffMarkdown(finalProjection);
  assert.match(handoff, /Current Project Team/);
  assert.match(handoff, /Temporary Acceptance Project User/);
  assert.match(handoff, /PRB-000002/);
  assert.match(handoff, new RegExp(secondUnit.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok((await getPortalData(systemAdmin)).activities.some((event) => /Lead Unit changed|Project Lead changed/.test(event.description)));
  for (const lessonType of ['WORKING_HYPOTHESIS', 'FAILED_APPROACH', 'RECOMMENDATION', 'UNRESOLVED_QUESTION'] as const)
    await addLesson(projectUser, project.id, { title: `Temporary ${lessonType}`, finding: `Finding for ${lessonType}.`, lessonType, phaseId: phase.id });
  assert.equal(await db.lessonLearned.count({ where: { projectId: project.id } }), 5);
  await assert.rejects(addLesson(contributor, project.id, { title: 'Unauthorized lesson', finding: 'No.', lessonType: 'FAILED_APPROACH' }), /permission|assigned, created, or administered-Unit Projects/);
  const problemStatusBeforeCloseout = (await db.problem.findUniqueOrThrow({ where: { id: secondProblem.id } })).status;
  await closeOutProject(projectUser, project.id, { status: 'Completed', outcomeDisposition: 'UNSUCCESSFUL', finalResult: 'The temporary approach did not achieve the intended result.', whatDidNotWork: 'The tested configuration was insufficient.', recommendedNextAction: 'Avoid repeating the recorded dead end.', completion: 100, documentationAvailability: 'METADATA_ONLY' });
  const closed = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  assert.equal(closed.status, 'Completed');
  assert.equal(closed.outcomeDisposition, 'UNSUCCESSFUL');
  assert.equal((await db.problem.findUniqueOrThrow({ where: { id: secondProblem.id } })).status, problemStatusBeforeCloseout);
  const closedProjection = (await getPortalData(systemAdmin)).projects.find((item) => item.id === project.trackingId)!;
  assert.match(projectHandoffMarkdown(closedProjection), /Final Disposition and Closeout/);
  assert.match(projectHandoffMarkdown(closedProjection), /Failed Approach/);
  assert.ok((await getPortalData(systemAdmin)).activities.some((event) => event.eventType === 'PROJECT_CLOSED_OUT'));
  await updateProject(projectUser, secondProject.trackingId, { status: 'Paused' });
  await updateProject(projectUser, secondProject.trackingId, { status: 'Active' });
  assert.ok((await db.activityEvent.findMany({ where: { projectId: secondProject.id } })).some((event) => event.eventType === 'PROJECT_PAUSED'));
  for (const [status, disposition] of [['Completed', 'SUCCESSFUL'], ['Completed', 'PARTIALLY_SUCCESSFUL'], ['Completed', 'INCONCLUSIVE'], ['Cancelled', 'CANCELLED'], ['Superseded', 'SUPERSEDED']] as const)
    await closeOutProject(projectUser, secondProject.id, { status, outcomeDisposition: disposition, finalResult: `Temporary ${disposition} closeout.`, successorProjectId: status === 'Superseded' ? project.id : undefined });
  const superseded = await db.project.findUniqueOrThrow({ where: { id: secondProject.id } });
  assert.equal(superseded.status, 'Superseded');
  assert.equal(superseded.successorProjectId, project.id);
});
