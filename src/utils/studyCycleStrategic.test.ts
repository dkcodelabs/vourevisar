import { describe, expect, it } from 'vitest';
import { ReviewInterval } from '@/types/study-cycle';
import { getSubjectExplorationPercentage, getSubjectStrategicWeight } from './studyCycleStrategic';

describe('studyCycleStrategic', () => {
  it('does not invent subject weight without edital data', () => {
    expect(getSubjectStrategicWeight({ exam_weight_points: null, exam_weight_questions: null, exam_weight_percentage: null, exam_weight_raw: null })).toMatchObject({ level: 'none', hasWeight: false });
  });

  it('calculates exploration from started topics', () => {
    expect(getSubjectExplorationPercentage([
      { reviewStatus: ReviewInterval.NOT_STARTED },
      { reviewStatus: ReviewInterval.FIRST_CONTACT },
      { reviewStatus: ReviewInterval.COMPLETED },
    ])).toBe(67);
  });
});
