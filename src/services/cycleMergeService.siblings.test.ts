import { describe, expect, it } from 'vitest';
import { findSiblingTopicIds, performExactMerge } from './cycleMergeService';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type { Subject } from '@/types';

const makeSubject = (id: string, name: string, edital_id: string): Subject => ({
  id,
  name,
  edital_id,
  topics: [],
} as Subject);

describe('performExactMerge', () => {
  it('matches equivalent subject names across varied edital labels while keeping same-source entries separate', () => {
    const result = performExactMerge(
      [makeSubject('existing', 'Língua Portuguesa', 'edital-a')],
      [makeSubject('new-equivalent', 'Português', 'edital-b')],
    );

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].subjects.map((subject) => subject.id)).toEqual(['existing', 'new-equivalent']);

    const sameSource = performExactMerge(
      [makeSubject('existing', 'Língua Portuguesa', 'edital-a')],
      [makeSubject('new-duplicate-source', 'Língua Portuguesa', 'edital-a')],
    );
    expect(sameSource.matched).toHaveLength(0);
    expect(sameSource.unmatchedNew.map((subject) => subject.id)).toEqual(['new-duplicate-source']);
  });
});

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
