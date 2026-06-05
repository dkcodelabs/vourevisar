import { describe, expect, it } from 'vitest';
import { ReviewInterval, SubjectStatus, type StudyCycleSubject } from '@/types/study-cycle';
import {
  getStudyCycleStrategicSummary,
  getSubjectExplorationPercentage,
  getSubjectStrategicWeight,
  getTopicStrategicIncidence,
} from './studyCycleStrategic';

describe('studyCycleStrategic', () => {
  it('does not invent subject weight when edital has no explicit data', () => {
    const weight = getSubjectStrategicWeight({
      exam_weight_points: null,
      exam_weight_questions: null,
      exam_weight_percentage: null,
      exam_weight_raw: null,
    });

    expect(weight).toEqual({
      level: 'none',
      label: 'Sem peso informado',
      hasWeight: false,
    });
  });

  it('keeps known subject weight as a descriptive label', () => {
    const weight = getSubjectStrategicWeight({
      exam_weight_points: 10,
      exam_weight_questions: 5,
      exam_weight_percentage: null,
      exam_weight_raw: 'Disciplina X: 5 questões, peso 2',
    });

    expect(weight.level).toBe('known');
    expect(weight.hasWeight).toBe(true);
    expect(weight.label).toBe('5 questões · 10 pontos totais');
  });

  it('marks topic incidence as not analyzed when volume is absent or zero', () => {
    expect(getTopicStrategicIncidence({ totalVolume: null })).toMatchObject({
      level: 'not_analyzed',
      label: 'Incidência não analisada',
      hasIncidence: false,
      showToStudent: false,
    });

    expect(getTopicStrategicIncidence({ totalVolume: 0 }).hasIncidence).toBe(false);
  });

  it('keeps ordinary analyzed incidence hidden from the student while the engine is consolidating', () => {
    expect(getTopicStrategicIncidence({ totalVolume: 42 })).toEqual({
      level: 'analyzed',
      label: 'Incidência analisada',
      hasIncidence: true,
      showToStudent: false,
    });
  });

  it('shows only high charging signal to the student', () => {
    expect(getTopicStrategicIncidence({ totalVolume: 1200 })).toEqual({
      level: 'high',
      label: 'Cobrança alta',
      hasIncidence: true,
      showToStudent: true,
    });
  });

  it('calculates exploration from topics that already left not-started state', () => {
    expect(getSubjectExplorationPercentage([
      { reviewStatus: ReviewInterval.NOT_STARTED },
      { reviewStatus: ReviewInterval.FIRST_CONTACT },
      { reviewStatus: ReviewInterval.COMPLETED },
    ])).toBe(67);
  });

  it('summarizes strategic cycle data without requiring all metadata', () => {
    const subjects: StudyCycleSubject[] = [
      {
        id: 'subject-1',
        name: 'Português',
        status: SubjectStatus.ACTIVE,
        strategicWeight: { level: 'known', label: '10 questões', hasWeight: true },
        topics: [
          {
            id: 'topic-1',
            name: 'Crase',
            reviewStatus: ReviewInterval.FIRST_CONTACT,
            strategicIncidence: { level: 'analyzed', label: 'Incidência analisada', hasIncidence: true },
          },
          {
            id: 'topic-2',
            name: 'Pontuação',
            reviewStatus: ReviewInterval.NOT_STARTED,
            strategicIncidence: { level: 'not_analyzed', label: 'Incidência não analisada', hasIncidence: false },
          },
        ],
      },
      {
        id: 'subject-2',
        name: 'Direito Administrativo',
        status: SubjectStatus.ACTIVE,
        strategicWeight: { level: 'none', label: 'Sem peso informado', hasWeight: false },
        topics: [
          {
            id: 'topic-3',
            name: 'Atos administrativos',
            reviewStatus: ReviewInterval.COMPLETED,
            strategicIncidence: { level: 'not_analyzed', label: 'Incidência não analisada', hasIncidence: false },
          },
        ],
      },
    ];

    expect(getStudyCycleStrategicSummary(subjects)).toEqual({
      totalSubjects: 2,
      totalTopics: 3,
      startedTopics: 2,
      completedTopics: 1,
      subjectsWithoutWeight: 1,
      topicsWithoutIncidence: 2,
      editalCoveragePercentage: 67,
    });
  });
});
