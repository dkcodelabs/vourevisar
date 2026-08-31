import { describe, expect, it } from 'vitest';
import { getStudyCycleTransitionSummary } from './studyCycleTransitionSummary';

const now = new Date('2026-06-27T12:00:00.000Z');

describe('studyCycleTransitionSummary', () => {
  it('treats all started topics as first-contact finished, not edital completed', () => {
    const summary = getStudyCycleTransitionSummary({
      subjects: [
        {
          id: 'subject-1',
          name: 'Direito Constitucional',
          topics: [
            {
              id: 'topic-1',
              first_studied_at: '2026-06-20T10:00:00.000Z',
              next_review: '2026-06-26T10:00:00.000Z',
              completed: false,
              is_active: true,
            },
            {
              id: 'topic-2',
              first_studied_at: '2026-06-21T10:00:00.000Z',
              next_review: '2026-07-02T10:00:00.000Z',
              completed: false,
              is_active: true,
            },
          ],
        },
      ],
      studyMinutesByTopicId: new Map([
        ['topic-1', 40],
        ['topic-2', 20],
      ]),
      now,
    });

    expect(summary.hasNoNewTopicsToStart).toBe(true);
    expect(summary.isEditalCompleted).toBe(false);
    expect(summary.primaryAction).toEqual({
      kind: 'overdue_reviews',
      label: 'Revisar atrasadas',
      description: 'Todos os tópicos já foram iniciados. O maior risco agora são revisões vencidas.',
      to: '/revisoes?tab=atrasadas',
    });
    expect(summary.totalStudyMinutes).toBe(60);
    expect(summary.topSubjectByStudyMinutes).toEqual({
      subjectId: 'subject-1',
      subjectName: 'Direito Constitucional',
      minutes: 60,
    });
  });

  it('points to future reviews when first contact is finished and nothing is due today', () => {
    const summary = getStudyCycleTransitionSummary({
      subjects: [
        {
          id: 'subject-1',
          name: 'Administrativo',
          topics: [
            {
              id: 'topic-1',
              first_studied_at: '2026-06-20T10:00:00.000Z',
              next_review: '2026-06-30T10:00:00.000Z',
              completed: false,
              is_active: true,
            },
          ],
        },
      ],
      studyMinutesByTopicId: new Map(),
      now,
    });

    expect(summary.primaryAction.kind).toBe('future_reviews');
    expect(summary.primaryAction.label).toBe('Ver próximas revisões');
    expect(summary.reviewCounts).toEqual({
      overdue: 0,
      today: 0,
      future: 1,
      unscheduled: 0,
    });
  });

  it('flags started topics without review schedule instead of pretending the cycle is done', () => {
    const summary = getStudyCycleTransitionSummary({
      subjects: [
        {
          id: 'subject-1',
          name: 'Português',
          topics: [
            {
              id: 'topic-1',
              first_studied_at: '2026-06-20T10:00:00.000Z',
              next_review: null,
              completed: false,
              is_active: true,
            },
          ],
        },
      ],
      studyMinutesByTopicId: new Map(),
      now,
    });

    expect(summary.primaryAction).toEqual({
      kind: 'unscheduled_reviews',
      label: 'Verificar revisões',
      description: 'Há tópicos iniciados sem próxima revisão. Isso é agenda inconsistente, não ciclo concluído.',
      to: '/revisoes',
    });
  });

  it('calculates top and lowest subject by study minutes when multiple subjects exist', () => {
    const summary = getStudyCycleTransitionSummary({
      subjects: [
        {
          id: 'subject-1',
          name: 'Legislação',
          topics: [
            { id: 'topic-1', is_active: true, first_studied_at: '2026-06-20T10:00:00.000Z' },
          ],
        },
        {
          id: 'subject-2',
          name: 'Português',
          topics: [
            { id: 'topic-2', is_active: true, first_studied_at: '2026-06-20T10:00:00.000Z' },
          ],
        },
        {
          id: 'subject-3',
          name: 'Informática',
          topics: [
            { id: 'topic-3', is_active: true, first_studied_at: '2026-06-20T10:00:00.000Z' },
          ],
        },
      ],
      studyMinutesByTopicId: new Map([
        ['topic-1', 45],
        ['topic-2', 20],
        ['topic-3', 10],
      ]),
      now,
    });

    expect(summary.topSubjectByStudyMinutes).toEqual({
      subjectId: 'subject-1',
      subjectName: 'Legislação',
      minutes: 45,
    });
    expect(summary.lowestSubjectByStudyMinutes).toEqual({
      subjectId: 'subject-3',
      subjectName: 'Informática',
      minutes: 10,
    });
  });

  it('returns null for lowestSubjectByStudyMinutes when all studied subjects have the same duration', () => {
    const summary = getStudyCycleTransitionSummary({
      subjects: [
        {
          id: 'subject-1',
          name: 'Legislação',
          topics: [{ id: 'topic-1', is_active: true, first_studied_at: '2026-06-20T10:00:00.000Z' }],
        },
        {
          id: 'subject-2',
          name: 'Português',
          topics: [{ id: 'topic-2', is_active: true, first_studied_at: '2026-06-20T10:00:00.000Z' }],
        },
      ],
      studyMinutesByTopicId: new Map([
        ['topic-1', 30],
        ['topic-2', 30],
      ]),
      now,
    });

    expect(summary.topSubjectByStudyMinutes?.minutes).toBe(30);
    expect(summary.lowestSubjectByStudyMinutes).toBeNull();
  });
});
