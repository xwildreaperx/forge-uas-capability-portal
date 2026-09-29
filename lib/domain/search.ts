import type { PortalProject } from '../data/types.ts';

export function filterProjects(
  projects: PortalProject[],
  filters: {
    query?: string;
    maturity?: string;
    capability?: string;
    location?: string;
    status?: string;
    solutionType?: string;
    vendor?: string;
    procurement?: string;
    recommendation?: string;
  },
) {
  const query = filters.query?.trim().toLowerCase();
  return projects.filter(
    (project) =>
      (!query ||
        `${project.id} ${project.name} ${project.unit} ${project.solutionTypeLabel} ${project.vendor?.vendorName ?? ''} ${project.vendor?.productName ?? ''} ${project.tactic?.techniqueTitle ?? ''} ${project.training?.trainingObjective ?? ''} ${project.tags.join(' ')}`
          .toLowerCase()
          .includes(query)) &&
      (!filters.maturity ||
        filters.maturity === 'All' ||
        project.maturity === filters.maturity) &&
      (!filters.capability ||
        filters.capability === 'All capabilities' ||
        project.tags.includes(filters.capability)) &&
      (!filters.location ||
        filters.location === 'All locations' ||
        project.locations.includes(filters.location)) &&
      (!filters.status ||
        filters.status === 'All statuses' ||
        project.status === filters.status) &&
      (!filters.solutionType ||
        filters.solutionType === 'All solution types' ||
        project.solutionType === filters.solutionType) &&
      (!filters.vendor ||
        filters.vendor === 'All vendors' ||
        project.vendor?.vendorName === filters.vendor) &&
      (!filters.procurement ||
        filters.procurement === 'All procurement statuses' ||
        project.vendor?.procurementStatus === filters.procurement) &&
      (!filters.recommendation ||
        filters.recommendation === 'All recommendations' ||
        project.vendor?.recommendation === filters.recommendation ||
        project.tactic?.recommendation === filters.recommendation),
  );
}
