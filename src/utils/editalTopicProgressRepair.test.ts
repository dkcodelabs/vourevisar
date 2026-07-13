import { describe, expect, it } from 'vitest';

import type { Subject, Topic } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

import {
  applyTopicProgressRepairPlan,
  buildEditalTopicProgressRepairPlan,
  toTopicProgressDatabasePatch,
} from './editalTopicProgressRepair';

const makeTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'topic-1',
  name: 'Crase',
  completed: false,
  reviewCount: 0,
  review_count: 0,
  ...overrides,
});

const makeSubject = (overrides: Partial<Subject> = {}): Subject => ({
  id: 'subject-1',
  name: 'PORTUGUES',
  status: 'Nova',
  topics: [],
  ...overrides,
});

const map: CycleUnificationMap = {
  version: 1,
  createdAt: '2026-07-11T10:00:00.000Z',
  editalIds: ['edital-a', 'edital-b', 'edital-c'],
  standaloneSubjectIds: [],
  unifiedSubjects: [
    {
      displayName: 'PORTUGUES',
      originalSubjectIds: ['subject-a', 'subject-b', 'subject-c'],
      matchType: 'manual',
      topicMappings: [
        {
          displayName: 'Crases',
          originalTopicIds: ['topic-a', 'topic-b'],
          originalSubjectIds: ['subject-a', 'subject-b'],
          matchType: 'manual',
        },
      ],
    },
  ],
};

describe('editalTopicProgressRepair', () => {
  it('gera reparo copiando progresso mais forte para equivalentes atrasados', () => {
    const completedTopic = makeTopic({
      id: 'topic-a',
      name: 'Crases',
      completed: true,
      is_completed: true,
      review_count: 5,
      reviewCount: 5,
      review_stage: 'Concluído',
      next_review: null,
      last_reviewed_at: '2026-07-11T10:00:00Z',
    });
    const delayedTopic = makeTopic({ id: 'topic-b', review_count: 3, reviewCount: 3 });
    const unmappedDelayedTopic = makeTopic({ id: 'topic-c', review_count: 2, reviewCount: 2 });
    const subjects = [
      makeSubject({ id: 'subject-a', topics: [completedTopic] }),
      makeSubject({ id: 'subject-b', topics: [delayedTopic] }),
      makeSubject({ id: 'subject-c', topics: [unmappedDelayedTopic] }),
    ];

    const plan = buildEditalTopicProgressRepairPlan(subjects, map);

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      sourceTopicId: 'topic-a',
      targetTopicIds: ['topic-b'],
      patch: {
        completed: true,
        is_completed: true,
        review_count: 5,
        review_stage: 'Concluído',
      },
    });
    expect(toTopicProgressDatabasePatch(plan[0].patch)).toMatchObject({
      completed: true,
      review_count: 5,
      review_stage: 'Concluído',
    });
    expect(toTopicProgressDatabasePatch(plan[0].patch)).not.toHaveProperty('is_completed');
    expect(applyTopicProgressRepairPlan(subjects, plan)[1].topics[0]).toMatchObject({
      id: 'topic-b',
      completed: true,
      review_count: 5,
    });
  });
});
