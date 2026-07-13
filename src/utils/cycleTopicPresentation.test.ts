import { describe, expect, it } from 'vitest';

import type { Topic } from '@/types';

import {
  formatStudyMinutes,
  getCycleTopicStatusVisual,
  getTopicContactCount,
  isTopicCompleted,
  isTopicNewlyStartedInCycle,
  isTopicStarted,
} from './cycleTopicPresentation';

const makeTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'topic-1',
  name: 'Controle de Constitucionalidade',
  completed: false,
  reviewCount: 0,
  review_count: 0,
  is_active: true,
  is_hidden: false,
  ...overrides,
});

describe('cycleTopicPresentation', () => {
  it('detects completed, started and newly started topics from current cycle fields', () => {
    expect(isTopicCompleted(makeTopic({ review_stage: 'Concluído' }))).toBe(true);
    expect(isTopicCompleted(makeTopic({ review_count: 5 }))).toBe(true);
    expect(isTopicStarted(makeTopic({ first_studied_at: '2026-07-09T10:00:00Z' }))).toBe(true);
    expect(isTopicStarted(makeTopic({ review_stage: 'novo' }))).toBe(false);
    expect(isTopicNewlyStartedInCycle(
      makeTopic({ first_studied_at: '2026-07-09T10:00:00Z' }),
      '2026-07-09T09:00:00Z',
    )).toBe(true);
  });

  it('returns the correct visual status for new, review-flow and completed topics', () => {
    expect(getCycleTopicStatusVisual(makeTopic()).label).toBe('Não iniciado');
    expect(getCycleTopicStatusVisual(makeTopic({ review_count: 1 })).label).toBe('Em revisão');
    expect(getCycleTopicStatusVisual(makeTopic({ completed: true })).label).toBe('Concluído');
  });

  it('formats study minutes and takes the highest available contact count', () => {
    expect(formatStudyMinutes(0)).toBe('Sem tempo registrado');
    expect(formatStudyMinutes(45)).toBe('45 min');
    expect(formatStudyMinutes(125)).toBe('2h 5min');

    expect(getTopicContactCount(
      makeTopic({ id: 'topic-1', review_count: 1 }),
      new Map([['topic-1', { hardReviewCount: 0, reviewCount: 3 }]]),
    )).toBe(3);
  });
});
