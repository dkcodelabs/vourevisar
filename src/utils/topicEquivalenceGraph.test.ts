import { describe, expect, it } from 'vitest';

import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

import {
  buildTopicEquivalenceGroups,
  getExplicitEquivalentTopicIds,
  getExplicitSiblingTopicIds,
} from './topicEquivalenceGraph';

describe('topicEquivalenceGraph', () => {
  it('uses only explicit topic mappings as equivalence source', () => {
    const map: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-07-11T10:00:00.000Z',
      editalIds: [],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'PORTUGUES',
          originalSubjectIds: ['subject-a', 'subject-b'],
          matchType: 'manual',
          topicMappings: [
            {
              displayName: 'Uso do acento grave',
              originalTopicIds: ['crase-a', 'crase-b'],
              originalSubjectIds: ['subject-a', 'subject-b'],
              matchType: 'manual',
            },
            {
              displayName: 'Crase',
              originalTopicIds: ['crase-c'],
              originalSubjectIds: ['subject-c'],
              matchType: 'exact',
            },
          ],
        },
      ],
    };

    const groups = buildTopicEquivalenceGroups({ unificationMap: map });

    expect(groups).toEqual([{ ids: ['crase-a', 'crase-b'], displayName: 'Uso do acento grave' }]);
    expect(getExplicitEquivalentTopicIds('crase-a', groups)).toEqual(['crase-a', 'crase-b']);
    expect(getExplicitEquivalentTopicIds('crase-c', groups)).toEqual(['crase-c']);
  });

  it('combines overlapping explicit map and physical topic merge groups', () => {
    const groups = buildTopicEquivalenceGroups({
      topicMerges: [
        { primary_topic_id: 'topic-a', merged_topic_ids: ['topic-b'], display_name: 'Crase' },
        { primary_topic_id: 'topic-b', merged_topic_ids: ['topic-c'], display_name: 'Uso do acento grave' },
      ],
    });

    expect(groups).toEqual([{ ids: ['topic-a', 'topic-b', 'topic-c'], displayName: 'Crase' }]);
    expect(getExplicitSiblingTopicIds('topic-b', groups)).toEqual(['topic-a', 'topic-c']);
  });
});
