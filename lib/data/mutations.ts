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

const optional = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const optionalNumber = (value: unknown) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const detail = (input: Record<string, unknown>, key: string) =>
  input[key] && typeof input[key] === 'object'
    ? (input[key] as Record<string, unknown>)
    : {};
const documentationValue = (value: unknown): DocumentationValue =>
  typeof value === 'string' && value in DOCUMENTATION_LABELS
    ? (value as DocumentationValue)
    : 'AVAILABLE_IN_FORGE';

export async function detectRelatedProblems(input: {
  title: string;
  category?: string;
  tags?: string[];
}) {
  const problems = await db.problem.findMany({
    include: { tags: { include: { tag: true } } },
  });
  return findRelatedProblems(
    input,
    problems.map((p) => ({
      id: p.trackingId,
      title: p.title,
      category: p.category,
      tags: p.tags.map((x) => x.tag.name),
    })),
  );
}

export async function createProblem(input: Record<string, unknown>) {
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
  id: string,
  input: Record<string, unknown>,
) {
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

export async function createProject(input: Record<string, unknown>) {
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
    return tx.project.create({
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
        startDate: new Date(),
        leadUnitId,
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
  });
}

export async function updateProject(
  id: string,
  input: Record<string, unknown>,
) {
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

export async function resolveProjectId(trackingId: string) {
  const project = await db.project.findUnique({
    where: { trackingId },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found.');
  return project.id;
}

export async function addProjectPhase(
  projectId: number,
  input: Record<string, unknown>,
) {
  return db.projectPhase.create({
    data: {
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
    },
  });
}

export async function addLesson(
  projectId: number,
  input: Record<string, unknown>,
) {
  return db.$transaction(async (tx) =>
    tx.lessonLearned.create({
      data: {
        trackingId: await nextTrackingId(tx, 'Lesson'),
        projectId,
        title: requiredString(input.title, 'Title'),
        finding: requiredString(input.finding, 'Finding'),
        recommendation: requiredString(input.recommendation, 'Recommendation'),
        date: new Date(),
      },
    }),
  );
}

export async function addRepository(
  projectId: number,
  input: Record<string, unknown>,
) {
  return db.repositoryLink.create({
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
    },
  });
}
