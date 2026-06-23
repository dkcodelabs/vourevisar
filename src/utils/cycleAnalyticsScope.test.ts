import { describe, expect, it } from 'vitest';
import { buildActiveTopicScope, filterHistoryRowsByActiveTopicIds } from './cycleAnalyticsScope';

describe('buildActiveTopicScope', () => {
  it('deduplicates and sorts active topic ids from cycle subjects', () => {
    expect(
      buildActiveTopicScope([
        {
          id: 'subject-b',
          topics: [{ id: 'topic-3' }, { id: 'topic-1' }],
        },
        {
          id: 'subject-a',
          topics: [{ id: 'topic-2' }, { id: 'topic-1' }, { id: '' }],
        },
      ]),
    ).toEqual({
      activeSubjectIds: ['subject-a', 'subject-b'],
      activeTopicIds: ['topic-1', 'topic-2', 'topic-3'],
      hasScopedData: true,
      scopeKey: 'topic-1|topic-2|topic-3',
    });
  });

  it('returns an honest empty scope when there are no active topics', () => {
    expect(buildActiveTopicScope([])).toEqual({
      activeSubjectIds: [],
      activeTopicIds: [],
      hasScopedData: false,
      scopeKey: 'empty',
    });
  });
});

describe('filterHistoryRowsByActiveTopicIds', () => {
  it('keeps only rows that belong to active topic ids', () => {
    expect(
      filterHistoryRowsByActiveTopicIds(
        [
          { id: 'history-1', topic_id: 'topic-2' },
          { id: 'history-2', topic_id: 'topic-old' },
          { id: 'history-3', topic_id: null },
        ],
        ['topic-1', 'topic-2'],
      ),
    ).toEqual([{ id: 'history-1', topic_id: 'topic-2' }]);
  });
});
