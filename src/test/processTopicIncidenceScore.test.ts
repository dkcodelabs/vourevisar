import { describe, expect, it } from 'vitest';
import { getIncidenceLevelFromScore } from '../../supabase/functions/process-topic-incidence/incidenceScore';

describe('process-topic-incidence score level', () => {
  it.each([
    [1, 'low'],
    [2, 'low'],
    [3, 'medium'],
    [4, 'high'],
    [5, 'high'],
  ] as const)('persiste score %s como %s', (score, level) => {
    expect(getIncidenceLevelFromScore(score)).toBe(level);
  });
});
