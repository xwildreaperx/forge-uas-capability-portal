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
const administrativeActivityCategory = (eventType: string) =>
  eventType.startsWith('PROBLEM_') || eventType.startsWith('SUBMISSION_')
    ? 'Problem Governance'
    : eventType.startsWith('TAG_')
      ? 'Taxonomy Governance'
      : eventType.startsWith('USER_')
        ? 'User Administration'
        : eventType.includes('ADMIN')
          ? 'Role / Permission'
          : eventType.startsWith('UNIT_')
            ? 'Unit Administration'
            : eventType.includes('HELP') ||
                eventType.includes('LEAD') ||
                eventType.includes('RELATIONSHIP')
              ? 'Project Recovery'
              : 'Project Knowledge';

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
    tagInventory,
    locations,
  ] = await Promise.all([
    db.problem.findMany({
      orderBy: { trackingId: 'asc' },
      include: {
        projectLinks: {
          select: { project: { select: { trackingId: true } } },
        },
        unitLinks: true,
        tags: { select: { tag: { select: { name: true } } } },
        steward: { select: { id: true, displayName: true, status: true } },
        supersededBy: { select: { id: true, trackingId: true, title: true } },
        outgoingRelationships: {
          include: {
            targetProblem: { select: { trackingId: true, title: true } },
          },
        },
        incomingRelationships: {
          include: {
            sourceProblem: { select: { trackingId: true, title: true } },
          },
        },
      },
    }),
    db.project.findMany({
      orderBy: { trackingId: 'asc' },
      include: {
        leadUnit: { select: { trackingId: true, name: true, isActive: true } },
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
            unit: { select: { id: true, trackingId: true, name: true } },
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
    db.activityEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, displayName: true } },
        subjectUser: { select: { id: true, displayName: true } },
        unit: { select: { trackingId: true, name: true } },
        project: { select: { trackingId: true, name: true } },
        problem: { select: { trackingId: true, title: true } },
      },
    }),
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
          include: {
            submitter: true,
            unit: true,
            relatedProblem: true,
            reviews: {
              orderBy: { createdAt: 'asc' },
              include: { reviewer: true },
            },
          },
        })
      : Promise.resolve([]),
    currentUser
      ? db.user.findMany({
          orderBy: { displayName: 'asc' },
          include: { primaryUnit: true },
        })
      : Promise.resolve([]),
    currentUser?.role === 'SYSTEM_ADMIN'
      ? db.tag.findMany({
          orderBy: { name: 'asc' },
          include: {
            problems: {
              include: {
                problem: { select: { trackingId: true, title: true } },
              },
            },
            projects: {
              include: {
                project: { select: { trackingId: true, name: true } },
              },
            },
            units: {
              include: { unit: { select: { trackingId: true, name: true } } },
            },
            lessons: {
              include: {
                lesson: { select: { trackingId: true, title: true } },
              },
            },
            _count: {
              select: {
                problems: true,
                projects: true,
                units: true,
                lessons: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    currentUser?.role === 'SYSTEM_ADMIN'
      ? db.location.findMany({
          orderBy: { name: 'asc' },
          include: {
            units: { select: { trackingId: true, name: true } },
            projects: {
              include: {
                project: { select: { trackingId: true, name: true } },
              },
            },
            problems: {
              include: {
                problem: { select: { trackingId: true, title: true } },
              },
            },
          },
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
  const platformIntegrity: PortalData['platformIntegrity'] = [];
  const systemAdmins = directoryUsers.filter(
    (person) => person.role === 'SYSTEM_ADMIN',
  );
  const activeSystemAdmins = systemAdmins.filter(
    (person) => person.status === 'ACTIVE',
  );
  if (currentUser?.role === 'SYSTEM_ADMIN') {
    const validProblemStatuses = new Set([
      'Open',
      'Under Review',
      'Addressed — Viable Efforts Exist',
      'Closed',
      'Superseded',
    ]);
    const validProblemPriorities = new Set([
      'Unprioritized',
      'Low',
      'Medium',
      'High',
      'Critical',
    ]);
    for (const problem of problems) {
      const invalid =
        !problem.title.trim() ||
        !problem.shortDescription.trim() ||
        !problem.detailedDescription.trim() ||
        !problem.problemStatement.trim() ||
        !problem.category.trim() ||
        !validProblemStatuses.has(problem.status) ||
        !validProblemPriorities.has(problem.priority) ||
        (problem.status === 'Superseded' && !problem.supersededById);
      if (invalid)
        platformIntegrity.push({
          key: `problem-${problem.id}`,
          kind: 'INVALID_CANONICAL_PROBLEM',
          severity: 'action',
          message: `${problem.trackingId} has invalid or incomplete canonical governance data.`,
          remediation:
            'Correct the controlled lifecycle, priority, successor, or required descriptive fields.',
          entityType: 'PROBLEM',
          entityId: problem.trackingId,
          href: `/problems/${problem.trackingId}`,
        });
      if (problem.priority === 'Unprioritized' || !problem.stewardUserId)
        needsAttention.push({
          key: `problem-refinement-${problem.id}`,
          kind: 'PROBLEM_NEEDS_REFINEMENT',
          severity: 'warning',
          message: `${problem.trackingId} needs ${problem.priority === 'Unprioritized' ? 'priority review' : 'a named steward'}.`,
          unitId: null,
          projectId: '',
          userId: problem.stewardUserId,
        });
    }
    for (const unit of units)
      if (
        !unit.name.trim() ||
        !unit.abbreviation.trim() ||
        !unit.unitType.trim()
      )
        platformIntegrity.push({
          key: `unit-canonical-${unit.id}`,
          kind: 'INVALID_CANONICAL_UNIT',
          severity: 'action',
          message: `${unit.trackingId} has incomplete canonical identity data.`,
          remediation:
            'Correct the Unit name, abbreviation, and controlled type.',
          entityType: 'UNIT',
          entityId: unit.trackingId,
          href: `/units/${unit.trackingId}`,
        });
  }
  if (currentUser?.role === 'SYSTEM_ADMIN' && activeSystemAdmins.length === 1)
    needsAttention.push({
      key: 'single-active-system-admin',
      kind: 'ONLY_ONE_ACTIVE_SYSTEM_ADMIN',
      severity: 'warning',
      message:
        'Only one active System Administrator remains. Add and verify another trusted System Administrator to reduce platform lockout risk.',
      unitId: null,
      projectId: '',
      userId: activeSystemAdmins[0]!.id,
    });
  for (const unit of units.filter(
    (item) => visibleUnitIds.includes(item.id) && item.isActive,
  )) {
    const activeAdmins = directoryUsers.filter(
      (person) =>
        person.status === 'ACTIVE' &&
        person.role === 'UNIT_ADMIN' &&
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
    if (project.leadUnitTransferPending)
      needsAttention.push({
        key: `lead-unit-transfer-${project.id}`,
        kind: 'RECEIVING_UNIT_TRANSFER_REVIEW',
        severity: 'warning',
        message: `${project.trackingId} — ${project.name} was transferred to ${project.leadUnit.name} and awaits receiving-Unit review.`,
        unitId: project.leadUnitId,
        projectId: project.trackingId,
        userId: null,
      });
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
  for (const person of directoryUsers.filter(
    (item) => item.status === 'DISABLED',
  )) {
    const responsibilityProjects = projects.filter(
      (project) =>
        activeStatuses.has(project.status) &&
        project.userMemberships.some(
          (membership) => membership.userId === person.id,
        ),
    );
    const contactRequests = projects.flatMap((project) =>
      project.helpRequests.filter(
        (request) =>
          ['OPEN', 'IN_PROGRESS'].includes(request.status) &&
          request.contactUserId === person.id,
      ),
    );
    if (responsibilityProjects.length || contactRequests.length)
      for (const unitId of person.unitMemberships
        .map((membership) => membership.unitId)
        .filter((id) => visibleUnitIds.includes(id)))
        needsAttention.push({
          key: `disabled-responsibility-${unitId}-${person.id}`,
          kind: 'DISABLED_USER_RESPONSIBILITIES',
          severity: 'critical',
          message: `${person.displayName} is disabled with ${responsibilityProjects.length} current Project responsibility assignment${responsibilityProjects.length === 1 ? '' : 's'} and ${contactRequests.length} open Help contact${contactRequests.length === 1 ? '' : 's'}.`,
          unitId,
          projectId: responsibilityProjects[0]?.trackingId ?? '',
          userId: person.id,
        });
  }
  if (currentUser?.role === 'SYSTEM_ADMIN') {
    for (const person of directoryUsers) {
      const scopes = person.unitMemberships.filter((item) => item.isAdmin);
      const activeScopes = scopes.filter((scope) =>
        units.some((unit) => unit.id === scope.unitId && unit.isActive),
      );
      if (person.role === 'UNIT_ADMIN' && !activeScopes.length) {
        const message = `${person.displayName} has the Unit Administrator role but no administered Unit.`;
        needsAttention.push({
          key: `unit-admin-no-scope-${person.id}`,
          kind: 'UNIT_ADMIN_WITHOUT_SCOPE',
          severity: 'critical',
          message,
          unitId: person.primaryUnitId,
          projectId: '',
          userId: person.id,
        });
        platformIntegrity.push({
          key: `unit-admin-no-scope-${person.id}`,
          kind: 'UNIT_ADMIN_WITHOUT_SCOPE',
          severity: 'action',
          message,
          remediation: 'Assign an administered Unit or change the user role.',
          entityType: 'USER',
          entityId: person.trackingId,
          href: '#responsibility-directory',
        });
      }
      if (
        !['UNIT_ADMIN', 'SYSTEM_ADMIN'].includes(person.role) &&
        scopes.length
      ) {
        const message = `${person.displayName} retains Unit Administrator scope without an administrator role.`;
        needsAttention.push({
          key: `non-admin-scope-${person.id}`,
          kind: 'NON_ADMIN_WITH_ADMIN_SCOPE',
          severity: 'critical',
          message,
          unitId: scopes[0]!.unitId,
          projectId: '',
          userId: person.id,
        });
        platformIntegrity.push({
          key: `non-admin-scope-${person.id}`,
          kind: 'NON_ADMIN_WITH_ADMIN_SCOPE',
          severity: 'action',
          message,
          remediation:
            'Remove the administered-Unit scope or restore the intended role.',
          entityType: 'USER',
          entityId: person.trackingId,
          href: '#responsibility-directory',
        });
      }
      for (const scope of scopes.filter((item) =>
        units.some((unit) => unit.id === item.unitId && !unit.isActive),
      ))
        platformIntegrity.push({
          key: `inactive-admin-scope-${person.id}-${scope.unitId}`,
          kind: 'ADMIN_SCOPE_ON_INACTIVE_UNIT',
          severity: 'review',
          message: `${person.displayName} retains administrator scope for an inactive Unit.`,
          remediation:
            'Review whether the Unit should be reactivated, the user reassigned, or the scope removed.',
          entityType: 'USER',
          entityId: person.trackingId,
          href: '#responsibility-directory',
        });
    }
  }
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

  if (currentUser?.role === 'SYSTEM_ADMIN') {
    for (const project of projects) {
      const active = activeStatuses.has(project.status);
      const lead = project.userMemberships.find(
        (member) => member.role === 'PROJECT_LEAD',
      );
      const maintainers = project.userMemberships.filter(
        (member) => member.user.status === 'ACTIVE',
      );
      const participatingLead = project.unitLinks.some(
        (link) => link.unit.id === project.leadUnitId,
      );
      const addProjectFinding = (
        kind: string,
        message: string,
        remediation: string,
      ) =>
        platformIntegrity.push({
          key: `${kind}-${project.id}`,
          kind,
          severity: 'action',
          message,
          remediation,
          entityType: 'PROJECT',
          entityId: project.trackingId,
          href: `/projects/${project.trackingId}`,
        });
      if (!project.problemLinks.length)
        addProjectFinding(
          'PROJECT_WITHOUT_PROBLEM',
          `${project.trackingId} has no canonical Problem.`,
          'Open Project Relationships and add a canonical Problem.',
        );
      if (!participatingLead)
        addProjectFinding(
          'LEAD_UNIT_NOT_PARTICIPATING',
          `${project.trackingId}'s Lead Unit is not a participating Unit.`,
          'Open Project Relationships and restore the Lead Unit relationship.',
        );
      if (active && !project.leadUnit.isActive) {
        const message = `${project.trackingId} is active while its Lead Unit, ${project.leadUnit.name}, is inactive.`;
        addProjectFinding(
          'INACTIVE_LEAD_UNIT',
          message,
          'Transfer Lead Unit responsibility or reactivate the Unit.',
        );
        needsAttention.push({
          key: `inactive-lead-unit-${project.id}`,
          kind: 'INACTIVE_UNIT_LEADS_ACTIVE_PROJECT',
          severity: 'critical',
          message,
          unitId: project.leadUnitId,
          projectId: project.trackingId,
          userId: lead?.userId ?? null,
        });
      }
      if (active && (!lead || lead.user.status !== 'ACTIVE'))
        addProjectFinding(
          'INACTIVE_PROJECT_LEAD',
          `${project.trackingId} has no active Project Lead.`,
          'Open Manage Team and assign an active Project Lead.',
        );
      if (active && !maintainers.length)
        addProjectFinding(
          'NO_ACTIVE_MAINTAINER',
          `${project.trackingId} has no active maintainer.`,
          'Open Manage Team and assign an active maintainer.',
        );
      for (const request of project.helpRequests.filter((item) =>
        ['OPEN', 'IN_PROGRESS'].includes(item.status),
      )) {
        if (
          (!request.contact && !request.contactUserId) ||
          (request.contactUser && request.contactUser.status !== 'ACTIVE')
        )
          platformIntegrity.push({
            key: `help-contact-${request.id}`,
            kind: 'INVALID_HELP_CONTACT',
            severity: 'action',
            message: `Help Request “${request.title}” does not have an active contact.`,
            remediation:
              'Open the Project and correct the Help Request contact.',
            entityType: 'HELP_REQUEST',
            entityId: String(request.id),
            href: `/projects/${project.trackingId}#help-requests`,
          });
      }
    }
    for (const person of directoryUsers.filter(
      (item) => item.status === 'ACTIVE' && item.primaryUnitId,
    )) {
      const primary = units.find((unit) => unit.id === person.primaryUnitId);
      if (primary && !primary.isActive)
        platformIntegrity.push({
          key: `inactive-primary-unit-${person.id}`,
          kind: 'ACTIVE_USER_IN_INACTIVE_UNIT',
          severity: 'review',
          message: `${person.displayName}'s Primary Unit is inactive.`,
          remediation: 'Transfer the user or reactivate the Unit.',
          entityType: 'USER',
          entityId: person.trackingId,
          href: '#responsibility-directory',
        });
    }
  }

  for (const unitId of visibleUnitIds) {
    const associated = projects.filter(
      (project) =>
        project.leadUnitId === unitId ||
        project.unitLinks.some((link) => link.unit.id === unitId),
    );
    for (const project of associated.filter((item) =>
      activeStatuses.has(item.status),
    )) {
      if (project.status === 'Paused')
        needsAttention.push({
          key: `paused-${unitId}-${project.id}`,
          kind: 'PROJECT_PAUSED',
          severity: 'warning',
          message: `${project.trackingId} — ${project.name} is paused and should be reviewed for continuity.`,
          unitId,
          projectId: project.trackingId,
          userId: null,
        });
      const blocker = project.updates[0]?.blockerRisk || project.keyRisk;
      if (blocker)
        needsAttention.push({
          key: `blocker-${unitId}-${project.id}`,
          kind: 'CURRENT_BLOCKER_OR_RISK',
          severity: 'warning',
          message: `${project.trackingId} — ${project.name}: ${blocker}`,
          unitId,
          projectId: project.trackingId,
          userId: null,
        });
      for (const request of project.helpRequests.filter((item) =>
        ['OPEN', 'IN_PROGRESS'].includes(item.status),
      ))
        needsAttention.push({
          key: `open-help-${unitId}-${request.id}`,
          kind: 'OPEN_HELP_REQUEST',
          severity: 'warning',
          message: `${project.trackingId} requests help: ${request.title}.`,
          unitId,
          projectId: project.trackingId,
          userId: request.contactUserId,
        });
    }
  }

  const maturityRank = ['Concept', 'Prototype', 'Field Tested', 'Validated'];
  const unitStewardship: PortalData['unitStewardship'] = units
    .filter((unit) => visibleUnitIds.includes(unit.id))
    .map((unit) => {
      const led = projects.filter((project) => project.leadUnitId === unit.id);
      const supported = projects
        .filter(
          (project) =>
            project.leadUnitId !== unit.id &&
            project.unitLinks.some((link) => link.unit.id === unit.id),
        )
        .map((project) => ({
          project,
          role:
            project.unitLinks.find((link) => link.unit.id === unit.id)?.role ??
            'Supporting',
        }));
      const associated = [
        ...led.map((project) => ({ project, relationship: 'LED' as const })),
        ...supported.map(({ project }) => ({
          project,
          relationship: 'SUPPORTED' as const,
        })),
      ];
      const coveredProblems = new Map<
        string,
        { title: string; projects: typeof associated }
      >();
      for (const item of associated)
        for (const link of item.project.problemLinks) {
          const existing = coveredProblems.get(link.problem.trackingId) ?? {
            title: link.problem.title,
            projects: [],
          };
          existing.projects.push(item);
          coveredProblems.set(link.problem.trackingId, existing);
        }
      const projectIds = new Set(associated.map(({ project }) => project.id));
      const unitActivities = activities.filter(
        (activity) =>
          activity.unitId === unit.id ||
          (activity.projectId ? projectIds.has(activity.projectId) : false),
      );
      return {
        unitId: unit.id,
        unitTrackingId: unit.trackingId,
        unitName: unit.name,
        ledProjectIds: led.map((project) => project.trackingId),
        supportedProjects: supported.map(({ project, role }) => ({
          projectId: project.trackingId,
          participationRole: role,
        })),
        problemCoverage: [...coveredProblems.entries()].map(
          ([problemId, coverage]) => ({
            problemId,
            title: coverage.title,
            activeEfforts: coverage.projects.filter(({ project }) =>
              activeStatuses.has(project.status),
            ).length,
            historicalEfforts: coverage.projects.filter(
              ({ project }) => !activeStatuses.has(project.status),
            ).length,
            highestMaturity:
              coverage.projects
                .map(({ project }) => project.maturity)
                .sort(
                  (a, b) => maturityRank.indexOf(b) - maturityRank.indexOf(a),
                )[0] ?? 'No maturity recorded',
            latestOutcome:
              coverage.projects.find(({ project }) => project.outcome)?.project
                .outcome ?? '',
            recentLessons: coverage.projects.reduce(
              (count, { project }) => count + project.lessons.length,
              0,
            ),
          }),
        ),
        helpRequests: associated.flatMap(({ project, relationship }) =>
          project.helpRequests.map((request) => ({
            id: request.id,
            title: request.title,
            category: request.category,
            status: request.status,
            projectId: project.trackingId,
            projectName: project.name,
            projectRelationship: relationship,
            problem: project.problemLinks[0]?.problem.title ?? 'No Problem',
            contact:
              request.contactUser?.displayName ??
              request.contact ??
              'Unassigned',
            createdAt: request.createdAt.toISOString(),
            resolutionSummary: request.resolutionSummary ?? '',
          })),
        ),
        lessons: associated
          .flatMap(({ project, relationship }) =>
            project.lessons.map((lesson) => ({
              id: lesson.trackingId,
              type: lesson.lessonType,
              title: lesson.title,
              finding: lesson.finding,
              projectId: project.trackingId,
              projectName: project.name,
              projectRelationship: relationship,
              author: lesson.createdBy?.displayName ?? 'Unknown recorder',
              date: lesson.date.toISOString(),
              phase: lesson.phase?.phaseName ?? '',
            })),
          )
          .sort((a, b) => b.date.localeCompare(a.date)),
        activities: unitActivities.map((activity) => ({
          id: activity.id,
          description: activity.description,
          eventType: activity.eventType,
          timestamp: activity.timestamp.toISOString(),
          actor: activity.actor ?? 'System',
          category:
            activity.eventType.startsWith('USER_') ||
            activity.eventType.startsWith('UNIT_')
              ? ('UNIT_ADMINISTRATION' as const)
              : ('PROJECT_KNOWLEDGE' as const),
          projectId:
            projects.find((project) => project.id === activity.projectId)
              ?.trackingId ?? '',
        })),
        maturityCounts: Object.fromEntries(
          maturityRank.map((maturity) => [
            maturity,
            associated.filter(({ project }) => project.maturity === maturity)
              .length,
          ]),
        ),
        outcomeCounts: Object.fromEntries(
          [
            'SUCCESSFUL',
            'PARTIALLY_SUCCESSFUL',
            'UNSUCCESSFUL',
            'INCONCLUSIVE',
            'SUPERSEDED',
            'CANCELLED',
          ].map((outcome) => [
            outcome,
            associated.filter(({ project }) => project.outcome === outcome)
              .length,
          ]),
        ),
        lastMeaningfulActivityAt:
          associated
            .map(
              ({ project }) =>
                project.lastMeaningfulActivityAt ?? project.createdAt,
            )
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString() ?? '',
      };
    });

  const visibleActivities = activities.filter((activity) => {
    const administrative =
      administrativeActivityCategory(activity.eventType) !==
      'Project Knowledge';
    if (!administrative || currentUser?.role === 'SYSTEM_ADMIN') return true;
    return (
      currentUser?.role === 'UNIT_ADMIN' &&
      Boolean(
        activity.unitId &&
        currentUser.administeredUnitIds.includes(activity.unitId),
      )
    );
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
      impact: p.impact ?? '',
      owner: p.owner ?? 'Unassigned',
      category: p.category,
      priority: p.priority,
      status: p.status,
      projectIds: p.projectLinks.map((x) => x.project.trackingId),
      unitCount: p.unitLinks.length,
      tags: p.tags.map((x) => x.tag.name),
      stewardUserId: p.stewardUserId,
      steward: p.steward?.displayName ?? '',
      stewardStatus: p.steward?.status ?? '',
      supersededById: p.supersededBy?.trackingId ?? '',
      supersededByTitle: p.supersededBy?.title ?? '',
      relationships: [
        ...p.outgoingRelationships.map((item) => ({
          direction: 'OUTGOING' as const,
          type: item.relationship,
          problemId: item.targetProblem.trackingId,
          title: item.targetProblem.title,
        })),
        ...p.incomingRelationships.map((item) => ({
          direction: 'INCOMING' as const,
          type: item.relationship,
          problemId: item.sourceProblem.trackingId,
          title: item.sourceProblem.title,
        })),
      ],
      governanceHistory: activities
        .filter(
          (item) =>
            item.problemId === p.id &&
            (item.eventType.startsWith('PROBLEM_') ||
              item.eventType.startsWith('SUBMISSION_')),
        )
        .map((item) => ({
          id: item.id,
          eventType: item.eventType,
          description: item.description,
          actor: item.actor ?? 'System',
          timestamp: item.timestamp.toISOString(),
        })),
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
        contactUserId: request.contactUserId,
        contactUserStatus: request.contactUser?.status ?? '',
        followsProjectLead: request.followsProjectLead,
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
      leadUnitTransferPending: p.leadUnitTransferPending,
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
        dbId: x.id,
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
        knowledgeStatus: x.knowledgeStatus,
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
        accessInstructions: x.accessInstructions ?? '',
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
      description: u.description ?? '',
      locationId: u.locationId,
      hasLocation: Boolean(u.location),
    })),
    activities: visibleActivities.map((a) => ({
      id: a.id,
      description: a.description,
      eventType: a.eventType,
      timestamp: a.timestamp.toISOString(),
      actor: a.actor ?? 'System',
      category: administrativeActivityCategory(a.eventType),
      actorUserId: a.user?.id ?? null,
      subjectUserId: a.subjectUser?.id ?? null,
      subjectUserName: a.subjectUser?.displayName ?? '',
      unitId: a.unit?.trackingId ?? '',
      unitName: a.unit?.name ?? '',
      projectId: a.project?.trackingId ?? '',
      projectName: a.project?.name ?? '',
      problemId: a.problem?.trackingId ?? '',
      problemName: a.problem?.title ?? '',
      entityType: a.entityType ?? '',
      entityId: a.entityId ?? '',
      entityHref: a.entityHref ?? '',
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
    platformIntegrity,
    systemAdminContinuity: {
      active: activeSystemAdmins.length,
      pending: systemAdmins.filter((person) => person.status === 'PENDING')
        .length,
      disabled: systemAdmins.filter((person) => person.status === 'DISABLED')
        .length,
    },
    unitStewardship,
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
                  person.role === 'UNIT_ADMIN' &&
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
      role: user.role,
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
      reviews: item.reviews.map((review) => ({
        stage: review.stage,
        decision: review.decision,
        note: review.note ?? '',
        reviewer: review.reviewer.displayName,
        createdAt: review.createdAt.toISOString(),
      })),
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
    tagInventory: tagInventory.map((tag) => ({
      id: tag.id,
      name: tag.name,
      usageCount:
        tag._count.problems +
        tag._count.projects +
        tag._count.units +
        tag._count.lessons,
      problems: tag.problems.map(
        (item) => `${item.problem.trackingId} — ${item.problem.title}`,
      ),
      projects: tag.projects.map(
        (item) => `${item.project.trackingId} — ${item.project.name}`,
      ),
      units: tag.units.map(
        (item) => `${item.unit.trackingId} — ${item.unit.name}`,
      ),
      lessons: tag.lessons.map(
        (item) => `${item.lesson.trackingId} — ${item.lesson.title}`,
      ),
    })),
    locations: locations.map((location) => ({
      id: location.id,
      name: location.name,
      region: location.region ?? '',
      latitude: location.latitude,
      longitude: location.longitude,
      units: location.units.map((item) => `${item.trackingId} — ${item.name}`),
      projects: location.projects.map(
        (item) => `${item.project.trackingId} — ${item.project.name}`,
      ),
      problems: location.problems.map(
        (item) => `${item.problem.trackingId} — ${item.problem.title}`,
      ),
    })),
  };
}
