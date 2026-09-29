import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const counts = {
  users: await db.user.count(), unitMemberships: await db.unitMembership.count(), projectMemberships: await db.projectMembership.count(),
  units: await db.unit.count(), problems: await db.problem.count(), submissions: await db.problemSubmission.count(), projects: await db.project.count(),
  problemProjects: await db.problemProject.count(), projectUnits: await db.projectUnit.count(), problemUnits: await db.problemUnit.count(),
  phases: await db.projectPhase.count(), lessons: await db.lessonLearned.count(), repositories: await db.repositoryLink.count(), updates: await db.projectUpdate.count(),
  activities: await db.activityEvent.count(), helpRequests: await db.helpRequest.count(), vendors: await db.vendorDetail.count(),
  tactics: await db.tacticDetail.count(), training: await db.trainingDetail.count(), locations: await db.location.count(), tags: await db.tag.count(),
  maturityEvidence: await db.projectUpdate.count({ where: { maturityEvidenceEvent: { not: null } } }),
  successorRelationships: await db.project.count({ where: { successorProjectId: { not: null } } }),
};
console.log(JSON.stringify({
  counts,
  units: await db.unit.findMany({ orderBy: { trackingId: 'asc' }, select: { trackingId: true, name: true, abbreviation: true, parentOrganization: true, locationId: true } }),
  problems: await db.problem.findMany({ orderBy: { trackingId: 'asc' }, select: { trackingId: true, title: true, category: true, priority: true, owner: true, problemStatement: true } }),
  counters: await db.trackingCounter.findMany({ orderBy: { entity: 'asc' } }),
}, null, 2));

await db.$disconnect();
