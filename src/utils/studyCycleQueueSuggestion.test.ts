import { describe, expect, it } from 'vitest';
import { getStudyCycleQueueSuggestion } from './studyCycleQueueSuggestion';

const subject = (
  id: string,
  options: {
    weight?: number;
    startedTopics?: number;
    totalTopics?: number;
  } = {},
) => ({
  id,
  name: id.toUpperCase(),
  exam_weight_percentage: options.weight ?? null,
  topics: Array.from({ length: options.totalTopics ?? 10 }, (_, index) => ({
    id: `${id}-${index}`,
    first_studied_at: index < (options.startedTopics ?? 0) ? '2026-06-03T12:00:00-03:00' : null,
  })),
});

const events = (subjectIds: string[]) =>
  subjectIds.map((subjectId, index) => ({
    event_type: 'topic_started',
    subject_id: subjectId,
    id: String(index),
  }));

describe('studyCycleQueueSuggestion', () => {
  it('does not suggest a queue when only one subject has weight', () => {
    const suggestion = getStudyCycleQueueSuggestion({
      subjects: [
        subject('a'),
        subject('b'),
        subject('c', { weight: 30 }),
        subject('d'),
      ],
      events: events(['a', 'a', 'b', 'b', 'd', 'd']),
      currentOrder: ['a', 'b', 'c', 'd'],
    });

    expect(suggestion).toBeNull();
  });

  it('suggests moving a comparable priority subject without applying automatically', () => {
    const suggestion = getStudyCycleQueueSuggestion({
      subjects: [
        subject('a', { weight: 5, startedTopics: 7 }),
        subject('b', { weight: 10, startedTopics: 4 }),
        subject('c', { weight: 30, startedTopics: 0 }),
        subject('d', { weight: 8, startedTopics: 3 }),
      ],
      events: events(['a', 'a', 'a', 'b', 'b', 'd']),
      currentOrder: ['a', 'b', 'c', 'd'],
    });

    expect(suggestion).toEqual(expect.objectContaining({
      suggestedOrder: ['c', 'a', 'b', 'd'],
      title: 'Sugestão de fila',
    }));
  });

  it('does not use legacy incidence when weights are missing', () => {
    const suggestion = getStudyCycleQueueSuggestion({
      subjects: [
        subject('a', { startedTopics: 4 }),
        subject('b', { startedTopics: 4 }),
        subject('c', { startedTopics: 0 }),
        subject('d', { startedTopics: 2 }),
      ],
      events: events(['a', 'a', 'a', 'b', 'b', 'd']),
      currentOrder: ['a', 'b', 'c', 'd'],
    });

    expect(suggestion).toBeNull();
  });

  it('does not suggest moving a subject already closed in the cycle', () => {
    const suggestion = getStudyCycleQueueSuggestion({
      subjects: [
        subject('a', { weight: 5, startedTopics: 1 }),
        subject('b', { weight: 8, startedTopics: 1 }),
        subject('c', { weight: 40, startedTopics: 10 }),
        subject('d', { weight: 10, startedTopics: 1 }),
      ],
      events: events(['a', 'a', 'b', 'b', 'd', 'd']),
      currentOrder: ['a', 'b', 'c', 'd'],
    });

    expect(suggestion?.suggestedOrder[0]).not.toBe('c');
  });
});
