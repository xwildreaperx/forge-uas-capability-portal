export const DOCUMENTATION_LABELS = {
  AVAILABLE_IN_FORGE: 'Available in FORGE',
  EXTERNAL_REFERENCE: 'External Reference',
  AVAILABLE_FROM_ORIGINATOR: 'Available From Originator',
  CONTROLLED_ACCESS: 'Controlled Access',
  METADATA_ONLY: 'Metadata Only',
  NOT_YET_DOCUMENTED: 'Not Yet Documented',
} as const;
export type DocumentationValue = keyof typeof DOCUMENTATION_LABELS;
export const DOCUMENTATION_OPTIONS = Object.entries(DOCUMENTATION_LABELS) as [
  DocumentationValue,
  string,
][];
export const referenceOnly = (value: string) =>
  [
    'EXTERNAL_REFERENCE',
    'AVAILABLE_FROM_ORIGINATOR',
    'CONTROLLED_ACCESS',
    'METADATA_ONLY',
  ].includes(value);
