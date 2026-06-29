import { describe, expect, it } from 'vitest';
import {
  buildActionQueue,
  buildDashboardPace,
  buildNextBestAction,
  buildProgressSummary,
  getChargeCoverageState,
  getDashboardActivitySelection,
  getDashboardEditalIdentity,
  getPaceBannerAction,
  formatPaceRequirement,
  formatPaceValue,
  getDifficultySummary,
  getNextCycleActions,
  normalizeReminderDate,
  splitReviewsByDueDate,
} from './dashboardDecision';
import type { DashboardActivityDay, DashboardCycleSubject, DashboardReviewTopic } from '@/types/dashboardDecision';

const today = new Date('2026-06-19T12:00:00.000Z');

describe('normalizeReminderDate', () => {
  it('preserves the selected civil date when Supabase returns a UTC timestamp', () => {
    expect(normalizeReminderDate('2026-06-21T00:00:00+00:00')).toBe('2026-06-21');
  });

  it('keeps date-only values and null unchanged', () => {
    expect(normalizeReminderDate('2026-06-21')).toBe('2026-06-21');
    expect(normalizeReminderDate(null)).toBeNull();
  });
});

describe('getPaceBannerAction', () => {
  it('keeps a valid pace banner informational', () => {
    expect(getPaceBannerAction('ready')).toBeNull();
  });

  it('routes missing and expired exam dates to edital management', () => {
    expect(getPaceBannerAction('missing_exam_date')).toEqual({
      label: 'Definir data da prova',
      href: '/meus-editais',
    });
    expect(getPaceBannerAction('exam_date_past')).toEqual({
      label: 'Atualizar data da prova',
      href: '/meus-editais',
    });
  });

  it('routes a missing cycle to edital management', () => {
    expect(getPaceBannerAction('missing_cycle')).toEqual({
      label: 'Carregar edital no ciclo',
      href: '/meus-editais',
    });
  });
});

describe('formatPaceRequirement', () => {
  it('shows sub-daily requirements as a natural cadence', () => {
    expect(formatPaceRequirement(3 / 121)).toEqual({ value: '1', cadence: 'a cada 40 dias' });
    expect(formatPaceRequirement(10 / 121)).toEqual({ value: '1', cadence: 'a cada 12 dias' });
  });

  it('keeps requirements of at least one as a daily rate', () => {
    expect(formatPaceRequirement(1)).toEqual({ value: '1', cadence: 'por dia' });
    expect(formatPaceRequirement(1.5)).toEqual({ value: '1,5', cadence: 'por dia' });
  });

  it('keeps the unavailable state honest', () => {
    expect(formatPaceRequirement(null)).toEqual({ value: '--', cadence: '' });
  });
});

describe('formatPaceValue', () => {
  it('shows sub-daily averages as a natural cadence', () => {
    expect(formatPaceValue(0.6)).toBe('1 a cada 2 dias');
    expect(formatPaceValue(0.1)).toBe('1 a cada 10 dias');
  });

  it('keeps daily and null values readable', () => {
    expect(formatPaceValue(1)).toBe('1,0/dia');
    expect(formatPaceValue(1.5)).toBe('1,5/dia');
    expect(formatPaceValue(null)).toBe('--');
  });
});

const reviewTopic = (overrides: Partial<DashboardReviewTopic> = {}): DashboardReviewTopic => ({
  id: 'topic-review-1',
  name: 'Controle de Constitucionalidade',
  subjectId: 'subject-1',
  subjectName: 'Direito Constitucional',
  nextReview: '2026-06-18T09:00:00.000Z',
  reviewCount: 2,
  ...overrides,
});

const cycleSubject = (overrides: Partial<DashboardCycleSubject> = {}): DashboardCycleSubject => ({
  id: 'subject-1',
  name: 'Direito Constitucional',
  cyclePosition: 1,
  isCompletedInCycle: false,
  topics: [
    {
      id: 'topic-new-1',
      name: 'Atos Administrativos',
      subjectId: 'subject-1',
      subjectName: 'Direito Constitucional',
      firstStudiedAt: null,
      reviewCount: 0,
      completed: false,
      totalVolume: null,
      difficultyLevel: null,
    },
  ],
  ...overrides,
});

describe('getDashboardEditalIdentity', () => {
  it('keeps the contest name and position in separate fields', () => {
    expect(
      getDashboardEditalIdentity({
        name: 'TRF 4 - Concurso Público',
        organ: 'TRF 4',
        position: 'Analista Judiciário',
      }),
    ).toEqual({
      editalName: 'TRF 4 - Concurso Público',
      position: 'Analista Judiciário',
    });
  });

  it('removes a repeated position suffix from the contest name', () => {
    expect(
      getDashboardEditalIdentity({
        name: 'POLICIA MILITAR DO ESPIRITO SANTO - PRAÇA COMBATENTE',
        position: 'PRAÇA COMBATENTE',
      }),
    ).toEqual({
      editalName: 'POLICIA MILITAR DO ESPIRITO SANTO',
      position: 'PRAÇA COMBATENTE',
    });
  });
});

describe('splitReviewsByDueDate', () => {
  it('separates overdue, today, and future reviews by calendar day', () => {
    const result = splitReviewsByDueDate(
      [
        reviewTopic({ id: 'overdue', nextReview: '2026-06-18T09:00:00.000Z' }),
        reviewTopic({ id: 'today', nextReview: '2026-06-19T20:00:00.000Z' }),
        reviewTopic({ id: 'future', nextReview: '2026-06-20T09:00:00.000Z' }),
      ],
      today,
    );

    expect(result.overdue.map((topic) => topic.id)).toEqual(['overdue']);
    expect(result.today.map((topic) => topic.id)).toEqual(['today']);
    expect(result.future.map((topic) => topic.id)).toEqual(['future']);
  });
});

describe('getNextCycleActions', () => {
  it('respects cycle order and returns the first unstarted topic from the first eligible subject', () => {
    const actions = getNextCycleActions([
      cycleSubject({
        id: 'subject-done',
        name: 'Português',
        cyclePosition: 1,
        isCompletedInCycle: true,
      }),
      cycleSubject({
        id: 'subject-2',
        name: 'Direito Administrativo',
        cyclePosition: 2,
        topics: [
          {
            id: 'topic-started',
            name: 'Organização Administrativa',
            subjectId: 'subject-2',
            subjectName: 'Direito Administrativo',
            firstStudiedAt: '2026-06-10T10:00:00.000Z',
            reviewCount: 1,
            completed: false,
            totalVolume: null,
          },
          {
            id: 'topic-new',
            name: 'Atos Administrativos',
            subjectId: 'subject-2',
            subjectName: 'Direito Administrativo',
            firstStudiedAt: null,
            reviewCount: 0,
            completed: false,
            totalVolume: null,
          },
        ],
      }),
    ]);

    expect(actions[0]).toMatchObject({
      kind: 'start_cycle_topic',
      target: {
        subjectName: 'Direito Administrativo',
        topicName: 'Atos Administrativos',
      },
      primaryLabel: 'Iniciar estudo',
      primaryHref: '/ciclo-estudos',
    });
  });
});

describe('getChargeCoverageState', () => {
  it('returns none when no topic has persisted charge level', () => {
    expect(getChargeCoverageState([cycleSubject()])).toBe('none');
  });

  it('returns partial when only some topics have persisted charge level', () => {
    expect(
      getChargeCoverageState([
        cycleSubject({
          topics: [
            {
              id: 'topic-a',
              name: 'Licitações',
              subjectId: 'subject-1',
              subjectName: 'Direito Administrativo',
              firstStudiedAt: null,
              reviewCount: 0,
              completed: false,
              totalVolume: 20,
              incidenceLevel: 'high',
            },
            {
              id: 'topic-b',
              name: 'Contratos',
              subjectId: 'subject-1',
              subjectName: 'Direito Administrativo',
              firstStudiedAt: null,
              reviewCount: 0,
              completed: false,
              totalVolume: null,
            },
          ],
        }),
      ]),
    ).toBe('partial');
  });
});

describe('buildNextBestAction', () => {
  it('routes missing cycle setup to edital management', () => {
    const action = buildNextBestAction({
      overdueReviews: [],
      todayReviews: [],
      cycleActions: [],
      strategicActions: [],
      hasActiveCycle: false,
    });

    expect(action).toMatchObject({
      kind: 'load_cycle',
      primaryLabel: 'Ir para Meus Editais',
      primaryHref: '/meus-editais',
    });
  });

  it('prioritizes overdue review before cycle topic', () => {
    const action = buildNextBestAction({
      overdueReviews: [reviewTopic({ id: 'overdue' })],
      todayReviews: [],
      cycleActions: getNextCycleActions([cycleSubject()]),
      strategicActions: [],
      hasActiveCycle: true,
    });

    expect(action).toMatchObject({
      kind: 'review_overdue',
      primaryLabel: 'Revisar agora',
      primaryHref: '/revisoes?topicId=overdue',
    });
  });

  it('uses cycle topic when there are no urgent reviews', () => {
    const action = buildNextBestAction({
      overdueReviews: [],
      todayReviews: [],
      cycleActions: getNextCycleActions([cycleSubject()]),
      strategicActions: [],
      hasActiveCycle: true,
    });

    expect(action.kind).toBe('start_cycle_topic');
  });
});

describe('buildActionQueue', () => {
  it('does not repeat the same topic as cycle and strategic actions', () => {
    const cycleActions = getNextCycleActions([
      cycleSubject({
        topics: [
          {
            id: 'topic-shared',
            name: 'Controle de Constitucionalidade',
            subjectId: 'subject-1',
            subjectName: 'Direito Constitucional',
            firstStudiedAt: null,
            reviewCount: 0,
            completed: false,
            totalVolume: 30,
          },
        ],
      }),
    ]);

    const strategicActions = [
      {
        ...cycleActions[0],
        id: 'charge:topic-shared',
        kind: 'strategic_high_charge' as const,
        priorityScore: 40,
      },
    ];

    const actions = buildActionQueue({
      overdueReviews: [],
      todayReviews: [],
      cycleActions,
      strategicActions,
    });

    expect(actions.filter((action) => action.target.topicId === 'topic-shared')).toHaveLength(1);
  });
});

describe('buildDashboardPace', () => {
  it('does not invent pace without exam date', () => {
    const pace = buildDashboardPace({
      examDate: null,
      today,
      totalUnstartedTopics: 12,
      overdueReviews: 2,
      todayReviews: 3,
      futureReviewsInWindow: 4,
      hasActiveCycle: true,
    });

    expect(pace).toMatchObject({
      state: 'missing_exam_date',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
    });
  });

  it('calculates daily topic and review pace when date exists', () => {
    const pace = buildDashboardPace({
      examDate: '2026-06-29',
      today,
      totalUnstartedTopics: 10,
      overdueReviews: 2,
      todayReviews: 3,
      futureReviewsInWindow: 5,
      hasActiveCycle: true,
    });

    expect(pace).toMatchObject({
      state: 'ready',
      daysRemaining: 10,
      newTopicsPerDay: 1,
      reviewsPerDay: 1,
      pendingReviews: 10,
    });
  });

  it('preserves sub-daily precision instead of rounding a real requirement to zero', () => {
    const pace = buildDashboardPace({
      examDate: '2026-10-20',
      today: new Date('2026-06-21T12:00:00-03:00'),
      totalUnstartedTopics: 3,
      overdueReviews: 10,
      todayReviews: 0,
      futureReviewsInWindow: 0,
      hasActiveCycle: true,
    });

    expect(pace.newTopicsPerDay).toBeCloseTo(3 / 121, 4);
    expect(pace.reviewsPerDay).toBeCloseTo(10 / 121, 4);
  });
});

describe('study trajectory summaries', () => {
  it('counts only rated topics in difficulty percentages', () => {
    const summary = getDifficultySummary([
      cycleSubject({
        topics: [
          { id: 'easy', name: 'A', subjectId: 's', subjectName: 'S', difficultyLevel: 1 },
          { id: 'medium', name: 'B', subjectId: 's', subjectName: 'S', difficultyLevel: 2 },
          { id: 'hard', name: 'C', subjectId: 's', subjectName: 'S', difficultyLevel: 3 },
          { id: 'unrated', name: 'D', subjectId: 's', subjectName: 'S', difficultyLevel: null },
        ],
      }),
    ]);

    expect(summary).toEqual({ easy: 1, medium: 1, hard: 1, totalRated: 3 });
  });

  it('builds progress from real topic states', () => {
    const progress = buildProgressSummary([
      cycleSubject({
        topics: [
          { id: 'new', name: 'A', subjectId: 's', subjectName: 'S', completed: false, reviewCount: 0 },
          { id: 'started', name: 'B', subjectId: 's', subjectName: 'S', completed: false, reviewCount: 1 },
          { id: 'done', name: 'C', subjectId: 's', subjectName: 'S', completed: true, reviewCount: 4 },
        ],
      }),
    ]);

    expect(progress).toMatchObject({
      startedTopics: 2,
      inProgressTopics: 1,
      completedTopics: 1,
      totalTopics: 3,
      editalProgressPercentage: 67,
    });
  });
});

describe('getDashboardActivitySelection', () => {
  const activityDay = (
    date: string,
    entries: DashboardActivityDay['entries'] = [],
  ): DashboardActivityDay => ({
    date,
    studiedCount: entries.filter((entry) => entry.type === 'study').length,
    reviewedCount: entries.filter((entry) => entry.type === 'review').length,
    questionsCount: entries.filter((entry) => entry.type === 'questions').length,
    totalDurationMinutes: entries.reduce((total, entry) => total + entry.durationMinutes, 0),
    difficultyAverage: null,
    entries,
  });

  it('opens the current day by default even when an earlier day has activity', () => {
    const selection = getDashboardActivitySelection([
      activityDay('2026-06-18', [
        {
          id: 'study-1',
          topicId: 'topic-1',
          topicName: 'Interpretação de Textos',
          subjectName: 'Língua Portuguesa',
          durationMinutes: 55,
          reviewedAt: '2026-06-18T10:00:00.000Z',
          type: 'study',
        },
        {
          id: 'review-1',
          topicId: 'topic-2',
          topicName: 'ADI e ADC',
          subjectName: 'Direito Constitucional',
          durationMinutes: 30,
          reviewedAt: '2026-06-18T12:00:00.000Z',
          type: 'review',
        },
      ]),
      activityDay('2026-06-19'),
    ]);

    expect(selection.day?.date).toBe('2026-06-19');
    expect(selection.studies).toEqual([]);
    expect(selection.reviews).toEqual([]);
  });

  it('returns an empty detail when the selected day has no activity', () => {
    const selection = getDashboardActivitySelection(
      [
        activityDay('2026-06-18', [
          {
            id: 'study-1',
            topicId: 'topic-1',
            topicName: 'Interpretação de Textos',
            durationMinutes: 55,
            reviewedAt: '2026-06-18T10:00:00.000Z',
            type: 'study',
          },
        ]),
        activityDay('2026-06-19'),
      ],
      '2026-06-19',
    );

    expect(selection.day?.date).toBe('2026-06-19');
    expect(selection.studies).toEqual([]);
    expect(selection.reviews).toEqual([]);
  });

  it('keeps the period summary active when no day is selected', () => {
    const selection = getDashboardActivitySelection(
      [
        activityDay('2026-06-18', [
          {
            id: 'study-1',
            topicId: 'topic-1',
            topicName: 'Interpretação de Textos',
            durationMinutes: 55,
            reviewedAt: '2026-06-18T10:00:00.000Z',
            type: 'study',
          },
        ]),
      ],
      null,
    );

    expect(selection.day).toBeNull();
    expect(selection.studies).toEqual([]);
    expect(selection.reviews).toEqual([]);
  });
});
