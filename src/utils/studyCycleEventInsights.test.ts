import { describe, expect, it } from 'vitest';
import { getStudyCycleEventInsights, type CycleStudyEvent } from './studyCycleEventInsights';

const event = (
  id: string,
  subjectId: string,
  eventType: string = 'topic_started',
): CycleStudyEvent => ({
  id,
  subject_id: subjectId,
  event_type: eventType,
  created_at: '2026-06-03T12:00:00-03:00',
});

describe('studyCycleEventInsights', () => {
  it('does not emit behavioral insights before minimum usage', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        { id: 'a', name: 'Português', topics: [{ id: 't1' }] },
      ],
      events: [event('1', 'a')],
      currentOrder: ['a'],
      minEvents: 5,
    });

    expect(insights).toEqual([]);
  });

  it('detects concentration in one subject after enough events', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        {
          id: 'a',
          name: 'Português',
          topics: [
            { id: 't1', first_studied_at: '2026-06-03T12:00:00-03:00' },
            { id: 't2', first_studied_at: '2026-06-03T12:00:00-03:00' },
            { id: 't3', first_studied_at: '2026-06-03T12:00:00-03:00' },
          ],
        },
        { id: 'b', name: 'Informática', topics: [{ id: 't2' }] },
      ],
      events: [
        event('1', 'a'),
        event('2', 'a'),
        event('3', 'a'),
        event('4', 'a'),
        event('5', 'b'),
      ],
      currentOrder: ['a', 'b'],
    });

    expect(insights).toContainEqual(expect.objectContaining({
      id: 'concentrated-study:a',
      severity: 'warning',
    }));
  });

  it('does not flag concentration only because a large subject has more events', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        {
          id: 'a',
          name: 'Direito Penal',
          topics: Array.from({ length: 30 }, (_, index) => ({
            id: `a-${index}`,
            first_studied_at: index < 3 ? '2026-06-03T12:00:00-03:00' : null,
          })),
        },
        {
          id: 'b',
          name: 'Português',
          topics: Array.from({ length: 5 }, (_, index) => ({
            id: `b-${index}`,
            first_studied_at: index < 2 ? '2026-06-03T12:00:00-03:00' : null,
          })),
        },
      ],
      events: [
        event('1', 'a'),
        event('2', 'a'),
        event('3', 'a'),
        event('4', 'a'),
        event('5', 'b'),
      ],
      currentOrder: ['a', 'b'],
    });

    expect(insights).not.toContainEqual(expect.objectContaining({
      id: 'concentrated-study:a',
    }));
  });

  it('detects prioritized subject without recent usage', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        {
          id: 'a',
          name: 'Direito Penal',
          exam_weight_percentage: 25,
          topics: [{ id: 't1' }],
        },
        { id: 'b', name: 'Português', topics: [{ id: 't2' }] },
      ],
      events: [
        event('1', 'b'),
        event('2', 'b'),
        event('3', 'b'),
        event('4', 'b'),
        event('5', 'b'),
      ],
      currentOrder: ['b', 'a'],
    });

    expect(insights).toContainEqual(expect.objectContaining({
      id: 'priority-neglected:a',
      subjectId: 'a',
    }));
  });

  it('detects too many reviews compared with new topics', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        { id: 'a', name: 'Português', topics: [{ id: 't1' }, { id: 't2' }] },
      ],
      events: [
        event('1', 'a', 'topic_started'),
        event('2', 'a', 'topic_reviewed'),
        event('3', 'a', 'topic_reviewed'),
        event('4', 'a', 'topic_reviewed'),
        event('5', 'a', 'topic_reviewed'),
      ],
      currentOrder: ['a'],
    });

    expect(insights).toContainEqual(expect.objectContaining({
      id: 'many-reviews-few-new-topics',
      severity: 'info',
    }));
  });

  it('keeps legacy continued events as reviewed topic usage', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        { id: 'a', name: 'Português', topics: [{ id: 't1' }, { id: 't2' }] },
      ],
      events: [
        event('1', 'a', 'topic_started'),
        event('2', 'a', 'topic_continued'),
        event('3', 'a', 'topic_continued'),
        event('4', 'a', 'topic_continued'),
        event('5', 'a', 'topic_continued'),
      ],
      currentOrder: ['a'],
    });

    expect(insights).toContainEqual(expect.objectContaining({
      id: 'many-reviews-few-new-topics',
      evidence: '4 revisões e 1 tópicos novos registrados.',
    }));
  });

  it('does not flag many reviews when overdue review backlog explains the behavior', () => {
    const insights = getStudyCycleEventInsights({
      subjects: [
        { id: 'a', name: 'Português', topics: [{ id: 't1' }, { id: 't2' }] },
      ],
      events: [
        event('1', 'a', 'topic_started'),
        event('2', 'a', 'topic_reviewed'),
        event('3', 'a', 'topic_reviewed'),
        event('4', 'a', 'topic_reviewed'),
        event('5', 'a', 'topic_reviewed'),
      ],
      currentOrder: ['a'],
      overdueReviews: 4,
    });

    expect(insights).not.toContainEqual(expect.objectContaining({
      id: 'many-reviews-few-new-topics',
    }));
  });
});
