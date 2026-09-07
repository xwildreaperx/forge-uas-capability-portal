import type { PortalProject } from '../data/types.ts';

export function filterProjects(projects: PortalProject[], filters: { query?: string; maturity?: string; capability?: string; location?: string; status?: string }) {
  const query = filters.query?.trim().toLowerCase();
  return projects.filter(project =>
    (!query || `${project.id} ${project.name} ${project.unit} ${project.tags.join(' ')}`.toLowerCase().includes(query)) &&
    (!filters.maturity || filters.maturity === 'All' || project.maturity === filters.maturity) &&
    (!filters.capability || filters.capability === 'All capabilities' || project.tags.includes(filters.capability)) &&
    (!filters.location || filters.location === 'All locations' || project.locations.includes(filters.location)) &&
    (!filters.status || filters.status === 'All statuses' || project.status === filters.status)
  );
}
