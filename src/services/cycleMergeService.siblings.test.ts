import { describe, expect, it } from 'vitest';
import { findSiblingTopicIds } from './cycleMergeService';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

describe('findSiblingTopicIds', () => {
  it('returns sibling topic ids from a valid unification map', () => {
    const map: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-06-26T00:00:00.000Z',
      editalIds: [],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'Português',
          originalSubjectIds: ['subject-a', 'subject-b'],
          matchType: 'exact',
          topicMappings: [
            {
              displayName: 'Crase',
              originalTopicIds: ['topic-a', 'topic-b'],
              originalSubjectIds: ['subject-a', 'subject-b'],
              matchType: 'exact',
            },
          ],
        },
      ],
    };

    expect(findSiblingTopicIds('topic-a', map)).toEqual(['topic-b']);
  });

  it('ignores legacy or malformed maps instead of throwing during review completion', () => {
    expect(findSiblingTopicIds('topic-a', {} as CycleUnificationMap)).toEqual([]);
  });
});
