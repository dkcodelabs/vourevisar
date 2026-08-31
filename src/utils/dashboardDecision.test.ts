import { describe, expect, it } from 'vitest';
import {
  buildActionQueue,
  buildDashboardPace,
  buildNextBestAction,
  buildProgressSummary,
  getDashboardEditalIdentity,
  getDashboardDataIssues,
  getDashboardCriticalError,
  getPaceBannerAction,
  getDashboardRecentPace,
  formatPaceRequirement,
  formatPaceValue,
  getNextCycleActions,
  normalizeReminderDate,
  resolveDashboardNavigation,
  splitReviewsByDueDate,
} from './dashboardDecision';
import type { DashboardCycleSubject, DashboardRecentPaceDay, DashboardReviewTopic } from '@/types/dashboardDecision';

const today = new Date('2026-06-19T12:00:00.000Z');

describe('getDashboardDataIssues', () => {
  it('reports only the optional queries that failed', () => {
    expect(getDashboardDataIssues({ activityError: null, remindersError: null })).toEqual([]);
    expect(getDashboardDataIssues({ activityError: new Error('activity'), remindersError: null })).toEqual(['activity']);
    expect(getDashboardDataIssues({ activityError: null, remindersError: new Error('reminders') })).toEqual(['reminders']);
    expect(getDashboardDataIssues({ activityError: new Error('activity'), remindersError: new Error('reminders') })).toEqual(['activity', 'reminders']);
  });
});
describe('getDashboardCriticalError', () => {
  it('returns null only when every critical source loaded successfully', () => {
    expect(getDashboardCriticalError({ reviewsError: null, cycleError: null, editaisError: null })).toBeNull();
  });

  it('propagates cycle and edital failures instead of allowing an empty-dashboard fallback', () => {
    const cycleError = new Error('cycle unavailable');
    const editaisError = new Error('editais unavailable');
    expect(getDashboardCriticalError({ reviewsError: null, cycleError, editaisError: null })).toBe(cycleError);
    expect(getDashboardCriticalError({ reviewsError: null, cycleError: null, editaisError })).toBe(editaisError);
  });

  it('keeps the established reviews error as the first critical cause', () => {
    const reviewsError = new Error('reviews unavailable');
    expect(getDashboardCriticalError({ reviewsError, cycleError: new Error('cycle'), editaisError: new Error('editais') })).toBe(reviewsError);
  });
});

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

describe('getDashboardRecentPace', () => {
  const day = (date: string, studiedCount = 0, reviewedCount = 0): DashboardRecentPaceDay => ({
    date, studiedCount, reviewedCount,
  });

  it('uses only the last seven supplied days, including zero days, with existing rounding', () => {
    const days = [day('2026-08-21', 99, 99), ...Array.from({ length: 7 }, (_, index) => day(`2026-08-${22 + index}`, index === 6 ? 3 : 0, index === 6 ? 1 : 0))];
    const result = getDashboardRecentPace(days);
    expect(result).toEqual({ recentDays: days.slice(1), studiedTopics: 3, completedReviews: 1, currentTopicsAverage: 0.4, currentReviewsAverage: 0.1 });
    expect(days).toHaveLength(8);
    expect(days[0].studiedCount).toBe(99);
  });

  it('preserves the available-day divisor for a shorter window', () => {
    expect(getDashboardRecentPace([day('2026-08-27'), day('2026-08-28', 3, 1)])).toMatchObject({ currentTopicsAverage: 1.5, currentReviewsAverage: 0.5 });
  });

  it('keeps empty-window arithmetic finite without inventing activity', () => {
    expect(getDashboardRecentPace([])).toEqual({ recentDays: [], studiedTopics: 0, completedReviews: 0, currentTopicsAverage: 0, currentReviewsAverage: 0 });
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
      difficultyLevel: null,
    },
  ],
  ...overrides,
});

describe('resolveDashboardNavigation', () => {
  it('carries only current subject/topic identity into the cycle focus contract', () => {
    expect(resolveDashboardNavigation('/ciclo-estudos', {
      subjectId: 'subject-1', topicId: 'topic-new-1', subjectName: 'Nome apenas visual',
    }, [cycleSubject()])).toEqual({
      href: '/ciclo-estudos', unavailable: false,
      state: { focusSubjectId: 'subject-1', focusTopicId: 'topic-new-1' },
    });
  });

  it('resolves the rendered subject for a topic after merging subjects', () => {
    expect(resolveDashboardNavigation('/ciclo-estudos', {
      subjectId: 'old-subject', topicId: 'topic-new-1',
    }, [cycleSubject({ id: 'unified-subject' })]).state).toEqual({
      focusSubjectId: 'unified-subject', focusTopicId: 'topic-new-1',
    });
  });

  it('does not fall back to another topic when the recommended one is unavailable', () => {
    expect(resolveDashboardNavigation('/ciclo-estudos', {
      subjectId: 'subject-1', topicId: 'removed-topic',
    }, [cycleSubject()])).toEqual({ href: '/ciclo-estudos', unavailable: true });
  });

  it('rejects old focus after unloading or changing the active cycle', () => {
    const target = { subjectId: 'subject-1', topicId: 'topic-new-1' };
    expect(resolveDashboardNavigation('/ciclo-estudos', target, []).unavailable).toBe(true);
    expect(resolveDashboardNavigation('/ciclo-estudos', target, [cycleSubject({ id: 'other-subject', topics: [] })]).unavailable).toBe(true);
  });

  it('supports a current subject without a topic and generic cycle navigation', () => {
    expect(resolveDashboardNavigation('/ciclo-estudos', { subjectId: 'subject-1' }, [cycleSubject()]).state).toEqual({ focusSubjectId: 'subject-1' });
    expect(resolveDashboardNavigation('/ciclo-estudos', undefined, [])).toEqual({ href: '/ciclo-estudos', unavailable: false });
    expect(resolveDashboardNavigation('/ciclo-estudos', {}, [])).toEqual({ href: '/ciclo-estudos', unavailable: false });
  });

  it.each(['/revisoes?topicId=review-topic', '/meus-editais', '/estatisticas?date=2026-08-28'])(
    'preserves other destinations without overriding their own context (%s)', href => {
      expect(resolveDashboardNavigation(href, { topicId: 'other-topic', subjectId: 'subject-1' }, [])).toEqual({ href, unavailable: false });
    },
  );
});

describe('getDashboardEditalIdentity', () => {
  it('keeps the contest name and position in separate fields', () => {
    expect(
      getDashboardEditalIdentity({
        name: 'TRF 4 - Concurso Público',
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
          },
          {
            id: 'topic-new',
            name: 'Atos Administrativos',
            subjectId: 'subject-2',
            subjectName: 'Direito Administrativo',
            firstStudiedAt: null,
            reviewCount: 0,
            completed: false,
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
      primaryLabel: 'Abrir tópico no ciclo',
      primaryHref: '/ciclo-estudos',
    });
  });

  it('rotates first contacts to the subject with fewer started topics before repeating a subject', () => {
    const actions = getNextCycleActions([
      cycleSubject({
        id: 'subject-portuguese',
        name: 'Português',
        cyclePosition: 1,
        topics: [
          {
            id: 'topic-portuguese-started',
            name: 'Compreensão de texto',
            subjectId: 'subject-portuguese',
            subjectName: 'Português',
            firstStudiedAt: '2026-06-19T10:00:00.000Z',
            reviewCount: 0,
            completed: false,
          },
          {
            id: 'topic-portuguese-next',
            name: 'Ortografia',
            subjectId: 'subject-portuguese',
            subjectName: 'Português',
            firstStudiedAt: null,
            reviewCount: 0,
            completed: false,
          },
        ],
      }),
      cycleSubject({
        id: 'subject-mathematics',
        name: 'Matemática',
        cyclePosition: 2,
        topics: [
          {
            id: 'topic-mathematics-first',
            name: 'Sistemas de unidades',
            subjectId: 'subject-mathematics',
            subjectName: 'Matemática',
            firstStudiedAt: null,
            reviewCount: 0,
            completed: false,
          },
        ],
      }),
    ]);

    expect(actions[0]?.target).toMatchObject({
      subjectName: 'Matemática',
      topicName: 'Sistemas de unidades',
    });
    expect(actions[0]?.reason).toBe('Alterna as matérias pela ordem que você definiu no Ciclo de Estudos.');
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
  it('keeps the singular recommendation and queue on the same priority contract', () => {
    const overdue = reviewTopic({ id: 'overdue-first', nextReview: '2026-06-18T12:00:00.000Z' });
    const todayTopic = reviewTopic({ id: 'today-second', nextReview: '2026-06-19T12:00:00.000Z' });
    const cycleActions = getNextCycleActions([cycleSubject()]);
    const next = buildNextBestAction({
      overdueReviews: [overdue],
      todayReviews: [todayTopic],
      cycleActions,
      strategicActions: [],
      hasActiveCycle: true,
      today,
    });
    const queue = buildActionQueue({
      overdueReviews: [overdue],
      todayReviews: [todayTopic],
      cycleActions,
      strategicActions: [],
      today,
    });

    expect(next.id).toBe('review_overdue:overdue-first');
    expect(queue[0]?.id).toBe(next.id);
    expect(queue.find((action) => action.target.topicId === next.target.topicId)).toBeDefined();
    expect(queue.find((action) => action.target.topicId === todayTopic.id)?.priorityScore).toBeLessThan(next.priorityScore);
  });

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
          },
        ],
      }),
    ]);

    const strategicActions = [];

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
      reviewsPerDay: 0.5,
      pendingReviews: 5,
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

describe('study progress summary', () => {
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
