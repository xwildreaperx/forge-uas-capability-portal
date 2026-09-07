import { db } from '../db.ts';
import type { PortalData } from './types.ts';

const tones: Record<string, string> = { Concept: 'amber', Prototype: 'blue', 'Field Tested': 'green', Validated: 'purple' };

export async function getPortalData(): Promise<PortalData> {
  const [problems, projects, units, activities, helpRequests] = await Promise.all([
    db.problem.findMany({ orderBy: { trackingId: 'asc' }, include: { projectLinks: { select: { project: { select: { trackingId: true } } } }, unitLinks: true, tags: { select: { tag: { select: { name: true } } } } } }),
    db.project.findMany({ orderBy: { trackingId: 'asc' }, include: {
      leadUnit: { select: { trackingId: true, name: true } },
      problemLinks: { orderBy: { isPrimary: 'desc' }, select: { isPrimary: true, problem: { select: { trackingId: true, title: true } } } },
      unitLinks: { select: { role: true, unit: { select: { trackingId: true, name: true } } } },
      tags: { select: { tag: { select: { name: true } } } }, locations: { select: { location: { select: { name: true, region: true } } } },
      phases: { orderBy: { sortOrder: 'asc' } }, lessons: { orderBy: { date: 'desc' } }, repositories: true,
    } }),
    db.unit.findMany({ orderBy: { trackingId: 'asc' }, include: { location: true, capabilities: { select: { tag: { select: { name: true } } } }, projectLinks: { select: { project: { select: { trackingId: true } } } } } }),
    db.activityEvent.findMany({ orderBy: { timestamp: 'desc' }, take: 44 }),
    db.helpRequest.findMany({ where: { status: 'Open' }, orderBy: { createdAt: 'desc' }, include: { project: { select: { name: true, leadUnit: { select: { name: true } } } } } }),
  ]);

  return {
    problems: problems.map(p => ({ id: p.trackingId, title: p.title, description: p.shortDescription, category: p.category, priority: p.priority, status: p.status, projectIds: p.projectLinks.map(x => x.project.trackingId), unitCount: p.unitLinks.length, tags: p.tags.map(x => x.tag.name) })),
    projects: projects.map(p => ({ id: p.trackingId, name: p.name, unit: p.leadUnit.name, unitId: p.leadUnit.trackingId, maturity: p.maturity, progress: p.completion, status: p.status, tone: tones[p.maturity] ?? 'blue', solutionApproach: p.solutionApproach, keyAdvantage: p.keyAdvantage ?? '', keyLimitation: p.keyLimitation ?? '', latestResult: p.latestResult ?? '', problems: p.problemLinks.map(x => ({ id: x.problem.trackingId, title: x.problem.title, isPrimary: x.isPrimary })), units: p.unitLinks.map(x => ({ id: x.unit.trackingId, name: x.unit.name, role: x.role })), tags: p.tags.map(x => x.tag.name), locations: p.locations.map(x => `${x.location.name}, ${x.location.region}`), phases: p.phases.map(x => ({ id: x.id, name: x.phaseName, status: x.status, completion: x.completion, summary: x.technicalSummary, result: x.result ?? '' })), lessons: p.lessons.map(x => ({ id: x.trackingId, title: x.title, finding: x.finding, recommendation: x.recommendation })), repositories: p.repositories.map(x => ({ id: x.id, name: x.name, url: x.url, description: x.description })) })),
    units: units.map(u => ({ id: u.trackingId, name: u.name, abbreviation: u.abbreviation, type: u.unitType, location: u.location ? `${u.location.name}, ${u.location.region}` : 'Location unavailable', latitude: u.location?.latitude ?? 0, longitude: u.location?.longitude ?? 0, capabilities: u.capabilities.map(x => x.tag.name), projectIds: u.projectLinks.map(x => x.project.trackingId) })),
    activities: activities.map(a => ({ id: a.id, description: a.description, eventType: a.eventType, timestamp: a.timestamp.toISOString(), actor: a.actor ?? 'System' })),
    helpRequests: helpRequests.map(h => ({ id: h.id, title: h.title, description: h.description, projectName: h.project.name, unitName: h.project.leadUnit.name, createdAt: h.createdAt.toISOString() })),
  };
}
