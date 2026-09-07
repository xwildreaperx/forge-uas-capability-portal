export type PortalProject = {
  id: string;
  name: string;
  unit: string;
  unitId: string;
  maturity: string;
  progress: number;
  status: string;
  solutionType: string;
  solutionTypeLabel: string;
  updatedAt: string;
  outcome: string;
  documentationAvailability: string;
  documentationLabel: string;
  executiveSummaryPlainLanguage: string;
  problemPlainLanguage: string;
  solutionPlainLanguage: string;
  impactPlainLanguage: string;
  aiContextNotes: string;
  scope: string;
  outOfScope: string;
  intendedUsers: string;
  successCriteria: string;
  constraints: string;
  assumptions: string;
  architectureSummary: string;
  methodologySummary: string;
  decisionsSummary: string;
  openIssues: string;
  nextStep: string;
  keyRisk: string;
  leadershipAction: string;
  originatorContact: string;
  accessInstructions: string;
  tone: string;
  solutionApproach: string;
  keyAdvantage: string;
  keyLimitation: string;
  latestResult: string;
  problems: { id: string; title: string; isPrimary: boolean }[];
  units: { id: string; name: string; role: string }[];
  tags: string[];
  locations: string[];
  phases: {
    id: number;
    name: string;
    status: string;
    completion: number;
    summary: string;
    result: string;
  }[];
  lessons: {
    id: string;
    title: string;
    finding: string;
    recommendation: string;
  }[];
  repositories: {
    id: number;
    name: string;
    url: string;
    description: string;
    artifactType: string;
    documentationAvailability: string;
    documentationLabel: string;
    includeInAiHandoff: boolean;
  }[];
  vendor: null | {
    vendorName: string;
    productName: string;
    productUrl: string;
    commercialAvailability: string;
    estimatedUnitCost: string | number;
    estimatedTotalCost: string | number;
    procurementStatus: string;
    evaluationStatus: string;
    quantityEvaluated: string | number;
    evaluationObjective: string;
    integrationRequirements: string;
    sustainmentNotes: string;
    evaluationResult: string;
    recommendation: string;
  };
  tactic: null | {
    techniqueTitle: string;
    techniqueDescription: string;
    conditionsForUse: string;
    preconditions: string;
    requiredEquipment: string;
    requiredTraining: string;
    demonstratedEffect: string;
    limitations: string;
    validationEvent: string;
    applicableEnvironments: string;
    recommendation: string;
  };
  training: null | {
    trainingObjective: string;
    intendedAudience: string;
    prerequisites: string;
    trainingMethod: string;
    trainingMaterials: string;
    validationMethod: string;
    observedEffect: string;
    recurringFrequency: string;
  };
};

export type PortalProblem = {
  dbId: number;
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
  dbId: number;
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
  activities: {
    id: number;
    description: string;
    eventType: string;
    timestamp: string;
    actor: string;
  }[];
  helpRequests: {
    id: number;
    title: string;
    description: string;
    projectName: string;
    unitName: string;
    createdAt: string;
  }[];
};
