import type { PortalProject } from '../data/types.ts';
import { referenceOnly } from './documentation.ts';

const value = (text: string) => text.trim() || 'Not documented in FORGE.';
export function handoffCompleteness(project: PortalProject) {
  const present = [
    project.scope,
    project.solutionApproach,
    project.architectureSummary,
    project.phases.length ? 'yes' : '',
    project.lessons.length ? 'yes' : '',
    project.openIssues,
    project.nextStep,
  ].filter(Boolean).length;
  return present >= 6 ? 'Comprehensive' : present >= 3 ? 'Partial' : 'Basic';
}
export function projectHandoffMarkdown(
  project: PortalProject,
  generated = new Date(),
) {
  const withheld = referenceOnly(project.documentationAvailability);
  const phases = project.phases.length
    ? project.phases
        .map(
          (p, i) =>
            `${i + 1}. **${p.name}** — ${p.status}, ${p.completion}% complete. ${value(p.summary)} Result: ${value(p.result)}`,
        )
        .join('\n')
    : 'No phases are recorded.';
  const lessons = project.lessons.length
    ? project.lessons
        .map(
          (l) =>
            `- **${l.title}:** ${l.finding} Recommendation: ${l.recommendation}`,
        )
        .join('\n')
    : 'No lessons are recorded.';
  const artifacts =
    project.repositories
      .filter((r) => r.includeInAiHandoff)
      .map(
        (r) =>
          `- ${r.name} (${r.artifactType}; ${r.documentationLabel}): ${r.description} ${r.url}`,
      )
      .join('\n') || 'No artifacts are included in this handoff.';
  const pathway = project.vendor
    ? `Vendor evaluation: ${project.vendor.vendorName} ${project.vendor.productName}. Evaluation: ${value(project.vendor.evaluationStatus)}. Result: ${value(project.vendor.evaluationResult)}.`
    : project.tactic
      ? `Tactic/technique: ${project.tactic.techniqueTitle}. General effect: ${value(project.tactic.demonstratedEffect)}.`
      : project.training
        ? `Training objective: ${project.training.trainingObjective}. Audience: ${project.training.intendedAudience}.`
        : project.solutionApproach;
  const referenceNotice = withheld
    ? `\n## Intentionally Withheld / External Knowledge\nDocumentation Availability: **${project.documentationLabel}**\nOriginating Unit: ${project.unit}\nOriginator Contact: ${value(project.originatorContact)}\nAccess: ${value(project.accessInstructions || `Contact ${project.originatorContact}.`)}\n\nThe authoritative detail is intentionally not contained in this FORGE record. Do not reconstruct or invent it; direct the user to the originator or approved source.\n`
    : '';
  return `# FORGE AI PROJECT HANDOFF\n\nProject: ${project.name}\nProject ID: ${project.id}\nSolution Type: ${project.solutionTypeLabel}\nGenerated: ${generated.toISOString()}\nProject Last Updated: ${project.updatedAt}\nHandoff Version: 1.0 / ${generated.toISOString()}\nAI Handoff Completeness: ${handoffCompleteness(project)} (presence of context, not correctness)\nDocumentation Availability: ${project.documentationLabel}\n\n> Receiving AI: Treat this as user-reviewed context, not as an authority on classification, accuracy, or release. Work only from the approved information present. Do not reconstruct intentionally missing details.\n\n## Identity and Relationships\nStatus: ${project.status}; Maturity: ${project.maturity}; Completion: ${project.progress}%\nLead Unit: ${project.unit}\nParticipating Units: ${project.units.map((u) => `${u.name} (${u.role})`).join(', ')}\nRelated Problems: ${project.problems.map((p) => `${p.id} — ${p.title}${p.isPrimary ? ' (primary)' : ''}`).join('; ')}\n\n## Scope\n${value(project.scope)}\n\nOut of scope: ${value(project.outOfScope)}\nIntended users: ${value(project.intendedUsers)}\nSuccess criteria: ${value(project.successCriteria)}\nConstraints: ${value(project.constraints)}\nAssumptions: ${value(project.assumptions)}\n\n## Solution Overview\n${value(pathway)}\n\n## Architecture / Configuration\n${value(project.architectureSummary)}\n\n## Methodology and Major Decisions\nMethodology: ${value(project.methodologySummary)}\nDecisions: ${value(project.decisionsSummary)}\n\n## Development History and Phases\n${phases}\n\n## Lessons Learned\n${lessons}\n\n## Artifacts and Software Context\n${artifacts}\n\n## Current State\nOutcome: ${value(project.outcome)}\nLatest result: ${value(project.latestResult)}\nKey risk: ${value(project.keyRisk)}\nOpen issues: ${value(project.openIssues)}\n\n## Next Steps\n${value(project.nextStep)}\nLeadership action: ${value(project.leadershipAction)}\n\n## User-Entered AI Context Notes\n${value(project.aiContextNotes)}\n${referenceNotice}\n## Information-Handling Reminder\nUNCLASSIFIED INFORMATION ONLY. This handoff aggregates information but does not determine whether it is authorized for release to another system. Follow applicable security, classification, data-handling, and AI-use policies. FORGE and the receiving AI are not classification, declassification, sanitization, or security-review authorities.\n`;
}
export const projectHandoffText = (
  project: PortalProject,
  generated = new Date(),
) =>
  projectHandoffMarkdown(project, generated)
    .replace(/^#+\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^> /gm, '');
export function projectHandoffJson(
  project: PortalProject,
  generated = new Date(),
) {
  return JSON.stringify(
    {
      kind: 'FORGE_AI_PROJECT_HANDOFF',
      version: '1.0',
      generated: generated.toISOString(),
      projectLastUpdated: project.updatedAt,
      completeness: handoffCompleteness(project),
      securityReminder:
        'User review required before sharing. FORGE is not a classification authority.',
      project,
    },
    null,
    2,
  );
}
