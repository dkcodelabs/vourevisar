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

  it('does not return sibling topic ids from split mappings with similar names', () => {
    const map: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-07-11T00:00:00.000Z',
      editalIds: [],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'Português',
          originalSubjectIds: ['subject-a', 'subject-b', 'subject-c'],
          matchType: 'manual',
          topicMappings: [
            {
              displayName: 'Crases',
              originalTopicIds: ['topic-a'],
              originalSubjectIds: ['subject-a'],
              matchType: 'manual',
            },
            {
              displayName: 'Crase',
              originalTopicIds: ['topic-b'],
              originalSubjectIds: ['subject-b'],
              matchType: 'manual',
            },
            {
              displayName: 'Pontuação',
              originalTopicIds: ['topic-c'],
              originalSubjectIds: ['subject-c'],
              matchType: 'manual',
            },
          ],
        },
      ],
    };

    expect(findSiblingTopicIds('topic-a', map)).toEqual([]);
  });
});
