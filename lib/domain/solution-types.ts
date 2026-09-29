export const SOLUTION_TYPE_LABELS = {
  ORGANIC_DEVELOPMENT: 'Organic Development',
  VENDOR_SOLUTION: 'Vendor Solution',
  TACTIC_TECHNIQUE: 'Tactic / Technique',
  TRAINING: 'Training',
  INTEGRATION_CONFIGURATION: 'Integration / Configuration',
  PROCESS_POLICY: 'Process / Policy',
  HYBRID: 'Hybrid',
} as const;

export type SolutionTypeValue = keyof typeof SOLUTION_TYPE_LABELS;
export const SOLUTION_TYPES = Object.entries(SOLUTION_TYPE_LABELS) as [
  SolutionTypeValue,
  string,
][];

export function solutionType(value: unknown): SolutionTypeValue {
  if (typeof value === 'string' && value in SOLUTION_TYPE_LABELS)
    return value as SolutionTypeValue;
  return 'ORGANIC_DEVELOPMENT';
}
