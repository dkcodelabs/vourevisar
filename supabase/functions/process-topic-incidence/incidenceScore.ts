export type TopicIncidenceLevel = 'low' | 'medium' | 'high';

export const getIncidenceLevelFromScore = (score: number): TopicIncidenceLevel => {
  if (score >= 4) return 'high';
  if (score === 3) return 'medium';
  return 'low';
};
