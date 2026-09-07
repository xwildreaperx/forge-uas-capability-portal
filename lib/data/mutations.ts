import { db } from '../db.ts';
import { findRelatedProblems } from '../domain/matching.ts';
import { nextTrackingId } from '../domain/tracking.ts';
import { completionValue, integerIds, requiredString, validUrl } from '../domain/validation.ts';

export async function detectRelatedProblems(input: { title: string; category?: string; tags?: string[] }) {
  const problems = await db.problem.findMany({ include: { tags: { include: { tag: true } } } });
  return findRelatedProblems(input, problems.map(p => ({ id: p.trackingId, title: p.title, category: p.category, tags: p.tags.map(x => x.tag.name) })));
}

export async function createProblem(input: Record<string, unknown>) {
  const title = requiredString(input.title, 'Title');
  const description = requiredString(input.description, 'Description');
  return db.$transaction(async tx => {
    const trackingId = await nextTrackingId(tx, 'Problem');
    return tx.problem.create({ data: { trackingId, title, shortDescription: description, detailedDescription: typeof input.detailedDescription === 'string' ? input.detailedDescription : description, problemStatement: typeof input.problemStatement === 'string' ? input.problemStatement : description, category: typeof input.category === 'string' ? input.category : 'Uncategorized', priority: typeof input.priority === 'string' ? input.priority : 'Medium', status: 'Open', dateIdentified: new Date() } });
  });
}

export async function updateProblem(id: string, input: Record<string, unknown>) {
  return db.problem.update({ where: { trackingId: id }, data: { title: input.title ? requiredString(input.title, 'Title') : undefined, shortDescription: input.description ? requiredString(input.description, 'Description') : undefined, priority: typeof input.priority === 'string' ? input.priority : undefined, status: typeof input.status === 'string' ? input.status : undefined } });
}

export async function createProject(input: Record<string, unknown>) {
  const name = requiredString(input.name, 'Name');
  const problemIds = integerIds(input.problemIds, 'Problem IDs');
  const unitIds = integerIds(input.unitIds, 'Unit IDs');
  const leadUnitId = Number(input.leadUnitId);
  if (!unitIds.includes(leadUnitId)) throw new Error('Lead Unit must also be a participating Unit.');
  return db.$transaction(async tx => {
    const trackingId = await nextTrackingId(tx, 'Project');
    return tx.project.create({ data: { trackingId, name, executiveSummary: requiredString(input.executiveSummary, 'Executive summary'), detailedDescription: requiredString(input.detailedDescription, 'Detailed description'), solutionApproach: requiredString(input.solutionApproach, 'Solution approach'), status: typeof input.status === 'string' ? input.status : 'Planning', maturity: typeof input.maturity === 'string' ? input.maturity : 'Concept', completion: completionValue(input.completion ?? 0), startDate: new Date(), leadUnitId, problemLinks: { create: problemIds.map((problemId, index) => ({ problemId, isPrimary: index === 0 })) }, unitLinks: { create: unitIds.map(unitId => ({ unitId, role: unitId === leadUnitId ? 'Lead' : 'Supporting' })) } } });
  });
}

export async function updateProject(id: string, input: Record<string, unknown>) {
  return db.project.update({ where: { trackingId: id }, data: { name: input.name ? requiredString(input.name, 'Name') : undefined, completion: input.completion === undefined ? undefined : completionValue(input.completion), status: typeof input.status === 'string' ? input.status : undefined, maturity: typeof input.maturity === 'string' ? input.maturity : undefined } });
}

export async function addProjectPhase(projectId: number, input: Record<string, unknown>) {
  return db.projectPhase.create({ data: { projectId, phaseName: requiredString(input.phaseName, 'Phase name'), objective: requiredString(input.objective, 'Objective'), status: typeof input.status === 'string' ? input.status : 'Planned', completion: completionValue(input.completion ?? 0), executiveSummary: requiredString(input.executiveSummary, 'Executive summary'), technicalSummary: requiredString(input.technicalSummary, 'Technical summary'), sortOrder: Number(input.sortOrder ?? 1) } });
}

export async function addLesson(projectId: number, input: Record<string, unknown>) {
  return db.$transaction(async tx => tx.lessonLearned.create({ data: { trackingId: await nextTrackingId(tx, 'Lesson'), projectId, title: requiredString(input.title, 'Title'), finding: requiredString(input.finding, 'Finding'), recommendation: requiredString(input.recommendation, 'Recommendation'), date: new Date() } }));
}

export async function addRepository(projectId: number, input: Record<string, unknown>) {
  return db.repositoryLink.create({ data: { projectId, name: requiredString(input.name, 'Name'), url: validUrl(input.url), description: requiredString(input.description, 'Description') } });
}
