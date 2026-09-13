import { db } from '../db.ts';
import { findRelatedProblems } from '../domain/matching.ts';
import { nextTrackingId } from '../domain/tracking.ts';
import {
  completionValue,
  integerIds,
  requiredString,
  validUrl,
} from '../domain/validation.ts';
import { solutionType } from '../domain/solution-types.ts';
import {
  DOCUMENTATION_LABELS,
  type DocumentationValue,
} from '../domain/documentation.ts';
import type { CurrentUserContext } from '../auth/permissions.ts';
import {
  assertProjectEdit,
  canAccessUnit,
  requirePermission,
} from '../auth/permissions.ts';

const optional = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const optionalNumber = (value: unknown) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const detail = (input: Record<string, unknown>, key: string) =>
  input[key] && typeof input[key] === 'object'
    ? (input[key] as Record<string, unknown>)
    : {};
const optionalDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return new Date();
  const date = new Date(`${value.trim()}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Date must be valid.');
  return date;
};
const documentationValue = (value: unknown): DocumentationValue =>
  typeof value === 'string' && value in DOCUMENTATION_LABELS
    ? (value as DocumentationValue)
    : 'AVAILABLE_IN_FORGE';

export async function detectRelatedProblems(input: {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
}) {
  const problems = await db.problem.findMany({
    include: { tags: { include: { tag: true } } },
  });
  return findRelatedProblems(
    input,
    problems.map((p) => ({
      dbId: p.id,
      id: p.trackingId,
      title: p.title,
      description: p.shortDescription,
      category: p.category,
      status: p.status,
      tags: p.tags.map((x) => x.tag.name),
    })),
  );
}

export class ProblemMatchReviewRequired extends Error {
  matches: Awaited<ReturnType<typeof detectRelatedProblems>>;
  constructor(matches: Awaited<ReturnType<typeof detectRelatedProblems>>) {
    super('Review the possible existing Problem before continuing.');
    this.matches = matches;
  }
}

export async function createProblem(
  user: CurrentUserContext | null,
  input: Record<string, unknown>,
) {
  requirePermission(user, 'submission:review');
  const title = requiredString(input.title, 'Title');
  const description = requiredString(input.description, 'Description');
  return db.$transaction(async (tx) => {
    const trackingId = await nextTrackingId(tx, 'Problem');
    return tx.problem.create({
      data: {
        trackingId,
        title,
        shortDescription: description,
        detailedDescription:
          typeof input.detailedDescription === 'string'
            ? input.detailedDescription
            : description,
        problemStatement:
          typeof input.problemStatement === 'string'
            ? input.problemStatement
            : description,
        category:
          typeof input.category === 'string' ? input.category : 'Uncategorized',
        priority:
          typeof input.priority === 'string' ? input.priority : 'Medium',
        status: 'Open',
        dateIdentified: new Date(),
      },
    });
  });
}

export async function updateProblem(
  user: CurrentUserContext | null,
  id: string,
  input: Record<string, unknown>,
) {
  requirePermission(user, 'submission:review');
  return db.problem.update({
    where: { trackingId: id },
    data: {
      title: input.title ? requiredString(input.title, 'Title') : undefined,
      shortDescription: input.description
        ? requiredString(input.description, 'Description')
        : undefined,
      priority: typeof input.priority === 'string' ? input.priority : undefined,
      status: typeof input.status === 'string' ? input.status : undefined,
    },
  });
}

export async function createProject(
  user: CurrentUserContext | null,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'project:create');
  const name = requiredString(input.name, 'Name');
  const problemIds = integerIds(input.problemIds, 'Problem IDs');
  const unitIds = integerIds(input.unitIds, 'Unit IDs');
  const leadUnitId = Number(input.leadUnitId);
  if (!unitIds.includes(leadUnitId))
    throw new Error('Lead Unit must also be a participating Unit.');
  return db.$transaction(async (tx) => {
    const trackingId = await nextTrackingId(tx, 'Project');
    const tagNames = Array.isArray(input.tags)
      ? input.tags.filter((x): x is string => typeof x === 'string')
      : [];
    const locationNames = Array.isArray(input.locations)
      ? input.locations
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.split(',')[0])
      : [];
    const [tags, locations] = await Promise.all([
      tx.tag.findMany({
        where: { name: { in: tagNames } },
        select: { id: true },
      }),
      tx.location.findMany({
        where: { name: { in: locationNames } },
        select: { id: true },
      }),
    ]);
    const type = solutionType(input.solutionType);
    const vendor = detail(input, 'vendor');
    const tactic = detail(input, 'tactic');
    const training = detail(input, 'training');
    const createdAt = new Date();
    const project = await tx.project.create({
      data: {
        trackingId,
        name,
        solutionType: type,
        executiveSummary: requiredString(
          input.executiveSummary,
          'Executive summary',
        ),
        detailedDescription: requiredString(
          input.detailedDescription,
          'Detailed description',
        ),
        solutionApproach: requiredString(
          input.solutionApproach,
          'Solution approach',
        ),
        documentationAvailability: documentationValue(
          input.documentationAvailability,
        ),
        executiveSummaryPlainLanguage: optional(
          input.executiveSummaryPlainLanguage,
        ),
        problemPlainLanguage: optional(input.problemPlainLanguage),
        solutionPlainLanguage: optional(input.solutionPlainLanguage),
        impactPlainLanguage: optional(input.impactPlainLanguage),
        aiContextNotes: optional(input.aiContextNotes),
        scope: optional(input.scope),
        nextStep: optional(input.nextStep),
        keyRisk: optional(input.keyRisk),
        leadershipAction: optional(input.leadershipAction),
        originatorContact: optional(input.originatorContact),
        accessInstructions: optional(input.accessInstructions),
        status: typeof input.status === 'string' ? input.status : 'Planning',
        maturity:
          typeof input.maturity === 'string' ? input.maturity : 'Concept',
        completion: completionValue(input.completion ?? 0),
        startDate: createdAt,
        lastMeaningfulActivityAt: createdAt,
        leadUnitId,
        createdByUserId: actor.id,
        userMemberships: { create: { userId: actor.id, role: 'PROJECT_LEAD' } },
        problemLinks: {
          create: problemIds.map((problemId, index) => ({
            problemId,
            isPrimary: index === 0,
          })),
        },
        unitLinks: {
          create: unitIds.map((unitId) => ({
            unitId,
            role: unitId === leadUnitId ? 'Lead' : 'Supporting',
          })),
        },
        tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
        locations: {
          create: locations.map((location) => ({ locationId: location.id })),
        },
        vendorDetail:
          type === 'VENDOR_SOLUTION' || type === 'HYBRID'
            ? {
                create: {
                  vendorName: requiredString(vendor.vendorName, 'Vendor name'),
                  productName: requiredString(
                    vendor.productName,
                    'Product name',
                  ),
                  productUrl: optional(vendor.productUrl),
                  commercialAvailability: optional(
                    vendor.commercialAvailability,
                  ),
                  estimatedUnitCost: optionalNumber(vendor.estimatedUnitCost),
                  estimatedTotalCost: optionalNumber(vendor.estimatedTotalCost),
                  procurementStatus: optional(vendor.procurementStatus),
                  evaluationStatus: optional(vendor.evaluationStatus),
                  quantityEvaluated: optionalNumber(vendor.quantityEvaluated),
                  evaluationObjective: optional(vendor.evaluationObjective),
                  integrationRequirements: optional(
                    vendor.integrationRequirements,
                  ),
                  sustainmentNotes: optional(vendor.sustainmentNotes),
                  evaluationResult: optional(vendor.evaluationResult),
                  recommendation: optional(vendor.recommendation),
                },
              }
            : undefined,
        tacticDetail:
          type === 'TACTIC_TECHNIQUE' || type === 'HYBRID'
            ? {
                create: {
                  techniqueTitle: requiredString(
                    tactic.techniqueTitle,
                    'Technique title',
                  ),
                  techniqueDescription: requiredString(
                    tactic.techniqueDescription,
                    'Technique description',
                  ),
                  conditionsForUse: optional(tactic.conditionsForUse),
                  preconditions: optional(tactic.preconditions),
                  requiredEquipment: optional(tactic.requiredEquipment),
                  requiredTraining: optional(tactic.requiredTraining),
                  demonstratedEffect: optional(tactic.demonstratedEffect),
                  limitations: optional(tactic.limitations),
                  validationEvent: optional(tactic.validationEvent),
                  applicableEnvironments: optional(
                    tactic.applicableEnvironments,
                  ),
                  recommendation: optional(tactic.recommendation),
                },
              }
            : undefined,
        trainingDetail:
          type === 'TRAINING' || type === 'HYBRID'
            ? {
                create: {
                  trainingObjective: requiredString(
                    training.trainingObjective,
                    'Training objective',
                  ),
                  intendedAudience: requiredString(
                    training.intendedAudience,
                    'Intended audience',
                  ),
                  prerequisites: optional(training.prerequisites),
                  trainingMethod: optional(training.trainingMethod),
                  trainingMaterials: optional(training.trainingMaterials),
                  validationMethod: optional(training.validationMethod),
                  observedEffect: optional(training.observedEffect),
                  recurringFrequency: optional(training.recurringFrequency),
                },
              }
            : undefined,
      },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: createdAt,
        eventType: 'PROJECT_CREATED',
        description: `Created ${project.trackingId} — ${project.name}.`,
        actor: actor.displayName,
        projectId: project.id,
        unitId: leadUnitId,
        userId: actor.id,
      },
    });
    return project;
  });
}

export async function addProjectUpdate(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      id: true,
      trackingId: true,
      leadUnitId: true,
      createdByUserId: true,
      lastMeaningfulActivityAt: true,
    },
  });
  const actor = assertProjectEdit(user, project);
  const occurredAt = optionalDate(input.occurredAt);
  const phaseId = input.phaseId ? Number(input.phaseId) : null;
  if (phaseId) {
    const phase = await db.projectPhase.findFirst({
      where: { id: phaseId, projectId },
      select: { id: true },
    });
    if (!phase) throw new Error('Associated Phase must belong to this Project.');
  }
  const summary = requiredString(input.summary, 'Update summary');
  const result = requiredString(input.result, 'Result / finding');
  const nextStep = requiredString(input.nextStep, 'Next step');
  const blockerRisk = optional(input.blockerRisk);
  const statusAfter = optional(input.status);
  const maturityAfter = optional(input.maturity);
  const completionAfter =
    input.completion === undefined || input.completion === ''
      ? null
      : completionValue(input.completion);
  const lastMeaningfulActivityAt =
    project.lastMeaningfulActivityAt &&
    project.lastMeaningfulActivityAt > occurredAt
      ? project.lastMeaningfulActivityAt
      : occurredAt;

  return db.$transaction(async (tx) => {
    const update = await tx.projectUpdate.create({
      data: {
        projectId,
        authorId: actor.id,
        phaseId,
        occurredAt,
        summary,
        result,
        nextStep,
        blockerRisk,
        statusAfter,
        maturityAfter,
        completionAfter,
      },
    });
    await tx.project.update({
      where: { id: projectId },
      data: {
        status: statusAfter ?? undefined,
        maturity: maturityAfter ?? undefined,
        completion: completionAfter ?? undefined,
        latestResult: result,
        nextStep,
        keyRisk: blockerRisk ?? undefined,
        lastMeaningfulActivityAt,
      },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'PROJECT_UPDATE',
        description: `${project.trackingId} update: ${summary}`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
        projectUpdateId: update.id,
      },
    });
    return update;
  });
}

export async function updateProject(
  user: CurrentUserContext | null,
  id: string,
  input: Record<string, unknown>,
) {
  const project = await db.project.findUniqueOrThrow({
    where: { trackingId: id },
    select: { id: true, leadUnitId: true, createdByUserId: true },
  });
  assertProjectEdit(user, project);
  return db.project.update({
    where: { trackingId: id },
    data: {
      name: input.name ? requiredString(input.name, 'Name') : undefined,
      solutionType: input.solutionType
        ? solutionType(input.solutionType)
        : undefined,
      executiveSummary: input.executiveSummary
        ? requiredString(input.executiveSummary, 'Executive summary')
        : undefined,
      detailedDescription: input.detailedDescription
        ? requiredString(input.detailedDescription, 'Detailed description')
        : undefined,
      solutionApproach: input.solutionApproach
        ? requiredString(input.solutionApproach, 'Solution approach')
        : undefined,
      completion:
        input.completion === undefined
          ? undefined
          : completionValue(input.completion),
      status: typeof input.status === 'string' ? input.status : undefined,
      maturity: typeof input.maturity === 'string' ? input.maturity : undefined,
      outcome: optional(input.outcome) ?? undefined,
      keyAdvantage: optional(input.keyAdvantage) ?? undefined,
      keyLimitation: optional(input.keyLimitation) ?? undefined,
      latestResult: optional(input.latestResult) ?? undefined,
      documentationAvailability: input.documentationAvailability
        ? documentationValue(input.documentationAvailability)
        : undefined,
      executiveSummaryPlainLanguage:
        optional(input.executiveSummaryPlainLanguage) ?? undefined,
      problemPlainLanguage: optional(input.problemPlainLanguage) ?? undefined,
      solutionPlainLanguage: optional(input.solutionPlainLanguage) ?? undefined,
      impactPlainLanguage: optional(input.impactPlainLanguage) ?? undefined,
      aiContextNotes: optional(input.aiContextNotes) ?? undefined,
      scope: optional(input.scope) ?? undefined,
      outOfScope: optional(input.outOfScope) ?? undefined,
      intendedUsers: optional(input.intendedUsers) ?? undefined,
      successCriteria: optional(input.successCriteria) ?? undefined,
      constraints: optional(input.constraints) ?? undefined,
      assumptions: optional(input.assumptions) ?? undefined,
      architectureSummary: optional(input.architectureSummary) ?? undefined,
      methodologySummary: optional(input.methodologySummary) ?? undefined,
      decisionsSummary: optional(input.decisionsSummary) ?? undefined,
      openIssues: optional(input.openIssues) ?? undefined,
      nextStep: optional(input.nextStep) ?? undefined,
      keyRisk: optional(input.keyRisk) ?? undefined,
      leadershipAction: optional(input.leadershipAction) ?? undefined,
      originatorContact: optional(input.originatorContact) ?? undefined,
      accessInstructions: optional(input.accessInstructions) ?? undefined,
    },
  });
}

async function projectForOperations(projectId: number) {
  return db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      leadUnit: true,
      problemLinks: { include: { problem: true } },
      unitLinks: { include: { unit: true } },
      userMemberships: { include: { user: true } },
    },
  });
}

function assertTeamManagement(
  user: CurrentUserContext | null,
  project: Awaited<ReturnType<typeof projectForOperations>>,
) {
  const actor = requirePermission(user, 'project:edit');
  const isLead = project.userMemberships.some(
    (membership) =>
      membership.userId === actor.id && membership.role === 'PROJECT_LEAD',
  );
  const isLeadUnitAdmin =
    actor.role === 'UNIT_ADMIN' &&
    actor.administeredUnitIds.includes(project.leadUnitId);
  if (actor.role !== 'SYSTEM_ADMIN' && !isLead && !isLeadUnitAdmin)
    throw new Error(
      'Only the current Project Lead, Lead Unit Administrator, or System Administrator may manage the Project team.',
    );
  return actor;
}

export async function manageProjectTeam(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await projectForOperations(projectId);
  const actor = assertTeamManagement(user, project);
  const operation = String(input.operation);
  if (!['ADD_CONTRIBUTOR', 'REMOVE_CONTRIBUTOR', 'CHANGE_LEAD'].includes(operation))
    throw new Error('Invalid Project team operation.');
  const userId = Number(input.userId);
  if (!Number.isInteger(userId) || userId < 1) throw new Error('A valid user is required.');
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const existing = project.userMemberships.find((item) => item.userId === userId);
  const currentLead = project.userMemberships.find(
    (item) => item.role === 'PROJECT_LEAD',
  );
  if (operation !== 'REMOVE_CONTRIBUTOR' && target.status !== 'ACTIVE')
    throw new Error('Disabled users cannot be assigned as active Project maintainers.');
  if (operation === 'REMOVE_CONTRIBUTOR' && existing?.role === 'PROJECT_LEAD')
    throw new Error('Assign a new Project Lead before removing the current Lead.');
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    let description: string;
    if (operation === 'ADD_CONTRIBUTOR') {
      if (existing) throw new Error('This user is already on the Project team.');
      await tx.projectMembership.create({
        data: { projectId, userId, role: 'CONTRIBUTOR' },
      });
      description = `${target.displayName} added as a Project Contributor.`;
    } else if (operation === 'REMOVE_CONTRIBUTOR') {
      if (!existing) throw new Error('This user is not on the Project team.');
      await tx.projectMembership.delete({ where: { userId_projectId: { userId, projectId } } });
      description = `${target.displayName} removed as a Project Contributor.`;
    } else {
      if (currentLead?.userId === userId)
        throw new Error('This user is already the Project Lead.');
      await tx.projectMembership.updateMany({
        where: { projectId, role: 'PROJECT_LEAD', userId: { not: userId } },
        data: { role: 'CONTRIBUTOR' },
      });
      await tx.projectMembership.upsert({
        where: { userId_projectId: { userId, projectId } },
        update: { role: 'PROJECT_LEAD' },
        create: { userId, projectId, role: 'PROJECT_LEAD' },
      });
      description = `Project Lead changed from ${currentLead?.user.displayName ?? 'Unassigned'} to ${target.displayName}.`;
    }
    await tx.project.update({
      where: { id: projectId },
      data: { lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: operation,
        description,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return tx.projectMembership.findMany({ where: { projectId } });
  });
}

export async function updateProjectRelationships(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await projectForOperations(projectId);
  const actor = assertProjectEdit(user, project);
  const problemIds = integerIds(input.problemIds, 'Problem IDs');
  const primaryProblemId = Number(input.primaryProblemId);
  if (!problemIds.includes(primaryProblemId))
    throw new Error('Primary Problem must remain linked to the Project.');
  const requestedUnitIds = integerIds(input.unitIds, 'Unit IDs');
  const leadUnitId = Number(input.leadUnitId);
  const unitIds = [...new Set([...requestedUnitIds, leadUnitId])];
  const [problems, units] = await Promise.all([
    db.problem.findMany({ where: { id: { in: problemIds } } }),
    db.unit.findMany({ where: { id: { in: unitIds } } }),
  ]);
  if (problems.length !== problemIds.length) throw new Error('One or more Problems are invalid.');
  if (units.length !== unitIds.length) throw new Error('One or more Units are invalid.');
  const roles =
    input.unitRoles && typeof input.unitRoles === 'object'
      ? (input.unitRoles as Record<string, unknown>)
      : {};
  const allowedRoles = new Set(['Supporting', 'Testing']);
  const occurredAt = new Date();
  const oldProblems = new Map(project.problemLinks.map((x) => [x.problemId, x]));
  const oldUnits = new Map(project.unitLinks.map((x) => [x.unitId, x]));
  const descriptions: string[] = [];
  for (const problem of problems) {
    if (!oldProblems.has(problem.id))
      descriptions.push(`${problem.trackingId} — ${problem.title} added to the Project.`);
    else if (problem.id === primaryProblemId && !oldProblems.get(problem.id)?.isPrimary)
      descriptions.push(`${problem.trackingId} — ${problem.title} set as the primary Problem.`);
  }
  for (const link of project.problemLinks) {
    if (!problemIds.includes(link.problemId))
      descriptions.push(`${link.problem.trackingId} — ${link.problem.title} removed from the Project.`);
  }
  for (const unit of units) {
    const role = unit.id === leadUnitId ? 'Lead' : allowedRoles.has(String(roles[unit.id])) ? String(roles[unit.id]) : 'Supporting';
    const previous = oldUnits.get(unit.id);
    if (!previous) descriptions.push(`${unit.name} added as a ${role} Unit.`);
    else if (previous.role !== role) descriptions.push(`${unit.name} role changed from ${previous.role} to ${role}.`);
  }
  for (const link of project.unitLinks) {
    if (!unitIds.includes(link.unitId)) descriptions.push(`${link.unit.name} removed from participating Units.`);
  }
  if (project.leadUnitId !== leadUnitId) {
    const nextLead = units.find((unit) => unit.id === leadUnitId)!;
    descriptions.push(`Lead Unit changed from ${project.leadUnit.name} to ${nextLead.name}.`);
  }
  if (!descriptions.length) throw new Error('No relationship changes were selected.');

  return db.$transaction(async (tx) => {
    await tx.problemProject.deleteMany({ where: { projectId, problemId: { notIn: problemIds } } });
    for (const problemId of problemIds) {
      await tx.problemProject.upsert({
        where: { problemId_projectId: { problemId, projectId } },
        update: { isPrimary: problemId === primaryProblemId },
        create: { problemId, projectId, isPrimary: problemId === primaryProblemId },
      });
    }
    await tx.projectUnit.deleteMany({ where: { projectId, unitId: { notIn: unitIds } } });
    for (const unitId of unitIds) {
      const role = unitId === leadUnitId ? 'Lead' : allowedRoles.has(String(roles[unitId])) ? String(roles[unitId]) : 'Supporting';
      await tx.projectUnit.upsert({
        where: { projectId_unitId: { projectId, unitId } },
        update: { role },
        create: { projectId, unitId, role },
      });
    }
    await tx.project.update({ where: { id: projectId }, data: { leadUnitId, lastMeaningfulActivityAt: occurredAt } });
    await tx.activityEvent.createMany({
      data: descriptions.map((description) => ({
        timestamp: occurredAt, eventType: 'PROJECT_RELATIONSHIP_CHANGED', description,
        actor: actor.displayName, projectId, unitId: leadUnitId, userId: actor.id,
      })),
    });
    return tx.project.findUniqueOrThrow({ where: { id: projectId } });
  });
}

export async function resolveProjectId(trackingId: string) {
  const project = await db.project.findUnique({
    where: { trackingId },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found.');
  return project.id;
}

export async function addProjectPhase(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, leadUnitId: true, createdByUserId: true },
  });
  const actor = assertProjectEdit(user, project);
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const phase = await tx.projectPhase.create({ data: {
      projectId,
      phaseName: requiredString(input.phaseName, 'Phase name'),
      objective: requiredString(input.objective, 'Objective'),
      status: typeof input.status === 'string' ? input.status : 'Planned',
      completion: completionValue(input.completion ?? 0),
      executiveSummary: requiredString(
        input.executiveSummary,
        'Executive summary',
      ),
      technicalSummary: requiredString(
        input.technicalSummary,
        'Technical summary',
      ),
      sortOrder: Number(input.sortOrder ?? 1),
      createdByUserId: actor.id,
    } });
    await tx.project.update({ where: { id: projectId }, data: { lastMeaningfulActivityAt: occurredAt } });
    await tx.activityEvent.create({ data: {
      timestamp: occurredAt, eventType: 'PHASE_CREATED',
      description: `Added Project phase: ${phase.phaseName}.`, actor: actor.displayName,
      projectId, unitId: project.leadUnitId, userId: actor.id,
    } });
    return phase;
  });
}

export async function addLesson(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, leadUnitId: true, createdByUserId: true },
  });
  const actor = assertProjectEdit(user, project);
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const lesson = await tx.lessonLearned.create({
      data: {
        trackingId: await nextTrackingId(tx, 'Lesson'),
        projectId,
        title: requiredString(input.title, 'Title'),
        finding: requiredString(input.finding, 'Finding'),
        recommendation: requiredString(input.recommendation, 'Recommendation'),
        date: new Date(),
        createdByUserId: actor.id,
      },
    });
    await tx.project.update({ where: { id: projectId }, data: { lastMeaningfulActivityAt: occurredAt } });
    await tx.activityEvent.create({ data: {
      timestamp: occurredAt, eventType: 'LESSON_ADDED',
      description: `Added Lesson Learned: ${lesson.title}.`, actor: actor.displayName,
      projectId, unitId: project.leadUnitId, userId: actor.id,
    } });
    return lesson;
  });
}

export async function addRepository(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, leadUnitId: true, createdByUserId: true },
  });
  const actor = assertProjectEdit(user, project);
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const repository = await tx.repositoryLink.create({ data: {
      projectId,
      name: requiredString(input.name, 'Name'),
      url: validUrl(input.url),
      description: requiredString(input.description, 'Description'),
      artifactType: optional(input.artifactType),
      documentationAvailability: documentationValue(
        input.documentationAvailability || 'EXTERNAL_REFERENCE',
      ),
      includeInAiHandoff:
        input.includeInAiHandoff === false ||
        input.includeInAiHandoff === 'false'
          ? false
          : true,
      createdByUserId: actor.id,
    } });
    await tx.project.update({ where: { id: projectId }, data: { lastMeaningfulActivityAt: occurredAt } });
    await tx.activityEvent.create({ data: {
      timestamp: occurredAt, eventType: 'ARTIFACT_ADDED',
      description: `Added artifact reference: ${repository.name}.`, actor: actor.displayName,
      projectId, unitId: project.leadUnitId, userId: actor.id,
    } });
    return repository;
  });
}

export async function submitProblem(
  user: CurrentUserContext | null,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'problem:submit');
  const title = requiredString(input.title, 'Title');
  const description = requiredString(input.description, 'Description');
  const matches = await detectRelatedProblems({ title, description });
  const strongMatches = matches.filter(
    (match) => match.classification === 'POSSIBLE_DUPLICATE',
  );
  const relatedProblemId = input.coveredProblemId
    ? Number(input.coveredProblemId)
    : null;
  if (relatedProblemId) {
    await db.problem.findUniqueOrThrow({ where: { id: relatedProblemId } });
  } else if (strongMatches.length && input.duplicateReviewed !== true) {
    throw new ProblemMatchReviewRequired(strongMatches);
  }
  const requestedUnitId = Number(input.unitId || actor.primaryUnitId);
  const unitId =
    Number.isInteger(requestedUnitId) && actor.unitIds.includes(requestedUnitId)
      ? requestedUnitId
      : actor.primaryUnitId;
  return db.$transaction(async (tx) =>
    tx.problemSubmission.create({
      data: {
        trackingId: await nextTrackingId(tx, 'Submission'),
        title,
        description,
        category:
          typeof input.category === 'string' ? input.category : 'Uncategorized',
        operationalImpact: optional(input.operationalImpact),
        supportingContext: optional(input.supportingContext),
        originatorContact: optional(input.originatorContact),
        relatedProblemId,
        submitterId: actor.id,
        unitId,
      },
    }),
  );
}

export async function reviewProblemSubmission(
  user: CurrentUserContext | null,
  trackingId: string,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'submission:review');
  const submission = await db.problemSubmission.findUniqueOrThrow({
    where: { trackingId },
  });
  if (
    actor.role !== 'SYSTEM_ADMIN' &&
    (!submission.unitId || !canAccessUnit(actor, submission.unitId))
  )
    throw new Error('You may review submissions only for administered Units.');
  const status = String(input.status);
  if (
    !['UNDER_REVIEW', 'ACCEPTED', 'DUPLICATE_LINKED', 'REJECTED'].includes(
      status,
    )
  )
    throw new Error('Invalid review status.');
  const relatedProblemId = input.relatedProblemId
    ? Number(input.relatedProblemId)
    : null;
  if (
    (status === 'ACCEPTED' || status === 'DUPLICATE_LINKED') &&
    !relatedProblemId
  )
    throw new Error(
      'Accepted or duplicate submissions must link to a canonical Problem.',
    );
  return db.problemSubmission.update({
    where: { trackingId },
    data: {
      status: status as never,
      relatedProblemId,
      reviewerId: actor.id,
      reviewNote: optional(input.reviewNote),
      reviewedAt: new Date(),
    },
  });
}

export async function updateUserAccount(
  user: CurrentUserContext | null,
  targetId: number,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'user:manage');
  const target = await db.user.findUniqueOrThrow({
    where: { id: targetId },
    include: { unitMemberships: true },
  });
  if (
    actor.role !== 'SYSTEM_ADMIN' &&
    !target.unitMemberships.some((membership) =>
      canAccessUnit(actor, membership.unitId),
    )
  )
    throw new Error('You may manage users only within administered Units.');
  const requestedRole =
    typeof input.role === 'string' ? input.role : target.role;
  if (
    actor.role !== 'SYSTEM_ADMIN' &&
    (requestedRole === 'SYSTEM_ADMIN' || requestedRole === 'UNIT_ADMIN')
  )
    throw new Error(
      'Only a System Administrator may grant administrator roles.',
    );
  return db.user.update({
    where: { id: targetId },
    data: {
      displayName: input.displayName
        ? requiredString(input.displayName, 'Display name')
        : undefined,
      title: optional(input.title) ?? undefined,
      role: requestedRole as never,
      status:
        typeof input.status === 'string' ? (input.status as never) : undefined,
      lastActivityAt: new Date(),
    },
  });
}

export async function createUserAccount(
  user: CurrentUserContext | null,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'user:manage');
  const unitId = Number(input.unitId);
  if (!Number.isInteger(unitId) || !canAccessUnit(actor, unitId))
    throw new Error('Select a Unit within your administrative scope.');
  const role = typeof input.role === 'string' ? input.role : 'CONTRIBUTOR';
  if (
    actor.role !== 'SYSTEM_ADMIN' &&
    !['CONTRIBUTOR', 'PROJECT_USER'].includes(role)
  )
    throw new Error(
      'Only a System Administrator may create administrator accounts.',
    );
  return db.$transaction(async (tx) =>
    tx.user.create({
      data: {
        trackingId: await nextTrackingId(tx, 'User'),
        displayName: requiredString(input.displayName, 'Display name'),
        identifier: requiredString(input.identifier, 'Identifier'),
        role: role as never,
        status: 'PENDING',
        primaryUnitId: unitId,
        unitMemberships: {
          create: { unitId, isPrimary: true, isAdmin: role === 'UNIT_ADMIN' },
        },
      },
    }),
  );
}

export async function updateUnitRecord(
  user: CurrentUserContext | null,
  unitId: number,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'unit:manage');
  if (!canAccessUnit(actor, unitId))
    throw new Error('You may manage only explicitly administered Units.');
  return db.unit.update({
    where: { id: unitId },
    data: {
      isActive:
        typeof input.isActive === 'boolean' ? input.isActive : undefined,
      forgePointOfContact: optional(input.forgePointOfContact) ?? undefined,
    },
  });
}
