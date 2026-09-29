export type MatchableProblem = {
  dbId?: number;
  id: string;
  title: string;
  description?: string;
  category: string;
  status?: string;
  tags: string[];
};

export type ProblemMatch = MatchableProblem & {
  score: number;
  classification: 'POSSIBLE_DUPLICATE' | 'RELATED_PROBLEM';
  reasons: string[];
};

const noise = new Set([
  'and', 'are', 'capability', 'doesnt', 'enough', 'gap', 'involving', 'normal',
  'objects', 'reliable', 'systems', 'that', 'the', 'their', 'this', 'when', 'with',
  'work',
]);

const phraseRules: [RegExp, string][] = [
  [/\bair[ -]to[ -]ground\b/g, 'direction_air_ground'],
  [/\bground[ -]to[ -]air\b/g, 'direction_ground_air'],
  [/\bair[ -]to[ -]air\b/g, 'direction_air_air'],
  [/\bground[ -]to[ -]ground\b/g, 'direction_ground_ground'],
  [/\bfixed[ -]wing\b/g, 'airframe_fixed_wing'],
  [/\brotary[ -]wing\b/g, 'airframe_rotary_wing'],
  [/\bground (?:control )?station\b/g, 'gcs'],
  [/\bcontrol[ -]link\b|\brf[ -]control\b/g, 'control_link'],
  [/\bwithout gps\b|\bgps (?:is )?(?:unavailable|denied|doesn'?t work)\b/g, 'gps denied navigation'],
  [/\b(?:does not|doesn'?t) go far enough\b/g, 'range'],
  [/\bunmanned aircraft\b|\bdrones?\b|\buas\b/g, 'uas'],
  [/\bunmanned systems?\b|\buxs\b/g, 'uxs'],
];

const normalizeWord = (word: string) => {
  if (word === 'radio') return 'rf';
  if (['reduced', 'reduces', 'reducing', 'reduction'].includes(word)) return 'reduce';
  if (['identified', 'identifies', 'identifying', 'identification'].includes(word)) return 'identify';
  if (['detected', 'detectable', 'detecting', 'detection'].includes(word)) return 'detect';
  if (['controls', 'controlled', 'controlling'].includes(word)) return 'control';
  if (['navigating', 'navigational'].includes(word)) return 'navigation';
  return word;
};

export function normalizeProblemText(value: string) {
  let normalized = value.toLowerCase().replace(/[’]/g, "'");
  for (const [pattern, replacement] of phraseRules)
    normalized = normalized.replace(pattern, ` ${replacement} `);
  return new Set(
    normalized
      .split(/[^a-z0-9_]+/)
      .map(normalizeWord)
      .filter((word) => (word.length > 2 || word === 'rf') && !noise.has(word)),
  );
}

const directions = [
  'direction_air_ground', 'direction_ground_air', 'direction_air_air',
  'direction_ground_ground',
];
const airframes = ['airframe_fixed_wing', 'airframe_rotary_wing'];
const present = (tokens: Set<string>, values: string[]) =>
  values.find((value) => tokens.has(value));
const subject = (tokens: Set<string>) =>
  tokens.has('gcs') ? 'gcs' : tokens.has('uas') || tokens.has('aircraft') ? 'aircraft' : '';

function family(tokens: Set<string>) {
  if (tokens.has('terminal') && tokens.has('guidance')) return 'terminal-guidance';
  if (tokens.has('rf') && (tokens.has('signature') || tokens.has('detect') || tokens.has('gcs')))
    return 'rf-signature';
  if ((tokens.has('rf') || tokens.has('control_link')) && (tokens.has('control_link') || tokens.has('range')))
    return 'rf-control-range';
  if (tokens.has('gps') || (tokens.has('navigation') && tokens.has('denied')))
    return 'gps-navigation';
  if (tokens.has('identify') && (present(tokens, directions) || tokens.has('target') || tokens.has('airborne')))
    return 'target-identification';
  if ((tokens.has('uxs') || tokens.has('uas')) && tokens.has('control'))
    return 'unmanned-control';
  return '';
}

const familyLabel: Record<string, string> = {
  'terminal-guidance': 'Terminal-guidance capability family',
  'rf-signature': 'RF-signature-management capability family',
  'rf-control-range': 'RF control-link range capability family',
  'gps-navigation': 'GPS-denied navigation terminology',
  'target-identification': 'Target-identification capability family',
  'unmanned-control': 'Unmanned-system control capability family',
};

const phraseLabel: Record<string, string> = {
  direction_air_ground: 'Air-to-Ground',
  direction_ground_air: 'Ground-to-Air',
  direction_air_air: 'Air-to-Air',
  direction_ground_ground: 'Ground-to-Ground',
  airframe_fixed_wing: 'Fixed Wing',
  airframe_rotary_wing: 'Rotary Wing',
};

export function scoreProblemMatch(
  input: { title: string; description?: string; category?: string; tags?: string[] },
  candidate: MatchableProblem,
): ProblemMatch {
  const sourceTitle = normalizeProblemText(input.title);
  const source = normalizeProblemText(`${input.title} ${input.description ?? ''}`);
  const targetTitle = normalizeProblemText(`${candidate.id} ${candidate.title}`);
  const target = normalizeProblemText(`${candidate.title} ${candidate.description ?? ''}`);
  const overlap = [...source].filter((word) => target.has(word));
  const titleOverlap = [...sourceTitle].filter((word) => targetTitle.has(word));
  const sourceCoverage = source.size ? overlap.length / source.size : 0;
  const titleCoverage = sourceTitle.size ? titleOverlap.length / sourceTitle.size : 0;
  const candidateCoverage = targetTitle.size ? titleOverlap.length / targetTitle.size : 0;
  const sourceFamily = family(source);
  const targetFamily = family(target);
  const sameFamily = Boolean(sourceFamily && sourceFamily === targetFamily);
  const familyConflict = Boolean(sourceFamily && targetFamily && sourceFamily !== targetFamily);
  const sourceDirection = present(source, directions);
  const targetDirection = present(target, directions);
  const sourceAirframe = present(source, airframes);
  const targetAirframe = present(target, airframes);
  const sourceSubject = subject(source);
  const targetSubject = subject(targetTitle);
  const directionConflict = Boolean(sourceDirection && targetDirection && sourceDirection !== targetDirection);
  const airframeConflict = Boolean(sourceAirframe && targetAirframe && sourceAirframe !== targetAirframe);
  const subjectConflict = Boolean(sourceSubject && targetSubject && sourceSubject !== targetSubject);
  const missingVariant = Boolean((!sourceDirection && targetDirection) || (!sourceAirframe && targetAirframe));
  const exactTitle = input.title.trim().toLowerCase() === candidate.title.trim().toLowerCase();
  const exactId = input.title.trim().toLowerCase() === candidate.id.toLowerCase();
  const categoryMatch = Boolean(input.category && input.category === candidate.category);
  const sharedTags = (input.tags ?? []).filter((tag) => candidate.tags.includes(tag));

  let score = titleCoverage * 0.35 + sourceCoverage * 0.2 + candidateCoverage * 0.15;
  if (sameFamily) score += 0.25;
  if (familyConflict) score -= 0.3;
  if (sourceDirection && sourceDirection === targetDirection) score += 0.2;
  if (sourceAirframe && sourceAirframe === targetAirframe) score += 0.2;
  if (categoryMatch) score += 0.1;
  score += Math.min(0.1, sharedTags.length * 0.05);
  if (directionConflict) score -= 0.18;
  if (airframeConflict) score -= 0.18;
  if (subjectConflict) score -= 0.18;
  if (exactTitle || exactId) score = 1;
  score = Math.max(0, Math.min(1, score));

  const reasons: string[] = [];
  if (exactId) reasons.push('Exact Problem ID');
  else if (exactTitle) reasons.push('Exact title match');
  else if (titleCoverage >= 0.6) reasons.push('Similar title terminology');
  if (sameFamily) reasons.push(familyLabel[sourceFamily]);
  if (sourceDirection && sourceDirection === targetDirection) reasons.push(phraseLabel[sourceDirection]);
  if (sourceAirframe && sourceAirframe === targetAirframe) reasons.push(phraseLabel[sourceAirframe]);
  if (directionConflict) reasons.push(`Different direction: ${phraseLabel[targetDirection!]}`);
  if (airframeConflict) reasons.push(`Different aircraft type: ${phraseLabel[targetAirframe!]}`);
  if (subjectConflict) reasons.push(`Different RF-signature subject: ${targetSubject === 'gcs' ? 'Ground Control Station' : 'Aircraft'}`);
  if (categoryMatch) reasons.push(`Shared ${candidate.category} category`);
  if (sharedTags.length) reasons.push(`Shared tag: ${sharedTags[0]}`);
  if (!reasons.length && overlap.length) reasons.push(`Shared terminology: ${overlap.slice(0, 3).join(', ')}`);

  const classification =
    exactTitle || exactId || (score >= 0.68 && sameFamily && !directionConflict && !airframeConflict && !subjectConflict && !missingVariant)
      ? 'POSSIBLE_DUPLICATE'
      : 'RELATED_PROBLEM';
  return { ...candidate, score, classification, reasons };
}

export function findRelatedProblems(
  input: { title: string; description?: string; category?: string; tags?: string[] },
  candidates: MatchableProblem[],
) {
  return candidates
    .map((problem) => scoreProblemMatch(input, problem))
    .filter((match) => match.score >= 0.24 && match.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5);
}

export function findProjectsForProblems<
  T extends { problems: { id: string }[] },
>(problemIds: string[], projects: T[]) {
  const selected = new Set(problemIds);
  return projects.filter((project) =>
    project.problems.some((problem) => selected.has(problem.id)),
  );
}

export function isPotentiallySimilarProject(
  input: { name: string; description?: string },
  candidate: { name: string; description?: string },
) {
  const source = normalizeProblemText(`${input.name} ${input.description ?? ''}`);
  const target = normalizeProblemText(`${candidate.name} ${candidate.description ?? ''}`);
  if (source.size < 2) return false;
  return [...source].filter((term) => target.has(term)).length / source.size >= 0.5;
}
