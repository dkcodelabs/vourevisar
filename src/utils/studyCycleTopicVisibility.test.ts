import { describe, expect, it } from 'vitest';

import { getVisibleCycleTopicIds, getVisibleCycleTopics, isVisibleCycleTopic } from './studyCycleTopicVisibility';

describe('studyCycleTopicVisibility', () => {
  it('keeps legacy null active state visible but removes inactive and hidden topics', () => {
    const topics = [
      { id: 'active', is_active: true, is_hidden: false },
      { id: 'legacy-null-active', is_active: null, is_hidden: false },
      { id: 'inactive', is_active: false, is_hidden: false },
      { id: 'hidden', is_active: true, is_hidden: true },
    ];

    expect(getVisibleCycleTopics(topics).map(topic => topic.id)).toEqual([
      'active',
      'legacy-null-active',
    ]);
  });

  it('treats hidden topics as unavailable for cycle rendering and metrics', () => {
    expect(isVisibleCycleTopic({ is_active: true, is_hidden: true })).toBe(false);
  });

  it('returns only active visible topic ids for cycle-scoped metric queries', () => {
    const subjects = [
      {
        topics: [
          { id: 'active-topic', is_active: true, is_hidden: false },
          { id: 'legacy-visible-topic', is_active: null, is_hidden: false },
          { id: 'inactive-topic', is_active: false, is_hidden: false },
          { id: 'hidden-topic', is_active: true, is_hidden: true },
        ],
      },
      {
        topics: [
          { id: 'second-subject-topic', is_active: true, is_hidden: false },
        ],
      },
    ];

    expect(getVisibleCycleTopicIds(subjects)).toEqual([
      'active-topic',
      'legacy-visible-topic',
      'second-subject-topic',
    ]);
  });
});
