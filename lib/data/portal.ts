import { db } from '../db.ts';
import type { PortalData } from './types.ts';
import {
  SOLUTION_TYPE_LABELS,
  type SolutionTypeValue,
} from '../domain/solution-types.ts';
import {
  DOCUMENTATION_LABELS,
  type DocumentationValue,
} from '../domain/documentation.ts';
import type { CurrentUserContext } from '../auth/permissions.ts';
import { hasPermission } from '../auth/permissions.ts';
import { isDevUserSwitcherEnabled } from '../auth/config.ts';
import { findRelatedProblems } from '../domain/matching.ts';

const tones: Record<string, string> = {
  Concept: 'amber',
  Prototype: 'blue',
  'Field Tested': 'green',
  Validated: 'purple',
};

export async function getPortalData(
  currentUser: CurrentUserContext | null = null,
): Promise<PortalData> {
  const [
    problems,
    projects,
    units,
    activities,
    helpRequests,
    availableUsers,
    directoryUsers,
    submissions,
    projectDirectoryUsers,
  ] = await Promise.all([
    db.problem.findMany({
      orderBy: { trackingId: 'asc' },
      include: {
        projectLinks: {
          select: { project: { select: { trackingId: true } } },
        },
        unitLinks: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    db.project.findMany({
      orderBy: { trackingId: 'asc' },
      include: {
        leadUnit: { select: { trackingId: true, name: true } },
        problemLinks: {
          orderBy: { isPrimary: 'desc' },
          select: {
            isPrimary: true,
            problem: { select: { trackingId: true, title: true } },
          },
        },
        unitLinks: {
          select: {
            role: true,
            unit: { select: { trackingId: true, name: true } },
          },
        },
        tags: { select: { tag: { select: { name: true } } } },
        locations: {
          select: { location: { select: { name: true, region: true } } },
        },
        phases: { orderBy: { sortOrder: 'asc' } },
        updates: {
          orderBy: { occurredAt: 'desc' },
          include: {
            author: { select: { trackingId: true, displayName: true } },
            phase: { select: { phaseName: true } },
          },
        },
        lessons: {
          orderBy: { date: 'desc' },
          include: { phase: true, createdBy: true },
        },
        repositories: { include: { phase: true } },
        helpRequests: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: true, resolvedBy: true, contactUser: true },
        },
        vendorDetail: true,
        tacticDetail: true,
        trainingDetail: true,
        createdBy: { select: { displayName: true } },
        closedBy: { select: { displayName: true } },
        successorProject: { select: { trackingId: true, name: true } },
        userMemberships: {
          orderBy: { role: 'desc' },
          include: { user: { include: { primaryUnit: true } } },
        },
      },
    }),
    db.unit.findMany({
      orderBy: { trackingId: 'asc' },
      include: {
        location: true,
        capabilities: { select: { tag: { select: { name: true } } } },
        projectLinks: {
          select: { project: { select: { trackingId: true } } },
        },
      },
    }),
    db.activityEvent.findMany({ orderBy: { timestamp: 'desc' }, take: 44 }),
    db.helpRequest.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        contactUser: true,
        project: {
          select: {
            trackingId: true,
            name: true,
            leadUnit: { select: { name: true } },
            problemLinks: {
              select: { problem: { select: { trackingId: true } } },
            },
          },
        },
      },
    }),
    isDevUserSwitcherEnabled()
      ? db.user.findMany({
          orderBy: { id: 'asc' },
          select: { id: true, displayName: true, role: true, status: true },
        })
      : Promise.resolve([]),
    hasPermission(currentUser, 'user:manage')
      ? db.user.findMany({
          where:
            currentUser?.role === 'SYSTEM_ADMIN'
              ? {}
              : {
                  unitMemberships: {
                    some: {
                      unitId: { in: currentUser?.administeredUnitIds ?? [] },
                    },
                  },
                },
          orderBy: { displayName: 'asc' },
          include: {
            primaryUnit: true,
            unitMemberships: { include: { unit: true } },
          },
        })
      : Promise.resolve([]),
    hasPermission(currentUser, 'submission:review')
      ? db.problemSubmission.findMany({
          where:
            currentUser?.role === 'SYSTEM_ADMIN'
              ? {}
              : { unitId: { in: currentUser?.administeredUnitIds ?? [] } },
          orderBy: { createdAt: 'desc' },
          include: { submitter: true, unit: true, relatedProblem: true },
        })
      : Promise.resolve([]),
    currentUser
      ? db.user.findMany({
          orderBy: { displayName: 'asc' },
          include: { primaryUnit: true },
        })
      : Promise.resolve([]),
  ]);

  const visibleUnitIds =
    currentUser?.role === 'SYSTEM_ADMIN'
      ? units.map((unit) => unit.id)
      : (currentUser?.administeredUnitIds ?? []);
  const activeStatuses = new Set([
    'Planning',
    'Active',
    'Paused',
    'Transitioning',
  ]);
  const needsAttention: PortalData['needsAttention'] = [];
  for (const unit of units.filter(
    (item) => visibleUnitIds.includes(item.id) && item.isActive,
  )) {
    const activeAdmins = directoryUsers.filter(
      (person) =>
        person.status === 'ACTIVE' &&
        person.unitMemberships.some(
          (membership) => membership.unitId === unit.id && membership.isAdmin,
        ),
    );
    if (!activeAdmins.length)
      needsAttention.push({
        key: `unit-admin-${unit.id}`,
        kind: 'NO_ACTIVE_UNIT_ADMIN',
        severity: 'critical',
        message: `${unit.name} has no active Unit Administrator.`,
        unitId: unit.id,
        projectId: '',
        userId: null,
      });
  }
  for (const project of projects.filter(
    (item) =>
      visibleUnitIds.includes(item.leadUnitId) &&
      activeStatuses.has(item.status),
  )) {
    const lead = project.userMemberships.find(
      (membership) => membership.role === 'PROJECT_LEAD',
    );
    const activeMaintainers = project.userMemberships.filter(
      (membership) => membership.user.status === 'ACTIVE',
    );
    if (!lead || lead.user.status !== 'ACTIVE')
      needsAttention.push({
        key: `lead-${project.id}`,
        kind: 'INACTIVE_PROJECT_LEAD',
        severity: 'critical',
        message: `${project.trackingId} — ${project.name} has ${lead ? 'an inactive' : 'no'} Project Lead.`,
        unitId: project.leadUnitId,
        projectId: project.trackingId,
        userId: lead?.userId ?? null,
      });
    if (!activeMaintainers.length)
      needsAttention.push({
        key: `maintainer-${project.id}`,
        kind: 'NO_ACTIVE_MAINTAINER',
        severity: 'critical',
        message: `${project.trackingId} — ${project.name} has no active maintainer.`,
        unitId: project.leadUnitId,
        projectId: project.trackingId,
        userId: null,
      });
    for (const request of project.helpRequests.filter(
      (item) =>
        ['OPEN', 'IN_PROGRESS'].includes(item.status) &&
        item.contactUser &&
        item.contactUser.status !== 'ACTIVE',
    ))
      needsAttention.push({
        key: `help-${request.id}`,
        kind: 'INACTIVE_HELP_CONTACT',
        severity: 'warning',
        message: `Help Request “${request.title}” has an inactive contact.`,
        unitId: project.leadUnitId,
        projectId: project.trackingId,
        userId: request.contactUserId,
      });
  }
  for (const person of directoryUsers.filter(
    (item) => item.status === 'PENDING',
  ))
    needsAttention.push({
      key: `pending-user-${person.id}`,
      kind: 'PENDING_USER',
      severity: 'warning',
      message: `${person.displayName} is awaiting account activation.`,
      unitId: person.primaryUnitId,
      projectId: '',
      userId: person.id,
    });
  for (const submission of submissions.filter((item) =>
    ['PENDING', 'UNDER_REVIEW'].includes(item.status),
  ))
    needsAttention.push({
      key: `submission-${submission.id}`,
      kind: 'PENDING_SUBMISSION',
      severity: 'warning',
      message: `${submission.trackingId} — ${submission.title} needs review.`,
      unitId: submission.unitId,
      projectId: '',
      userId: submission.submitterId,
    });

  return {
    datasetMode:
      projects.length > 0 ||
      units.some((unit) => unit.name.startsWith('Fictional Unit'))
        ? 'demo'
        : 'operational',
    problems: problems.map((p) => ({
      dbId: p.id,
      id: p.trackingId,
      title: p.title,
      description: p.shortDescription,
      detailedDescription: p.detailedDescription,
      problemStatement: p.problemStatement,
      owner: p.owner ?? 'Unassigned',
      category: p.category,
      priority: p.priority,
      status: p.status,
      projectIds: p.projectLinks.map((x) => x.project.trackingId),
      unitCount: p.unitLinks.length,
      tags: p.tags.map((x) => x.tag.name),
    })),
    projects: projects.map((p) => ({
      dbId: p.id,
      id: p.trackingId,
      name: p.name,
      unit: p.leadUnit.name,
      unitId: p.leadUnit.trackingId,
      maturity: p.maturity,
      progress: p.completion,
      status: p.status,
      solutionType: p.solutionType,
      solutionTypeLabel:
        SOLUTION_TYPE_LABELS[p.solutionType as SolutionTypeValue],
      updatedAt: p.updatedAt.toISOString(),
      lastMeaningfulActivityAt: (
        p.lastMeaningfulActivityAt ?? p.createdAt
      ).toISOString(),
      outcome: p.outcome ?? '',
      outcomeDisposition: p.outcomeDisposition ?? '',
      outcomeLabel: p.outcomeDisposition
        ? p.outcomeDisposition
            .replaceAll('_', ' ')
            .toLowerCase()
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
        : '',
      finalResult: p.finalResult ?? '',
      whatWorked: p.whatWorked ?? '',
      whatDidNotWork: p.whatDidNotWork ?? '',
      recommendedNextAction: p.recommendedNextAction ?? '',
      closedAt: p.closedAt?.toISOString() ?? '',
      closedByName: p.closedBy?.displayName ?? '',
      successorProjectId: p.successorProject?.trackingId ?? '',
      successorProjectName: p.successorProject?.name ?? '',
      openHelpRequestCount: p.helpRequests.filter((request) =>
        ['OPEN', 'IN_PROGRESS'].includes(request.status),
      ).length,
      helpRequests: p.helpRequests.map((request) => ({
        id: request.id,
        title: request.title,
        category: request.category,
        categoryLabel: request.category
          .replaceAll('_', ' ')
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
          .replace('Testing Support Location', 'Testing Support / Location'),
        description: request.description,
        contact: request.contact ?? '',
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        createdByName: request.createdBy.displayName,
        resolutionSummary: request.resolutionSummary ?? '',
        resolvedAt: request.resolvedAt?.toISOString() ?? '',
        resolvedByName: request.resolvedBy?.displayName ?? '',
      })),
      documentationAvailability: p.documentationAvailability,
      documentationLabel:
        DOCUMENTATION_LABELS[p.documentationAvailability as DocumentationValue],
      executiveSummaryPlainLanguage:
        p.executiveSummaryPlainLanguage ?? p.executiveSummary,
      problemPlainLanguage:
        p.problemPlainLanguage ?? p.problemLinks[0]?.problem.title ?? '',
      solutionPlainLanguage: p.solutionPlainLanguage ?? p.solutionApproach,
      impactPlainLanguage: p.impactPlainLanguage ?? p.keyAdvantage ?? '',
      aiContextNotes: p.aiContextNotes ?? '',
      scope: p.scope ?? p.detailedDescription,
      outOfScope: p.outOfScope ?? '',
      intendedUsers: p.intendedUsers ?? '',
      successCriteria: p.successCriteria ?? '',
      constraints: p.constraints ?? p.keyLimitation ?? '',
      assumptions: p.assumptions ?? '',
      architectureSummary: p.architectureSummary ?? '',
      methodologySummary: p.methodologySummary ?? '',
      decisionsSummary: p.decisionsSummary ?? '',
      openIssues: p.openIssues ?? '',
      nextStep:
        p.nextStep ??
        'Review current evidence and plan the next evaluation milestone.',
      keyRisk: p.keyRisk ?? p.keyLimitation ?? '',
      leadershipAction:
        p.leadershipAction ?? 'No leadership action required at this time.',
      originatorContact: p.originatorContact ?? p.leadUnit.name,
      accessInstructions: p.accessInstructions ?? '',
      tone: tones[p.maturity] ?? 'blue',
      solutionApproach: p.solutionApproach,
      keyAdvantage: p.keyAdvantage ?? '',
      keyLimitation: p.keyLimitation ?? '',
      latestResult: p.latestResult ?? '',
      createdByUserId: p.createdByUserId,
      createdByName: p.createdBy?.displayName ?? 'Unknown creator',
      team: p.userMemberships.map((membership) => ({
        userId: membership.user.id,
        trackingId: membership.user.trackingId,
        displayName: membership.user.displayName,
        identifier: membership.user.identifier,
        title: membership.user.title ?? '',
        status: membership.user.status,
        primaryUnit: membership.user.primaryUnit?.name ?? 'No primary Unit',
        role: membership.role,
      })),
      problems: p.problemLinks.map((x) => ({
        id: x.problem.trackingId,
        title: x.problem.title,
        isPrimary: x.isPrimary,
      })),
      units: p.unitLinks.map((x) => ({
        id: x.unit.trackingId,
        name: x.unit.name,
        role: x.role,
      })),
      tags: p.tags.map((x) => x.tag.name),
      locations: p.locations.map(
        (x) => `${x.location.name}, ${x.location.region}`,
      ),
      phases: p.phases.map((x) => ({
        id: x.id,
        name: x.phaseName,
        status: x.status,
        completion: x.completion,
        summary: x.technicalSummary,
        result: x.result ?? '',
        objective: x.objective,
        executiveSummary: x.executiveSummary,
        accomplishment: x.accomplishment ?? '',
        blocker: x.blocker ?? '',
        risk: x.risk ?? '',
        nextAction: x.nextAction ?? '',
        startedAt: x.startedAt?.toISOString() ?? '',
        completedAt: x.completedAt?.toISOString() ?? '',
      })),
      updates: p.updates.map((x) => ({
        id: x.id,
        occurredAt: x.occurredAt.toISOString(),
        summary: x.summary,
        result: x.result,
        nextStep: x.nextStep,
        blockerRisk: x.blockerRisk ?? '',
        authorId: x.author.trackingId,
        authorName: x.author.displayName,
        phaseName: x.phase?.phaseName ?? '',
        statusAfter: x.statusAfter ?? '',
        maturityAfter: x.maturityAfter ?? '',
        completionAfter: x.completionAfter,
        maturityEvidenceEvent: x.maturityEvidenceEvent ?? '',
        maturityEvidenceDate: x.maturityEvidenceDate?.toISOString() ?? '',
        maturityEvidenceReference: x.maturityEvidenceReference ?? '',
      })),
      lessons: p.lessons.map((x) => ({
        id: x.trackingId,
        title: x.title,
        finding: x.finding,
        recommendation: x.recommendation,
        lessonType: x.lessonType,
        lessonTypeLabel: x.lessonType
          .replaceAll('_', ' ')
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        date: x.date.toISOString(),
        phaseName: x.phase?.phaseName ?? '',
        authorName: x.createdBy?.displayName ?? 'Unknown recorder',
        sourceUpdateId: x.sourceUpdateId,
      })),
      repositories: p.repositories.map((x) => ({
        id: x.id,
        name: x.name,
        url: x.url,
        description: x.description,
        artifactType: x.artifactType ?? 'Repository',
        documentationAvailability: x.documentationAvailability,
        documentationLabel:
          DOCUMENTATION_LABELS[
            x.documentationAvailability as DocumentationValue
          ],
        includeInAiHandoff: x.includeInAiHandoff,
        phaseName: x.phase?.phaseName ?? '',
      })),
      vendor: p.vendorDetail
        ? {
            vendorName: p.vendorDetail.vendorName,
            productName: p.vendorDetail.productName,
            productUrl: p.vendorDetail.productUrl ?? '',
            commercialAvailability: p.vendorDetail.commercialAvailability ?? '',
            estimatedUnitCost: p.vendorDetail.estimatedUnitCost ?? '',
            estimatedTotalCost: p.vendorDetail.estimatedTotalCost ?? '',
            procurementStatus: p.vendorDetail.procurementStatus ?? '',
            evaluationStatus: p.vendorDetail.evaluationStatus ?? '',
            quantityEvaluated: p.vendorDetail.quantityEvaluated ?? '',
            evaluationObjective: p.vendorDetail.evaluationObjective ?? '',
            integrationRequirements:
              p.vendorDetail.integrationRequirements ?? '',
            sustainmentNotes: p.vendorDetail.sustainmentNotes ?? '',
            evaluationResult: p.vendorDetail.evaluationResult ?? '',
            recommendation: p.vendorDetail.recommendation ?? '',
          }
        : null,
      tactic: p.tacticDetail
        ? {
            techniqueTitle: p.tacticDetail.techniqueTitle,
            techniqueDescription: p.tacticDetail.techniqueDescription,
            conditionsForUse: p.tacticDetail.conditionsForUse ?? '',
            preconditions: p.tacticDetail.preconditions ?? '',
            requiredEquipment: p.tacticDetail.requiredEquipment ?? '',
            requiredTraining: p.tacticDetail.requiredTraining ?? '',
            demonstratedEffect: p.tacticDetail.demonstratedEffect ?? '',
            limitations: p.tacticDetail.limitations ?? '',
            validationEvent: p.tacticDetail.validationEvent ?? '',
            applicableEnvironments: p.tacticDetail.applicableEnvironments ?? '',
            recommendation: p.tacticDetail.recommendation ?? '',
          }
        : null,
      training: p.trainingDetail
        ? {
            trainingObjective: p.trainingDetail.trainingObjective,
            intendedAudience: p.trainingDetail.intendedAudience,
            prerequisites: p.trainingDetail.prerequisites ?? '',
            trainingMethod: p.trainingDetail.trainingMethod ?? '',
            trainingMaterials: p.trainingDetail.trainingMaterials ?? '',
            validationMethod: p.trainingDetail.validationMethod ?? '',
            observedEffect: p.trainingDetail.observedEffect ?? '',
            recurringFrequency: p.trainingDetail.recurringFrequency ?? '',
          }
        : null,
    })),
    units: units.map((u) => ({
      dbId: u.id,
      id: u.trackingId,
      name: u.name,
      abbreviation: u.abbreviation,
      type: u.unitType,
      location: u.location
        ? `${u.location.name}, ${u.location.region}`
        : 'Location unavailable',
      latitude: u.location?.latitude ?? 0,
      longitude: u.location?.longitude ?? 0,
      capabilities: u.capabilities.map((x) => x.tag.name),
      projectIds: u.projectLinks.map((x) => x.project.trackingId),
      isActive: u.isActive,
      forgePointOfContact: u.forgePointOfContact ?? '',
      parentOrganization: u.parentOrganization ?? '',
      hasLocation: Boolean(u.location),
    })),
    activities: activities.map((a) => ({
      id: a.id,
      description: a.description,
      eventType: a.eventType,
      timestamp: a.timestamp.toISOString(),
      actor: a.actor ?? 'System',
    })),
    helpRequests: helpRequests.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      projectName: h.project.name,
      unitName: h.project.leadUnit.name,
      createdAt: h.createdAt.toISOString(),
      projectId: h.project.trackingId,
      category: h.category,
      categoryLabel: h.category
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .replace('Testing Support Location', 'Testing Support / Location'),
      status: h.status,
      contact: h.contact ?? '',
      problemIds: h.project.problemLinks.map((link) => link.problem.trackingId),
    })),
    session: {
      currentUser: currentUser
        ? {
            id: currentUser.id,
            trackingId: currentUser.trackingId,
            displayName: currentUser.displayName,
            role: currentUser.role,
            status: currentUser.status,
            administeredUnitIds: currentUser.administeredUnitIds,
            projectIds: currentUser.projectIds,
          }
        : null,
      devSwitcherEnabled: isDevUserSwitcherEnabled(),
      availableUsers,
    },
    needsAttention,
    directoryUsers: directoryUsers.map((user) => ({
      id: user.id,
      trackingId: user.trackingId,
      displayName: user.displayName,
      identifier: user.identifier,
      role: user.role,
      status: user.status,
      primaryUnit: user.primaryUnit?.name ?? 'No primary Unit',
      unitIds: user.unitMemberships.map((item) => item.unitId),
      administeredUnitIds: user.unitMemberships
        .filter((item) => item.isAdmin)
        .map((item) => item.unitId),
      memberships: user.unitMemberships.map((item) => ({
        unitId: item.unitId,
        unitTrackingId: item.unit.trackingId,
        unitName: item.unit.name,
        isPrimary: item.isPrimary,
        isAdmin: item.isAdmin,
      })),
      projectsLed: projects
        .filter((project) =>
          project.userMemberships.some(
            (membership) =>
              membership.userId === user.id &&
              membership.role === 'PROJECT_LEAD',
          ),
        )
        .map((project) => ({
          id: project.trackingId,
          name: project.name,
          status: project.status,
          maturity: project.maturity,
          lastMeaningfulActivityAt: (
            project.lastMeaningfulActivityAt ?? project.createdAt
          ).toISOString(),
        })),
      projectsContributed: projects
        .filter((project) =>
          project.userMemberships.some(
            (membership) =>
              membership.userId === user.id &&
              membership.role === 'CONTRIBUTOR',
          ),
        )
        .map((project) => ({
          id: project.trackingId,
          name: project.name,
          status: project.status,
          maturity: project.maturity,
          lastMeaningfulActivityAt: (
            project.lastMeaningfulActivityAt ?? project.createdAt
          ).toISOString(),
        })),
      openHelpRequests: projects.flatMap((project) =>
        project.helpRequests
          .filter(
            (request) =>
              ['OPEN', 'IN_PROGRESS'].includes(request.status) &&
              request.contactUserId === user.id,
          )
          .map((request) => ({
            id: request.id,
            title: request.title,
            projectId: project.trackingId,
            followsProjectLead: request.followsProjectLead,
          })),
      ),
      warnings: [
        ...projects
          .filter(
            (project) =>
              activeStatuses.has(project.status) &&
              project.userMemberships.some(
                (membership) =>
                  membership.userId === user.id &&
                  membership.role === 'PROJECT_LEAD',
              ),
          )
          .map((project) => `Leads active work: ${project.trackingId}`),
        ...user.unitMemberships
          .filter(
            (membership) =>
              membership.isAdmin &&
              directoryUsers.filter(
                (person) =>
                  person.status === 'ACTIVE' &&
                  person.unitMemberships.some(
                    (candidate) =>
                      candidate.unitId === membership.unitId &&
                      candidate.isAdmin,
                  ),
              ).length === 1,
          )
          .map(
            (membership) =>
              `Last active Unit Administrator for ${membership.unit.name}`,
          ),
      ],
    })),
    projectDirectoryUsers: projectDirectoryUsers.map((user) => ({
      id: user.id,
      trackingId: user.trackingId,
      displayName: user.displayName,
      identifier: user.identifier,
      title: user.title ?? '',
      status: user.status,
      primaryUnit: user.primaryUnit?.name ?? 'No primary Unit',
      primaryUnitId: user.primaryUnitId,
    })),
    submissions: submissions.map((item) => ({
      id: item.id,
      trackingId: item.trackingId,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      submitter: item.submitter.displayName,
      unit: item.unit?.name ?? 'No Unit',
      unitId: item.unitId,
      createdAt: item.createdAt.toISOString(),
      relatedProblemId: item.relatedProblem?.trackingId ?? '',
      matches: findRelatedProblems(
        {
          title: item.title,
          description: item.description,
          category: item.category,
        },
        problems.map((problem) => ({
          dbId: problem.id,
          id: problem.trackingId,
          title: problem.title,
          description: problem.shortDescription,
          category: problem.category,
          status: problem.status,
          tags: problem.tags.map((tag) => tag.tag.name),
        })),
      ),
    })),
  };
}
