export type TopicIncidenceLevel = 'low' | 'medium' | 'high';

export const getIncidenceLevelFromScore = (
  score: number | null | undefined,
): TopicIncidenceLevel | null => {
  if (!Number.isInteger(score) || score === null || score === undefined || score < 1 || score > 5) {
    return null;
  }

  if (score >= 4) return 'high';
  if (score === 3) return 'medium';
  return 'low';
};

export const getIncidenceLevelLabel = (level: unknown): string | null => {
  if (level === 'low') return 'Cobrança baixa';
  if (level === 'medium') return 'Cobrança média';
  if (level === 'high') return 'Cobrança alta';
  return null;
};
