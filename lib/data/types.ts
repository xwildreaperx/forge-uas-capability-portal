export type PortalProject = {
  id: string;
  name: string;
  unit: string;
  unitId: string;
  maturity: string;
  progress: number;
  status: string;
  tone: string;
  solutionApproach: string;
  keyAdvantage: string;
  keyLimitation: string;
  latestResult: string;
  problems: { id: string; title: string; isPrimary: boolean }[];
  units: { id: string; name: string; role: string }[];
  tags: string[];
  locations: string[];
  phases: { id: number; name: string; status: string; completion: number; summary: string; result: string }[];
  lessons: { id: string; title: string; finding: string; recommendation: string }[];
  repositories: { id: number; name: string; url: string; description: string }[];
};

export type PortalProblem = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  projectIds: string[];
  unitCount: number;
  tags: string[];
};

export type PortalUnit = {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  location: string;
  latitude: number;
  longitude: number;
  capabilities: string[];
  projectIds: string[];
};

export type PortalData = {
  problems: PortalProblem[];
  projects: PortalProject[];
  units: PortalUnit[];
  activities: { id: number; description: string; eventType: string; timestamp: string; actor: string }[];
  helpRequests: { id: number; title: string; description: string; projectName: string; unitName: string; createdAt: string }[];
};
