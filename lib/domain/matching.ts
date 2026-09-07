export type MatchableProblem = { id: string; title: string; category: string; tags: string[] };

const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2));

export function scoreProblemMatch(input: { title: string; category?: string; tags?: string[] }, candidate: MatchableProblem) {
  const source = words(input.title);
  const target = words(candidate.title);
  const overlap = [...source].filter(word => target.has(word)).length;
  const titleScore = source.size ? overlap / source.size : 0;
  const categoryScore = input.category && input.category === candidate.category ? 0.2 : 0;
  const sharedTags = (input.tags ?? []).filter(tag => candidate.tags.includes(tag)).length;
  return Math.min(1, titleScore * 0.75 + categoryScore + Math.min(0.2, sharedTags * 0.1));
}

export function findRelatedProblems(input: { title: string; category?: string; tags?: string[] }, candidates: MatchableProblem[]) {
  return candidates.map(problem => ({ ...problem, score: scoreProblemMatch(input, problem) })).filter(x => x.score >= 0.25).sort((a, b) => b.score - a.score).slice(0, 5);
}
