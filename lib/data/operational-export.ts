import { db } from '../db.ts';
import { requirePermission, type CurrentUserContext } from '../auth/permissions.ts';

export async function operationalExport(user: CurrentUserContext | null) {
  requirePermission(user, 'platform:admin');
  const [units, problems, projects, users, lessons, helpRequests, tags, locations, submissions] = await Promise.all([
    db.unit.findMany({ include: { capabilities: true } }),
    db.problem.findMany({ include: { projectLinks: true, unitLinks: true, tags: true, outgoingRelationships: true } }),
    db.project.findMany({ include: { problemLinks: true, unitLinks: true, tags: true, repositories: true } }),
    db.user.findMany({ select: { trackingId: true, displayName: true, identifier: true, role: true, status: true, primaryUnitId: true, unitMemberships: true, projectMemberships: true, createdAt: true, updatedAt: true } }),
    db.lessonLearned.findMany({ include: { tags: true } }), db.helpRequest.findMany(),
    db.tag.findMany(), db.location.findMany(), db.problemSubmission.findMany({ include: { reviews: true } }),
  ]);
  return { label: 'UNCLASSIFIED INFORMATION ONLY — FORGE metadata export', exportedAt: new Date().toISOString(), scope: 'Metadata and relational records only; no external artifacts or controlled files are included.', units, problems, projects, users, lessons, helpRequests, tags, locations, submissions };
}
