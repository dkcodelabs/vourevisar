import { describe, expect, it } from 'vitest';
import type {
  BuildCycleStatisticsInput,
  CycleStatisticsSessionInput,
  CycleStatisticsSubjectInput,
  CycleStatisticsTopicInput,
} from '@/types/cycleStatistics';
import {
  aggregateCycleTopicDifficulty,
  buildCycleStatistics,
  resolveStatisticsDateSelection,
} from '@/utils/cycleStatistics';

const now = new Date('2026-08-25T12:00:00-03:00');

const subject: CycleStatisticsSubjectInput = {
  id: 'subject-1',
  name: 'Direito Constitucional',
  color: '#2f80ff',
  sourceSubjectIds: ['subject-1'],
  examWeightPoints: 10,
  examWeightQuestions: null,
  examWeightPercentage: null,
  examWeightRaw: null,
};

const makeTopic = (overrides: Partial<CycleStatisticsTopicInput> = {}): CycleStatisticsTopicInput => ({
  id: 'topic-1',
  name: 'Constituição',
  subjectId: 'subject-1',
  sourceTopicIds: ['topic-1'],
  completed: false,
  reviewCount: 0,
  reviewStage: null,
  nextReview: null,
  firstStudiedAt: null,
  lastReviewedAt: null,
  memoryStability: null,
  currentInterval: null,
  difficultyLevel: null,
  ...overrides,
});

const build = (overrides: Partial<BuildCycleStatisticsInput> = {}) => buildCycleStatistics({
  cycle: { id: 'cycle-1', name: 'TJ ES', examDate: '2026-12-10', startedAt: '2026-07-01T12:00:00-03:00' },
  editalNames: ['TJ ES — Analista'],
  period: 7,
  topics: [makeTopic()],
  subjects: [subject],
  sessions: [],
  now,
  ...overrides,
});

describe('cycleStatistics', () => {
  it('preserves the strongest difficulty signal across merged origins', () => {
    expect(aggregateCycleTopicDifficulty([
      { difficultyLevel: 1 },
      { difficultyLevel: 3 },
      { difficultyLevel: 2 },
    ])).toBe(3);

    expect(aggregateCycleTopicDifficulty([
      { difficultyLevel: null },
    ])).toBeNull();
  });

  it('validates a linked date and expands the period needed to contain it', () => {
    expect(resolveStatisticsDateSelection('2026-08-25', now)).toEqual({ date: '2026-08-25', period: 7 });
    expect(resolveStatisticsDateSelection('2026-08-12', now)).toEqual({ date: '2026-08-12', period: 14 });
    expect(resolveStatisticsDateSelection('2026-07-01', now)).toEqual({ date: '2026-07-01', period: 'all' });
    expect(resolveStatisticsDateSelection('2026-02-30', now)).toBeNull();
    expect(resolveStatisticsDateSelection('2026-08-26', now)).toBeNull();
  });

  it('separates coverage, development and consolidation without treating first contact as completion', () => {
    const data = build({
      topics: [
        makeTopic({ id: 'not-started' }),
        makeTopic({
          id: 'started',
          firstStudiedAt: '2026-08-20T10:00:00-03:00',
          reviewCount: 1,
          reviewStage: 'Primeiro Contato',
        }),
        makeTopic({
          id: 'completed',
          completed: true,
          firstStudiedAt: '2026-07-01T10:00:00-03:00',
          reviewCount: 5,
          reviewStage: 'Concluído',
        }),
      ],
    });

    expect(data.progress).toMatchObject({
      total: 3,
      notStarted: 1,
      started: 2,
      inDevelopment: 1,
      completed: 1,
      coveragePercentage: 67,
      completionPercentage: 33,
    });
  });

  it('uses study sessions as the sole time ledger and deduplicates repeated session rows', () => {
    const sessions: CycleStatisticsSessionInput[] = [
      { id: 'session-1', subjectId: 'subject-1', studyDate: '2026-08-25', durationMinutes: 20 },
      { id: 'session-1', subjectId: 'subject-1', studyDate: '2026-08-25', durationMinutes: 20 },
      { id: 'zero', subjectId: 'subject-1', studyDate: '2026-08-25', durationMinutes: 0 },
      { id: 'previous', subjectId: 'subject-1', studyDate: '2026-08-18', durationMinutes: 10 },
    ];

    const data = build({ sessions });

    expect(data.time.totalMinutes).toBe(20);
    expect(data.time.previousPeriodMinutes).toBe(10);
    expect(data.time.activeDays).toBe(1);
    expect(data.subjects[0].studyMinutes).toBe(20);
  });

  it('reports difficulty with its evaluated base per subject', () => {
    const data = build({
      topics: [
        makeTopic({ id: 'easy', difficultyLevel: 1 }),
        makeTopic({ id: 'hard', difficultyLevel: 3 }),
        makeTopic({ id: 'harder', difficultyLevel: 4 }),
        makeTopic({ id: 'unrated', difficultyLevel: null }),
        makeTopic({ id: 'without-signals' }),
      ],
    });

    expect(data.subjects[0]).toMatchObject({
      totalTopics: 5,
      difficulty: { ratedTopics: 3, easyTopics: 1, mediumTopics: 0, hardTopics: 2 },
    });
  });

  it('keeps selected-day review and question contacts separate from the canonical session total', () => {
    const data = build({
      selectedDate: '2026-08-25',
      sessions: [
        { id: 'session-1', subjectId: 'subject-1', studyDate: '2026-08-25', durationMinutes: 40 },
      ],
      dayContacts: [{
        id: 'contact-1',
        topicId: 'topic-1',
        topicName: 'Constituição',
        subjectId: 'subject-1',
        subjectName: 'Direito Constitucional',
        durationMinutes: 100,
        reviewedAt: '2026-08-25T10:00:00-03:00',
        type: 'review',
      }, {
        id: 'question-contact-1',
        topicId: 'topic-1',
        topicName: 'Constituição',
        subjectId: 'subject-1',
        subjectName: 'Direito Constitucional',
        durationMinutes: 0,
        reviewedAt: '2026-08-25T10:05:00-03:00',
        type: 'questions',
      }],
    });

    expect(data.selectedDay).toMatchObject({
      date: '2026-08-25',
      sessionMinutes: 40,
      subjectMinutes: [{ subjectId: 'subject-1', minutes: 40 }],
    });
    expect(data.selectedDay?.contacts[0].durationMinutes).toBe(100);
    expect(data.selectedDay?.contacts.map(contact => contact.type)).toEqual(['review', 'questions']);
    expect(data.time.totalMinutes).toBe(40);
  });

  it('uses the existing adaptive maturity thresholds and keeps overdue as a separate dimension', () => {
    const data = build({
      topics: [
        makeTopic({
          id: 'learning',
          firstStudiedAt: '2026-08-01T10:00:00-03:00',
          reviewCount: 2,
          memoryStability: 20,
          currentInterval: 7,
          nextReview: '2026-08-24T10:00:00-03:00',
        }),
        makeTopic({
          id: 'fixing',
          firstStudiedAt: '2026-07-01T10:00:00-03:00',
          reviewCount: 4,
          memoryStability: 20,
          currentInterval: 15,
          nextReview: '2026-08-25T10:00:00-03:00',
        }),
        makeTopic({
          id: 'mastering',
          firstStudiedAt: '2026-06-01T10:00:00-03:00',
          reviewCount: 4,
          memoryStability: 50,
          currentInterval: 30,
          nextReview: '2026-09-20T10:00:00-03:00',
        }),
      ],
    });

    expect(data.memory).toMatchObject({
      eligible: 3,
      learning: 1,
      fixing: 1,
      mastering: 1,
      overdue: 1,
      dueToday: 1,
      future: 1,
    });
    expect(data.insight.id).toBe('overdue-reviews');
  });

  it('does not fabricate a percentage comparison when the previous period has no time', () => {
    const data = build({
      sessions: [
        { id: 'session-1', subjectId: 'subject-1', studyDate: '2026-08-25', durationMinutes: 15 },
      ],
    });

    expect(data.time.comparisonPercentage).toBeNull();
    expect(data.time.previousPeriodMinutes).toBe(0);
  });

  it('keeps a started cycle honest when there is no session history yet', () => {
    const data = build({
      topics: [makeTopic({ firstStudiedAt: '2026-08-20T10:00:00-03:00' })],
      sessions: [],
    });

    expect(data.time).toMatchObject({
      totalMinutes: 0,
      previousPeriodMinutes: 0,
      activeDays: 0,
      comparisonPercentage: null,
    });
    expect(data.insight.id).toBe('no-recent-time');
  });

  it('identifies a combined cycle without changing its canonical name', () => {
    const data = build({
      editalNames: ['TJ ES — Analista', 'TJ ES — Técnico'],
    });

    expect(data.cycleName).toBe('TJ ES');
    expect(data.editalLabel).toBe('TJ ES — Analista + TJ ES — Técnico');
    expect(data.combinedEditaisCount).toBe(2);
  });

  it('uses only the selected period for current time metrics', () => {
    const data = build({
      period: 14,
      sessions: [
        { id: 'today', subjectId: 'subject-1', studyDate: '2026-08-25', durationMinutes: 30 },
        { id: 'inside', subjectId: 'subject-1', studyDate: '2026-08-12', durationMinutes: 20 },
        { id: 'previous', subjectId: 'subject-1', studyDate: '2026-08-11', durationMinutes: 40 },
      ],
    });

    expect(data.time.totalMinutes).toBe(50);
    expect(data.time.previousPeriodMinutes).toBe(40);
    expect(data.time.daily).toHaveLength(14);
  });

  it('uses the complete cycle ledger and calculates the best historical streak', () => {
    const data = build({
      period: 'all',
      cycle: { id: 'cycle-1', name: 'TJ ES', examDate: null, startedAt: '2026-08-20T12:00:00-03:00' },
      sessions: [
        { id: 'day-1', subjectId: 'subject-1', studyDate: '2026-08-20', durationMinutes: 30 },
        { id: 'day-2', subjectId: 'subject-1', studyDate: '2026-08-21', durationMinutes: 20 },
        { id: 'day-3', subjectId: 'subject-1', studyDate: '2026-08-22', durationMinutes: 40 },
        { id: 'day-5', subjectId: 'subject-1', studyDate: '2026-08-24', durationMinutes: 15 },
      ],
    });

    expect(data.time.totalMinutes).toBe(105);
    expect(data.time.periodDays).toBe(6);
    expect(data.time.daily).toHaveLength(6);
    expect(data.time.bestStreak).toBe(3);
    expect(data.time.isAllCycle).toBe(true);
    expect(data.time.comparisonPercentage).toBeNull();
  });
});
