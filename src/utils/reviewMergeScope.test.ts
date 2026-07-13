import { describe, expect, it } from 'vitest';
import {
  buildReviewTopicMergesFromUnificationMap,
  dedupeMergedReviewTopics,
  expandReviewSubjectScope,
} from './reviewMergeScope';

describe('review merge scope', () => {
  it('includes secondary merged subjects when the cycle stores only the primary subject', () => {
    const scope = expandReviewSubjectScope(
      ['math-a'],
      [
        {
          primary_subject_id: 'math-a',
          merged_subject_ids: ['math-b'],
        },
      ],
    );

    expect(scope).toEqual(['math-a', 'math-b']);
  });

  it('includes subjects from the cycle unification map even without physical subject merge rows', () => {
    const scope = expandReviewSubjectScope(['portugues-a'], [], {
      version: 1,
      createdAt: '2026-07-11T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'PORTUGUES',
          originalSubjectIds: ['portugues-a', 'portugues-b'],
          topicMappings: [],
          matchType: 'exact',
        },
      ],
    });

    expect(scope).toEqual(['portugues-a', 'portugues-b']);
  });

  it('builds review topic merge definitions from the cycle unification map', () => {
    const topicMerges = buildReviewTopicMergesFromUnificationMap({
      version: 1,
      createdAt: '2026-07-11T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'PORTUGUES',
          originalSubjectIds: ['portugues-a', 'portugues-b'],
          topicMappings: [
            {
              displayName: 'Crase',
              originalTopicIds: ['crase-a', 'crase-b'],
              originalSubjectIds: ['portugues-a', 'portugues-b'],
              matchType: 'exact',
            },
          ],
          matchType: 'exact',
        },
      ],
    });

    expect(topicMerges).toEqual([
      {
        primary_topic_id: 'crase-a',
        merged_topic_ids: ['crase-b'],
        display_name: 'Crase',
      },
    ]);
  });

  it('does not group repeated single-topic mappings by display name alone', () => {
    const topicMerges = buildReviewTopicMergesFromUnificationMap({
      version: 1,
      createdAt: '2026-07-11T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'PORTUGUES',
          originalSubjectIds: ['portugues-a', 'portugues-b'],
          topicMappings: [
            {
              displayName: 'Crase',
              originalTopicIds: ['crase-a'],
              originalSubjectIds: ['portugues-a'],
              matchType: 'exact',
            },
            {
              displayName: 'Crase',
              originalTopicIds: ['crase-b'],
              originalSubjectIds: ['portugues-b'],
              matchType: 'exact',
            },
          ],
          matchType: 'exact',
        },
      ],
    });

    expect(topicMerges).toEqual([]);
  });

  it('does not infer equivalent review topics by name when topic mappings are incomplete', () => {
    const topicMerges = buildReviewTopicMergesFromUnificationMap({
      version: 1,
      createdAt: '2026-07-11T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b', 'edital-c'],
      standaloneSubjectIds: [],
      unifiedSubjects: [
        {
          displayName: 'PORTUGUES',
          originalSubjectIds: ['portugues-a', 'portugues-b', 'portugues-c'],
          topicMappings: [
            {
              displayName: 'Crases',
              originalTopicIds: ['crase-a'],
              originalSubjectIds: ['portugues-a'],
              matchType: 'manual',
            },
          ],
          matchType: 'manual',
        },
      ],
    }, [
      { id: 'crase-a', name: 'Crases', subject_id: 'portugues-a', review_count: 5, completed: true },
      { id: 'crase-b', name: 'Crase', subject_id: 'portugues-b', review_count: 2, completed: false },
      { id: 'crase-c', name: 'Crase', subject_id: 'portugues-c', review_count: 3, completed: false },
      { id: 'pontuacao-a', name: 'Pontuação', subject_id: 'portugues-c', review_count: 1 },
    ]);

    expect(topicMerges).toEqual([]);
  });

  it('keeps one row for merged topics and uses the strongest review progress', () => {
    const topics = [
      {
        id: 'crase-a',
        name: 'Crase',
        subject_id: 'portugues-a',
        review_count: 0,
        next_review: null,
      },
      {
        id: 'crase-b',
        name: 'Crase',
        subject_id: 'portugues-b',
        review_count: 1,
        next_review: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'acentuacao-a',
        name: 'Acentuação',
        subject_id: 'portugues-a',
        review_count: 0,
        next_review: null,
      },
    ];

    const deduped = dedupeMergedReviewTopics(topics, [
      {
        primary_topic_id: 'crase-a',
        merged_topic_ids: ['crase-b'],
        display_name: 'Crase',
      },
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped[0]).toMatchObject({
      id: 'crase-a',
      name: 'Crase',
      review_count: 1,
      next_review: '2026-08-01T00:00:00.000Z',
    });
    expect(deduped[1]).toMatchObject({ id: 'acentuacao-a' });
  });

  it('does not duplicate a merged review topic when physical and cycle-map merges overlap', () => {
    const topics = [
      {
        id: 'crase-a',
        name: 'Crase',
        subject_id: 'portugues-a',
        completed: true,
        review_count: 5,
        next_review: null,
      },
      {
        id: 'crase-b',
        name: 'Crase',
        subject_id: 'portugues-b',
        completed: false,
        review_count: 1,
        next_review: '2026-07-11T00:00:00.000Z',
      },
    ];

    const duplicateMerges = [
      {
        primary_topic_id: 'crase-a',
        merged_topic_ids: ['crase-b'],
        display_name: 'Crase',
      },
      {
        primary_topic_id: 'crase-a',
        merged_topic_ids: ['crase-b'],
        display_name: 'Crase',
      },
    ];

    expect(dedupeMergedReviewTopics(topics, duplicateMerges)).toHaveLength(1);
  });

  it('uses the complete cycle group before partial physical merges consume topics', () => {
    const topics = [
      {
        id: 'crase-a',
        name: 'Crases',
        subject_id: 'portugues-a',
        completed: true,
        review_count: 5,
        next_review: null,
      },
      {
        id: 'crase-b',
        name: 'Crase',
        subject_id: 'portugues-b',
        completed: false,
        review_count: 2,
        next_review: '2026-07-11T00:00:00.000Z',
      },
      {
        id: 'crase-c',
        name: 'Crase',
        subject_id: 'portugues-c',
        completed: false,
        review_count: 3,
        next_review: '2026-07-12T00:00:00.000Z',
      },
    ];

    const deduped = dedupeMergedReviewTopics(topics, [
      {
        primary_topic_id: 'crase-a',
        merged_topic_ids: ['crase-b', 'crase-c'],
        display_name: 'Crases',
      },
      {
        primary_topic_id: 'crase-b',
        merged_topic_ids: ['crase-c'],
        display_name: 'Crase',
      },
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]).toMatchObject({
      id: 'crase-a',
      name: 'Crases',
      completed: true,
      review_count: 5,
    });
  });
});
