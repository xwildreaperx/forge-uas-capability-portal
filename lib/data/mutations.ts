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

const PROJECT_STATUSES = [
  'Planning',
  'Active',
  'Paused',
  'Transitioning',
  'Completed',
  'Cancelled',
  'Superseded',
] as const;
const PROJECT_MATURITIES = [
  'Concept',
  'Prototype',
  'Field Tested',
  'Validated',
] as const;
const PROJECT_OUTCOMES = [
  'SUCCESSFUL',
  'PARTIALLY_SUCCESSFUL',
  'UNSUCCESSFUL',
  'INCONCLUSIVE',
  'SUPERSEDED',
  'CANCELLED',
] as const;
const PHASE_STATUSES = ['Planned', 'In Progress', 'Complete'] as const;
const LESSON_TYPES = [
  'CONFIRMED_FINDING',
  'WORKING_HYPOTHESIS',
  'FAILED_APPROACH',
  'RECOMMENDATION',
  'UNRESOLVED_QUESTION',
] as const;
const HELP_CATEGORIES = [
  'TECHNICAL_EXPERTISE',
  'HARDWARE',
  'SOFTWARE_SUPPORT',
  'TESTING_SUPPORT_LOCATION',
  'FUNDING_RESOURCING',
  'OPERATOR_FEEDBACK',
  'DATA',
  'MANUFACTURING',
  'INTEGRATION',
  'DOCUMENTATION',
  'OTHER',
] as const;
const HELP_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] as const;
const USER_ROLES = [
  'CONTRIBUTOR',
  'PROJECT_USER',
  'UNIT_ADMIN',
  'SYSTEM_ADMIN',
] as const;
const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'DISABLED'] as const;
const controlled = <T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string,
): T[number] => {
  if (typeof value !== 'string' || !values.includes(value as T[number]))
    throw new Error(`${label} is invalid.`);
  return value as T[number];
};
const nullableDate = (value: unknown) => (value ? optionalDate(value) : null);

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
  let associatedPhase: {
    id: number;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
  } | null = null;
  if (phaseId) {
    associatedPhase = await db.projectPhase.findFirst({
      where: { id: phaseId, projectId },
      select: { id: true, status: true, startedAt: true, completedAt: true },
    });
    if (!associatedPhase)
      throw new Error('Associated Phase must belong to this Project.');
  }
  const summary = requiredString(input.summary, 'Update summary');
  const result = requiredString(input.result, 'Result / finding');
  const nextStep = requiredString(input.nextStep, 'Next step');
  const blockerRisk = optional(input.blockerRisk);
  const statusAfter = optional(input.status);
  const maturityAfter = optional(input.maturity);
  if (statusAfter) controlled(statusAfter, PROJECT_STATUSES, 'Project status');
  if (
    statusAfter &&
    ['Completed', 'Cancelled', 'Superseded'].includes(statusAfter)
  )
    throw new Error(
      'Use Close Out Project to record a terminal status and final disposition.',
    );
  if (maturityAfter)
    controlled(maturityAfter, PROJECT_MATURITIES, 'Project maturity');
  const completionAfter =
    input.completion === undefined || input.completion === ''
      ? null
      : completionValue(input.completion);
  const lastMeaningfulActivityAt =
    project.lastMeaningfulActivityAt &&
    project.lastMeaningfulActivityAt > occurredAt
      ? project.lastMeaningfulActivityAt
      : occurredAt;
  const phaseStatus = optional(input.phaseStatus);
  const phaseCompletion =
    input.phaseCompletion === undefined || input.phaseCompletion === ''
      ? null
      : completionValue(input.phaseCompletion);
  const phaseResult =
    optional(input.phaseResult) ?? (input.updatePhaseResult ? result : null);
  const phaseBlockerRisk =
    optional(input.phaseBlockerRisk) ??
    (input.updatePhaseRisk ? blockerRisk : null);
  const phaseNextAction =
    optional(input.phaseNextAction) ??
    (input.updatePhaseNextAction ? nextStep : null);
  if (phaseStatus) controlled(phaseStatus, PHASE_STATUSES, 'Phase status');
  if (
    !phaseId &&
    (phaseStatus ||
      phaseCompletion !== null ||
      phaseResult ||
      phaseBlockerRisk ||
      phaseNextAction)
  )
    throw new Error('Select an associated Phase before changing Phase state.');
  const significantMaturity =
    maturityAfter === 'Field Tested' || maturityAfter === 'Validated';
  const maturityEvidenceEvent = optional(input.maturityEvidenceEvent);
  const maturityEvidenceReference = optional(input.maturityEvidenceReference);
  const maturityEvidenceDate = significantMaturity
    ? nullableDate(input.maturityEvidenceDate ?? input.occurredAt)
    : null;
  if (significantMaturity && !maturityEvidenceEvent)
    throw new Error(
      'Supporting event or evaluation is required for Field Tested or Validated maturity.',
    );

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
        maturityEvidenceEvent,
        maturityEvidenceDate,
        maturityEvidenceReference,
      },
    });
    if (
      phaseId &&
      (phaseStatus ||
        phaseCompletion !== null ||
        phaseResult ||
        phaseBlockerRisk ||
        phaseNextAction)
    ) {
      await tx.projectPhase.update({
        where: { id: phaseId },
        data: {
          status: phaseStatus ?? undefined,
          completion: phaseCompletion ?? undefined,
          result: phaseResult ?? undefined,
          blocker: phaseBlockerRisk ?? undefined,
          risk: phaseBlockerRisk ?? undefined,
          nextAction: phaseNextAction ?? undefined,
          startedAt:
            phaseStatus === 'In Progress' && !associatedPhase?.startedAt
              ? occurredAt
              : undefined,
          completedAt:
            phaseStatus === 'Complete' && !associatedPhase?.completedAt
              ? occurredAt
              : undefined,
        },
      });
    }
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
    if (input.saveAsLesson === true || input.saveAsLesson === 'true') {
      const lessonType = controlled(
        input.lessonType,
        LESSON_TYPES,
        'Lesson Type',
      );
      const lessonTitle = requiredString(input.lessonTitle, 'Lesson title');
      await tx.lessonLearned.create({
        data: {
          trackingId: await nextTrackingId(tx, 'Lesson'),
          projectId,
          phaseId,
          sourceUpdateId: update.id,
          createdByUserId: actor.id,
          unitId: project.leadUnitId,
          lessonType,
          title: lessonTitle,
          finding: result,
          recommendation: optional(input.lessonRecommendation) ?? '',
          date: occurredAt,
        },
      });
      await tx.activityEvent.create({
        data: {
          timestamp: occurredAt,
          eventType: 'LESSON_ADDED',
          description: `Saved Update finding as Lesson Learned: ${lessonTitle}.`,
          actor: actor.displayName,
          projectId,
          unitId: project.leadUnitId,
          userId: actor.id,
        },
      });
    }
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'PROJECT_UPDATE',
        description: `${project.trackingId} update: ${summary}${statusAfter ? `; status → ${statusAfter}` : ''}${maturityAfter ? `; maturity → ${maturityAfter}` : ''}${phaseStatus ? `; Phase → ${phaseStatus}${phaseCompletion !== null ? ` (${phaseCompletion}%)` : ''}` : ''}`,
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
    select: {
      id: true,
      trackingId: true,
      leadUnitId: true,
      createdByUserId: true,
      status: true,
      maturity: true,
      lastMeaningfulActivityAt: true,
    },
  });
  const actor = assertProjectEdit(user, project);
  const status =
    typeof input.status === 'string'
      ? controlled(input.status, PROJECT_STATUSES, 'Project status')
      : undefined;
  const maturity =
    typeof input.maturity === 'string'
      ? controlled(input.maturity, PROJECT_MATURITIES, 'Project maturity')
      : undefined;
  if (
    maturity &&
    maturity !== project.maturity &&
    ['Field Tested', 'Validated'].includes(maturity)
  )
    throw new Error(
      'Advance to Field Tested or Validated through a Project Update with supporting evidence.',
    );
  const meaningfulStatusChange = status && status !== project.status;
  if (
    meaningfulStatusChange &&
    status &&
    ['Completed', 'Cancelled', 'Superseded'].includes(status)
  )
    throw new Error(
      'Use Close Out Project to record a terminal status and final disposition.',
    );
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
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
        status,
        maturity,
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
        solutionPlainLanguage:
          optional(input.solutionPlainLanguage) ?? undefined,
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
        lastMeaningfulActivityAt: meaningfulStatusChange
          ? occurredAt
          : undefined,
      },
    });
    if (meaningfulStatusChange)
      await tx.activityEvent.create({
        data: {
          timestamp: occurredAt,
          eventType:
            status === 'Paused'
              ? 'PROJECT_PAUSED'
              : project.status === 'Paused' && status === 'Active'
                ? 'PROJECT_RESUMED'
                : 'PROJECT_STATUS_CHANGED',
          description: `${project.trackingId} status changed from ${project.status} to ${status}.`,
          actor: actor.displayName,
          projectId: project.id,
          unitId: project.leadUnitId,
          userId: actor.id,
        },
      });
    return updated;
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
  if (
    !['ADD_CONTRIBUTOR', 'REMOVE_CONTRIBUTOR', 'CHANGE_LEAD'].includes(
      operation,
    )
  )
    throw new Error('Invalid Project team operation.');
  const userId = Number(input.userId);
  if (!Number.isInteger(userId) || userId < 1)
    throw new Error('A valid user is required.');
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const existing = project.userMemberships.find(
    (item) => item.userId === userId,
  );
  const currentLead = project.userMemberships.find(
    (item) => item.role === 'PROJECT_LEAD',
  );
  if (operation !== 'REMOVE_CONTRIBUTOR' && target.status !== 'ACTIVE')
    throw new Error(
      'Disabled users cannot be assigned as active Project maintainers.',
    );
  if (operation === 'REMOVE_CONTRIBUTOR' && existing?.role === 'PROJECT_LEAD')
    throw new Error(
      'Assign a new Project Lead before removing the current Lead.',
    );
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    let description: string;
    if (operation === 'ADD_CONTRIBUTOR') {
      if (existing)
        throw new Error('This user is already on the Project team.');
      await tx.projectMembership.create({
        data: { projectId, userId, role: 'CONTRIBUTOR' },
      });
      description = `${target.displayName} added as a Project Contributor.`;
    } else if (operation === 'REMOVE_CONTRIBUTOR') {
      if (!existing) throw new Error('This user is not on the Project team.');
      await tx.projectMembership.delete({
        where: { userId_projectId: { userId, projectId } },
      });
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
      await tx.helpRequest.updateMany({
        where: {
          projectId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          followsProjectLead: true,
        },
        data: { contactUserId: target.id, contact: target.identifier },
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
  if (problems.length !== problemIds.length)
    throw new Error('One or more Problems are invalid.');
  if (units.length !== unitIds.length)
    throw new Error('One or more Units are invalid.');
  const roles =
    input.unitRoles && typeof input.unitRoles === 'object'
      ? (input.unitRoles as Record<string, unknown>)
      : {};
  const allowedRoles = new Set(['Supporting', 'Testing']);
  const occurredAt = new Date();
  const oldProblems = new Map(
    project.problemLinks.map((x) => [x.problemId, x]),
  );
  const oldUnits = new Map(project.unitLinks.map((x) => [x.unitId, x]));
  const descriptions: string[] = [];
  for (const problem of problems) {
    if (!oldProblems.has(problem.id))
      descriptions.push(
        `${problem.trackingId} — ${problem.title} added to the Project.`,
      );
    else if (
      problem.id === primaryProblemId &&
      !oldProblems.get(problem.id)?.isPrimary
    )
      descriptions.push(
        `${problem.trackingId} — ${problem.title} set as the primary Problem.`,
      );
  }
  for (const link of project.problemLinks) {
    if (!problemIds.includes(link.problemId))
      descriptions.push(
        `${link.problem.trackingId} — ${link.problem.title} removed from the Project.`,
      );
  }
  for (const unit of units) {
    const role =
      unit.id === leadUnitId
        ? 'Lead'
        : allowedRoles.has(String(roles[unit.id]))
          ? String(roles[unit.id])
          : 'Supporting';
    const previous = oldUnits.get(unit.id);
    if (!previous) descriptions.push(`${unit.name} added as a ${role} Unit.`);
    else if (previous.role !== role)
      descriptions.push(
        `${unit.name} role changed from ${previous.role} to ${role}.`,
      );
  }
  for (const link of project.unitLinks) {
    if (!unitIds.includes(link.unitId))
      descriptions.push(`${link.unit.name} removed from participating Units.`);
  }
  if (project.leadUnitId !== leadUnitId) {
    const nextLead = units.find((unit) => unit.id === leadUnitId)!;
    descriptions.push(
      `Lead Unit changed from ${project.leadUnit.name} to ${nextLead.name}.`,
    );
  }
  if (!descriptions.length)
    throw new Error('No relationship changes were selected.');

  return db.$transaction(async (tx) => {
    await tx.problemProject.deleteMany({
      where: { projectId, problemId: { notIn: problemIds } },
    });
    for (const problemId of problemIds) {
      await tx.problemProject.upsert({
        where: { problemId_projectId: { problemId, projectId } },
        update: { isPrimary: problemId === primaryProblemId },
        create: {
          problemId,
          projectId,
          isPrimary: problemId === primaryProblemId,
        },
      });
    }
    await tx.projectUnit.deleteMany({
      where: { projectId, unitId: { notIn: unitIds } },
    });
    for (const unitId of unitIds) {
      const role =
        unitId === leadUnitId
          ? 'Lead'
          : allowedRoles.has(String(roles[unitId]))
            ? String(roles[unitId])
            : 'Supporting';
      await tx.projectUnit.upsert({
        where: { projectId_unitId: { projectId, unitId } },
        update: { role },
        create: { projectId, unitId, role },
      });
    }
    await tx.project.update({
      where: { id: projectId },
      data: { leadUnitId, lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.createMany({
      data: descriptions.map((description) => ({
        timestamp: occurredAt,
        eventType: 'PROJECT_RELATIONSHIP_CHANGED',
        description,
        actor: actor.displayName,
        projectId,
        unitId: leadUnitId,
        userId: actor.id,
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
    const phase = await tx.projectPhase.create({
      data: {
        projectId,
        phaseName: requiredString(input.phaseName, 'Phase name'),
        objective: requiredString(input.objective, 'Objective'),
        status: input.status
          ? controlled(input.status, PHASE_STATUSES, 'Phase status')
          : 'Planned',
        completion: completionValue(input.completion ?? 0),
        executiveSummary: optional(input.executiveSummary) ?? '',
        technicalSummary: optional(input.technicalSummary) ?? '',
        result: optional(input.result),
        accomplishment: optional(input.accomplishment),
        blocker: optional(input.blocker),
        risk: optional(input.risk),
        nextAction: optional(input.nextAction),
        startedAt: nullableDate(input.startedAt),
        completedAt: nullableDate(input.completedAt),
        sortOrder: Number(input.sortOrder ?? 1),
        createdByUserId: actor.id,
      },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'PHASE_CREATED',
        description: `Added Project phase: ${phase.phaseName}.`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return phase;
  });
}

export async function updateProjectPhase(
  user: CurrentUserContext | null,
  projectId: number,
  phaseId: number,
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
  const phase = await db.projectPhase.findFirstOrThrow({
    where: { id: phaseId, projectId },
  });
  const status = input.status
    ? controlled(input.status, PHASE_STATUSES, 'Phase status')
    : phase.status;
  const completion =
    input.completion === undefined
      ? phase.completion
      : completionValue(input.completion);
  const meaningful =
    status !== phase.status ||
    completion !== phase.completion ||
    (optional(input.result) && optional(input.result) !== phase.result);
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.projectPhase.update({
      where: { id: phaseId },
      data: {
        phaseName: input.phaseName
          ? requiredString(input.phaseName, 'Phase name')
          : undefined,
        objective: optional(input.objective) ?? undefined,
        status,
        completion,
        executiveSummary: optional(input.executiveSummary) ?? undefined,
        technicalSummary: optional(input.technicalSummary) ?? undefined,
        result: optional(input.result) ?? undefined,
        accomplishment: optional(input.accomplishment) ?? undefined,
        blocker: optional(input.blocker) ?? undefined,
        risk: optional(input.risk) ?? undefined,
        nextAction: optional(input.nextAction) ?? undefined,
        startedAt:
          status === 'In Progress' && !phase.startedAt
            ? occurredAt
            : (nullableDate(input.startedAt) ?? undefined),
        completedAt:
          status === 'Complete' && !phase.completedAt
            ? occurredAt
            : (nullableDate(input.completedAt) ?? undefined),
      },
    });
    if (meaningful) {
      const eventType =
        status === 'Complete' && phase.status !== 'Complete'
          ? 'PHASE_COMPLETED'
          : status === 'In Progress' && phase.status === 'Planned'
            ? 'PHASE_STARTED'
            : 'PHASE_PROGRESSED';
      await tx.project.update({
        where: { id: projectId },
        data: { lastMeaningfulActivityAt: occurredAt },
      });
      await tx.activityEvent.create({
        data: {
          timestamp: occurredAt,
          eventType,
          description: `${phase.phaseName}: ${status}, ${completion}%${optional(input.result) ? ' — result recorded.' : '.'}`,
          actor: actor.displayName,
          projectId,
          unitId: project.leadUnitId,
          userId: actor.id,
        },
      });
    }
    return updated;
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
  const lessonType = input.lessonType
    ? controlled(input.lessonType, LESSON_TYPES, 'Lesson Type')
    : 'CONFIRMED_FINDING';
  const phaseId = input.phaseId ? Number(input.phaseId) : null;
  const sourceUpdateId = input.sourceUpdateId
    ? Number(input.sourceUpdateId)
    : null;
  if (
    phaseId &&
    !(await db.projectPhase.findFirst({ where: { id: phaseId, projectId } }))
  )
    throw new Error('Associated Phase must belong to this Project.');
  if (
    sourceUpdateId &&
    !(await db.projectUpdate.findFirst({
      where: { id: sourceUpdateId, projectId },
    }))
  )
    throw new Error('Originating Update must belong to this Project.');
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const lesson = await tx.lessonLearned.create({
      data: {
        trackingId: await nextTrackingId(tx, 'Lesson'),
        projectId,
        title: requiredString(input.title, 'Title'),
        finding: requiredString(input.finding, 'Finding'),
        recommendation: optional(input.recommendation) ?? '',
        lessonType,
        date: nullableDate(input.date) ?? new Date(),
        createdByUserId: actor.id,
        phaseId,
        unitId: input.unitId ? Number(input.unitId) : project.leadUnitId,
        sourceUpdateId,
      },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'LESSON_ADDED',
        description: `Added Lesson Learned: ${lesson.title}.`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return lesson;
  });
}

export async function closeOutProject(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      problemLinks: { include: { problem: true } },
      phases: true,
      lessons: true,
      helpRequests: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
      userMemberships: { include: { user: true } },
      leadUnit: true,
    },
  });
  const actor = assertProjectEdit(user, project);
  const status = controlled(
    input.status,
    ['Completed', 'Cancelled', 'Superseded'] as const,
    'Final status',
  );
  const outcomeDisposition = controlled(
    input.outcomeDisposition,
    PROJECT_OUTCOMES,
    'Outcome',
  );
  const finalResult = requiredString(input.finalResult, 'Final result');
  const successorProjectId = input.successorProjectId
    ? Number(input.successorProjectId)
    : null;
  if (status === 'Superseded' && successorProjectId === projectId)
    throw new Error('A Project cannot supersede itself.');
  if (
    successorProjectId &&
    !(await db.project.findUnique({ where: { id: successorProjectId } }))
  )
    throw new Error('Successor Project is invalid.');
  const occurredAt = nullableDate(input.closedAt) ?? new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        status,
        outcomeDisposition,
        outcome: optional(input.outcomeNarrative),
        finalResult,
        latestResult: finalResult,
        whatWorked: optional(input.whatWorked),
        whatDidNotWork: optional(input.whatDidNotWork),
        recommendedNextAction: optional(input.recommendedNextAction),
        nextStep: optional(input.recommendedNextAction) ?? undefined,
        documentationAvailability: input.documentationAvailability
          ? documentationValue(input.documentationAvailability)
          : undefined,
        successorProjectId,
        closedAt: occurredAt,
        closedByUserId: actor.id,
        completion:
          input.completion === undefined || input.completion === ''
            ? undefined
            : completionValue(input.completion),
        lastMeaningfulActivityAt: occurredAt,
      },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'PROJECT_CLOSED_OUT',
        description: `${project.trackingId} closed as ${status}; outcome: ${outcomeDisposition.replaceAll('_', ' ').toLowerCase()}. Final result: ${finalResult}`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return updated;
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
  const phaseId = input.phaseId ? Number(input.phaseId) : null;
  if (
    phaseId &&
    !(await db.projectPhase.findFirst({ where: { id: phaseId, projectId } }))
  )
    throw new Error('Associated Phase must belong to this Project.');
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const repository = await tx.repositoryLink.create({
      data: {
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
        phaseId,
      },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'ARTIFACT_ADDED',
        description: `Added artifact reference: ${repository.name}.`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return repository;
  });
}

export async function createHelpRequest(
  user: CurrentUserContext | null,
  projectId: number,
  input: Record<string, unknown>,
) {
  const project = await projectForOperations(projectId);
  const actor = assertProjectEdit(user, project);
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const lead = project.userMemberships.find(
      (member) => member.role === 'PROJECT_LEAD',
    )?.user;
    const explicitContact = optional(input.contact);
    const request = await tx.helpRequest.create({
      data: {
        projectId,
        title: requiredString(input.title, 'What help is needed'),
        category: controlled(
          input.category || 'OTHER',
          HELP_CATEGORIES,
          'Help Request category',
        ),
        description: requiredString(input.description, 'Description'),
        contact:
          explicitContact ??
          lead?.identifier ??
          project.leadUnit.forgePointOfContact,
        contactUserId: explicitContact ? null : lead?.id,
        followsProjectLead: !explicitContact,
        status: 'OPEN',
        createdByUserId: actor.id,
      },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: 'HELP_REQUEST_OPENED',
        description: `Help Request opened: ${request.title} (${request.category.replaceAll('_', ' ').toLowerCase()}).`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return request;
  });
}

export async function updateHelpRequest(
  user: CurrentUserContext | null,
  projectId: number,
  helpRequestId: number,
  input: Record<string, unknown>,
) {
  const project = await projectForOperations(projectId);
  const actor = assertProjectEdit(user, project);
  const request = await db.helpRequest.findFirstOrThrow({
    where: { id: helpRequestId, projectId },
  });
  if (input.contactUserId !== undefined) {
    if (request.followsProjectLead)
      throw new Error('Lead-following contacts change through Project Lead reassignment.');
    const contactUserId = Number(input.contactUserId);
    const nextContact = await db.user.findUniqueOrThrow({ where: { id: contactUserId } });
    if (nextContact.status !== 'ACTIVE')
      throw new Error('Select an active Help Request contact.');
    if (request.contactUserId === nextContact.id)
      throw new Error('Select a different Help Request contact.');
    const previous = request.contactUserId
      ? await db.user.findUnique({ where: { id: request.contactUserId } })
      : null;
    const occurredAt = new Date();
    return db.$transaction(async (tx) => {
      const updated = await tx.helpRequest.update({
        where: { id: helpRequestId },
        data: { contactUserId: nextContact.id, contact: nextContact.identifier, followsProjectLead: false },
      });
      await tx.project.update({ where: { id: projectId }, data: { lastMeaningfulActivityAt: occurredAt } });
      await tx.activityEvent.create({ data: {
        timestamp: occurredAt, eventType: 'HELP_REQUEST_CONTACT_CHANGED',
        description: `Help Request contact changed from ${previous?.displayName ?? request.contact ?? 'unassigned'} to ${nextContact.displayName}: ${request.title}.`,
        actor: actor.displayName, projectId, unitId: project.leadUnitId, userId: actor.id,
        subjectUserId: nextContact.id,
      } });
      return updated;
    });
  }
  const status = controlled(input.status, HELP_STATUSES, 'Help Request status');
  if (request.status === 'RESOLVED' || request.status === 'CANCELLED')
    throw new Error(
      'Closed Help Requests remain history and cannot be reopened.',
    );
  if (status === request.status)
    throw new Error('Choose a new Help Request status.');
  const resolutionSummary = ['RESOLVED', 'CANCELLED'].includes(status)
    ? requiredString(input.resolutionSummary, 'Resolution summary')
    : null;
  const occurredAt = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.helpRequest.update({
      where: { id: helpRequestId },
      data: {
        status,
        resolutionSummary,
        resolvedAt: ['RESOLVED', 'CANCELLED'].includes(status)
          ? occurredAt
          : null,
        resolvedByUserId: ['RESOLVED', 'CANCELLED'].includes(status)
          ? actor.id
          : null,
      },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { lastMeaningfulActivityAt: occurredAt },
    });
    await tx.activityEvent.create({
      data: {
        timestamp: occurredAt,
        eventType: `HELP_REQUEST_${status}`,
        description: `Help Request ${status.replaceAll('_', ' ').toLowerCase()}: ${request.title}.${resolutionSummary ? ` ${resolutionSummary}` : ''}`,
        actor: actor.displayName,
        projectId,
        unitId: project.leadUnitId,
        userId: actor.id,
      },
    });
    return updated;
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
    input.role === undefined
      ? target.role
      : controlled(input.role, USER_ROLES, 'Role');
  const requestedStatus =
    input.status === undefined
      ? target.status
      : controlled(input.status, ACCOUNT_STATUSES, 'Account status');
  if (
    actor.role !== 'SYSTEM_ADMIN' &&
    (requestedRole === 'SYSTEM_ADMIN' || requestedRole === 'UNIT_ADMIN')
  )
    throw new Error(
      'Only a System Administrator may grant administrator roles.',
    );
  const changes: string[] = [];
  if (requestedRole !== target.role)
    changes.push(`role changed from ${target.role} to ${requestedRole}`);
  if (requestedStatus !== target.status)
    changes.push(`status changed from ${target.status} to ${requestedStatus}`);
  return db.$transaction(async (tx) => {
    const persistedTarget = await tx.user.findUniqueOrThrow({ where: { id: targetId } });
    const leavesActiveSystemAdmin =
      persistedTarget.role === 'SYSTEM_ADMIN' && persistedTarget.status === 'ACTIVE' &&
      (requestedRole !== 'SYSTEM_ADMIN' || requestedStatus !== 'ACTIVE');
    if (leavesActiveSystemAdmin) {
      const activeSystemAdmins = await tx.user.count({
        where: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' },
      });
      if (activeSystemAdmins <= 1)
        throw new Error(
          'FORGE must retain at least one active System Administrator. Assign and activate another System Administrator before changing this account.',
        );
    }
    if (requestedRole === 'UNIT_ADMIN') {
      const scopes = await tx.unitMembership.count({
        where: { userId: targetId, isAdmin: true, unit: { isActive: true } },
      });
      if (!scopes)
        throw new Error(
          'A Unit Administrator must have at least one active administered Unit. Assign a Unit Admin scope first.',
        );
    }
    const removedScopes = requestedRole !== 'UNIT_ADMIN'
      ? await tx.unitMembership.count({ where: { userId: targetId, isAdmin: true } })
      : 0;
    if (removedScopes)
      await tx.unitMembership.updateMany({
        where: { userId: targetId, isAdmin: true }, data: { isAdmin: false },
      });
    const updated = await tx.user.update({
      where: { id: targetId },
      data: {
        displayName: input.displayName
          ? requiredString(input.displayName, 'Display name')
          : undefined,
        title: optional(input.title) ?? undefined,
        role: requestedRole,
        status: requestedStatus,
        lastActivityAt: new Date(),
      },
    });
    if (removedScopes)
      changes.push(`${removedScopes} Unit Administrator scope${removedScopes === 1 ? '' : 's'} removed automatically`);
    if (changes.length)
      await tx.activityEvent.create({
        data: {
          eventType:
            requestedStatus !== target.status
              ? `USER_${requestedStatus}`
              : 'USER_ROLE_CHANGED',
          description: `${target.displayName}: ${changes.join('; ')}.`,
          actor: actor.displayName,
          userId: actor.id,
          subjectUserId: target.id,
          unitId: target.primaryUnitId,
        },
      });
    return updated;
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
  const role = controlled(input.role || 'CONTRIBUTOR', USER_ROLES, 'Role');
  const selectedUnit = await db.unit.findUniqueOrThrow({ where: { id: unitId } });
  if (role === 'UNIT_ADMIN' && !selectedUnit.isActive)
    throw new Error('A Unit Administrator must be assigned to an active Unit.');
  if (
    actor.role !== 'SYSTEM_ADMIN' &&
    !['CONTRIBUTOR', 'PROJECT_USER'].includes(role)
  )
    throw new Error(
      'Only a System Administrator may create administrator accounts.',
    );
  return db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        trackingId: await nextTrackingId(tx, 'User'),
        displayName: requiredString(input.displayName, 'Display name'),
        identifier: requiredString(input.identifier, 'Identifier'),
        role,
        status: 'PENDING',
        primaryUnitId: unitId,
        unitMemberships: {
          create: { unitId, isPrimary: true, isAdmin: role === 'UNIT_ADMIN' },
        },
      },
    });
    await tx.activityEvent.create({
      data: {
        eventType: 'USER_PROFILE_CREATED',
        description: `Pending profile created for ${created.displayName}.`,
        actor: actor.displayName,
        userId: actor.id,
        subjectUserId: created.id,
        unitId,
      },
    });
    return created;
  });
}

export async function manageUserUnitMembership(
  user: CurrentUserContext | null,
  targetId: number,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'user:manage');
  const operation = controlled(
    input.operation,
    ['ADD', 'REMOVE', 'SET_PRIMARY'] as const,
    'Membership operation',
  );
  const unitId = Number(input.unitId);
  if (!Number.isInteger(unitId) || !canAccessUnit(actor, unitId))
    throw new Error('Select a Unit within your administrative scope.');
  const target = await db.user.findUniqueOrThrow({
    where: { id: targetId },
    include: {
      unitMemberships: { include: { unit: true } },
      primaryUnit: true,
    },
  });
  const existing = target.unitMemberships.find(
    (item) => item.unitId === unitId,
  );
  if (operation === 'ADD' && existing)
    throw new Error('This user already belongs to that Unit.');
  if (operation !== 'ADD' && !existing)
    throw new Error('This user does not belong to that Unit.');
  if (operation === 'REMOVE' && existing?.isPrimary)
    throw new Error(
      'Choose a new primary Unit before removing this membership.',
    );
  if (
    operation === 'REMOVE' &&
    existing?.isAdmin &&
    actor.role !== 'SYSTEM_ADMIN'
  )
    throw new Error(
      'Only a System Administrator may remove an administrator assignment.',
    );
  if (
    operation === 'SET_PRIMARY' &&
    actor.role !== 'SYSTEM_ADMIN' &&
    target.primaryUnitId &&
    !canAccessUnit(actor, target.primaryUnitId)
  )
    throw new Error('Primary Unit transfer requires scope over both Units.');
  const unit = await db.unit.findUniqueOrThrow({ where: { id: unitId } });
  return db.$transaction(async (tx) => {
    if (operation === 'ADD')
      await tx.unitMembership.create({ data: { userId: targetId, unitId } });
    if (operation === 'REMOVE')
      await tx.unitMembership.delete({
        where: { userId_unitId: { userId: targetId, unitId } },
      });
    if (operation === 'SET_PRIMARY') {
      await tx.unitMembership.updateMany({
        where: { userId: targetId },
        data: { isPrimary: false },
      });
      await tx.unitMembership.update({
        where: { userId_unitId: { userId: targetId, unitId } },
        data: { isPrimary: true },
      });
      await tx.user.update({
        where: { id: targetId },
        data: { primaryUnitId: unitId },
      });
    }
    const label =
      operation === 'ADD'
        ? 'membership added'
        : operation === 'REMOVE'
          ? 'membership removed'
          : `primary Unit changed from ${target.primaryUnit?.name ?? 'none'}`;
    await tx.activityEvent.create({
      data: {
        eventType: `USER_UNIT_${operation}`,
        description: `${target.displayName}: ${label} — ${unit.name}.`,
        actor: actor.displayName,
        userId: actor.id,
        subjectUserId: target.id,
        unitId,
      },
    });
    return { ok: true };
  });
}

export async function setUnitAdminAssignment(
  user: CurrentUserContext | null,
  targetId: number,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'platform:admin');
  const unitId = Number(input.unitId);
  if (!Number.isInteger(unitId)) throw new Error('A valid Unit is required.');
  const assigned = input.assigned === true;
  const [target, unit] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: targetId } }),
    db.unit.findUniqueOrThrow({ where: { id: unitId } }),
  ]);
  if (assigned && target.status !== 'ACTIVE')
    throw new Error(
      'Only an active user can be assigned as a Unit Administrator.',
    );
  if (assigned && target.role === 'SYSTEM_ADMIN')
    throw new Error(
      'System Administrators already have global scope. Downgrade safely before assigning a Unit Administrator role and scope.',
    );
  if (assigned && !unit.isActive)
    throw new Error('A Unit Administrator must be assigned to an active Unit.');
  return db.$transaction(async (tx) => {
    if (!assigned && target.role === 'UNIT_ADMIN') {
      const remainingScopes = await tx.unitMembership.count({
        where: { userId: targetId, isAdmin: true, unitId: { not: unitId }, unit: { isActive: true } },
      });
      if (!remainingScopes)
        throw new Error(
          'A Unit Administrator must retain at least one administered Unit. Assign another Unit or change the role first.',
        );
    }
    const membership = await tx.unitMembership.upsert({
      where: { userId_unitId: { userId: targetId, unitId } },
      update: { isAdmin: assigned },
      create: { userId: targetId, unitId, isAdmin: assigned },
    });
    if (assigned && target.role !== 'UNIT_ADMIN')
      await tx.user.update({ where: { id: targetId }, data: { role: 'UNIT_ADMIN' } });
    await tx.activityEvent.create({
      data: {
        eventType: assigned ? 'UNIT_ADMIN_ASSIGNED' : 'UNIT_ADMIN_REMOVED',
        description: `${target.displayName} ${assigned ? `assigned as Unit Administrator for ${unit.name}${target.role !== 'UNIT_ADMIN' ? ' and promoted to Unit Administrator' : ''}` : `removed as Unit Administrator for ${unit.name}`}.`,
        actor: actor.displayName,
        userId: actor.id,
        subjectUserId: target.id,
        unitId,
      },
    });
    return membership;
  });
}

export async function updateUnitRecord(
  user: CurrentUserContext | null,
  unitId: number,
  input: Record<string, unknown>,
) {
  const actor = requirePermission(user, 'unit:manage');
  if (!canAccessUnit(actor, unitId))
    throw new Error('You may manage only explicitly administered Units.');
  if (typeof input.isActive === 'boolean' && actor.role !== 'SYSTEM_ADMIN')
    throw new Error(
      'Only a System Administrator may change Unit active status.',
    );
  const unit = await db.unit.findUniqueOrThrow({
    where: { id: unitId },
    include: {
      leadProjects: { where: { status: { in: ['Planning', 'Active', 'Paused', 'Transitioning'] } }, select: { trackingId: true, name: true } },
    },
  });
  return db.$transaction(async (tx) => {
    if (input.isActive === false && unit.isActive) {
      const activeLedProjects = await tx.project.findMany({
        where: { leadUnitId: unitId, status: { in: ['Planning', 'Active', 'Paused', 'Transitioning'] } },
        select: { trackingId: true, name: true },
      });
      if (activeLedProjects.length)
        throw new Error(
          `This Unit leads ${activeLedProjects.length} nonterminal Project${activeLedProjects.length === 1 ? '' : 's'} (${activeLedProjects.map((item) => item.trackingId).join(', ')}). Transfer Lead Unit responsibility or close the Project before deactivation.`,
        );
    }
    const updated = await tx.unit.update({
      where: { id: unitId },
      data: {
        isActive:
          typeof input.isActive === 'boolean' ? input.isActive : undefined,
        forgePointOfContact: optional(input.forgePointOfContact) ?? undefined,
      },
    });
    const changes = [
      typeof input.isActive === 'boolean'
        ? `status changed to ${input.isActive ? 'ACTIVE' : 'INACTIVE'}`
        : '',
      input.forgePointOfContact !== undefined
        ? 'FORGE point of contact updated'
        : '',
    ].filter(Boolean);
    if (changes.length)
      await tx.activityEvent.create({
        data: {
          eventType: 'UNIT_ADMIN_UPDATED',
          description: `${unit.name}: ${changes.join('; ')}.`,
          actor: actor.displayName,
          userId: actor.id,
          unitId,
        },
      });
    return updated;
  });
}
